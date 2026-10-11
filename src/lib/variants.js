// 날짜별 일정 여러 개: 기본 일정 + itinerary.js의 alts(우천시 등) + 앱에서 직접 만든 일정.
// 어떤 일정을 볼지는 두 사람이 같이 보도록 공유 DB(settings/planChoice)에 저장합니다.
import { patch, useDoc } from './store.js';

export function useCustomPlans() {
  const doc = useDoc('settings', 'customPlans');
  const out = {};
  for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object' && v.day) out[k] = { id: k, ...v, custom: true };
  return out;
}

export function useVariants(day) {
  const custom = useCustomPlans();
  const choice = useDoc('settings', 'planChoice');
  if (!day) return { list: [], active: null };
  const list = [
    { id: 'main', label: '기본 일정', stops: day.stops },
    ...(day.alts || []),
    ...Object.values(custom).filter((p) => p.day === day.id).sort((a, b) => (a.at || 0) - (b.at || 0)),
  ];
  const chosen = choice?.[day.id];
  return { list, active: list.find((p) => p.id === chosen) || list[0] };
}

export const chooseVariant = (dayId, planId) => patch('settings', 'planChoice', { [dayId]: planId });

export function saveCustomPlan(id, data) {
  return patch('settings', 'customPlans', { [id]: { ...data, at: data.at || Date.now() } });
}

export function deleteCustomPlan(id) {
  return patch('settings', 'customPlans', { [id]: null });
}
