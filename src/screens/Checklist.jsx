// 준비 체크리스트: 그룹 4개 고정, 항목은 두 사람 모두 추가 · 수정 · 삭제. 항목을 누르면 슬라이드가 열리고 링크가 있으면 바로 열 수 있어요.
import { useEffect, useState } from 'react';
import { CHECK_GROUPS, checklistSeed } from '../data/checklistSeed.js';
import { dayLabel, todayIso } from '../data/itinerary.js';
import { TRIP } from '../config.js';
import { add, getOne, patch, put, remove, useCollection } from '../lib/store.js';
import { useMe } from '../lib/user.js';
import { useUsers } from '../components/PlaceDetail.jsx';
import { Avatar, Icon, Modal, ModalHead } from '../components/ui.jsx';

const GROUP_ICON = { pack: 'suitcase', stay: 'stay', move: 'train', food: 'meal' };
const GROUP_TINT = { pack: ['#EEE9FC', '#6741D9'], stay: ['#E4E7EA', '#212B33'], move: ['#DDE8F0', '#1F5F8B'], food: ['#F6DCCF', '#D9480F'] };
const LINK_KINDS = [['web', '예약 확인 페이지'], ['app', '예약 앱 링크'], ['map', '구글맵 위치']];

let seeding = null;
async function seedOnce() {
  seeding ||= (async () => {
    const meta = await getOne('settings', 'meta');
    if (meta?.checklistSeeded) return;
    await Promise.all(checklistSeed().map(({ id, ...it }) => put('checklist', id, it)));
    await patch('settings', 'meta', { checklistSeeded: true });
  })();
  return seeding;
}

export default function Checklist() {
  const rows = useCollection('checklist');
  const users = useUsers();
  const [openGroup, setOpenGroup] = useState('pack');
  const [item, setItem] = useState(null);
  useEffect(() => {
    if (rows && rows.length === 0) seedOnce();
  }, [rows]);
  if (!rows) return <div className="empty">불러오는 중…</div>;

  const done = rows.filter((r) => r.done).length;
  const dday = Math.ceil((new Date(TRIP.start + 'T00:00:00') - new Date(todayIso() + 'T00:00:00')) / 86400000);
  const sorted = (g) => rows.filter((r) => r.group === g).sort((a, b) => (a.date || '9').localeCompare(b.date || '9') || (a.order ?? 999) - (b.order ?? 999));

  return (
    <div className="page">
      <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row">
          {dday > 0 && <span className="badge alert">출국 D-{dday}</span>}
          {dday <= 0 && <span className="badge ok">여행 중</span>}
          <span className="grow bold">{rows.length}개 중 {done}개 완료</span>
          <span className="small muted">{rows.length ? Math.round((done / rows.length) * 100) : 0}%</span>
        </div>
        <div className="progress"><i style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} /></div>
      </div>

      {CHECK_GROUPS.map((g) => {
        const list = sorted(g.id);
        const gd = list.filter((r) => r.done).length;
        const isOpen = openGroup === g.id;
        const [bg, fg] = GROUP_TINT[g.id];
        return (
          <section key={g.id} className="card" style={{ overflow: 'hidden' }}>
            <button className="item" onClick={() => setOpenGroup(isOpen ? null : g.id)} aria-expanded={isOpen}>
              <span className="theme-ic" style={{ background: bg, color: fg }}><Icon name={GROUP_ICON[g.id]} size={18} /></span>
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 700 }}>{g.label}</span>
                <span className="tiny muted">{list.length ? `${list.length}개 중 ${gd}개` : '아직 없음'}{g.id === 'pack' && list.some((r) => r.recommended) ? ' · 추천 포함' : ''}</span>
              </span>
              {list.length > 0 && <span className="progress" style={{ width: 60 }}><i style={{ width: `${(gd / list.length) * 100}%` }} /></span>}
              <Icon name={isOpen ? 'up' : 'down'} size={18} style={{ color: 'var(--muted)' }} />
            </button>
            {isOpen && (
              <div className="list" style={{ borderTop: '1px solid var(--line-2)' }}>
                {list.map((r) => <Row key={r.id} r={r} user={users[r.doneBy]} onOpen={() => setItem(r)} />)}
                <AddRow group={g.id} />
              </div>
            )}
          </section>
        );
      })}
      {item && <ItemSheet item={rows.find((r) => r.id === item.id) || item} onClose={() => setItem(null)} />}
    </div>
  );
}

function Row({ r, user, onOpen }) {
  const me = useMe();
  const toggle = () => patch('checklist', r.id, r.done ? { done: false, doneBy: '', doneAt: 0 } : { done: true, doneBy: me.uid, doneAt: Date.now() });
  return (
    <div className="item" style={{ padding: '6px 12px', minHeight: 48 }}>
      <button className={`check ${r.done ? 'on' : ''}`} onClick={toggle} aria-label={r.done ? '체크 해제' : '체크'} aria-pressed={r.done}>
        {r.done && <Icon name="check" size={15} stroke={3} />}
      </button>
      <button onClick={onOpen} style={{ flex: 1, minWidth: 0, border: 0, background: 'none', textAlign: 'left', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        {r.date && <span className="small bold muted" style={{ width: 40, flexShrink: 0 }}>{dayLabel(r.date).md}</span>}
        {!r.date && r.group === 'move' && <span className="small bold" style={{ width: 40, flexShrink: 0, color: 'var(--warn)' }}>미정</span>}
        <span className="grow" style={{ textDecoration: r.done ? 'line-through' : 'none', color: r.done ? '#8c8578' : 'var(--ink)', fontSize: '0.92rem' }}>{r.title}</span>
        {r.recommended && <span className="badge rec">추천</span>}
        {r.link && <Icon name="link" size={15} style={{ color: 'var(--accent)' }} />}
        {r.done && user && <Avatar user={user} size={20} />}
      </button>
    </div>
  );
}

function AddRow({ group }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const save = () => {
    if (!title.trim()) return;
    add('checklist', { group, title: title.trim(), date, done: false, link: '', memo: '', order: Date.now() });
    setTitle('');
    setDate('');
  };
  return (
    <div style={{ padding: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <input className="input" style={{ flex: '1 1 160px', minHeight: 40 }} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="+ 항목 추가" aria-label="새 항목" />
      {group !== 'pack' && <input className="input" type="date" style={{ flex: '0 1 150px', minHeight: 40 }} value={date} min="2026-10-01" max="2026-11-30" onChange={(e) => setDate(e.target.value)} aria-label="날짜" />}
      <button className="btn primary small" style={{ minHeight: 40 }} onClick={save} disabled={!title.trim()}>추가</button>
    </div>
  );
}

function ItemSheet({ item, onClose }) {
  const me = useMe();
  const users = useUsers();
  const [title, setTitle] = useState(item.title);
  const [date, setDate] = useState(item.date || '');
  const [memo, setMemo] = useState(item.memo || '');
  const [link, setLink] = useState(item.link || '');
  const [kind, setKind] = useState(item.linkKind || 'web');
  const [editing, setEditing] = useState(false);
  const group = CHECK_GROUPS.find((g) => g.id === item.group);
  const dirty = title !== item.title || date !== (item.date || '') || memo !== (item.memo || '') || link !== (item.link || '') || kind !== (item.linkKind || 'web');
  const save = () => {
    const url = link.trim() && !/^[a-z][\w+.-]*:/i.test(link.trim()) ? `https://${link.trim()}` : link.trim();
    patch('checklist', item.id, { title: title.trim() || item.title, date, memo, link: url, linkKind: kind });
    setLink(url);
    setEditing(false);
  };
  const close = () => {
    if (dirty) save();
    onClose();
  };
  return (
    <Modal onClose={close} label={item.title}>
      <ModalHead title={editing ? '항목 수정' : item.title} sub={`${group?.label}${item.date ? ` · ${dayLabel(item.date).md} (${dayLabel(item.date).wd})` : ''}`} onClose={close}>
        <button className="icon-btn" style={{ width: 40, height: 40, borderRadius: 20 }} onClick={() => setEditing(!editing)} aria-label="이름 · 날짜 수정"><Icon name="edit" size={18} /></button>
      </ModalHead>
      {editing && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: '1 1 180px' }} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="이름" />
          <input className="input" type="date" style={{ flex: '0 1 160px' }} value={date} onChange={(e) => setDate(e.target.value)} aria-label="날짜" />
        </div>
      )}
      <button className="card item" onClick={() => patch('checklist', item.id, item.done ? { done: false, doneBy: '', doneAt: 0 } : { done: true, doneBy: me.uid, doneAt: Date.now() })}>
        <span className={`check ${item.done ? 'on' : ''}`}>{item.done && <Icon name="check" size={15} stroke={3} />}</span>
        <span className="grow bold">준비 완료</span>
        {item.done && users[item.doneBy] && <span className="small muted row" style={{ gap: 6 }}><Avatar user={users[item.doneBy]} size={20} />{users[item.doneBy].name}</span>}
      </button>

      <div className="field">
        <span>바로가기 링크</span>
        <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="chips wrap">
            {LINK_KINDS.map(([id, label]) => <button key={id} className={`chip ${kind === id ? 'on' : ''}`} style={{ '--c': 'var(--accent)' }} onClick={() => setKind(id)}>{label}</button>)}
          </div>
          <input className="input" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={kind === 'map' ? '구글맵 공유 링크 붙여넣기' : 'https://… 붙여넣기'} aria-label="링크 주소" />
          {link !== (item.link || '') && <button className="btn dark" onClick={save}>링크 저장</button>}
        </div>
        <a className="btn primary block" href={item.link || undefined} target="_blank" rel="noreferrer" aria-disabled={!item.link}
          style={!item.link ? { pointerEvents: 'none', opacity: 0.45 } : undefined}>
          <Icon name="open" size={18} />앱에서 열기
        </a>
        <span className="tiny muted" style={{ textAlign: 'center' }}>
          {item.link ? '예약 사이트가 열려요. 해당 앱이 설치돼 있으면 앱으로 열려요.' : '링크를 저장하면 이 버튼으로 해당 앱 · 사이트가 바로 열려요'}
        </span>
      </div>

      <label className="field">
        <span>메모</span>
        <textarea className="input" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예약번호, 좌석, 출발역 등" />
      </label>
      <div className="row">
        <span className="grow tiny muted">수정 내용은 동행 폰에도 보여요</span>
        <button className="btn small" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('이 항목을 지울까요?')) { remove('checklist', item.id); onClose(); } }}>
          <Icon name="trash" size={14} />삭제
        </button>
        {dirty && <button className="btn small primary" onClick={save}>저장</button>}
      </div>
    </Modal>
  );
}
