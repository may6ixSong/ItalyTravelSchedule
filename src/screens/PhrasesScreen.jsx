// 여행 이탈리아어 (한글 발음). 문장을 누르면 직원에게 보여줄 수 있게 크게 띄웁니다.
import { useState } from 'react';
import { BASICS, PHRASE_GROUPS } from '../data/phrases.js';
import { Icon, Modal } from '../components/ui.jsx';

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, ''));
  u.lang = 'it-IT';
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export default function PhrasesScreen() {
  const [group, setGroup] = useState(PHRASE_GROUPS[0].id);
  const [q, setQ] = useState('');
  const [big, setBig] = useState(null);
  const g = PHRASE_GROUPS.find((x) => x.id === group);
  const query = q.trim().toLowerCase();
  const items = query
    ? PHRASE_GROUPS.flatMap((x) => x.items).filter((p) => p.some((t) => t.toLowerCase().includes(query)))
    : g.items;

  return (
    <div className="scroll">
      <div className="top">
        <div className="top-inner">
          <div className="row"><h1 className="grow">여행 이탈리아어</h1><span className="small muted">오프라인</span></div>
          <label className="row input" style={{ gap: 8 }}>
            <Icon name="search" size={18} style={{ color: 'var(--muted)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="한국어나 이탈리아어로 찾기 (예: 화장실)" style={{ border: 0, outline: 'none', background: 'none', flex: 1, minWidth: 0 }} />
          </label>
          {!query && (
            <div className="chips">
              {PHRASE_GROUPS.map((x) => <button key={x.id} className={`chip ${group === x.id ? 'solid' : ''}`} onClick={() => setGroup(x.id)}>{x.label}</button>)}
            </div>
          )}
        </div>
      </div>
      <div className="page">
        {!query && group === PHRASE_GROUPS[0].id && (
          <section className="summary" style={{ background: 'var(--accent)', gap: 8 }}>
            <span className="small bold" style={{ color: '#cfe3f1' }}>가장 많이 쓰는 말</span>
            {BASICS.map(([it, ko, mean]) => (
              <button key={it} onClick={() => setBig([it, ko, mean])} style={{ border: 0, background: 'none', color: 'inherit', padding: 0, textAlign: 'left', display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span lang="it" style={{ fontWeight: 700, fontSize: '1.02rem' }}>{it}</span>
                <span style={{ color: '#ffe2a8', fontWeight: 600, fontSize: '0.9rem' }}>{ko}</span>
                <span style={{ color: '#cfe3f1', fontSize: '0.78rem', marginLeft: 'auto' }}>{mean}</span>
              </button>
            ))}
          </section>
        )}
        {!query && g.tip && <div style={{ background: '#fff6e0', borderRadius: 12, padding: '10px 12px', fontSize: '0.8rem', lineHeight: 1.5, color: '#5c4510' }}>팁 · {g.tip}</div>}
        {items.map((p) => (
          <div key={p[0]} className="phrase">
            <button onClick={() => setBig(p)} style={{ flex: 1, minWidth: 0, border: 0, background: 'none', padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span className="it" lang="it">{p[0]}</span>
              <span className="ko">{p[1]}</span>
              <span className="small muted">{p[2]}</span>
            </button>
            <button className="icon-btn" style={{ alignSelf: 'center' }} onClick={() => speak(p[0])} aria-label="소리 듣기"><Icon name="speaker" size={18} /></button>
          </div>
        ))}
        {query && !items.length && <div className="empty">찾는 문장이 없어요</div>}
      </div>
      {big && (
        <Modal onClose={() => setBig(null)} dark label="크게 보여주기">
          <div className="big-show" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 4px 8px' }}>
            <span className="small bold" style={{ color: '#9cc7e6' }}>직원에게 보여주기</span>
            <span className="it" lang="it">{big[0]}</span>
            <span className="ko">{big[1]}</span>
            <span style={{ color: '#b7c0c8' }}>{big[2]}</span>
          </div>
          <div className="row">
            <button className="btn grow" style={{ background: '#2c343c', color: '#fff', border: 0 }} onClick={() => speak(big[0])}><Icon name="speaker" size={18} />들려주기</button>
            <button className="btn grow" style={{ background: '#2c343c', color: '#fff', border: 0 }} onClick={() => setBig(null)}>닫기</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
