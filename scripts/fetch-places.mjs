// 장소마다 구글맵 사진 · 리뷰 · 영업시간 · 정확한 좌표를 미리 받아서 앱에 넣는 스크립트 (PC에서 실행).
//
//   GOOGLE_PLACES_KEY=발급받은키 npm run fetch:places            # 전체
//   GOOGLE_PLACES_KEY=... npm run fetch:places -- rm-faro na-kalo   # 일부만
//
// 결과: public/places.json + public/places/<장소id>/1.jpg … (앱 설치 때 함께 저장돼 오프라인에서도 보입니다)
// 키는 앱 코드에 넣지 않습니다. Places API (New)를 사용합니다. 장소당 사진 3장 · 리뷰 3개.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PLACES } from '../src/data/places.js';

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) {
  console.error('GOOGLE_PLACES_KEY 환경변수가 필요해요.');
  process.exit(1);
}
const only = process.argv.slice(2);
const OUT = 'public/places.json';
const PHOTOS = 3;
const REVIEWS = 3;
const FIELDS = 'id,displayName,formattedAddress,location,rating,userRatingCount,regularOpeningHours.weekdayDescriptions,reviews,photos,googleMapsUri';

const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : {};
const headers = { 'X-Goog-Api-Key': KEY, 'Content-Type': 'application/json' };

async function findId(p) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { ...headers, 'X-Goog-FieldMask': 'places.id,places.displayName' },
    body: JSON.stringify({
      textQuery: `${p.name} ${p.address || ''}`,
      languageCode: 'ko',
      locationBias: { circle: { center: { latitude: p.lat, longitude: p.lng }, radius: 3000 } },
    }),
  });
  const j = await r.json();
  return j.places?.[0]?.id;
}

const WEEK_KO = { Monday: '월', Tuesday: '화', Wednesday: '수', Thursday: '목', Friday: '금', Saturday: '토', Sunday: '일' };

for (const p of PLACES) {
  if (only.length && !only.includes(p.id)) continue;
  if (p.cat === 'transit') continue;
  try {
    const placeId = p.placeId || (await findId(p));
    if (!placeId) {
      console.warn('못 찾음', p.id, p.name);
      continue;
    }
    const r = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=ko`, { headers: { ...headers, 'X-Goog-FieldMask': FIELDS } });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);

    const dir = `public/places/${p.id}`;
    await mkdir(dir, { recursive: true });
    const photos = [];
    const credits = new Set();
    for (const [i, ph] of (d.photos || []).slice(0, PHOTOS).entries()) {
      const img = await fetch(`https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=900&key=${KEY}`);
      if (!img.ok) continue;
      await writeFile(`${dir}/${i + 1}.jpg`, Buffer.from(await img.arrayBuffer()));
      photos.push(`places/${p.id}/${i + 1}.jpg`);
      (ph.authorAttributions || []).forEach((a) => credits.add(a.displayName));
    }
    prev[p.id] = {
      placeId,
      lat: d.location?.latitude ?? p.lat,
      lng: d.location?.longitude ?? p.lng,
      address: d.formattedAddress,
      rating: d.rating,
      ratingCount: d.userRatingCount,
      hours: d.regularOpeningHours?.weekdayDescriptions
        ?.map((s) => s.replace(/^(\w+day)/, (m) => WEEK_KO[m] || m))
        .join(' · '),
      gmaps: d.googleMapsUri,
      photos,
      photoCredits: [...credits],
      reviews: (d.reviews || []).slice(0, REVIEWS).map((v) => ({
        author: v.authorAttribution?.displayName,
        rating: v.rating,
        text: v.text?.text || v.originalText?.text || '',
        when: v.relativePublishTimeDescription,
      })),
      fetchedAt: new Date().toISOString(),
    };
    console.log('✓', p.id, d.displayName?.text, `사진 ${photos.length} · 리뷰 ${prev[p.id].reviews.length}`);
  } catch (e) {
    console.warn('✗', p.id, e.message);
  }
  await writeFile(OUT, JSON.stringify(prev, null, 1));
}
console.log('저장:', OUT);
