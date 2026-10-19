// 추억 앨범 레이아웃 20종과 페이지 만들기.
// 페이지는 가로 12 x 세로 16 칸. 칸 모양(가로/세로/정사각)에 맞는 방향의 사진이 들어가요.
// slot: [x, y, w, h, 회전(도)]
// theme: 배경 · 사진 테두리 모양 (styles.css의 .apage.<theme>)
// deco: 날짜 장식 — stamp(점선 도장) · title(큰 도시 이름) · memo(날짜 + 그날 일정 제목)

export const LAYOUTS = [
  // ---- 2장 ----
  { id: 1, name: '폴라로이드 두 장', theme: 'paper polaroid', slots: [[0.6, 0.9, 6, 8.4, -5], [5.4, 7, 6, 8.4, 4]], deco: { type: 'stamp', x: 8.6, y: 0.7, w: 2.7, h: 2.3 } },
  { id: 2, name: '나란히 세로 + 메모', theme: 'paper', slots: [[0.6, 3.8, 5.3, 8.2], [6.1, 3.8, 5.3, 8.2]], deco: { type: 'memo', x: 0.7, y: 0.7 } },
  { id: 3, name: '위아래 가로', theme: 'clean', slots: [[0.5, 0.5, 11, 7.4], [0.5, 8.1, 11, 7.4]] },
  { id: 4, name: '가로 + 세로', theme: 'sage', slots: [[0.6, 0.6, 10.8, 6.6], [5.4, 7.6, 6, 7.8]], deco: { type: 'stamp', x: 1.2, y: 9.6, w: 3.4, h: 3 } },
  // ---- 3장 ----
  { id: 5, name: '히어로 + 2', theme: 'clean', slots: [[0.5, 0.5, 11, 7], [0.5, 8, 5.4, 7.5], [6.1, 8, 5.4, 7.5]] },
  { id: 6, name: '필름 스트립', theme: 'film', slots: [[1.4, 0.7, 9.2, 4.6], [1.4, 5.7, 9.2, 4.6], [1.4, 10.7, 9.2, 4.6]] },
  { id: 7, name: '매거진', theme: 'navy', slots: [[0.6, 3.9, 10.8, 6.3], [0.6, 10.4, 5.2, 5], [6.2, 10.4, 5.2, 5]], deco: { type: 'title', x: 0.6, y: 0.5 } },
  { id: 8, name: '세로 셋', theme: 'paper', slots: [[0.5, 1.2, 3.5, 8.4, -2], [4.25, 2.6, 3.5, 8.4, 1], [8, 1.2, 3.5, 8.4, 2]], deco: { type: 'memo', x: 0.7, y: 12.4 } },
  // ---- 4장 ----
  { id: 9, name: '2x2 그리드', theme: 'clean', slots: [[0.5, 0.5, 5.4, 7.4], [6.1, 0.5, 5.4, 7.4], [0.5, 8.1, 5.4, 7.4], [6.1, 8.1, 5.4, 7.4]] },
  { id: 10, name: '가로 하나 + 세로 셋', theme: 'paper', slots: [[0.5, 0.5, 11, 6.8], [0.5, 7.5, 3.5, 5.2], [4.25, 7.5, 3.5, 5.2], [8, 7.5, 3.5, 5.2]], deco: { type: 'memo', x: 0.7, y: 13.1 } },
  { id: 11, name: '폴라로이드 넷', theme: 'kraft polaroid', slots: [[0.5, 0.6, 5.6, 7, -4], [6, 0.9, 5.6, 7, 3], [0.6, 8.2, 5.6, 7, 2], [5.9, 8.4, 5.6, 7, -3]] },
  { id: 12, name: '대각 테이프', theme: 'blush tape', slots: [[0.7, 0.9, 7, 4.8, -3], [4.3, 5.4, 7, 4.6, 2], [0.8, 10.2, 5, 5.2, -2], [6.2, 10.4, 5, 5, 3]] },
  // ---- 5장 ----
  { id: 13, name: '테이프 콜라주', theme: 'kraft tape', slots: [[0.8, 0.9, 6, 4.2, -3], [7.2, 0.8, 4, 5.6, 3], [0.9, 5.9, 4.4, 6, 2], [5.8, 6.9, 5.4, 3.7, -2], [5.9, 11.2, 5.4, 3.9, 3]] },
  { id: 14, name: '히어로 + 4', theme: 'clean', slots: [[0.5, 0.5, 11, 6.6], [0.5, 7.3, 5.4, 4], [6.1, 7.3, 5.4, 4], [0.5, 11.5, 5.4, 4], [6.1, 11.5, 5.4, 4]] },
  { id: 15, name: '모자이크 5', theme: 'clean', slots: [[0.5, 0.5, 6.4, 9.5], [7.1, 0.5, 4.4, 4.6], [7.1, 5.4, 4.4, 4.6], [0.5, 10.3, 5.4, 5.2], [6.1, 10.3, 5.4, 5.2]] },
  { id: 16, name: '세로 셋 + 가로 둘', theme: 'sage', slots: [[0.5, 0.5, 3.5, 6.6], [4.25, 0.5, 3.5, 6.6], [8, 0.5, 3.5, 6.6], [0.5, 7.4, 5.4, 4.6], [6.1, 7.4, 5.4, 4.6]], deco: { type: 'memo', x: 0.7, y: 12.9 } },
  // ---- 6장 ----
  { id: 17, name: '6분할 그리드', theme: 'clean', slots: [[0.5, 0.5, 5.4, 4.8], [6.1, 0.5, 5.4, 4.8], [0.5, 5.6, 5.4, 4.8], [6.1, 5.6, 5.4, 4.8], [0.5, 10.7, 5.4, 4.8], [6.1, 10.7, 5.4, 4.8]] },
  { id: 18, name: '세로 모자이크', theme: 'clean', slots: [[0.5, 0.5, 6.4, 9.5], [7.1, 0.5, 4.4, 4.6], [7.1, 5.4, 4.4, 4.6], [0.5, 10.3, 3.5, 5.2], [4.25, 10.3, 3.5, 5.2], [8, 10.3, 3.5, 5.2]] },
  { id: 19, name: '필름 여섯', theme: 'film', slots: [[1.3, 0.7, 4.6, 4.6], [6.1, 0.7, 4.6, 4.6], [1.3, 5.7, 4.6, 4.6], [6.1, 5.7, 4.6, 4.6], [1.3, 10.7, 4.6, 4.6], [6.1, 10.7, 4.6, 4.6]] },
  { id: 20, name: '폴라로이드 여섯', theme: 'paper polaroid', slots: [[0.5, 0.4, 5.4, 5, -3], [6.1, 0.6, 5.4, 5, 2], [0.6, 5.6, 5.4, 5, 2], [6, 5.8, 5.4, 5, -2], [0.5, 10.8, 5.4, 5, -1], [6.1, 10.9, 5.4, 5, 3]] },
];

export const slotOrient = ([, , w, h]) => (w / h > 1.15 ? 'L' : w / h < 0.87 ? 'P' : 'S');

// 같은 seed면 같은 결과 (화면을 다시 그려도 레이아웃이 바뀌지 않게)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 칸에 사진 넣기: 가로 칸 ← 가로 사진, 세로 칸 ← 세로 사진, 그다음 남은 칸에 남은 사진.
// 사진이 칸보다 적으면 남는 칸은 null (그리지 않아요).
export function fill(layout, photos) {
  const out = layout.slots.map(() => null);
  const left = [...photos];
  const put = (want, match) =>
    layout.slots.forEach((s, i) => {
      if (out[i] || slotOrient(s) !== want) return;
      const k = left.findIndex(match);
      if (k >= 0) out[i] = left.splice(k, 1)[0];
    });
  put('L', (p) => p.o === 'L');
  put('P', (p) => p.o === 'P');
  put('S', () => true);
  put('L', () => true);
  put('P', () => true);
  return out;
}

// 칸 방향과 사진 방향이 얼마나 맞는지
function fitScore(layout, photos) {
  const c = { L: 0, P: 0, S: 0 };
  layout.slots.forEach((s) => c[slotOrient(s)]++);
  const nL = photos.filter((p) => p.o === 'L').length;
  const nP = photos.filter((p) => p.o === 'P').length;
  return Math.min(nL, c.L) + Math.min(nP, c.P) + Math.min(photos.length, c.S) * 0.8;
}

// 사진 n장을 2~6장짜리 페이지 묶음으로 랜덤하게 나누기
function chunkSizes(n, rand) {
  const sizes = [];
  let left = n;
  while (left > 0) {
    if (left <= 6) {
      sizes.push(left);
      break;
    }
    let k = 3 + Math.floor(rand() * 4); // 3~6
    if (left - k === 1) k -= 1; // 마지막에 한 장만 남지 않게
    sizes.push(k);
    left -= k;
  }
  return sizes;
}

// 하루치 사진 → 앨범 페이지들 [{ layout, cells: [photo|null...] }]
// 레이아웃은 사진 수와 같은 칸 수(가끔 한 칸 더 많은 것)에서, 가로·세로가 잘 맞는 것 중 랜덤으로 골라요.
export function buildPages(photos, seed) {
  if (!photos.length) return [];
  const rand = rng(seed);
  const order = shuffle(photos, rand);
  const pages = [];
  let i = 0;
  for (const n of chunkSizes(order.length, rand)) {
    const group = order.slice(i, i + n);
    i += n;
    const cands = LAYOUTS.filter((l) => l.slots.length === Math.max(2, n) || (n >= 2 && l.slots.length === n + 1 && rand() < 0.35))
      .map((l) => ({ l, score: fitScore(l, group) - (l.slots.length > n ? 0.5 : 0) + rand() * 1.2 }))
      .sort((a, b) => b.score - a.score);
    const layout = cands[0].l;
    pages.push({ layout, cells: fill(layout, group) });
  }
  return pages;
}
