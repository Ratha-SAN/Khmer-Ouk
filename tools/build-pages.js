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
const ART = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages', 'art-meta.json'), 'utf8'));
const CONTACT = process.env.CONTACT_EMAIL || 'support@oukkhmer.com'; // the public contact address shown on the pages
const SITE = 'https://oukkhmer.com';
const UPDATED = '2026-11-15';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- board diagrams ----------
const T = 44, ML = 28, MT = 8, MR = 8, MB = 36, BW = 8 * T;
const FILES_KH = ['ក', 'ខ', 'គ', 'ឃ', 'ង', 'ច', 'ឆ', 'ជ'], RANKS_KH = ['១', '២', '៣', '៤', '៥', '៦', '៧', '៨'];
const TYPE_FILE = { [E.KING]: 'king', [E.QUEEN]: 'queen', [E.BISHOP]: 'bishop', [E.KNIGHT]: 'knight', [E.ROOK]: 'rook', [E.PAWN]: 'pawn' };
const TYPE_NAME = { [E.KING]: 'Sdach (King)', [E.QUEEN]: 'Neang (Queen)', [E.BISHOP]: 'Koul (Bishop)', [E.KNIGHT]: 'Ses (Knight)', [E.ROOK]: 'Tuuk (Rook)', [E.PAWN]: 'Trey (Pawn)' };
const SCALE = 0.95 * T / ART['king-w.png'].h; // every piece at one scale, as in the game: the Sdach just under one square tall
let figN = 0;
function boardSvg(S, focus, title) {
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
  for (const t of targets) if (t.cap) g += `<rect x="${px(t.sq)}" y="${py(t.sq)}" width="${T}" height="${T}" fill="#c0392b" opacity=".18"/>`;
  for (let sq = 0; sq < 64; sq++) {
    const p = S.board[sq]; if (p === E.EMPTY) continue;
    const t = E.typeOf(p), c = E.colorOf(p), f = TYPE_FILE[t] + (c === E.WHITE ? '-w' : '-b') + '.png', a = ART[f];
    const w = (a.w * SCALE).toFixed(1), h = (a.h * SCALE).toFixed(1);
    const x = px(sq) + (T - w) / 2, y = t === E.PAWN ? py(sq) + (T - h) / 2 : py(sq) + T - h - 0.04 * T;
    g += `<image href="art/${f}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}"/>`;
  }
  for (const t of targets) {
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
  if (focus != null) {
    const sqn = E.sqName(focus), fp = S.board[focus];
    const to = targets.filter((t) => !t.cap).map((t) => E.sqName(t.sq)), cp = targets.filter((t) => t.cap).map((t) => E.sqName(t.sq));
    desc = `${title}. The ${E.colorOf(fp) === E.WHITE ? 'white' : 'black'} ${TYPE_NAME[E.typeOf(fp)]} on ${sqn} can move to ${to.length ? to.join(', ') : 'no empty square'}` + (cp.length ? ` and capture on ${cp.join(', ')}.` : '.');
  }
  return `<svg class="board" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}t ${id}d" font-family="'Noto Sans Khmer','Khmer OS','Khmer MN','Leelawadee UI','Segoe UI',system-ui,sans-serif"><title id="${id}t">${esc(title)}</title><desc id="${id}d">${esc(desc)}</desc>${g}${lab}</svg>`;
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
<h3><img class="pic" src="art/${img}" alt="" width="${Math.round(ART[img].w * 0.2)}" height="${Math.round(ART[img].h * 0.2)}" loading="lazy"><span class="kh">${p.kh}</span> <span class="tr">${p.tr}</span> <span class="en">(${p.en})</span></h3>
<div class="figs"><figure>${lessonBoard(p.t, 'basic')}<figcaption><span class="kh">ការដើរមូលដ្ឋាន</span><span class="en">How it moves</span></figcaption></figure>
<figure>${lessonBoard(p.t, 'adv')}<figcaption><span class="kh">គួរដឹង</span><span class="en">Good to know</span></figcaption></figure></div>
<p><span class="kh">${esc(staticKh(L.basic.kh))}</span><span class="en">${esc(staticEn(L.basic.en))}</span></p>
<p class="extra"><span class="kh">${esc(staticKh(L.adv.kh))}</span><span class="en">${esc(staticEn(L.adv.en))}</span></p>
</article>`;
  }).join('\n');
}
function startBoard() { return boardSvg(E.initialState('always'), null, 'The starting position of Ouk Chatrang: White (bottom) and Black (top)'); }

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
@media print{header.top,footer.foot,.cta{display:none}body{background:#fff;color:#000}}
`;

const LANG_JS = `(function(){var K='oukLangPref',v='both';try{v=localStorage.getItem(K)||'both'}catch(e){}
function set(x,save){document.body.classList.remove('lang-kh','lang-en','lang-both');document.body.classList.add('lang-'+(x==='kh'||x==='en'?x:'both'));
document.querySelectorAll('.lang button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.l===(x==='kh'||x==='en'?x:'both')))});
if(save){try{localStorage.setItem(K,x)}catch(e){}}}
document.querySelectorAll('.lang button').forEach(function(b){b.addEventListener('click',function(){set(b.dataset.l,true)})});set(v,false)})();`;

function layout({ file, title, desc, body, extraHead, legal }) {
  const url = SITE + '/' + file + '/';
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
${extraHead || ''}<style>${CSS}</style>
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
<a href="/"><kh>លេង</kh><en>Play</en></a> · <a href="/how-to-play/"><kh>វិធីលេង</kh><en>How to play</en></a> · <a href="/privacy/"><kh>ឯកជនភាព</kh><en>Privacy</en></a> · <a href="/terms/"><kh>លក្ខខណ្ឌ</kh><en>Terms</en></a> · <a href="mailto:${CONTACT}"><kh>ទំនាក់ទំនង</kh><en>Contact</en></a>
<p style="margin-top:8px">© 2026 Ouk Chatrang · oukkhmer.com</p>
</div></footer>
<script>${LANG_JS}</script>
</body>
</html>
`;
}
function transform(s) {
  return s.replace(/<kh>/g, '<span class="kh">').replace(/<\/kh>/g, '</span>').replace(/<en>/g, '<span class="en">').replace(/<\/en>/g, '</span>')
    .replace(/\{\{CONTACT\}\}/g, `<a href="mailto:${CONTACT}">${CONTACT}</a>`).replace(/\{\{UPDATED\}\}/g, UPDATED)
    .replace(/\{\{BOARD:start\}\}/g, () => startBoard()).replace(/\{\{PIECES\}\}/g, () => pieceCards());
}
function read(f) { return fs.readFileSync(path.join(__dirname, 'pages', f), 'utf8'); }
const PAGES = [
  { file: 'how-to-play', src: 'how-to-play.html', title: 'How to play Ouk Chatrang (Khmer chess) — រៀនលេងអុកចត្រង្គ',
    desc: 'Learn to play Ouk Chatrang, traditional Cambodian chess: the board, how every piece moves, special moves, promotion, checkmate and the counting rules, with diagrams. Free to play online.' },
  { file: 'privacy', src: 'privacy.html', legal: true, title: 'Privacy Policy — Ouk Chatrang', desc: 'How Ouk Chatrang (oukkhmer.com) collects, uses and protects your information, and the choices you have.' },
  { file: 'terms', src: 'terms.html', legal: true, title: 'Terms of Use — Ouk Chatrang', desc: 'The terms for using the Ouk Chatrang game at oukkhmer.com.' }
];
for (const p of PAGES) {
  const out = layout({ file: p.file, title: p.title, desc: p.desc, legal: p.legal, body: transform(read(p.src)) });
  const dir = path.join(ROOT, p.file); fs.mkdirSync(dir, { recursive: true });
  // the layout's own <kh>/<en> header/footer pairs are turned into spans too
  fs.writeFileSync(path.join(dir, 'index.html'), transform(out));
  console.log(p.file + '/index.html', Math.round(out.length / 1024) + ' KB');
}
