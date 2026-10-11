// 예약 탭: [예약 내역 | 준비 체크리스트]
import { Fragment, useState } from 'react';
import { BOOKINGS, BOOKING_TYPES } from '../data/bookings.js';
import { dayLabel, todayIso } from '../data/itinerary.js';
import { directionsUrl } from '../lib/geo.js';
import { getPref, setPref } from '../lib/store.js';
import { usePlaces } from '../lib/places.js';
import { Icon, Modal, ModalHead, Switch } from '../components/ui.jsx';
import Checklist from './Checklist.jsx';

const TYPE_ICON = { stay: 'stay', train: 'train', ferry: 'ferry', flight: 'flight', tour: 'tour', car: 'car' };
const TYPE_TINT = { stay: ['#E4E7EA', '#212B33'], train: ['#DDE8F0', '#1F5F8B'], ferry: ['#DDE8F0', '#1F5F8B'], flight: ['#DDE8F0', '#1F5F8B'], tour: ['#FBE6DA', '#C2410C'], car: ['#E4EBDA', '#4F6B2E'] };
const FILTERS = [['all', '전체'], ['stay', '숙소'], ['move', '교통'], ['tour', '투어']];

export default function BookingsScreen({ tab, setTab, openId, clearOpen }) {
  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="top">
        <div className="top-inner">
          <div className="seg" role="tablist">
            <button role="tab" className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>예약 내역</button>
            <button role="tab" className={tab === 'check' ? 'on' : ''} onClick={() => setTab('check')}>준비 체크리스트</button>
          </div>
        </div>
      </div>
      {tab === 'list' ? <BookingList openId={openId} clearOpen={clearOpen} /> : <Checklist />}
    </div>
  );
}

function BookingList({ openId, clearOpen }) {
  const today = todayIso();
  const [filter, setFilter] = useState('all');
  const [showPast, setShowPast] = useState(false);
  const [open, setOpen] = useState(() => BOOKINGS.find((b) => b.id === openId) || null);
  const [, force] = useState(0);
  const items = BOOKINGS.filter((b) => filter === 'all' || (filter === 'move' ? ['train', 'ferry', 'flight', 'car'].includes(b.type) : b.type === filter));
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
                <button key={b.id} className="card item" style={{ border: date === today && alertOn ? '2px solid var(--alert)' : undefined }} onClick={() => setOpen(b)}>
                  <span className="theme-ic" style={{ background: bg, color: fg, width: 40, height: 40, borderRadius: 12 }}><Icon name={TYPE_ICON[b.type]} /></span>
                  <span className="grow">
                    <span style={{ display: 'block', fontWeight: 600 }}>{b.title}</span>
                    <span className="small muted">{[b.time && !b.sub?.includes(b.time) && b.time, b.endDate && `${l.md} – ${dayLabel(b.endDate).md}`, b.sub].filter(Boolean).join(' · ')}</span>
                  </span>
                  {alertOn && <Icon name={off ? 'belloff' : 'bell'} size={18} style={{ color: off ? 'var(--muted)' : 'var(--alert)' }} />}
                </button>
              );
            })}
          </div>
        );
      })}
      {open && <BookingDetail b={open} onClose={() => { setOpen(null); clearOpen?.(); force((x) => x + 1); }} />}
    </div>
  );
}

function BookingDetail({ b, onClose }) {
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
        {b.sub && <><span className="muted">메모</span><span>{b.sub}</span></>}
        {(b.detail || []).map(([k, v]) => <Fragment key={k}><span className="muted">{k}</span><span>{v}</span></Fragment>)}
      </div>
      <div className="row">
        {place && <a className="btn primary grow" href={directionsUrl(place)} target="_blank" rel="noreferrer"><Icon name="locate" size={16} />길찾기</a>}
        {b.link && <a className="btn grow" href={b.link} target="_blank" rel="noreferrer"><Icon name="open" size={16} />예약 열기</a>}
      </div>
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
