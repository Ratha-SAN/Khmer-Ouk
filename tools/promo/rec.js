// The promo recorder: the game on a 405x720 (9:16) phone screen, its clock slowed K times, one frame per capture.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const WORK = process.env.PROMO_WORK || '/tmp/ouk-promo'; // recordings, audio, captions and the result (see README.md)
const CDN = WORK + '/cache/cdn/', FONT = WORK + '/cache/font/package/files/'; // (filled by setup.sh)
exports.open = async function (o) {
  o = o || {};
  const K = o.K || 40, dsf = o.dsf || 2;
  // a real phone-shaped window (not Playwright's emulation), so the fast capture sees exactly the phone screen
  const b = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=' + Math.round(405 * dsf) + ',' + Math.round(720 * dsf), '--force-device-scale-factor=' + dsf] });
  const ctx = await b.newContext({ viewport: null, serviceWorkers: 'block' });
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => { const u = new URL(r.request().url()).pathname.replace('/npm/', ''); const m = u.match(/^(three|react|react-dom)@[^/]+\/(.*)$/); if (!m) return r.abort(); return r.fulfill({ path: CDN + (m[1] === 'three' ? 'three-0.160.0' : m[1] + '-18.3.1') + '/package/' + m[2], contentType: 'application/javascript' }); });
  await ctx.route('https://www.gstatic.com/**', (r) => r.fulfill({ body: '', contentType: 'application/javascript' }));
  await ctx.route('https://fonts.local/**', (r) => r.fulfill({ path: FONT + 'noto-sans-khmer-khmer-' + new URL(r.request().url()).pathname.slice(1) + '-normal.woff2', contentType: 'font/woff2' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('oukLangPref', 'kh'); localStorage.setItem('oukLastSeenVersion', '9.9.9'); } catch (e) {} });
  // the slow clock: every timer, frame time and clock in the page runs K times slower than real time
  await p.addInitScript((K) => {
    // normal speed while loading; window.__setSlow(true) slows the page's whole clock K times, without a jump
    const pn = performance.now.bind(performance), dn = Date.now;
    let k = 1, rp = pn(), vp = rp, rd = dn(), vd = rd;
    performance.now = () => vp + (pn() - rp) / k;
    Date.now = () => Math.round(vd + (dn() - rd) / k);
    window.__setSlow = (on) => { vp = performance.now(); vd = Date.now(); rp = pn(); rd = dn(); k = on ? K : 1; };
    const st = window.setTimeout, si = window.setInterval, raf = window.requestAnimationFrame.bind(window);
    window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) * k, ...a);
    window.setInterval = (f, ms, ...a) => si(f, Math.max(1, (ms || 0)) * k, ...a);
    window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()));
    window.__sfxTimes = []; // when each sound really plays (for the soundtrack)
  }, K);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Animation.enable');
  p.__cdp = cdp;
  const slow = async (on) => { await p.evaluate((on) => window.__setSlow(on), on); await cdp.send('Animation.setPlaybackRate', { playbackRate: on ? 1 / K : 1 }); };
  return { b, ctx, p, errs, K, cdp, slow };
};
exports.load = async function (p) {
  await p.goto('http://127.0.0.1:8791/index.html');
  await p.waitForFunction(() => window.__oukReady && window.__ouk && window.__ouk.state(), null, { timeout: 120000 });
  await p.addStyleTag({ content: [400, 600, 700].map((w) => `@font-face{font-family:"Noto Sans Khmer";font-weight:${w};src:url(https://fonts.local/${w})}`).join('') });
  await p.evaluate(() => document.fonts.ready);
  // the sound log: when each move / capture / end sound is heard (a move's sound waits for the piece to land)
  await p.evaluate(() => {
    const log = window.__oukSfxLog, push = log.push.bind(log);
    log.push = (e) => { const g = window.__ouk.debugGlides ? window.__ouk.debugGlides() : []; const wait = /^end_/.test(e.kind) ? 0 : (g.length ? g[g.length - 1].dur : 0);
      window.__sfxTimes.push({ kind: e.kind, t: performance.now() + wait * 1000 }); return push(e); };
  });
};
// a clean picture: no buttons, clocks, banners or toolbar -- only the board, the title and the player cards
exports.clean = (p) => p.addStyleTag({ content: '#hud,#camControls,#movelist,#fullscreenBtn,#topBtns,#viewBtns,#panelToggle,#settingsBtn,#zoomBtns,.mobileBar,#mobileUiRoot,#learnBanner,#installBanner,#updateBar,#thinking,#statusBar,#status,#countPanel,#adBannerBar,#onlineThinkingTip{display:none!important}' });
// record `secs` of (slow) page time; `start` runs in the page at the beginning (its setTimeouts are in page time)
exports.record = async function (p, dir, secs, start) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const t0 = await p.evaluate(() => performance.now());
  if (start) await p.evaluate(start); // (a string of code, run in the page)
  // a frame is captured when the game has drawn a new picture of the board, or 1/30 s (game time) after the last
  // capture (for on-screen text and effects); in between it only looks, every 150 ms
  const frames = []; let i = 0, real0 = Date.now(), lastDrawn = -1, lastT = -1;
  for (;;) {
    const st = await p.evaluate(() => ({ t: performance.now(), d: window.__ouk.debugRender().frames }));
    const tv = (st.t - t0) / 1000;
    if (st.d !== lastDrawn || tv - lastT >= 1 / 30) {
      const r = await p.__cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      const z = await p.evaluate(() => performance.now());
      const f = path.join(dir, String(i).padStart(5, '0') + '.jpg');
      fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
      frames.push({ f, t: ((st.t + z) / 2 - t0) / 1000 }); i++;
      lastDrawn = st.d; lastT = tv;
      if ((z - t0) / 1000 >= secs) break;
    } else await new Promise((r) => setTimeout(r, 150));
    if (tv >= secs) break;
  }
  const sfx = (await p.evaluate(() => window.__sfxTimes.splice(0))).map((s) => ({ kind: s.kind, t: (s.t - t0) / 1000 })).filter((s) => s.t >= 0 && s.t <= secs + 1);
  fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify({ secs, frames, sfx }));
  console.log(path.basename(dir) + ': ' + frames.length + ' frames for ' + secs + ' s (' + (frames.length / secs).toFixed(1) + ' per s), ' + ((Date.now() - real0) / 1000).toFixed(0) + ' s real, sounds ' + JSON.stringify(sfx.map((s) => s.kind + '@' + s.t.toFixed(2))));
};
