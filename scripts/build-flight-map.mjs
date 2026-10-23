// 비행 위치 화면 바탕 지도(src/data/flightMap.js) 만들기. 한 번만 돌리면 돼요.
//   npm i --no-save world-atlas@2 topojson-client@3 && node scripts/build-flight-map.mjs src/data/flightMap.js
import { feature, mesh } from 'topojson-client';
import { readFileSync, writeFileSync } from 'node:fs';
const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json'));
const LON0 = -2, LON1 = 142, LAT0 = 14, LAT1 = 62, K = Math.cos(42 * Math.PI / 180), S = 4;
const px = ([lon, lat]) => [+((lon - LON0) * K * S).toFixed(1), +((LAT1 - lat) * S).toFixed(1)];
const inBox = ([lon, lat]) => lon > LON0 - 15 && lon < LON1 + 15 && lat > LAT0 - 10 && lat < LAT1 + 10;
function ringPath(ring) {
  if (!ring.some(inBox)) return '';
  let out = '', last = null;
  for (const c of ring) {
    const p = px(c);
    if (last && Math.abs(p[0] - last[0]) < 1 && Math.abs(p[1] - last[1]) < 1) continue;
    out += (out ? 'L' : 'M') + p[0] + ' ' + p[1];
    last = p;
  }
  return out;
}
const land = feature(topo, topo.objects.land);
let landD = '';
for (const f of land.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) for (const r of poly) { const d = ringPath(r); if (d.split('L').length > 3) landD += d + 'Z'; }
}
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
let bD = '';
for (const line of borders.coordinates) { const d = ringPath(line); if (d.split('L').length > 1) bD += d; }
const W = +((LON1 - LON0) * K * S).toFixed(1), H = (LAT1 - LAT0) * S;
const src = `// 비행 위치 화면의 바탕 지도 (오프라인용, 코드에 내장).
// Natural Earth 1:50m 육지 · 국경 (world-atlas), 등장방형 도법, 경도 ${LON0}~${LON1} · 위도 ${LAT0}~${LAT1}.
// 다시 만들려면 scripts/build-flight-map.mjs 참고.
export const MAP = { lon0: ${LON0}, lat1: ${LAT1}, k: ${K}, s: ${S}, w: ${W}, h: ${H} };
export const LAND = ${JSON.stringify(landD)};
export const BORDERS = ${JSON.stringify(bD)};
`;
writeFileSync(process.argv[2], src);
console.log(W, H, src.length);
