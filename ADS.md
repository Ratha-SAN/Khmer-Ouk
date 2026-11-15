# Ads: how the switch works

Ads are built but **off**. Nothing is requested from an ad network, and the layout does not change, until
`ads-config.json` is changed. The file is never cached by the service worker or the CDN (see `_headers`, `sw.js`),
so an edit takes effect on the next visit without an app update.

## Placements (built; only `content` is advised for AdSense)
| Placement | Where | Size | Config slot |
|---|---|---|---|
| Phone bar | bottom of the screen, upright phone, while playing (not Learn to Play, puzzles or online) | 320x50 | `banner` |
| Result card | inside the game-over card, phone and computer | 300x250 | `result` |
| Guides | one slot in the middle of each guide page (How to play, Strategy, Checkmate patterns, Counting rules, Glossary, History) | 336x280 | `content` |

## See where they go (no network, this tab only)
Open `https://oukkhmer.com/?adspreview=1` (or any page with `?adspreview=1`). Turn it off with `?adspreview=0`.

## Turning real ads on (all of these are needed)
1. Be approved by the ad network (e.g. Google AdSense) for oukkhmer.com. Put the `ads.txt` line they give you at `/ads.txt`.
2. **Consent.** For personalised ads in the EEA, UK and Switzerland Google requires a *certified* consent tool (a CMP). Use
   Google's own consent message (AdSense > Privacy & messaging) and set `"consent": "cmp"` with `"cmpScript"` = the https address of the
   script it gives you. The loader loads it first and shows no ad until it has loaded; if the address is missing or fails, there are no ads.
   (`"consent": "own"`, the default, only serves ads after `OukAds.setConsent(true)` has been called by a banner of our own; that is
   not enough for the EEA/UK. There is no setting that skips consent.)
3. The Privacy Policy (`tools/pages/privacy.html`, section 6) already describes AdSense advertising and says none is shown yet. When ads go
   live, edit its first paragraph (and the date is refreshed by `node tools/build-pages.js`).
4. Create the ad units and fill in `ads-config.json`:
   `{ "mode": "live", "client": "ca-pub-...", "consent": "cmp", "cmpScript": "https://...", "slots": { "banner": "", "result": "", "content": "..." } }`
5. A placement with an empty slot id is skipped. **For the AdSense application, leave `banner` and `result` empty** and use only `content`:
   Google advises against content ads on game screens and near play or navigation buttons. To switch everything off again: `"mode": "off"`.

## Notes
- The game-over card is built once per game over, so its ad is requested once per game.
- Never put ads over the board or next to buttons; accidental clicks can get an ad account banned.
