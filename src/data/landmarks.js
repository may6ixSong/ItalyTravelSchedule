// 지도에 늘 보이는 기준점(구글맵처럼): 기차역 · 항구 · 공항 · 유명 관광지. 일정 · 후보와 상관없이 위치 감만 잡는 용도라
// 좌표는 대략값이에요. 앱 안에 들어 있어서 오프라인에서도 보여요.
// kind: airport | station | port | sight   (지도를 넓게 볼 때는 공항 · 큰 역만, 확대할수록 더 많이 보여요)

const L = (id, kind, city, name, lat, lng) => ({ id: `lm-${id}`, kind, city, name, lat, lng, landmark: true, cat: kind === 'sight' ? 'sight' : 'transit' });

export const LANDMARKS = [
  /* 로마 */
  L('fco', 'airport', 'rome', '피우미치노 공항 (FCO)', 41.8003, 12.2389),
  L('cia', 'airport', 'rome', '참피노 공항 (CIA)', 41.7994, 12.5949),
  L('termini', 'station', 'rome', '로마 테르미니역', 41.901, 12.5018),
  L('tiburtina', 'station', 'rome', '로마 티부르티나역', 41.9106, 12.5306),
  L('ostiense', 'station', 'rome', '로마 오스티엔세역', 41.8722, 12.4848),
  L('sanpietro', 'station', 'rome', '로마 산 피에트로역', 41.8977, 12.4559),
  L('angelo', 'sight', 'rome', '산탄젤로 성', 41.9031, 12.4663),
  L('stpeter', 'sight', 'rome', '성 베드로 광장', 41.9022, 12.4568),
  L('popolo', 'sight', 'rome', '포폴로 광장', 41.9107, 12.4763),
  L('borghese', 'sight', 'rome', '보르게세 공원 · 미술관', 41.9142, 12.4922),
  L('campidoglio', 'sight', 'rome', '캄피돌리오 광장', 41.8934, 12.4828),
  L('circo', 'sight', 'rome', '치르코 마시모', 41.8861, 12.4851),
  L('caracalla', 'sight', 'rome', '카라칼라 욕장', 41.8792, 12.4924),
  L('fiori', 'sight', 'rome', '캄포 데 피오리', 41.8956, 12.4722),
  L('trastevere', 'sight', 'rome', '산타 마리아 인 트라스테베레', 41.8894, 12.4703),
  L('maggiore', 'sight', 'rome', '산타 마리아 마조레 대성당', 41.8976, 12.4984),
  L('quirinale', 'sight', 'rome', '퀴리날레 궁전', 41.8996, 12.4871),

  /* 나폴리 · 카프리 · 근교 */
  L('nap', 'airport', 'naples', '나폴리 공항 (NAP)', 40.886, 14.2908),
  L('centrale', 'station', 'naples', '나폴리 중앙역 (가리발디)', 40.853, 14.2725),
  L('montesanto', 'station', 'naples', '몬테산토역 (치르쿰플레그레아)', 40.8475, 14.2465),
  L('beverello', 'port', 'naples', '몰로 베베렐로 (페리)', 40.838, 14.256),
  L('portamassa', 'port', 'naples', '칼라타 포르타 디 마사 (페리)', 40.842, 14.262),
  L('capriport', 'port', 'naples', '카프리 마리나 그란데 항구', 40.5564, 14.2388),
  L('sorrento', 'port', 'naples', '소렌토 항구', 40.6305, 14.3765),
  L('museo', 'sight', 'naples', '나폴리 국립 고고학 박물관', 40.8535, 14.2508),
  L('reale', 'sight', 'naples', '나폴리 왕궁', 40.8361, 14.2499),
  L('umberto', 'sight', 'naples', '갈레리아 움베르토 1세', 40.8386, 14.2496),
  L('chiara', 'sight', 'naples', '산타 키아라 수도원', 40.8467, 14.2525),
  L('sansevero', 'sight', 'naples', '산세베로 예배당', 40.8494, 14.2551),
  L('gregorio', 'sight', 'naples', '산 그레고리오 아르메노 거리', 40.851, 14.2575),
  L('ovo', 'sight', 'naples', '카스텔 델 오보', 40.8282, 14.2475),
  L('pompei', 'sight', 'naples', '폼페이 유적', 40.7484, 14.4848),
  L('vesuvio', 'sight', 'naples', '베수비오 화산', 40.8213, 14.426),
  L('piazzetta', 'sight', 'naples', '카프리 피아체타', 40.5506, 14.2426),

  /* 포지타노 · 아말피 해안 */
  L('poport', 'port', 'positano', '포지타노 선착장', 40.6272, 14.4858),
  L('spiaggia', 'sight', 'positano', '스피아자 그란데 (해변)', 40.6278, 14.4866),
  L('assunta', 'sight', 'positano', '산타 마리아 아순타 성당', 40.6283, 14.4862),
  L('fornillo', 'sight', 'positano', '포르닐로 해변', 40.6262, 14.4815),
  L('amalfi', 'port', 'positano', '아말피 항구', 40.6335, 14.6025),
  L('ravello', 'sight', 'positano', '라벨로', 40.6491, 14.6117),

  /* 피렌체 */
  L('flr', 'airport', 'florence', '피렌체 공항 (FLR)', 43.81, 11.2051),
  L('smn', 'station', 'florence', '피렌체 산타 마리아 노벨라역', 43.7764, 11.248),
  L('campomarte', 'station', 'florence', '피렌체 캄포 디 마르테역', 43.7766, 11.2785),
  L('pitti', 'sight', 'florence', '피티 궁전', 43.7652, 11.25),
  L('boboli', 'sight', 'florence', '보볼리 정원', 43.7625, 11.248),
  L('vecchiopal', 'sight', 'florence', '베키오 궁전', 43.7693, 11.2563),
  L('lorenzo', 'sight', 'florence', '산 로렌초 성당 · 메디치 예배당', 43.775, 11.2537),
  L('bargello', 'sight', 'florence', '바르젤로 미술관', 43.7704, 11.2582),
  L('spirito', 'sight', 'florence', '산토 스피리토 광장', 43.7665, 11.248),
  L('miniato', 'sight', 'florence', '산 미니아토 알 몬테', 43.7596, 11.265),
  L('fiesole', 'sight', 'florence', '피에솔레', 43.807, 11.293),

  /* 피사 */
  L('psa', 'airport', 'pisa', '피사 공항 (PSA)', 43.6839, 10.3927),
  L('pisac', 'station', 'pisa', '피사 중앙역', 43.7085, 10.398),
  L('rossore', 'station', 'pisa', '피사 산 로소레역 (사탑 근처)', 43.721, 10.392),
  L('pisaduomo', 'sight', 'pisa', '피사 두오모 · 세례당', 43.723, 10.396),

  /* 끼안띠 · 토스카나 */
  L('greve', 'sight', 'tuscany', '그레베 인 끼안띠', 43.584, 11.3165),
  L('panzano', 'sight', 'tuscany', '판자노 인 끼안띠', 43.545, 11.311),
  L('siena', 'sight', 'tuscany', '시에나', 43.3188, 11.3308),
  L('gimignano', 'sight', 'tuscany', '산 지미냐노', 43.4677, 11.0432),
];

export const LANDMARK_BY_ID = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));
