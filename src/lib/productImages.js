// 제품 사진 찾기: Open Food Facts(식품) · Open Beauty Facts(화장품) 공개 데이터베이스에서 이름으로 검색해요.
// 키가 필요 없고 무료예요. 폰에서 온라인일 때만 동작하고, 찾은 사진은 서비스 워커가 저장해서 오프라인에서도 보여요.
const HOSTS = { food: 'https://world.openfoodfacts.org', beauty: 'https://world.openbeautyfacts.org' };

async function search(host, q, signal) {
  const u = `${host}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=16&fields=code,product_name,brands,image_front_url,image_front_small_url`;
  const r = await fetch(u, { signal });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.products || [])
    .filter((p) => p.image_front_url || p.image_front_small_url)
    .map((p) => ({ url: p.image_front_url || p.image_front_small_url, small: p.image_front_small_url || p.image_front_url, name: p.product_name || '', brand: p.brands || '', source: host.includes('beauty') ? 'Open Beauty Facts' : 'Open Food Facts' }));
}

// beauty가 true면 화장품 DB를 먼저, 아니면 식품 DB를 먼저 찾아요. 결과가 없으면 다른 쪽도 찾아봐요.
export async function findProductImages(q, { beauty = false, timeout = 12000 } = {}) {
  if (!q?.trim() || !navigator.onLine) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const order = beauty ? [HOSTS.beauty, HOSTS.food] : [HOSTS.food, HOSTS.beauty];
    for (const h of order) {
      try {
        const list = await search(h, q.trim(), ctrl.signal);
        if (list.length) return list;
      } catch {
        /* 다음 DB로 */
      }
    }
    return [];
  } finally {
    clearTimeout(t);
  }
}

// 기본 항목 자동 사진: 브랜드가 맞는 첫 결과, 없으면 첫 결과
export async function pickProductImage(item) {
  const list = await findProductImages(item.query || item.title, { beauty: item.beauty });
  const best = list.find((p) => item.brand?.test?.(`${p.brand} ${p.name}`)) || list[0];
  return best || null;
}
