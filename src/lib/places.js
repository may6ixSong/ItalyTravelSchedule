// 정적 장소 목록 + (있으면) 수집 스크립트가 만든 public/places.json(사진 · 리뷰 · 정확한 좌표)을 합칩니다.
import { useEffect, useState } from 'react';
import { BASE } from '../config.js';
import { PLACES } from '../data/places.js';

let merged = PLACES;
let byId = Object.fromEntries(PLACES.map((p) => [p.id, p]));
let loading = null;

function load() {
  loading ||= fetch(`${BASE}places.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((extra) => {
      merged = PLACES.map((p) => (extra[p.id] ? { ...p, ...extra[p.id], note: p.note || extra[p.id].note } : p));
      byId = Object.fromEntries(merged.map((p) => [p.id, p]));
      return merged;
    });
  return loading;
}

export function usePlaces() {
  const [list, setList] = useState(merged);
  useEffect(() => {
    load().then(setList);
  }, []);
  return { places: list, byId: Object.fromEntries(list.map((p) => [p.id, p])) };
}

export const getPlace = (id) => byId[id];
