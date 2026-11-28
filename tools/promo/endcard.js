// the end card: 1080x1920, the game blurred behind, the call to play
const { chromium } = require('playwright'); const fs = require('fs');
const WORK = process.env.PROMO_WORK || '/tmp/ouk-promo'; // recordings, audio, captions and the result (see README.md)
const FONT = WORK + '/cache/font/package/files/';
const ICON = fs.readFileSync(require('path').join(__dirname, '../../icon.svg'), 'utf8');
// the blurred background: a frame of the play scene (record it first), or a given image
const BG = process.argv[2] || WORK + '/clips/play/00000.jpg';
if (!fs.existsSync(BG)) { console.error('no background image ' + BG + ': run runall.sh first, or pass an image: node endcard.js frame.jpg'); process.exit(1); }
const bg = fs.readFileSync(BG).toString('base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('https://fonts.local/**', (r) => r.fulfill({ path: FONT + 'noto-sans-khmer-khmer-' + new URL(r.request().url()).pathname.slice(1) + '-normal.woff2', contentType: 'font/woff2' }));
  await p.setContent(`<html><head><style>
@font-face{font-family:"Noto Sans Khmer";font-weight:400;src:url(https://fonts.local/400)}
@font-face{font-family:"Noto Sans Khmer";font-weight:700;src:url(https://fonts.local/700)}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#140c06;font-family:"Noto Sans Khmer","Inter",sans-serif;color:#fff}
.bg{position:absolute;inset:-60px;background:url(data:image/jpeg;base64,${bg}) center/cover;filter:blur(22px) brightness(.45) saturate(1.1)}
.shade{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,rgba(20,12,6,.35),rgba(20,12,6,.92) 75%)}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px}
.en{font-family:"Inter",sans-serif}
.title{font-weight:700;color:#f0c35e;font-size:150px;line-height:1.15;text-shadow:0 6px 24px rgba(0,0,0,.6)}
.sub{font-size:46px;letter-spacing:14px;color:#f0c35e;font-weight:600;margin-top:6px}
.play{margin-top:70px;font-size:74px;font-weight:700}
.playen{font-size:46px;font-weight:600;opacity:.92;margin-top:4px}
.btn{margin-top:46px;padding:30px 70px;border-radius:999px;background:linear-gradient(180deg,#f6d27a,#e2b048);color:#2a1806;font:800 72px Inter,sans-serif;letter-spacing:1px;box-shadow:0 14px 40px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.5)}
.row{margin-top:64px;display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
.pill{padding:16px 30px;border-radius:999px;border:2px solid rgba(240,195,94,.6);background:rgba(240,195,94,.12);font-size:38px;color:#ffe7ae}
.note{margin-top:40px;font-size:38px;opacity:.85}
</style></head><body><div class="bg"></div><div class="shade"></div><div class="c">
  <div style="width:230px;height:230px;margin-bottom:26px">${ICON.replace('<svg ', '<svg width="230" height="230" ')}</div>
  <div class="title">អុកចត្រង្គ</div><div class="sub en">OUK CHATRANG</div>
  <div class="play">លេងឥតគិតថ្លៃឥឡូវនេះ</div><div class="playen en">Play free now</div>
  <div class="btn">oukkhmer.com</div>
  <div class="row"><span class="pill">📱 ទូរស័ព្ទ <span class="en">Phone</span></span><span class="pill">💻 កុំព្យូទ័រ <span class="en">Computer</span></span><span class="pill">✈️ Telegram</span></div>
  <div class="note">គ្មានការដំឡើង · <span class="en">no download needed</span></div>
</div></body></html>`);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  fs.mkdirSync(WORK + '/ov', { recursive: true }); await p.screenshot({ path: WORK + '/ov/end.png' }); await b.close(); console.log('end card');
})();
