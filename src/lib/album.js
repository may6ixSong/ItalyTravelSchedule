// 추억 앨범 사진 저장소. 사진은 이 폰 안(IndexedDB)에만 저장해서 비행기 안 같은 오프라인에서도 보여요.
// 일행과 공유되지 않고, 데이터(로밍)도 쓰지 않아요.
import { useEffect, useState } from 'react';
import { shrinkToBlob } from './images.js';

const DB = 'itp-album';
const STORE = 'photos';
const bus = new EventTarget();
let opening = null;

function db() {
  opening ||= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => {
      opening = null;
      reject(r.error);
    };
  });
  return opening;
}

async function run(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('저장 공간이 부족해요'));
  });
}

// 가로(L) · 세로(P) · 정사각에 가까움(S)
export const orientOf = (w, h) => (w / h > 1.15 ? 'L' : w / h < 0.87 ? 'P' : 'S');

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// 그날(date: 'YYYY-MM-DD')에 사진 여러 장 추가. onProgress(완료 수, 전체 수)
export async function addPhotos(date, files, onProgress) {
  navigator.storage?.persist?.(); // 폰이 저장 공간을 정리할 때 앨범이 지워지지 않게
  let done = 0;
  const failed = [];
  for (const f of files) {
    try {
      const { blob, w, h } = await shrinkToBlob(f);
      await run('readwrite', (s) => s.put({ id: newId(), date, blob, w, h, at: Date.now() }));
    } catch (e) {
      failed.push(f.name || '사진');
      if (e?.name === 'QuotaExceededError') break;
    }
    onProgress?.(++done, files.length);
  }
  bus.dispatchEvent(new Event('change'));
  return failed;
}

export async function deletePhotos(ids) {
  await run('readwrite', (s) => ids.forEach((id) => s.delete(id)));
  for (const id of ids) {
    const u = urls.get(id);
    if (u) URL.revokeObjectURL(u);
    urls.delete(id);
  }
  bus.dispatchEvent(new Event('change'));
}
export const deletePhoto = (id) => deletePhotos([id]);

export async function movePhoto(photo, date) {
  await run('readwrite', (s) => s.put({ ...photo, date }));
  bus.dispatchEvent(new Event('change'));
}

// 화면에 그릴 주소. 사진마다 한 번만 만들어 둬요.
const urls = new Map();
export function photoUrl(p) {
  if (!urls.has(p.id)) urls.set(p.id, URL.createObjectURL(p.blob));
  return urls.get(p.id);
}

// 저장된 사진 전체 (올린 순서). 처음엔 null(불러오는 중)
export function useAlbumPhotos() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      run('readonly', (s) => s.getAll())
        .then((all) => alive && setList(all.map((p) => ({ ...p, o: orientOf(p.w, p.h) })).sort((a, b) => a.at - b.at)))
        .catch(() => alive && setList([]));
    load();
    bus.addEventListener('change', load);
    return () => {
      alive = false;
      bus.removeEventListener('change', load);
    };
  }, []);
  return list;
}
