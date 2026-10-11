// 거리 계산과 구글맵 링크.

export function distanceKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// 도보 시간 (직선거리 × 1.3 굽이 보정, 시속 4.5km)
export const walkMinutes = (km) => Math.max(1, Math.round(((km * 1.3) / 4.5) * 60));

const q = (p) => (p.lat != null ? `${p.lat},${p.lng}` : p.name);

// origin을 비워두면 구글맵이 현재 위치에서 출발합니다.
export function directionsUrl(dest, origin = null, mode = null) {
  const u = new URLSearchParams({ api: '1', destination: dest.placeId ? dest.name : q(dest) });
  if (dest.placeId) u.set('destination_place_id', dest.placeId);
  if (origin) {
    u.set('origin', origin.placeId ? origin.name : q(origin));
    if (origin.placeId) u.set('origin_place_id', origin.placeId);
  }
  if (mode) u.set('travelmode', mode);
  return `https://www.google.com/maps/dir/?${u}`;
}

export function placeUrl(p) {
  // 직접 등록할 때 넣은 구글맵 링크가 있으면 그걸 그대로 열어요
  if (/^https?:\/\//.test(p.gmaps || '')) return p.gmaps;
  const u = new URLSearchParams({ api: '1', query: p.placeId ? p.name : q(p) });
  if (p.placeId) u.set('query_place_id', p.placeId);
  return `https://www.google.com/maps/search/?${u}`;
}
