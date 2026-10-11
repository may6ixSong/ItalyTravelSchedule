// 기본 쇼핑 목록(처음 일정표에 있던 '마트에서 살 것'). 쇼핑 목록을 처음 열 때 한 번만 공유 DB에 들어가요.
// query · brand: 폰에서 온라인일 때 Open Food Facts / Open Beauty Facts에서 제품 사진을 찾아 자동으로 붙이는 데 써요.
const MART = 'Conad · Coop 등 마트';

export const SHOPPING_SEED = [
  { id: 'buy-ciobar', title: '치오바(Ciobar) 핫초코', store: `${MART} · 코코아/커피 코너`, note: '이탈리아 대표 인스턴트 핫초코 가루 — 진하고 걸쭉한 게 특징', query: 'ciobar', brand: /cameo|ciobar/i },
  { id: 'buy-borotalco', title: '보로탈코(Borotalco)', store: `${MART} · 화장품/바디케어 코너`, note: '이탈리아 국민 바디파우더 · 데오드란트 브랜드', query: 'borotalco', brand: /borotalco|roberts/i, beauty: true },
  { id: 'buy-rio', title: 'Rio 참치캔 파테(Pâté)', store: `${MART} · 통조림 코너`, note: '참치 스프레드 — 빵에 발라 먹기 좋음', query: 'rio mare patè tonno', brand: /rio mare/i },
  { id: 'buy-polenghi', title: 'Polenghi 레몬즙', store: `${MART} · 소스/조미료 코너`, note: '이탈리아 대표 레몬즙, 레몬 모양 병', query: 'polenghi limone', brand: /polenghi/i },
];

// 판매점 빠른 선택
export const STORE_HINTS = ['마트 (Conad · Coop)', '약국 (Farmacia)', '면세점', '더 몰 아울렛', '시장', '기념품 가게'];
