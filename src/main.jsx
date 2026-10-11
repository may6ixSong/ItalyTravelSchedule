import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import './styles.css';
import App from './App.jsx';

// 오프라인 캐시(서비스 워커). 새 버전이 배포되면 다음에 열 때 자동으로 바뀝니다.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
