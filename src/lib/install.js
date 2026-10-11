// 홈 화면에 설치하기. 크롬이 주는 설치 이벤트(beforeinstallprompt)를 일찍 잡아 두었다가 버튼으로 띄워요.
// 카카오톡 · 네이버 같은 앱 안의 브라우저나 시크릿 탭에서는 설치가 안 돼서 안내 문구를 보여줘요.
import { useEffect, useState } from 'react';

let deferred = null;
const bus = new EventTarget();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    bus.dispatchEvent(new Event('change'));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    bus.dispatchEvent(new Event('change'));
  });
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = /iPhone|iPad|iPod/.test(ua);
// 앱 안 브라우저(카카오톡, 네이버, 인스타, 페북, 라인, 밴드 등)와 안드로이드 웹뷰
export const inAppBrowser = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|BAND\/|DaumApps|; wv\)/i.test(ua);

export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => {
    const on = () => tick((n) => n + 1);
    bus.addEventListener('change', on);
    return () => bus.removeEventListener('change', on);
  }, []);
  return {
    installed: isStandalone(),
    canPrompt: !!deferred,
    prompt: async () => {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      bus.dispatchEvent(new Event('change'));
      return outcome === 'accepted';
    },
  };
}
