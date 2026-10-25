// 체크리스트 기본 항목. 처음 한 번만 공유 DB에 넣고, 이후에는 앱에서 추가 · 수정 · 삭제합니다.

export const CHECK_GROUPS = [
  { id: 'pack', label: '여행 준비물' },
  { id: 'stay', label: '숙소' },
  { id: 'move', label: '이동 수단' },
  { id: 'food', label: '식당 예약' },
];

const pack = [
  '옷', '잠옷', '모자', '속옷', '양말', '선글라스', '수영복', '화장품', '슬리퍼', '치약 / 칫솔',
  '여행 욕실용품 (샴푸, 바디워시 등)', '상비약', '여권', '충전기', '충전 어댑터', '라면 포트', '라면', '고추장',
];
const packRecommended = [
  '국제운전면허증 + 국내 면허증 (렌터카)',
  '어깨·무릎 가리는 옷 (바티칸·성당)',
  '신용카드 2장 이상 / 트래블카드',
  '유로 현금 · 동전 (화장실 등)',
  'eSIM · 유심',
  '보조배터리',
  '멀티탭',
  '편한 운동화',
  '우산 · 우비',
  '비치타월',
  '소매치기 방지 가방 · 폰 스트랩',
  '지퍼백 · 에코백',
  '여행자 보험',
  '여권 사본 · 여권 사진',
];

const stay = [
  ['2026-10-20', '로마 숙소 (10/20 – 10/23)'],
  ['2026-10-23', '나폴리 숙소 (10/23 – 10/26)'],
  ['2026-10-26', '포지타노 숙소 (10/26 – 10/27)'],
  ['2026-10-27', '피렌체 숙소 (10/27 – 10/30)'],
  ['2026-10-30', '끼안띠 숙소 (10/30 – 10/31)'],
  ['2026-10-31', '피렌체 숙소 (10/31 – 11/1)'],
];

const move = [
  ['2026-10-20', '출국 항공편 · 인천 → 로마'],
  ['2026-10-23', '로마 → 나폴리 기차'],
  ['2026-10-25', '나폴리 ↔ 카프리 페리'],
  ['2026-10-26', '나폴리 → 포지타노 페리'],
  ['2026-10-27', '포지타노 → 나폴리 택시'],
  ['2026-10-27', '나폴리 → 피렌체 기차'],
  ['', '피렌체 ↔ 피사 기차 (왕복)'],
  ['2026-10-30', '피렌체 렌터카 (10/30 – 10/31)'],
  ['2026-11-01', '피렌체 → 로마 기차'],
  ['2026-11-01', '귀국 항공편 · 로마 → 인천'],
];

export function checklistSeed() {
  const items = [];
  pack.forEach((title, i) => items.push({ id: `seed-pack-${i}`, group: 'pack', title, order: i }));
  packRecommended.forEach((title, i) =>
    items.push({ id: `seed-packr-${i}`, group: 'pack', title, order: 100 + i, recommended: true }),
  );
  stay.forEach(([date, title], i) => items.push({ id: `seed-stay-${i}`, group: 'stay', title, date, order: i }));
  move.forEach(([date, title], i) => items.push({ id: `seed-move-${i}`, group: 'move', title, date, order: i }));
  return items.map((it) => ({ done: false, link: '', memo: '', ...it }));
}
