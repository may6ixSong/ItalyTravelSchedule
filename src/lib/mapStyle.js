// 지도 스타일. 빌드 때 오프라인 타일(PMTiles)이 있으면 그걸 쓰고, 없으면 온라인 OSM 타일을 씁니다.
import { layers, namedFlavor } from '@protomaps/basemaps';
import { FetchSource, PMTiles } from 'pmtiles';
import { BASE, HAS_ROUTE_TILES, HAS_TILES } from '../config.js';
import { getPref, setPref } from './store.js';

const ATTR = '© OpenStreetMap contributors';

const TILE_CACHE = 'offline-tiles';
const pmtilesFiles = () => ['overview', 'detail', ...(HAS_ROUTE_TILES ? ['route'] : [])].map((n) => `tiles/${n}.pmtiles`);

// 오프라인 지도 파일 읽기: 폰에 저장된 파일이 있으면 거기서 필요한 부분만 바로 잘라 읽고,
// 없으면 인터넷에서 받아요. 예전에는 서비스 워커가 타일 하나 읽을 때마다 수백 MB 파일 전체를
// 다시 열어서, 폰(특히 비행기 모드)에서 지도가 비거나 일부만 그려졌어요.
class OfflineFirstSource {
  constructor(url) {
    this.url = url;
    this.net = new FetchSource(url);
    this.blob = null; // 저장된 파일 (Promise<Blob|null>)
  }
  getKey() {
    return this.url;
  }
  open() {
    this.blob ||= ('caches' in window ? caches.open(TILE_CACHE).then((c) => c.match(this.url)) : Promise.resolve(null))
      .then((r) => (r ? r.blob() : null))
      .catch(() => null);
    return this.blob;
  }
  async getBytes(offset, length, signal, etag) {
    // 한 번 정한 출처(저장된 파일 / 인터넷)는 바꾸지 않아요. 판이 다르면 파일 안 위치가 달라서요.
    if (this.useNet) return this.net.getBytes(offset, length, signal, etag);
    const blob = await this.open();
    if (!blob) {
      this.useNet = true;
      return this.net.getBytes(offset, length, signal, etag);
    }
    try {
      return { data: await blob.slice(offset, offset + length).arrayBuffer() };
    } catch {
      // '다시 받기'로 파일이 바뀌면 예전 조각은 못 읽어요 → 새로 열기
      this.blob = null;
      const again = await this.open();
      if (!again) throw new Error('offline map missing');
      return { data: await again.slice(offset, offset + length).arrayBuffer() };
    }
  }
}

// 지도를 만들기 전에 한 번: pmtiles:// 주소를 위 방식으로 읽게 등록
export function registerOfflineSources(protocol) {
  if (!HAS_TILES) return;
  const abs = new URL(BASE, location.href).href;
  for (const f of pmtilesFiles()) protocol.add(new PMTiles(new OfflineFirstSource(`${abs}${f}`)));
}

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
  const files = pmtilesFiles();
  for (const f of fonts) for (const r of ranges) files.push(`basemaps-assets/fonts/${encodeURIComponent(f)}/${r}.pbf`);
  for (const s of ['light.json', 'light.png', 'light@2x.json', 'light@2x.png']) files.push(`basemaps-assets/sprites/v4/${s}`);
  return files.map((f) => `${BASE}${f}`);
}

// 같은 파일을 두 번 받지 않도록, 받는 중이면 그 작업에 진행 표시만 붙여요
let running = null;
const listeners = new Set();

// force: 나 탭의 '다시 받기' — 저장된 파일도 새로 받아요
export function downloadOfflineMap(onProgress, force = true) {
  if (onProgress) listeners.add(onProgress);
  running ||= doDownload(force).finally(() => {
    running = null;
    listeners.clear();
  });
  return running;
}
export const isDownloadingMap = () => !!running;

async function doDownload(force) {
  const files = offlineMapFiles();
  const cache = await caches.open(TILE_CACHE);
  let done = 0;
  for (const url of files) {
    // 이미 저장된 파일은 다시 받지 않아요 (데이터 절약)
    if (!force && (await cache.match(url))) {
      done += 1;
      continue;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    // 받으면서 바로 폰 저장소에 써요 (큰 파일을 메모리에 통째로 올리지 않게)
    let got = 0;
    const index = done;
    const counted = res.body.pipeThrough(
      new TransformStream({
        transform(chunk, ctl) {
          got += chunk.length;
          listeners.forEach((f) => f({ file: url, got, total, index, count: files.length }));
          ctl.enqueue(chunk);
        },
      }),
    );
    const headers = { 'Content-Type': res.headers.get('content-type') || 'application/octet-stream' };
    await cache.put(url, new Response(counted, { headers }));
    // 끝까지 다 받았는지 확인 (중간에 끊기면 반쪽 파일이 남지 않게). 압축돼 온 파일은 크기를 비교할 수 없어요.
    if (!got || (total && !res.headers.get('content-encoding') && got !== total)) {
      await cache.delete(url);
      throw new Error(`${url} 받다가 끊겼어요`);
    }
    done += 1;
  }
  setPref('offlineMapAt', Date.now());
  return done;
}

// 와이파이에 연결돼 있고 아직 안 받았으면 알아서 받아 둬요 (중간에 끊겼으면 남은 파일만).
// 모바일 데이터일 때는 받지 않아요. 와이파이인지 알 수 없는 폰(아이폰)은 나 탭에서 직접 받아요.
export async function autoDownloadOnWifi() {
  if (!HAS_TILES || !navigator.onLine || navigator.connection?.type !== 'wifi' || navigator.connection?.saveData) return;
  const st = await offlineMapStatus();
  if (!st.available || st.saved) return;
  try {
    await downloadOfflineMap(null, false);
  } catch (e) {
    console.warn('auto map download', e);
  }
}

export async function offlineMapStatus() {
  const files = offlineMapFiles();
  if (!files.length || !('caches' in window)) return { available: false };
  const cache = await caches.open(TILE_CACHE);
  // 지도 파일 · 글자 · 아이콘이 하나라도 빠져 있으면 '저장 안 됨'으로 봐요 (남은 것만 다시 받기)
  const hits = await Promise.all(files.map((f) => cache.match(f)));
  return { available: true, saved: hits.every(Boolean), at: getPref('offlineMapAt', null) };
}
