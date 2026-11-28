// one scene of the promo: node scene.js <name> [seconds-override]
const R = require('./rec'); const fs = require('fs');
const POS1 = JSON.parse(fs.readFileSync(__dirname + '/pos1.json')), POS4 = JSON.parse(fs.readFileSync(__dirname + '/pos4.json'));
const name = process.argv[2], over = +process.argv[3] || 0;
const SCENES = {
  play: { theme: 'woodReal', secs: 9.5, pos: POS1.S, start: (P) => {
    const E = window.OukEngine, mv = (a, b) => { const S = window.__ouk.state(); const m = E.genLegal(S, S.turn).find((x) => E.sqName(x.from) === a && E.sqName(x.to) === b); if (m) window.__ouk.debugApplyMove(m); };
    setTimeout(() => mv(P.m.slice(0, 2), P.m.slice(2)), 900);
    // White's second move: whatever the strong search picks once the computer has replied
    setTimeout(() => { const S = window.__ouk.state(); if (S.turn !== 0) return; const m = E.chooseAiMove(S, 4, { budget: 300 }); if (m) window.__ouk.debugApplyMove(m); }, 4700);
  } },
  themes: { theme: 'woodReal', secs: 5.6, pos: POS1.S, start: () => {
    const set = (k) => { const s = document.getElementById('themeSel'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true })); };
    [['gems', 1000], ['inkwash', 2100], ['okNaga', 3200], ['flat2d', 4300]].forEach(([k, t]) => setTimeout(() => set(k), t));
  } },
  learn: { theme: 'woodReal', secs: 5.6, puzzle: 'l1p1', start: () => {
    const E = window.OukEngine;
    setTimeout(() => window.__ouk.debugSelect(E.sqIndex('g1')), 900);
    setTimeout(() => { const S = window.__ouk.state(); const m = E.genLegal(S, S.turn).find((x) => E.sqName(x.from) === 'g1' && E.sqName(x.to) === 'g8'); window.__ouk.debugTrainMove(m); }, 2500);
  } },
  win: { theme: 'woodReal', secs: 6.6, pos: POS4.S, start: (P) => {
    const E = window.OukEngine;
    setTimeout(() => { const S = window.__ouk.state(); const m = E.genLegal(S, S.turn).find((x) => E.sqName(x.from) === 'e5' && E.sqName(x.to) === 'f7'); window.__ouk.debugApplyMove(m); }, 900);
  } }
};
(async () => {
  const sc = SCENES[name]; if (!sc) throw new Error('no scene ' + name);
  const { b, p, errs, slow, K } = await R.open({ K: +process.env.K || 50, dsf: 2 });
  await p.addInitScript(() => { try { localStorage.setItem('oukAiLevel', '3'); localStorage.setItem('oukAutoFlip', '0'); } catch (e) {} window.__oukGuestWaitMs = 0; });
  await R.load(p);
  await p.evaluate(() => document.getElementById('playNowBtn').click());
  await p.waitForFunction(() => getComputedStyle(document.getElementById('startScreen')).display === 'none', null, { timeout: 120000 });
  await p.evaluate((th) => {
    window.__oukAuth._setState({ signedIn: true, method: 'google', uid: 'promo', tier: 'full' });
    window.__ouk.debugSetProfile({ uid: 'promo', displayName: 'សុខា', provider: 'google.com', avatarGradient: 'linear-gradient(135deg,#f6d365,#fda085)' });
    const s = document.getElementById('themeSel'); s.value = th; s.dispatchEvent(new Event('change', { bubbles: true }));
  }, sc.theme);
  await R.clean(p);
  await new Promise((r) => setTimeout(r, 6000));
  if (sc.pos) await p.evaluate((j) => window.__ouk.debugLoadState(j), sc.pos);
  if (sc.puzzle) await p.evaluate((k) => window.__ouk.debugLoadPuzzle(k), sc.puzzle);
  await new Promise((r) => setTimeout(r, 4000));
  const info = await p.evaluate(() => ({ mode: window.__ouk.currentMode(), ratio: window.__ouk.debugRender().ratio, theme: document.getElementById('themeSel').value }));
  console.log(name, JSON.stringify(info));
  await slow(true);
  await R.record(p, (process.env.PROMO_WORK || '/tmp/ouk-promo') + '/clips/' + name, over || sc.secs, sc.start ? `(${sc.start.toString()})(${JSON.stringify(name === 'play' ? POS1 : POS4)})` : null);
  console.log('ERR', errs.join('|')); await b.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
