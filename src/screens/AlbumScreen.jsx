// 추억 앨범: 날짜별로 올린 사진을 랜덤 레이아웃(20종)의 앨범 페이지로 보여줘요.
// 사진은 이 폰에만 저장돼서 비행기 안(오프라인)에서도 전체 여행 슬라이드쇼를 볼 수 있어요.
import { useEffect, useMemo, useRef, useState } from 'react';
import { DAYS, dayLabel, todayIso } from '../data/itinerary.js';
import { addPhotos, deletePhoto, movePhoto, photoUrl, useAlbumPhotos } from '../lib/album.js';
import { buildPages, randomSeed, shuffle } from '../lib/albumLayout.js';
import { Icon } from '../components/ui.jsx';

const CITY = {
  rome: ['ROMA', '로마'],
  naples: ['NAPOLI', '나폴리'],
  positano: ['POSITANO', '포지타노'],
  florence: ['FIRENZE', '피렌체'],
  pisa: ['PISA', '피사'],
  tuscany: ['CHIANTI', '끼안띠'],
};
const pct = (v, total) => `${(v / total) * 100}%`;

function dayInfo(day) {
  const n = DAYS.indexOf(day) + 1;
  const { m, dd, wd } = dayLabel(day.date);
  return { n: `D${n}`, short: `${m}.${dd}`, long: `${m}월 ${dd}일 (${wd})`, city: CITY[day.city]?.[0] || '', cityKo: CITY[day.city]?.[1] || '' };
}

function Deco({ deco, info, title }) {
  if (!deco) return null;
  const pos = { left: pct(deco.x, 12), top: pct(deco.y, 16) };
  if (deco.type === 'stamp') {
    return (
      <div className="astamp" style={{ ...pos, width: pct(deco.w, 12), height: pct(deco.h, 16) }}>
        <b>{info.n}</b>
        <span>{info.short} {info.city}</span>
      </div>
    );
  }
  if (deco.type === 'title') {
    return (
      <div className="adeco title" style={pos}>
        <span className="sub">{info.n} · {info.short}</span>
        <span className="big">{info.city}</span>
      </div>
    );
  }
  return (
    <div className="adeco memo" style={pos}>
      <span className="big">{info.n} {info.city}</span>
      <span className="sub">{info.short} · {title}</span>
    </div>
  );
}

// 앨범 한 페이지. 사진이 칸보다 적으면 있는 사진만 그리고, 처음 비는 칸에는 날짜 도장을 찍어요.
export function AlbumPage({ page, day, onOpen }) {
  const { layout, cells } = page;
  const info = dayInfo(day);
  const stampAt = layout.deco?.type === 'stamp' ? -1 : cells.findIndex((c) => !c);
  return (
    <div className={`apage ${layout.theme}`}>
      {layout.theme === 'film' && <><i className="sprocket" style={{ left: 0 }} /><i className="sprocket" style={{ right: 0 }} /></>}
      <Deco deco={layout.deco} info={info} title={day.title} />
      {layout.slots.map(([x, y, w, h, r = 0], i) => {
        const style = { left: pct(x, 12), top: pct(y, 16), width: pct(w, 12), height: pct(h, 16), transform: r ? `rotate(${r}deg)` : undefined };
        const p = cells[i];
        if (!p) {
          return i === stampAt ? (
            <div key={i} className="astamp" style={{ ...style, transform: `rotate(${r - 3}deg) scale(0.8)` }}>
              <b>{info.n}</b>
              <span>{info.short} {info.city}</span>
            </div>
          ) : null;
        }
        return (
          <button key={p.id} type="button" className="aslot" style={style} onClick={onOpen ? () => onOpen(p) : undefined} tabIndex={onOpen ? 0 : -1}>
            <img src={photoUrl(p)} alt="" decoding="async" draggable={false} />
            {layout.theme.includes('polaroid') && <span className="cap">{info.short} {info.cityKo}</span>}
          </button>
        );
      })}
    </div>
  );
}

function defaultDay(photos) {
  const t = todayIso();
  const today = DAYS.find((d) => d.date === t);
  if (today) return today;
  if (t > DAYS[DAYS.length - 1].date) return [...DAYS].reverse().find((d) => photos?.some((p) => p.date === d.date)) || DAYS[0];
  return DAYS[0];
}

export default function AlbumScreen() {
  const photos = useAlbumPhotos();
  const [dayId, setDayId] = useState(null);
  const [seeds, setSeeds] = useState({});
  const [busy, setBusy] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [show, setShow] = useState(false);
  const [usage, setUsage] = useState(null);
  const fileRef = useRef(null);
  const chipsRef = useRef(null);

  const day = DAYS.find((d) => d.id === dayId) || defaultDay(photos);
  const byDate = useMemo(() => {
    const m = {};
    for (const p of photos || []) (m[p.date] ||= []).push(p);
    return m;
  }, [photos]);
  const list = byDate[day.date] || [];
  const seed = seeds[day.date] ?? (seeds[day.date] = randomSeed());
  const pages = useMemo(() => buildPages(list, seed), [list, seed]);
  const info = dayInfo(day);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage(e.usage)).catch(() => {});
  }, [photos]);
  useEffect(() => {
    const el = chipsRef.current?.querySelector('.on');
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [day.id]);

  const upload = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setBusy([0, files.length]);
    const failed = await addPhotos(day.date, files, (a, b) => setBusy([a, b]));
    setBusy(null);
    setSeeds((s) => ({ ...s, [day.date]: randomSeed() }));
    if (failed.length) alert(`${failed.length}장은 저장하지 못했어요. 폰 저장 공간을 확인해 주세요.`);
  };

  return (
    <div className="scroll album-screen">
      <div className="top">
        <div className="top-inner">
          <div className="row">
            <h1 className="grow">추억 앨범</h1>
            <button className="btn small dark" onClick={() => setShow(true)} disabled={!photos?.length}>
              <Icon name="photo" size={16} />전체 슬라이드쇼
            </button>
          </div>
          <div className="chips" ref={chipsRef}>
            {DAYS.map((d, i) => {
              const c = byDate[d.date]?.length || 0;
              return (
                <button key={d.id} className={`chip ${d.id === day.id ? 'on' : ''} ${c ? '' : 'none'}`} onClick={() => setDayId(d.id)}>
                  D{i + 1} <span className="cnt">{c ? `${c}장` : '–'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="page">
        <div className="row album-dayhead">
          <b>{info.n} · {info.long}</b>
          <span className="muted small grow">{day.title}{list.length ? ` · 사진 ${list.length}장` : ''}</span>
        </div>

        {busy && (
          <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="small">사진 저장 중 {busy[0]} / {busy[1]}</span>
            <div className="progress"><i style={{ width: `${(busy[0] / busy[1]) * 100}%` }} /></div>
          </div>
        )}

        {photos === null ? (
          <div className="empty">불러오는 중…</div>
        ) : list.length === 0 ? (
          <div className="album-empty">
            <Icon name="photo" size={44} stroke={1.6} />
            <b>이날 업로드한 사진이 없어요</b>
            <span className="muted small">사진을 올리면 가로·세로를 알아보고<br />어울리는 앨범 페이지로 꾸며 드려요</span>
            <button className="btn dark" onClick={() => fileRef.current?.click()} disabled={!!busy}><Icon name="plus" size={18} />사진 올리기</button>
          </div>
        ) : (
          <>
            {pages.map((pg, i) => (
              <div key={i} className="album-pagewrap">
                <AlbumPage page={pg} day={day} onOpen={setViewing} />
                {pages.length > 1 && <span className="muted tiny">{i + 1} / {pages.length}쪽</span>}
              </div>
            ))}
            <div className="row">
              <button className="btn grow" onClick={() => setSeeds((s) => ({ ...s, [day.date]: randomSeed() }))}><Icon name="refresh" size={18} />다른 레이아웃</button>
              <button className="btn dark grow" onClick={() => fileRef.current?.click()} disabled={!!busy}><Icon name="plus" size={18} />사진 올리기</button>
            </div>
          </>
        )}

        <p className="muted tiny" style={{ textAlign: 'center', margin: '4px 0 0' }}>
          사진은 이 폰에만 저장돼요 (일행과 공유되지 않음 · 오프라인에서도 보임){usage > 1048576 ? ` · 앱 저장 공간 ${Math.round(usage / 1048576)}MB` : ''}
        </p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={upload} />
      </div>

      {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />}
      {show && <Slideshow photos={photos} onClose={() => setShow(false)} />}
    </div>
  );
}

function PhotoViewer({ photo, onClose }) {
  const remove = async () => {
    if (!confirm('이 사진을 앨범에서 지울까요?\n(폰 갤러리의 원본은 그대로 남아요)')) return;
    await deletePhoto(photo.id);
    onClose();
  };
  const move = async (e) => {
    await movePhoto(photo, e.target.value);
    onClose();
  };
  return (
    <div className="pviewer" onClick={onClose}>
      <img src={photoUrl(photo)} alt="" onClick={(e) => e.stopPropagation()} />
      <div className="pviewer-bar" onClick={(e) => e.stopPropagation()}>
        <select className="input" value={photo.date} onChange={move} aria-label="다른 날로 옮기기">
          {DAYS.map((d, i) => {
            const { m, dd } = dayLabel(d.date);
            return <option key={d.id} value={d.date}>D{i + 1} · {m}/{dd} {d.title}</option>;
          })}
        </select>
        <button className="btn alert" onClick={remove}><Icon name="trash" size={18} />삭제</button>
        <button className="btn" onClick={onClose}><Icon name="x" size={18} /></button>
      </div>
    </div>
  );
}

const SLIDE_MS = 5000;

// 여행 전체의 사진을 날짜마다 랜덤 레이아웃 페이지로 만들고, 페이지 순서도 랜덤으로 섞어요.
function makeDeck(photos) {
  const pages = [];
  for (const d of DAYS) {
    const list = photos.filter((p) => p.date === d.date);
    for (const pg of buildPages(list, randomSeed())) pages.push({ ...pg, day: d });
  }
  return shuffle(pages, Math.random);
}

function Slideshow({ photos, onClose }) {
  const [deck, setDeck] = useState(() => makeDeck(photos));
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rootRef = useRef(null);

  const next = () => {
    if (i + 1 >= deck.length) {
      setDeck(makeDeck(photos)); // 한 바퀴 돌면 레이아웃 · 순서를 새로 섞어서 계속
      setI(0);
    } else setI(i + 1);
  };
  const prev = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(t);
  });

  // 재생 중엔 화면이 꺼지지 않게, 가능하면 전체 화면으로
  useEffect(() => {
    let lock = null;
    const get = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    const onVis = () => document.visibilityState === 'visible' && get();
    get();
    document.addEventListener('visibilitychange', onVis);
    rootRef.current?.requestFullscreen?.().catch(() => {});
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.().catch(() => {});
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') setPlaying((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const page = deck[i];
  if (!page) return null;
  const info = dayInfo(page.day);
  const tap = (e) => {
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) prev();
    else if (x > 0.7) next();
    else setPlaying((p) => !p);
  };

  return (
    <div className="slideshow" ref={rootRef}>
      <div className="ss-top">
        <div className="grow">
          <b>{info.n} · {info.long}</b>
          <span className="ss-sub">{page.day.title}</span>
        </div>
        <span className="ss-sub">{i + 1} / {deck.length}</span>
        <button className="ss-btn" onClick={onClose} aria-label="닫기"><Icon name="x" size={22} /></button>
      </div>
      <div className="ss-stage" onClick={tap}>
        <div className="ss-slide" key={`${i}-${page.layout.id}-${page.cells[0]?.id}`}>
          <AlbumPage page={page} day={page.day} />
        </div>
        {!playing && <div className="ss-paused">일시정지 · 가운데를 누르면 다시 재생</div>}
      </div>
      <div className="ss-bottom">
        <button className="ss-btn" onClick={prev} aria-label="이전"><Icon name="back" size={22} /></button>
        <button className="ss-btn wide" onClick={() => setPlaying((p) => !p)}>{playing ? '일시정지' : '재생'}</button>
        <button className="ss-btn" onClick={next} aria-label="다음"><Icon name="next" size={22} /></button>
        <button className="ss-btn wide" onClick={() => { setDeck(makeDeck(photos)); setI(0); }}><Icon name="refresh" size={18} />다시 섞기</button>
      </div>
      {playing && <div className="ss-progress" key={`p${i}`} style={{ animationDuration: `${SLIDE_MS}ms` }} />}
    </div>
  );
}
