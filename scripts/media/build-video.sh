#!/bin/bash
# Assemble scene cards into a vertical walkthrough with crossfades.
# usage: build-video.sh <en|ml>   (needs media/.build/scenes-<lang>/ from compose.mjs)
set -euo pipefail
LANG_=${1:-en}
HERE="$(cd "$(dirname "$0")" && pwd)"
MEDIA="$HERE/../../../media"
SC="$MEDIA/.build/scenes-$LANG_"
FF=${FFMPEG:-/opt/homebrew/bin/ffmpeg}
D=3.6; LAST=4.2; X=0.5; FPS=30
files=("$SC"/*.png); n=${#files[@]}
args=(); filt=""
for i in "${!files[@]}"; do
  d=$D; [ "$i" -eq $((n-1)) ] && d=$LAST
  args+=(-loop 1 -framerate $FPS -t "$d" -i "${files[$i]}")
  filt+="[$i:v]format=yuv420p,setsar=1[v$i];"
done
prev="v0"; off=0
for ((i=1; i<n; i++)); do
  off=$(echo "$off + $D - $X" | bc)
  filt+="[$prev][v$i]xfade=transition=fade:duration=$X:offset=$off[x$i];"
  prev="x$i"
done
filt="${filt%;}"
"$FF" -v error -y "${args[@]}" -filter_complex "$filt" -map "[$prev]" -r $FPS -c:v libx264 -preset slow -crf 20 -tune stillimage -pix_fmt yuv420p -movflags +faststart -an "$MEDIA/walkthrough-$LANG_.mp4"
echo "wrote $MEDIA/walkthrough-$LANG_.mp4"
