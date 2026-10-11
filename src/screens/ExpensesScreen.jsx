// 가계부: 지금까지 쓴 돈 · 날짜별 · 테마별 · 정산 · 환율 설정. 유로는 기록할 때 고른 환율로 원화를 계산해 저장합니다.
import { useEffect, useMemo, useState } from 'react';
import { THEMES, THEME_BY_ID } from '../data/expenseThemes.js';
import { dayLabel, todayIso } from '../data/itinerary.js';
import { TRIP } from '../config.js';
import { DEFAULT_RATE_SETTINGS, eur, lotBalances, refreshRate, useLiveRate, won } from '../lib/rates.js';
import { add, getOne, patch, put, remove, useCollection, useDoc } from '../lib/store.js';
import { EXPENSE_SEED } from '../data/expenseSeed.js';
import { useMe } from '../lib/user.js';
import { useUsers } from '../components/PlaceDetail.jsx';
import { Avatar, Icon, Modal, ModalHead, Switch } from '../components/ui.jsx';

const THEME_ICON = { food: 'meal', shop: 'shop', transport: 'train', stay: 'stay', tour: 'ticket', public: 'pin', telecom: 'wifi', fine: 'note', citytax: 'stay', tip: 'meal', pharmacy: 'plus', exchange: 'swap', etc: 'list' };
const THEME_TINT = { food: ['#F6DCCF', '#D9480F'], shop: ['#EEE9FC', '#6741D9'], transport: ['#DDE8F0', '#1F5F8B'], stay: ['#E4E7EA', '#212B33'], tour: ['#FBE6DA', '#C2410C'], public: ['#E1F1F3', '#0B7285'] };
const tint = (t) => THEME_TINT[t] || ['#EFEBE3', '#5A6470'];

function useRateSettings() {
  const doc = useDoc('settings', 'rates');
  return { ...DEFAULT_RATE_SETTINGS, ...(doc || {}) };
}

// 미리 결제한 경비를 처음 한 번만 넣기 (이미 있는 id는 건드리지 않아요)
let seeding = null;
function seedPrepaidOnce(rows, liveRate, uid) {
  seeding ||= (async () => {
    const meta = await getOne('settings', 'meta');
    if (meta?.expensesSeeded) return;
    const have = new Set(rows.map((r) => r.id));
    const at = Date.now();
    await Promise.all(EXPENSE_SEED.filter((e) => !have.has(e.id)).map(({ id, ...e }, i) => {
      const krw = e.currency === 'EUR' ? Math.round(e.amount * liveRate) : e.amount;
      return put('expenses', id, {
        ...e, krw, rate: e.currency === 'EUR' ? liveRate : null, rateType: e.currency === 'EUR' ? 'live' : null, lotId: '', lotEur: 0,
        payment: 'card', payer: '', prepaid: true, by: uid, at: at + i,
      });
    }));
    await patch('settings', 'meta', { expensesSeeded: true });
  })().catch((e) => {
    seeding = null; // 오프라인 등으로 실패하면 다음에 다시 시도
    console.warn('seed', e);
  });
  return seeding;
}

export default function ExpensesScreen() {
  const rows = useCollection('expenses');
  const users = useUsers();
  const [tab, setTab] = useState('date');
  const [editing, setEditing] = useState(null); // {} = 새로 추가
  const [rates, setRates] = useState(false);
  const today = todayIso();
  const list = rows || [];
  const me = useMe();
  const live = useLiveRate();
  const rateDoc = useDoc('settings', 'rates');
  useEffect(() => {
    // 목록 · 환율 설정 · 실제 환율을 다 받은 뒤에 (유로 항목을 원화로 바꿔야 해서)
    if (rows && rateDoc !== undefined && live.at > 0) seedPrepaidOnce(rows, live.rate + Number((rateDoc || DEFAULT_RATE_SETTINGS).markup ?? 3), me.uid);
  }, [rows === null, rateDoc === undefined, live.at > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = list.reduce((s, e) => s + (e.krw || 0), 0);
  const prepaid = list.filter((e) => e.prepaid).reduce((s, e) => s + (e.krw || 0), 0);
  const todaySum = list.filter((e) => e.date === today && !e.prepaid).reduce((s, e) => s + (e.krw || 0), 0);

  return (
    <div className="scroll">
      <div className="top">
        <div className="top-inner">
          <div className="row">
            <h1 className="grow">가계부</h1>
            <span className="row" style={{ gap: 0 }}>{Object.values(users).map((u) => <Avatar key={u.uid} user={u} size={30} />)}</span>
            <button className="icon-btn" onClick={() => setRates(true)} aria-label="환율 설정"><Icon name="swap" /></button>
          </div>
          <div className="seg" role="tablist">
            <button role="tab" className={tab === 'date' ? 'on' : ''} onClick={() => setTab('date')}>날짜별</button>
            <button role="tab" className={tab === 'theme' ? 'on' : ''} onClick={() => setTab('theme')}>테마별 · 정산</button>
          </div>
        </div>
      </div>
      <div className="page">
        <section className="summary">
          <div>
            <div className="small" style={{ color: '#b7c0c8' }}>지금까지 쓴 돈</div>
            <div className="big">{won(total)}</div>
          </div>
          <div className="split">
            <div><span>현지 지출</span><b>{won(total - prepaid)}</b></div>
            <div><span>사전 결제</span><b>{won(prepaid)}</b></div>
            <div><span>오늘</span><b>{won(todaySum)}</b></div>
          </div>
        </section>
        {rows && list.length === 0 && <div className="empty">아직 기록이 없어요. 오른쪽 아래 + 로 첫 지출을 적어보세요.</div>}
        {tab === 'date' ? <ByDate list={list} users={users} onEdit={setEditing} /> : <ByTheme list={list} users={users} />}
      </div>
      <button className="add-fab" onClick={() => setEditing({})} aria-label="지출 추가"><Icon name="plus" size={24} stroke={2.4} /></button>
      {editing && <ExpenseEditor initial={editing} all={list} onClose={() => setEditing(null)} onRates={() => setRates(true)} />}
      {rates && <RateSettings all={list} onClose={() => setRates(false)} />}
    </div>
  );
}

function ByDate({ list, users, onEdit }) {
  const groups = {};
  [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.at || 0) - (a.at || 0)).forEach((e) => (groups[e.date] ||= []).push(e));
  return Object.entries(groups).map(([date, items]) => {
    const l = dayLabel(date);
    return (
      <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="section-title"><span className="grow">{l.md} ({l.wd}){date < TRIP.start ? ' · 출국 전' : ''}</span><span>{won(items.reduce((s, e) => s + (e.krw || 0), 0))}</span></div>
        <div className="card list">
          {items.map((e) => <Entry key={e.id} e={e} user={users[e.payer]} onClick={() => onEdit(e)} />)}
        </div>
      </div>
    );
  });
}

function rateNote(e) {
  if (e.currency !== 'EUR') return '원화';
  const r = e.rateType === 'lot' && e.lotEur < e.amount ? '환전+현재' : e.rateType === 'lot' ? `환전 ${Math.round(e.rate).toLocaleString()}` : `현재 ${e.rate?.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}`;
  return `${eur(e.amount)} · ${r}`;
}

function Entry({ e, user, onClick }) {
  const [bg, fg] = tint(e.theme);
  return (
    <button className="item" onClick={onClick}>
      <span className="theme-ic" style={{ background: bg, color: fg }}><Icon name={THEME_ICON[e.theme] || 'list'} size={18} /></span>
      <span className="grow">
        <span style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem' }}>{e.title || THEME_BY_ID[e.theme]?.label}</span>
        <span className="tiny muted">{THEME_BY_ID[e.theme]?.label} · {e.payment === 'cash' ? '현금' : '카드'}{e.prepaid ? ' · 사전 결제' : ''}</span>
      </span>
      <span style={{ textAlign: 'right' }}>
        <span style={{ display: 'block', fontWeight: 700 }}>{won(e.krw)}</span>
        <span className="tiny muted">{rateNote(e)}</span>
      </span>
      {user ? <Avatar user={user} size={22} /> : <span className="tiny muted" style={{ width: 22 }}>공동</span>}
    </button>
  );
}

function ByTheme({ list, users }) {
  const [scope, setScope] = useState('local');
  const rows = list.filter((e) => scope === 'all' || !e.prepaid);
  const sums = THEMES.map((t) => ({ ...t, krw: rows.filter((e) => e.theme === t.id).reduce((s, e) => s + (e.krw || 0), 0), n: rows.filter((e) => e.theme === t.id).length }))
    .filter((t) => t.n)
    .sort((a, b) => b.krw - a.krw);
  const max = sums[0]?.krw || 1;
  const total = rows.reduce((s, e) => s + (e.krw || 0), 0);
  const people = Object.values(users).map((u) => ({ u, paid: rows.filter((e) => e.payer === u.uid).reduce((s, e) => s + (e.krw || 0), 0), n: rows.filter((e) => e.payer === u.uid).length }));
  const half = people.length === 2 ? (people[0].paid - people[1].paid) / 2 : 0;
  return (
    <>
      <div className="chips">
        <button className={`chip ${scope === 'local' ? 'solid' : ''}`} onClick={() => setScope('local')}>현지 지출</button>
        <button className={`chip ${scope === 'all' ? 'solid' : ''}`} onClick={() => setScope('all')}>사전 결제 포함</button>
      </div>
      <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row"><b className="grow">테마별 지출</b><b style={{ fontSize: '1.1rem' }}>{won(total)}</b></div>
        <div className="bars">
          {sums.map((t) => (
            <FragmentRow key={t.id} label={t.label} value={won(t.krw)} pct={(t.krw / max) * 100} />
          ))}
        </div>
        {!sums.length && <span className="small muted">기록이 쌓이면 여기에 보여요.</span>}
        <span className="tiny muted">유로 지출은 기록할 때 고른 환율(현재 / 미리 환전)로 원화 환산해서 합산</span>
      </section>
      <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <b>누가 얼마나 냈나</b>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {people.map(({ u, paid, n }) => (
            <div key={u.uid} style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
              <div className="row small bold" style={{ gap: 6 }}><Avatar user={u} size={22} />{u.name}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4 }}>{won(paid)}</div>
              <div className="tiny muted">{n}건</div>
            </div>
          ))}
        </div>
        {people.length === 2 && Math.abs(half) >= 1 && (
          <div className="summary" style={{ padding: '12px 14px' }}>
            <span>반반 정산하면 <b>{(half > 0 ? people[1] : people[0]).u.name} → {(half > 0 ? people[0] : people[1]).u.name} {won(Math.abs(half))}</b></span>
          </div>
        )}
      </section>
    </>
  );
}

function FragmentRow({ label, value, pct }) {
  return (
    <>
      <span>{label}</span>
      <i style={{ width: `${Math.max(2, pct)}%` }} />
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </>
  );
}

/* ---------- 지출 추가 · 수정 ---------- */
function ExpenseEditor({ initial, all, onClose, onRates }) {
  const me = useMe();
  const users = useUsers();
  const live = useLiveRate();
  const settings = useRateSettings();
  const isNew = !initial.id;
  const today = todayIso();
  const [currency, setCurrency] = useState(initial.currency || 'EUR');
  const [amount, setAmount] = useState(initial.amount != null ? String(initial.amount) : '');
  const [title, setTitle] = useState(initial.title || '');
  const [theme, setTheme] = useState(initial.theme || 'food');
  const [date, setDate] = useState(initial.date || today);
  const [payment, setPayment] = useState(initial.payment || 'card');
  const [payer, setPayer] = useState(initial.payer ?? me.uid);
  const [prepaid, setPrepaid] = useState(initial.prepaid ?? today < TRIP.start);
  const others = all.filter((e) => e.id !== initial.id);
  const balances = lotBalances(settings.lots, others);
  // 환율 설정(공유 DB)은 조금 늦게 도착할 수 있어서, 사용자가 직접 고르기 전까지는 설정에 맞춰 기본값을 계산합니다.
  const [rateChoice, setRateType] = useState(initial.rateType || null);
  const [lotChoice, setLotId] = useState(initial.lotId || '');
  const hasLot = balances.some((l) => l.left > 0);
  const rateType = rateChoice || (settings.cashUsesLot && payment === 'cash' && hasLot ? 'lot' : 'live');
  const lotId = lotChoice || balances.find((l) => l.left > 0)?.id || balances[0]?.id || '';
  const liveRate = live.rate + Number(settings.markup || 0);
  const value = Number(String(amount).replace(',', '.')) || 0;

  const calc = useMemo(() => {
    if (currency === 'KRW') return { krw: value, rate: null, rateType: null };
    const lot = balances.find((l) => l.id === lotId);
    if (rateType === 'lot' && lot) {
      if (value <= lot.left || !settings.fallbackToLive) return { krw: value * lot.rate, rate: lot.rate, rateType: 'lot', lotId, lotEur: value };
      const krw = lot.left * lot.rate + (value - lot.left) * liveRate;
      return { krw, rate: krw / value, rateType: 'lot', lotId, lotEur: lot.left };
    }
    return { krw: value * liveRate, rate: liveRate, rateType: 'live' };
  }, [currency, value, rateType, lotId, liveRate, settings.fallbackToLive, balances]); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePayment = (p) => {
    setPayment(p);
    if (isNew) setRateType(null);
  };

  const save = () => {
    const doc = {
      date, title: title.trim(), theme, currency, amount: value, krw: Math.round(calc.krw),
      rate: calc.rate, rateType: calc.rateType, lotId: calc.lotId || '', lotEur: calc.lotEur ?? 0,
      payment, payer, prepaid, by: initial.by || me.uid, at: initial.at || Date.now(),
    };
    if (isNew) add('expenses', doc);
    else put('expenses', initial.id, doc);
    onClose();
  };
  const lot = balances.find((l) => l.id === lotId);

  return (
    <Modal onClose={onClose} label="지출">
      <ModalHead title={isNew ? '지출 추가' : '지출 수정'} onClose={onClose} />
      <div className="row">
        <div className="seg dark" style={{ flexShrink: 0 }}>
          <button className={currency === 'KRW' ? 'on' : ''} onClick={() => setCurrency('KRW')} style={{ padding: '0 12px' }}>₩ 원화</button>
          <button className={currency === 'EUR' ? 'on' : ''} onClick={() => setCurrency('EUR')} style={{ padding: '0 12px' }}>€ 유로</button>
        </div>
        <label className="amount-input">
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--muted)' }}>{currency === 'EUR' ? '€' : '₩'}</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" aria-label="금액" autoFocus={isNew} />
        </label>
      </div>

      {currency === 'EUR' && (
        <div className="field" role="radiogroup" aria-label="원화 환산 기준">
          <span>원화 환산 기준</span>
          <label className={`radio-card ${rateType === 'live' ? 'on' : ''}`}>
            <input type="radio" checked={rateType === 'live'} onChange={() => setRateType('live')} />
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 600 }}>현재 환율 + 우대 {settings.markup}원</span>
              <span className="tiny muted">{live.rate.toFixed(2)} + {settings.markup} = {liveRate.toFixed(2)}{live.at ? ` · ${new Date(live.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 기준` : ' · 기본값 (온라인 연결 시 갱신)'}</span>
            </span>
            <b>{won(value * liveRate)}</b>
          </label>
          {balances.length > 0 ? (
            <label className={`radio-card ${rateType === 'lot' ? 'on' : ''}`}>
              <input type="radio" checked={rateType === 'lot'} onChange={() => setRateType('lot')} />
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 600 }}>미리 환전한 유로</span>
                {balances.length > 1 ? (
                  <select className="input" style={{ minHeight: 34, marginTop: 4, fontSize: '0.8rem' }} value={lotId} onChange={(e) => { setLotId(e.target.value); setRateType('lot'); }}>
                    {balances.map((l) => <option key={l.id} value={l.id}>{l.memo || `${eur(l.eur)} 환전`} · {l.rate} · 남은 {eur(l.left)}</option>)}
                  </select>
                ) : (
                  <span className="tiny muted">{lot?.rate.toLocaleString()} · 남은 {eur(lot?.left || 0)}{rateType === 'lot' && value ? ` → ${eur(Math.max(0, (lot?.left || 0) - value))}` : ''}</span>
                )}
                {rateType === 'lot' && lot && value > lot.left && settings.fallbackToLive && <span className="tiny" style={{ display: 'block', color: 'var(--warn)' }}>잔액을 넘는 {eur(value - lot.left)}는 현재 환율로 계산</span>}
              </span>
              <b>{rateType === 'lot' ? won(calc.krw) : lot ? won(value * lot.rate) : ''}</b>
            </label>
          ) : (
            <button className="btn small ghost" onClick={onRates}>미리 환전한 환율 등록하기</button>
          )}
        </div>
      )}

      <label className="field"><span>내용</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: Bonci Pizzarium" /></label>
      <div className="field">
        <span>테마</span>
        <div className="chips wrap">
          {THEMES.map((t) => <button key={t.id} className={`chip ${theme === t.id ? 'on' : ''}`} style={{ '--c': tint(t.id)[1] }} onClick={() => setTheme(t.id)}>{t.label}</button>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <label className="field"><span>날짜</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <div className="field"><span>결제</span>
          <div className="seg"><button className={payment === 'card' ? 'on' : ''} onClick={() => choosePayment('card')}>카드</button><button className={payment === 'cash' ? 'on' : ''} onClick={() => choosePayment('cash')}>현금</button></div>
        </div>
      </div>
      <div className="field">
        <span>누가 냈나요</span>
        <div className="chips wrap">
          {Object.values(users).map((u) => <button key={u.uid} className={`chip ${payer === u.uid ? 'on' : ''}`} style={{ '--c': u.color }} onClick={() => setPayer(u.uid)}><Avatar user={u} size={20} />{u.name}</button>)}
          <button className={`chip ${payer === '' ? 'on' : ''}`} onClick={() => setPayer('')}>공동 지갑</button>
        </div>
      </div>
      <div className="row">
        <span className="grow"><b style={{ fontSize: '0.9rem' }}>사전 결제</b><span className="tiny muted" style={{ display: 'block' }}>출국 전에 결제한 숙소 · 기차 · 투어</span></span>
        <Switch checked={prepaid} onChange={setPrepaid} label="사전 결제" />
      </div>
      <div className="row">
        {!isNew && <button className="btn" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('이 지출을 지울까요?')) { remove('expenses', initial.id); onClose(); } }}><Icon name="trash" size={16} /></button>}
        <button className="btn primary grow" disabled={!value} onClick={save}>{won(calc.krw)} 으로 저장 · {dayLabel(date).md}</button>
      </div>
    </Modal>
  );
}

/* ---------- 환율 설정 (두 사람 공유) ---------- */
function RateSettings({ all, onClose }) {
  const live = useLiveRate();
  const s = useRateSettings();
  const [busy, setBusy] = useState(false);
  const [lot, setLot] = useState({ eur: '', rate: '', memo: '' });
  const save = (p) => patch('settings', 'rates', { ...s, ...p });
  const balances = lotBalances(s.lots, all);
  const addLot = () => {
    const e = Number(lot.eur);
    const r = Number(lot.rate);
    if (!e || !r) return;
    save({ lots: [...s.lots, { id: Date.now().toString(36), eur: e, rate: r, memo: lot.memo.trim(), date: todayIso() }] });
    setLot({ eur: '', rate: '', memo: '' });
  };
  return (
    <Modal onClose={onClose} label="환율 설정">
      <ModalHead title="환율 설정" sub="동행과 같이 써요" onClose={onClose} />
      <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="row">
          <b className="grow">현재 환율</b>
          <button className="btn small" disabled={busy} onClick={async () => { setBusy(true); const r = await refreshRate(); setBusy(false); if (!r) alert('환율을 못 받아왔어요. 인터넷 연결을 확인해 주세요.'); }}>
            <Icon name="refresh" size={14} />{busy ? '받는 중' : '새로고침'}
          </button>
        </div>
        <div><span className="small muted">€1 = </span><b style={{ fontSize: '1.5rem' }}>₩ {live.rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
        <span className="tiny muted">{live.at ? `${new Date(live.at).toLocaleString('ko-KR')} 받음 · 오프라인이면 마지막 값 사용` : '아직 못 받았어요 (기본값 1,600) · 온라인이면 자동으로 받아요'}</span>
        <div className="row" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10 }}>
          <span className="grow"><b style={{ fontSize: '0.9rem' }}>우대 가산</b><span className="tiny muted" style={{ display: 'block' }}>카드 결제 수수료 감안</span></span>
          <button className="icon-btn" onClick={() => save({ markup: Math.max(0, s.markup - 1) })} aria-label="1원 내리기">−</button>
          <b style={{ width: 56, textAlign: 'center' }}>+{s.markup}원</b>
          <button className="icon-btn" onClick={() => save({ markup: s.markup + 1 })} aria-label="1원 올리기">+</button>
        </div>
        <div className="row" style={{ background: 'var(--accent-bg)', borderRadius: 10, padding: '10px 12px' }}>
          <span className="grow small">적용 환율</span><b style={{ color: 'var(--accent)' }}>{(live.rate + s.markup).toFixed(2)}</b>
        </div>
      </section>

      <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="row"><b className="grow">미리 환전한 유로</b><span className="small muted">남은 {eur(balances.reduce((a, l) => a + l.left, 0))}</span></div>
        {balances.map((l) => (
          <div key={l.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row">
              <span className="grow"><b>{eur(l.eur)} · ₩ {l.rate.toLocaleString()}</b><span className="tiny muted" style={{ display: 'block' }}>{l.memo || '환전'} · 사용 {eur(l.used)} / 남은 {eur(l.left)}</span></span>
              <button className="btn small ghost" style={{ color: 'var(--danger)' }} onClick={() => confirm('이 환전 기록을 지울까요?') && save({ lots: s.lots.filter((x) => x.id !== l.id) })}><Icon name="trash" size={14} /></button>
            </div>
            <div className="progress"><i style={{ width: `${(l.used / l.eur) * 100}%` }} /></div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
          <input className="input" inputMode="decimal" placeholder="유로 (예: 500)" value={lot.eur} onChange={(e) => setLot({ ...lot, eur: e.target.value })} />
          <input className="input" inputMode="decimal" placeholder="환율 (예: 1580)" value={lot.rate} onChange={(e) => setLot({ ...lot, rate: e.target.value })} />
          <input className="input" placeholder="메모 (은행 등)" value={lot.memo} onChange={(e) => setLot({ ...lot, memo: e.target.value })} />
        </div>
        <button className="btn" onClick={addLot} disabled={!Number(lot.eur) || !Number(lot.rate)}><Icon name="plus" size={16} />환전 기록 추가</button>
      </section>

      <section className="card" style={{ padding: '4px 14px' }}>
        <div className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--line-2)' }}>
          <span className="grow"><b style={{ fontSize: '0.9rem' }}>현금 결제는 환전 환율로 시작</b><span className="tiny muted" style={{ display: 'block' }}>지출 추가에서 '미리 환전한 유로'가 먼저 체크돼요</span></span>
          <Switch checked={s.cashUsesLot} onChange={(v) => save({ cashUsesLot: v })} label="현금 결제는 환전 환율로" />
        </div>
        <div className="row" style={{ padding: '12px 0' }}>
          <span className="grow"><b style={{ fontSize: '0.9rem' }}>환전 잔액을 넘으면 현재 환율로</b><span className="tiny muted" style={{ display: 'block' }}>넘는 금액만 현재 환율 + 우대로 계산</span></span>
          <Switch checked={s.fallbackToLive} onChange={(v) => save({ fallbackToLive: v })} label="잔액 초과분은 현재 환율" />
        </div>
      </section>
    </Modal>
  );
}
