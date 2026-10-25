// Usage: node tools/puzzle-verify.js a.json b.json ... > verified.json   (proves each puzzle; drops any that fail)
const fs = require('fs');
const html = fs.readFileSync('/home/user/Khmer-Ouk/index.html', 'utf8');
eval(html.slice(html.indexOf('<script id="engine-src">') + 24, html.indexOf('</script>', html.indexOf('<script id="engine-src">'))));
const E = globalThis.OukEngine, W = E.WHITE, B = E.BLACK;
const legal = (S, c) => E.genLegal(S, c);
function mateIn(S, n) { for (const m of legal(S, W)) if (mateAfter(S, m, n)) return true; return false; }
function mateAfter(S, m, n) { const u = E.makeMove(S, m); const rs = legal(S, B); let ok;
  if (rs.length === 0) ok = E.inCheck(S, B); else if (n === 1) ok = false;
  else { ok = true; for (const r of rs) { const u2 = E.makeMove(S, r); const sub = mateIn(S, n - 1); E.unmakeMove(S, u2); if (!sub) { ok = false; break; } } }
  E.unmakeMove(S, u); return ok; }
const nm = (m) => E.sqName(m.from) + E.sqName(m.to);
const all = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const seen = new Set(), good = [];
for (const p of all) {
  const key = p.pieces.map((x) => x.join(':')).sort().join(','); if (seen.has(key)) continue; seen.add(key);
  const S = E.emptyState('always'); S.kingMoved = [true, true]; S.queenMoved = [true, true]; S.turn = W;
  for (const [sq, t, c, pr] of p.pieces) S.board[E.sqIndex(sq)] = E.mk(t, c, pr);
  let ok = !E.inCheck(S, B) && !E.inCheck(S, W) && !mateIn(S, p.n - 1 || 1 - 1 + 0) ;
  if (p.n >= 2 && mateIn(S, p.n - 1)) ok = false;
  // play the line: every White move but the last must be the only one forcing mate in the moves left
  for (let i = 0; ok && i < p.line.length; i++) {
    const c = i % 2 ? B : W, left = p.n - Math.floor(i / 2);
    const mv = legal(S, c).find((m) => nm(m) === p.line[i]); if (!mv) { ok = false; break; }
    if (c === W && i < p.line.length - 1) { const winners = legal(S, W).filter((m) => mateAfter(S, m, left)); if (winners.length !== 1 || nm(winners[0]) !== p.line[i]) ok = false; }
    E.makeMove(S, mv);
  }
  const st = E.gameStatus(S); if (!(st && st.type === 'checkmate' && st.winner === W)) ok = false;
  if (ok) good.push(p); else console.error('REJECT', p.line.join(' '));
}
console.error('good', good.filter((p) => p.n === 2).length, 'mate-in-2,', good.filter((p) => p.n === 3).length, 'mate-in-3');
console.log(JSON.stringify(good));
