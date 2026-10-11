// 유로 → 원화 환율. 온라인일 때 받아서 공유 DB(settings/liveRate)에 올려 두 폰이 같은 환율을 씁니다.
// 오프라인이면 마지막으로 받은 값(공유 DB 캐시 또는 이 폰에 남은 값 중 최신)을 씁니다.
import { useEffect, useState } from 'react';
import { getPref, put, setPref, useDoc } from './store.js';

const SOURCES = [
  async () => {
    const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=KRW');
    const j = await r.json();
    return j.rates.KRW;
  },
  async () => {
    const r = await fetch('https://open.er-api.com/v6/latest/EUR');
    const j = await r.json();
    return j.rates.KRW;
  },
];

const FALLBACK = { rate: 1600, at: 0 };

export async function refreshRate() {
  for (const src of SOURCES) {
    try {
      const rate = await src();
      if (rate > 0) {
        const v = { rate, at: Date.now() };
        setPref('eurkrw', v);
        put('settings', 'liveRate', v);
        window.dispatchEvent(new Event('itp-rate'));
        return v;
      }
    } catch {
      /* 다음 소스 시도 */
    }
  }
  return null;
}

export function useLiveRate() {
  const shared = useDoc('settings', 'liveRate');
  const [local, setLocal] = useState(() => getPref('eurkrw', FALLBACK));
  const sharedV = shared?.rate > 0 ? { rate: shared.rate, at: shared.at || 0 } : null;
  const v = sharedV && sharedV.at >= local.at ? sharedV : local;
  useEffect(() => {
    const on = () => setLocal(getPref('eurkrw', FALLBACK));
    window.addEventListener('itp-rate', on);
    return () => window.removeEventListener('itp-rate', on);
  }, []);
  useEffect(() => {
    if (shared === undefined) return; // 공유 DB 응답 기다리는 중
    // 이 폰에만 더 최신 값이 있으면 공유 DB에 올리고, 6시간이 지났으면 새로 받기
    if (local.at > (sharedV?.at || 0)) put('settings', 'liveRate', local);
    if (navigator.onLine && Date.now() - v.at > 6 * 3600 * 1000) refreshRate();
  }, [shared === undefined]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

// 공유 설정(settings/rates): { markup: 3, lots: [{id, eur, rate, date, memo}], cashUsesLot: true, fallbackToLive: true }
export const DEFAULT_RATE_SETTINGS = { markup: 3, lots: [], cashUsesLot: true, fallbackToLive: true };

// 환전한 유로 묶음별 남은 금액 (사용한 순서대로 차감)
export function lotBalances(lots, expenses) {
  const used = {};
  for (const e of expenses || []) {
    if (e.lotId) used[e.lotId] = (used[e.lotId] || 0) + (e.lotEur ?? e.amount);
  }
  return lots.map((l) => ({ ...l, used: used[l.id] || 0, left: Math.max(0, l.eur - (used[l.id] || 0)) }));
}

export const won = (n) => `₩ ${Math.round(n).toLocaleString('ko-KR')}`;
export const eur = (n) => `€${Number(n).toFixed(2)}`;
