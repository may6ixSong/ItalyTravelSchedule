// 장소 목록 = 코드의 기본 장소(data/places.js) + (있으면) 수집 스크립트가 만든 public/places.json(사진 · 리뷰 · 정확한 좌표)
//          + 앱에서 직접 등록 · 고친 장소(공유 DB settings/userPlaces). 사용자가 고친 값이 항상 위에 덮어씌워져요.
// settings/userPlaces: { [장소id]: { name, cat, city, lat, lng, gmaps, address, hours, note, hidden, by, at } }
//   - 코드에 있는 id면 그 장소를 덮어쓰고, 'u-'로 시작하는 id는 새로 등록한 장소예요.
//   - hidden: true면 목록 · 후보에서 숨겨요 (일정에 들어 있으면 일정에는 계속 보여요).
import { useEffect, useMemo, useState } from 'react';
import { BASE } from '../config.js';
import { PLACES, PLACE_BY_ID } from '../data/places.js';
import { patch, useDoc } from './store.js';

let merged = PLACES;
let loading = null;

function load() {
  loading ||= fetch(`${BASE}places.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((extra) => {
      merged = PLACES.map((p) => (extra[p.id] ? { ...p, ...extra[p.id], note: p.note || extra[p.id].note } : p));
      return merged;
    });
  return loading;
}

const FIELDS = ['name', 'cat', 'city', 'lat', 'lng', 'gmaps', 'placeId', 'address', 'hours', 'note'];

export function useUserPlaces() {
  const doc = useDoc('settings', 'userPlaces');
  const out = {};
  for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object') out[k] = v;
  return out;
}

export function usePlaces() {
  const [base, setBase] = useState(merged);
  const user = useUserPlaces();
  useEffect(() => {
    load().then(setBase);
  }, []);
  return useMemo(() => {
    const all = base.map((p) => {
      const o = user[p.id];
      if (!o) return p;
      const edit = Object.fromEntries(FIELDS.filter((f) => o[f] != null && o[f] !== '').map((f) => [f, o[f]]));
      // 비워 둔 칸은 지운 것으로 봐요 (이름 · 분류 · 도시 · 좌표는 꼭 있어야 해서 원래 값 유지)
      for (const f of ['gmaps', 'address', 'hours', 'note']) if (o[f] === '') edit[f] = '';
      return { ...p, ...edit, hidden: !!o.hidden, edited: !!o.at };
    });
    for (const [id, o] of Object.entries(user)) {
      if (PLACE_BY_ID[id] || !o.name || !(o.lat != null && o.lng != null)) continue;
      all.push({ id, ...Object.fromEntries(FIELDS.map((f) => [f, o[f]])), cat: o.cat || 'sight', city: o.city || 'rome', hidden: !!o.hidden, mine: true });
    }
    return { places: all.filter((p) => !p.hidden), byId: Object.fromEntries(all.map((p) => [p.id, p])), all };
  }, [base, user]);
}

// 장소 저장. 항상 모든 칸을 같이 써서(빈 칸은 '') 로컬 저장 · Firestore 병합 어느 쪽이든 결과가 같아요.
export function savePlace(id, data, uid) {
  const v = Object.fromEntries(FIELDS.map((f) => [f, data[f] ?? '']));
  return patch('settings', 'userPlaces', { [id]: { ...v, hidden: !!data.hidden, by: uid, at: Date.now() } });
}

export const newPlaceId = () => `u-${Date.now().toString(36)}`;

// 코드 장소는 덮어쓴 값을 지우면 원래대로, 새로 등록한 장소는 지우면 사라져요.
export const resetPlace = (id) => patch('settings', 'userPlaces', { [id]: null });

export function setPlaceHidden(id, hidden, current, uid) {
  const o = current || {};
  return patch('settings', 'userPlaces', { [id]: { ...Object.fromEntries(FIELDS.map((f) => [f, o[f] ?? ''])), at: o.at || 0, by: o.by || uid, hidden } });
}

// 구글맵 링크에서 좌표 · 이름 읽기. 짧은 링크(maps.app.goo.gl)는 좌표가 없어서 지도에서 직접 찍어야 해요.
export function parseMapsLink(text) {
  const s = (text || '').trim();
  if (!s) return {};
  const out = {};
  const num = '(-?\\d{1,3}\\.\\d+)';
  const m =
    s.match(new RegExp(`!3d${num}!4d${num}`)) ||
    s.match(new RegExp(`[?&](?:q|ll|query|destination|center)=${num},\\s*${num}`)) ||
    s.match(new RegExp(`@${num},${num}`)) ||
    s.match(new RegExp(`^${num}\\s*,\\s*${num}$`));
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) Object.assign(out, { lat, lng });
  }
  const name = s.match(/\/place\/([^/@?]+)/);
  if (name) {
    try {
      out.name = decodeURIComponent(name[1].replace(/\+/g, ' ')).trim();
    } catch {
      /* 이름은 못 읽어도 괜찮아요 */
    }
  }
  const pid = s.match(/[?&](?:query_place_id|place_id|destination_place_id)=([\w-]+)/);
  if (pid) out.placeId = pid[1];
  out.short = /goo\.gl|g\.co\//.test(s);
  return out;
}
