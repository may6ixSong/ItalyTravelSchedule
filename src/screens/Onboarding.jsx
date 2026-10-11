// 최초 접속: 입장 코드 4자리 → 이름(필수) · 사진(선택). 이후에는 이 폰에 저장돼서 다시 묻지 않습니다.
import { useState } from 'react';
import { CITIES } from '../data/places.js';
import { JOIN_CODE } from '../config.js';
import { shrinkImage } from '../lib/images.js';
import { COLORS, register } from '../lib/user.js';
import { Icon } from '../components/ui.jsx';

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState('code');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);

  const press = (k) => {
    setErr('');
    if (k === 'del') return setCode((c) => c.slice(0, -1));
    if (code.length >= 4) return;
    const next = code + k;
    setCode(next);
    if (next.length === 4 && next !== JOIN_CODE) setErr('코드가 맞지 않아요');
  };

  if (step === 'code') {
    return (
      <div className="onb">
        <div className="onb-inner">
          <div className="row" style={{ justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {Object.values(CITIES).map((c) => <span key={c.label} style={{ width: 12, height: 12, borderRadius: 6, background: c.color }} />)}
          </div>
          <h1 style={{ margin: 0, textAlign: 'center', fontSize: '1.6rem' }}>이탈리아 여행 노트</h1>
          <p className="muted" style={{ textAlign: 'center', margin: '8px 0 0' }}>10.20 – 11.1 · 로마 · 나폴리 · 포지타노 · 피렌체</p>
          <div style={{ marginTop: '9vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <b>입장 코드 4자리</b>
            <div className="code-boxes" aria-label="입력한 코드">
              {[0, 1, 2, 3].map((i) => <span key={i} className={i < code.length ? 'filled' : i === code.length ? 'cur' : ''}>{code[i] ? '•' : ''}</span>)}
            </div>
            <span className="small" style={{ color: err ? 'var(--danger)' : 'var(--muted)', minHeight: 20 }}>{err || '처음 한 번만 입력하면 이 폰에 저장돼요'}</span>
          </div>
          <div className="keypad" style={{ marginTop: 'auto', paddingTop: 24 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
              k === '' ? <span key="sp" /> : (
                <button key={k} onClick={() => press(k)} aria-label={k === 'del' ? '지우기' : k} style={k === 'del' ? { background: 'transparent' } : undefined}>
                  {k === 'del' ? <Icon name="back" size={24} /> : k}
                </button>
              ),
            )}
          </div>
          <button className="btn primary block" style={{ marginTop: 12, minHeight: 52 }} disabled={code !== JOIN_CODE} onClick={() => setStep('profile')}>다음</button>
        </div>
      </div>
    );
  }

  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (f) setPhoto(await shrinkImage(f, 320, 0.8));
  };
  const done = async () => {
    setBusy(true);
    try {
      onDone(await register({ code, name, color, photo }));
    } catch (e) {
      setErr(e.message || '등록하지 못했어요. 인터넷 연결을 확인해 주세요.');
      setBusy(false);
    }
  };

  return (
    <div className="onb">
      <div className="onb-inner" style={{ gap: 0 }}>
        <div className="row">
          <button className="icon-btn" style={{ background: '#fff' }} onClick={() => setStep('code')} aria-label="뒤로"><Icon name="back" /></button>
          <span className="grow" />
          <span className="small muted">2 / 2</span>
        </div>
        <h1 style={{ margin: '28px 0 0', fontSize: '1.5rem' }}>누가 쓰는 폰인가요?</h1>
        <p className="muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>평점 · 기록 · 지출에 이 이름과 사진이 붙어서, 누가 남겼는지 바로 보여요.</p>
        <label style={{ margin: '32px auto 0', position: 'relative', cursor: 'pointer' }} aria-label="프로필 사진 고르기">
          <span className="avatar" style={{ '--s': '120px', '--c': color, border: '2px dashed #b8af9e' }}>
            {photo ? <img src={photo} alt="" /> : (name.trim()[0] || '?')}
          </span>
          <span style={{ position: 'absolute', right: 2, bottom: 2, width: 38, height: 38, borderRadius: 19, background: 'var(--ink)', color: '#fff', border: '3px solid var(--map)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={18} /></span>
          <input type="file" accept="image/*" hidden onChange={pick} />
        </label>
        <span className="small muted" style={{ textAlign: 'center', marginTop: 8 }}>사진은 선택 · 없으면 이름 첫 글자</span>
        <label className="field" style={{ marginTop: 24 }}>
          <span>이름 (필수)</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={12} placeholder="예: 민" style={{ minHeight: 52, fontSize: '1.05rem' }} />
        </label>
        <div className="field" style={{ marginTop: 16 }}>
          <span>내 색</span>
          <div className="row" role="radiogroup" aria-label="내 색">
            {COLORS.map((c) => <button key={c} role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} style={{ width: 44, height: 44, borderRadius: 22, background: c, border: color === c ? '3px solid var(--ink)' : 0 }} />)}
          </div>
        </div>
        {err && <span className="small" style={{ color: 'var(--danger)', marginTop: 12 }}>{err}</span>}
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <button className="btn primary block" style={{ minHeight: 52 }} disabled={!name.trim() || busy} onClick={done}>{busy ? '등록 중…' : '여행 시작하기'}</button>
        </div>
      </div>
    </div>
  );
}
