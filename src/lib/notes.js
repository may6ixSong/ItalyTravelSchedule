// 장소별 메모 (두 사람이 같이 보고 고치는 한 줄 · 여러 줄 메모). settings/notes 문서 하나에 장소 id별로 저장합니다.
import { patch, useDoc } from './store.js';

export function useNotes() {
  const doc = useDoc('settings', 'notes');
  const out = {};
  for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object' && v.text) out[k] = v;
  return out;
}

export function saveNote(placeId, text, uid) {
  return patch('settings', 'notes', { [placeId]: { text: text.trim(), by: uid, at: Date.now() } });
}
