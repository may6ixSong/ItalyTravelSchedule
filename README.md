# ItalyTravel (오프라인 이탈리아 여행 PWA)

10/20 – 11/1 이탈리아 여행용 앱입니다. 지도 위 일정 번호 마커, 후보 필터, 예약 · 당일 알림, 준비 체크리스트, 함께 쓰는 가계부, 여행 이탈리아어, 장소별 기록(평점 · 노트 · 사진)이 있어요. 인터넷이 없어도 저장된 데이터로 열립니다.

- 배포 주소: https://may6ixsong.github.io/ItalyTravelSchedule/
- 화면 폭에 맞춰 늘어나고 줄어듭니다. 갤럭시 폴드를 펼치면 장소 정보가 오른쪽 패널로 나와요.

## 1. 처음 한 번 해야 할 일 (GitHub Pages 켜기)

1. GitHub 저장소 → **Settings → Pages**
2. **Build and deployment → Source**를 **GitHub Actions**로 바꾸기
3. **Actions** 탭에서 `Deploy to GitHub Pages`를 열고 실패한 실행이 있으면 **Re-run all jobs** (Pages를 켜기 전에 돌아간 실행은 실패해요)

이후에는 `main`에 push할 때마다 자동으로 배포됩니다. 배포 중에 오프라인 지도(로마 · 나폴리 · 카프리 · 포지타노 · 피렌체 · 피사 · 끼안띠)도 같이 받아와요.

## 2. Firebase 설정 (두 폰이 데이터를 공유하려면)

Firebase를 설정하기 전에는 **각자 폰 안에만** 저장돼요(앱은 정상 동작). 아래를 마치고 설정값을 알려주면 공유 모드로 바뀝니다. 무료 요금제(Spark)로 충분해요.

1. https://console.firebase.google.com 접속 → **프로젝트 만들기**
   - 이름: 예) `italy-trip-2026`
   - Google 애널리틱스: **사용 안 함**
2. 왼쪽 메뉴 **빌드 → Authentication → 시작하기**
   - **로그인 방법** 탭 → **익명** → 사용 설정 → 저장
   - **설정** 탭 → **승인된 도메인** → **도메인 추가** → `may6ixsong.github.io`
3. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**
   - 버전: **Standard**, 위치: `eur3 (europe-west)` 또는 `asia-northeast3 (서울)`
   - **프로덕션 모드**로 시작
   - 만든 뒤 **규칙** 탭에 이 저장소의 [`firestore.rules`](firestore.rules) 내용을 통째로 붙여넣고 **게시**
4. 톱니바퀴 **프로젝트 설정 → 일반 → 내 앱 → 웹(`</>`) 아이콘**
   - 앱 닉네임: 예) `italy-pwa` (Firebase 호스팅은 체크하지 않음) → **앱 등록**
   - 화면에 나오는 `firebaseConfig = { ... }` 블록을 복사

### Claude에게 전달할 것

`firebaseConfig` 블록 하나면 됩니다 (6개 값):

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "italy-trip-2026.firebaseapp.com",
  projectId: "italy-trip-2026",
  storageBucket: "italy-trip-2026.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

이 값은 웹 앱에 원래 공개되는 값이라 저장소에 넣어도 괜찮아요. 보안은 `firestore.rules`(입장 코드를 맞힌 기기만 읽기 · 쓰기)가 맡습니다. 직접 넣으려면 [`src/config.js`](src/config.js)의 `firebaseConfig`에 붙여넣고 push하면 돼요.

> Firebase Storage(파일 저장소)는 결제 계정이 필요해서 쓰지 않아요. 직접 찍은 사진은 줄여서(약 1024px) Firestore에 저장합니다.

## 3. (나중에) 장소 사진 · 리뷰 미리 받기 — Google Places API 키

장소마다 구글맵 사진 3장 · 리뷰 3개 · 영업시간 · 정확한 좌표를 받아 앱에 넣어 둡니다(오프라인에서도 보임). 실제 일정을 확정한 뒤에 하면 돼요.

1. https://console.cloud.google.com → 프로젝트 선택(Firebase 프로젝트를 그대로 써도 됨)
2. **API 및 서비스 → 라이브러리 → Places API (New)** → 사용
3. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**
   - 키 제한: **API 제한 → Places API (New)** 만 허용
4. PC에서 실행 (키는 앱에 들어가지 않아요):
   ```bash
   GOOGLE_PLACES_KEY=발급받은키 npm run fetch:places
   ```
   → `public/places.json`과 `public/places/<장소id>/*.jpg`가 생기고, push하면 앱에 반영됩니다. 키를 Claude에게 주고 대신 실행해 달라고 해도 되지만, 이 작업 환경에서는 구글 API 접속이 막혀 있을 수 있어요.

## 4. 폰에 설치

- **갤럭시 (크롬)**: 배포 주소 열기 → 메뉴 ⋮ → **홈 화면에 추가**
- **아이폰 (사파리)**: 배포 주소 열기 → 공유 버튼 → **홈 화면에 추가**
- 처음 열면 입장 코드 **1234** → 이름(필수) · 사진(선택). 다음부터는 묻지 않아요.
- **나** 탭 → **오프라인 지도 받기**를 출국 전에 와이파이에서 한 번 눌러 두세요.
- 출국 전에 **비행기 모드**로 앱을 한 번 열어 보세요. 아이폰은 오래 안 쓴 웹앱 데이터를 지울 수 있어서 홈 화면에 추가해서 쓰는 게 좋아요.

## 데이터 바꾸기 (실제 일정이 정해지면)

| 파일 | 내용 |
|---|---|
| `src/data/places.js` | 장소 목록 (이름 · 종류 · 좌표 · 주소 · 메모 · Place ID) |
| `src/data/itinerary.js` | 날짜별 일정 (순서대로 번호 마커) |
| `src/data/bookings.js` | 숙소 · 기차 · 페리 · 항공 · 투어 · 렌터카 예약 (당일 알림) |
| `src/data/checklistSeed.js` | 체크리스트 처음 항목 (앱에서 추가 · 수정 가능) |
| `src/data/phrases.js` | 여행 이탈리아어 |
| `scripts/regions.geojson` | 오프라인 지도로 받을 영역 |

코드에 있는 장소 · 일정이 **기본값**이고, 앱에서 고친 내용은 공유 DB에 따로 저장돼 그 위에 덮어씌워져요. 코드를 바꿔 다시 배포해도 앱에서 고친 내용은 그대로 남아요.

- **장소 직접 등록**: 지도 오른쪽 `+` 버튼 → 구글맵 링크를 붙여넣으면 이름 · 좌표를 읽어요 (짧은 링크 `maps.app.goo.gl`는 좌표가 없어서 "지도에서 찍기"로 위치를 정해요). 저장 위치: `settings/userPlaces`
- **장소 고치기 · 숨기기**: 장소 상세 → `정보 고치기`. 코드 장소는 `원래 정보로`로 되돌릴 수 있어요.
- **일정 고치기**: 지도 탭 일정 목록 → `고치기` (순서 · 시간 · 확정/추천 · 메모, 장소 없는 항목 추가). 코드 일정을 고친 내용은 `settings/planOverrides`에 저장되고 `원래대로`로 되돌릴 수 있어요. `다른 일정`으로 만든 일정은 `settings/customPlans`.

## 개발

```bash
npm install
npm run dev      # http://localhost:5173 — 입장 코드 없이 admin으로 바로 들어감
npm run build    # dist/
```

- 기술: React + Vite + vite-plugin-pwa(서비스 워커), MapLibre GL + PMTiles(오프라인 벡터 지도), Firebase(Firestore 오프라인 캐시 + 익명 로그인)
- Firebase 설정이 비어 있으면 localStorage에 저장하는 로컬 모드로 동작합니다.
- 오프라인 지도 파일(`public/tiles`)이 없는 빌드는 온라인 OSM 지도를 씁니다.
