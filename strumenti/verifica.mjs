// Verifica automatica del catalogo di Spicci.
// Uso: node strumenti/verifica.mjs   (dalla cartella principale del repository)
// Esce con codice 1 se trova un errore: in quel caso NON si pubblica.
import fs from 'node:fs';
import vm from 'node:vm';

const MIN_ATTIVI = 110;   // soglie anti-cancellazione: alzale solo di proposito
const MIN_ARRIVO = 80;

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const errori = [];
const avvisi = [];

if (/prototipo/i.test(html)) errori.push('La parola "prototipo" compare in index.html');
if (!/const V='spicci-\d{4}-\d{2}-\d{2}[a-z]?'/.test(sw)) errori.push("sw.js: versione V mancante o in formato errato (atteso spicci-AAAA-MM-GG + lettera)");

const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('Script principale non trovato'); process.exit(1); }
let js = m[1];
const fine = js.lastIndexOf('})');
const esporta = "\n;globalThis.__S={ATTIVI:ATTIVI,ARRIVO:ARRIVO,NEWS:NEWS,SITI:SITI,LOC:LOC,REGIONI:REGIONI,match:match,urlFor:urlFor,profilo:profilo};\n";
js = js.slice(0, fine) + esporta + js.slice(fine);

function mk() {
  return { value: '', checked: false, hidden: false, textContent: '', children: [], className: '', style: {}, type: '', attrs: {}, dataset: {},
    appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, removeEventListener() {}, setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; }, reset() {}, focus() {}, scrollIntoView() {}, querySelector() { return mk(); }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
}

function carica(profilo) {
  const els = {};
  const ctx = {
    console, Intl, JSON, Math, Date, Number, String, Array, Object, RegExp, setTimeout() {}, clearTimeout() {},
    document: { getElementById: (i) => els[i] || (els[i] = mk()), createElement: () => mk(), createTextNode: (t) => ({ textContent: t }),
      querySelectorAll: () => [], querySelector: () => mk(), addEventListener() {}, body: mk(), documentElement: mk() },
    window: { scrollTo() {}, addEventListener() {}, location: { search: '', hash: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }) },
    location: { search: '', hash: '' },
    navigator: { userAgent: 'node' },
    localStorage: { getItem: () => (profilo ? JSON.stringify(profilo) : null), setItem() {}, removeItem() {} },
    URLSearchParams,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(js, ctx, { filename: 'index.html<script>' });
  return ctx.__S;
}

let S;
try { S = carica(null); } catch (e) { console.error('ERRORE: lo script non si esegue:', e.message); process.exit(1); }

const regioni = new Set(S.REGIONI);
const territori = new Set([...S.REGIONI, ...Object.keys(S.LOC)]);
const chiavi = new Set();
const fuga = /===|!==|undefined|NaN|\$\{|\bp\.[a-z]+/;

function controllaVoce(x, i, lista, campi) {
  const id = `${lista}[${i}] "${x && x.t}"`;
  for (const c of campi) if (typeof x[c] !== 'string' || !x[c].trim()) errori.push(`${id}: campo "${c}" mancante o vuoto`);
  for (const c of campi) if (typeof x[c] === 'string' && fuga.test(x[c])) errori.push(`${id}: testo sospetto nel campo "${c}": ${x[c].slice(0, 80)}`);
  if (x.m !== undefined && typeof x.m !== 'function') errori.push(`${id}: m non è una funzione`);
  if (x.z !== undefined && !territori.has(x.z)) errori.push(`${id}: territorio z="${x.z}" sconosciuto (né Regione né Comune in LOC)`);
  const k = lista + '|' + x.t + '|' + (x.z || '');
  if (chiavi.has(k)) errori.push(`${id}: voce duplicata`); chiavi.add(k);
}

S.ATTIVI.forEach((x, i) => {
  controllaVoce(x, i, 'ATTIVI', ['t', 'c', 'a', 'r', 'todo', 'e', 's']);
  // Le voci locali (con z) devono avere un link ufficiale; quelle generiche ("Regioni e Comuni") possono non averlo.
  if (x.e && !S.urlFor(x.e)) (x.z ? errori : avvisi).push(`ATTIVI[${i}] "${x.t}": nessun link ufficiale per l'ente "${x.e}" (aggiungilo a SITI)`);
});
S.ARRIVO.forEach((x, i) => controllaVoce(x, i, 'ARRIVO', ['t', 'c', 'a', 'w', 'r']));
S.NEWS.forEach((x, i) => {
  for (const c of ['d', 't', 'p', 'src']) if (typeof x[c] !== 'string' || !x[c].trim()) errori.push(`NEWS[${i}] "${x.t}": campo "${c}" mancante`);
  if (x.reg && !regioni.has(x.reg)) errori.push(`NEWS[${i}]: regione "${x.reg}" sconosciuta`);
});
for (const [nome, url] of S.SITI) if (!/^https:\/\//.test(url)) errori.push(`SITI: link non https per "${nome}": ${url}`);

if (S.ATTIVI.length < MIN_ATTIVI) errori.push(`Solo ${S.ATTIVI.length} misure attive (minimo ${MIN_ATTIVI}): possibile cancellazione accidentale`);
if (S.ARRIVO.length < MIN_ARRIVO) errori.push(`Solo ${S.ARRIVO.length} misure in arrivo (minimo ${MIN_ARRIVO}): possibile cancellazione accidentale`);

// Profili di prova: ogni funzione di abbinamento deve girare senza errori e restituire un risultato valido.
const base = { eta: '30', genere: 'f', regione: 'Lombardia', lavoro: 'dipendente', nucleo: '3', figli: '1', isee: '15000', comune: '', affitto: true, compra: false, lavori: true, impresa: true, under3: true, nato: false, animale: false, elettrico: true };
const profili = [
  ['Giovane Savignano', { eta: '24', genere: 'm', regione: 'Emilia-Romagna', lavoro: 'dipendente', nucleo: '1', figli: '0', isee: '14000', comune: 'Savignano sul Rubicone', under3: false, impresa: false }],
  ['Famiglia Milano', { comune: 'Milano' }],
  ['Studente Roma senza ISEE', { eta: '20', regione: 'Lazio', lavoro: 'studente', nucleo: '4', figli: '0', isee: '', comune: 'Roma', affitto: true, under3: false }],
  ['Disoccupato Napoli', { eta: '28', genere: 'm', regione: 'Campania', lavoro: 'disoccupato', comune: 'Napoli', isee: '6000', impresa: true }],
  ['Neo mamma Palermo', { eta: '33', regione: 'Sicilia', lavoro: 'disoccupato', nato: true, comune: 'Palermo', isee: '9000' }],
  ['Pensionato Torino', { eta: '70', genere: 'm', regione: 'Piemonte', lavoro: 'pensionato', nucleo: '2', figli: '0', comune: 'Torino', isee: '20000', under3: false, impresa: false }],
  ['Autonomo Trento', { eta: '40', regione: 'Trentino-Alto Adige', lavoro: 'autonomo', comune: 'Trento', isee: '40000' }],
  ['Famiglia numerosa Bari', { regione: 'Puglia', nucleo: '7', figli: '5', comune: 'Bari', isee: '18000' }],
  ['Valle d\'Aosta senza comune', { regione: "Valle d'Aosta", isee: '' }],
  ['Sardegna Cagliari', { regione: 'Sardegna', comune: 'Cagliari', isee: '12000' }],
  ['Tutte le caselle Bologna', { regione: 'Emilia-Romagna', comune: 'Bologna', figli: '2', nucleo: '4', sfratto: true, mutuo: true, caldaia: true, attesa: true, nato: true, scuola: true, sport: true, solo: true, assumo: true, agri: true, corso: true, uni: true, estero: true, cura: true, disab: true, psico: true, mezzi: true, auto: true, animale: true, trasf: true }],
  ['Caregiver Palermo in attesa', { eta: '34', regione: 'Sicilia', comune: 'Palermo', lavoro: 'disoccupato', figli: '0', isee: '', attesa: true, cura: true, mezzi: true, impresa: false, lavori: false, affitto: false, under3: false }],
];
const sintesi = [];
for (const [nome, over] of profili) {
  let T;
  try { T = carica({ ...base, ...over }); } catch (e) { errori.push(`Profilo "${nome}": l'app va in errore all'avvio: ${e.message}`); continue; }
  let ok = 0, chk = 0, arr = 0;
  T.ATTIVI.forEach((x) => {
    let r; try { r = T.match(x); } catch (e) { errori.push(`Profilo "${nome}": "${x.t}" va in errore: ${e.message}`); return; }
    if (r === null || r === undefined || r === false) return;
    if (typeof r !== 'object' || !['ok', 'check'].includes(r.s) || typeof r.why !== 'string' || fuga.test(r.why)) { errori.push(`Profilo "${nome}": "${x.t}" restituisce un risultato non valido: ${JSON.stringify(r).slice(0, 120)}`); return; }
    r.s === 'ok' ? ok++ : chk++;
  });
  T.ARRIVO.forEach((x) => { if (!x.m) return; try { if (x.m(T.profilo)) arr++; } catch (e) { errori.push(`Profilo "${nome}": in arrivo "${x.t}" va in errore: ${e.message}`); } });
  sintesi.push(`${nome}: ${ok} sì, ${chk} da verificare, ${arr} in arrivo${T.profilo && T.profilo.loc ? ' (' + T.profilo.loc + ')' : ''}`);
  if (ok + chk === 0) avvisi.push(`Profilo "${nome}": nessuna misura trovata`);
}

console.log(`Catalogo: ${S.ATTIVI.length} attive, ${S.ARRIVO.length} in arrivo, ${S.NEWS.length} novità, ${Object.keys(S.LOC).length} Comuni/aree locali, ${S.SITI.length} siti ufficiali.`);
sintesi.forEach((r) => console.log('  ' + r));
avvisi.forEach((a) => console.log('AVVISO: ' + a));
if (errori.length) { errori.forEach((e) => console.error('ERRORE: ' + e)); console.error(`\n${errori.length} errori: NON pubblicare.`); process.exit(1); }
console.log('Verifica superata.');
