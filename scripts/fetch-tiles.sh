#!/usr/bin/env bash
# 오프라인 지도 파일 만들기 (GitHub Actions에서 배포할 때 실행됩니다).
#  - overview.pmtiles : 이탈리아 중부~남부 전체, 줌 9까지 (작음)
#  - detail.pmtiles   : scripts/regions.geojson의 도시 영역만, 줌 15까지
#  - route.pmtiles    : scripts/route-corridors.geojson의 도시 사이 이동 경로(폭 약 14km), 줌 13까지
#  - basemaps-assets  : 지도 글자(폰트)와 아이콘
# 원본은 Protomaps의 OpenStreetMap 일일 빌드입니다. 영역을 바꾸려면 regions.geojson만 고치면 됩니다.
set -euo pipefail
OUT="${1:-public}"
mkdir -p "$OUT/tiles" "$OUT/basemaps-assets"
WORK="$(mktemp -d)"

# pmtiles CLI
if ! command -v pmtiles >/dev/null; then
  URL="$(curl -fsSL https://api.github.com/repos/protomaps/go-pmtiles/releases/latest | grep -o 'https://[^"]*Linux_x86_64.tar.gz' | head -1)"
  curl -fsSL "$URL" | tar xz -C "$WORK" pmtiles
  PMTILES="$WORK/pmtiles"
else
  PMTILES=pmtiles
fi

# 가장 최근 일일 빌드 찾기
SRC=""
for i in $(seq 0 20); do
  d="$(date -u -d "-$i day" +%Y%m%d)"
  if curl -fsI "https://build.protomaps.com/$d.pmtiles" >/dev/null 2>&1; then
    SRC="https://build.protomaps.com/$d.pmtiles"
    break
  fi
done
[ -n "$SRC" ] || { echo "Protomaps 빌드를 찾지 못했어요" >&2; exit 1; }
echo "source: $SRC"

"$PMTILES" extract "$SRC" "$OUT/tiles/overview.pmtiles" --bbox=9.8,40.3,15.0,44.2 --maxzoom=9 --download-threads=4
"$PMTILES" extract "$SRC" "$OUT/tiles/detail.pmtiles" --region="$(dirname "$0")/regions.geojson" --maxzoom=15 --download-threads=4

git clone --depth 1 https://github.com/protomaps/basemaps-assets "$WORK/assets"
mkdir -p "$OUT/basemaps-assets/fonts" "$OUT/basemaps-assets/sprites"
for f in "Noto Sans Regular" "Noto Sans Medium" "Noto Sans Italic"; do
  cp -r "$WORK/assets/fonts/$f" "$OUT/basemaps-assets/fonts/"
done
cp -r "$WORK/assets/sprites/v4" "$OUT/basemaps-assets/sprites/"
# 이동 경로 지도는 실패해도 나머지(도시 지도 · 글자)는 그대로 쓰도록 마지막에 받습니다.
"$PMTILES" extract "$SRC" "$OUT/tiles/route.pmtiles" --region="$(dirname "$0")/route-corridors.geojson" --maxzoom=13 --download-threads=4 || { echo "route.pmtiles 실패" >&2; rm -f "$OUT/tiles/route.pmtiles"; }
ls -la "$OUT/tiles"
