// 날짜별 날씨 (그날 밤 묵는 숙소 기준). 온라인일 때 Open-Meteo(키 없음)에서 받아 공유 DB(settings/weather)에 올려 두 폰이 같이 씁니다.
// 예보는 16일 앞까지만 나와서, 먼 날짜는 앱을 다시 열 때 채워져요. 오프라인이면 마지막으로 받은 값을 씁니다.
import { useEffect, useState } from 'react';
import { DAYS } from '../data/itinerary.js';
import { CITIES, PLACE_BY_ID } from '../data/places.js';
import { getPref, put, setPref, useDoc } from './store.js';

// 그날 밤 숙소(마지막 숙소). 숙박이 없는 마지막 날은 마지막 장소(로마 공항)
function stayOf(day) {
  const places = day.stops.map((s) => PLACE_BY_ID[s.place]).filter(Boolean);
  return [...places].reverse().find((p) => p.cat === 'stay') || places[places.length - 1];
}
export const STAY_BY_DATE = Object.fromEntries(DAYS.map((d) => [d.date, stayOf(d)]));
export const weatherCity = (date) => CITIES[STAY_BY_DATE[date]?.city]?.label || '';

export const WEATHER_KINDS = {
  rain: { icon: '🌧️', label: '비' },
  cloud: { icon: '☁️', label: '구름 많음' },
  sun: { icon: '☀️', label: '맑음' },
  hot: { icon: '🔥', label: '무더위' },
};
const HOT_C = 27;
const isWet = (c) => (c >= 51 && c <= 67) || (c >= 71 && c <= 86) || c >= 95;
export function weatherKind(w) {
  if (isWet(w.code) || w.pop >= 60) return 'rain';
  if (w.tmax >= HOT_C) return 'hot';
  if (w.code === 3 || w.code === 45 || w.code === 48 || w.cloud >= 60) return 'cloud';
  return 'sun';
}

const EMPTY = { at: 0, days: {} };
const STALE_MS = 3 * 3600 * 1000;

let inflight = null;
export function refreshWeather() {
  inflight ||= fetchWeather().finally(() => { inflight = null; });
  return inflight;
}

async function fetchWeather() {
  // 같은 숙소 좌표는 한 번만 물어봐요 (한 번의 요청으로 여러 곳)
  const spots = [];
  for (const d of DAYS) {
    const p = STAY_BY_DATE[d.date];
    if (p && !spots.some((s) => s.id === p.id)) spots.push(p);
  }
  const q = new URLSearchParams({
    latitude: spots.map((s) => s.lat.toFixed(4)).join(','),
    longitude: spots.map((s) => s.lng.toFixed(4)).join(','),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,cloud_cover_mean',
    timezone: 'Europe/Rome',
    forecast_days: '16',
  });
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
    if (!r.ok) return null;
    let j = await r.json();
    if (!Array.isArray(j)) j = [j];
    const prev = getPref('weather', EMPTY);
    const days = { ...prev.days };
    for (const d of DAYS) {
      const loc = j[spots.findIndex((s) => s.id === STAY_BY_DATE[d.date]?.id)];
      const i = loc?.daily?.time?.indexOf(d.date) ?? -1;
      if (i < 0) continue;
      const x = loc.daily;
      if (x.weather_code[i] == null || x.temperature_2m_max[i] == null) continue;
      days[d.date] = {
        code: x.weather_code[i],
        tmax: Math.round(x.temperature_2m_max[i]),
        tmin: Math.round(x.temperature_2m_min[i]),
        pop: x.precipitation_probability_max?.[i] ?? 0,
        cloud: x.cloud_cover_mean?.[i] ?? 0,
      };
    }
    const v = { at: Date.now(), days };
    setPref('weather', v);
    put('settings', 'weather', v);
    window.dispatchEvent(new Event('itp-weather'));
    return v;
  } catch {
    return null; // 오프라인 등 — 저장된 값 그대로
  }
}

// 앱을 켤 때 한 번(그리고 다시 온라인이 될 때) 오래된 날씨면 새로 받기
export function refreshWeatherIfStale() {
  if (navigator.onLine && Date.now() - getPref('weather', EMPTY).at > STALE_MS) refreshWeather();
}

// { 'YYYY-MM-DD': { code, tmax, tmin, pop, cloud, kind } }
export function useWeather() {
  const shared = useDoc('settings', 'weather');
  const [local, setLocal] = useState(() => getPref('weather', EMPTY));
  useEffect(() => {
    const on = () => setLocal(getPref('weather', EMPTY));
    window.addEventListener('itp-weather', on);
    return () => window.removeEventListener('itp-weather', on);
  }, []);
  // 다른 폰이 더 최근에 받은 값이면 그걸 이 폰에도 남겨 둬요
  useEffect(() => {
    if (shared?.at > local.at && shared.days) {
      setPref('weather', { at: shared.at, days: shared.days });
      setLocal({ at: shared.at, days: shared.days });
    }
  }, [shared?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  const out = {};
  for (const [date, w] of Object.entries(local.days || {})) out[date] = { ...w, kind: weatherKind(w) };
  return out;
}
