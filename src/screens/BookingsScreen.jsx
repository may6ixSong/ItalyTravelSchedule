// 예약 탭: [예약 내역 | 준비 체크리스트 | 쇼핑 목록]
import { Fragment, useState } from 'react';
import { BOOKING_TYPES } from '../data/bookings.js';
import { CITIES } from '../data/places.js';
import { DAYS } from '../data/itinerary.js';
import { deleteBooking, isCodeBooking, newBookingId, resetBooking, saveBooking, useBookings } from '../lib/bookings.js';
import { useMe } from '../lib/user.js';
import { PlacePicker } from '../components/VariantEditor.jsx';
import { MiniMarker } from '../components/ui.jsx';
import { dayLabel, todayIso } from '../data/itinerary.js';
import { directionsUrl } from '../lib/geo.js';
import { getPref, setPref } from '../lib/store.js';
import { usePlaces } from '../lib/places.js';
import { Icon, Modal, ModalHead, Switch } from '../components/ui.jsx';
import Checklist from './Checklist.jsx';
import Shopping from './Shopping.jsx';

const TYPE_ICON = { stay: 'stay', train: 'train', ferry: 'ferry', flight: 'flight', tour: 'tour', car: 'car', meal: 'meal' };
const TYPE_TINT = { stay: ['#E4E7EA', '#212B33'], train: ['#DDE8F0', '#1F5F8B'], ferry: ['#DDE8F0', '#1F5F8B'], flight: ['#DDE8F0', '#1F5F8B'], tour: ['#FBE6DA', '#C2410C'], car: ['#E4EBDA', '#4F6B2E'], meal: ['#FBE6DA', '#D9480F'] };
const FILTERS = [['all', '전체'], ['stay', '숙소'], ['move', '교통'], ['tour', '투어 · 식당']];

export default function BookingsScreen({ tab, setTab, openId, clearOpen }) {
  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="top">
        <div className="top-inner">
          <div className="seg" role="tablist">
            <button role="tab" className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>예약 내역</button>
            <button role="tab" className={tab === 'check' ? 'on' : ''} onClick={() => setTab('check')}>준비 체크리스트</button>
            <button role="tab" className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>쇼핑 목록</button>
          </div>
        </div>
      </div>
      {tab === 'list' ? <BookingList openId={openId} clearOpen={clearOpen} /> : tab === 'buy' ? <Shopping /> : <Checklist />}
    </div>
  );
}

function BookingList({ openId, clearOpen }) {
  const today = todayIso();
  const [filter, setFilter] = useState('all');
  const [showPast, setShowPast] = useState(false);
  const bookings = useBookings();
  const [openKey, setOpenKey] = useState(openId || null);
  const open = openKey ? bookings.find((b) => b.id === openKey) : null;
  const [editing, setEditing] = useState(null); // {} = 새 예약
  const [, force] = useState(0);
  const items = bookings.filter((b) => filter === 'all' || (filter === 'move' ? ['train', 'ferry', 'flight', 'car'].includes(b.type) : filter === 'tour' ? ['tour', 'meal'].includes(b.type) : b.type === filter));
  const past = items.filter((b) => (b.endDate || b.date) < today);
  const rest = items.filter((b) => !past.includes(b));
  const shown = showPast ? items : rest;
  const byDate = {};
  shown.forEach((b) => (byDate[b.date] ||= []).push(b));
  const dismissedToday = getPref(`dismiss:${today}`, []);

  return (
    <div className="page">
      <div className="chips">
        {FILTERS.map(([id, label]) => (
          <button key={id} className={`chip ${filter === id ? 'solid' : ''}`} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <button className="btn" style={{ borderStyle: 'dashed' }} onClick={() => setEditing({})}><Icon name="plus" size={16} />예약 추가</button>
      {past.length > 0 && (
        <button className="btn small ghost" style={{ borderStyle: 'dashed' }} onClick={() => setShowPast(!showPast)}>
          {showPast ? '지난 예약 숨기기' : `지난 예약 ${past.length}건 보기`}
        </button>
      )}
      {Object.entries(byDate).map(([date, list]) => {
        const l = dayLabel(date);
        return (
          <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="section-title">
              {date === today && <span className="badge alert">오늘</span>}
              {l.md} {l.wd}
            </div>
            {list.map((b) => {
              const [bg, fg] = TYPE_TINT[b.type];
              const alertOn = BOOKING_TYPES[b.type].alert;
              const off = date === today && dismissedToday.includes(b.id);
              return (
                <button key={b.id} className="card item" style={{ border: date === today && alertOn ? '2px solid var(--alert)' : undefined }} onClick={() => setOpenKey(b.id)}>
                  <span className="theme-ic" style={{ background: bg, color: fg, width: 40, height: 40, borderRadius: 12 }}><Icon name={TYPE_ICON[b.type]} /></span>
                  <span className="grow">
                    <span style={{ display: 'block', fontWeight: 600 }}>{b.title}{b.mine && <span className="badge" style={{ marginLeft: 6 }}>직접 추가</span>}</span>
                    <span className="small muted">{[b.time && !b.sub?.includes(b.time) && b.time, b.endDate && `${l.md} – ${dayLabel(b.endDate).md}`, b.sub].filter(Boolean).join(' · ')}</span>
                  </span>
                  {alertOn && <Icon name={off ? 'belloff' : 'bell'} size={18} style={{ color: off ? 'var(--muted)' : 'var(--alert)' }} />}
                </button>
              );
            })}
          </div>
        );
      })}
      {open && <BookingDetail b={open} onEdit={() => setEditing(open)} onClose={() => { setOpenKey(null); clearOpen?.(); force((x) => x + 1); }} />}
      {editing && <BookingEditor b={editing} onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); setOpenKey(id); }} onDeleted={() => { setEditing(null); setOpenKey(null); }} />}
    </div>
  );
}

function BookingDetail({ b, onClose, onEdit }) {
  const { byId } = usePlaces();
  const today = todayIso();
  const key = `dismiss:${b.date}`;
  const [dismissed, setDismissed] = useState(() => getPref(key, []));
  const off = dismissed.includes(b.id);
  const setOff = (v) => {
    const next = v ? [...dismissed, b.id] : dismissed.filter((x) => x !== b.id);
    setDismissed(next);
    setPref(key, next);
  };
  const t = BOOKING_TYPES[b.type];
  const place = byId[b.place];
  const l = dayLabel(b.date);
  return (
    <Modal onClose={onClose} label="예약 상세">
      <ModalHead title={b.title} sub={`${t.label}${b.date === today ? ' · 오늘' : ''}`} onClose={onClose} />
      <div style={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', rowGap: 9, fontSize: '0.92rem' }}>
        <span className="muted">날짜</span><span>{l.m}월 {l.dd}일 ({l.wd}){b.endDate && ` – ${dayLabel(b.endDate).md}`}</span>
        {b.time && <><span className="muted">시간</span><span className="bold">{b.time}</span></>}
        {place && <><span className="muted">장소</span><span>{place.name}{place.address ? ` · ${place.address}` : ''}</span></>}
        {b.confirm && <><span className="muted">예약번호</span><span className="bold">{b.confirm}</span></>}
        {b.sub && <><span className="muted">메모</span><span style={{ whiteSpace: 'pre-wrap' }}>{b.sub}</span></>}
        {(b.detail || []).map(([k, v]) => <Fragment key={k}><span className="muted">{k}</span><span>{v}</span></Fragment>)}
      </div>
      <div className="row">
        {place && <a className="btn primary grow" href={directionsUrl(place)} target="_blank" rel="noreferrer"><Icon name="locate" size={16} />길찾기</a>}
        {b.link && <a className="btn grow" href={b.link} target="_blank" rel="noreferrer"><Icon name="open" size={16} />예약 열기</a>}
      </div>
      <button className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={onEdit}><Icon name="edit" size={14} />예약 고치기</button>
      {t.alert && (
        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="row" style={{ padding: '12px 0' }}>
            <div className="grow">
              <div className="bold">당일 지도 알림</div>
              <div className="small muted">{off ? '그날 알림을 닫았어요' : `${l.md} 당일 지도 위에 크게 표시`}</div>
            </div>
            <Switch checked={!off} onChange={(v) => setOff(!v)} label="당일 지도 알림" />
          </div>
          {off && <button className="btn block alert" style={{ marginBottom: 12 }} onClick={() => setOff(false)}><Icon name="bell" size={16} />알림 다시 띄우기</button>}
        </div>
      )}
    </Modal>
  );
}

const TRIP_DATES = DAYS.map((d) => d.date);

function BookingEditor({ b, onClose, onSaved, onDeleted }) {
  const me = useMe();
  const { byId, places } = usePlaces();
  const isNew = !b.id;
  const [f, setF] = useState(() => ({
    type: b.type || 'meal', title: b.title || '', date: b.date || (todayIso() < TRIP_DATES[0] ? TRIP_DATES[0] : todayIso()),
    endDate: b.endDate || '', time: b.time || '', place: b.place || '', sub: b.sub || '', link: b.link || '', confirm: b.confirm || '',
  }));
  const [picking, setPicking] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const place = byId[f.place];
  const day = DAYS.find((d) => d.date === f.date);
  const save = () => {
    const id = b.id || newBookingId();
    saveBooking(id, { ...f, title: f.title.trim(), endDate: f.type === 'stay' ? f.endDate : '' }, me.uid);
    onSaved(id);
  };
  const del = () => {
    if (!confirm(isCodeBooking(b.id) ? '이 예약을 목록에서 숨길까요? (원래대로 되돌릴 수 있어요)' : '이 예약을 지울까요?')) return;
    deleteBooking(b, me.uid);
    onDeleted();
  };
  return (
    <Modal onClose={onClose} label="예약 추가">
      <ModalHead title={isNew ? '예약 추가' : '예약 고치기'} sub="두 폰에 공유 · 기차 · 페리 · 항공 · 투어 · 렌터카 · 식당은 당일 지도 알림" onClose={onClose} />
      <div className="field">
        <span>종류</span>
        <div className="chips wrap">
          {Object.entries(BOOKING_TYPES).map(([id, t]) => (
            <button key={id} className={`chip ${f.type === id ? 'solid' : ''}`} onClick={() => set('type', id)}><Icon name={TYPE_ICON[id]} size={14} />{t.label}</button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>이름 (필수)</span>
        <input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="예: Trattoria Dalloste 저녁, 우피치 입장" maxLength={50} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: f.type === 'stay' ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 3fr) minmax(0, 2fr)', gap: 8 }}>
        <label className="field">
          <span>{f.type === 'stay' ? '체크인' : '날짜'}</span>
          <input className="input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        {f.type === 'stay' ? (
          <label className="field"><span>체크아웃</span><input className="input" type="date" value={f.endDate} min={f.date} onChange={(e) => set('endDate', e.target.value)} /></label>
        ) : (
          <label className="field"><span>시간</span><input className="input" type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></label>
        )}
      </div>
      {day && <span className="tiny muted" style={{ marginTop: -6 }}>Day {DAYS.indexOf(day) + 1} · {day.title} · {CITIES[day.city].label}</span>}
      <div className="field">
        <span>장소 (선택 · 길찾기 · 지도 알림에 써요)</span>
        {place ? (
          <div className="row" style={{ background: 'var(--bg)', borderRadius: 12, padding: '8px 10px' }}>
            <MiniMarker cat={place.cat} />
            <span className="grow small bold">{place.name}</span>
            <button className="btn small ghost" onClick={() => setPicking(true)}>바꾸기</button>
            <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => set('place', '')} aria-label="장소 빼기"><Icon name="x" size={14} /></button>
          </div>
        ) : (
          <button className="btn" onClick={() => setPicking(true)}><Icon name="pin" size={16} />장소 고르기</button>
        )}
      </div>
      <label className="field">
        <span>예약번호 (선택)</span>
        <input className="input" value={f.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="예: TF-123456" />
      </label>
      <label className="field">
        <span>예약 확인 링크 (선택 · TheFork · 이메일 · 앱 링크)</span>
        <input className="input" value={f.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" inputMode="url" />
      </label>
      <label className="field">
        <span>메모 (선택)</span>
        <textarea className="input" rows={2} value={f.sub} onChange={(e) => set('sub', e.target.value)} placeholder="예: 2명 · 테라스석 · 15분 늦으면 취소" />
      </label>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {!isNew && <button className="btn" style={{ color: 'var(--danger)' }} onClick={del} aria-label="예약 지우기"><Icon name="trash" size={16} /></button>}
        {!isNew && isCodeBooking(b.id) && b.edited && (
          <button className="btn" onClick={() => { if (confirm('고친 내용을 지우고 원래 예약으로 되돌릴까요?')) { resetBooking(b.id); onSaved(b.id); } }}><Icon name="refresh" size={16} />원래대로</button>
        )}
        <button className="btn primary grow" onClick={save} disabled={!f.title.trim() || !f.date}>저장 · 두 폰에 공유</button>
      </div>
      {picking && (
        <PlacePicker city={day?.city || 'rome'} places={places} chosen={f.place ? [f.place] : []} onClose={() => setPicking(false)}
          onPick={(p) => { set('place', p.id); if (!f.title.trim()) set('title', p.name); setPicking(false); }} />
      )}
    </Modal>
  );
}
