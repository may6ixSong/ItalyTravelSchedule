// 출국 전에 미리 결제한 여행 경비. 가계부를 처음 열 때 한 번만 공유 DB에 넣어요(사전 결제 · 공동).
// id가 고정이라 두 폰에서 동시에 열어도 두 번 들어가지 않아요. 넣은 뒤에는 앱에서 고치거나 지울 수 있어요.
// 유로 항목은 넣는 순간의 환율(현재 환율 + 설정한 가산)로 원화를 계산해요.

const K = (id, date, theme, title, krw) => ({ id, date, theme, title, currency: 'KRW', amount: krw });
const E = (id, date, theme, title, eur) => ({ id, date, theme, title, currency: 'EUR', amount: eur });

export const EXPENSE_SEED = [
  K('pre-flight', '2026-10-20', 'transport', '비행기 (인천 ↔ 로마)', 2348400),
  K('pre-stay-rome', '2026-10-20', 'stay', '숙소 · Rishon Malon (10/20–10/23)', 855911),
  K('pre-stay-naples', '2026-10-23', 'stay', '숙소 · Napolart (10/23–10/26)', 663385),
  K('pre-stay-positano', '2026-10-26', 'stay', '숙소 · Le Sirenuse (10/26–10/27)', 1233427),
  K('pre-stay-florence', '2026-10-27', 'stay', '숙소 · 리사하우스 한인민박 (10/27–10/30)', 826239),
  K('pre-stay-chianti', '2026-10-30', 'stay', '숙소 · Corte di Valle (10/30–10/31)', 320478),
  K('pre-stay-florence2', '2026-10-31', 'stay', '숙소 · 호텔 팔라쪼 베키오 (10/31–11/1)', 216476),
  E('pre-train-rn', '2026-10-23', 'transport', '기차 · 로마 → 나폴리', 45.8),
  E('pre-train-nf', '2026-10-27', 'transport', '기차 · 나폴리 → 피렌체', 79.8),
  E('pre-train-fr', '2026-11-01', 'transport', '기차 · 피렌체 → 로마', 59.8),
  E('pre-colosseo', '2026-10-21', 'tour', '콜로세움 입장', 36),
];
