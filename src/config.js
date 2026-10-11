// 앱 설정. Firebase 웹 설정값은 공개돼도 되는 값이라 여기 그대로 둡니다
// (보안은 firestore.rules가 담당). 값이 비어 있으면 이 폰 안에만 저장하는 로컬 모드로 동작합니다.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// 개발 서버의 admin 사용자는 Firebase 보안 규칙을 통과하지 못하므로, 개발 중에는 로컬 저장만 씁니다.
// (개발 중에도 Firebase로 테스트하려면 VITE_USE_FIREBASE=1 npm run dev)
export const IS_DEV = import.meta.env.DEV;
export const hasFirebase =
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) && (!IS_DEV || import.meta.env.VITE_USE_FIREBASE === '1');

// 최초 접속 코드. firestore.rules의 joinCode와 같아야 합니다.
export const JOIN_CODE = '1234';

// 빌드할 때 오프라인 지도 타일(public/tiles)이 있었는지. vite.config.js에서 주입합니다.
export const HAS_TILES = import.meta.env.VITE_HAS_TILES === '1';
// 도시 사이 이동 경로 지도(route.pmtiles)가 있는지
export const HAS_ROUTE_TILES = import.meta.env.VITE_HAS_ROUTE_TILES === '1';

export const BASE = import.meta.env.BASE_URL;

export const TRIP = { start: '2026-10-20', end: '2026-11-01' };
