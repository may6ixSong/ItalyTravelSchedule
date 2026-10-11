# 이탈리아 여행 오프라인 PWA — 인수인계

## 목표
이탈리아 여행(10/20 로마 도착 ~ 11/1 로마 출국, 13일) 일정을 **지도 기준**으로 보여주는 개인용 앱.
인터넷이 잘 안 터지는 곳에서도 안드로이드/iOS 모두에서 볼 수 있어야 함. 사용자는 2명(나 + 동행 1명).

## 요구사항
1. 일정을 지도 위에 **순서대로 번호 마커**로 표시 (트리플 앱 스타일), 일자별로 보기
2. 후보군(식당 / 카페 / 펍 등)을 미리 등록하고 **카테고리 필터**로 지도에서 보기
3. 장소 간 이동 시 **구글맵 길찾기 링크** 연동 (`https://www.google.com/maps/dir/?api=1&destination=...`) — 이건 온라인 필요
4. 장소 등록 시 구글맵에서 사진 / 리뷰 몇 개 / 영업시간을 **미리 읽어와서 앱에 포함**
5. **오프라인 동작** (안드로이드 + iOS)
6. 온라인일 때 내가 추가한 장소가 상대방 폰에도 보임 (서버 직접 운영 없이)

## 결정된 방향
- **형식: PWA** — React + Vite + `vite-plugin-pwa` (사용자는 React/Python 경험 있음, **TypeScript는 안 써봄** → JS 또는 가벼운 TS 여부는 시작 시 확인)
- **지도**: 구글 지도 JS API는 오프라인 불가 → **MapLibre GL + PMTiles(오프라인 벡터 타일)** 또는 **Leaflet + OSM 타일 사전 캐시**. 방문 도시(로마·나폴리·카프리·소렌토·포지타노·피렌체·피사·끼안티/토스카나) 범위만 추출
- **데이터**: 기본 일정·사진·리뷰·영업시간은 **정적 파일로 앱에 포함**, 두 사람이 추가한 장소만 공유 DB에 저장해서 앱이 합쳐서 렌더링
- **공유(서버 없음)**: **Firebase Firestore** 1순위 (오프라인 퍼시스턴스 + 실시간 동기화 내장, 장소 1개 = 문서 1개라 충돌 거의 없음, 보안 규칙으로 두 사람 구글 계정만 허용). 대안: GitHub 저장소의 places.json / 수동 JSON 내보내기·가져오기
- **장소 등록 파이프라인**: PC에서 스크립트가 Places API 호출 → `places.json` + 이미지 파일 생성 → 빌드·배포 (GitHub Pages 가능)

## 현실적인 제약 (설계에 반영할 것)
- **구글 Places 약관**: `place_id` 외 데이터의 장기 저장·캐싱 제한. 개인 용도라도 주의 → 리뷰는 몇 개만 텍스트로, 사진은 개인 소장용으로 제한. **공유 DB(Firestore)에는 place_id, 좌표, 직접 쓴 메모, 카테고리만** 저장
- **Firebase Storage는 결제 계정 등록 필요** → 사진은 DB가 아니라 정적 파일로
- **iOS Safari는 오래 안 쓴 PWA 캐시를 지울 수 있음** → 출국 전 홈 화면에 추가 + 한 번 열기 + 비행기 모드 테스트 필수
- 오프라인에서 추가한 장소는 상대 폰에 즉시 안 보임 (온라인 복귀 후 동기화)
- 길찾기 링크는 온라인 필요 → 구글맵 앱의 "오프라인 지도 다운로드" 병행 권장
- 폰트: 기존 페이지는 Google Fonts 사용 → PWA에서는 **폰트 파일을 앱에 포함**해야 오프라인에서 보임

## 기존 데이터 (`itinerary-source.html`)
기존 Claude 아티팩트 "이탈리아 여행 일정"의 전체 HTML. 재활용할 부분:
- `DAYS` 배열 (약 597~730행): d1~d13, 각 날짜의 `date, weekday, city, title, stops[]`
  - stop 필드: `time, title, place, type(travel|breakfast|meal|sight|drink|free), tag(confirmed|suggested)`
- `COFFEE` 배열 (도시별 카페: `name, placeId, address, note, hours`)
- `RESTAURANTS` 배열 (도시별 식당: 위 필드 + `landmark`)
- 마트 쇼핑 리스트 (치오바 핫초코, 보로탈코, Rio 참치 파테, Polenghi 레몬즙)
- 도시 색상: 로마 / 나폴리 / 포지타노 / 피렌체 / 토스카나 (CSS 변수로 정의됨)

**빠진 것**: 대부분 장소에 **좌표(위도·경도)가 없음** (주소 문자열 + 일부 Place ID만 있음). 일정 카드와 카페·식당 목록이 따로 있어서 **하나의 `places.json`으로 통합** 필요.

일정 흐름: 로마(10/20~22) → 나폴리(10/23~25, 10/24 카프리) → 포지타노(10/26) → 피렌체(10/27~29, 10/29 피사 당일) → 끼안티(10/30) → 더 몰 아울렛 → 피렌체(10/31) → 로마 → 출국(11/1)

## 제안하는 데이터 모델 (초안)
```json
{
  "id": "faro-rome",
  "name": "Faro - Caffè Specialty",
  "city": "rome",
  "category": "cafe",
  "lat": 41.9, "lng": 12.5,
  "placeId": "ChIJ...",
  "address": "Via Piave 55",
  "hours": "매일 08:00–16:00",
  "note": "...",
  "photos": ["photos/faro-1.jpg"],
  "reviews": ["..."],
  "itinerary": { "day": "d2", "order": 2, "time": "오전", "status": "confirmed" }
}
```
`itinerary`가 없으면 후보군. `category`: sight / meal / cafe / pub / travel / shop 등.

## 사용자가 직접 해야 하는 것
- Firebase 프로젝트 생성 (Firestore 활성화, 두 구글 계정 허용 규칙은 Claude Code가 작성)
- Google Cloud에서 Places API 키 발급 (PC 수집 스크립트용 — 앱에는 넣지 않음)
- 동행자의 구글 계정 이메일 확인

## 진행 순서 제안
1. 기존 `DAYS`/`COFFEE`/`RESTAURANTS` → `places.json`으로 변환 + 좌표 채우기 (지명 기준 → 지오코딩 → 사람이 검수)
2. React + Vite + PWA 뼈대, 지도(번호 마커 + 일자 탭 + 카테고리 필터) + 하단 시트(장소 상세 + 구글맵 길찾기 버튼)
3. 오프라인: Service Worker 프리캐시, 지도 타일(PMTiles), 폰트, 사진
4. Places API 수집 스크립트 (사진·리뷰·영업시간)
5. Firestore 연동 (추가 장소 동기화, 오프라인 퍼시스턴스)
6. GitHub Pages 배포 → 두 폰에서 홈 화면 추가 → 비행기 모드 테스트

## Claude Code에 붙여넣을 첫 프롬프트
> 이 폴더의 HANDOFF.md와 itinerary-source.html을 읽고, 이탈리아 여행 오프라인 PWA 프로젝트를 시작하자. 먼저 1번(기존 일정 데이터를 places.json으로 변환하고 좌표 채우기)부터 진행하고, 시작 전에 JS/TS 선택과 지도 타일 방식(MapLibre+PMTiles vs Leaflet)에 대해 짧게 확인해줘.
