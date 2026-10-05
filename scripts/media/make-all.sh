#!/bin/bash
# Re-generate everything: screenshots from the live site (all /api/ calls staged, see capture.mjs),
# scene cards, post image, videos with music (see build-video.sh for the music source and loudness).
set -euo pipefail
cd "$(dirname "$0")"
node capture.mjs en; node capture.mjs ml
node compose.mjs en; node compose.mjs ml; node compose.mjs en wide; node compose.mjs post
bash build-video.sh en; bash build-video.sh ml; bash build-video.sh en wide
