// Prepara i dati della dashboard "Spicci — stato dell'app" (quattro file CSV).
// Uso: node strumenti/dati-dashboard.mjs [cartella]   (predefinita: /tmp/spicci-dashboard)
// Legge solo index.html, sw.js, strumenti/link-controllati.md e strumenti/dashboard-manuale.json. Non pubblica niente.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dir = process.argv[2] || '/tmp/spicci-dashboard';
const html = fs.readFileSync('index.html', 'utf8');
let js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fine = js.lastIndexOf('})');
js = js.slice(0, fine) + ';globalThis.__S={ATTIVI,ARRIVO,LOC,fineDi,giorniA};' + js.slice(fine);
const mk = () => ({ value: '', checked: false, hidden: false, textContent: '', children: [], style: {}, attrs: {}, appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute() {}, reset() {}, querySelector() { return mk(); }, querySelectorAll() { return []; }, classList: { add() {}, remove() {} } });
const els = {};
const ctx = { console, Intl, JSON, Math, Date, setTimeout() {}, clearTimeout() {}, document: { getElementById: (i) => els[i] || (els[i] = mk()), createElement: () => mk(), createTextNode: (t) => ({ textContent: t }), querySelectorAll: () => [], querySelector: () => mk() }, window: { scrollTo() {}, addEventListener() {} }, location: { search: '' }, navigator: { userAgent: 'node' }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, URLSearchParams };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(js, ctx);
const S = ctx.__S;

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const v = fs.readFileSync('sw.js', 'utf8').match(/const V='spicci-(\d{4})-(\d{2})-(\d{2})/);
const dataCatalogo = `${+v[3]} ${MESI[+v[2] - 1]} ${v[1]}`;
const oggiIso = `${v[1]}-${v[2]}-${v[3]}`;
const setteFa = new Date(Date.parse(oggiIso + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0, 10);

let link = { data: '', tot: '', ok: '', ric: '' };
try {
  const t = fs.readFileSync('strumenti/link-controllati.md', 'utf8');
  const m = t.match(/Ultimo controllo: ([^.]+)\. Link controllati: (\d+)\. Funzionanti: (\d+)\. Rotti: \d+\. Da ricontrollare: (\d+)/);
  if (m) link = { data: m[1], tot: m[2], ok: m[3], ric: m[4] };
} catch {}
let man = { tester: '', tester_necessari: 12, data_tester: '' };
try { man = { ...man, ...JSON.parse(fs.readFileSync('strumenti/dashboard-manuale.json', 'utf8')) }; } catch {}

const conta = (a, k) => { const o = {}; a.forEach((x) => { const c = k(x); o[c] = (o[c] || 0) + 1; }); return Object.entries(o).sort((p, q) => q[1] - p[1]); };
const reg = (x) => (S.LOC[x.z] ? S.LOC[x.z].reg : x.z);
const scad = S.ATTIVI.map((x) => ({ x, d: S.fineDi(x) })).filter((o) => o.d)
  .map((o) => ({ t: o.x.t, z: (o.x.z || 'Italia').replace('Comune di ', ''), g: S.giorniA(o.d), d: `${o.d.getFullYear()}-${String(o.d.getMonth() + 1).padStart(2, '0')}-${String(o.d.getDate()).padStart(2, '0')}` }))
  .filter((o) => o.g >= 0 && o.g <= 30).sort((a, b) => a.g - b.g);

const cella = (c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = (righe) => righe.map((r) => r.map(cella).join(',')).join('\n') + '\n';
fs.mkdirSync(dir, { recursive: true });
const scrivi = (nome, righe) => fs.writeFileSync(path.join(dir, nome), csv(righe));

scrivi('sommario.csv', [
  ['attivi', 'arrivo', 'nazionali', 'regionali', 'comunali', 'comuni', 'pagine_google', 'nuovi_ultimi_giorni', 'scadono_30_giorni', 'link_controllati', 'link_funzionanti', 'link_da_ricontrollare', 'tester', 'tester_necessari', 'versione', 'data_catalogo', 'data_link', 'data_tester'],
  [S.ATTIVI.length, S.ARRIVO.length, S.ATTIVI.filter((x) => !x.z).length, S.ATTIVI.filter((x) => x.z && !S.LOC[x.z]).length, S.ATTIVI.filter((x) => S.LOC[x.z]).length, Object.keys(S.LOC).length,
    S.ATTIVI.length + S.ARRIVO.length, S.ATTIVI.filter((x) => x.n && x.n >= setteFa).length, scad.length, link.tot, link.ok, link.ric, man.tester, man.tester_necessari, dataCatalogo, dataCatalogo, link.data, man.data_tester],
]);
scrivi('categorie.csv', [['categoria', 'attivi'], ...conta(S.ATTIVI, (x) => x.c)]);
const arr = Object.fromEntries(conta(S.ARRIVO.filter((x) => x.z), reg));
scrivi('territori.csv', [['regione', 'attivi', 'in_arrivo'], ...conta(S.ATTIVI.filter((x) => x.z), reg).map(([r, n]) => [r, n, arr[r] || 0])]);
scrivi('scadenze.csv', [['bonus', 'territorio', 'data', 'giorni'], ...scad.map((s) => [s.t, s.z, s.d, s.g])]);
console.log(`Dati della dashboard scritti in ${dir}: ${S.ATTIVI.length} aperti, ${S.ARRIVO.length} in arrivo, ${scad.length} chiudono entro 30 giorni, catalogo al ${dataCatalogo}.`);
