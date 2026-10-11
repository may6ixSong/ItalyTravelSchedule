// 쇼핑 목록: 이탈리아에서 사 올 기념품 · 마트 물건. 이름(필수) · 사진 · 판매점(선택). 두 폰에 공유돼요.
// 저장 위치: checklist 컬렉션의 group 'buy' 항목(보안 규칙을 바꾸지 않으려고), 직접 찍은 사진은 photos 컬렉션(recordId = 항목 id).
import { useEffect, useState } from 'react';
import { SHOPPING_SEED, STORE_HINTS } from '../data/shoppingSeed.js';
import { add, getOne, patch, put, remove, useCollection, useWhere } from '../lib/store.js';
import { shrinkImage } from '../lib/images.js';
import { findProductImages, pickProductImage } from '../lib/productImages.js';
import { useMe } from '../lib/user.js';
import { useUsers } from '../components/PlaceDetail.jsx';
import { Avatar, Icon, Modal, ModalHead } from '../components/ui.jsx';

const GROUP = 'buy';
const SEED_BY_ID = Object.fromEntries(SHOPPING_SEED.map((s) => [s.id, s]));

let seeding = null;
function seedOnce(rows, uid) {
  seeding ||= (async () => {
    const meta = await getOne('settings', 'meta');
    if (meta?.shoppingSeeded) return;
    const have = new Set(rows.map((r) => r.id));
    const at = Date.now();
    await Promise.all(SHOPPING_SEED.filter((s) => !have.has(s.id)).map((s, i) =>
      put('checklist', s.id, { group: GROUP, title: s.title, store: s.store, note: s.note, imageUrl: '', done: false, order: i, by: uid, at: at + i })));
    await patch('settings', 'meta', { shoppingSeeded: true });
  })().catch((e) => {
    seeding = null;
    console.warn('shopping seed', e);
  });
  return seeding;
}

// 기본 항목에 사진이 아직 없으면 온라인일 때 한 번 찾아서 붙여요 (못 찾으면 하루 뒤 다시)
const triedThisSession = new Set();
async function autoImage(item) {
  const seed = SEED_BY_ID[item.id];
  if (!seed || item.imageUrl || triedThisSession.has(item.id) || !navigator.onLine) return;
  if (item.imageTried && Date.now() - item.imageTried < 24 * 3600 * 1000) return;
  triedThisSession.add(item.id);
  try {
    const best = await pickProductImage(seed);
    patch('checklist', item.id, best ? { imageUrl: best.url, imageCredit: best.source } : { imageTried: Date.now() });
  } catch {
    /* 다음에 다시 */
  }
}

export default function Shopping() {
  const me = useMe();
  const users = useUsers();
  const all = useCollection('checklist');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // {} = 새 항목
  const rows = (all || []).filter((r) => r.group === GROUP).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.at || 0) - (b.at || 0));

  useEffect(() => {
    if (all) seedOnce(all, me.uid);
  }, [all === null]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    rows.forEach(autoImage);
  }, [rows.map((r) => `${r.id}:${r.imageUrl ? 1 : 0}`).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!all) return <div className="empty">불러오는 중…</div>;
  const bought = rows.filter((r) => r.done).length;
  const shown = rows.filter((r) => filter === 'all' || (filter === 'todo' ? !r.done : r.done));
  const toggle = (r) => patch('checklist', r.id, { done: !r.done, doneBy: r.done ? '' : me.uid, doneAt: r.done ? 0 : Date.now() });

  return (
    <div className="page">
      <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row">
          <span className="grow bold">사 올 것 {rows.length}개 중 {bought}개 샀어요</span>
          <span className="small muted">{rows.length ? Math.round((bought / rows.length) * 100) : 0}%</span>
        </div>
        <div className="progress"><i style={{ width: `${rows.length ? (bought / rows.length) * 100 : 0}%` }} /></div>
      </div>
      <div className="chips">
        {[['all', '전체'], ['todo', '아직'], ['done', '샀어요']].map(([id, label]) => (
          <button key={id} className={`chip ${filter === id ? 'solid' : ''}`} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <div className="buy-grid">
        {shown.map((r) => <BuyCard key={r.id} r={r} who={users[r.doneBy]} onToggle={() => toggle(r)} onOpen={() => setEditing(r)} />)}
        <button className="buy-add" onClick={() => setEditing({})}><Icon name="plus" size={26} />사 올 것 추가</button>
      </div>
      {!shown.length && filter !== 'all' && <div className="empty">{filter === 'todo' ? '다 샀어요!' : '아직 산 게 없어요'}</div>}
      {editing && <BuyEditor item={editing.id ? rows.find((x) => x.id === editing.id) || editing : editing} count={rows.length} onClose={() => setEditing(null)} />}
    </div>
  );
}

// 사진: 직접 찍은 사진이 있으면 그걸, 없으면 찾아 둔 제품 사진
function useItemImage(r) {
  const photos = useWhere('photos', 'recordId', r?.id || null);
  const own = photos?.length ? [...photos].sort((a, b) => (b.at || 0) - (a.at || 0))[0] : null;
  return { src: own?.data || r?.imageUrl || '', own };
}

function BuyCard({ r, who, onToggle, onOpen }) {
  const { src } = useItemImage(r);
  const [broken, setBroken] = useState(false);
  return (
    <div className={`buy-card${r.done ? ' done' : ''}`}>
      <button className="buy-img" onClick={onOpen} aria-label={`${r.title} 자세히`}>
        {src && !broken ? <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} /> : <Icon name="shop" size={30} />}
        {r.done && <span className="buy-stamp"><Icon name="check" size={14} stroke={3} />샀어요</span>}
      </button>
      <button className="buy-body" onClick={onOpen}>
        <span className="buy-title">{r.title}</span>
        {r.store && <span className="tiny muted buy-store"><Icon name="pin" size={11} />{r.store}</span>}
      </button>
      <button className={`buy-check${r.done ? ' on' : ''}`} onClick={onToggle} aria-pressed={!!r.done}>
        {r.done ? <>{who ? <Avatar user={who} size={18} /> : <Icon name="check" size={14} />}샀어요</> : <><Icon name="check" size={14} />샀으면 체크</>}
      </button>
    </div>
  );
}

function BuyEditor({ item, count, onClose }) {
  const me = useMe();
  const isNew = !item.id;
  const [id] = useState(() => item.id || `buy-${Date.now().toString(36)}`);
  const [title, setTitle] = useState(item.title || '');
  const [store, setStore] = useState(item.store || '');
  const [note, setNote] = useState(item.note || '');
  const [imageUrl, setImageUrl] = useState(item.imageUrl || '');
  const [credit, setCredit] = useState(item.imageCredit || '');
  const [photo, setPhoto] = useState(null); // 새로 찍은 사진 (data URL)
  const [dropOwn, setDropOwn] = useState(false);
  const [finding, setFinding] = useState(null); // null | 'loading' | [결과]
  const [busy, setBusy] = useState(false);
  const { own } = useItemImage(isNew ? null : item);
  const preview = photo || (!dropOwn && own?.data) || imageUrl;

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setPhoto(await shrinkImage(f, 720, 0.8));
    setBusy(false);
  };
  const search = async () => {
    if (!navigator.onLine) return setFinding([]);
    setFinding('loading');
    const seed = SHOPPING_SEED.find((s) => s.id === id);
    setFinding(await findProductImages(seed?.query || title, { beauty: seed?.beauty }));
  };
  const save = async () => {
    const data = { group: GROUP, title: title.trim(), store: store.trim(), note: note.trim(), imageUrl, imageCredit: imageUrl ? credit : '', by: item.by || me.uid, at: item.at || Date.now() };
    if (isNew) await put('checklist', id, { ...data, done: false, order: count });
    else await patch('checklist', id, data);
    // 직접 찍은 사진은 하나만 남겨요
    if (photo || dropOwn) own && remove('photos', own.id);
    if (photo) await add('photos', { recordId: id, placeId: '', uid: me.uid, data: photo, at: Date.now() });
    onClose();
  };
  const del = () => {
    if (!confirm(`'${item.title}'을(를) 목록에서 지울까요?`)) return;
    own && remove('photos', own.id);
    remove('checklist', id);
    onClose();
  };

  return (
    <Modal onClose={onClose} label="사 올 것">
      <ModalHead title={isNew ? '사 올 것 추가' : '사 올 것'} sub="두 폰에 같이 보여요" onClose={onClose} />
      <label className="field">
        <span>이름 (필수)</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 리몬첼로, 가죽 장갑, 파스타 소스" maxLength={40} />
      </label>

      <div className="field">
        <span>사진 (선택)</span>
        <div className="buy-preview">
          {preview ? <img src={preview} alt="" /> : <span className="muted small">사진 없음</span>}
        </div>
        {credit && !photo && imageUrl && <span className="tiny muted">사진: {credit} (CC BY-SA)</span>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <Icon name="camera" size={16} />{busy ? '줄이는 중…' : '찍기 · 앨범'}
            <input type="file" accept="image/*" hidden onChange={pick} />
          </label>
          <button className="btn" onClick={search} disabled={!title.trim() && !SHOPPING_SEED.some((s) => s.id === id)}><Icon name="search" size={16} />웹에서 찾기</button>
        </div>
        {preview && (
          <button className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => { setPhoto(null); setDropOwn(true); setImageUrl(''); setCredit(''); }}>
            <Icon name="x" size={14} />사진 빼기
          </button>
        )}
        {finding === 'loading' && <span className="small muted">제품 사진 찾는 중…</span>}
        {Array.isArray(finding) && (
          finding.length ? (
            <>
              <span className="tiny muted">눌러서 고르기 · Open Food Facts / Open Beauty Facts 제품 사진</span>
              <div className="buy-results">
                {finding.slice(0, 12).map((p) => (
                  <button key={p.url} className={imageUrl === p.url && !photo ? 'on' : ''} onClick={() => { setImageUrl(p.url); setCredit(p.source); setPhoto(null); setDropOwn(true); }} title={`${p.brand} ${p.name}`}>
                    <img src={p.small} alt={p.name} loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <span className="small muted">{navigator.onLine ? '맞는 제품 사진을 못 찾았어요. 이름을 이탈리아어 · 브랜드로 바꿔 보거나 직접 찍어 주세요.' : '인터넷이 연결되면 찾을 수 있어요.'}</span>
          )
        )}
      </div>

      <div className="field">
        <span>판매점 (선택)</span>
        <input className="input" value={store} onChange={(e) => setStore(e.target.value)} placeholder="예: 피렌체 중앙시장, 약국" />
        <div className="chips wrap">
          {STORE_HINTS.map((h) => <button key={h} className={`chip ${store === h ? 'on' : ''}`} onClick={() => setStore(h)}>{h}</button>)}
        </div>
      </div>
      <label className="field">
        <span>메모 (선택)</span>
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 엄마 선물 2개, 면세 한도 확인" />
      </label>

      <div className="row">
        {!isNew && <button className="btn" style={{ color: 'var(--danger)' }} onClick={del} aria-label="지우기"><Icon name="trash" size={16} /></button>}
        <button className="btn primary grow" onClick={save} disabled={!title.trim() || busy}>저장 · 두 폰에 공유</button>
      </div>
    </Modal>
  );
}
