// 장소 직접 등록 · 고치기. 이름 · 분류 · 도시 · 구글맵 링크 · 메모를 넣으면 두 폰에 공유돼요(settings/userPlaces).
// 위치는 구글맵 링크에서 읽거나, 지도에서 직접 찍거나, 지금 내 위치로 정해요.
import { useMemo, useState } from 'react';
import { CATEGORIES, CITIES, PLACE_BY_ID } from '../data/places.js';
import { newPlaceId, parseMapsLink, resetPlace, savePlace, setPlaceHidden, usePlaces, useUserPlaces } from '../lib/places.js';
import { saveNote, useNotes } from '../lib/notes.js';
import { distanceKm, formatKm } from '../lib/geo.js';
import { useMe } from '../lib/user.js';
import MapView from './MapView.jsx';
import { Icon, MiniMarker, Modal, ModalHead } from './ui.jsx';

export default function PlaceEditor({ place, city, cat, onClose, onSaved }) {
  const me = useMe();
  const { places } = usePlaces();
  const user = useUserPlaces();
  const memo = useNotes()[place?.id];
  const isCode = !!(place && PLACE_BY_ID[place.id]);
  const [f, setF] = useState(() => ({
    name: place?.name || '',
    cat: place?.cat || cat || 'meal',
    city: place?.city || city || 'rome',
    gmaps: place?.gmaps || '',
    placeId: place?.placeId || '',
    address: place?.address || '',
    hours: place?.hours || '',
    note: place?.note || '',
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
  }));
  const [memoText, setMemoText] = useState(memo?.text || '');
  const [picking, setPicking] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const hasPos = f.lat != null && f.lng != null;

  const onLink = (v) => {
    const r = parseMapsLink(v);
    setF((x) => ({
      ...x,
      gmaps: v,
      ...(r.lat != null ? { lat: r.lat, lng: r.lng } : {}),
      ...(r.name && !x.name.trim() ? { name: r.name } : {}),
      ...(r.placeId ? { placeId: r.placeId } : {}),
    }));
    if (!v.trim()) setMsg('');
    else if (r.lat != null) setMsg('링크에서 위치를 찾았어요');
    else if (r.short) setMsg('짧은 링크라 위치를 못 읽었어요. 아래에서 지도에 직접 찍어 주세요 (링크는 "구글맵에서 보기"로 저장돼요)');
    else setMsg('링크에서 위치를 못 찾았어요. 지도에서 직접 찍어 주세요');
  };

  const useGps = () => {
    if (!navigator.geolocation) return setMsg('이 기기는 위치를 지원하지 않아요');
    setMsg('위치 찾는 중…');
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude })); setMsg('지금 내 위치로 정했어요'); },
      () => setMsg('위치 권한을 허용해 주세요'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // 가장 가까운 도시를 자동으로 골라줘요 (직접 바꿀 수 있어요)
  const nearestCity = (pt) => {
    let best = null;
    for (const p of places) {
      const d = distanceKm(pt, p);
      if (!best || d < best.d) best = { d, city: p.city };
    }
    return best && best.d < 40 ? best.city : null;
  };

  const save = () => {
    const id = place?.id || newPlaceId();
    savePlace(id, { ...f, name: f.name.trim(), hidden: user[id]?.hidden }, me.uid);
    if ((memo?.text || '') !== memoText.trim()) saveNote(id, memoText, me.uid);
    onSaved?.({ id, ...f });
    onClose();
  };

  const hide = () => {
    setPlaceHidden(place.id, !place.hidden, user[place.id], me.uid);
    onClose();
  };

  return (
    <Modal onClose={onClose} label="장소 등록">
      <ModalHead title={place ? '장소 정보 고치기' : '새 장소 등록'} sub={place ? place.name : '두 폰에 같이 보여요'} onClose={onClose} />

      <label className="field">
        <span>구글맵 링크 (선택) · 공유하기 → 링크 복사</span>
        <input className="input" value={f.gmaps} onChange={(e) => onLink(e.target.value)} placeholder="https://maps.google.com/… 또는 41.90, 12.49" inputMode="url" />
        {msg && <span className="tiny" style={{ color: 'var(--ink-2)' }}>{msg}</span>}
      </label>

      <label className="field">
        <span>장소 이름 (필수)</span>
        <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="예: Da Enzo al 29" maxLength={60} />
      </label>

      <div className="field">
        <span>분류</span>
        <div className="chips wrap">
          {Object.entries(CATEGORIES).map(([id, c]) => (
            <button key={id} className={`chip ${f.cat === id ? 'on' : ''}`} style={{ '--c': c.color }} onClick={() => set('cat', id)}>
              <MiniMarker cat={id} label="" className="legend-dot" />{c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>도시</span>
        <div className="chips wrap">
          {Object.entries(CITIES).map(([id, c]) => (
            <button key={id} className={`chip ${f.city === id ? 'solid' : ''}`} style={{ '--c': c.color }} onClick={() => set('city', id)}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>위치 (필수)</span>
        <div className="row" style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 12px', gap: 8 }}>
          <Icon name="pin" size={18} style={{ color: hasPos ? 'var(--accent)' : 'var(--muted)' }} />
          <span className="grow small">{hasPos ? `${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}` : '아직 안 정했어요'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <button className="btn" onClick={() => setPicking(true)}><Icon name="map" size={16} />지도에서 찍기</button>
          <button className="btn" onClick={useGps}><Icon name="locate" size={16} />지금 내 위치</button>
        </div>
      </div>

      <label className="field">
        <span>한 줄 소개 (목록에 보여요)</span>
        <input className="input" value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="예: 까르보나라 맛집, 예약 필수" maxLength={80} />
      </label>
      <label className="field">
        <span>우리 메모 (선택 · 지도에 노란 점)</span>
        <textarea className="input" rows={2} value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="예: 다비드 진품 대신 여기 복제품 보기" />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <label className="field">
          <span>주소</span>
          <input className="input" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Via …" />
        </label>
        <label className="field">
          <span>영업시간</span>
          <input className="input" value={f.hours} onChange={(e) => set('hours', e.target.value)} placeholder="예: 12:00–23:00, 월 휴무" />
        </label>
      </div>

      <button className="btn primary block" disabled={!f.name.trim() || !hasPos} onClick={save}>{place ? '저장 · 두 폰에 공유' : '등록 · 두 폰에 공유'}</button>
      {place && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn small ghost" onClick={hide}><Icon name={place.hidden ? 'check' : 'x'} size={14} />{place.hidden ? '다시 보이기' : '목록에서 숨기기'}</button>
          <span className="grow" />
          {isCode && user[place.id] && (
            <button className="btn small ghost" onClick={() => { if (confirm('직접 고친 내용을 지우고 원래 정보로 되돌릴까요?')) { resetPlace(place.id); onClose(); } }}>
              <Icon name="refresh" size={14} />원래 정보로
            </button>
          )}
          {!isCode && (
            <button className="btn small ghost" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('이 장소를 지울까요? 일정에 들어 있으면 일정에서도 안 보여요.')) { resetPlace(place.id); onClose(); } }}>
              <Icon name="trash" size={14} />장소 지우기
            </button>
          )}
        </div>
      )}

      {picking && (
        <PointPicker start={hasPos ? { lat: f.lat, lng: f.lng } : null} city={f.city} cat={f.cat} name={f.name} places={places} onClose={() => setPicking(false)}
          onPick={(pt) => {
            const c = nearestCity(pt);
            setF((x) => ({ ...x, ...pt, ...(c && !place ? { city: c } : {}) }));
            setMsg('지도에서 찍은 위치로 정했어요');
            setPicking(false);
          }} />
      )}
    </Modal>
  );
}

// 지도를 탭해서 위치 고르기. 주변 장소도 같이 보여서 어디쯤인지 알 수 있어요.
function PointPicker({ start, city, cat, name, places, onPick, onClose }) {
  const [pt, setPt] = useState(start);
  const cityPlaces = useMemo(() => places.filter((p) => p.city === city), [places, city]);
  const markers = useMemo(() => {
    const around = (pt ? places.filter((p) => distanceKm(pt, p) < 3) : cityPlaces).slice(0, 60)
      .map((p) => ({ id: p.id, title: p.name, lat: p.lat, lng: p.lng, cat: p.cat, kind: 'cand', noFit: !!pt }));
    return pt ? [...around, { id: 'pick', title: name || '여기', lat: pt.lat, lng: pt.lng, cat, label: '★', caption: name || '여기', kind: 'big sel' }] : around;
  }, [pt, places, cityPlaces, cat, name]);
  return (
    <Modal onClose={onClose} label="지도에서 위치 찍기">
      <ModalHead title="지도에서 위치 찍기" sub="장소가 있는 곳을 탭하세요 · 두 손가락으로 확대" onClose={onClose} />
      <div className="pick-map">
        <MapView markers={markers} fitKey="pick" padding={{ top: 40, bottom: 40, left: 40, right: 40 }} onMapClick={setPt} onMarker={(m) => m.id !== 'pick' && setPt({ lat: m.lat, lng: m.lng })} />
      </div>
      {pt && start && <span className="tiny muted">원래 위치에서 {formatKm(distanceKm(start, pt))}</span>}
      <button className="btn primary block" disabled={!pt} onClick={() => onPick(pt)}>이 위치로 정하기</button>
    </Modal>
  );
}
