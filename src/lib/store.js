// 공유 데이터 저장소. Firebase 설정이 있으면 Firestore(오프라인 캐시 + 실시간 동기화),
// 없으면 이 기기의 localStorage를 씁니다. 화면 코드는 어느 쪽인지 몰라도 됩니다.
import { useEffect, useState } from 'react';
import { firebaseConfig, hasFirebase } from '../config.js';

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
export async function ensureAuth() {
  if (!hasFirebase) return 'local';
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
}

/* ---------- 공통 API ---------- */
export function subscribe(col, cb) {
  if (!hasFirebase) {
    const emit = () => cb(Object.entries(readLocal(col)).map(([id, v]) => ({ id, ...v })));
    emit();
    bus.addEventListener(col, emit);
    return () => bus.removeEventListener(col, emit);
  }
  let off = () => {};
  let cancelled = false;
  firebase().then(({ db, fs }) => {
    if (cancelled) return;
    off = fs.onSnapshot(
      fs.collection(db, col),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('subscribe', col, err.code),
    );
  });
  return () => {
    cancelled = true;
    off();
  };
}

// field == value 인 문서만 구독 (사진처럼 큰 문서를 장소별로만 받을 때)
export function subscribeWhere(col, field, value, cb) {
  if (!hasFirebase) return subscribe(col, (rows) => cb(rows.filter((r) => r[field] === value)));
  let off = () => {};
  let cancelled = false;
  firebase().then(({ db, fs }) => {
    if (cancelled) return;
    off = fs.onSnapshot(
      fs.query(fs.collection(db, col), fs.where(field, '==', value)),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('subscribeWhere', col, err.code),
    );
  });
  return () => {
    cancelled = true;
    off();
  };
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
  fs.setDoc(fs.doc(db, col, id), doc).catch((e) => console.warn('put', col, e.code));
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
  fs.setDoc(fs.doc(db, col, id), doc, { merge: true }).catch((e) => console.warn('patch', col, e.code));
}

export async function remove(col, id) {
  if (!hasFirebase) {
    const map = readLocal(col);
    delete map[id];
    writeLocal(col, map);
    return;
  }
  const { db, fs } = await firebase();
  fs.deleteDoc(fs.doc(db, col, id)).catch((e) => console.warn('remove', col, e.code));
}

export function useCollection(col) {
  const [rows, setRows] = useState(null);
  useEffect(() => subscribe(col, setRows), [col]);
  return rows;
}

export function useWhere(col, field, value) {
  const [rows, setRows] = useState(null);
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
