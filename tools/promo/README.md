# Ouk Chatrang promo video (vertical, 30 s)

Scripts that record the real game in a headless browser and turn the recordings into a
1080×1920, about 30-second MP4 ad with Khmer and English captions, the game's own music
and sounds, and a "Play free · oukkhmer.com" end card.

Nothing generated is committed (recordings, audio, caption images, fonts, the MP4). Everything
goes in one working folder, `$PROMO_WORK` (default `/tmp/ouk-promo`), and can be rebuilt.

## Steps

From the repository root:

```bash
export PROMO_WORK=/tmp/ouk-promo
bash tools/promo/setup.sh                          # libraries + Khmer font into $PROMO_WORK/cache (npm)
python3 -m http.server 8791 >/dev/null 2>&1 &      # the recorder opens http://127.0.0.1:8791/index.html
cd tools/promo
node audio.js                                      # music_khmer1.wav, move/capture/win sounds from the game's own synth
node overlays.js                                   # caption bands: ov/intro, play, themes, learn, win
bash runall.sh                                     # the four scenes, two at a time (about 30 min)
node endcard.js                                    # ov/end.png, over a blurred frame of the play scene
python3 assemble.py                                # -> $PROMO_WORK/ouk-chatrang-promo-30s-vertical.mp4
```

`runall.sh` writes `$PROMO_WORK/all.done` when all four scenes are recorded, and a log per scene
(`log_play.txt` …). One scene can be re-recorded alone: `K=110 node scene.js win`.

## How the recording works

A software-rendered WebGL page in a container draws only a few frames a second, so the recorder
slows the page's whole clock instead (`rec.js`):

- `performance.now`, `Date.now`, `setTimeout`/`setInterval` and `requestAnimationFrame` run
  `K` times slower (`window.__setSlow(true)`), and CSS animations are slowed with Chrome's
  `Animation.setPlaybackRate`. The page loads at normal speed and is slowed only when a scene starts.
- The window is phone-shaped (405×720 CSS px at 2× = 810×1440), and frames are grabbed with
  Chrome's `Page.captureScreenshot`, only when the game has drawn a new frame
  (`__ouk.debugRender().frames`) or every 1/30 s of game time.
- `K=110` gives about 23–27 frames per second of game time. Each scene folder in `clips/` holds
  the frames and a `timeline.json` (game time of every frame, plus when each sound played).

## The storyboard (`scene.js`, `assemble.py`)

| Segment | Length | What happens | Caption |
|---|---|---|---|
| play | 9.6 s | Wood theme; White's Ses takes a Tuuk, the computer (level 3) replies, White moves again. The intro title is shown for the first 3.6 s | អុកចត្រង្គ / OUK CHATRANG, then លេងជាមួយកុំព្យូទ័រ / Play the computer · ៦ កម្រិត · 6 levels |
| themes | 5.55 s | The board changes theme four times | ស្បែកស្រស់ស្អាតជាង ២០ / 20+ beautiful themes |
| learn | 5.55 s | A first lesson puzzle solved | រៀនលេង · ល្បែងប្រាជ្ញា / Learn to play · daily puzzles |
| win | 5.6 s | A smothered mate (e5–f7) and the win screen | អុកងាប់! / Checkmate: you win! |
| end card | 5.1 s | Logo, "Play free now", the oukkhmer.com button, Phone / Computer / Telegram, a slow push-in | |

Segments are joined with 0.35 s cross-fades. Each frame is cropped to the board area
(`crop=810:1150:0:290`), scaled to 1080 wide and placed under a 387 px caption band. The music
plays at 0.75 volume with fades; move, capture and win sounds are placed at the times the game
really played them. Output: H.264 CRF 17, AAC 192k, `+faststart`.

`pos1.json` and `pos4.json` are the two start positions (the play/themes scenes and the mate).
