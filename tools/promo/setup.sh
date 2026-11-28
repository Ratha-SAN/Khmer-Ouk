#!/bin/bash
# One-time setup for the promo toolkit: fills $PROMO_WORK/cache with the libraries the game loads from a CDN
# (three, react, react-dom) and the Khmer font, all from npm, so recording works without the CDN.
# Then serve the repository on port 8791 (see README.md).
set -e
W="${PROMO_WORK:-/tmp/ouk-promo}"
mkdir -p "$W/cache/cdn" "$W/cache/font" "$W/clips" "$W/ov" "$W/audio"
cd "$W/cache/cdn"
for p in three@0.160.0 react@18.3.1 react-dom@18.3.1; do
  d="$(echo "$p" | tr @ -)"
  if [ ! -d "$d/package" ]; then
    t="$(npm pack "$p" --silent | tail -1)"
    mkdir -p "$d" && tar -xzf "$t" -C "$d"
  fi
done
cd "$W/cache/font"
if [ ! -d package/files ]; then
  t="$(npm pack @fontsource/noto-sans-khmer@5.0.8 --silent | tail -1)"
  tar -xzf "$t"
fi
command -v ffmpeg >/dev/null || echo "note: ffmpeg is missing (needed by assemble.py): apt-get install -y ffmpeg"
node -e "require('playwright')" 2>/dev/null || echo "note: Playwright is missing (needed by the recorder)"
echo "promo cache ready in $W/cache"
