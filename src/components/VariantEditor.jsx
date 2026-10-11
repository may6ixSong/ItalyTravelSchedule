// 그날의 다른 일정 만들기 · 고치기 (우천시, 마음이 바뀔 때). 장소를 고르고 순서를 바꿔 저장하면 두 폰에 공유돼요.
import { useMemo, useState } from 'react';
import { CATEGORIES, CITIES } from '../data/places.js';
import { usePlaces } from '../lib/places.js';
import { deleteCustomPlan, saveCustomPlan } from '../lib/variants.js';
import { useMe } from '../lib/user.js';
import { Icon, MiniMarker, Modal, ModalHead } from './ui.jsx';

const toEditable = (stops) => stops.filter((s) => s.place).map((s) => ({ place: s.place, time: s.time || '', title: s.title, note: s.note || '' }));

export default function VariantEditor({ day, base, editing, onClose, onSaved }) {
  const me = useMe();
  const { byId, places } = usePlaces();
  const [label, setLabel] = useState(editing?.label || (base ? `${base.label} (수정)` : '우천시'));
  const [stops, setStops] = useState(() => toEditable(editing?.stops || base?.stops || []));
  const [picking, setPicking] = useState(false);

  const move = (i, d) => setStops((s) => {
    const n = [...s];
    const j = i + d;
    if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const save = () => {
    const id = editing?.id || `c-${day.id}-${Date.now().toString(36)}`;
    saveCustomPlan(id, { day: day.id, label: label.trim() || '다른 일정', stops: stops.map((s) => ({ ...s, tag: 'suggested' })), by: me.uid, at: editing?.at });
    onSaved(id);
  };

  return (
    <Modal onClose={onClose} label="다른 일정">
      <ModalHead title={editing ? '일정 고치기' : '다른 일정 만들기'} sub={`${day.title} · ${CITIES[day.city].label}`} onClose={onClose} />
      <label className="field">
        <span>일정 이름</span>
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 우천시, 느긋하게, 쇼핑 위주" maxLength={16} />
      </label>
      <div className="chips wrap">
        {['우천시', '느긋하게', '쇼핑 위주', '맛집 위주'].map((t) => <button key={t} className={`chip ${label === t ? 'on' : ''}`} onClick={() => setLabel(t)}>{t}</button>)}
      </div>

      <div className="field">
        <span>장소 순서 ({stops.length}곳) · 화살표로 순서 바꾸기</span>
        <div className="card list">
          {stops.length === 0 && <div className="empty" style={{ padding: 16 }}>아래에서 장소를 추가하세요</div>}
          {stops.map((s, i) => {
            const p = byId[s.place];
            if (!p) return null;
            return (
              <div key={`${s.place}-${i}`} className="item" style={{ gap: 8, padding: '8px 10px' }}>
                <MiniMarker cat={p.cat} label={i + 1} />
                <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                  <input className="input" style={{ minHeight: 32, fontSize: '0.8rem', padding: '0 8px' }} value={s.time} placeholder="시간 (예: 오전, 13:30)"
                    onChange={(e) => setStops((x) => x.map((y, j) => (j === i ? { ...y, time: e.target.value } : y)))} aria-label={`${p.name} 시간`} />
                </div>
                <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로"><Icon name="up" size={16} /></button>
                <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => move(i, 1)} disabled={i === stops.length - 1} aria-label="아래로"><Icon name="down" size={16} /></button>
                <button className="icon-btn" style={{ width: 34, height: 34, color: 'var(--danger)' }} onClick={() => setStops((x) => x.filter((_, j) => j !== i))} aria-label="빼기"><Icon name="x" size={16} /></button>
              </div>
            );
          })}
        </div>
        <button className="btn" onClick={() => setPicking(true)}><Icon name="plus" size={16} />장소 추가</button>
      </div>

      <div className="row">
        {editing && <button className="btn" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('이 일정을 지울까요?')) { deleteCustomPlan(editing.id); onSaved('main'); } }}><Icon name="trash" size={16} /></button>}
        <button className="btn primary grow" onClick={save} disabled={!stops.length}>저장 · 두 폰에 공유</button>
      </div>
      {picking && <PlacePicker city={day.city} places={places} chosen={stops.map((s) => s.place)} onClose={() => setPicking(false)}
        onPick={(p) => setStops((x) => [...x, { place: p.id, time: '', title: p.name, note: '' }])} />}
    </Modal>
  );
}

function PlacePicker({ city, places, chosen, onPick, onClose }) {
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
      <ModalHead title="장소 고르기" sub={allCities ? '전체 도시' : CITIES[city].label} onClose={onClose} />
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
                <span className="tiny muted">{CATEGORIES[p.cat].label}{p.note ? ` · ${p.note}` : ''}</span>
              </span>
              {n > 0 ? <span className="badge ok">추가됨{n > 1 ? ` ×${n}` : ''}</span> : <Icon name="plus" size={18} />}
            </button>
          );
        })}
        {!list.length && <div className="empty">맞는 장소가 없어요</div>}
      </div>
      <button className="btn primary" onClick={onClose}>다 골랐어요</button>
    </Modal>
  );
}
