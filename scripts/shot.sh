#!/bin/sh
# Headless screenshot of a dev-server route: scripts/shot.sh <out.png> '<hash route>' [width] [height]
OUT="$1"; ROUTE="$2"; W="${3:-1280}"; H="${4:-1600}"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --window-size="$W,$H" --virtual-time-budget=20000 --screenshot="$OUT" "http://127.0.0.1:5180/$ROUTE" >/dev/null 2>&1
