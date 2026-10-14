// 날짜별 날씨 (그날 밤 묵는 숙소 기준). 온라인일 때 Open-Meteo(키 없음)에서 받아 공유 DB(settings/weather)에 올려 두 폰이 같이 씁니다.
// 16일 안은 일반 예보, 그 뒤 날짜는 앙상블 예보(35일까지)로 채워요. 앱을 켤 때 한 번만 받아요. 오프라인일 때는 지도 화면에서 날씨를 아예 보여주지 않아요.
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
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,cloud_cover_mean';
// 앙상블(GFS 0.5°)은 35일 앞까지 나와요. 일반 예보(16일)에 없는 먼 날짜를 이걸로 채워요.
const ENS_DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,cloud_cover_mean';

const romeIso = (ms) => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const addDays = (iso, n) => romeIso(new Date(iso + 'T12:00:00Z').getTime() + n * 86400000);

// 날짜들에 필요한 숙소 좌표만 (같은 곳은 한 번만, 한 번의 요청으로 여러 곳)
function spotsFor(dates) {
  const spots = [];
  for (const date of dates) {
    const p = STAY_BY_DATE[date];
    if (p && !spots.some((s) => s.id === p.id)) spots.push(p);
  }
  return spots;
}

async function get(url, dates, daily) {
  const spots = spotsFor(dates);
  const q = new URLSearchParams({
    latitude: spots.map((s) => s.lat.toFixed(4)).join(','),
    longitude: spots.map((s) => s.lng.toFixed(4)).join(','),
    daily,
    timezone: 'Europe/Rome',
    start_date: dates[0],
    end_date: dates[dates.length - 1],
  });
  if (url.includes('ensemble')) q.set('models', 'gfs05');
  const r = await fetch(`${url}?${q}`);
  if (!r.ok) return [];
  let j = await r.json();
  if (!Array.isArray(j)) j = [j];
  return dates.map((date) => {
    const x = j[spots.findIndex((s) => s.id === STAY_BY_DATE[date]?.id)]?.daily;
    return { date, x, i: x?.time?.indexOf(date) ?? -1 };
  }).filter((o) => o.i >= 0);
}

// 앙상블: 대표값(control)과 멤버들(…_member01 …)의 평균, 비 확률 = 1mm 이상 오는 멤버 비율
const members = (x, v, i) => Object.keys(x).filter((k) => k === v || k.startsWith(`${v}_member`)).map((k) => x[k][i]).filter((n) => n != null);
const avg = (a) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : null);

async function fetchWeather() {
  // 여행 날짜 중 오늘 이후만 (지난 날은 저장된 값 그대로)
  const today = romeIso(Date.now());
  const want = DAYS.map((d) => d.date).filter((d) => d >= today && d <= addDays(today, 34));
  if (!want.length) return null;
  const days = { ...getPref('weather', EMPTY).days };
  let got = 0;
  try {
    const near = want.filter((d) => d <= addDays(today, 14));
    if (near.length) {
      for (const { date, x, i } of await get('https://api.open-meteo.com/v1/forecast', near, DAILY)) {
        if (x.weather_code?.[i] == null || x.temperature_2m_max?.[i] == null) continue;
        days[date] = {
          code: x.weather_code[i],
          tmax: Math.round(x.temperature_2m_max[i]),
          tmin: Math.round(x.temperature_2m_min[i]),
          pop: x.precipitation_probability_max?.[i] ?? 0,
          cloud: x.cloud_cover_mean?.[i] ?? 0,
          fresh: today,
        };
        got++;
      }
    }
  } catch {
    /* 아래 앙상블로 채워봐요 */
  }
  try {
    const far = want.filter((d) => days[d]?.fresh !== today);
    if (far.length) {
      const ENS = 'https://ensemble-api.open-meteo.com/v1/ensemble';
      let rows = await get(ENS, far, ENS_DAILY);
      // 날씨 코드 · 구름양을 못 주는 경우 기온 · 강수만으로 한 번 더
      if (!rows.length) rows = await get(ENS, far, 'temperature_2m_max,temperature_2m_min,precipitation_sum');
      for (const { date, x, i } of rows) {
        const tmax = avg(members(x, 'temperature_2m_max', i));
        if (tmax == null) continue;
        const rain = members(x, 'precipitation_sum', i);
        days[date] = {
          code: x.weather_code?.[i] ?? null,
          tmax: Math.round(tmax),
          tmin: Math.round(avg(members(x, 'temperature_2m_min', i)) ?? tmax),
          pop: rain.length ? Math.round((rain.filter((n) => n >= 1).length / rain.length) * 100) : 0,
          cloud: Math.round(avg(members(x, 'cloud_cover_mean', i)) ?? 0),
          fresh: today,
          rough: true, // 먼 날짜라 대략적인 예보
        };
        got++;
      }
    }
  } catch {
    /* 오프라인 등 — 저장된 값 그대로 */
  }
  if (!got) return null;
  const v = { at: Date.now(), days };
  setPref('weather', v);
  put('settings', 'weather', v);
  window.dispatchEvent(new Event('itp-weather'));
  return v;
}

// 데이터 아끼기: 앱을 켤 때 온라인이면 딱 한 번만 받아요. 그 뒤로는 앱 안에서 다시 요청하지 않아요.
let started = false;
export function fetchWeatherOnLaunch() {
  if (started || !navigator.onLine) return;
  started = true;
  fetchWeather();
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
