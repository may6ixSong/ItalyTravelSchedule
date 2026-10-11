// 인터넷 연결 상태 (지도 위 온라인 / 오프라인 표시용)
import { useEffect, useState } from 'react';

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    // 끊김은 2초 동안 계속될 때만 표시 (안드로이드에서 잠깐 흔들릴 때 깜빡이지 않게). 연결은 바로 반영.
    let t = null;
    const on = () => {
      clearTimeout(t);
      if (navigator.onLine) setOnline(true);
      else t = setTimeout(() => setOnline(navigator.onLine), 2000);
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  return online;
}

// 와이파이인지 (안드로이드 크롬만 알려줘요. 모르면 null)
export const connectionType = () => navigator.connection?.type ?? null;
