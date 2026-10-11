// 장소 상세: 기본 정보 · 길찾기 · 미리 받아둔 구글 사진/리뷰 · 우리 기록(평점 · 노트 · 사진, 여러 번 가능)
import { useState } from 'react';
import { BASE } from '../config.js';
import { CATEGORIES, CITIES } from '../data/places.js';
import { directionsUrl, distanceKm, formatKm, placeUrl, walkMinutes } from '../lib/geo.js';
import { shrinkImage } from '../lib/images.js';
import { add, remove, useCollection, useWhere } from '../lib/store.js';
import { useMe } from '../lib/user.js';
import { saveNote, useNotes } from '../lib/notes.js';
import { Avatar, Icon, MiniMarker, Modal, ModalHead, Stars } from './ui.jsx';

export function useUsers() {
  const me = useMe();
  const rows = useCollection('users') || [];
  const map = Object.fromEntries(rows.map((u) => [u.id, { uid: u.id, ...u }]));
  if (me && !map[me.uid]) map[me.uid] = me;
  return map;
}

export default function PlaceDetail({ place, stop, gps, onMeasureFrom, onPlan, inPlan, onClose }) {
  const [writing, setWriting] = useState(false);
  const [showPhoto, setShowPhoto] = useState(null);
  const records = useWhere('records', 'placeId', place.id) || [];
  const users = useUsers();
  const cat = CATEGORIES[place.cat];
  const dist = gps ? distanceKm(gps, place) : null;
  const ours = records.filter((r) => r.rating);
  const avg = ours.length ? ours.reduce((s, r) => s + r.rating, 0) / ours.length : null;
  const gPhotos = (place.photos || []).map((p) => (p.startsWith('http') ? p : `${BASE}${p}`));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="small muted row" style={{ gap: 6 }}>
            <MiniMarker cat={place.cat} label={stop?.n} />
            {cat.label} · {CITIES[place.city]?.label}
            {stop && ` · ${stop.time || stop.day}`}
            {stop?.tag === 'confirmed' && <span className="badge ok">확정</span>}
          </span>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.3 }}>{place.name}</span>
          {(place.rating || avg) && (
            <span className="small" style={{ color: 'var(--ink-2)' }}>
              {place.rating && <>구글 ★ {place.rating} </>}
              {avg && <> · 우리 ★ {avg.toFixed(1)} ({ours.length})</>}
            </span>
          )}
        </div>
        {onClose && (
          <button className="icon-btn" style={{ width: 40, height: 40, borderRadius: 20 }} onClick={onClose} aria-label="닫기">
            <Icon name="x" size={16} stroke={2.4} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
        <a className="btn primary" href={directionsUrl(place)} target="_blank" rel="noreferrer">
          <Icon name="locate" size={18} /> 길찾기
        </a>
        <button className="btn" onClick={() => setWriting(true)} style={{ flexDirection: 'column', gap: 0, fontSize: '0.75rem' }}>
          <Icon name="star" size={16} /> 기록
        </button>
        <button className="btn" onClick={() => onMeasureFrom?.(place)} style={{ flexDirection: 'column', gap: 0, fontSize: '0.75rem' }}>
          <Icon name="ruler" size={16} /> 거리
        </button>
      </div>
      {onPlan && (
        <button className={`btn ${inPlan ? '' : 'dark'}`} onClick={() => onPlan(place)}>
          {inPlan ? '임시 동선에서 빼기' : '+ 오늘 임시 동선에 추가'}
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: '0.9rem' }}>
        {place.hours && <Info icon="clock">{place.hours}</Info>}
        {(place.address || dist != null) && (
          <Info icon="pin">
            {place.address}
            {dist != null && <span className="muted"> · 내 위치에서 {formatKm(dist)} (도보 약 {walkMinutes(dist)}분)</span>}
          </Info>
        )}
        {(place.note || stop?.note) && <Info icon="note">{[stop?.note && !place.note?.includes(stop.note) ? stop.note : '', place.note].filter(Boolean).join(' · ')}</Info>}
        <a className="small" href={placeUrl(place)} target="_blank" rel="noreferrer">구글맵에서 장소 보기 (온라인)</a>
      </div>

      {gPhotos.length > 0 && (
        <div className="photos">
          {gPhotos.map((src) => (
            <img key={src} src={src} alt="" loading="lazy" onClick={() => setShowPhoto(src)} />
          ))}
        </div>
      )}
      {gPhotos.length > 0 && place.photoCredits?.length > 0 && <span className="tiny muted" style={{ marginTop: -8 }}>사진: {place.photoCredits.join(', ')} · Google 지도</span>}

      {place.reviews?.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line-2)', paddingTop: 12 }}>
          <div className="row">
            <b className="grow">구글 리뷰</b>
            <span className="badge ok"><Icon name="cloud" size={12} />오프라인 저장됨</span>
          </div>
          {place.reviews.map((r, i) => (
            <div key={i} style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="row small"><b className="grow">{r.author}</b><Stars value={r.rating || 0} /></div>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--ink-2)' }}>{r.text}</p>
              {r.when && <span className="tiny muted">{r.when}</span>}
            </div>
          ))}
        </section>
      )}

      <PlaceNote place={place} users={users} />

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--line-2)', paddingTop: 12 }}>
        <div className="row">
          <b className="grow">우리 기록 {records.length > 0 && <span className="muted">{records.length}</span>}</b>
          <button className="btn small" onClick={() => setWriting(true)}><Icon name="plus" size={14} />기록 남기기</button>
        </div>
        {records.length === 0 && <div className="small muted">아직 기록이 없어요. 다녀와서 평점 · 노트 · 사진을 남겨보세요.</div>}
        {[...records].sort((a, b) => (b.at || 0) - (a.at || 0)).map((r) => (
          <Record key={r.id} r={r} user={users[r.uid]} onPhoto={setShowPhoto} />
        ))}
      </section>

      {writing && <RecordEditor place={place} onClose={() => setWriting(false)} />}
      {showPhoto && (
        <Modal onClose={() => setShowPhoto(null)} label="사진" dark>
          <img src={showPhoto} alt="" style={{ width: '100%', borderRadius: 12 }} />
        </Modal>
      )}
    </div>
  );
}

function PlaceNote({ place, users }) {
  const me = useMe();
  const note = useNotes()[place.id];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const start = () => {
    setText(note?.text || '');
    setEditing(true);
  };
  const save = () => {
    saveNote(place.id, text, me.uid);
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="note-box" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <b className="small">우리 메모 · 두 사람이 같이 봐요</b>
        <textarea className="input" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)}
          placeholder="예: 다비드 진품 대신 여기 복제품 보기" aria-label="장소 메모" />
        <div className="row">
          {note && <button className="btn small ghost" style={{ color: 'var(--danger)' }} onClick={() => { saveNote(place.id, '', me.uid); setEditing(false); }}>메모 지우기</button>}
          <span className="grow" />
          <button className="btn small" onClick={() => setEditing(false)}>취소</button>
          <button className="btn small primary" onClick={save} disabled={!text.trim()}>저장</button>
        </div>
      </div>
    );
  }
  if (!note) {
    return (
      <button className="btn small ghost" style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }} onClick={start}>
        <Icon name="edit" size={14} />이 장소에 메모 쓰기
      </button>
    );
  }
  const who = users[note.by];
  return (
    <button className="note-box" onClick={start} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }} aria-label="메모 고치기">
      <span className="row small bold" style={{ gap: 6 }}><span className="note-dot" aria-hidden="true" />우리 메모<span className="grow" /><Icon name="edit" size={14} /></span>
      <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: '0.92rem' }}>{note.text}</span>
      <span className="tiny muted">{who?.name || ''} · {new Date(note.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    </button>
  );
}

function Info({ icon, children }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <Icon name={icon} size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

function Record({ r, user, onPhoto }) {
  const me = useMe();
  const photos = useWhere('photos', 'recordId', r.id) || [];
  return (
    <article className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row">
        <Avatar user={user} size={32} />
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name || '알 수 없음'}</div>
          <div className="tiny muted">{new Date(r.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        {r.rating > 0 && <Stars value={r.rating} />}
      </div>
      {r.note && <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.note}</p>}
      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((p) => (
            <img key={p.id} src={p.data} alt="" onClick={() => onPhoto(p.data)} />
          ))}
        </div>
      )}
      {me?.uid === r.uid && (
        <button className="btn small ghost" style={{ alignSelf: 'flex-end', color: 'var(--danger)' }}
          onClick={() => { if (confirm('이 기록을 지울까요?')) { photos.forEach((p) => remove('photos', p.id)); remove('records', r.id); } }}>
          삭제
        </button>
      )}
    </article>
  );
}

export function RecordEditor({ place, onClose }) {
  const me = useMe();
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    setBusy(true);
    const out = [];
    for (const f of files) out.push(await shrinkImage(f));
    setPhotos((p) => [...p, ...out]);
    setBusy(false);
  };

  const save = async () => {
    const id = await add('records', { placeId: place.id, uid: me.uid, rating, note: note.trim(), at: Date.now() });
    for (const data of photos) await add('photos', { recordId: id, placeId: place.id, uid: me.uid, data, at: Date.now() });
    onClose();
  };

  return (
    <Modal onClose={onClose} label="기록 남기기">
      <ModalHead title="기록 남기기" sub={place.name} onClose={onClose} />
      <div className="row" style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '8px 12px' }}>
        <Avatar user={me} size={26} />
        <span className="small">{me.name} 으로 작성 · 몇 번이든 추가할 수 있어요</span>
      </div>
      <div className="field" style={{ alignItems: 'center' }}>
        <span>이번 방문은 어땠나요?</span>
        <div className="star-pick" role="radiogroup" aria-label="평점">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n}점`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n === rating ? 0 : n)}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>노트</span>
        <textarea className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="맛, 분위기, 다음에 시킬 메뉴…" />
      </label>
      <div className="field">
        <span>사진 · 여러 장 가능</span>
        <div className="thumbs">
          {photos.map((p, i) => (
            <img key={i} src={p} alt="" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))} />
          ))}
          <label className="add">
            <Icon name="camera" size={22} />
            {busy ? '줄이는 중…' : '촬영 · 앨범'}
            <input type="file" accept="image/*" multiple hidden onChange={pick} />
          </label>
        </div>
        <span className="tiny muted">사진을 누르면 빠져요. 오프라인이면 폰에 저장했다가 연결되면 올라가요.</span>
      </div>
      <button className="btn primary block" disabled={busy || (!rating && !note.trim() && !photos.length)} onClick={save}>저장</button>
    </Modal>
  );
}
