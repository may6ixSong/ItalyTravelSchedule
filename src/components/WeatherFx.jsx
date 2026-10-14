// 날짜를 고르면 지도 위에 그날 날씨 애니메이션을 3초 동안 옅게 보여주고 사라져요 (터치는 지도로 그대로 통과).
import { useEffect, useMemo, useState } from 'react';
import { WEATHER_KINDS } from '../lib/weather.js';

const PLAY_MS = 3000;
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 매번 같은 모양이 나오게 고정된 난수
function rand(seed) {
  let s = seed;
  return (a, b) => {
    s = (s * 16807) % 2147483647;
    return a + ((s - 1) / 2147483646) * (b - a);
  };
}

const WAVE = 'M0 12 Q 20 2 40 12 T 80 12 T 120 12 T 160 12 T 200 12 T 240 12 T 280 12 T 320 12 T 360 12 T 400 12 T 440 12 T 480 12';

function Layers({ kind }) {
  const items = useMemo(() => {
    const r = rand(7);
    if (kind === 'rain') {
      return {
        drops: Array.from({ length: 70 }, () => ({ left: `${r(0, 140)}%`, h: r(16, 36), d: r(0.55, 0.9), dl: r(0, 2), o: r(0.4, 0.85) })),
        ripples: Array.from({ length: 8 }, () => ({ left: `${r(5, 92)}%`, top: `${r(25, 80)}%`, dl: r(0, 1.4) })),
      };
    }
    if (kind === 'cloud') {
      return { clouds: [[220, 8, 16, -9], [170, 32, 14, -3], [250, 55, 18, -12], [160, 78, 13, -6]] };
    }
    if (kind === 'sun') return { sparks: Array.from({ length: 7 }, () => ({ left: `${r(5, 92)}%`, top: `${r(25, 80)}%`, s: r(10, 20), dl: r(0, 3) })) };
    return { waves: Array.from({ length: 6 }, () => ({ top: `${r(45, 85)}%`, d: r(2.4, 3.4), dl: r(0, 3) })) };
  }, [kind]);

  if (kind === 'rain') {
    return (
      <>
        {items.drops.map((x, i) => <i key={i} className="wx-drop" style={{ left: x.left, height: x.h, opacity: x.o, animationDuration: `${x.d}s`, animationDelay: `-${x.dl}s` }} />)}
        {items.ripples.map((x, i) => <i key={`r${i}`} className="wx-ripple" style={{ left: x.left, top: x.top, animationDelay: `-${x.dl}s` }} />)}
      </>
    );
  }
  if (kind === 'cloud') {
    return items.clouds.map(([w, top, d, dl], i) => (
      <div key={i} className="wx-puff" style={{ '--w': `${w}px`, top: `${top}%`, animationDuration: `${d}s`, animationDelay: `${dl}s` }}><i /><i /><i /><i /></div>
    ));
  }
  if (kind === 'sun') {
    return (
      <>
        <div className="wx-rays" /><div className="wx-orb" />
        {items.sparks.map((x, i) => <i key={i} className="wx-spark" style={{ left: x.left, top: x.top, width: x.s, height: x.s, animationDelay: `-${x.dl}s` }} />)}
      </>
    );
  }
  return (
    <>
      <div className="wx-rays" /><div className="wx-orb" />
      {items.waves.map((x, i) => (
        <svg key={i} className="wx-wave" viewBox="0 0 460 24" preserveAspectRatio="none" style={{ top: x.top, animationDuration: `${x.d}s`, animationDelay: `-${x.dl}s` }}><path d={WAVE} /></svg>
      ))}
    </>
  );
}

// playKey가 바뀔 때마다(날짜를 고를 때) 3초 동안 { kind, key }, 그 뒤 null
export function useWeatherPlay(kind, playKey) {
  const [show, setShow] = useState(null);
  useEffect(() => {
    if (!kind) return setShow(null);
    setShow({ kind, key: playKey });
    const t = setTimeout(() => setShow(null), PLAY_MS);
    return () => clearTimeout(t);
  }, [playKey, kind]);
  return show;
}

// 지도 위 애니메이션 (지도 영역만 덮어요)
export default function WeatherFx({ show }) {
  if (!show || reduceMotion()) return null;
  return <div className={`wx-fx wx-${show.kind}`} key={show.key} aria-hidden="true"><Layers kind={show.kind} /></div>;
}

// 상단 날짜 줄 아래에 잠깐 뜨는 날씨 카드
export function WeatherCard({ show, weather, city }) {
  if (!show || !weather) return null;
  const k = WEATHER_KINDS[show.kind];
  return (
    <div className="wx-card" key={show.key} role="status">
      <span className="wx-card-icon">{k.icon}</span>
      <div>
        <b>{city} · {k.label}</b>
        <div className="tiny muted">최고/최저 {weather.tmax}° / {weather.tmin}° · 강수 {weather.pop}%</div>
      </div>
    </div>
  );
}
