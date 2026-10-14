// 그날 일정 고치기 · 다른 일정 만들기 (우천시, 마음이 바뀔 때). 저장하면 두 폰에 공유돼요.
// - 코드에 있는 일정(기본 · 우천시 등)을 고치면 settings/planOverrides에 덮어쓰기로 저장 → "원래 일정으로"로 되돌릴 수 있어요.
// - 새로 만든 일정은 settings/customPlans에 저장돼요.
import { useMemo, useState } from 'react';
import { CATEGORIES, CITIES } from '../data/places.js';
import { usePlaces } from '../lib/places.js';
import { deleteCustomPlan, resetOverride, saveCustomPlan, saveOverride } from '../lib/variants.js';
import { useMe } from '../lib/user.js';
import PlaceEditor from './PlaceEditor.jsx';
import { Icon, MiniMarker, Modal, ModalHead } from './ui.jsx';

const toEditable = (stops) => stops.map((s) => ({ place: s.place || null, time: s.time || '', title: s.title || '', note: s.note || '', tag: s.tag === 'confirmed' ? 'confirmed' : 'suggested' }));
const small = { minHeight: 32, fontSize: '0.8rem', padding: '0 8px' };
const stopName = (s) => (s?.title || '').slice(0, 14);

export default function VariantEditor({ day, base, editing, onClose, onSaved }) {
  const me = useMe();
  const { byId, places } = usePlaces();
  const override = editing && !editing.custom; // 코드 일정 고치기
  const [label, setLabel] = useState(editing?.label || (base ? `${base.label} (수정)` : '우천시'));
  const [stops, setStops] = useState(() => toEditable(editing?.stops || base?.stops || []));
  const [picking, setPicking] = useState(null); // 끼워 넣을 위치(index)
  const upd = (i, k, v) => setStops((x) => x.map((y, j) => (j === i ? { ...y, [k]: v } : y)));

  const move = (i, d) => setStops((s) => {
    const n = [...s];
    const j = i + d;
    if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  // 맨 끝이 숙소면 그 앞에 넣기 (하루의 끝은 숙소)
  const tailPos = () => (stops.length && byId[stops[stops.length - 1].place]?.cat === 'stay' ? stops.length - 1 : stops.length);
  const blank = { place: null, time: '', title: '', note: '', tag: 'suggested' };
  const insertAt = (pos, item) => setStops((x) => [...x.slice(0, pos), item, ...x.slice(pos)]);
  const clean = () => stops.filter((s) => s.place || s.title.trim()).map((s) => ({ ...s, title: s.title.trim() || byId[s.place]?.name || '' }));
  const save = () => {
    if (override) {
      saveOverride(day.id, editing.id, { label: editing.id === 'main' ? '' : label.trim(), stops: clean(), by: me.uid });
      return onSaved(editing.id);
    }
    const id = editing?.id || `c-${day.id}-${Date.now().toString(36)}`;
    saveCustomPlan(id, { day: day.id, label: label.trim() || '다른 일정', stops: clean(), by: me.uid, at: editing?.at });
    onSaved(id);
  };
  const title = override ? `${editing.original?.label || editing.label} 고치기` : editing ? '일정 고치기' : '다른 일정 만들기';

  return (
    <Modal onClose={onClose} label="일정 고치기">
      <ModalHead title={title} sub={`${day.title} · ${CITIES[day.city].label}`} onClose={onClose} />
      {!(override && editing.id === 'main') && (
        <>
          <label className="field">
            <span>일정 이름</span>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 우천시, 느긋하게, 쇼핑 위주" maxLength={16} />
          </label>
          {!override && (
            <div className="chips wrap">
              {['우천시', '느긋하게', '쇼핑 위주', '맛집 위주'].map((t) => <button key={t} className={`chip ${label === t ? 'on' : ''}`} onClick={() => setLabel(t)}>{t}</button>)}
            </div>
          )}
        </>
      )}
      {override && <span className="tiny muted" style={{ marginTop: -6 }}>고친 내용은 두 폰에 공유되고, 언제든 원래 일정으로 되돌릴 수 있어요.</span>}

      <div className="field">
        <span>일정 {stops.length}개 · 사이의 + 로 끼워 넣기 · 화살표로 순서 바꾸기</span>
        <div className="card list">
          {stops.length === 0 && <div className="empty" style={{ padding: 16 }}>아래에서 장소나 항목을 추가하세요</div>}
          {stops.map((s, i) => {
            const p = s.place ? byId[s.place] : null;
            return (
              <div key={i}>
              {i > 0 && (
                <div className="insert-row">
                  <button onClick={() => setPicking(i)} aria-label={`${i}번과 ${i + 1}번 사이에 장소 넣기`}><Icon name="plus" size={13} />장소</button>
                  <button onClick={() => insertAt(i, { ...blank })} aria-label={`${i}번과 ${i + 1}번 사이에 항목 넣기`}><Icon name="plus" size={13} />항목</button>
                </div>
              )}
              <div className="item" style={{ gap: 8, padding: '8px 10px', alignItems: 'flex-start' }}>
                <span style={{ paddingTop: 6 }}>
                  {p ? <MiniMarker cat={p.cat} label={i + 1} /> : <span className="mk mini mk-circle" style={{ '--c': '#b8af9e' }}><span className="in"><span>{i + 1}</span></span></span>}
                </span>
                <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <input className="input" style={{ ...small, fontWeight: 600, fontSize: '0.88rem' }} value={s.title} placeholder={p?.name || '할 일 (예: 자유 일정, 체크아웃)'}
                    onChange={(e) => upd(i, 'title', e.target.value)} aria-label="일정 이름" />
                  {p && s.title.trim() && s.title.trim() !== p.name && <span className="tiny muted">📍 {p.name}</span>}
                  {s.place && !p && <span className="tiny" style={{ color: 'var(--danger)' }}>지워진 장소예요 · 지도에 안 보여요</span>}
                  <div className="row" style={{ gap: 6 }}>
                    <input className="input" style={{ ...small, width: 0, flex: 1 }} value={s.time} placeholder="시간 (오전, 13:30)" onChange={(e) => upd(i, 'time', e.target.value)} aria-label="시간" />
                    <button className={`chip ${s.tag === 'confirmed' ? 'on' : ''}`} style={{ '--c': '#2B8A3E', minHeight: 32 }} onClick={() => upd(i, 'tag', s.tag === 'confirmed' ? 'suggested' : 'confirmed')} aria-pressed={s.tag === 'confirmed'}>
                      {s.tag === 'confirmed' ? <><Icon name="check" size={13} />확정</> : '추천'}
                    </button>
                  </div>
                  <input className="input" style={small} value={s.note} placeholder="메모 (선택)" onChange={(e) => upd(i, 'note', e.target.value)} aria-label="메모" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로"><Icon name="up" size={16} /></button>
                  <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => move(i, 1)} disabled={i === stops.length - 1} aria-label="아래로"><Icon name="down" size={16} /></button>
                  <button className="icon-btn" style={{ width: 34, height: 34, color: 'var(--danger)' }} onClick={() => setStops((x) => x.filter((_, j) => j !== i))} aria-label="빼기"><Icon name="x" size={16} /></button>
                </div>
              </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <button className="btn" onClick={() => setPicking(tailPos())}><Icon name="pin" size={16} />장소 추가</button>
          <button className="btn" onClick={() => insertAt(tailPos(), { ...blank })}><Icon name="plus" size={16} />장소 없는 항목</button>
        </div>
      </div>

      <div className="row">
        {editing?.custom && <button className="btn" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('이 일정을 지울까요?')) { deleteCustomPlan(editing.id); onSaved('main'); } }} aria-label="일정 지우기"><Icon name="trash" size={16} /></button>}
        {override && editing.overridden && (
          <button className="btn" onClick={() => { if (confirm('직접 고친 내용을 지우고 원래 일정으로 되돌릴까요?')) { resetOverride(day.id, editing.id); onSaved(editing.id); } }}>
            <Icon name="refresh" size={16} />원래대로
          </button>
        )}
        <button className="btn primary grow" onClick={save} disabled={!clean().length}>저장 · 두 폰에 공유</button>
      </div>
      {picking != null && (
        <PlacePicker city={day.city} places={places} chosen={stops.map((s) => s.place)} onClose={() => setPicking(null)}
          where={picking === 0 ? '맨 앞에 넣어요' : picking >= stops.length ? '맨 끝에 넣어요' : `${picking}번 ${stopName(stops[picking - 1])} 다음에 넣어요`}
          onPick={(p) => { insertAt(picking, { ...blank, place: p.id, title: p.name }); setPicking(picking + 1); }} />
      )}
    </Modal>
  );
}

export function PlacePicker({ city, places, chosen, onPick, onClose, where }) {
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [allCities, setAllCities] = useState(false);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return places
      .filter((p) => (allCities || p.city === city) && (!cat || p.cat === cat) && (!query || `${p.name} ${p.note || ''} ${p.address || ''}`.toLowerCase().includes(query)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [places, q, cat, city, allCities]);
  return (
    <Modal onClose={onClose} label="장소 고르기">
      <ModalHead title="장소 고르기" sub={`${allCities ? '전체 도시' : CITIES[city].label}${where ? ` · ${where}` : ''}`} onClose={onClose} />
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름으로 찾기" aria-label="장소 찾기" />
      <div className="chips">
        <button className={`chip ${!cat ? 'solid' : ''}`} onClick={() => setCat('')}>전체</button>
        {Object.entries(CATEGORIES).map(([id, c]) => <button key={id} className={`chip ${cat === id ? 'on' : ''}`} style={{ '--c': c.color }} onClick={() => setCat(id)}>{c.label}</button>)}
        <button className={`chip ${allCities ? 'on' : ''}`} onClick={() => setAllCities(!allCities)}>다른 도시도</button>
      </div>
      <div className="list">
        {list.map((p) => {
          const n = chosen.filter((x) => x === p.id).length;
          return (
            <button key={p.id} className="item" onClick={() => onPick(p)}>
              <MiniMarker cat={p.cat} />
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                <span className="tiny muted">{CATEGORIES[p.cat]?.label}{p.mine ? ' · 직접 등록' : ''}{p.note ? ` · ${p.note}` : ''}</span>
              </span>
              {n > 0 ? <span className="badge ok">추가됨{n > 1 ? ` ×${n}` : ''}</span> : <Icon name="plus" size={18} />}
            </button>
          );
        })}
        {!list.length && <div className="empty">맞는 장소가 없어요</div>}
      </div>
      <button className="btn" style={{ borderStyle: 'dashed' }} onClick={() => setCreating(true)}><Icon name="plus" size={16} />목록에 없는 장소 새로 등록</button>
      <button className="btn primary" onClick={onClose}>다 골랐어요</button>
      {creating && <PlaceEditor city={city} cat={cat || undefined} onClose={() => setCreating(false)} onSaved={(p) => onPick({ ...p, name: p.name.trim() })} />}
    </Modal>
  );
}
