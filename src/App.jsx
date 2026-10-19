import { useEffect, useState } from 'react';
import MapScreen from './screens/MapScreen.jsx';
import BookingsScreen from './screens/BookingsScreen.jsx';
import ExpensesScreen from './screens/ExpensesScreen.jsx';
import PhrasesScreen from './screens/PhrasesScreen.jsx';
import AlbumScreen from './screens/AlbumScreen.jsx';
import MeScreen from './screens/MeScreen.jsx';
import Onboarding from './screens/Onboarding.jsx';
import { Icon } from './components/ui.jsx';
import { MeContext, linkToFirebase, loadMe } from './lib/user.js';
import { BOOKING_TYPES } from './data/bookings.js';
import { useBookings } from './lib/bookings.js';
import { todayIso } from './data/itinerary.js';
import { hasFirebase } from './config.js';
import { autoDownloadOnWifi } from './lib/mapStyle.js';
import { fetchWeatherOnLaunch } from './lib/weather.js';

const TABS = [
  ['map', '지도', 'map'],
  ['book', '예약', 'ticket'],
  ['album', '앨범', 'photo'],
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
  // 데이터 아끼기: 와이파이일 때 오프라인 지도를 알아서 받아 두기 (앱을 켤 때 · 와이파이가 다시 연결될 때)
  useEffect(() => {
    const run = () => autoDownloadOnWifi();
    const t = setTimeout(run, 4000);
    window.addEventListener('online', run);
    navigator.connection?.addEventListener?.('change', run);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', run);
      navigator.connection?.removeEventListener?.('change', run);
    };
  }, []);
  // 날씨: 앱을 켤 때 온라인이면 여행 날짜 전체를 한 번만 받아 두기 (데이터 아끼기)
  useEffect(() => fetchWeatherOnLaunch(), []);
  // Firebase 익명 로그인 유지 (오프라인이면 저장된 로그인 사용)
  useEffect(() => {
    if (me && hasFirebase && !me.dev) linkToFirebase(me).then((next) => next !== me && setMe(next)).catch(() => {});
  }, [me]);

  const go = (t, s = '') => {
    location.hash = s ? `${t}/${s}` : t;
  };

  const bookings = useBookings();
  if (!me) return <Onboarding onDone={setMe} />;

  const today = todayIso();
  const hasAlert = bookings.some((b) => b.date === today && BOOKING_TYPES[b.type].alert);

  return (
    <MeContext.Provider value={me}>
      <div className="app">
        <main className="screen">
          <div hidden={tab !== 'map'} style={{ position: 'absolute', inset: 0 }}>
            <MapScreen go={go} openBooking={(b) => { setOpenBooking(b.id); go('book'); }} />
          </div>
          {tab === 'book' && (
            <BookingsScreen tab={['check', 'buy'].includes(sub) ? sub : 'list'} setTab={(t) => go('book', t === 'list' ? '' : t)} openId={openBooking} clearOpen={() => setOpenBooking(null)} />
          )}
          {tab === 'album' && <AlbumScreen />}
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
