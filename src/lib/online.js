// 인터넷 연결 상태 (지도 위 온라인 / 오프라인 표시용)
import { useEffect, useState } from 'react';

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  return online;
}

// 와이파이인지 (안드로이드 크롬만 알려줘요. 모르면 null)
export const connectionType = () => navigator.connection?.type ?? null;
