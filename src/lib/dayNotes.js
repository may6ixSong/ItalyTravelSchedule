// 날짜별 메모 (그날 일정 위에 두 사람이 같이 보고 고치는 메모). settings/dayNotes 문서 하나에 날짜 id(d1…)별로 저장합니다.
import { patch, useDoc } from './store.js';

// 앱에 같이 넣어 둔 기본 메모. 앱에서 고치거나 지우면 공유 DB 값이 우선이에요.
const SEED = {
  d1: {
    text: '공항(FCO) → 테르미니역 가는 법\nhttps://aistudio.multicampus.com/das?courseId=cmt9odmru013v01rvaa3qf34e&t=1792367898134',
    by: null,
    at: Date.parse('2026-10-19T00:00:00+09:00'),
  },
};

export function useDayNotes() {
  const doc = useDoc('settings', 'dayNotes');
  const out = {};
  for (const [k, v] of Object.entries(SEED)) if (doc?.[k] === undefined) out[k] = v;
  for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object' && v.text) out[k] = v;
  return out;
}

export function saveDayNote(dayId, text, uid) {
  return patch('settings', 'dayNotes', { [dayId]: { text: text.trim(), by: uid, at: Date.now() } });
}
