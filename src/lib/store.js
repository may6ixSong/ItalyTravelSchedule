// 공유 데이터 저장소. Firebase 설정이 있으면 Firestore(오프라인 캐시 + 실시간 동기화),
// 없으면 이 기기의 localStorage를 씁니다. 화면 코드는 어느 쪽인지 몰라도 됩니다.
import { useEffect, useState } from 'react';
import { JOIN_CODE, firebaseConfig, hasFirebase } from '../config.js';

let fb = null; // { db, auth, mod } — Firestore 모듈은 필요할 때만 불러옵니다.

async function firebase() {
  if (fb) return fb;
  const [{ initializeApp }, fs, au] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
    import('firebase/auth'),
  ]);
  const app = initializeApp(firebaseConfig);
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
  });
  const auth = au.getAuth(app);
  fb = { db, auth, fs, au };
  return fb;
}

/* ---------- 로컬 모드 ---------- */
const bus = new EventTarget();
const key = (col) => `itp:${col}`;
function readLocal(col) {
  try {
    return JSON.parse(localStorage.getItem(key(col)) || '{}');
  } catch {
    return {};
  }
}
function writeLocal(col, map) {
  localStorage.setItem(key(col), JSON.stringify(map));
  bus.dispatchEvent(new Event(col));
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- 인증 ---------- */
let authing = null;
// 동시에 여러 곳에서 불러도 로그인은 한 번만 (익명 계정이 둘 생기지 않게)
export function ensureAuth() {
  if (!hasFirebase) return Promise.resolve('local');
  authing ||= (async () => {
    const { auth, au } = await firebase();
    if (auth.currentUser) return auth.currentUser.uid;
    await new Promise((resolve) => {
      const off = au.onAuthStateChanged(auth, () => {
        off();
        resolve();
      });
    });
    if (!auth.currentUser) await au.signInAnonymously(auth);
    return auth.currentUser.uid;
  })().finally(() => {
    authing = null;
  });
  return authing;
}

/* ---------- 마지막으로 받은 데이터 (끊겨도 유지) ----------
   구독이 실패하거나 빈 값이 와도 화면이 0으로 초기화되지 않게, 마지막으로 받은 목록을 이 폰에 같이 남겨 둡니다.
   사진은 용량이 커서 제외(사진은 Firestore 자체 오프라인 캐시가 담당). */
const NO_MIRROR = ['photos'];
const mirrorKey = (name) => `itp:last:${name}`;
function readMirror(name) {
  try {
    const v = JSON.parse(localStorage.getItem(mirrorKey(name)));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
function writeMirror(col, name, rows) {
  if (NO_MIRROR.includes(col)) return;
  try {
    localStorage.setItem(mirrorKey(name), JSON.stringify(rows));
  } catch {
    /* 용량이 차면 이번에는 건너뛰어요 */
  }
}

// 구독이 끊기면(로그인 전 권한 오류, 네트워크 흔들림) 잠시 뒤 로그인부터 다시 시도해서 이어 붙여요.
function liveQuery(col, name, makeQuery, cb) {
  let off = () => {};
  let cancelled = false;
  let timer = null;
  let attempt = 0;
  const last = readMirror(name);
  if (last) cb(last);
  const start = async () => {
    try {
      await ensureAuth();
    } catch {
      /* 오프라인이면 저장된 로그인 · 캐시로 계속 */
    }
    const { db, fs } = await firebase();
    if (cancelled) return;
    off = fs.onSnapshot(
      makeQuery(db, fs),
      (snap) => {
        attempt = 0;
        const mirror = readMirror(name);
        // 캐시에서 온 빈 결과는 믿지 않고 마지막으로 받은 데이터를 유지
        if (snap.empty && snap.metadata.fromCache && mirror?.length) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        writeMirror(col, name, rows);
        cb(rows);
      },
      (err) => {
        console.warn('subscribe', name, err.code);
        off();
        if (err.code === 'permission-denied') repairMembership();
        if (!cancelled) timer = setTimeout(start, Math.min(30000, 2000 * 2 ** attempt++));
      },
    );
  };
  start();
  return () => {
    cancelled = true;
    clearTimeout(timer);
    off();
  };
}

/* ---------- 저장 실패 처리 ----------
   Firestore 쓰기는 서버가 거절하면(권한 · 무료 사용량 초과 등) 화면에서 조용히 되돌아가요.
   그래서 실패하면 화면에 이유를 알리고(App의 토스트), 권한 문제면 이 폰의 멤버 등록을 다시 해서 한 번 더 시도해요. */
let repairing = null;
// 이 폰의 로그인(익명 uid)으로 users 문서를 다시 만들어요. 입장 코드는 이미 통과했으니 다시 묻지 않아요.
export function repairMembership() {
  repairing ||= (async () => {
    const me = getPref('me', null);
    if (!me || me.dev) return false;
    const uid = await ensureAuth();
    const { db, fs } = await firebase();
    await fs.setDoc(fs.doc(db, 'users', uid), { name: me.name, color: me.color, photo: me.photo || '', joinCode: JOIN_CODE, updatedAt: Date.now() }, { merge: true });
    if (uid !== me.uid) setPref('me', { ...me, uid });
    return true;
  })()
    .catch((e) => {
      console.warn('repair', e?.code || e);
      return false;
    })
    .finally(() => setTimeout(() => (repairing = null), 30000));
  return repairing;
}

function reportWriteError(col, e) {
  const code = e?.code || e?.message || 'unknown';
  console.warn('write', col, code);
  window.dispatchEvent(new CustomEvent('itp-write-error', { detail: { col, code } }));
}

// 서버 응답을 기다리지 않고(오프라인이면 대기열에 쌓여요) 결과만 따로 확인
function write(col, run) {
  (async () => {
    try {
      await run();
    } catch (e) {
      if (e?.code === 'permission-denied' && col !== 'users' && (await repairMembership())) {
        try {
          await run();
          return;
        } catch (e2) {
          return reportWriteError(col, e2);
        }
      }
      reportWriteError(col, e);
    }
  })();
}

/* ---------- 공통 API ---------- */
export function subscribe(col, cb) {
  if (!hasFirebase) {
    const emit = () => cb(Object.entries(readLocal(col)).map(([id, v]) => ({ id, ...v })));
    emit();
    bus.addEventListener(col, emit);
    return () => bus.removeEventListener(col, emit);
  }
  return liveQuery(col, col, (db, fs) => fs.collection(db, col), cb);
}

// field == value 인 문서만 구독 (사진처럼 큰 문서를 장소별로만 받을 때)
export function subscribeWhere(col, field, value, cb) {
  if (!hasFirebase) return subscribe(col, (rows) => cb(rows.filter((r) => r[field] === value)));
  return liveQuery(col, `${col}:${field}:${value}`, (db, fs) => fs.query(fs.collection(db, col), fs.where(field, '==', value)), cb);
}

export async function getOne(col, id) {
  if (!hasFirebase) {
    const v = readLocal(col)[id];
    return v ? { id, ...v } : null;
  }
  const { db, fs } = await firebase();
  const snap = await fs.getDoc(fs.doc(db, col, id));
  return snap.exists() ? { id, ...snap.data() } : null;
}

// Firestore 쓰기는 오프라인이면 대기열에 쌓였다가 온라인이 되면 올라갑니다.
// 서버 응답을 기다리면 오프라인에서 멈추므로 await하지 않습니다.
export async function add(col, data) {
  const id = newId();
  await put(col, id, data);
  return id;
}

export async function put(col, id, data) {
  const doc = { ...data, updatedAt: Date.now() };
  if (!hasFirebase) {
    const map = readLocal(col);
    map[id] = doc;
    writeLocal(col, map);
    return;
  }
  const { db, fs } = await firebase();
  write(col, () => fs.setDoc(fs.doc(db, col, id), doc));
}

export async function patch(col, id, data) {
  const doc = { ...data, updatedAt: Date.now() };
  if (!hasFirebase) {
    const map = readLocal(col);
    map[id] = { ...(map[id] || {}), ...doc };
    writeLocal(col, map);
    return;
  }
  const { db, fs } = await firebase();
  write(col, () => fs.setDoc(fs.doc(db, col, id), doc, { merge: true }));
}

export async function remove(col, id) {
  if (!hasFirebase) {
    const map = readLocal(col);
    delete map[id];
    writeLocal(col, map);
    return;
  }
  const { db, fs } = await firebase();
  write(col, () => fs.deleteDoc(fs.doc(db, col, id)));
}

export function useCollection(col) {
  const [rows, setRows] = useState(() => (hasFirebase ? readMirror(col) : null));
  useEffect(() => subscribe(col, setRows), [col]);
  return rows;
}

export function useWhere(col, field, value) {
  const [rows, setRows] = useState(() => (hasFirebase && value != null ? readMirror(`${col}:${field}:${value}`) : null));
  useEffect(() => (value == null ? undefined : subscribeWhere(col, field, value, setRows)), [col, field, value]);
  return rows;
}

export function useDoc(col, id) {
  const rows = useCollection(col);
  return rows ? rows.find((r) => r.id === id) || null : undefined;
}

/* ---------- 이 기기에만 남기는 값 (알림 닫음, 마지막 탭 등) ---------- */
export function getPref(name, fallback) {
  try {
    const v = localStorage.getItem(`itp-pref:${name}`);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
export function setPref(name, value) {
  try {
    localStorage.setItem(`itp-pref:${name}`, JSON.stringify(value));
  } catch {
    /* 저장 공간이 막힌 브라우저 */
  }
}
