# CLAUDE.md — 이 저장소에서 작업하는 AI 에이전트 규칙

## 반영 방식 (사용자 요청, 2026-10-16)
- 사용자가 요청한 변경은 **main에 바로 반영**한다. 작업 브랜치에서 커밋 → 빌드 확인(`npx vite build`) → main에 push.
  main push가 GitHub Pages 배포(`.github/workflows/deploy.yml`)를 바로 돌린다. 별도 확인을 묻지 않는다.

## 장소 정보
- 장소 목록은 `src/data/places.js`. 사진 · 리뷰 · 영업시간은 `GOOGLE_PLACES_KEY` 환경변수로 `npm run fetch:places -- <id…>`를 돌려
  `public/places.json` + `public/places/<id>/`에 받는다. 키가 환경에 없으면 사용자에게 환경 설정의 시크릿으로 넣어 달라고 한다(채팅으로 받지 않는다).
