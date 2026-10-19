// 지도 탭: 날짜별 번호 마커 · 후보 필터(동시 선택) · 내 주변 · 임시 동선 · 장소 시트 · 거리 재기 · 당일 예약 알림
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 화면 폭이 넓은지 (폴드를 펼치거나 돌리면 바로 바뀌어요)
function useWide() {
  const q = '(min-width: 760px)';
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}
const PANEL_MIN = 300;
const panelMax = () => Math.max(PANEL_MIN, Math.min(760, Math.round(window.innerWidth * 0.7)));
const clampPanel = (w) => Math.max(PANEL_MIN, Math.min(panelMax(), Math.round(w)));
import MapView from '../components/MapView.jsx';
import Sheet from '../components/Sheet.jsx';
import PlaceDetail from '../components/PlaceDetail.jsx';
import { Avatar, Icon, MiniMarker, Modal, ModalHead } from '../components/ui.jsx';
import { CATEGORIES, CITIES, PLACES } from '../data/places.js';
import { LANDMARKS, LANDMARK_BY_ID } from '../data/landmarks.js';
import { useOnline, connectionType } from '../lib/online.js';
import { offlineMapStatus } from '../lib/mapStyle.js';
import { DAYS, dayLabel, todayIso } from '../data/itinerary.js';
import { BOOKING_TYPES } from '../data/bookings.js';
import { useBookings } from '../lib/bookings.js';
import { usePlaces } from '../lib/places.js';
import { directionsUrl, distanceKm, formatKm, walkMinutes } from '../lib/geo.js';
import { getPref, patch, setPref, useDoc } from '../lib/store.js';
import { useMe } from '../lib/user.js';
import { useNotes } from '../lib/notes.js';
import { saveDayNote, useDayNotes } from '../lib/dayNotes.js';
import { useUsers } from '../components/PlaceDetail.jsx';
import { chooseVariant, usePlaceDays, useVariants } from '../lib/variants.js';
import VariantEditor from '../components/VariantEditor.jsx';
import WeatherFx, { WeatherCard, useWeatherPlay } from '../components/WeatherFx.jsx';
import { useWeather, weatherCity, WEATHER_KINDS } from '../lib/weather.js';
import PlaceEditor from '../components/PlaceEditor.jsx';
import { hasFirebase, HAS_TILES } from '../config.js';

const LETTERS = 'ABCDEFGHIJ';
const OTHER = 'otherDays'; // 필터: 다른 날 일정에 있는 장소
// 후보는 내 위치(GPS) 또는 그날 일정 장소에서 이 거리 안만 보여줘요. 로마에 있을 때 피렌체 식당이 안 나오게.
const SCOPE_KM = 30;
// 여행 도시 근처(장소에서 60km 안)인지. 한국 등 다른 곳이면 내 위치로 지도를 옮기지 않아요.
const inTripArea = (pt) => PLACES.some((p) => distanceKm(pt, p) < 60);
let warnedAway = false; // 앱을 켜고 한 번만 알려요
const AWAY_MSG = '지금 위치는 여행 도시가 아니에요.\n지도는 내 위치로 옮기지 않고 일정 기준으로 보여드려요.';

const STAY_ROUTE = ['rm-fco', 'rm-hotel', 'na-hotel', 'po-hotel', 'fi-hotel', 'tu-hotel', 'fi-hotel2', 'rm-fco'];

export default function MapScreen({ go, openBooking }) {
  const me = useMe();
  const { byId, places } = usePlaces();
  const notes = useNotes();
  const dayNotes = useDayNotes();
  const today = todayIso();
  // 앱을 열면: 여행 중이면 오늘 날짜, 여행 전 · 후에는 첫째 날
  const [dayId, setDayId] = useState(() => DAYS.find((d) => d.date === today)?.id || DAYS[0].id);
  const [editor, setEditor] = useState(null); // { base } | { editing }
  const [newPlace, setNewPlace] = useState(false);
  const [filters, setFilters] = useState([]);
  const [nearby, setNearby] = useState(false);
  const [radiusKm, setRadiusKm] = useState(1);
  const [gps, setGps] = useState(null);
  const [center, setCenter] = useState(null);
  const [selected, setSelected] = useState(null);
  const [snap, setSnap] = useState('peek');
  const [measure, setMeasure] = useState(null); // { a, b }
  const [legend, setLegend] = useState(false);
  const [focus, setFocus] = useState(null);
  const [toast, setToast] = useState(null);
  const [gpsHelp, setGpsHelp] = useState(false);
  const wide = useWide();
  // 넓은 화면의 오른쪽 일정 패널: 접고 펴기 · 너비 조절 (이 폰에 기억)
  const [panelOpen, setPanelOpen] = useState(() => getPref('panelOpen', true));
  const [panelW, setPanelW] = useState(() => clampPanel(getPref('panelW', 420)));
  const togglePanel = (open) => {
    setPanelOpen(open);
    setPref('panelOpen', open);
  };
  const online = useOnline();
  // 날씨: 날짜 칩에 표시하고, 날짜를 고르면 3초 동안 지도에 애니메이션. 오프라인이면 날씨는 아예 안 보여요
  const allWeather = useWeather();
  const weather = online ? allWeather : {};
  const topRef = useRef(null);
  const bookings = useBookings();
  const [dismissed, setDismissed] = useState(() => getPref(`dismiss:${today}`, []));
  const watch = useRef(null);

  const day = DAYS.find((d) => d.id === dayId);
  const { list: variants, active: variant } = useVariants(day);
  // 다른 날 일정에 들어 있는 장소 (그날 못 가면 오늘 후보로)
  const placeDays = usePlaceDays();
  const otherDays = useCallback((id) => (placeDays[id] || []).filter((x) => x !== dayId), [placeDays, dayId]);

  // 앱을 켜둔 채 날짜가 바뀌면(자정 지나 다시 열 때) 오늘 날짜로 이동
  const lastToday = useRef(today);
  useEffect(() => {
    const check = () => {
      const t = todayIso();
      if (document.visibilityState !== 'visible' || t === lastToday.current) return;
      lastToday.current = t;
      const d = DAYS.find((x) => x.date === t);
      if (d) setDayId(d.id);
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  useEffect(() => {
    setPref('day', dayId);
    setSelected(null);
  }, [dayId]);
  // 임시 동선(A·B)은 두 폰이 같이 보도록 공유 DB(settings/tempPlans)에 날짜별로 저장
  const tempPlans = useDoc('settings', 'tempPlans');
  const plan = useMemo(() => (tempPlans?.[dayId] || []).filter((id) => byId[id]), [tempPlans, dayId, byId]);
  const setPlan = (next) => patch('settings', 'tempPlans', { [dayId]: next });
  // 예전 버전에서 이 폰에만 저장했던 임시 동선 옮기기 (한 번)
  useEffect(() => {
    if (tempPlans === undefined) return;
    const moved = {};
    for (const d of DAYS) {
      const old = getPref(`plan:${d.id}`, null);
      if (old?.length && !tempPlans?.[d.id]?.length) moved[d.id] = old;
      if (old) setPref(`plan:${d.id}`, null);
    }
    if (Object.keys(moved).length) patch('settings', 'tempPlans', moved);
  }, [tempPlans === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- GPS ----- */
  // 여행 도시 밖(예: 한국)에서 받은 위치는 지도 · 후보 기준으로 쓰지 않아요
  const tripGps = gps && inTripArea(gps) ? gps : null;
  useEffect(() => {
    if (gps && !tripGps && !warnedAway) {
      warnedAway = true;
      alert(AWAY_MSG);
    }
  }, [gps, tripGps]);
  const startGps = useCallback(async (fly) => {
    if (!navigator.geolocation) return setToast({ text: '이 기기는 위치를 지원하지 않아요' });
    let state = null;
    try {
      state = (await navigator.permissions?.query({ name: 'geolocation' }))?.state;
    } catch {
      /* 권한 상태를 못 읽는 브라우저(아이폰 일부)는 바로 요청 */
    }
    // 한 번 거절하면 브라우저가 다시 묻지 않아서, 설정에서 켜는 방법을 보여줘요
    if (state === 'denied') return setGpsHelp(true);
    if (watch.current == null) {
      watch.current = navigator.geolocation.watchPosition(
        (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => {
          // 실패하면 감시를 끊어서, 다음에 누를 때 다시 권한을 물어볼 수 있게
          if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
          watch.current = null;
          if (e.code === 1) setGpsHelp(true);
          else setToast({ text: '위치를 찾지 못했어요. 폰의 위치(GPS)가 켜져 있는지 확인하고 다시 눌러 주세요' });
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
      );
    }
    if (fly && gps) {
      if (!inTripArea(gps)) alert(AWAY_MSG);
      else setFocus({ ...gps, zoom: 15, key: Date.now() });
    }
  }, [gps]);
  useEffect(() => () => watch.current != null && navigator.geolocation.clearWatch(watch.current), []);
  // 설정에서 위치를 허용하고 돌아오면 바로 위치 찾기
  useEffect(() => {
    let status = null;
    navigator.permissions?.query({ name: 'geolocation' }).then((st) => {
      status = st;
      st.onchange = () => {
        if (st.state === 'granted') {
          setGpsHelp(false);
          startGps(false);
        }
      };
    }).catch(() => {});
    return () => { if (status) status.onchange = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const flewToGps = useRef(false);
  useEffect(() => {
    if (tripGps && !flewToGps.current && (nearby || watch.current != null)) {
      flewToGps.current = true;
      setFocus({ ...tripGps, zoom: 15, key: Date.now() });
    }
  }, [tripGps, nearby]);

  // 데이터 아끼기: 오프라인 지도를 아직 안 받았는데 모바일 데이터로 보고 있으면 한 번 알려줘요
  useEffect(() => {
    if (!HAS_TILES || connectionType() !== 'cellular' || getPref('cellTip', false)) return;
    offlineMapStatus().then((st) => {
      if (st.available && !st.saved) {
        setPref('cellTip', true);
        setToast({ text: '와이파이에서 나 탭 → 오프라인 지도 받기를 해두면 데이터를 거의 안 써요' });
      }
    });
  }, []);

  /* ----- 그날 일정 ----- */
  const stops = useMemo(() => {
    if (!day) return [];
    let n = 0;
    const seen = {};
    return (variant?.stops || day.stops).map((s) => {
      const place = s.place ? byId[s.place] : null;
      if (!place) return { ...s, n: null };
      if (seen[place.id]) return { ...s, n: seen[place.id], place, repeat: true };
      n += 1;
      seen[place.id] = n;
      return { ...s, n, place };
    });
  }, [day, variant, byId]);
  const stopPlaceIds = new Set(stops.filter((s) => s.place).map((s) => s.place.id));
  const dayCenter = useMemo(() => {
    const pts = stops.filter((s) => s.place);
    if (!pts.length) return null;
    return { lat: pts.reduce((a, s) => a + s.place.lat, 0) / pts.length, lng: pts.reduce((a, s) => a + s.place.lng, 0) / pts.length };
  }, [stops]);

  /* ----- 후보 ----- */
  const ref = nearby ? tripGps || center : null;
  const [allCities, setAllCities] = useState(false);
  // 기준점: '내 주변'이면 반경, 아니면 GPS 위치 → 없으면 그날 일정 장소들(하루에 두 도시면 둘 다)
  const anchors = useMemo(() => (tripGps ? [tripGps] : stops.filter((s) => s.place).map((s) => s.place)), [tripGps?.lat, tripGps?.lng, stops]); // eslint-disable-line react-hooks/exhaustive-deps
  const scopeLabel = nearby ? null : allCities || !anchors.length ? '전체 도시' : tripGps ? `내 위치에서 ${SCOPE_KM}km` : `${CITIES[day.city].label} 일정 근처 ${SCOPE_KM}km`;
  const candidates = useMemo(() => {
    if (!filters.length && !nearby) return [];
    const catFilters = filters.filter((f) => f !== OTHER);
    const cats = catFilters.length || filters.includes(OTHER) ? catFilters : Object.keys(CATEGORIES).filter((c) => CATEGORIES[c].filter);
    const want = (p) => cats.includes(p.cat) || (filters.includes(OTHER) && p.cat !== 'stay' && p.cat !== 'transit' && otherDays(p.id).length > 0);
    const near = (p) => (anchors.length ? Math.min(...anchors.map((a) => distanceKm(a, p))) : 0);
    return places
      .filter((p) => want(p) && !stopPlaceIds.has(p.id))
      .map((p) => ({ p, d: ref ? distanceKm(ref, p) : near(p) }))
      .filter(({ d }) => (ref ? d <= radiusKm : allCities || !anchors.length || d <= SCOPE_KM))
      .sort((a, b) => a.d - b.d);
  }, [filters, nearby, places, otherDays, ref?.lat, ref?.lng, radiusKm, anchors, allCities]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- 마커 · 선 ----- */
  const markers = useMemo(() => {
    const out = [];
    if (dayId === 'all') {
      STAY_ROUTE.slice(1, -1).forEach((id, i) => {
        const p = byId[id];
        // 같은 도시에 두 번 묵으면(피렌체) 마커 하나에 번호를 같이 표시
        const near = out.find((m) => distanceKm(m, p) < 3);
        if (near) return void (near.label = `${near.label}·${i + 1}`);
        out.push({ id, title: p.name, lat: p.lat, lng: p.lng, cat: 'stay', label: i + 1, caption: CITIES[p.city].label, color: CITIES[p.city].color, kind: 'k-stop big', note: !!notes[id], selected: selected === id });
      });
    } else {
      for (const s of stops) {
        if (!s.place || s.repeat) continue;
        out.push({ id: s.place.id, title: s.place.name, lat: s.place.lat, lng: s.place.lng, cat: s.place.cat, label: s.n, caption: s.title.length > 14 ? s.title.slice(0, 13) + '…' : s.title, kind: 'k-stop', note: !!notes[s.place.id], selected: selected === s.place.id, dim: candidates.length > 0 && !selected });
      }
    }
    const many = candidates.length > 18;
    candidates.forEach(({ p }) => {
      const pi = plan.indexOf(p.id);
      out.push({ id: p.id, title: p.name, lat: p.lat, lng: p.lng, cat: p.cat, label: pi >= 0 ? LETTERS[pi] : null, caption: many && pi < 0 ? null : p.name, kind: `cand${pi >= 0 ? ' plan' : ''}`, note: !!notes[p.id], selected: selected === p.id, noFit: true });
    });
    plan.forEach((id, i) => {
      if (out.some((m) => m.id === id)) return;
      const p = byId[id];
      if (p) out.push({ id, title: p.name, lat: p.lat, lng: p.lng, cat: p.cat, label: LETTERS[i], caption: p.name, kind: 'cand plan', note: !!notes[id], selected: selected === id });
    });
    if (measure?.a && !byId[measure.a.id]) out.push({ ...measure.a, cat: 'transit', label: 'A', kind: 'big', noFit: true });
    if (measure?.b && !byId[measure.b.id]) out.push({ ...measure.b, cat: 'transit', label: 'B', kind: 'big', noFit: true, color: '#1F5F8B' });
    return out;
  }, [dayId, stops, candidates, plan, selected, byId, measure, notes]);

  const routes = useMemo(() => {
    if (dayId === 'all') return [{ coords: STAY_ROUTE.map((id) => [byId[id].lng, byId[id].lat]), color: '#3B4650' }];
    // 숙소로 돌아오는 마지막 구간까지 선으로 이어요
    const r = [{ coords: stops.filter((s) => s.place).map((s) => [s.place.lng, s.place.lat]), color: CITIES[day.city].color }];
    if (plan.length > 1) r.push({ coords: plan.map((id) => byId[id]).filter(Boolean).map((p) => [p.lng, p.lat]), color: '#C2410C', width: 3.5 });
    return r;
  }, [dayId, stops, plan, byId, day]);

  const alerts = bookings.filter((b) => b.date === today && BOOKING_TYPES[b.type].alert && !dismissed.includes(b.id));
  const fitKey = `${dayId}:${variant?.id}`;
  const sheetPad = wide ? 60 : window.innerHeight * ({ peek: 0.26, half: 0.52, full: 0.6 }[snap] + 0.04);
  const padding = { top: alerts.length && !wide ? 380 : 190, bottom: sheetPad, left: 50, right: 70 };

  // 지도 기준점(역 · 공항 · 관광지). 일정 · 후보 마커와 겹치는 건 빼요
  const markerKey = markers.map((m) => m.id).join();
  const landmarks = useMemo(() => LANDMARKS.filter((l) => !markers.some((m) => distanceKm(m, l) < 0.12)), [markerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- 동작 ----- */
  const onMarker = (m) => {
    if (measure) return pickMeasure(byId[m.id] || m);
    setSelected(m.id);
    setSnap('half');
  };
  const pickMeasure = (p) => {
    setMeasure((m) => {
      const slot = !m.a || m.b ? 'a' : 'b';
      const pt = { id: p.id || `pt-${slot}`, name: p.name || `${slot.toUpperCase()} 지점`, lat: p.lat, lng: p.lng, placeId: p.placeId };
      return slot === 'a' ? { a: pt, b: null } : { ...m, b: pt };
    });
    setSnap('peek');
  };
  const onMapClick = (pt) => {
    if (measure) pickMeasure(pt);
  };
  const togglePlan = (p) => setPlan(plan.includes(p.id) ? plan.filter((x) => x !== p.id) : [...plan, p.id].slice(0, 10));
  const toggleFilter = (c) => {
    // 처음 필터를 켤 때 위치를 같이 찾아서, 지금 있는 도시의 후보만 보여줘요 (권한이 없으면 그날 일정 기준)
    if (!filters.length && !filters.includes(c)) startGps(false);
    setFilters((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]));
  };
  const toggleNearby = () => {
    if (!nearby) startGps(false);
    setNearby(!nearby);
    setSelected(null);
    setSnap('peek');
  };

  const dismiss = (b) => {
    const next = [...dismissed, b.id];
    setDismissed(next);
    setPref(`dismiss:${today}`, next);
    setToast({ text: '닫은 알림은 예약 탭에서 다시 볼 수 있어요', undo: () => { setDismissed(dismissed); setPref(`dismiss:${today}`, dismissed); } });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const dayWeather = day ? weather[day.date] : null;
  const wxShow = useWeatherPlay(dayWeather?.kind, dayId);

  const selPlace = selected ? byId[selected] || LANDMARK_BY_ID[selected] : null;
  const selStop = selPlace && stops.find((s) => s.place?.id === selPlace.id);

  return (
    <div className={`map-screen has-panel${panelOpen ? '' : ' panel-closed'}`} style={{ '--panel-w': `${panelW}px`, '--wx-top': `${topRef.current?.querySelector('.map-head')?.offsetHeight || 0}px` }}>
      <MapView markers={markers} routes={routes} me={tripGps} landmarks={landmarks} onLandmark={(l) => { if (measure) return pickMeasure(l); setSelected(l.id); setSnap('half'); }} radius={nearby && ref ? { center: ref, km: radiusKm } : null}
        measure={measure} onMarker={onMarker} onMapClick={onMapClick} fitKey={fitKey} padding={padding} onMove={setCenter} focus={focus} />
      {!measure && <WeatherFx show={wxShow} />}

      {measure ? (
        <div className="measure-bar">
          <Icon name="ruler" />
          <div className="grow">
            <div className="tiny" style={{ color: '#b7c0c8' }}>거리 재기</div>
            <div className="bold" style={{ fontSize: '0.95rem' }}>
              {!measure.a ? '출발지 A를 지도에서 탭하세요' : !measure.b ? '도착지 B를 탭하세요' : `${measure.a.name} → ${measure.b.name}`}
            </div>
          </div>
          <button className="icon-btn" style={{ background: '#2c343c', color: '#fff', borderRadius: 20, width: 38, height: 38 }} onClick={() => setMeasure(null)} aria-label="거리 재기 끝내기"><Icon name="x" size={16} /></button>
        </div>
      ) : (
        <div className="map-top" ref={topRef}>
          <header className="map-head">
            <div className="row">
              <div className="grow">
                <div className="small muted">{day ? `${dayLabel(day.date).m}월 ${dayLabel(day.date).dd}일 ${dayLabel(day.date).wd}요일` : '10/20 – 11/1 · 12박 13일'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{day ? `Day ${DAYS.indexOf(day) + 1} · ${day.title}${variant && variant.id !== 'main' ? ` · ${variant.label}` : ''}` : '전체 여정'}</div>
              </div>
              {online ? (
                <span className={`badge ${hasFirebase ? 'ok' : 'warn'}`} title={hasFirebase ? '온라인 · 공유 중' : '온라인 · 이 폰에만 저장 중'}>
                  <Icon name="wifi" size={13} />온라인
                </span>
              ) : (
                <span className="badge off" title="인터넷 없음 · 저장된 지도와 데이터로 보는 중"><Icon name="cloud" size={13} />오프라인 지도</span>
              )}
              <button style={{ border: 0, background: 'none', padding: 0 }} onClick={() => go('me')} aria-label="내 정보"><Avatar user={me} size={34} /></button>
            </div>
            <div className="chips" role="tablist" aria-label="날짜">
              <button className={`chip day-chip ${dayId === 'all' ? 'solid' : ''}`} onClick={() => setDayId('all')}>전체</button>
              {DAYS.map((d) => {
                const l = dayLabel(d.date);
                const on = d.id === dayId;
                return (
                  <button key={d.id} className={`chip day-chip ${on ? 'solid' : ''}`} style={{ '--c': CITIES[d.city].color }} onClick={() => setDayId(d.id)}>
                    <span className="dot-c" />{l.dd} {l.wd}{d.date === today && <b> · 오늘</b>}
                    {dayNotes[d.id] && <span className="note-dot chip-note" aria-label="메모 있음" />}
                    {weather[d.date] && <><span className="wx-ico" aria-label={WEATHER_KINDS[weather[d.date].kind].label}>{WEATHER_KINDS[weather[d.date].kind].icon}</span><span className="wx-t">{weather[d.date].tmax}°</span></>}
                  </button>
                );
              })}
            </div>
          </header>
          <div className="map-filters chips">
            <button className={`chip floating ${nearby ? 'solid' : ''}`} style={{ '--c': '#1F5F8B' }} onClick={toggleNearby}>
              <Icon name="crosshair" size={15} />{nearby ? `내 주변 ${radiusKm}km` : '내 주변'}
            </button>
            {Object.entries(CATEGORIES).filter(([, c]) => c.filter).map(([id, c]) => (
              <button key={id} className={`chip floating ${filters.includes(id) ? 'on' : ''}`} style={{ '--c': c.color }} onClick={() => toggleFilter(id)}>
                <MiniMarker cat={id} label="" className="legend-dot" />{c.label}
              </button>
            ))}
            {dayId !== 'all' && (
              <button className={`chip floating ${filters.includes(OTHER) ? 'on' : ''}`} style={{ '--c': '#1F5F8B' }} onClick={() => toggleFilter(OTHER)}>
                <Icon name="clock" size={14} />다른 날 일정
              </button>
            )}
          </div>
          {nearby && (
            <div className="map-filters">
              <div className="seg dark" style={{ display: 'inline-grid', boxShadow: 'var(--shadow)', background: '#fff' }}>
                {[0.5, 1, 2].map((k) => <button key={k} className={radiusKm === k ? 'on' : ''} onClick={() => setRadiusKm(k)} style={{ padding: '0 12px' }}>{k < 1 ? '500m' : `${k}km`}</button>)}
              </div>
            </div>
          )}
          {alerts.map((b) => (
            <div className="map-banner" key={b.id}><TodayAlert b={b} place={byId[b.place]} onDismiss={() => dismiss(b)} onOpen={() => openBooking(b)} /></div>
          ))}
          <WeatherCard show={wxShow} weather={dayWeather} city={day && weatherCity(day.date)} />
        </div>
      )}

      <div className="fab-col" style={{ bottom: `calc(${snap === 'peek' ? 26 : 52}% + 12px)` }}>
        <button className="fab" style={{ color: 'var(--accent)' }} onClick={() => startGps(true)} aria-label="내 위치로"><Icon name="locate" /></button>
        <button className={`fab ${measure ? 'on' : ''}`} onClick={() => { setMeasure(measure ? null : { a: null, b: null }); setSelected(null); }} aria-label="거리 재기"><Icon name="ruler" /></button>
        <button className="fab" onClick={() => setLegend(true)} aria-label="마커 범례"><Icon name="layers" /></button>
        <button className="fab" style={{ color: 'var(--accent)' }} onClick={() => setNewPlace(true)} aria-label="장소 직접 등록"><Icon name="plus" /></button>
      </div>

      {wide && !panelOpen && (
        <button className="panel-tab" onClick={() => togglePanel(true)} aria-label="일정 패널 열기"><Icon name="back" size={14} />일정</button>
      )}
      <Sheet snap={snap} onSnap={setSnap}
        panel={wide ? { onToggle: () => togglePanel(false), onWidth: (w) => setPanelW(clampPanel(w)), onWidthEnd: () => setPref('panelW', panelW) } : null}>
        {measure ? (
          <MeasurePanel m={measure} gps={tripGps} onSwap={() => setMeasure({ a: measure.b, b: measure.a })} onUseGps={() => tripGps && setMeasure({ ...measure, a: { id: 'gps', name: '내 위치', ...tripGps } })} />
        ) : selPlace ? (
          <PlaceDetail place={selPlace} stop={selStop ? { ...selStop, day: day && dayLabel(day.date).md } : null} gps={tripGps}
            onClose={() => { setSelected(null); setSnap('peek'); }}
            onMeasureFrom={(p) => { setMeasure({ a: { id: p.id, name: p.name, lat: p.lat, lng: p.lng, placeId: p.placeId }, b: null }); setSelected(null); setSnap('peek'); }}
            onPlan={dayId !== 'all' && !stopPlaceIds.has(selPlace.id) && !selPlace.landmark ? togglePlan : null} inPlan={plan.includes(selPlace.id)} />
        ) : (
          <>
            {plan.length > 0 && <PlanCard plan={plan} byId={byId} onClear={() => setPlan([])} onPick={(id) => { setSelected(id); setSnap('half'); }} />}
            {candidates.length > 0 || nearby ? (
              <CandidateList otherDays={otherDays} notes={notes} scopeLabel={scopeLabel} allCities={allCities} onAllCities={() => setAllCities(!allCities)} list={candidates} plan={plan} nearby={nearby} radiusKm={radiusKm} hasGps={!!tripGps}
                onPick={(id) => { setSelected(id); setSnap('half'); setFocus({ ...byId[id], key: Date.now() }); }} onPlan={dayId !== 'all' ? togglePlan : null} />
            ) : dayId === 'all' ? (
              <TripList byId={byId} onDay={setDayId} />
            ) : (
              <DayList day={day} dayNote={dayNotes[day.id]} notes={notes} variants={variants} variant={variant} onVariant={(id) => chooseVariant(day.id, id)}
                onNewVariant={() => setEditor({ base: variant })} onEditVariant={() => setEditor({ editing: variant })} stops={stops} onPick={(p) => { setSelected(p.id); setSnap('half'); setFocus({ ...p, key: Date.now() }); }} />
            )}
          </>
        )}
      </Sheet>

      {legend && <Legend onClose={() => setLegend(false)} />}
      {gpsHelp && <GpsHelp onClose={() => setGpsHelp(false)} onRetry={() => { setGpsHelp(false); startGps(true); }} />}
      {newPlace && (
        <PlaceEditor city={day?.city} cat={filters.find((f) => CATEGORIES[f])} onClose={() => setNewPlace(false)}
          onSaved={(p) => { setSelected(p.id); setSnap('half'); setFocus({ lat: p.lat, lng: p.lng, zoom: 15, key: Date.now() }); if (!filters.includes(p.cat) && CATEGORIES[p.cat].filter && !stopPlaceIds.has(p.id)) setFilters((f) => [...f, p.cat]); }} />
      )}
      {editor && day && (
        <VariantEditor day={day} base={editor.base} editing={editor.editing} onClose={() => setEditor(null)}
          onSaved={(id) => { chooseVariant(day.id, id); setEditor(null); }} />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="grow">{toast.text}</span>
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null); }}>되돌리기</button>}
        </div>
      )}
    </div>
  );
}

function GpsHelp({ onClose, onRetry }) {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return (
    <Modal onClose={onClose} label="위치 권한 켜기">
      <ModalHead title="위치 권한을 켜 주세요" sub="한 번 거절하면 폰이 다시 묻지 않아서 직접 켜야 해요" onClose={onClose} />
      {ios ? (
        <ol className="help-steps">
          <li><b>설정 → 개인정보 보호 및 보안 → 위치 서비스</b>를 켜기</li>
          <li>같은 화면 아래 <b>Safari 웹 사이트</b> → <b>앱을 사용하는 동안</b></li>
          <li>Safari에서 이 주소를 열고 주소창의 <b>가가(aA) → 웹 사이트 설정 → 위치 → 허용</b></li>
          <li>앱으로 돌아와 아래 <b>다시 시도</b></li>
        </ol>
      ) : (
        <ol className="help-steps">
          <li><b>Chrome 앱</b>을 열고 오른쪽 위 <b>⋮ → 설정 → 사이트 설정 → 위치</b></li>
          <li><b>차단됨</b> 목록에서 <b>may6ixsong.github.io</b>를 눌러 <b>허용</b></li>
          <li>목록에 없으면 폰 <b>설정 → 애플리케이션 → Chrome → 권한 → 위치 → 앱 사용 중에만 허용</b></li>
          <li>폰 위쪽 빠른 설정에서 <b>위치</b>가 켜져 있는지 확인하고, 앱으로 돌아와 <b>다시 시도</b></li>
        </ol>
      )}
      <button className="btn primary block" onClick={onRetry}><Icon name="locate" size={18} />다시 시도</button>
    </Modal>
  );
}

function TodayAlert({ b, place, onDismiss, onOpen }) {
  const t = BOOKING_TYPES[b.type];
  return (
    <section className="alert-card" aria-label="오늘 예약 알림">
      <div className="row small bold">
        <Icon name="bell" size={16} />
        <span className="grow">오늘 예약 · {t.label}</span>
      </div>
      <div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 }}>{b.time ? `${b.time} ` : ''}{b.title}</div>
        {b.sub && <div className="small" style={{ color: '#ffede3', marginTop: 2 }}>{b.sub}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {place ? <a className="btn white" href={directionsUrl(place)} target="_blank" rel="noreferrer"><Icon name="locate" size={16} />길찾기</a> : <span />}
        <button className="btn soft" onClick={onOpen}><Icon name="ticket" size={16} />예약 보기</button>
      </div>
      <button className="btn soft small" style={{ background: 'transparent', borderTop: '1px solid rgba(255,255,255,.25)', borderRadius: 0 }} onClick={onDismiss}>
        <Icon name="x" size={14} />확인했어요 · 오늘 그만 보기
      </button>
    </section>
  );
}

function NoteLine({ text }) {
  return (
    <span className="note-line small" style={{ paddingLeft: 50 }}>
      <span className="note-dot" aria-hidden="true" />{text}
    </span>
  );
}

function DayList({ day, dayNote, stops, onPick, notes, variants, variant, onVariant, onNewVariant, onEditVariant }) {
  const placed = stops.filter((s) => s.place && !s.repeat).length;
  return (
    <>
      <DayNote key={day.id} day={day} note={dayNote} />
      <div className="chips" role="tablist" aria-label="그날 일정 고르기" style={{ marginBottom: 10 }}>
        {variants.map((v) => (
          <button key={v.id} role="tab" aria-selected={v.id === variant.id} className={`chip ${v.id === variant.id ? 'solid' : ''}`} onClick={() => onVariant(v.id)}>
            {v.label}
          </button>
        ))}
        <button className="chip" style={{ borderStyle: 'dashed' }} onClick={onNewVariant}><Icon name="plus" size={14} />다른 일정</button>
        <button className="chip" onClick={onEditVariant}><Icon name="edit" size={14} />고치기</button>
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <b className="grow">{variant.id === 'main' ? '오늘 일정' : variant.label} {placed}곳{variant.overridden && <span className="badge" style={{ marginLeft: 6 }}>직접 고침</span>}</b>
        <span className="small muted">확정 {stops.filter((s) => s.tag === 'confirmed').length} · 추천 {stops.filter((s) => s.tag !== 'confirmed').length}</span>
      </div>
      {stops.length === 0 && <div className="empty">아직 일정이 없어요. 위의 고치기를 눌러 추가하세요.</div>}
      {stops.map((s, i) => (
        <button key={i} className="stop" onClick={() => s.place && onPick(s.place)} disabled={!s.place}>
          <span className="rail">{s.place ? <MiniMarker cat={s.place.cat} label={s.n} /> : <span className="mk mini mk-circle" style={{ '--c': '#b8af9e' }}><span className="in" /></span>}</span>
          <span className="body">
            <span className="row" style={{ gap: 6 }}>
              <span className="time" style={{ fontWeight: /\d/.test(s.time) ? 700 : 400, color: /\d/.test(s.time) ? 'var(--ink)' : undefined }}>{s.time}</span>
              <span className="grow" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}>{s.title}</span>
              {s.tag === 'confirmed' ? <span className="badge ok">확정</span> : <span className="badge warn">추천</span>}
            </span>
            {s.note && <span className="small muted" style={{ paddingLeft: 50 }}>{s.note}</span>}
            {s.place && notes[s.place.id] && <NoteLine text={notes[s.place.id].text} />}
          </span>
        </button>
      ))}
    </>
  );
}

// 그날 메모: 일정(A안 · B안)과 상관없이 날짜마다 하나. 두 사람이 같이 봐요
function DayNote({ day, note }) {
  const me = useMe();
  const users = useUsers();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const l = dayLabel(day.date);
  const start = () => {
    setText(note?.text || '');
    setEditing(true);
  };
  const save = () => {
    saveDayNote(day.id, text, me.uid);
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="note-box day-note" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <b className="small">{l.md} 메모 · 두 사람이 같이 봐요</b>
        <textarea className="input" rows={Math.min(10, Math.max(4, text.split('\n').length * 2))} autoFocus value={text} onChange={(e) => setText(e.target.value)}
          placeholder="예: 체크아웃 11시 · 짐 맡기고 출발 · 저녁은 예약 없이 가보기" aria-label="날짜 메모" />
        <div className="row">
          {note && <button className="btn small ghost" style={{ color: 'var(--danger)' }} onClick={() => { saveDayNote(day.id, '', me.uid); setEditing(false); }}>메모 지우기</button>}
          <span className="grow" />
          <button className="btn small" onClick={() => setEditing(false)}>취소</button>
          <button className="btn small primary" onClick={save} disabled={!text.trim()}>저장</button>
        </div>
      </div>
    );
  }
  if (!note) {
    return (
      <button className="btn small ghost day-note-add" onClick={start}>
        <Icon name="edit" size={14} />{l.md} 메모 쓰기
      </button>
    );
  }
  const who = users[note.by];
  return (
    <div className={`note-box day-note${open ? ' open' : ''}`}>
      <span className="row small bold" style={{ gap: 6 }}>
        <span className="note-dot" aria-hidden="true" />{l.md} 메모<span className="grow" />
        <button className="icon-btn day-note-edit" onClick={start} aria-label="날짜 메모 고치기"><Icon name="edit" size={14} /></button>
      </span>
      <button className="day-note-text" onClick={() => setOpen(!open)} aria-expanded={open}>{note.text}</button>
      <span className="tiny muted">{who?.name || ''} · {new Date(note.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}

function TripList({ byId, onDay }) {
  const groups = [];
  DAYS.forEach((d) => {
    const last = groups[groups.length - 1];
    if (last && last.city === d.city) last.days.push(d);
    else groups.push({ city: d.city, days: [d] });
  });
  return (
    <div className="list">
      {groups.map((g, i) => (
        <button key={i} className="item" onClick={() => onDay(g.days[0].id)}>
          <span className="avatar" style={{ '--s': '26px', '--c': CITIES[g.city].color }}>{i + 1}</span>
          <span className="grow bold">{CITIES[g.city].label}</span>
          <span className="small muted">{dayLabel(g.days[0].date).md}{g.days.length > 1 ? ` – ${dayLabel(g.days[g.days.length - 1].date).md}` : ''} · {g.days.length}일</span>
        </button>
      ))}
      <span className="tiny muted" style={{ display: 'block', paddingTop: 8 }}>{byId['rm-fco'] && '숙소를 이은 선은 도시 간 이동 순서예요.'}</span>
    </div>
  );
}

function CandidateList({ otherDays, list, plan, nearby, radiusKm, hasGps, onPick, onPlan, notes, scopeLabel, allCities, onAllCities }) {
  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="grow">
          <b>{nearby ? `반경 ${radiusKm < 1 ? '500m' : radiusKm + 'km'} 안 후보 ${list.length}곳` : `후보 ${list.length}곳`}</b>
          {scopeLabel && <span className="tiny muted" style={{ display: 'block' }}>{scopeLabel} 기준</span>}
        </span>
        {!nearby && <button className="btn small" onClick={onAllCities}>{allCities ? '근처만 보기' : '전체 도시 보기'}</button>}
        {nearby && !hasGps && <span className="tiny muted">위치 찾는 중 · 지도 중심 기준</span>}
      </div>
      {list.length === 0 && <div className="empty">조건에 맞는 후보가 없어요. 반경을 넓히거나 필터를 바꿔보세요.</div>}
      <div className="list">
        {list.map(({ p, d }) => {
          const pi = plan.indexOf(p.id);
          return (
            <div key={p.id} className="item" style={{ padding: '10px 0' }}>
              <button style={{ border: 0, background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textAlign: 'left' }} onClick={() => onPick(p.id)}>
                <MiniMarker cat={p.cat} />
                <span className="grow">
                  <span style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem' }}>{p.name}</span>
                  <span className="small muted">
                    {otherDays(p.id).map((id) => <span key={id} className="badge" style={{ marginRight: 4 }}>{dayLabel(DAYS.find((x) => x.id === id).date).md} 일정</span>)}
                    {CATEGORIES[p.cat]?.label} · {formatKm(d)} · 도보 {walkMinutes(d)}분{p.note ? ` · ${p.note}` : ''}
                  </span>
                  {notes[p.id] && <NoteLine text={notes[p.id].text} />}
                </span>
              </button>
              {onPlan && (
                <button className={`btn small ${pi >= 0 ? 'alert' : ''}`} onClick={() => onPlan(p)} aria-label="임시 동선에 추가">
                  {pi >= 0 ? LETTERS[pi] : '+ 동선'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function PlanCard({ plan, byId, onClear, onPick }) {
  return (
    <div className="card pad" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, borderColor: 'var(--alert)' }}>
      <div className="row"><b className="grow">임시 동선</b><button className="btn small" onClick={onClear}>비우기</button></div>
      <div className="chips wrap">
        {plan.map((id, i) => byId[id] && (
          <button key={id} className="chip" onClick={() => onPick(id)}><MiniMarker cat={byId[id].cat} label={LETTERS[i]} />{byId[id].name}</button>
        ))}
      </div>
      <span className="tiny muted">원래 일정은 그대로 두고, 주황 선으로 A → B 순서를 보여줘요.</span>
    </div>
  );
}

function MeasurePanel({ m, gps, onSwap, onUseGps }) {
  if (!m.a || !m.b) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Slot letter="A" label="출발" value={m.a?.name} action={gps && <button className="btn small" onClick={onUseGps}>내 위치로</button>} />
        <Slot letter="B" label="도착" value={m.b?.name} active={!!m.a} />
        <span className="tiny muted" style={{ textAlign: 'center' }}>일정 · 후보 마커나 지도 빈 곳을 탭하세요</span>
      </div>
    );
  }
  const km = distanceKm(m.a, m.b);
  const modes = [['walking', '도보', 'walk'], ['transit', '대중교통', 'bus'], ['driving', '택시 · 차', 'car']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="grow">
          <div className="small muted">직선 거리 · 오프라인 계산</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>{formatKm(km)}</div>
          <div className="small muted">{m.a.name} → {m.b.name}</div>
        </div>
        <button className="btn small" onClick={onSwap}><Icon name="swap" size={14} />A ↔ B</button>
      </div>
      <div className="small bold" style={{ color: 'var(--ink-2)' }}>실제 경로는 구글맵에서</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {modes.map(([mode, label, icon], i) => (
          <a key={mode} className={`btn ${i === 0 ? 'primary' : ''}`} style={{ flexDirection: 'column', minHeight: 70, gap: 4 }} href={directionsUrl(m.b, m.a, mode)} target="_blank" rel="noreferrer">
            <Icon name={icon} size={22} />{label}
          </a>
        ))}
      </div>
      <span className="tiny muted" style={{ textAlign: 'center' }}>누르면 구글맵 앱에서 A → B 길찾기가 열려요 (인터넷 필요)</span>
    </div>
  );
}

function Slot({ letter, label, value, active, action }) {
  return (
    <div className="row" style={{ minHeight: 52, borderRadius: 14, padding: '0 12px', background: value ? 'var(--bg)' : 'transparent', border: value ? 0 : `2px dashed ${active ? 'var(--accent)' : 'var(--line)'}` }}>
      <span className="mk-pin" style={{ width: 28, height: 28, borderWidth: 0, fontSize: 13, '--c': letter === 'A' ? 'var(--ink)' : 'var(--accent)' }}>{letter}</span>
      <span className="grow"><span className="tiny muted" style={{ display: 'block' }}>{label}</span><span className="bold">{value || '지도에서 탭'}</span></span>
      {action}
    </div>
  );
}

function Legend({ onClose }) {
  const samples = { meal: 8, snack: 4, drink: 9, cafe: 2, dessert: 5, sight: 3, shop: 6, stay: 1, transit: null };
  return (
    <Modal onClose={onClose} label="지도 마커 안내">
      <ModalHead title="지도 마커 안내" onClose={onClose} />
      <p className="small muted" style={{ margin: 0 }}>모양 = 장소 종류. 안에 <b>숫자</b>가 있으면 내 일정 순서, <b>아이콘</b>이면 후보, <b>A·B</b>는 임시 동선이에요.</p>
      <div>
        <div className="legend-row small muted" style={{ minHeight: 30 }}><span>종류</span><div>내 일정</div><div>후보</div></div>
        {Object.entries(CATEGORIES).map(([id, c]) => (
          <div className="legend-row" key={id}>
            <div><div className="bold">{c.label}</div></div>
            <div><MiniMarker cat={id} label={samples[id] ?? undefined} /></div>
            <div>{c.filter ? <MiniMarker cat={id} /> : <span className="muted">—</span>}</div>
          </div>
        ))}
        <div className="legend-row">
          <div><div className="bold">메모 있음</div><div className="tiny muted">장소에 우리가 쓴 메모가 있으면 노란 점</div></div>
          <div><span className="mk mini mk-diamond" style={{ '--c': '#0B7285' }}><span className="in"><span>3</span></span><span className="mk-note" /></span></div>
          <div />
        </div>
      </div>
    </Modal>
  );
}
