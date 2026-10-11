// 지도 탭: 날짜별 번호 마커 · 후보 필터(동시 선택) · 내 주변 · 임시 동선 · 장소 시트 · 거리 재기 · 당일 예약 알림
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapView from '../components/MapView.jsx';
import Sheet from '../components/Sheet.jsx';
import PlaceDetail from '../components/PlaceDetail.jsx';
import { Avatar, Icon, MiniMarker, Modal, ModalHead } from '../components/ui.jsx';
import { CATEGORIES, CITIES } from '../data/places.js';
import { DAYS, dayLabel, todayIso } from '../data/itinerary.js';
import { BOOKINGS, BOOKING_TYPES } from '../data/bookings.js';
import { usePlaces } from '../lib/places.js';
import { directionsUrl, distanceKm, formatKm, walkMinutes } from '../lib/geo.js';
import { getPref, setPref } from '../lib/store.js';
import { useMe } from '../lib/user.js';
import { hasFirebase, HAS_TILES } from '../config.js';

const LETTERS = 'ABCDEFGHIJ';
const STAY_ROUTE = ['rm-fco', 'rm-hotel', 'na-hotel', 'po-hotel', 'fi-hotel', 'tu-hotel', 'fi-hotel2', 'rm-fco'];

export default function MapScreen({ go, openBooking }) {
  const me = useMe();
  const { byId } = usePlaces();
  const today = todayIso();
  const [dayId, setDayId] = useState(() => DAYS.find((d) => d.date === today)?.id || getPref('day', 'all'));
  const [filters, setFilters] = useState([]);
  const [nearby, setNearby] = useState(false);
  const [radiusKm, setRadiusKm] = useState(1);
  const [gps, setGps] = useState(null);
  const [center, setCenter] = useState(null);
  const [selected, setSelected] = useState(null);
  const [snap, setSnap] = useState('peek');
  const [measure, setMeasure] = useState(null); // { a, b }
  const [plan, setPlanState] = useState(() => getPref(`plan:${dayId}`, []));
  const [legend, setLegend] = useState(false);
  const [focus, setFocus] = useState(null);
  const [toast, setToast] = useState(null);
  const [dismissed, setDismissed] = useState(() => getPref(`dismiss:${today}`, []));
  const watch = useRef(null);

  const day = DAYS.find((d) => d.id === dayId);
  useEffect(() => {
    setPref('day', dayId);
    setPlanState(getPref(`plan:${dayId}`, []));
    setSelected(null);
  }, [dayId]);
  const setPlan = (next) => {
    setPlanState(next);
    setPref(`plan:${dayId}`, next);
  };

  /* ----- GPS ----- */
  const startGps = useCallback((fly) => {
    if (!navigator.geolocation) return setToast({ text: '이 기기는 위치를 지원하지 않아요' });
    if (watch.current == null) {
      watch.current = navigator.geolocation.watchPosition(
        (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setToast({ text: '위치 권한을 허용해 주세요 (설정 > 브라우저 > 위치)' }),
        { enableHighAccuracy: true, maximumAge: 15000 },
      );
    }
    if (fly && gps) setFocus({ ...gps, zoom: 15, key: Date.now() });
  }, [gps]);
  useEffect(() => () => watch.current != null && navigator.geolocation.clearWatch(watch.current), []);
  const flewToGps = useRef(false);
  useEffect(() => {
    if (gps && !flewToGps.current && (nearby || watch.current != null)) {
      flewToGps.current = true;
      setFocus({ ...gps, zoom: 15, key: Date.now() });
    }
  }, [gps, nearby]);

  /* ----- 그날 일정 ----- */
  const stops = useMemo(() => {
    if (!day) return [];
    let n = 0;
    const seen = {};
    return day.stops.map((s) => {
      const place = s.place ? byId[s.place] : null;
      if (!place) return { ...s, n: null };
      if (seen[place.id]) return { ...s, n: seen[place.id], place, repeat: true };
      n += 1;
      seen[place.id] = n;
      return { ...s, n, place };
    });
  }, [day, byId]);
  const stopPlaceIds = new Set(stops.filter((s) => s.place).map((s) => s.place.id));
  const dayCenter = useMemo(() => {
    const pts = stops.filter((s) => s.place);
    if (!pts.length) return null;
    return { lat: pts.reduce((a, s) => a + s.place.lat, 0) / pts.length, lng: pts.reduce((a, s) => a + s.place.lng, 0) / pts.length };
  }, [stops]);

  /* ----- 후보 ----- */
  const ref = nearby ? gps || center : null;
  const candidates = useMemo(() => {
    if (!filters.length && !nearby) return [];
    const cats = filters.length ? filters : Object.keys(CATEGORIES).filter((c) => CATEGORIES[c].filter);
    return Object.values(byId)
      .filter((p) => cats.includes(p.cat) && !stopPlaceIds.has(p.id))
      .map((p) => ({ p, d: ref ? distanceKm(ref, p) : dayCenter ? distanceKm(dayCenter, p) : 0 }))
      .filter(({ d }) => (ref ? d <= radiusKm : dayCenter ? d <= 12 : true))
      .sort((a, b) => a.d - b.d);
  }, [filters, nearby, byId, ref?.lat, ref?.lng, radiusKm, dayCenter, dayId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- 마커 · 선 ----- */
  const markers = useMemo(() => {
    const out = [];
    if (dayId === 'all') {
      STAY_ROUTE.slice(1, -1).forEach((id, i) => {
        const p = byId[id];
        // 같은 도시에 두 번 묵으면(피렌체) 마커 하나에 번호를 같이 표시
        const near = out.find((m) => distanceKm(m, p) < 3);
        if (near) return void (near.label = `${near.label}·${i + 1}`);
        out.push({ id, title: p.name, lat: p.lat, lng: p.lng, cat: 'stay', label: i + 1, caption: CITIES[p.city].label, color: CITIES[p.city].color, kind: 'k-stop big', selected: selected === id });
      });
    } else {
      for (const s of stops) {
        if (!s.place || s.repeat) continue;
        out.push({ id: s.place.id, title: s.place.name, lat: s.place.lat, lng: s.place.lng, cat: s.place.cat, label: s.n, caption: s.title.length > 14 ? s.title.slice(0, 13) + '…' : s.title, kind: 'k-stop', selected: selected === s.place.id, dim: candidates.length > 0 && !selected });
      }
    }
    const many = candidates.length > 18;
    candidates.forEach(({ p }) => {
      const pi = plan.indexOf(p.id);
      out.push({ id: p.id, title: p.name, lat: p.lat, lng: p.lng, cat: p.cat, label: pi >= 0 ? LETTERS[pi] : null, caption: many && pi < 0 ? null : p.name, kind: `cand${pi >= 0 ? ' plan' : ''}`, selected: selected === p.id, noFit: true });
    });
    plan.forEach((id, i) => {
      if (out.some((m) => m.id === id)) return;
      const p = byId[id];
      if (p) out.push({ id, title: p.name, lat: p.lat, lng: p.lng, cat: p.cat, label: LETTERS[i], caption: p.name, kind: 'cand plan', selected: selected === id });
    });
    if (measure?.a && !byId[measure.a.id]) out.push({ ...measure.a, cat: 'transit', label: 'A', kind: 'big', noFit: true });
    if (measure?.b && !byId[measure.b.id]) out.push({ ...measure.b, cat: 'transit', label: 'B', kind: 'big', noFit: true, color: '#1F5F8B' });
    return out;
  }, [dayId, stops, candidates, plan, selected, byId, measure]);

  const routes = useMemo(() => {
    if (dayId === 'all') return [{ coords: STAY_ROUTE.map((id) => [byId[id].lng, byId[id].lat]), color: '#3B4650' }];
    const r = [{ coords: stops.filter((s) => s.place && !s.repeat).map((s) => [s.place.lng, s.place.lat]), color: CITIES[day.city].color }];
    if (plan.length > 1) r.push({ coords: plan.map((id) => byId[id]).filter(Boolean).map((p) => [p.lng, p.lat]), color: '#C2410C', width: 3.5 });
    return r;
  }, [dayId, stops, plan, byId, day]);

  const alerts = BOOKINGS.filter((b) => b.date === today && BOOKING_TYPES[b.type].alert && !dismissed.includes(b.id));
  const fitKey = `${dayId}`;
  const wide = window.innerWidth >= 760;
  const sheetPad = wide ? 60 : window.innerHeight * ({ peek: 0.26, half: 0.52, full: 0.6 }[snap] + 0.04);
  const padding = { top: alerts.length && !wide ? 380 : 190, bottom: sheetPad, left: 50, right: 70 };

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
  const toggleFilter = (c) => setFilters((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]));
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

  const selPlace = selected ? byId[selected] : null;
  const selStop = selPlace && stops.find((s) => s.place?.id === selPlace.id);

  return (
    <div className="map-screen has-panel">
      <MapView markers={markers} routes={routes} me={gps} radius={nearby && ref ? { center: ref, km: radiusKm } : null}
        measure={measure} onMarker={onMarker} onMapClick={onMapClick} fitKey={fitKey} padding={padding} onMove={setCenter} focus={focus} />

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
        <div className="map-top">
          <header className="map-head">
            <div className="row">
              <div className="grow">
                <div className="small muted">{day ? `${dayLabel(day.date).m}월 ${dayLabel(day.date).dd}일 ${dayLabel(day.date).wd}요일` : '10/20 – 11/1 · 12박 13일'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{day ? `Day ${DAYS.indexOf(day) + 1} · ${day.title}` : '전체 여정'}</div>
              </div>
              <span className={`badge ${hasFirebase ? 'ok' : 'warn'}`} title={hasFirebase ? '공유 중' : '이 폰에만 저장 중'}>
                <Icon name="cloud" size={13} />{HAS_TILES ? '오프라인 지도' : '온라인 지도'}
              </span>
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
        </div>
      )}

      <div className="fab-col" style={{ bottom: `calc(${snap === 'peek' ? 26 : 52}% + 12px)` }}>
        <button className="fab" style={{ color: 'var(--accent)' }} onClick={() => startGps(true)} aria-label="내 위치로"><Icon name="locate" /></button>
        <button className={`fab ${measure ? 'on' : ''}`} onClick={() => { setMeasure(measure ? null : { a: null, b: null }); setSelected(null); }} aria-label="거리 재기"><Icon name="ruler" /></button>
        <button className="fab" onClick={() => setLegend(true)} aria-label="마커 범례"><Icon name="layers" /></button>
      </div>

      <Sheet snap={snap} onSnap={setSnap}>
        {measure ? (
          <MeasurePanel m={measure} gps={gps} onSwap={() => setMeasure({ a: measure.b, b: measure.a })} onUseGps={() => gps && setMeasure({ ...measure, a: { id: 'gps', name: '내 위치', ...gps } })} />
        ) : selPlace ? (
          <PlaceDetail place={selPlace} stop={selStop ? { ...selStop, day: day && dayLabel(day.date).md } : null} gps={gps}
            onClose={() => { setSelected(null); setSnap('peek'); }}
            onMeasureFrom={(p) => { setMeasure({ a: { id: p.id, name: p.name, lat: p.lat, lng: p.lng, placeId: p.placeId }, b: null }); setSelected(null); setSnap('peek'); }}
            onPlan={dayId !== 'all' && !stopPlaceIds.has(selPlace.id) ? togglePlan : null} inPlan={plan.includes(selPlace.id)} />
        ) : (
          <>
            {plan.length > 0 && <PlanCard plan={plan} byId={byId} onClear={() => setPlan([])} onPick={(id) => { setSelected(id); setSnap('half'); }} />}
            {candidates.length > 0 || nearby ? (
              <CandidateList list={candidates} plan={plan} nearby={nearby} radiusKm={radiusKm} hasGps={!!gps}
                onPick={(id) => { setSelected(id); setSnap('half'); setFocus({ ...byId[id], key: Date.now() }); }} onPlan={dayId !== 'all' ? togglePlan : null} />
            ) : dayId === 'all' ? (
              <TripList byId={byId} onDay={setDayId} />
            ) : (
              <DayList stops={stops} onPick={(p) => { setSelected(p.id); setSnap('half'); setFocus({ ...p, key: Date.now() }); }} />
            )}
          </>
        )}
      </Sheet>

      {legend && <Legend onClose={() => setLegend(false)} />}
      {toast && (
        <div className="toast" role="status">
          <span className="grow">{toast.text}</span>
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null); }}>되돌리기</button>}
        </div>
      )}
    </div>
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

function DayList({ stops, onPick }) {
  const placed = stops.filter((s) => s.place && !s.repeat).length;
  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <b className="grow">오늘 일정 {placed}곳</b>
        <span className="small muted">확정 {stops.filter((s) => s.tag === 'confirmed').length} · 추천 {stops.filter((s) => s.tag !== 'confirmed').length}</span>
      </div>
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
          </span>
        </button>
      ))}
    </>
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

function CandidateList({ list, plan, nearby, radiusKm, hasGps, onPick, onPlan }) {
  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <b className="grow">{nearby ? `반경 ${radiusKm < 1 ? '500m' : radiusKm + 'km'} 안 후보 ${list.length}곳` : `이 근처 후보 ${list.length}곳`}</b>
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
                  <span className="small muted">{CATEGORIES[p.cat].label} · {formatKm(d)} · 도보 {walkMinutes(d)}분{p.note ? ` · ${p.note}` : ''}</span>
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
  const samples = { meal: 8, cafe: 2, gelato: 5, sight: 3, shop: 6, stay: null, transit: null };
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
      </div>
    </Modal>
  );
}
