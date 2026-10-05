#!/bin/bash
# Re-generate everything: screenshots from the live site, scene cards, post image, videos.
set -euo pipefail
cd "$(dirname "$0")"
node capture.mjs en; node capture.mjs ml
node compose.mjs en; node compose.mjs ml; node compose.mjs post
bash build-video.sh en; bash build-video.sh ml
