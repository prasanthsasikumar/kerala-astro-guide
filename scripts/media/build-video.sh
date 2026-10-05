#!/bin/bash
# Assemble scene cards into a walkthrough with short crossfades and quiet background music.
# usage: build-video.sh <en|ml> [wide]
#   tall: media/.build/scenes-<lang>/       -> media/walkthrough-<lang>.mp4        (1080x1920)
#   wide: media/.build/scenes-<lang>-wide/  -> media/walkthrough-<lang>-16x9.mp4   (1920x1080)
# Music: $MUSIC (default: the Lyria 3 Pro track generated with OpenMontage), taken from $MUSIC_START s,
# trimmed to the video, 1 s fade in, 1.5 s fade out, two-pass loudnorm to $LUFS (default -26), AAC 160k.
set -euo pipefail
LANG_=${1:-en}; VARIANT=${2:-}
HERE="$(cd "$(dirname "$0")" && pwd)"
MEDIA="$HERE/../../../media"
SUFFIX=""; OUTSUF=""
[ "$VARIANT" = "wide" ] && { SUFFIX="-wide"; OUTSUF="-16x9"; }
SC="$MEDIA/.build/scenes-$LANG_$SUFFIX"
OUT="$MEDIA/walkthrough-$LANG_$OUTSUF.mp4"
FF=${FFMPEG:-/opt/homebrew/bin/ffmpeg}; FP=${FFPROBE:-/opt/homebrew/bin/ffprobe}
MUSIC=${MUSIC:-$HOME/Documents/GitHub/OpenMontage/projects/astro-guide-walkthrough/lyria-kerala-bg.mp3}
MUSIC_START=${MUSIC_START:-28}; LUFS=${LUFS:--26}
# each clip includes the crossfade into the next one, so a scene is on screen alone for about D - X seconds
D=2.55; BLIND=3.3; LAST=3.0; X=0.35; FPS=30
files=("$SC"/*.png); n=${#files[@]}
dur() { local i=$1; if [ "$i" -eq $((n-1)) ]; then echo $LAST; elif [ "$i" -eq $((n-2)) ]; then echo $BLIND; else echo $D; fi; }
args=(); filt=""
for i in "${!files[@]}"; do
  args+=(-loop 1 -framerate $FPS -t "$(dur "$i")" -i "${files[$i]}")
  filt+="[$i:v]format=yuv420p,setsar=1[v$i];"
done
prev="v0"; off=0
for ((i=1; i<n; i++)); do
  off=$(echo "$off + $(dur $((i-1))) - $X" | bc)
  filt+="[$prev][v$i]xfade=transition=fade:duration=$X:offset=$off[x$i];"
  prev="x$i"
done
filt="${filt%;}"
TMPV="$MEDIA/.build/video-$LANG_$SUFFIX.mp4"
"$FF" -v error -y "${args[@]}" -filter_complex "$filt" -map "[$prev]" -r $FPS -c:v libx264 -preset slow -crf 20 -tune stillimage -pix_fmt yuv420p -an "$TMPV"
LEN=$("$FP" -v error -show_entries format=duration -of csv=p=0 "$TMPV")
FO=$(echo "$LEN - 1.5" | bc)

# music: pass 1 measures, pass 2 applies (linear, so the fades and dynamics stay as they are)
PRE="atrim=0:$LEN,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1,afade=t=out:st=$FO:d=1.5"
M=$("$FF" -hide_banner -ss "$MUSIC_START" -i "$MUSIC" -af "$PRE,loudnorm=I=$LUFS:TP=-2:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$M" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
"$FF" -v error -y -i "$TMPV" -ss "$MUSIC_START" -i "$MUSIC" \
  -filter_complex "[1:a]$PRE,loudnorm=I=$LUFS:TP=-2:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -ar 48000 -t "$LEN" -movflags +faststart "$OUT"
rm -f "$TMPV"
I=$("$FF" -hide_banner -i "$OUT" -map 0:a -af ebur128 -f null - 2>&1 | sed -n '/Summary/,$p' | awk '/ I:/{print $2; exit}')
echo "wrote $OUT  (${LEN}s, music $I LUFS integrated)"
