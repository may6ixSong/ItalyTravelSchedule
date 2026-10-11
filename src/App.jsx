import { useEffect, useState } from 'react';
import MapScreen from './screens/MapScreen.jsx';
import BookingsScreen from './screens/BookingsScreen.jsx';
import ExpensesScreen from './screens/ExpensesScreen.jsx';
import PhrasesScreen from './screens/PhrasesScreen.jsx';
import MeScreen from './screens/MeScreen.jsx';
import Onboarding from './screens/Onboarding.jsx';
import { Icon } from './components/ui.jsx';
import { MeContext, loadMe } from './lib/user.js';
import { ensureAuth } from './lib/store.js';
import { BOOKINGS, BOOKING_TYPES } from './data/bookings.js';
import { todayIso } from './data/itinerary.js';
import { hasFirebase } from './config.js';

const TABS = [
  ['map', '지도', 'map'],
  ['book', '예약', 'ticket'],
  ['money', '가계부', 'wallet'],
  ['talk', '회화', 'chat'],
  ['me', '나', 'user'],
];

// 주소 끝(#book/check 등)으로 탭을 기억해서 안드로이드 뒤로가기와 새로고침에도 같은 화면이 열립니다.
function readHash() {
  const [tab = 'map', sub = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { tab: TABS.some((t) => t[0] === tab) ? tab : 'map', sub };
}

export default function App() {
  const [me, setMe] = useState(loadMe);
  const [{ tab, sub }, setRoute] = useState(readHash);
  const [openBooking, setOpenBooking] = useState(null);

  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // Firebase 익명 로그인 유지 (오프라인이면 저장된 로그인 사용)
  useEffect(() => {
    if (me && hasFirebase && !me.dev) ensureAuth().catch(() => {});
  }, [me]);

  const go = (t, s = '') => {
    location.hash = s ? `${t}/${s}` : t;
  };

  if (!me) return <Onboarding onDone={setMe} />;

  const today = todayIso();
  const hasAlert = BOOKINGS.some((b) => b.date === today && BOOKING_TYPES[b.type].alert);

  return (
    <MeContext.Provider value={me}>
      <div className="app">
        <main className="screen">
          <div hidden={tab !== 'map'} style={{ position: 'absolute', inset: 0 }}>
            <MapScreen go={go} openBooking={(b) => { setOpenBooking(b.id); go('book'); }} />
          </div>
          {tab === 'book' && (
            <BookingsScreen tab={sub === 'check' ? 'check' : 'list'} setTab={(t) => go('book', t === 'check' ? 'check' : '')} openId={openBooking} clearOpen={() => setOpenBooking(null)} />
          )}
          {tab === 'money' && <ExpensesScreen />}
          {tab === 'talk' && <PhrasesScreen />}
          {tab === 'me' && <MeScreen setMe={setMe} />}
        </main>
        <nav className="tabbar" aria-label="메뉴">
          {TABS.map(([id, label, icon]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}>
              <Icon name={icon} size={22} />
              {label}
              {id === 'book' && hasAlert && <span className="dot" />}
            </button>
          ))}
        </nav>
      </div>
    </MeContext.Provider>
  );
}
