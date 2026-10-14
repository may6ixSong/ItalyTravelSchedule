// 예약 목록 = 코드의 기본 예약(data/bookings.js) + 앱에서 추가 · 고친 예약(공유 DB settings/userBookings).
// settings/userBookings: { [id]: { type, date, endDate, time, title, sub, place, link, confirm, hidden, by, at } }
//   - 코드에 있는 id면 그 예약을 덮어쓰고, 'ub-'로 시작하는 id는 새로 추가한 예약이에요.
//   - hidden: true면 목록 · 당일 알림에서 빠져요.
import { useMemo } from 'react';
import { BOOKINGS, BOOKING_TYPES } from '../data/bookings.js';
import { patch, useDoc } from './store.js';

const CODE_IDS = new Set(BOOKINGS.map((b) => b.id));
export const FIELDS = ['type', 'date', 'endDate', 'time', 'title', 'sub', 'place', 'link', 'confirm'];

export function useBookings() {
  const doc = useDoc('settings', 'userBookings');
  return useMemo(() => {
    const user = {};
    for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object') user[k] = v;
    const all = BOOKINGS.map((b) => {
      const o = user[b.id];
      if (!o) return b;
      const edit = Object.fromEntries(FIELDS.filter((f) => o[f] != null && (o[f] !== '' || ['endDate', 'time', 'sub', 'place', 'link', 'confirm'].includes(f))).map((f) => [f, o[f]]));
      return { ...b, ...edit, hidden: !!o.hidden, edited: true };
    });
    for (const [id, o] of Object.entries(user)) {
      if (CODE_IDS.has(id) || !o.title || !o.date || !BOOKING_TYPES[o.type]) continue;
      all.push({ id, ...Object.fromEntries(FIELDS.map((f) => [f, o[f] || ''])), hidden: !!o.hidden, mine: true });
    }
    const visible = all.filter((b) => !b.hidden && BOOKING_TYPES[b.type]);
    visible.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));
    return visible;
  }, [doc]);
}

export const isCodeBooking = (id) => CODE_IDS.has(id);
export const newBookingId = () => `ub-${Date.now().toString(36)}`;

// 항상 모든 칸을 같이 써서(빈 칸은 '') 로컬 저장 · Firestore 병합 어느 쪽이든 결과가 같아요.
export function saveBooking(id, data, uid) {
  const v = Object.fromEntries(FIELDS.map((f) => [f, data[f] ?? '']));
  return patch('settings', 'userBookings', { [id]: { ...v, hidden: false, by: uid, at: Date.now() } });
}

// 새로 추가한 예약은 지우고, 코드 예약은 숨겨요(원래대로 되돌리면 다시 보여요).
export function deleteBooking(b, uid) {
  if (!CODE_IDS.has(b.id)) return patch('settings', 'userBookings', { [b.id]: null });
  const v = Object.fromEntries(FIELDS.map((f) => [f, b[f] ?? '']));
  return patch('settings', 'userBookings', { [b.id]: { ...v, hidden: true, by: uid, at: Date.now() } });
}

export const resetBooking = (id) => patch('settings', 'userBookings', { [id]: null });
