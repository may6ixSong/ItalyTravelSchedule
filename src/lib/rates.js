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

// 미리 환전한 유로는 트래블월렛처럼 한 지갑으로 봅니다. 환전할 때마다 전체 환전 기록의 가중 평균 환율로 맞춰지고,
// 이 지갑에서 쓴 지출은 기록 당시 환율이 아니라 지금의 평균 환율로 원화를 다시 계산해요.
export function lotPool(lots, expenses) {
  const total = (lots || []).reduce((a, l) => a + (Number(l.eur) || 0), 0);
  const cost = (lots || []).reduce((a, l) => a + (Number(l.eur) || 0) * (Number(l.rate) || 0), 0);
  const used = (expenses || []).filter((e) => e.rateType === 'lot').reduce((a, e) => a + (e.lotEur ?? e.amount ?? 0), 0);
  return { eur: total, cost, rate: total > 0 ? cost / total : 0, used, left: Math.max(0, total - used) };
}

// 지출 한 건의 원화. 환전 지갑에서 쓴 부분은 지금 평균 환율, 잔액을 넘어 현재 환율로 계산한 부분은 그때 금액 그대로.
export function expenseKrw(e, pool, lots) {
  if (e.currency !== 'EUR' || e.rateType !== 'lot' || !(pool?.rate > 0)) return e.krw || 0;
  const lotEur = e.lotEur ?? e.amount ?? 0;
  let over = e.overKrw;
  if (over == null) {
    // 예전 기록: 그때 쓴 환전 환율로 지갑 부분을 빼서 초과분을 구해요
    const old = (lots || []).find((l) => l.id === e.lotId)?.rate;
    over = lotEur < (e.amount || 0) && old ? Math.max(0, (e.krw || 0) - lotEur * old) : 0;
  }
  return Math.round(lotEur * pool.rate + over);
}

export const won = (n) => `₩ ${Math.round(n).toLocaleString('ko-KR')}`;
export const eur = (n) => `€${Number(n).toFixed(2)}`;
