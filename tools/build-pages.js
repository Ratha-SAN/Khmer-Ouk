// Builds the static pages (how-to-play/, privacy/, terms/) from the sources in tools/pages/.
//   node tools/build-pages.js            (run from the repo root; CONTACT_EMAIL overrides the public contact address)
// - Content lives in tools/pages/*.html, written with <kh>..</kh> / <en>..</en> pairs: one language each, shown or hidden by
//   the language switch (the same oukLangPref setting the game uses; with no setting, both are shown).
// - The board diagrams are drawn here from the game's own engine (extracted from index.html), so they can never disagree
//   with the rules; the pieces are the game's own flat art (how-to-play/art/*.png, exported with the debugPieceArt hook).
// The output is committed; Cloudflare only copies it (see build-cloudflare.sh).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const M = '<script id="engine-src">';
const engineSrc = html.slice(html.indexOf(M) + M.length, html.indexOf('</script>', html.indexOf(M)));
eval(engineSrc);
const E = globalThis.OukEngine;
const lessonSrc = html.slice(html.indexOf('const LESSONS = {'), html.indexOf('const LESSON_ORDER'));
const LESSONS = eval('(function(){ ' + lessonSrc + ' return LESSONS; })()');
const puzSrc = html.slice(html.indexOf('const PUZZLES = ['), html.indexOf('\n];', html.indexOf('const PUZZLES = [')) + 3);
const PUZZLES = eval('(function(){ ' + puzSrc + ' return PUZZLES; })()');
const VAL = (/var VAL = \[([^\]]*)\]/.exec(engineSrc)[1]).split(',').map((x) => +x.trim()); // the engine's own piece values: -, K, Neang, Koul, Ses, Tuuk, Trey
const ART = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages', 'art-meta.json'), 'utf8'));
const CONTACT = process.env.CONTACT_EMAIL || 'support@oukkhmer.com'; // the public contact address shown on the pages
const SITE = 'https://oukkhmer.com';
const UPDATED = '2026-11-21';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- board diagrams ----------
const T = 44, ML = 28, MT = 8, MR = 8, MB = 36, BW = 8 * T;
const FILES_KH = ['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច', 'ឆ', 'ជ'], RANKS_KH = ['១', '២', '៣', '៤', '៥', '៦', '៧', '៨'];
const TYPE_FILE = { [E.KING]: 'king', [E.QUEEN]: 'queen', [E.BISHOP]: 'bishop', [E.KNIGHT]: 'knight', [E.ROOK]: 'rook', [E.PAWN]: 'pawn' };
const TYPE_NAME = { [E.KING]: 'Sdach (King)', [E.QUEEN]: 'Neang (Queen)', [E.BISHOP]: 'Koul (Bishop)', [E.KNIGHT]: 'Ses (Knight)', [E.ROOK]: 'Tuuk (Rook)', [E.PAWN]: 'Trey (Pawn)' };
const SCALE = 0.95 * T / ART['king-w.png'].h; // every piece at one scale, as in the game: the Sdach just under one square tall
let figN = 0;
function boardSvg(S, focus, title, opts) {
  opts = opts || {};
  const id = 'fig' + (++figN);
  const W = ML + BW + MR, H = MT + BW + MB;
  let moves = [];
  if (focus != null) { const c = E.colorOf(S.board[focus]); moves = E.genLegal(S, c).filter((m) => m.from === focus); }
  const targets = moves.map((m) => ({ sq: m.to, cap: S.board[m.to] !== E.EMPTY }));
  const px = (sq) => ML + E.fileOf(sq) * T, py = (sq) => MT + (7 - E.rankOf(sq)) * T;
  let g = '';
  g += `<rect x="${ML - 5}" y="${MT - 5}" width="${BW + 10}" height="${BW + 10}" rx="4" fill="#4a2f17"/>`;
  g += `<rect x="${ML}" y="${MT}" width="${BW}" height="${BW}" fill="#dcb97d"/>`;
  for (let i = 0; i <= 8; i++) g += `<path d="M${ML + i * T} ${MT}V${MT + BW}M${ML} ${MT + i * T}H${ML + BW}" stroke="#a8793a" stroke-width="1" fill="none"/>`;
  if (focus != null) g += `<rect x="${px(focus)}" y="${py(focus)}" width="${T}" height="${T}" fill="#f0c75e" opacity=".6"/>`;
  for (const t of (opts.noTargets ? [] : targets)) if (t.cap) g += `<rect x="${px(t.sq)}" y="${py(t.sq)}" width="${T}" height="${T}" fill="#c0392b" opacity=".18"/>`;
  for (let sq = 0; sq < 64; sq++) {
    const p = S.board[sq]; if (p === E.EMPTY) continue;
    const t = E.typeOf(p), c = E.colorOf(p), f = (E.isProm(p) ? 'promoted' : TYPE_FILE[t]) + (c === E.WHITE ? '-w' : '-b') + '.png', a = ART[f];
    const w = (a.w * SCALE).toFixed(1), h = (a.h * SCALE).toFixed(1);
    const x = px(sq) + (T - w) / 2, y = t === E.PAWN ? py(sq) + (T - h) / 2 : py(sq) + T - h - 0.04 * T;
    g += `<image href="/how-to-play/art/${f}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}"/>`;
  }
  if (opts.arrow) { // the move: a green arrow from the middle of one square to the middle of the other, over the pieces
    const [from, to] = opts.arrow, x0 = px(from) + T / 2, y0 = py(from) + T / 2, x1 = px(to) + T / 2, y1 = py(to) + T / 2;
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, head = 12, w = 6.5;
    const sx = x0 + ux * 8, sy = y0 + uy * 8, ex = x1 - ux * 4, ey = y1 - uy * 4, bx = ex - ux * head, by = ey - uy * head;
    g += `<g opacity=".82"><path d="M${sx.toFixed(1)} ${sy.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}" stroke="#1f7a4d" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M${ex.toFixed(1)} ${ey.toFixed(1)}L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}Z" fill="#1f7a4d"/></g>`;
  }
  for (const sq of (opts.ring || [])) g += `<rect x="${px(sq)}" y="${py(sq)}" width="${T}" height="${T}" fill="#c0392b" opacity=".16"/><circle cx="${px(sq) + T / 2}" cy="${py(sq) + T / 2}" r="${(T * 0.46).toFixed(1)}" fill="none" stroke="#c0392b" stroke-width="3"/>`;
  for (const t of (opts.noTargets ? [] : targets)) {
    const cx = px(t.sq) + T / 2, cy = py(t.sq) + T / 2;
    g += t.cap ? `<circle cx="${cx}" cy="${cy}" r="${(T * 0.45).toFixed(1)}" fill="none" stroke="#c0392b" stroke-width="2.6"/>` : `<circle cx="${cx}" cy="${cy}" r="${(T * 0.15).toFixed(1)}" fill="#2f8f5b" opacity=".92"/>`;
  }
  let lab = '';
  for (let i = 0; i < 8; i++) {
    const cx = ML + i * T + T / 2, cy = MT + i * T + T / 2;
    lab += `<text x="${cx}" y="${MT + BW + 17}" text-anchor="middle" font-size="13" fill="#e2b65a">${FILES_KH[i]}</text><text x="${cx}" y="${MT + BW + 29}" text-anchor="middle" font-size="9" fill="#b39f7c">${'abcdefgh'[i]}</text>`;
    lab += `<text x="${ML - 9}" y="${MT + (7 - i) * T + T / 2 + 1}" text-anchor="middle" font-size="13" fill="#e2b65a">${RANKS_KH[i]}</text><text x="${ML - 9}" y="${MT + (7 - i) * T + T / 2 + 12}" text-anchor="middle" font-size="9" fill="#b39f7c">${i + 1}</text>`;
  }
  let desc = title + '.';
  if (opts.desc) desc = title + '. ' + opts.desc;
  else if (focus != null) {
    const sqn = E.sqName(focus), fp = S.board[focus];
    const to = targets.filter((t) => !t.cap).map((t) => E.sqName(t.sq)), cp = targets.filter((t) => t.cap).map((t) => E.sqName(t.sq));
    desc = `${title}. The ${E.colorOf(fp) === E.WHITE ? 'white' : 'black'} ${TYPE_NAME[E.typeOf(fp)]} on ${sqn} can move to ${to.length ? to.join(', ') : 'no empty square'}` + (cp.length ? ` and capture on ${cp.join(', ')}.` : '.');
  }
  return `<svg class="board" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}t ${id}d" font-family="'Noto Sans Khmer','Khmer OS','Khmer MN','Leelawadee UI','Segoe UI',system-ui,sans-serif"><title id="${id}t">${esc(title)}</title><desc id="${id}d">${esc(desc)}</desc>${g}${lab}</svg>`;
}
// a puzzle position from the game's own puzzle set, drawn before the move with the answer as an arrow; the engine
// checks the answer: a "mate" figure must really be checkmate, a "move" figure must be legal (else the build stops)
const KH_NAME = { [E.KING]: 'ស្ដេច', [E.QUEEN]: 'នាង', [E.BISHOP]: 'គោល', [E.KNIGHT]: 'សេះ', [E.ROOK]: 'ទូក', [E.PAWN]: 'ត្រី' };
const EN_NAME = { [E.KING]: 'Sdach', [E.QUEEN]: 'Neang', [E.BISHOP]: 'Koul', [E.KNIGHT]: 'Ses', [E.ROOK]: 'Tuuk', [E.PAWN]: 'Trey' };
function puzzleFigure(key, pick) {
  const pz = PUZZLES.find((x) => x.key === key); if (!pz) throw new Error('no puzzle ' + key);
  const S = E.emptyState('always'); S.turn = E.WHITE; S.kingMoved = [true, true]; S.queenMoved = [true, true];
  pz.setup((n, t, c, prom) => { S.board[E.sqIndex(n)] = E.mk(t, c, prom); }, S);
  const legal = E.genLegal(S, E.WHITE), nmv = (m) => E.sqName(m.from) + E.sqName(m.to);
  let moves;
  if (pz.goal === 'mate') moves = legal.filter((m) => { const u = E.makeMove(S, m); const st = E.gameStatus(S); E.unmakeMove(S, u); return st && st.type === 'checkmate'; });
  else moves = legal.filter((m) => nmv(m) === pz.answer.from + pz.answer.to);
  if (!moves.length) throw new Error('puzzle ' + key + ': no answer found by the engine');
  const m = pick ? moves.find((x) => nmv(x) === pick) : moves[0]; if (!m) throw new Error('puzzle ' + key + ': move ' + pick + ' is not an answer');
  const p = S.board[m.from], cap = S.board[m.to] !== E.EMPTY, mate = pz.goal === 'mate';
  const u = E.makeMove(S, m); const bk = E.kingSq(S, E.BLACK); E.unmakeMove(S, u);
  const enMove = `${EN_NAME[E.typeOf(p)]} ${E.sqName(m.from)}${cap ? '×' : '–'}${E.sqName(m.to)}`, khMove = `${KH_NAME[E.typeOf(p)]} ${E.sqName(m.from)}${cap ? '×' : '–'}${E.sqName(m.to)}`;
  const svg = boardSvg(S, null, `White to move: ${enMove}`, { arrow: [m.from, m.to], ring: mate ? [bk] : [], noTargets: true,
    desc: `White to move. White plays ${enMove}${mate ? ', which is checkmate' : ''}. White: ${list(S, E.WHITE)}. Black: ${list(S, E.BLACK)}.` });
  const alt = moves.length > 1 ? moves.filter((x) => x !== m).map((x) => EN_NAME[E.typeOf(S.board[x.from])] + ' ' + nmv(x).slice(0, 2) + '–' + nmv(x).slice(2)) : [];
  return { svg, khCap: `ខាងសដើរ — ${khMove}${mate ? ' ជាអុកងាប់។' : '។'}`, enCap: `White to move — ${enMove}${mate ? ' is checkmate.' : '.'}${alt.length ? ' (' + alt.join(' also works, and ') + ' also works.)' : ''}`.replace(' also works, and ', ' and ').replace('also works.)', 'also mate.)') };
}
function list(S, c) { const o = []; for (let i = 0; i < 64; i++) { const q = S.board[i]; if (q !== E.EMPTY && E.colorOf(q) === c) o.push(`${EN_NAME[E.typeOf(q)]}${E.isProm(q) ? ' (promoted)' : ''} on ${E.sqName(i)}`); } return o.join(', '); }
function puzzleFig(spec) {
  const [key, pick] = spec.split('@'); const f = puzzleFigure(key, pick);
  return `<figure class="puzfig">${f.svg}<figcaption><span class="kh">${f.khCap}</span><span class="en">${f.enCap}</span></figcaption></figure>`;
}
function lessonBoard(type, level) {
  const S = E.emptyState('always');
  const put = (name, t, c) => { S.board[E.sqIndex(name)] = E.mk(t, c); };
  const focus = LESSONS[type][level].setup(S, put);
  S.turn = E.WHITE;
  return boardSvg(S, E.sqIndex(focus), `${TYPE_NAME[type]}: ${level === 'basic' ? 'how it moves' : 'good to know'}`);
}
// the lessons' texts say "Click..." / "Try..." (they are for the interactive board): drop those sentences here
function staticKh(s) { return s.split('។').filter((x) => x.trim() && !/^\s*(ចុច|សាកល្បង)/.test(x)).map((x) => x.trim() + '។').join(' '); }
function staticEn(s) { return s.split(/(?<=[.!?])\s+/).filter((x) => !/^(Click|Try)\b/.test(x)).join(' '); }
const PIECES = [
  { t: E.KING, id: 'sdach', kh: 'ស្ដេច', tr: 'Sdach', en: 'King' }, { t: E.QUEEN, id: 'neang', kh: 'នាង', tr: 'Neang', en: 'Queen' },
  { t: E.BISHOP, id: 'koul', kh: 'គោល', tr: 'Koul', en: 'Bishop' }, { t: E.KNIGHT, id: 'ses', kh: 'សេះ', tr: 'Ses', en: 'Knight' },
  { t: E.ROOK, id: 'tuuk', kh: 'ទូក', tr: 'Tuuk', en: 'Boat / Rook' }, { t: E.PAWN, id: 'trey', kh: 'ត្រី', tr: 'Trey', en: 'Fish / Pawn' }
];
function pieceCards() {
  return PIECES.map((p) => {
    const L = LESSONS[p.t];
    const img = TYPE_FILE[p.t] + '-w.png';
    return `<article class="card piece" id="${p.id}">
<h3><img class="pic" src="/how-to-play/art/${img}" alt="" width="${Math.round(ART[img].w * 0.2)}" height="${Math.round(ART[img].h * 0.2)}" loading="lazy"><span class="kh">${p.kh}</span> <span class="tr">${p.tr}</span> <span class="en">(${p.en})</span></h3>
<div class="figs"><figure>${lessonBoard(p.t, 'basic')}<figcaption><span class="kh">ការដើរមូលដ្ឋាន</span><span class="en">How it moves</span></figcaption></figure>
<figure>${lessonBoard(p.t, 'adv')}<figcaption><span class="kh">គួរដឹង</span><span class="en">Good to know</span></figcaption></figure></div>
<p><span class="kh">${esc(staticKh(L.basic.kh))}</span><span class="en">${esc(staticEn(L.basic.en))}</span></p>
<p class="extra"><span class="kh">${esc(staticKh(L.adv.kh))}</span><span class="en">${esc(staticEn(L.adv.en))}</span></p>
</article>`;
  }).join('\n');
}
// the engine's piece values, as a table (Trey = 1): the page text quotes these, so they are read, not typed
function valuesTable() {
  const rows = [[E.PAWN, VAL[6]], [E.QUEEN, VAL[2]], [E.BISHOP, VAL[3]], [E.KNIGHT, VAL[4]], [E.ROOK, VAL[5]]];
  return `<table><tr><th><kh>កូនអុក</kh><en>Piece</en></th><th><kh>តម្លៃប្រហាក់ប្រហែល (ត្រី = ១)</kh><en>Rough value (Trey = 1)</en></th><th><kh>តម្លៃក្នុងម៉ាស៊ីន</kh><en>Engine score</en></th></tr>` +
    rows.map(([t, v]) => `<tr><td><span class="kh">${KH_NAME[t]}</span> <span class="en">${EN_NAME[t]}</span></td><td>${(v / VAL[6]).toFixed(1)}</td><td>${v}</td></tr>`).join('') +
    `<tr><td><span class="kh">${KH_NAME[E.KING]}</span> <span class="en">${EN_NAME[E.KING]}</span></td><td colspan="2"><kh>គ្មានតម្លៃ — បាត់ស្ដេច គឺចាញ់</kh><en>priceless: lose it and the game is lost</en></td></tr></table>`;
}
function countTable() {
  return `<table><tr><th><kh>ខាងខ្លាំងមាន…</kh><en>Stronger side has…</en></th><th><kh>ដែនកំណត់</kh><en>Limit</en></th></tr>` +
    E.PIECE_HONOR_TABLE.map((r) => `<tr><td><span class="kh">${r.count === 2 ? KH_NAME[r.piece] + 'ពីរ' : KH_NAME[r.piece] + 'មួយ'}</span><span class="en">${r.count === 2 ? 'Two' : 'One'} ${EN_NAME[r.piece]}</span></td><td>${r.limit}</td></tr>`).join('') +
    `<tr><td><kh>កូនអុកផ្សេងទៀត (ឧទាហរណ៍ មានតែនាង)</kh><en>Anything else (for example only a Neang)</en></td><td>${E.PIECE_HONOR_DEFAULT_LIMIT}</td></tr></table>`;
}
// the worked counting examples quoted in counting-rules.html: run through the engine, and the build stops if they are not what the text says
function checkCounting() {
  const S = E.emptyState('always'); S.kingMoved = [true, true]; S.queenMoved = [true, true]; S.turn = E.WHITE;
  const put = (n, t, c) => { S.board[E.sqIndex(n)] = E.mk(t, c); };
  put('a1', E.KING, E.WHITE); put('b1', E.ROOK, E.WHITE); put('c1', E.ROOK, E.WHITE); put('h8', E.KING, E.BLACK);
  if (!E.canCountPiece(S, E.BLACK)) throw new Error('counting example: Black should be able to count');
  E.startCounting(S, E.BLACK, 'piece');
  if (S.counting.count !== 4 || S.counting.limit !== 8) throw new Error('counting example: expected count 4 / limit 8, got ' + JSON.stringify(S.counting));
  const T = E.emptyState('always'); T.kingMoved = [true, true]; T.queenMoved = [true, true]; T.turn = E.WHITE;
  T.board[E.sqIndex('a1')] = E.mk(E.KING, E.WHITE); T.board[E.sqIndex('b1')] = E.mk(E.ROOK, E.WHITE); T.board[E.sqIndex('h8')] = E.mk(E.KING, E.BLACK);
  E.startCounting(T, E.BLACK, 'piece');
  if (T.counting.count !== 3 || T.counting.limit !== 16) throw new Error('counting example: one Tuuk should give 3 / 16, got ' + JSON.stringify(T.counting));
  const B = E.emptyState('always'); B.kingMoved = [true, true]; B.queenMoved = [true, true]; B.turn = E.WHITE;
  B.board[E.sqIndex('a1')] = E.mk(E.KING, E.WHITE); B.board[E.sqIndex('b1')] = E.mk(E.ROOK, E.WHITE); B.board[E.sqIndex('c1')] = E.mk(E.KNIGHT, E.WHITE); B.board[E.sqIndex('h8')] = E.mk(E.KING, E.BLACK); B.board[E.sqIndex('g8')] = E.mk(E.PAWN, E.BLACK);
  if (E.canCountBoard(B, E.BLACK) !== true) throw new Error("counting example: two Black pieces vs four White should allow Board's Honor");
  E.startCounting(B, E.BLACK, 'board');
  if (B.counting.count !== 1 || B.counting.limit !== 64) throw new Error("Board's Honor should start at 1 with limit 64");
}
checkCounting();
function startBoard() { return boardSvg(E.initialState('always'), null, 'The starting position of Ouk Chatrang: White (bottom) and Black (top)'); }

// ---------- the guides (articles): one list drives the cards, the footer, the structured data and the sitemap ----------
const GUIDES = [
  { file: 'how-to-play', kh: 'វិធីលេង', en: 'How to play', d: 'The board, every piece and its moves, special moves, promotion and checkmate, with a diagram for each piece.' },
  { file: 'strategy', kh: 'យុទ្ធសាស្ត្រ', en: 'Strategy guide', d: 'What each piece is worth, opening principles, tactics such as the fork and the Koul\'s blind spot, trading, promotion and endgames.' },
  { file: 'checkmate-patterns', kh: 'លំនាំអុកងាប់', en: 'Checkmate patterns', d: 'Eight mating patterns with diagrams: the box, the ladder, the back rank, the smothered mate and more.' },
  { file: 'counting-rules', kh: 'ច្បាប់ការរាប់', en: 'Counting rules', d: "Board's Honor and Piece's Honor explained, with the limits table and worked examples." },
  { file: 'glossary', kh: 'វាក្យសព្ទ', en: 'Glossary', d: 'Khmer chess terms with their English meanings: pieces, board, check, checkmate, counting.' },
  { file: 'history', kh: 'ប្រវត្តិ', en: 'History and origins', d: 'Where Ouk Chatrang comes from, the names of its pieces and how it relates to Makruk and international chess.' }
];
function guideCards(except) {
  return '<div class="guides">' + GUIDES.filter((g) => g.file !== except).map((g) => `<a class="guide" href="/${g.file}/"><b><span class="kh">${g.kh}</span><span class="en">${g.en}</span></b><span class="d">${esc(g.d)}</span></a>`).join('') + '</div>';
}
// ---------- the Khmer ornament (kbach): a lotus and a petal band, drawn small and flat ----------
const BUD = 'M0-7C2.6-4.2 3-0.6 0 4.2-3-0.6-2.6-4.2 0-7Z';
const LOTUS = `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='14' viewBox='-15 -8 30 14'><g fill='#e2b65a'><path d='${BUD}'/><path transform='rotate(-48 0 4) scale(.82)' d='${BUD}' opacity='.8'/><path transform='rotate(48 0 4) scale(.82)' d='${BUD}' opacity='.8'/><path transform='rotate(-84 0 4) scale(.6)' d='${BUD}' opacity='.6'/><path transform='rotate(84 0 4) scale(.6)' d='${BUD}' opacity='.6'/></g></svg>`;
const BAND = `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'><g fill='none' stroke='#e2b65a' stroke-opacity='.5' stroke-width='.8' stroke-linejoin='round'><path d='M0 .4C2.8 .9 5 3 6 6.4 7 3 9.2 .9 12 .4'/><path d='M3.9 .4C5 1.2 5.6 2.2 6 3.6 6.4 2.2 7 1.2 8.1 .4' opacity='.7'/></g></svg>`;
const uri = (svg) => 'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27') + '")';

const CSS = `
:root{--bg:#1b110a;--card:#2a1b0e;--card2:#33220f;--line:#5a4424;--gold:#e2b65a;--gold2:#edc56c;--text:#f3e7cf;--muted:#b39f7c;--on-gold:#2a1806;--ok:#2f8f5b;--bad:#c0392b}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--text);font:17px/1.75 "Noto Sans Khmer","Khmer OS","Khmer MN","Leelawadee UI","Segoe UI",system-ui,sans-serif}
a{color:var(--gold);text-underline-offset:3px}a:hover{color:var(--gold2)}
.wrap{max-width:780px;margin:0 auto;padding:0 18px}
header.top{border-bottom:1px solid var(--line);background:var(--card)}
header.top .wrap{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}
.brand{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-weight:700;margin-right:auto}
.brand img{width:34px;height:34px;border-radius:8px}
.brand small{display:block;font-weight:400;font-size:12px;color:var(--muted);line-height:1.2}
nav.top{display:flex;gap:16px;align-items:center}
nav.top a{font-size:15px;color:var(--text);text-decoration:none}
nav.top a.play{color:var(--on-gold);background:var(--gold);padding:6px 14px;border-radius:999px;font-weight:700}
nav.top a.play:hover{background:var(--gold2);color:var(--on-gold)}
.brk{display:none}
@media(max-width:600px){.brk{display:block;flex-basis:100%;height:0;order:2}.lang{order:3;margin:0 auto}.brand small{display:none}}
nav.top a:hover{color:var(--gold2)}
.lang{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.lang button{font:inherit;font-size:13px;line-height:1;padding:7px 11px;background:transparent;color:var(--muted);border:0;cursor:pointer}
.lang button[aria-pressed=true]{background:var(--gold);color:var(--on-gold);font-weight:700}
.btn{display:inline-block;font:inherit;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;background:var(--gold);color:var(--on-gold);border:1px solid var(--gold)}
.btn:hover{background:var(--gold2);color:var(--on-gold)}
.btn.alt{background:#3f2915;color:var(--text);border-color:rgba(226,182,90,.4);font-weight:600}
.btn.alt:hover{background:#50341b;color:var(--text)}
main{padding:26px 0 40px}
h1{font-size:30px;line-height:1.35;color:var(--gold);text-align:center}
h1 .en{font-size:.62em;color:var(--text);font-weight:600}
h1::after{content:'';display:block;width:min(230px,62%);height:14px;margin:12px auto 4px;background:${uri(LOTUS)} center/30px 14px no-repeat,linear-gradient(90deg,transparent,rgba(226,182,90,.7) 20%,rgba(226,182,90,.7) 38%,transparent 38%,transparent 62%,rgba(226,182,90,.7) 62%,rgba(226,182,90,.7) 80%,transparent) center 9px/100% 1px no-repeat}
h2{font-size:23px;line-height:1.4;color:var(--gold);margin:36px 0 8px;padding-top:6px;border-top:1px solid var(--line)}
h2 .en{display:block;font-size:.72em;color:var(--muted);font-weight:600}
h3{font-size:19px;color:var(--gold);margin:22px 0 6px}
p,ul,ol,table,details,figure{margin:10px 0}
ul,ol{padding-left:24px}li{margin:5px 0}
.kh,.en{display:block}
body.lang-kh .en,body.lang-en .kh{display:none}
body.lang-both .en,body:not(.lang-kh):not(.lang-en) .en{color:#d6c7a6}
.lead{font-size:18px;text-align:center;margin:14px 0 18px}
.cta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:16px 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:16px 0}
.card h3{margin:0 0 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.card h3 .kh,.card h3 .en,.card h3 .tr{display:inline}
body.lang-kh .card h3 .tr{display:none}
.card h3 .en{color:var(--muted);font-weight:500;font-size:.8em}
.pic{height:44px;width:auto;margin-right:4px}
.figs{display:grid;grid-template-columns:1fr;gap:14px;margin:6px 0 10px}
@media(min-width:640px){.figs{grid-template-columns:1fr 1fr}}
figure{text-align:center}
figcaption{font-size:14px;color:var(--muted);margin-top:4px}
.puzfig{margin:16px auto;max-width:420px}
.guides{display:grid;grid-template-columns:1fr;gap:10px;margin:14px 0}
@media(min-width:640px){.guides{grid-template-columns:1fr 1fr}}
a.guide{display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--text);text-decoration:none}
a.guide:hover{border-color:var(--gold)}a.guide b{display:block;color:var(--gold);margin-bottom:2px}
a.guide .d{display:block;font-size:14px;color:var(--muted);line-height:1.6}
.toc{font-size:15px}.toc a{margin-right:10px;white-space:nowrap}
.byline{text-align:center;color:var(--muted);font-size:14px;margin-top:6px}
svg.board{width:100%;height:auto;max-width:392px;display:block;margin:0 auto}
.extra{border-left:3px solid var(--line);padding-left:12px;color:#e3d5b7}
.legend{font-size:14px;color:var(--muted);text-align:center}
.legend i{display:inline-block;vertical-align:-3px;margin:0 4px 0 10px}
.legend .d{width:13px;height:13px;border-radius:50%;background:var(--ok)}
.legend .r{width:15px;height:15px;border-radius:50%;border:2.4px solid var(--bad)}
.legend .s{width:15px;height:15px;background:#f0c75e;opacity:.8}
table{border-collapse:collapse;width:100%;font-size:15px;background:var(--card)}
th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}
th{color:var(--gold);background:var(--card2)}
td .kh,td .en,th .kh,th .en{display:block}
.note{font-size:14px;color:var(--muted)}
@media(max-width:640px){table.stack tr:first-child{display:none}table.stack,table.stack tbody{display:block}table.stack tr{display:block;margin:12px 0;border:1px solid var(--line);border-radius:10px;background:var(--card)}table.stack td{display:block;border:0;padding:3px 12px}table.stack td:first-child{font-weight:700;color:var(--gold);padding-top:8px}table.stack td:last-child{color:var(--muted);font-size:14px;padding-bottom:9px}table.stack td:last-child::before{content:'Why: ';font-weight:700}}
details{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 16px}
summary{cursor:pointer;font-weight:700;color:var(--gold);list-style:none}
summary::-webkit-details-marker{display:none}
summary::before{content:'▸ ';color:var(--gold)}
details[open] summary::before{content:'▾ '}
details[open] summary{margin-bottom:6px}
.summary{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:10px;padding:12px 18px;margin:18px 0}
.summary h2{border:0;margin:0 0 4px;padding:0;font-size:19px}
.legal h2{font-size:20px}.legal .updated{text-align:center;color:var(--muted);font-size:14px;margin-top:6px}
footer.foot{border-top:1px solid var(--line);background:var(--card);padding:18px 0 26px;text-align:center;font-size:14px;color:var(--muted)}
footer.foot a{margin:0 8px}
footer.foot::before{content:'';display:block;height:7px;margin:-18px 0 14px;background:${uri(BAND)} center/12px 7px repeat-x}
/* ads (see ads.js): an empty slot takes no room; it is filled only when ads are switched on */
.adslot{margin:24px auto;text-align:center}.adslot:empty{display:none}
@media print{.adslot,header.top,footer.foot,.cta{display:none}body{background:#fff;color:#000}}
`;

const LANG_JS = `(function(){var K='oukLangPref',v='both';try{v=localStorage.getItem(K)||'both'}catch(e){}
function set(x,save){document.body.classList.remove('lang-kh','lang-en','lang-both');document.body.classList.add('lang-'+(x==='kh'||x==='en'?x:'both'));
document.querySelectorAll('.lang button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.l===(x==='kh'||x==='en'?x:'both')))});
if(save){try{localStorage.setItem(K,x)}catch(e){}}}
document.querySelectorAll('.lang button').forEach(function(b){b.addEventListener('click',function(){set(b.dataset.l,true)})});set(v,false)})();`;

function layout({ file, title, desc, body, extraHead, legal }) {
  const url = SITE + '/' + file + '/';
  if (!legal) { // an article: say so to search engines (schema.org)
    extraHead = (extraHead || '') + '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: title.split(' — ')[0], description: desc, inLanguage: ['km', 'en'], mainEntityOfPage: url, dateModified: UPDATED, image: SITE + '/icon-512.png', publisher: { '@type': 'Organization', name: 'Ouk Chatrang', url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png' } } }) + '</script>\n';
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Ouk Chatrang"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/icon-512.png">
<meta name="theme-color" content="#221a12">
<link rel="icon" href="/icon.svg?v=2" type="image/svg+xml">
${extraHead || ''}<script src="/ads.js" defer></script>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="/"><img src="/icon-192.png" alt="" width="34" height="34"><span><kh>អុកចត្រង្គ</kh><en>Ouk Chatrang</en><small><kh>លេងឥឡូវ ឥតគិតថ្លៃ</kh><en>Play free</en></small></span></a>
<nav class="top"><a href="/how-to-play/"><kh>វិធីលេង</kh><en>How to play</en></a><a class="play" href="/"><kh>▸ លេង</kh><en>▸ Play</en></a></nav>
<span class="brk"></span>
<div class="lang" role="group" aria-label="Language"><button type="button" data-l="kh">ខ្មែរ</button><button type="button" data-l="en">EN</button><button type="button" data-l="both">ខ្មែរ+EN</button></div>
</div></header>
<main><div class="wrap${legal ? ' legal' : ''}">
${body}
</div></main>
<footer class="foot"><div class="wrap">
<p>${GUIDES.map((g) => `<a href="/${g.file}/"><kh>${g.kh}</kh><en>${g.en}</en></a>`).join(' · ')}</p>
<p style="margin-top:6px"><a href="/"><kh>លេង</kh><en>Play</en></a> · <a href="/about/"><kh>អំពី</kh><en>About</en></a> · <a href="/privacy/"><kh>ឯកជនភាព</kh><en>Privacy</en></a> · <a href="/terms/"><kh>លក្ខខណ្ឌ</kh><en>Terms</en></a> · <a href="mailto:${CONTACT}"><kh>ទំនាក់ទំនង</kh><en>Contact</en></a></p>
<p style="margin-top:8px">© 2026 Ouk Chatrang · oukkhmer.com</p>
</div></footer>
<script>${LANG_JS}</script>
</body>
</html>
`;
}
function transform(s) {
  return s.replace(/<kh>/g, '<span class="kh">').replace(/<\/kh>/g, '</span>').replace(/<en>/g, '<span class="en">').replace(/<\/en>/g, '</span>')
    .replace(/\{\{CONTACT\}\}/g, `<a href="mailto:${CONTACT}">${CONTACT}</a>`).replace(/\{\{CONTACTADDR\}\}/g, CONTACT).replace(/\{\{UPDATED\}\}/g, UPDATED)
    .replace(/\{\{BOARD:start\}\}/g, () => startBoard()).replace(/\{\{PIECES\}\}/g, () => pieceCards())
    .replace(/\{\{PUZ:([a-z0-9@]+)\}\}/g, (_, k) => puzzleFig(k)).replace(/\{\{VALUES\}\}/g, () => valuesTable()).replace(/\{\{COUNTTABLE\}\}/g, () => countTable())
    .replace(/\{\{GUIDES\}\}/g, () => guideCards());
}
function read(f) { return fs.readFileSync(path.join(__dirname, 'pages', f), 'utf8'); }
const PAGES = [
  { file: 'how-to-play', src: 'how-to-play.html', title: 'How to play Ouk Chatrang (Khmer chess) — រៀនលេងអុកចត្រង្គ',
    desc: 'Learn to play Ouk Chatrang, traditional Cambodian chess: the board, how every piece moves, special moves, promotion, checkmate and the counting rules, with diagrams. Free to play online.', prio: '0.8' },
  { file: 'strategy', src: 'strategy.html', title: 'Ouk Chatrang strategy guide: piece values, openings, tactics and endgames — យុទ្ធសាស្ត្រ',
    desc: 'A practical strategy guide to Ouk Chatrang (Cambodian chess): what each piece is worth, how to open, tactics like the Ses fork and the Koul\'s blind spot, trading, promotion and endgames, with diagrams.', prio: '0.7' },
  { file: 'checkmate-patterns', src: 'checkmate-patterns.html', title: 'Checkmate patterns in Ouk Chatrang (Cambodian chess), with diagrams — លំនាំអុកងាប់',
    desc: 'Eight checkmate patterns in Ouk Chatrang with engine-checked diagrams: the box mate, the ladder, back-rank mate, smothered mate, mates with the Koul and Neang, discovered mate.', prio: '0.7' },
  { file: 'counting-rules', src: 'counting-rules.html', title: "Counting rules in Ouk Chatrang explained: Board's Honor and Piece's Honor — ច្បាប់ការរាប់",
    desc: "How the counting rules of Ouk Chatrang (Cambodian chess) work: Board's Honor, Piece's Honor, the limits table and worked examples.", prio: '0.7' },
  { file: 'glossary', src: 'glossary.html', title: 'Ouk Chatrang glossary: Khmer chess terms and their English meanings — វាក្យសព្ទ',
    desc: 'Khmer chess vocabulary for Ouk Chatrang: the six pieces, board terms, check, checkmate, stalemate, promotion and the counting rules, in Khmer and English.', prio: '0.6' },
  { file: 'history', src: 'history.html', title: 'History and origins of Ouk Chatrang, Cambodian chess — ប្រវត្តិអុកចត្រង្គ',
    desc: 'A short overview of where Ouk Chatrang comes from: the chaturanga family, the names of the pieces, and how it relates to Thai Makruk and international chess.', prio: '0.6' },
  { file: 'about', src: 'about.html', title: 'About Ouk Chatrang (oukkhmer.com) — អំពីអុកចត្រង្គ',
    desc: 'About the free Ouk Chatrang web game: what you can do, how the computer opponent works, languages, accounts, and how to contact us.', prio: '0.5' },
  { file: 'privacy', src: 'privacy.html', legal: true, title: 'Privacy Policy — Ouk Chatrang', desc: 'How Ouk Chatrang (oukkhmer.com and ouk.bykhmer.com) collects, uses and protects your information, and the choices you have.', prio: '0.3' },
  { file: 'terms', src: 'terms.html', legal: true, title: 'Terms of Use — Ouk Chatrang', desc: 'The terms for using the Ouk Chatrang game at oukkhmer.com and ouk.bykhmer.com.', prio: '0.3' }
];
for (const p of PAGES) {
  const out = layout({ file: p.file, title: p.title, desc: p.desc, legal: p.legal, body: transform(read(p.src)) });
  const dir = path.join(ROOT, p.file); fs.mkdirSync(dir, { recursive: true });
  // the layout's own <kh>/<en> header/footer pairs are turned into spans too
  fs.writeFileSync(path.join(dir, 'index.html'), transform(out));
  console.log(p.file + '/index.html', Math.round(out.length / 1024) + ' KB');
}
// the sitemap is generated from the same list, so a new page can never be forgotten
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [{ file: '', prio: '1.0' }].concat(PAGES).map((p) => `  <url><loc>${SITE}/${p.file ? p.file + '/' : ''}</loc><lastmod>${UPDATED}</lastmod><priority>${p.prio}</priority></url>`).join('\n') + '\n</urlset>\n');
