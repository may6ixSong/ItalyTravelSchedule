// 지도 스타일. 빌드 때 오프라인 타일(PMTiles)이 있으면 그걸 쓰고, 없으면 온라인 OSM 타일을 씁니다.
import { layers, namedFlavor } from '@protomaps/basemaps';
import { BASE, HAS_ROUTE_TILES, HAS_TILES } from '../config.js';
import { getPref, setPref } from './store.js';

const ATTR = '© OpenStreetMap contributors';

export function buildStyle() {
  const abs = new URL(BASE, location.href).href;
  if (HAS_TILES) {
    const flavor = namedFlavor('light');
    // 저배율(전체 이탈리아)은 overview, 도시 안쪽 고배율은 detail 파일에서 그립니다.
    // overview는 줌 9까지만 있지만 확대해도 늘려서 계속 그려서, 도시와 도시 사이(detail이 없는 곳)도
    // 빈 화면 대신 해안선 · 큰 도로가 보이게 합니다. 글자만 줌 10부터 detail 것으로 바꿉니다.
    const ov = layers('overview', flavor, { lang: 'en' }).map((l) => ({
      ...l,
      id: `ov-${l.id}`,
      ...(l.type === 'symbol' ? { maxzoom: Math.min(l.maxzoom ?? 24, 10) } : {}),
    }));
    // 도시 사이 이동 경로: 줌 13까지 들어 있어서 기차 · 렌터카로 지나가는 마을과 도로가 보입니다.
    const rt = HAS_ROUTE_TILES
      ? layers('route', flavor, { lang: 'en' })
          .filter((l) => l.type !== 'background')
          .map((l) => ({ ...l, id: `rt-${l.id}`, minzoom: Math.max(l.minzoom ?? 0, 9) }))
      : [];
    const dt = layers('detail', flavor, { lang: 'en' })
      .filter((l) => l.type !== 'background')
      .map((l) => ({ ...l, id: `dt-${l.id}`, minzoom: Math.max(l.minzoom ?? 0, 10) }));
    return {
      version: 8,
      glyphs: `${abs}basemaps-assets/fonts/{fontstack}/{range}.pbf`,
      sprite: `${abs}basemaps-assets/sprites/v4/light`,
      sources: {
        overview: { type: 'vector', url: `pmtiles://${abs}tiles/overview.pmtiles`, attribution: ATTR },
        detail: { type: 'vector', url: `pmtiles://${abs}tiles/detail.pmtiles`, attribution: ATTR },
        ...(HAS_ROUTE_TILES ? { route: { type: 'vector', url: `pmtiles://${abs}tiles/route.pmtiles`, attribution: ATTR } } : {}),
      },
      layers: [...ov, ...rt, ...dt],
    };
  }
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: ATTR,
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#ECE7DB' } },
      { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.35 } },
    ],
  };
}

// 오프라인용으로 미리 받아둘 파일들 (설정 > 오프라인 지도 받기)
export function offlineMapFiles() {
  if (!HAS_TILES) return [];
  const fonts = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
  const ranges = ['0-255', '256-511', '512-767', '7680-7935', '8192-8447'];
  const files = ['tiles/overview.pmtiles', 'tiles/detail.pmtiles', ...(HAS_ROUTE_TILES ? ['tiles/route.pmtiles'] : [])];
  for (const f of fonts) for (const r of ranges) files.push(`basemaps-assets/fonts/${encodeURIComponent(f)}/${r}.pbf`);
  for (const s of ['light.json', 'light.png', 'light@2x.json', 'light@2x.png']) files.push(`basemaps-assets/sprites/v4/${s}`);
  return files.map((f) => `${BASE}${f}`);
}

export async function downloadOfflineMap(onProgress) {
  const files = offlineMapFiles();
  const cache = await caches.open('offline-tiles');
  let done = 0;
  for (const url of files) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done: end, value } = await reader.read();
      if (end) break;
      chunks.push(value);
      got += value.length;
      onProgress?.({ file: url, got, total, index: done, count: files.length });
    }
    const blob = new Blob(chunks);
    await cache.put(
      url,
      new Response(blob, { headers: { 'Content-Type': res.headers.get('content-type') || 'application/octet-stream', 'Content-Length': String(blob.size) } }),
    );
    done += 1;
  }
  setPref('offlineMapAt', Date.now());
  return done;
}

export async function offlineMapStatus() {
  const files = offlineMapFiles();
  if (!files.length || !('caches' in window)) return { available: false };
  const cache = await caches.open('offline-tiles');
  const hits = await Promise.all(files.slice(0, 2).map((f) => cache.match(f)));
  return { available: true, saved: hits.every(Boolean), at: getPref('offlineMapAt', null) };
}
