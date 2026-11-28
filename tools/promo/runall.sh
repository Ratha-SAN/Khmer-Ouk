#!/bin/bash
# the four scenes, two at a time
cd "$(dirname "$0")"
W="${PROMO_WORK:-/tmp/ouk-promo}"; mkdir -p "$W/clips"
(K=110 node scene.js play > "$W/log_play.txt" 2>&1; K=110 node scene.js win > "$W/log_win.txt" 2>&1) &
(K=110 node scene.js learn > "$W/log_learn.txt" 2>&1; K=110 node scene.js themes > "$W/log_themes.txt" 2>&1) &
wait
touch "$W/all.done"
