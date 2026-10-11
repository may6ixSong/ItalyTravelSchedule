export const THEMES = [
  { id: 'food', label: '식비' },
  { id: 'shop', label: '쇼핑 · 선물' },
  { id: 'transport', label: '교통' },
  { id: 'stay', label: '숙박' },
  { id: 'tour', label: '투어 · 입장권' },
  { id: 'public', label: '공공시설' },
  { id: 'telecom', label: '통신' },
  { id: 'fine', label: '벌금' },
  { id: 'citytax', label: '도시세' },
  { id: 'tip', label: '팁 · 자릿세' },
  { id: 'pharmacy', label: '약국 · 의료' },
  { id: 'exchange', label: '환전 · 수수료' },
  { id: 'etc', label: '기타' },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));
