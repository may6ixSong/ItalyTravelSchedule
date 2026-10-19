// 날짜별 메모 (그날 일정 위에 두 사람이 같이 보고 고치는 메모). settings/dayNotes 문서 하나에 날짜 id(d1…)별로 저장합니다.
import { patch, useDoc } from './store.js';

export function useDayNotes() {
  const doc = useDoc('settings', 'dayNotes');
  const out = {};
  for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object' && v.text) out[k] = v;
  return out;
}

export function saveDayNote(dayId, text, uid) {
  return patch('settings', 'dayNotes', { [dayId]: { text: text.trim(), by: uid, at: Date.now() } });
}
