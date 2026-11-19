// Genera una pagina statica per ogni bonus (cartella bonus/), l'indice bonus/index.html e sitemap.xml.
// Uso:  node strumenti/genera-pagine.mjs             → scrive i file
//       node strumenti/genera-pagine.mjs --controlla → non scrive, esce con 1 se i file non sono aggiornati
// Le pagine servono a farsi trovare su Google: niente script, niente tracciamento, solo testo e link ufficiali.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://spicci2026.github.io/spicci/';
const DIR = path.join(ROOT, 'bonus');
const CONTROLLA = process.argv.includes('--controlla');

// ---------- catalogo ----------
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fine = js.lastIndexOf('})');
js = js.slice(0, fine) + "\n;globalThis.__S={ATTIVI,ARRIVO,LOC,REGIONI,serve:(typeof serve==='function'?serve:null)};\n" + js.slice(fine);
const stub = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : stub), apply: () => stub, construct: () => stub });
const ctx = { console, Intl, JSON, Math, Date, Number, String, Array, Object, RegExp, document: stub, window: stub, navigator: stub, location: stub,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, setTimeout() {}, clearTimeout() {}, URLSearchParams,
  matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(js, ctx);
const S = ctx.__S;

const V = (fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/const V='spicci-(\d{4})-(\d{2})-(\d{2})/) || []);
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const DATA_ISO = V.length ? `${V[1]}-${V[2]}-${V[3]}` : '2026-01-01';
const DATA_IT = V.length ? `${+V[3]} ${MESI[+V[2] - 1]} ${V[1]}` : '';

// ---------- utilità ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’'`]/g, '').replace(/€/g, 'euro').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
const taglia = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
function territorio(x) {
  if (!x.z) return { nome: 'Tutta Italia', gruppo: 'Nazionali', regione: null };
  if (S.LOC[x.z]) { const reg = S.LOC[x.z].reg; return { nome: `${x.z.replace(/^Comune (di |dell')/, (m) => m)}${reg ? ' (' + reg + ')' : ''}`, gruppo: 'Comuni', regione: reg || null }; }
  return { nome: x.z, gruppo: 'Regioni', regione: x.z };
}

// ---------- elenco misure con slug unico ----------
const misure = [];
const usati = new Set();
for (const [stato, L] of [['attivo', S.ATTIVI], ['arrivo', S.ARRIVO]]) {
  for (const x of L) {
    const ter = territorio(x);
    // nome del luogo nel titolo, se non c'è già (aiuta chi cerca "bonus … Campania")
    const luogo = x.z ? x.z.replace(/^Comune (di |dell'|d')/, '').replace(/^Unione /, '') : '';
    const norm = (s) => slugify(s).replace(/-/g, ' ');
    const nome = luogo && !norm(x.t).includes(norm(luogo)) ? `${x.t} – ${luogo}` : x.t;
    let slug = slugify(nome) || 'bonus';
    if (usati.has(slug)) slug = slugify(nome + ' ' + (x.z || 'italia'));
    let n = 2; const base = slug; while (usati.has(slug)) slug = `${base}-${n++}`;
    usati.add(slug);
    misure.push({ x, stato, ter, slug, nome });
  }
}

// ---------- pezzi comuni ----------
const CSS = `:root{--bg:#fff8ec;--card:#fff;--ink:#22252b;--muted:#666b73;--line:#f1e2c6;--a1:#f4511e;--a2:#c2410c;--ok:#e8f6ec;--warn:#fff4d6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:20px 18px 60px}a{color:var(--a2)}h1{font-size:28px;line-height:1.2;margin:12px 0 8px}
h2{font-size:19px;margin:26px 0 8px}.muted{color:var(--muted);font-size:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin:12px 0}
.top{display:flex;justify-content:space-between;align-items:center;font-weight:800;gap:10px}.top a{text-decoration:none}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 6px}.chip{background:#fff;border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:13px;font-weight:700}
.chip.on{background:var(--ok);border-color:#bfe5c9}.chip.wait{background:var(--warn);border-color:#f3dc9b}
.amount{font-size:22px;font-weight:800;color:var(--a2);margin:2px 0 8px}dl{margin:0}dt{font-weight:800;margin-top:10px}dd{margin:2px 0 0}
.btn{display:block;text-align:center;background:var(--a1);color:#fff;text-decoration:none;font-weight:800;border-radius:14px;padding:13px 16px;margin:14px 0 6px}
.btn.alt{background:#fff;color:var(--a2);border:2px solid var(--a1)}.note{background:var(--warn);border-radius:12px;padding:10px 12px;font-size:14px}
ul{padding-left:20px}li{margin:4px 0}.cols{columns:2 280px;column-gap:24px}.cols li{break-inside:avoid}footer{margin-top:34px;font-size:13px;color:var(--muted)}`;

function pagina({ titolo, descr, canon, corpo, livello }) {
  const su = livello ? '../' : './';
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)}</title><meta name="description" content="${esc(descr)}"><link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(titolo)}"><meta property="og:description" content="${esc(descr)}"><meta property="og:url" content="${esc(canon)}"><meta property="og:image" content="${BASE}icons/icon-512.png">
<meta name="theme-color" content="#f4511e"><link rel="icon" href="${su}favicon.ico"><style>${CSS}</style></head><body><div class="wrap">
<div class="top"><a href="${su}">← Spicci</a><span class="muted">Aggiornato al ${esc(DATA_IT)}</span></div>
${corpo}
<footer><p><b>Spicci non è un sito della Pubblica Amministrazione</b> e non rappresenta nessun ente pubblico: fa sempre fede il bando ufficiale dell'ente. Le informazioni possono cambiare; controlla sempre sulla pagina ufficiale prima di fare domanda.</p>
<p><a href="${su}">App Spicci</a> · <a href="${su}bonus/">Tutti i bonus</a> · <a href="${su}fonti.html">Fonti</a> · <a href="${su}aiuto.html">Aiuto</a> · <a href="${su}privacy.html">Privacy</a> · <a href="${su}termini.html">Termini</a></p></footer>
</div></body></html>
`;
}

function paginaBonus(m) {
  const { x, stato, ter, slug, nome } = m;
  const aperto = stato === 'attivo';
  const titolo = `${nome}: requisiti, importo e come fare domanda | Spicci`;
  const descr = taglia(`${nome} (${ter.nome}). ${x.a}. ${x.r}`.replace(/\s+/g, ' '), 158);
  let ts = null; try { ts = S.serve ? S.serve(x) : null; } catch { ts = null; }
  const righe = [];
  righe.push(`<dt>Per chi</dt><dd>${esc(x.r)}</dd>`);
  if (aperto && x.todo) righe.push(`<dt>Come si fa</dt><dd>${esc(x.todo)}</dd>`);
  if (ts) righe.push(`<dt>Ti serve</dt><dd>${esc(ts)}</dd>`);
  righe.push(aperto ? `<dt>Scadenza</dt><dd>${esc(x.s)}</dd>` : `<dt>Quando</dt><dd>${esc(x.w)}</dd>`);
  if (x.e) righe.push(`<dt>Ente</dt><dd>${esc(x.e)}</dd>`);
  // bonus collegati: stessa categoria e stesso ambito (nazionale o stessa regione)
  const simili = misure.filter((o) => o !== m && o.x.c === x.c && (o.ter.regione === ter.regione) && o.stato === 'attivo').slice(0, 6);
  const corpo = `<div class="chips"><span class="chip ${aperto ? 'on' : 'wait'}">${aperto ? 'Aperto' : 'In arrivo'}</span><span class="chip">${esc(x.c)}</span><span class="chip">${esc(ter.nome)}</span></div>
<h1>${x.i ? esc(x.i) + ' ' : ''}${esc(nome)}</h1>
<div class="card"><div class="amount">${esc(x.a)}</div><dl>${righe.join('')}</dl>
${x.dub ? '<p class="note">Le fonti non sono del tutto concordi su alcuni dettagli: controlla sulla pagina ufficiale.</p>' : ''}
${x.u ? `<a class="btn" href="${esc(x.u)}" target="_blank" rel="noopener">Vai alla pagina ufficiale del bonus →</a>` : '<p class="muted">La pagina ufficiale della prossima edizione non è ancora disponibile.</p>'}
<a class="btn alt" href="../">Scopri in 1 minuto tutti i bonus che ti spettano</a>
<p class="muted">Spicci è gratuita e i tuoi dati restano sul tuo telefono.</p></div>
${simili.length ? `<h2>Altri bonus simili</h2><ul>${simili.map((o) => `<li><a href="${o.slug}.html">${esc(o.x.t)}</a> <span class="muted">· ${esc(o.x.a)}</span></li>`).join('')}</ul>` : ''}`;
  return pagina({ titolo, descr, canon: `${BASE}bonus/${slug}.html`, corpo, livello: 1 });
}

function paginaIndice() {
  const att = misure.filter((m) => m.stato === 'attivo'), arr = misure.filter((m) => m.stato === 'arrivo');
  const voce = (m) => `<li><a href="${m.slug}.html">${esc(m.x.t)}</a> <span class="muted">· ${esc(m.x.a)}</span></li>`;
  const perGruppo = (L) => {
    const naz = L.filter((m) => m.ter.gruppo === 'Nazionali');
    const cat = [...new Set(naz.map((m) => m.x.c))].sort((a, b) => a.localeCompare(b, 'it'));
    let h = cat.map((c) => `<h3>${esc(c)}</h3><ul>${naz.filter((m) => m.x.c === c).map(voce).join('')}</ul>`).join('');
    const reg = [...new Set(L.filter((m) => m.ter.regione).map((m) => m.ter.regione))].sort((a, b) => a.localeCompare(b, 'it'));
    h += reg.map((r) => `<h3>${esc(r)}</h3><ul>${L.filter((m) => m.ter.regione === r).map((m) => voce(m).replace('</li>', m.ter.gruppo === 'Comuni' ? ` <span class="muted">· ${esc(m.x.z)}</span></li>` : '</li>')).join('')}</ul>`).join('');
    return h;
  };
  const corpo = `<h1>Tutti i bonus: Stato, Regioni e Comuni</h1>
<p>L'elenco completo dei bonus, contributi e agevolazioni che Spicci controlla: ${att.length} aperti ora e ${arr.length} in arrivo. Per sapere quali spettano proprio a te, <a href="../">compila il profilo nell'app</a>: bastano un minuto e i tuoi dati restano sul tuo telefono.</p>
<h2>Aperti ora</h2>${perGruppo(att)}<h2>In arrivo</h2>${perGruppo(arr)}`;
  return pagina({ titolo: 'Tutti i bonus 2026 di Stato, Regioni e Comuni | Spicci', descr: `Elenco dei bonus e contributi aperti e in arrivo in Italia: ${att.length} aperti ora, con requisiti, importi e link alla pagina ufficiale.`, canon: `${BASE}bonus/`, corpo, livello: 1 });
}

function sitemap() {
  const fissi = [['', 'daily', '1.0'], ['bonus/', 'daily', '0.9'], ['fonti.html', 'weekly', '0.6'], ['aiuto.html', 'monthly', '0.5'], ['pro.html', 'monthly', '0.5'], ['privacy.html', 'yearly', '0.3'], ['termini.html', 'yearly', '0.3']];
  const righe = fissi.map(([p, f, pr]) => `  <url><loc>${BASE}${p}</loc><lastmod>${DATA_ISO}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`);
  for (const m of misure) righe.push(`  <url><loc>${BASE}bonus/${m.slug}.html</loc><lastmod>${DATA_ISO}</lastmod><changefreq>weekly</changefreq><priority>${m.stato === 'attivo' ? '0.8' : '0.5'}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${righe.join('\n')}\n</urlset>\n`;
}

// ---------- scrittura o controllo ----------
const atteso = new Map();
for (const m of misure) atteso.set(path.join(DIR, m.slug + '.html'), paginaBonus(m));
atteso.set(path.join(DIR, 'index.html'), paginaIndice());
atteso.set(path.join(ROOT, 'sitemap.xml'), sitemap());

const presenti = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.html')).map((f) => path.join(DIR, f)) : [];
const daTogliere = presenti.filter((f) => !atteso.has(f));
const diversi = [...atteso].filter(([f, c]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== c).map(([f]) => f);

if (CONTROLLA) {
  if (diversi.length || daTogliere.length) {
    console.log(`Pagine dei bonus non aggiornate: ${diversi.length} da riscrivere, ${daTogliere.length} da togliere. Esegui: node strumenti/genera-pagine.mjs`);
    process.exit(1);
  }
  console.log(`Pagine dei bonus aggiornate (${misure.length}).`);
} else {
  fs.mkdirSync(DIR, { recursive: true });
  for (const f of diversi) fs.writeFileSync(f, atteso.get(f));
  for (const f of daTogliere) fs.unlinkSync(f);
  console.log(`Pagine dei bonus: ${misure.length} (${diversi.length} scritte, ${daTogliere.length} tolte), indice e sitemap aggiornati.`);
}
