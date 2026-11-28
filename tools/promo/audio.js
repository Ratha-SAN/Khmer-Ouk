const R = require('./rec'); const fs = require('fs');
const WORK = process.env.PROMO_WORK || '/tmp/ouk-promo'; fs.mkdirSync(WORK + '/audio', { recursive: true });
(async () => {
  const { b, p, errs } = await R.open({ K: 1, dsf: 1 }); await R.load(p);
  const save = (name, r) => { fs.writeFileSync(WORK + '/audio/' + name + '.wav', Buffer.from(r.wav, 'base64')); console.log(name, 'peak', r.peak && r.peak.toFixed ? r.peak.toFixed(2) : r.peak); };
  save('music_khmer1', await p.evaluate(() => window.__ouk.debugRenderMusic('khmer1', 32)));
  for (const k of ['move', 'capture']) for (let i = 0; i < 3; i++) save(k + i, await p.evaluate((k) => window.__ouk.debugRenderSfx('traditional', k, 1.2), k));
  // the win fanfare, as the game plays it: a rising pentatonic roneat run and a gong (playEndSound), drawn here the
  // same way the game's roneat and gong voices are (a triangle strike with a bright overtone, a gong of four partials)
  const win = await p.evaluate(async () => {
    const off = new OfflineAudioContext(1, 44100 * 3, 44100), out = off.createGain(); out.gain.value = 0.9; out.connect(off.destination);
    const tone = (freq, t, dur, gain, type) => { const o = off.createOscillator(), g = off.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); };
    const roneat = (f, t, g) => { tone(f, t, 0.32, g, 'triangle'); tone(f * 2, t, 0.14, g * 0.4); };
    [587.3, 698.5, 784, 880, 1046.5, 1174.7].forEach((f, i) => roneat(f, 0.02 + i * 0.085, 0.22));
    [[1, 1], [2.01, 0.5], [2.76, 0.32], [4.07, 0.16]].forEach(([m, g], i) => tone(293.7 * m, 0.57, 1.6 / (1 + i * 0.45), 0.2 * g));
    const buf = await off.startRendering(), ch = buf.getChannelData(0), n = ch.length, dv = new DataView(new ArrayBuffer(44 + n * 2));
    const w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 44100, true); dv.setUint32(28, 88200, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
    let peak = 0; for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, ch[i])); peak = Math.max(peak, Math.abs(x)); dv.setInt16(44 + i * 2, x * 32767, true); }
    let bin = ''; const by = new Uint8Array(dv.buffer); for (let i = 0; i < by.length; i += 32768) bin += String.fromCharCode.apply(null, by.subarray(i, i + 32768));
    return { wav: btoa(bin), peak };
  });
  save('win', win);
  console.log('ERR', errs.join('|')); await b.close();
})();
