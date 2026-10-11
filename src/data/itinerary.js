// 날짜별 일정 (UI 확인용 — 기존 일정표 그대로). 실제 일정을 받으면 이 파일만 바꾸면 됩니다.
// stop.place가 있으면 지도에 번호 마커로 찍히고, 없으면 리스트에만 보입니다.
// tag: confirmed(확정) | suggested(추천)

const S = (time, title, place, note = '', tag = 'suggested') => ({ time, title, place, note, tag });
const C = (time, title, place, note = '') => S(time, title, place, note, 'confirmed');

export const DAYS = [
  { id: 'd1', date: '2026-10-20', city: 'rome', title: '로마 도착', stops: [
    C('18:00', '로마 도착', 'rm-fco', '저녁 6시쯤 로마 in'),
    C('저녁', '리쇼네 체크인', 'rm-hotel', 'Via del Castro Pretorio 14'),
    C('', 'Ristorante Luigi', 'rm-luigi', '도착 첫날 저녁'),
  ] },
  { id: 'd2', date: '2026-10-21', city: 'rome', title: '로마', stops: [
    S('새벽', '트레비 분수', 'rm-trevi', '인파 없을 때 사진'),
    C('오전', 'Faro – Caffè Specialty', 'rm-faro', '티라미수 + 커피'),
    S('오전', '스페인 계단', 'rm-spagna', '위에서 보는 전망'),
    S('오전', '판테온', 'rm-pantheon', '09:00–19:00'),
    S('정오', '나보나 광장', 'rm-navona', '판테온에서 도보 5분'),
    C('13:30', '콜로세움 입장', 'rm-colosseo', '티켓은 예약 탭'),
    S('오후', '진실의 입', 'rm-bocca', '콜로세움에서 도보 15분'),
    S('저녁', 'Trecca', 'rm-trecca', '로마 내장요리 트라토리아'),
  ] },
  { id: 'd3', date: '2026-10-22', city: 'rome', title: '로마 · 바티칸', stops: [
    S('', '에스프레소 + 코르네토', null),
    C('08:30', '바티칸 투어 (마이리얼트립)', 'rm-vatican', '스킵더라인 + 성 베드로 대성당 + 지하무덤'),
    S('점심', 'Bonci Pizzarium', 'rm-bonci', '투어 끝나고 바로 근처'),
    S('오후', 'Old Bridge Gelateria', 'rm-oldbridge', '피스타치오 인기'),
    S('오후', '라 리나센테', 'rm-rinascente', '목요일 10:00–21:00'),
    S('저녁', 'Il Sorpasso', 'rm-sorpasso', '와인바 & 레스토랑'),
    S('야간', '콜로세움 야경', 'rm-colosseo', '조명 켜진 외관'),
    S('야간', '트레비 분수 야경', 'rm-trevi'),
  ] },
  { id: 'd4', date: '2026-10-23', city: 'naples', title: '로마 → 나폴리', stops: [
    C('12:41', '로마 → 나폴리 기차', 'rm-termini', '12:41–13:58 · 45.8유로'),
    C('14:00', 'Napoli Centrale 도착', 'na-centrale'),
    C('', 'Napolart 체크인', 'na-hotel', 'Via Medina 17'),
    S('점심', 'Zia Esterina Sorbillo', 'na-esterina', '피자 프리타 원조'),
    S('저녁', '50 Kalò', 'na-kalo', '채소 토핑 추천'),
    S('야간', '카스텔 델 오보 야경', 'na-ovo', '산타루치아 해안도로'),
  ] },
  { id: 'd5', date: '2026-10-24', city: 'naples', title: '카프리 투어', stops: [
    C('오전', '나폴리 → 카프리 페리', 'na-beverello', '고속페리 약 50분'),
    C('', 'Marina Grande 도착', 'cp-marina'),
    S('', '몬테 솔라로 체어리프트', 'cp-solaro', '왕복 10유로'),
    S('', '블루 그로토', 'cp-grotta', '파도 높으면 폐쇄'),
    S('오후', '피아체타', 'cp-piazzetta'),
    S('', '아우구스토 정원', 'cp-augusto', '파랄리오니 전망'),
    S('', '비아 카메렐레', 'cp-camerelle', '명품 거리'),
    C('', '카프리 → 나폴리 페리', 'cp-marina'),
    S('저녁', 'Trattoria da Nennella', 'na-nennella'),
  ] },
  { id: 'd6', date: '2026-10-25', city: 'naples', title: '나폴리', stops: [
    S('', 'Il Vero Bar del Professore', 'na-professore', '카페 알라 노촐라'),
    S('오전', '비아 톨레도', 'na-toledo', '숙소에서 도보 4분'),
    S('점심', 'Pizze Fritte da Gennaro', 'na-gennaro', '평점 4.9'),
    S('', '자유 일정', null),
    S('저녁', '10 Diego Vitagliano (Bagnoli)', 'na-diego-bg', '택시 약 20분'),
  ] },
  { id: 'd7', date: '2026-10-26', city: 'positano', title: '나폴리 → 포지타노', stops: [
    C('오전', '나폴리 → 포지타노 페리', 'na-beverello'),
    C('', '포지타노 도착', 'po-port'),
    C('', 'Le Sirenuse 체크인', 'po-hotel'),
    S('12:00', 'Spiaggia Grande 산책 & 수영', 'po-beach'),
    S('12:30', 'Santa Maria Assunta', 'po-church'),
    S('13:00', 'Via Cristoforo Colombo 쇼핑', 'po-colombo'),
    S('14:00', 'Fornillo Beach', 'po-fornillo'),
    S('저녁', 'La Sponda', 'po-sponda', '미쉐린 스타'),
  ] },
  { id: 'd8', date: '2026-10-27', city: 'florence', title: '포지타노 → 나폴리 → 피렌체', stops: [
    C('11:00', 'Le Sirenuse 체크아웃', 'po-hotel'),
    C('', '포지타노 → 나폴리 택시', null),
    C('15:25', '나폴리 → 피렌체 기차', 'na-centrale', '15:25–18:31 · 79.8유로'),
    C('18:31', 'Firenze S.M.N. 도착', 'fi-smn'),
    C('', '리사 하우스 체크인', 'fi-hotel'),
    S('저녁', 'Osteria Vecchio Cancello', 'fi-cancello', '티본스테이크'),
    S('', 'Manifattura', 'fi-manifattura', '저녁 식사 후 한 잔'),
  ] },
  { id: 'd9', date: '2026-10-28', city: 'florence', title: '피렌체', stops: [
    S('', 'Caffè Gilli', 'fi-gilli', '코르네토 + 에스프레소'),
    C('11:00', 'View on Art Rooftop', 'fi-viewart', '두오모 전망 (예약 완료)'),
    S('', 'ToscaNino', 'fi-toscanino', '입장 무료'),
    S('오후', '우피치 미술관', 'fi-uffizi', '사전 예약 강추'),
    S('', '시뇨리아 광장', 'fi-signoria'),
    S('', '베키오 다리', 'fi-vecchio'),
    S('', '보볼리 정원', 'fi-boboli'),
  ] },
  { id: 'd10', date: '2026-10-29', city: 'florence', title: '피렌체 · 피사', stops: [
    S('', 'Ditta Artigianale', 'fi-ditta', '크림 코르네토'),
    C('오전', '피렌체 → 피사 기차', 'fi-smn', '약 1시간, 9유로'),
    C('', '피사의 사탑 & 두오모 광장', 'pi-tower'),
    C('오후', '피렌체 복귀 기차', 'pi-centrale'),
    S('일몰', '미켈란젤로 광장', 'fi-michelangelo'),
    S('야간', '베키오 다리 야경', 'fi-vecchio'),
    S('저녁', 'Zefiro Rooftop', 'fi-zefiro'),
  ] },
  { id: 'd11', date: '2026-10-30', city: 'tuscany', title: '피렌체 → 끼안띠', stops: [
    C('오전', '렌터카 픽업', 'fi-smn'),
    S('', 'Montefioralle 산책', 'tu-montefioralle'),
    S('', 'Piazza Matteotti (그레베)', 'tu-greve'),
    C('', 'Corte di Valle 체크인', 'tu-hotel'),
    S('', '와인 테이스팅 & 쿠킹 클래스', 'tu-hotel'),
  ] },
  { id: 'd12', date: '2026-10-31', city: 'florence', title: '끼안띠 → 더 몰 → 피렌체', stops: [
    C('오전', 'The Mall Firenze 쇼핑', 'tu-mall', '매일 10:00–19:00'),
    C('', '렌터카 반납', 'fi-smn'),
    C('', '호텔 팔라쪼 베키오 체크인', 'fi-hotel2'),
    S('저녁', '피렌체 마지막 저녁', null),
  ] },
  { id: 'd13', date: '2026-11-01', city: 'rome', title: '피렌체 → 로마 → 출국', stops: [
    C('11:28', '피렌체 → 로마 기차', 'fi-smn', '11:28–13:05 · 59.8유로'),
    C('13:05', 'Roma Termini 도착', 'rm-termini'),
    C('', '로마 출국', 'rm-fco'),
  ] },
];

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export function dayLabel(iso) {
  const d = new Date(iso + 'T12:00:00');
  return { md: `${d.getMonth() + 1}/${d.getDate()}`, dd: d.getDate(), wd: WEEK[d.getDay()], m: d.getMonth() + 1 };
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
