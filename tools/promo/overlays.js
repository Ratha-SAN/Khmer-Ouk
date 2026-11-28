// the captions, as transparent 1080x1920 images laid over the game footage
const { chromium } = require('playwright'); const fs = require('fs');
const WORK = process.env.PROMO_WORK || '/tmp/ouk-promo'; // recordings, audio, captions and the result (see README.md)
const FONT = WORK + '/cache/font/package/files/';
const ICON = fs.readFileSync(require('path').join(__dirname, '../../icon.svg'), 'utf8');
const CSS = `
@font-face{font-family:"Noto Sans Khmer";font-weight:400;src:url(https://fonts.local/400)}
@font-face{font-family:"Noto Sans Khmer";font-weight:700;src:url(https://fonts.local/700)}
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:"Noto Sans Khmer","Inter",sans-serif;color:#fff}
.en{font-family:"Inter",sans-serif}
/* the caption band: the top 387 px (the game picture starts below it, fading into it) */
.band{position:absolute;left:0;right:0;top:0;height:460px;background:linear-gradient(180deg,#140c06 0%,#140c06 80%,rgba(20,12,6,0) 100%)}
.cap{position:absolute;left:40px;right:40px;top:40px;height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.kh{font-weight:700;color:#f0c35e;font-size:92px;line-height:1.3;text-shadow:0 4px 18px rgba(0,0,0,.6)}
.enl{font-size:48px;font-weight:600;color:#fff;margin-top:2px;letter-spacing:.3px}
.chip{display:inline-block;margin-top:22px;padding:10px 28px;border-radius:999px;background:rgba(240,195,94,.14);border:2px solid rgba(240,195,94,.7);font-size:34px;color:#ffe7ae}
.chip .en{font-size:31px}
`;
const pages = {
  intro: `<div class="band"></div><div class="cap">
    <div style="display:flex;align-items:center;gap:28px"><div style="width:130px;height:130px">${ICON.replace('<svg ', '<svg width="130" height="130" ')}</div>
    <div style="text-align:left"><div class="kh" style="font-size:112px;line-height:1.15">អុកចត្រង្គ</div>
    <div class="en" style="font-size:40px;letter-spacing:10px;color:#f0c35e;font-weight:600">OUK CHATRANG</div></div></div>
    <div style="font-size:52px;font-weight:700;margin-top:22px">អុកខ្មែរ · លេងឥតគិតថ្លៃ</div>
    <div class="en enl" style="font-size:40px;font-weight:500;opacity:.9">Khmer chess · free to play</div></div>`,
  play: `<div class="band"></div><div class="cap"><div class="kh">លេងជាមួយកុំព្យូទ័រ</div><div class="en enl">Play the computer</div>
    <div class="chip">៦ កម្រិត ពីងាយដល់ពិបាក · <span class="en">6 levels</span></div></div>`,
  themes: `<div class="band"></div><div class="cap"><div class="kh">ស្បែកស្រស់ស្អាតជាង ២០</div><div class="en enl">20+ beautiful themes</div>
    <div class="chip">3D និង 2D · <span class="en">3D and 2D</span></div></div>`,
  learn: `<div class="band"></div><div class="cap"><div class="kh" style="font-size:84px">រៀនលេង · ល្បែងប្រាជ្ញា</div><div class="en enl">Learn to play · daily puzzles</div>
    <div class="chip">សម្រាប់អ្នកចាប់ផ្ដើម · <span class="en">great for beginners</span></div></div>`,
  win: `<div class="band"></div><div class="cap"><div class="kh" style="font-size:104px">អុកងាប់!</div><div class="en enl">Checkmate: you win!</div>
    <div class="chip">លេងជាមួយមិត្តភក្ដិអនឡាញ · <span class="en">play friends online</span></div></div>`
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('https://fonts.local/**', (r) => r.fulfill({ path: FONT + 'noto-sans-khmer-khmer-' + new URL(r.request().url()).pathname.slice(1) + '-normal.woff2', contentType: 'font/woff2' }));
  for (const [k, html] of Object.entries(pages)) {
    await p.setContent(`<html><head><style>${CSS}</style></head><body>${html}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    fs.mkdirSync(WORK + '/ov', { recursive: true }); await p.screenshot({ path: WORK + '/ov/' + k + '.png', omitBackground: true });
  }
  await b.close(); console.log('overlays:', Object.keys(pages).join(' '));
})();
