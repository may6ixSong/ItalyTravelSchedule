// 유로 → 원화 환율. 온라인일 때 받아서 이 기기에 저장하고, 오프라인이면 마지막 값을 씁니다.
import { useEffect, useState } from 'react';
import { getPref, setPref } from './store.js';

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
  const [v, setV] = useState(() => getPref('eurkrw', FALLBACK));
  useEffect(() => {
    const on = () => setV(getPref('eurkrw', FALLBACK));
    window.addEventListener('itp-rate', on);
    // 6시간이 지났으면 새로 받기
    if (navigator.onLine && Date.now() - v.at > 6 * 3600 * 1000) refreshRate();
    return () => window.removeEventListener('itp-rate', on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
