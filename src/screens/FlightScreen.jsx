// 기내 위치: 로마 ↔ 인천 비행 중 지금 대략 어디쯤인지 보여줘요.
// '출발'을 누른 시각부터 비행시간을 일정하게 나눠 경로 위에 표시해요. 지도는 코드에 들어 있어서 비행기 모드에서도 보여요.
import { useMemo, useState } from 'react';
import { BORDERS, LAND, MAP } from '../data/flightMap.js';
import { ROUTES, clock, fmtDur, pointAt, routeInfo, setFlight, useFlight } from '../lib/flight.js';
import { Icon } from '../components/ui.jsx';

const xy = (lat, lng) => [(lng - MAP.lon0) * MAP.k * MAP.s, (MAP.lat1 - lat) * MAP.s];

const CITIES = [
  ['로마', 41.9, 12.5],
  ['이스탄불', 41.0, 29.0],
  ['바쿠', 40.4, 49.9],
  ['타슈켄트', 41.3, 69.3],
  ['알마티', 43.2, 76.9],
  ['우루무치', 43.8, 87.6],
  ['베이징', 39.9, 116.4],
  ['서울', 37.57, 126.98],
  ['모스크바', 55.75, 37.6],
  ['테헤란', 35.7, 51.4],
  ['델리', 28.6, 77.2],
  ['상하이', 31.2, 121.5],
];
const SEAS = [
  ['지중해', 35.5, 18.5],
  ['흑해', 43.3, 34.5],
  ['카스피해', 42.3, 50.6],
  ['서해', 35.6, 123.8],
];

const MIN = 60000;

function FlightMap({ route, f, zoom }) {
  const pos = pointAt(route, f);
  const [px, py] = xy(pos.lat, pos.lng);
  const line = route.pts.map(([la, lo]) => xy(la, lo));
  // 지나온 경로: 출발 ~ 지금 위치
  const flown = [...line.slice(0, pos.i), [px, py]];
  // 1시간마다 눈금
  const ticks = [];
  for (let h = 1; h * 60 < route.minutes; h++) {
    const p = pointAt(route, (h * 60) / route.minutes);
    ticks.push([h, ...xy(p.lat, p.lng)]);
  }
  // 비행기 방향: 지금 구간의 방향
  const [ax, ay] = line[pos.i - 1];
  const [bx, by] = line[pos.i];
  const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;

  let vb;
  if (zoom) {
    const w = MAP.w / 3.4;
    const h = w * 0.8;
    const x = Math.min(Math.max(px - w / 2, 0), MAP.w - w);
    const y = Math.min(Math.max(py - h / 2, 0), MAP.h - h);
    vb = [x, y, w, h];
  } else {
    // 경로 둘레만 (유럽 ~ 한국)
    vb = [xy(0, 4)[0], xy(56, 0)[1], xy(0, 134)[0] - xy(0, 4)[0], xy(24, 0)[1] - xy(56, 0)[1]];
  }
  const u = vb[2] / (zoom ? 100 : 150); // 글자 · 선 굵기 기준 (전체 경로는 작게)
  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');

  return (
    <svg className="flight-map" viewBox={vb.join(' ')} style={{ aspectRatio: `${vb[2]} / ${vb[3]}` }} role="img" aria-label={`지금 위치: ${pos.near} 근처`}>
      <rect x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} fill="#cfe3ee" />
      <path d={LAND} fill="#f3eee2" stroke="#b9ad96" strokeWidth={u * 0.18} />
      <path d={BORDERS} fill="none" stroke="#c9bda6" strokeWidth={u * 0.15} strokeDasharray={`${u * 0.6} ${u * 0.4}`} />
      {SEAS.map(([n, la, lo]) => {
        const [x, y] = xy(la, lo);
        return <text key={n} x={x} y={y} fontSize={u * 2.2} fill="#6d93ab" textAnchor="middle" fontStyle="italic">{n}</text>;
      })}
      <polyline points={pts(line)} fill="none" stroke="#1F5F8B" strokeOpacity="0.45" strokeWidth={u * 0.5} strokeDasharray={`${u * 1.2} ${u * 0.9}`} strokeLinecap="round" />
      <polyline points={pts(flown)} fill="none" stroke="#C2410C" strokeWidth={u * 0.75} strokeLinecap="round" strokeLinejoin="round" />
      {ticks.map(([h, x, y]) => (
        <g key={h}>
          <circle cx={x} cy={y} r={u * 0.55} fill="#fff" stroke="#1F5F8B" strokeWidth={u * 0.25} />
          <text x={x} y={y + u * 2.6} fontSize={u * 1.7} fill="#1F5F8B" textAnchor="middle" fontWeight="700">{h}h</text>
        </g>
      ))}
      {CITIES.map(([n, la, lo]) => {
        const [x, y] = xy(la, lo);
        return (
          <g key={n}>
            <circle cx={x} cy={y} r={u * 0.45} fill="#5b4f40" />
            <text x={x + u * 0.9} y={y - u * 0.7} fontSize={u * 2} fill="#3d342a" stroke="#f3eee2" strokeWidth={u * 0.5} paintOrder="stroke">{n}</text>
          </g>
        );
      })}
      <g transform={`translate(${px} ${py}) rotate(${angle}) scale(${u * 0.32})`}>
        <circle r="9" fill="#C2410C" fillOpacity="0.18" />
        <path d="M8 0 L5 -1.2 L1 -1.2 L-3 -7 L-5 -7 L-2.5 -1.2 L-6 -1.2 L-7.5 -3.5 L-9 -3.5 L-8 0 L-9 3.5 L-7.5 3.5 L-6 1.2 L-2.5 1.2 L-5 7 L-3 7 L1 1.2 L5 1.2 Z" fill="#C2410C" stroke="#fff" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

export default function FlightScreen({ onClose }) {
  const [flight, now, setNow] = useFlight();
  const [pick, setPick] = useState({ 'fco-icn': ROUTES['fco-icn'].minutes, 'icn-fco': ROUTES['icn-fco'].minutes });
  const [zoom, setZoom] = useState(true);

  const route = flight ? { ...ROUTES[flight.route], minutes: flight.minutes } : null;
  const info = useMemo(() => route && routeInfo(route), [flight?.route]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (id) => setFlight({ route: id, start: Date.now(), minutes: pick[id] });
  const patch = (p) => {
    setFlight({ ...flight, ...p });
    setNow(Date.now());
  };
  const stop = () => confirm('비행 위치 보기를 끝낼까요?') && setFlight(null);

  return (
    <div className="scroll flight-screen">
      <div className="top">
        <div className="top-inner">
          <div className="row">
            <button className="icon-btn" onClick={onClose} aria-label="뒤로"><Icon name="back" /></button>
            <h1 className="grow">기내 위치</h1>
          </div>
        </div>
      </div>

      <div className="page">
        {!route ? (
          <>
            <section className="card pad flight-intro">
              <Icon name="flight" size={32} />
              <b>비행기가 이륙하면 아래 출발 버튼을 눌러 주세요</b>
              <span className="small muted">
                그때부터 비행시간을 일정하게 나눠서 지금 대략 어디쯤인지 지도에 보여 드려요. 인터넷 · GPS 없이 시간으로만 계산해서 비행기 모드에서도 돼요.
              </span>
            </section>
            {Object.values(ROUTES).map((r) => (
              <section key={r.id} className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="row">
                  <b className="grow" style={{ fontSize: '1.1rem' }}>{r.label}</b>
                  <span className="muted small">약 {Math.round(routeInfo(r).total).toLocaleString()}km</span>
                </div>
                <div className="row">
                  <span className="small muted grow">예상 비행시간</span>
                  <button className="btn small" onClick={() => setPick((p) => ({ ...p, [r.id]: p[r.id] - 10 }))} aria-label="10분 줄이기">−10분</button>
                  <b style={{ minWidth: 92, textAlign: 'center' }}>{fmtDur(pick[r.id])}</b>
                  <button className="btn small" onClick={() => setPick((p) => ({ ...p, [r.id]: p[r.id] + 10 }))} aria-label="10분 늘리기">+10분</button>
                </div>
                <button className="btn primary" onClick={() => start(r.id)}><Icon name="flight" size={18} />{r.label} 출발 (지금 이륙)</button>
              </section>
            ))}
            <p className="tiny muted" style={{ textAlign: 'center', margin: 0 }}>항공권에 적힌 비행시간으로 맞춰 두면 더 정확해요</p>
          </>
        ) : (
          <FlightLive route={route} info={info} flight={flight} now={now} zoom={zoom} setZoom={setZoom} patch={patch} stop={stop} />
        )}
      </div>
    </div>
  );
}

function FlightLive({ route, flight, now, zoom, setZoom, patch, stop }) {
  const total = route.minutes;
  const elapsed = (now - flight.start) / MIN;
  const f = Math.max(0, Math.min(1, elapsed / total));
  const pos = pointAt(route, f);
  const arrive = flight.start + total * MIN;
  const done = f >= 1;

  return (
    <>
      <div className="row">
        <b className="grow" style={{ fontSize: '1.1rem' }}>{route.label}</b>
        <div className="seg" style={{ minWidth: 170 }}>
          <button className={zoom ? 'on' : ''} onClick={() => setZoom(true)}>가까이</button>
          <button className={!zoom ? 'on' : ''} onClick={() => setZoom(false)}>전체 경로</button>
        </div>
      </div>
      <div className="flight-mapbox">
        <FlightMap route={route} f={f} zoom={zoom} />
      </div>

      <section className="card pad flight-now">
        <span className="small muted">{done ? '도착' : '지금 대략'}</span>
        <b className="flight-near">{done ? `${route.to}에 도착했을 시간이에요` : `${pos.near} 근처`}</b>
        <div className="progress"><i style={{ width: `${f * 100}%` }} /></div>
        <div className="flight-grid">
          <span className="muted">지난 시간</span><b>{fmtDur(Math.min(elapsed, total))}</b>
          <span className="muted">남은 시간</span><b>{fmtDur(total - elapsed)}</b>
          <span className="muted">온 거리</span><b>{Math.round(pos.km).toLocaleString()}km</b>
          <span className="muted">남은 거리</span><b>{Math.round(pos.total - pos.km).toLocaleString()}km</b>
          <span className="muted">도착 예정</span><b>{route.to} 시각 {clock(arrive, route.toTz)}</b>
          <span className="muted">지금 시각</span><b>{route.from} {clock(now, route.fromTz)} · {route.to} {clock(now, route.toTz)}</b>
        </div>
        <span className="tiny muted">출발 {clock(flight.start, route.fromTz)} ({route.from} 시각) · 비행시간 {fmtDur(total)} · 30초마다 위치를 다시 계산해요</span>
      </section>

      <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b className="small">어긋나면 맞춰 주세요</b>
        <div className="row">
          <span className="small muted grow">이륙 시각</span>
          <button className="btn small" onClick={() => patch({ start: flight.start - 5 * MIN })}>−5분</button>
          <button className="btn small" onClick={() => patch({ start: flight.start + 5 * MIN })}>+5분</button>
        </div>
        <div className="row">
          <span className="small muted grow">비행시간</span>
          <button className="btn small" onClick={() => patch({ minutes: total - 10 })}>−10분</button>
          <button className="btn small" onClick={() => patch({ minutes: total + 10 })}>+10분</button>
        </div>
        <span className="tiny muted">기내 화면 · 기장 안내 방송의 남은 시간과 다르면 비행시간을 고쳐 주세요.</span>
        <button className="btn small" style={{ alignSelf: 'flex-start', color: 'var(--alert)' }} onClick={stop}><Icon name="x" size={14} />비행 끝내기</button>
      </section>
    </>
  );
}
