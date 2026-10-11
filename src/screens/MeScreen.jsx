// 나: 프로필 수정 · 공유 상태 · 오프라인 지도 받기 · 앱 정보
import { useEffect, useState } from 'react';
import { HAS_TILES, IS_DEV, hasFirebase } from '../config.js';
import { downloadOfflineMap, offlineMapStatus } from '../lib/mapStyle.js';
import { shrinkImage } from '../lib/images.js';
import { COLORS, updateMe, useMe } from '../lib/user.js';
import { useUsers } from '../components/PlaceDetail.jsx';
import { Avatar, Icon } from '../components/ui.jsx';

export default function MeScreen({ setMe }) {
  const me = useMe();
  const users = useUsers();
  const [name, setName] = useState(me.name);
  const [status, setStatus] = useState(null);
  const [prog, setProg] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [persisted, setPersisted] = useState(null);

  useEffect(() => {
    offlineMapStatus().then(setStatus);
    navigator.storage?.persisted?.().then(setPersisted);
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  const save = async (p) => setMe(await updateMe(me, p));
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (f) save({ photo: await shrinkImage(f, 320, 0.8) });
  };
  const download = async () => {
    try {
      await navigator.storage?.persist?.().then(setPersisted);
      await downloadOfflineMap(setProg);
      setProg(null);
      setStatus(await offlineMapStatus());
    } catch (e) {
      setProg(null);
      alert(`지도를 받지 못했어요: ${e.message}`);
    }
  };

  return (
    <div className="scroll">
      <div className="top"><div className="top-inner"><div className="row"><h1 className="grow">나</h1>{IS_DEV && <span className="badge dev">DEV · {me.name}</span>}</div></div></div>
      <div className="page">
        <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row">
            <label style={{ cursor: 'pointer' }} aria-label="사진 바꾸기"><Avatar user={me} size={64} /><input type="file" accept="image/*" hidden onChange={pick} /></label>
            <div className="grow field">
              <span>이름</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== me.name && save({ name: name.trim() })} maxLength={12} />
            </div>
          </div>
          <div className="row" role="radiogroup" aria-label="내 색">
            {COLORS.map((c) => <button key={c} role="radio" aria-checked={me.color === c} aria-label={c} onClick={() => save({ color: c })} style={{ width: 36, height: 36, borderRadius: 18, background: c, border: me.color === c ? '3px solid var(--ink)' : 0 }} />)}
          </div>
          {me.photo && <button className="btn small ghost" onClick={() => save({ photo: '' })}>사진 지우기</button>}
        </section>

        <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row">
            <b className="grow">공유</b>
            <span className={`badge ${hasFirebase ? 'ok' : 'warn'}`}>{hasFirebase ? 'Firebase 연결됨' : '이 폰에만 저장 중'}</span>
          </div>
          <span className="small muted" style={{ lineHeight: 1.5 }}>
            {hasFirebase
              ? '기록 · 지출 · 체크리스트가 동행 폰과 실시간으로 공유돼요. 오프라인에서 적은 건 연결되면 올라가요.'
              : 'Firebase 설정 전이라 이 기기 안에만 저장돼요. 설정이 끝나면 자동으로 공유 모드로 바뀌어요.'}
          </span>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {Object.values(users).map((u) => <span key={u.uid} className="chip"><Avatar user={u} size={22} />{u.name}{u.uid === me.uid ? ' (나)' : ''}</span>)}
          </div>
          <span className={`badge ${online ? 'ok' : 'warn'}`} style={{ alignSelf: 'flex-start' }}>{online ? '온라인' : '오프라인 — 저장된 데이터로 보는 중'}</span>
        </section>

        <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>오프라인 지도</b>
          {!HAS_TILES ? (
            <span className="small muted" style={{ lineHeight: 1.5 }}>이 빌드에는 오프라인 지도 파일이 없어요. GitHub에 배포된 앱에서는 받을 수 있어요. 지금은 온라인 지도(OSM)를 쓰고, 본 곳만 임시 저장돼요.</span>
          ) : (
            <>
              <span className="small muted" style={{ lineHeight: 1.5 }}>로마 · 나폴리 · 카프리 · 포지타노 · 피렌체 · 피사 · 끼안띠 지도와 도시 사이 이동 경로를 폰에 저장해요. 출국 전에 와이파이에서 한 번 받아두세요.</span>
              {status?.saved && <span className="badge ok" style={{ alignSelf: 'flex-start' }}><Icon name="check" size={12} />저장됨{status.at ? ` · ${new Date(status.at).toLocaleDateString('ko-KR')}` : ''}</span>}
              {prog ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="progress"><i style={{ width: `${((prog.index + (prog.total ? prog.got / prog.total : 0)) / prog.count) * 100}%` }} /></div>
                  <span className="tiny muted">{prog.index + 1} / {prog.count} · {(prog.got / 1048576).toFixed(1)}MB</span>
                </div>
              ) : (
                <button className="btn primary" onClick={download}><Icon name="download" size={18} />{status?.saved ? '다시 받기' : '오프라인 지도 받기'}</button>
              )}
            </>
          )}
          {persisted === false && <span className="tiny muted">아이폰은 오래 안 쓰면 저장 데이터를 지울 수 있어요. 홈 화면에 추가해서 쓰고, 출국 전에 비행기 모드로 한 번 열어보세요.</span>}
        </section>

        <section className="card pad small muted" style={{ lineHeight: 1.6 }}>
          앱 버전: {__BUILD_TIME__} 배포 (이탈리아 시간)<br />
          새 버전은 인터넷이 될 때 앱을 다시 열면 자동으로 바뀌고, 저장된 기록은 그대로예요.<br /><br />
          홈 화면에 추가하면 앱처럼 열려요.<br />
          갤럭시: 크롬 메뉴 ⋮ → 홈 화면에 추가 · 아이폰: 사파리 공유 버튼 → 홈 화면에 추가
        </section>
      </div>
    </div>
  );
}
