// 날짜별 일정. 장소 순서 = 일정 순서(지도 번호 마커)이고, 하루의 처음과 끝은 항상 숙소예요.
// 도시를 옮기는 날은 출발 도시 숙소로 시작해 도착 도시 숙소로 끝나요.
// tag: confirmed(확정 — 숙소 · 예약) | suggested(가고 싶은 곳)
// alts: 그날의 다른 일정(우천시 등). 앱에서 고친 일정은 공유 DB에 저장돼 이 일정 위에 덮어씌워져요.
import { PLACE_BY_ID } from './places.js';

const stop = (tag) => (place, time = '', note = '', title) => ({ time, title: title || PLACE_BY_ID[place]?.name || place, place, note, tag });
const A = stop('suggested'); // 가고 싶은 곳
const R = stop('confirmed'); // 숙소 · 예약
const T = (time, title, note = '') => ({ time, title, place: null, note, tag: 'suggested' }); // 장소 없는 항목

const CAPRI_COMMON = [
  A('cp-bga', '오후', '레몬 소르베'),
  A('cp-camerelle', '', '명품 쇼핑거리'),
  A('cp-augusto'),
  R('cp-marina', '', '나폴리 복귀'),
  A('na-diego-sl', '저녁', '나폴리 1등 피자'),
  A('na-lungomare', '', '해변 거리 산책'),
  A('na-supero', '', '슈퍼마켓'),
  R('na-hotel', '밤', '숙소 복귀'),
];

export const DAYS = [
  { id: 'd1', date: '2026-10-20', city: 'rome', title: '로마 도착', stops: [
    R('rm-hotel', '저녁', '체크인'),
    A('rm-luigi', '저녁', '파스타, 티라미수'),
    R('rm-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd2', date: '2026-10-21', city: 'rome', title: '로마', stops: [
    R('rm-hotel', '오전', '출발'),
    A('rm-trevi', '오전'),
    A('rm-giolitti', '오전'),
    A('rm-pantheon', '오전'),
    A('rm-tazza', '오전'),
    A('rm-navona', '오전'),
    R('rm-luciano', '11:30', '점심 · 킹 오브 까르보나라 · 11:30 예약'),
    R('rm-colosseo', '13:30', '오후 1시 30분 예약'),
    A('rm-foro', '오후'),
    A('rm-bocca', '오후'),
    A('rm-clood', '저녁', '나폴리맛피아 추천 식당'),
    A('rm-trapizzino', '', '파브리 추천'),
    A('rm-supplizio', '', '맥주 안주'),
    A('rm-venezia', '밤'),
    A('rm-vittoriano', '밤'),
    R('rm-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd3', date: '2026-10-22', city: 'rome', title: '로마 · 바티칸', stops: [
    R('rm-hotel', '오전', '출발'),
    A('rm-regoli', '아침'),
    R('rm-vatican', '09:00', '바티칸 투어 · 오전 9시 예약', '바티칸 투어'),
    A('rm-bonci', '점심'),
    A('rm-frullati', '오후'),
    A('rm-pompi', '오후'),
    A('rm-guerra', '오후', '파스타 테이크아웃'),
    A('rm-spagna', '오후'),
    A('rm-pesciolino', '저녁'),
    R('rm-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd4', date: '2026-10-23', city: 'naples', title: '로마 → 나폴리', stops: [
    R('rm-hotel', '오전', '체크아웃'),
    A('rm-faro', '오전'),
    R('na-hotel', '오후', '체크인'),
    A('na-michele', '오후'),
    A('na-spacca', '오후'),
    A('na-duomo', '오후'),
    A('na-napulion', '저녁', '해산물'),
    A('na-plebiscito', '밤'),
    A('na-esterina', '밤'),
    A('na-kitebeer', '밤'),
    R('na-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd5', date: '2026-10-24', city: 'naples', title: '나폴리', stops: [
    R('na-hotel', '오전', '출발'),
    A('na-elmo', '오전'),
    A('na-pignasecca', '오후', '시장'),
    A('na-mollica', '오후'),
    A('na-gennaro', '오후'),
    A('na-toledo', '오후'),
    A('na-spagnoli', '오후'),
    A('na-gambrinus', '오후'),
    A('na-nuovo', '오후'),
    A('na-kalo', '저녁'),
    R('na-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd6', date: '2026-10-25', city: 'naples', title: '카프리', stops: [
    R('na-hotel', '오전', '출발'),
    A('cp-island', '오전'),
    A('cp-anacapri', '오전'),
    A('cp-solaro', '오전'),
    A('cp-arcate', '점심'),
    ...CAPRI_COMMON,
  ] },
  { id: 'd7', date: '2026-10-26', city: 'positano', title: '나폴리 → 포지타노', stops: [
    R('na-hotel', '오전', '체크아웃'),
    R('po-hotel', '오후', '체크인'),
    A('po-valenti', '오후', '식료품점'),
    A('po-sponda', '저녁'),
    R('po-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd8', date: '2026-10-27', city: 'florence', title: '포지타노 → 피렌체', stops: [
    R('po-hotel', '오전', '체크아웃'),
    R('fi-hotel', '오후', '체크인'),
    A('fi-dalloste3', '저녁', '티본 스테이크'),
    A('fi-smnchurch', '밤'),
    A('fi-tornabuoni', '밤', '명품거리'),
    A('fi-manifattura', '밤'),
    R('fi-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd9', date: '2026-10-28', city: 'pisa', title: '피사', stops: [
    R('fi-hotel', '오전', '출발'),
    A('pi-posto', '오전'),
    A('pi-tower', '오전'),
    A('pi-branzo', '점심'),
    A('pi-rufus', '오후'),
    A('fi-mercato', '오후', '피렌체 복귀 후'),
    A('fi-nerbone', '오후', '곱창버거'),
    A('fi-nuti', '저녁'),
    R('fi-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd10', date: '2026-10-29', city: 'florence', title: '피렌체', stops: [
    R('fi-hotel', '오전', '출발'),
    A('fi-viewart', '오전'),
    A('fi-duomosq', '오전'),
    A('fi-duomo', '오전'),
    A('fi-badiani', '오전'),
    A('fi-gilli', '오전'),
    A('fi-repubblica', '오후'),
    A('fi-signoria', '오후', '짭 다비드 보기'),
    A('fi-vinaio', '오후'),
    A('fi-uffizi', '오후'),
    A('fi-vecchio', '오후'),
    A('fi-michelangelo', '오후'),
    R('fi-dalloste3', '19:30', '저녁 · TheFork 예약 · 비스테카 알라 피오렌티나', 'Trattoria Dalloste (예약)'),
    R('fi-hotel', '밤', '숙소 복귀'),
  ] },
  { id: 'd11', date: '2026-10-30', city: 'tuscany', title: '피렌체 → 끼안띠', stops: [
    R('fi-hotel', '오전', '체크아웃'),
    T('오전', '렌터카 픽업', '아직 미정'),
    R('tu-hotel', '오후', '체크인'),
  ] },
  { id: 'd12', date: '2026-10-31', city: 'florence', title: '끼안띠 → 더 몰 → 피렌체', stops: [
    R('tu-hotel', '오전', '체크아웃'),
    A('tu-mall', '오후'),
    R('fi-hotel2', '오후', '체크인'),
    A('fi-giglio', '저녁'),
    A('fi-antica', '밤'),
    R('fi-hotel2', '밤', '숙소 복귀'),
  ] },
  { id: 'd13', date: '2026-11-01', city: 'florence', title: '피렌체 → 로마 · 귀국', stops: [
    R('fi-hotel2', '오전', '체크아웃'),
    R('rm-fco', '오후', '귀국'),
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
