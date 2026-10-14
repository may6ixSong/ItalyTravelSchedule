// 예약 목록 (숙소 · 교통 · 투어). 기차 · 페리 · 항공 · 투어 · 렌터카는 당일 지도 위에 알림 카드로 뜹니다.
// 실제 예약번호 · 시간이 정해지면 이 파일을 채우면 됩니다. link는 예약 확인 페이지나 앱 링크입니다.
// 앱에서 추가 · 고친 예약은 공유 DB(settings/userBookings)에 저장돼 이 목록 위에 덮어씌워져요.

export const BOOKING_TYPES = {
  stay: { label: '숙소', alert: false },
  train: { label: '기차', alert: true },
  ferry: { label: '페리', alert: true },
  flight: { label: '항공', alert: true },
  tour: { label: '투어', alert: true },
  car: { label: '렌터카', alert: true },
  meal: { label: '식당 예약', alert: true },
};

const B = (id, type, date, title, extra = {}) => ({ id, type, date, title, ...extra });

export const BOOKINGS = [
  B('b-flight-out', 'flight', '2026-10-20', '출국 항공편 · 인천 → 로마', { time: '', sub: '18:00쯤 로마 도착', place: 'rm-fco' }),
  B('b-stay-rome', 'stay', '2026-10-20', 'Rishon Malon · 로마', { endDate: '2026-10-23', sub: 'Via del Castro Pretorio 14', place: 'rm-hotel' }),
  B('b-colosseo', 'tour', '2026-10-21', '콜로세움 입장', { time: '13:30', place: 'rm-colosseo' }),
  B('b-vatican', 'tour', '2026-10-22', '바티칸 투어', {
    time: '09:00', place: 'rm-vatican', sub: '마이리얼트립 · 스킵더라인 + 성 베드로 대성당 + 지하무덤',
    detail: [['금액', '147,100원 (투어 62,100 + 스킵더라인 75,000)'], ['현장', '성당 패스트트랙 7유로 · 현금']],
  }),
  B('b-train-rn', 'train', '2026-10-23', '로마 → 나폴리 기차', { time: '12:41', sub: '12:41 – 13:58 · Roma Termini · 45.8€', place: 'rm-termini' }),
  B('b-stay-naples', 'stay', '2026-10-23', 'Napolart · 나폴리', { endDate: '2026-10-26', sub: 'Via Medina 17', place: 'na-hotel' }),
  B('b-capri', 'tour', '2026-10-24', '카프리 투어', { time: '', sub: 'Molo Beverello 출발', place: 'na-beverello' }),
  B('b-ferry-np', 'ferry', '2026-10-26', '나폴리 → 포지타노 페리', { time: '', sub: 'Molo Beverello', place: 'na-beverello' }),
  B('b-stay-positano', 'stay', '2026-10-26', 'Le Sirenuse · 포지타노', { endDate: '2026-10-27', place: 'po-hotel' }),
  B('b-train-nf', 'train', '2026-10-27', '나폴리 → 피렌체 기차', { time: '15:25', sub: '15:25 – 18:31 · Napoli Centrale · 79.8€', place: 'na-centrale' }),
  B('b-stay-florence', 'stay', '2026-10-27', '리사하우스 2호점 · 피렌체', { endDate: '2026-10-30', sub: 'Via Luigi Alamanni 35', place: 'fi-hotel' }),
  B('b-dalloste', 'meal', '2026-10-28', 'Trattoria Dalloste 저녁 예약', { time: '19:30', place: 'fi-dalloste3', sub: 'TheFork 앱 예약 · 비스테카 알라 피오렌티나' }),
  B('b-car', 'car', '2026-10-30', '피렌체 렌터카 픽업', { time: '', sub: '10/30 – 10/31 반납', place: 'fi-smn' }),
  B('b-stay-chianti', 'stay', '2026-10-30', 'Corte di Valle · 끼안띠', { endDate: '2026-10-31', place: 'tu-hotel' }),
  B('b-stay-florence2', 'stay', '2026-10-31', '호텔 팔라쪼 베키오 · 피렌체', { endDate: '2026-11-01', place: 'fi-hotel2' }),
  B('b-train-fr', 'train', '2026-11-01', '피렌체 → 로마 기차', { time: '11:28', sub: '11:28 – 13:05 · Firenze S.M.N. · 59.8€', place: 'fi-smn' }),
  B('b-luciano', 'meal', '2026-10-21', 'LUCIANO 점심 예약', { time: '11:30', place: 'rm-luciano' }),
  B('b-flight-in', 'flight', '2026-11-01', '귀국 항공편 · 로마 → 인천', { time: '', place: 'rm-fco' }),
];
