import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 주소가 https://<계정>.github.io/ItalyTravelSchedule/ 이라서 배포 때는 VITE_BASE로 경로를 넘깁니다.
const base = process.env.VITE_BASE || '/';
// 배포 워크플로가 오프라인 지도 타일을 받아왔으면 PMTiles 지도를 씁니다.
process.env.VITE_HAS_TILES = existsSync('public/tiles/detail.pmtiles') && existsSync('public/tiles/overview.pmtiles') ? '1' : '0';
process.env.VITE_HAS_ROUTE_TILES = existsSync('public/tiles/route.pmtiles') ? '1' : '0';

export default defineConfig({
  base,
  // 나 탭에 보여줄 앱 버전(배포 시각, 이탈리아 시간)
  define: { __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('ko-KR', { timeZone: 'Europe/Rome', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/icon.svg'],
      manifest: {
        name: '이탈리아 여행 노트',
        short_name: '이탈리아',
        description: '오프라인에서도 보는 이탈리아 여행 지도 · 예약 · 가계부',
        lang: 'ko',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#ECE7DB',
        theme_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 화면 · 데이터 · 폰트 · 장소 사진은 설치 때 미리 저장 (오프라인에서 항상 열림)
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,jpg,webp}'],
        globIgnores: ['tiles/**', 'basemaps-assets/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // 오프라인 지도: '오프라인 지도 받기'로 통째로 저장한 파일에서 필요한 부분만 잘라 씁니다.
            urlPattern: ({ url }) => url.pathname.includes('/tiles/') || url.pathname.includes('/basemaps-assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'offline-tiles', rangeRequests: true, cacheableResponse: { statuses: [200] } },
          },
          {
            // 온라인 지도(타일 파일이 없는 빌드): 본 곳만 임시 저장
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'osm', expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { chunkSizeWarningLimit: 1600 },
});
