#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# process-media.sh: turn your original files into web-ready assets.
#
#   1. Put your ORIGINAL files in  media-src/  (this folder is not committed):
#        media-src/work-01.mp4   (Podcast Clips)
#        media-src/work-02.mp4   (Color Grading)
#        media-src/work-03.mp4   (AI Video Editing)
#        media-src/showreel.mp4  (optional)
#        media-src/profile.jpg   (your portrait)
#   2. Run:  npm run media
#
# For every video it creates, in public/assets/:
#   videos/work-0X-preview.mp4  silent 720x1280 loop for cards and hero (target 4-6 MB)
#   videos/work-0X.mp4          full version WITH sound for the lightbox
#   posters/work-0X.jpg/.webp   first-frame thumbnail
# For the portrait: images/ranojoy-profile-{480,800,1200}.webp + .jpg fallback
#
# If an original is missing, a clearly labelled PLACEHOLDER is generated instead
# (only when no output exists yet, so real files are never overwritten by a placeholder).
# Requires ffmpeg.
# -----------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=media-src
OUT=public/assets
FONT=$(fc-match -f '%{file}' 'Inter:semibold' 2>/dev/null || true)
mkdir -p "$OUT/videos" "$OUT/posters" "$OUT/images"

titles=("" "Podcast Clips" "Color Grading" "AI Video Editing")
tints=("" "0x1B3A2C" "0x3A2A1E" "0x1E2E3A")

make_poster () { # $1 = video in, $2 = number
  ffmpeg -loglevel error -y -ss 0.3 -i "$1" -frames:v 1 -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" -q:v 4 "$OUT/posters/work-$2.jpg"
  ffmpeg -loglevel error -y -i "$OUT/posters/work-$2.jpg" -c:v libwebp -quality 72 "$OUT/posters/work-$2.webp"
}

for n in 01 02 03; do
  i=$((10#$n))
  src="$SRC/work-$n.mp4"
  if [[ -f "$src" ]]; then
    echo "→ Processing $src"
    vf="scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30"
    # Silent, small preview loop (first 15 s max)
    ffmpeg -loglevel error -y -i "$src" -t 15 -an -vf "$vf" -c:v libx264 -profile:v high -preset slow -crf 28 \
      -pix_fmt yuv420p -movflags +faststart "$OUT/videos/work-$n-preview.mp4"
    # Full version with sound for the lightbox
    ffmpeg -loglevel error -y -i "$src" -vf "$vf" -c:v libx264 -profile:v high -preset slow -crf 24 \
      -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "$OUT/videos/work-$n.mp4"
    make_poster "$OUT/videos/work-$n-preview.mp4" "$n"
  elif [[ ! -f "$OUT/videos/work-$n-preview.mp4" ]]; then
    echo "→ No $src, generating PLACEHOLDER for work $n"
    label="PLACEHOLDER  ·  ${titles[$i]}"
    ffmpeg -loglevel error -y -f lavfi -i "gradients=s=720x1280:c0=${tints[$i]}:c1=0x0B1F17:x0=0:y0=0:x1=720:y1=1280:speed=0.015:d=8:r=30" \
      -vf "drawtext=fontfile='$FONT':text='$n':fontsize=220:fontcolor=0xE8DCC4@0.18:x=(w-tw)/2:y=(h-th)/2-120,\
drawtext=fontfile='$FONT':text='$label':fontsize=34:fontcolor=0xE8DCC4@0.85:x=(w-tw)/2:y=(h/2)+80,\
drawtext=fontfile='$FONT':text='Replace with media-src/work-$n.mp4':fontsize=24:fontcolor=0xA8B3AC@0.8:x=(w-tw)/2:y=(h/2)+140" \
      -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -movflags +faststart "$OUT/videos/work-$n-preview.mp4"
    cp "$OUT/videos/work-$n-preview.mp4" "$OUT/videos/work-$n.mp4"
    make_poster "$OUT/videos/work-$n-preview.mp4" "$n"
  fi
done

# Optional showreel
if [[ -f "$SRC/showreel.mp4" ]]; then
  ffmpeg -loglevel error -y -i "$SRC/showreel.mp4" -an -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 27 -preset slow \
    -pix_fmt yuv420p -movflags +faststart "$OUT/videos/showreel.mp4"
fi

# Portrait
if [[ -f "$SRC/profile.jpg" ]]; then
  echo "→ Processing portrait"
  for w in 480 800 1200; do
    ffmpeg -loglevel error -y -i "$SRC/profile.jpg" -vf "scale=$w:-2" -c:v libwebp -quality 78 "$OUT/images/ranojoy-profile-$w.webp"
  done
  ffmpeg -loglevel error -y -i "$SRC/profile.jpg" -vf "scale=800:-2" -q:v 4 "$OUT/images/ranojoy-profile.jpg"
elif [[ ! -f "$OUT/images/ranojoy-profile.jpg" ]]; then
  echo "→ No portrait, generating PLACEHOLDER"
  ffmpeg -loglevel error -y -f lavfi -i "gradients=s=1200x1500:c0=0x3a3a3a:c1=0x111111:x0=0:y0=0:x1=1200:y1=1500:d=1" -frames:v 1 \
    -vf "drawtext=fontfile='$FONT':text='PLACEHOLDER':fontsize=64:fontcolor=white@0.7:x=(w-tw)/2:y=(h/2)-60,\
drawtext=fontfile='$FONT':text='Your portrait  ·  media-src/profile.jpg':fontsize=38:fontcolor=white@0.5:x=(w-tw)/2:y=(h/2)+30" \
    -q:v 3 "$SRC/.placeholder-profile.jpg"
  for w in 480 800 1200; do
    ffmpeg -loglevel error -y -i "$SRC/.placeholder-profile.jpg" -vf "scale=$w:-2" -c:v libwebp -quality 78 "$OUT/images/ranojoy-profile-$w.webp"
  done
  ffmpeg -loglevel error -y -i "$SRC/.placeholder-profile.jpg" -vf "scale=800:-2" -q:v 4 "$OUT/images/ranojoy-profile.jpg"
fi

echo "✓ Media ready in $OUT"
du -sh "$OUT"/videos/* "$OUT"/posters/* "$OUT"/images/* 2>/dev/null || true
