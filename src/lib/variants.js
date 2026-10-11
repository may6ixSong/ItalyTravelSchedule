// 날짜별 일정 여러 개: 기본 일정 + itinerary.js의 alts(우천시 등) + 앱에서 직접 만든 일정.
// 어떤 일정을 볼지는 두 사람이 같이 보도록 공유 DB(settings/planChoice)에 저장합니다.
// 코드에 있는 일정(기본 · alts)을 앱에서 고치면 settings/planOverrides에 저장돼 코드 일정 위에 덮어씌워져요.
//   { "d2:main": { label, stops, by, at } } — 지우면 코드 일정으로 되돌아가요.
import { useMemo } from 'react';
import { DAYS } from '../data/itinerary.js';
import { patch, useDoc } from './store.js';

export function useCustomPlans() {
  const doc = useDoc('settings', 'customPlans');
  const out = {};
  for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object' && v.day) out[k] = { id: k, ...v, custom: true };
  return out;
}

export const overrideKey = (dayId, planId) => `${dayId}:${planId}`;

export function usePlanOverrides() {
  const doc = useDoc('settings', 'planOverrides');
  const out = {};
  for (const [k, v] of Object.entries(doc || {})) if (v && typeof v === 'object' && Array.isArray(v.stops)) out[k] = v;
  return out;
}

export function useVariants(day) {
  const custom = useCustomPlans();
  const overrides = usePlanOverrides();
  const choice = useDoc('settings', 'planChoice');
  if (!day) return { list: [], active: null };
  const withOverride = (v) => {
    const o = overrides[overrideKey(day.id, v.id)];
    return o ? { ...v, label: o.label || v.label, stops: o.stops, overridden: true, original: v } : v;
  };
  const list = [
    withOverride({ id: 'main', label: day.mainLabel || '기본 일정', stops: day.stops }),
    ...(day.alts || []).map(withOverride),
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

// 코드 일정(기본 · alts)을 고친 내용 저장 / 지우기(= 원래 일정으로)
export function saveOverride(dayId, planId, data) {
  return patch('settings', 'planOverrides', { [overrideKey(dayId, planId)]: { ...data, at: Date.now() } });
}

export function resetOverride(dayId, planId) {
  return patch('settings', 'planOverrides', { [overrideKey(dayId, planId)]: null });
}

// 장소별로 어느 날 일정에 들어 있는지 (앱에서 고친 일정 포함). 후보에 "10/22 일정" 표시용.
export function usePlaceDays() {
  const overrides = usePlanOverrides();
  return useMemo(() => {
    const out = {};
    for (const d of DAYS) {
      const plans = [{ id: 'main', stops: d.stops }, ...(d.alts || [])];
      for (const v of plans) {
        const stops = overrides[overrideKey(d.id, v.id)]?.stops || v.stops;
        for (const s of stops) {
          if (!s.place) continue;
          const list = (out[s.place] ||= []);
          if (!list.includes(d.id)) list.push(d.id);
        }
      }
    }
    return out;
  }, [overrides]);
}
