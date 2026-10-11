// 홈 화면 설치 안내 카드. 이미 설치된 앱으로 열었으면 안 보여요.
import { inAppBrowser, isIOS, useInstall } from '../lib/install.js';
import { Icon } from './ui.jsx';

export default function InstallCard({ style }) {
  const { installed, canPrompt, prompt } = useInstall();
  if (installed) return null;
  const url = location.origin + location.pathname;
  let body;
  if (inAppBrowser) {
    body = (
      <>
        <b>앱 안의 브라우저에서는 설치가 안 돼요</b>
        <span className="small">오른쪽 위(또는 아래) 메뉴에서 <b>다른 브라우저로 열기 / Chrome으로 열기</b>{isIOS ? ' (아이폰은 Safari)' : ''}를 눌러 주세요.</span>
        <button className="btn small" onClick={() => navigator.clipboard?.writeText(url)}><Icon name="link" size={14} />주소 복사</button>
      </>
    );
  } else if (canPrompt) {
    body = (
      <>
        <b>홈 화면에 앱으로 설치하기</b>
        <span className="small">설치하면 주소창 없이 열리고, 인터넷이 없어도 열려요.</span>
        <button className="btn primary small" onClick={prompt}><Icon name="download" size={14} />설치</button>
      </>
    );
  } else if (isIOS) {
    body = (
      <>
        <b>홈 화면에 추가하기 (Safari)</b>
        <span className="small">아래쪽 <b>공유 버튼(□↑) → 홈 화면에 추가</b>. 홈 화면 아이콘으로 열어야 데이터가 안 지워져요.</span>
      </>
    );
  } else {
    body = (
      <>
        <b>홈 화면에 추가하기 (Chrome)</b>
        <span className="small">오른쪽 위 <b>⋮ → 홈 화면에 추가</b>(또는 <b>앱 설치</b>). 메뉴에 없으면 시크릿 탭이 아닌지, 삼성 인터넷이 아닌 Chrome인지 확인해 주세요.</span>
      </>
    );
  }
  return (
    <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', ...style }}>
      {body}
    </section>
  );
}
