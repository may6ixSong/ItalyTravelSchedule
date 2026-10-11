// 아이콘 · 마커 · 아바타 · 시트 같은 공통 부품
import { useEffect, useRef } from 'react';
import { CATEGORIES } from '../data/places.js';

const PATHS = {
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z M3 7l12-4v4 M16 13h2',
  chat: 'M4 5h16v11H9l-5 4z',
  user: 'M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8z M4 21a8 8 0 0 1 16 0',
  meal: 'M7 2v8 M5 2v4a2 2 0 0 0 4 0V2 M7 10v12 M17 2c-2 1-3 4-3 7h3v13',
  cafe: 'M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z M17 10h2a2 2 0 0 1 0 4h-2',
  gelato: 'M8 11l4 11 4-11 M7 11a5 5 0 1 1 10 0z',
  sight: 'M3 21h18 M5 21V10 M19 21V10 M10 21V10 M14 21V10 M2 10l10-7 10 7z',
  shop: 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  stay: 'M3 19V8 M3 15h18v4 M21 15v-2a3 3 0 0 0-3-3h-7v5',
  transit: 'M7 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M5 11h14 M8 21l2-4 M16 21l-2-4',
  train: 'M7 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M5 11h14 M8 21l2-4 M16 21l-2-4',
  ferry: 'M3 17l2 3h14l2-3z M5 17v-6h14v6 M9 11V6h6v5 M12 3v3',
  flight: 'M2 16l20-6-2-3-7 2-5-6-2 1 3 6-5 2-2-1-1 1z M3 21h18',
  car: 'M5 16h14v-4l-2-5H7l-2 5z M4 16v3 M20 16v3 M7 13h1 M16 13h1',
  tour: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10',
  locate: 'M3 11l18-8-8 18-2-8z',
  crosshair: 'M12 5a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M12 2v3 M12 19v3 M2 12h3 M19 12h3',
  ruler: 'M3 17L17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  x: 'M6 6l12 12 M18 6L6 18',
  plus: 'M12 5v14 M5 12h14',
  back: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 21h4',
  belloff: 'M6 16V11a6 6 0 0 1 9.5-4.9 M18 11v5l2 2H4 M10 21h4 M3 3l18 18',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  camera: 'M4 8h3l2-3h6l2 3h3v12H4z M12 9a4 4 0 1 1 0 8a4 4 0 1 1 0-8z',
  speaker: 'M4 9v6h4l5 4V5L8 9z M16 9a4 4 0 0 1 0 6',
  check: 'M5 12l5 5 9-10',
  clock: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z M12 7v5l3 2',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 6.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
  note: 'M4 5h16v11H9l-5 4z',
  walk: 'M13 2a2 2 0 1 1 0 4a2 2 0 1 1 0-4z M10 21l2-6 3 3v3 M9 12l2-4 4 2 2 3 M11 8l-3 3',
  bus: 'M7 3h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M5 11h14 M8 21v-3 M16 21v-3',
  swap: 'M4 7h13l-3-3 M20 17H7l3 3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  open: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z M9 13l2 2 4-4',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7',
  search: 'M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M20 20l-4-4',
  list: 'M8 6h12 M8 12h12 M8 18h12 M4 6h0 M4 12h0 M4 18h0',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 21h16',
  suitcase: 'M4 7h16v13H4z M9 7V4h6v3 M4 12h16',
  wifi: 'M5 12a10 10 0 0 1 14 0 M8.5 15.5a5 5 0 0 1 7 0 M12 19h0',
  photo: 'M3 4h18v16H3z M3 16l5-5 4 4 3-3 6 6',
};

export function Icon({ name, size = 20, stroke = 2, className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      <path d={PATHS[name] || ''} />
    </svg>
  );
}

// 지도 밖(리스트 · 범례)에서 쓰는 작은 마커
export function MiniMarker({ cat, label, className = '' }) {
  const c = CATEGORIES[cat] || CATEGORIES.sight;
  return (
    <span className={`mk mini mk-${c.shape} ${className}`} style={{ '--c': c.color }}>
      <span className="in">{label != null ? <span>{label}</span> : <Icon name={cat} stroke={2.6} />}</span>
    </span>
  );
}

export function Avatar({ user, size = 30 }) {
  const name = user?.name || '?';
  return (
    <span className="avatar" style={{ '--s': `${size}px`, '--c': user?.color || '#8c8578' }} title={name}>
      {user?.photo ? <img src={user.photo} alt="" /> : name.slice(0, 1)}
    </span>
  );
}

export function Stars({ value, size }) {
  const v = Math.round(value * 2) / 2;
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value}점`}>
      {'★'.repeat(Math.floor(v))}
      {v % 1 ? '½' : ''}
      <span style={{ color: '#d8d2c4' }}>{'★'.repeat(5 - Math.ceil(v))}</span>
    </span>
  );
}

// 아래에서 올라오는 슬라이드. 배경을 누르거나 뒤로가기(안드로이드)로 닫힙니다.
// 슬라이드 위에 슬라이드가 겹쳐도 뒤로가기는 맨 위 것만 닫도록 쌓아서 관리합니다.
const stack = [];
let ignorePops = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) return void (ignorePops -= 1);
    const top = stack.pop();
    if (top) {
      top.popped = true;
      top.close();
    }
  });
}

export function Modal({ onClose, children, dark, label }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const entry = { close: () => close.current(), popped: false };
    stack.push(entry);
    history.pushState({ modal: stack.length }, '');
    const onKey = (e) => e.key === 'Escape' && stack[stack.length - 1] === entry && close.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (!entry.popped) {
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
        ignorePops += 1;
        history.back();
      }
    };
  }, []);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal${dark ? ' dark' : ''}`} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ title, sub, onClose, children }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="grow">
        {sub && <div className="small muted">{sub}</div>}
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{title}</div>
      </div>
      {children}
      <button className="icon-btn" style={{ borderRadius: 20, width: 40, height: 40 }} onClick={onClose} aria-label="닫기">
        <Icon name="x" size={18} stroke={2.2} />
      </button>
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}
