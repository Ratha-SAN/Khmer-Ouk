// Usage: node tools/puzzle-gen.js <moves 2|3> <count> <seed> <seconds> > out.json   (run from the repo root)
// Mate-in-N puzzle generator for Ouk Chatrang, using the game's own engine (extracted from index.html).
const fs = require('fs');
const html = fs.readFileSync('/home/user/Khmer-Ouk/index.html', 'utf8');
const src = html.slice(html.indexOf('<script id="engine-src">') + '<script id="engine-src">'.length, html.indexOf('</script>', html.indexOf('<script id="engine-src">')));
eval(src);
const E = globalThis.OukEngine, W = E.WHITE, B = E.BLACK;
const N = +process.argv[2] || 2, WANT = +process.argv[3] || 5, SEED = +process.argv[4] || 1, BUDGET = (+process.argv[5] || 600) * 1000;
let seed = SEED * 9301 + 49297; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ri = (n) => Math.floor(rnd() * n);
const legal = (S, c) => E.genLegal(S, c);
function mateIn(S, n) { for (const m of legal(S, W)) if (mateAfter(S, m, n)) return true; return false; }
function mateAfter(S, m, n) {
  const u = E.makeMove(S, m);
  const rs = legal(S, B); let ok;
  if (rs.length === 0) ok = E.inCheck(S, B);
  else if (n === 1) ok = false;
  else { ok = true; for (const r of rs) { const u2 = E.makeMove(S, r); const sub = mateIn(S, n - 1); E.unmakeMove(S, u2); if (!sub) { ok = false; break; } } }
  E.unmakeMove(S, u); return ok;
}
const mates = (S, n) => legal(S, W).filter((m) => mateAfter(S, m, n)); // the white moves forcing mate within n
const nm = (m) => E.sqName(m.from) + E.sqName(m.to);
function randomPosition() {
  const S = E.emptyState('always'); S.kingMoved = [true, true]; S.queenMoved = [true, true]; S.turn = W;
  const free = (i) => S.board[i] === E.EMPTY;
  const put = (t, c, lo, hi, prom) => { for (let k = 0; k < 40; k++) { const sq = (lo + ri(hi - lo + 1)) * 8 + ri(8); if (free(sq)) { S.board[sq] = E.mk(t, c, prom); return sq; } } return -1; };
  const bk = put(E.KING, B, 5, 7); put(E.KING, W, 0, 4);
  if (Math.abs(E.fileOf(bk) - E.fileOf(E.kingSq(S, W))) <= 1 && Math.abs(E.rankOf(bk) - E.rankOf(E.kingSq(S, W))) <= 1) return null;
  const wPool = [E.ROOK, E.ROOK, E.KNIGHT, E.KNIGHT, E.BISHOP, E.QUEEN, E.PAWN, 'P'];
  const bPool = [E.PAWN, E.PAWN, E.BISHOP, E.KNIGHT, E.QUEEN, E.ROOK];
  const nw = 2 + ri(3), nb = 1 + ri(4);
  for (let i = 0; i < nw; i++) { const t = wPool[ri(wPool.length)]; if (t === 'P') put(E.PAWN, W, 2, 4, true); else if (t === E.PAWN) put(E.PAWN, W, 2, 4); else put(t, W, 0, 7); }
  for (let i = 0; i < nb; i++) { const t = bPool[ri(bPool.length)]; if (t === E.PAWN) put(E.PAWN, B, 3, 5); else put(t, B, 3, 7); }
  if (E.inCheck(S, B) || E.inCheck(S, W)) return null;
  if (legal(S, B).length === 0) return null;
  return S;
}
const out = []; const t0 = Date.now(); let tried = 0;
while (out.length < WANT && Date.now() - t0 < BUDGET) {
  const S = randomPosition(); if (!S) continue; tried++;
  if (mates(S, 1).length) continue;                      // too easy: mate in 1
  if (N === 3 && mateIn(S, 2)) continue;                 // too easy: mate in 2
  const firsts = mates(S, N); if (firsts.length !== 1) continue; // exactly one first move
  // the line: the best defence (one after which mate takes longest, and the fewest winning answers), then the unique answer
  const line = []; let ok = true, n = N;
  const snap = E.toJSON(S);
  let w = firsts[0];
  while (true) {
    line.push(nm(w));
    const u = E.makeMove(S, w);
    const rs = legal(S, B);
    if (rs.length === 0) break; // mate
    n--;
    let best = null, bestScore = -1;
    for (const r of rs) {
      const u2 = E.makeMove(S, r);
      const quick = n > 1 && mateIn(S, n - 1);           // a reply that allows a quicker mate is a weak defence
      const ws = mates(S, n);
      E.unmakeMove(S, u2);
      const score = (quick ? 0 : 100) - ws.length;
      if (score > bestScore) { bestScore = score; best = { r, ws }; }
    }
    if (n > 1 && best.ws.length !== 1) { ok = false; break; } // a middle step must have one answer
    line.push(nm(best.r));
    E.makeMove(S, best.r);
    w = best.ws[0];
  }
  if (!ok) continue;
  const P = E.fromJSON(snap), pieces = [];
  for (let i = 0; i < 64; i++) if (P.board[i] !== E.EMPTY) pieces.push([E.sqName(i), E.typeOf(P.board[i]), E.colorOf(P.board[i]), E.isProm(P.board[i])]);
  out.push({ n: N, line, pieces });
  console.error('found', out.length, line.join(' '), 'after', tried, 'tries,', Math.round((Date.now() - t0) / 1000), 's');
}
console.log(JSON.stringify(out));
