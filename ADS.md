# Ads: how the switch works

Ads are built but **off**. Nothing is requested from an ad network, and the layout does not change, until
`ads-config.json` is changed. The file is never cached by the service worker or the CDN (see `_headers`, `sw.js`),
so an edit takes effect on the next visit without an app update.

## Placements (the five scenes chosen)
| Placement | Where | Size | Config slot |
|---|---|---|---|
| Phone bar | bottom of the screen, upright phone, while playing (not Learn to Play, puzzles or online) | 320x50 | `banner` |
| Result card | inside the game-over card, phone and computer | 300x250 | `result` |
| How to play | between "Special moves" and "Check", phone and computer | 336x280 | `content` |

## See where they go (no network, this tab only)
Open `https://oukkhmer.com/?adspreview=1` (or any page with `?adspreview=1`). Turn it off with `?adspreview=0`.

## Turning real ads on (all of these are needed)
1. Be approved by the ad network (e.g. Google AdSense) for oukkhmer.com. Put the `ads.txt` line they give you at `/ads.txt`.
2. **Add a consent banner** that calls `OukAds.setConsent(true)` when a visitor agrees (and `false` when they refuse).
   Until it does, `requireConsent: true` keeps every ad switched off. Do not set `requireConsent` to `false` for EU / UK visitors.
3. Update the Privacy Policy (`tools/pages/privacy.html`, section 6) to describe advertising, then run `node tools/build-pages.js`.
4. Create three ad units (banner, result, content) and fill in `ads-config.json`:
   `{ "mode": "live", "client": "ca-pub-...", "requireConsent": true, "slots": { "banner": "...", "result": "...", "content": "..." } }`
5. A placement with an empty slot id is skipped. To switch everything off again: `"mode": "off"`.

## Notes
- The game-over card is built once per game over, so its ad is requested once per game.
- Never put ads over the board or next to buttons; accidental clicks can get an ad account banned.
