// 기내 위치 어림잡기: '출발'을 누른 시각부터 지난 시간 ÷ 비행시간 만큼 경로를 따라 간 곳을 보여줘요.
// GPS · 인터넷 없이 시간만으로 계산해서 비행기 모드에서도 돼요 (실제 위치와는 조금 다를 수 있어요).
import { getPref, setPref } from './store.js';
import { useEffect, useState } from 'react';

// 로마 ↔ 인천 실제 항로와 비슷한 경로 (2022년부터 러시아 하늘을 피해 튀르키예 · 카스피해 · 중앙아시아 · 중국으로 가요)
// [위도, 경도, 그 근처 이름]
const ROME_TO_SEOUL = [
  [41.80, 12.25, '로마 피우미치노 공항'],
  [42.6, 15.2, '아드리아해'],
  [44.0, 18.5, '보스니아 · 세르비아'],
  [44.6, 24.0, '루마니아'],
  [43.6, 29.5, '불가리아 · 흑해 서쪽'],
  [43.0, 35.0, '흑해'],
  [42.0, 42.0, '조지아'],
  [40.6, 48.5, '아제르바이잔 · 카스피해 서쪽'],
  [41.4, 52.0, '카스피해'],
  [42.6, 57.5, '우즈베키스탄 · 카자흐스탄'],
  [43.0, 66.0, '카자흐스탄 남부'],
  [43.3, 72.5, '카자흐스탄 · 키르기스스탄'],
  [43.5, 78.0, '알마티 근처 (카자흐스탄)'],
  [43.9, 85.0, '우루무치 근처 (중국 신장)'],
  [42.6, 93.5, '중국 하미 · 고비사막'],
  [41.4, 102.0, '중국 내몽골 · 고비사막'],
  [40.6, 110.5, '중국 내몽골 바오터우'],
  [39.8, 116.5, '베이징 근처'],
  [38.6, 121.5, '서해 (다롄 근처)'],
  [37.46, 126.44, '인천국제공항'],
];

export const ROUTES = {
  'fco-icn': { id: 'fco-icn', label: '로마 → 인천', from: '로마', to: '인천', fromTz: 'Europe/Rome', toTz: 'Asia/Seoul', minutes: 760, pts: ROME_TO_SEOUL },
  'icn-fco': { id: 'icn-fco', label: '인천 → 로마', from: '인천', to: '로마', fromTz: 'Asia/Seoul', toTz: 'Europe/Rome', minutes: 850, pts: [...ROME_TO_SEOUL].reverse() },
};

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function km([la1, lo1], [la2, lo2]) {
  const a = Math.sin(rad(la2 - la1) / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 경로 전체 길이와 구간별 누적 거리
export function routeInfo(route) {
  const cum = [0];
  for (let i = 1; i < route.pts.length; i++) cum.push(cum[i - 1] + km(route.pts[i - 1], route.pts[i]));
  return { cum, total: cum[cum.length - 1] };
}

// 경로의 f(0~1) 지점: { lat, lng, i(구간), near(가까운 이름) }
export function pointAt(route, f) {
  const { cum, total } = routeInfo(route);
  const d = Math.max(0, Math.min(1, f)) * total;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = route.pts[i - 1];
  const b = route.pts[i];
  const t = cum[i] === cum[i - 1] ? 0 : (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
  const near = t < 0.5 ? a[2] : b[2];
  return { lat: a[0] + (b[0] - a[0]) * t, lng: a[1] + (b[1] - a[1]) * t, i, near, km: d, total };
}

// 진행 중인 비행: { route, start(ms), minutes }
export function getFlight() {
  return getPref('flight', null);
}
export function setFlight(v) {
  setPref('flight', v);
  window.dispatchEvent(new Event('itp-flight'));
}

// 지금 상태. 30초마다 다시 계산해요.
export function useFlight(tickMs = 30000) {
  const [flight, set] = useState(getFlight);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const on = () => set(getFlight());
    window.addEventListener('itp-flight', on);
    const t = setInterval(() => setNow(Date.now()), tickMs);
    const vis = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('itp-flight', on);
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [tickMs]);
  return [flight, now, setNow];
}

export const fmtDur = (min) => {
  const m = Math.max(0, Math.round(min));
  return `${Math.floor(m / 60)}시간 ${String(m % 60).padStart(2, '0')}분`;
};
export const clock = (ms, tz) => new Date(ms).toLocaleTimeString('ko-KR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
