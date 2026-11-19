// Controlla tutti i link `u` del catalogo (ATTIVI e ARRIVO) e scrive il risultato in strumenti/link-controllati.md.
// Gira ogni settimana su GitHub (.github/workflows/controllo-link.yml); si può lanciare anche a mano: node strumenti/controlla-link.mjs
// Classi: "rotto" (404, 410, dominio inesistente) → da correggere subito; "da ricontrollare" (403, 429, 5xx, tempo scaduto):
// spesso sono siti pubblici che bloccano i controlli automatici, quindi vanno aperti a mano prima di toccare la scheda.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fine = js.lastIndexOf('})');
js = js.slice(0, fine) + '\n;globalThis.__S={ATTIVI,ARRIVO};\n' + js.slice(fine);
const stub = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : stub), apply: () => stub, construct: () => stub });
const ctx = { console, Intl, JSON, Math, Date, Number, String, Array, Object, RegExp, document: stub, window: stub, navigator: stub, location: stub,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, setTimeout() {}, clearTimeout() {}, URLSearchParams,
  matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(js, ctx);
const S = ctx.__S;

const voci = [];
for (const [lista, L] of [['ATTIVI', S.ATTIVI], ['ARRIVO', S.ARRIVO]]) L.forEach((x) => { if (x.u) voci.push({ lista, t: x.t, z: x.z || '', u: x.u }); });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
async function prova(u) {
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), 25000);
    try {
      const r = await fetch(u, { redirect: 'follow', signal: ac.signal, headers: { 'User-Agent': UA, 'Accept': 'text/html,application/pdf,*/*', 'Accept-Language': 'it-IT,it;q=0.9' } });
      clearTimeout(timer);
      try { await r.body?.cancel(); } catch {}
      if (r.status === 404 || r.status === 410) return { esito: 'rotto', dett: `HTTP ${r.status}` };
      if (r.ok) return { esito: 'ok', dett: `HTTP ${r.status}`, finale: r.url !== u ? r.url : '' };
      if (tentativo === 0 && (r.status === 429 || r.status >= 500)) { await new Promise((ok) => setTimeout(ok, 4000)); continue; }
      return { esito: 'ricontrollare', dett: `HTTP ${r.status}` };
    } catch (e) {
      clearTimeout(timer);
      const c = e?.cause?.code || e?.code || e?.name || 'errore';
      if (c === 'ENOTFOUND') return { esito: 'rotto', dett: 'dominio inesistente' };
      if (tentativo === 0) { await new Promise((ok) => setTimeout(ok, 4000)); continue; }
      return { esito: 'ricontrollare', dett: c === 'AbortError' ? 'tempo scaduto' : String(c) };
    }
  }
}

const risultati = new Array(voci.length);
let prossimo = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (prossimo < voci.length) { const i = prossimo++; risultati[i] = { ...voci[i], ...(await prova(voci[i].u)) }; }
}));

// Protezione: se risulta rotta più di un quarto dei link, il problema è quasi certamente la rete del controllo,
// non i siti. In quel caso non si scrive niente e il controllo finisce con errore (resta il rapporto precedente).
{
  const nRotti = risultati.filter((r) => r.esito === 'rotto').length;
  if (nRotti > risultati.length / 4) { console.error(`Controllo non affidabile: ${nRotti} link su ${risultati.length} risultano rotti. Rapporto non aggiornato.`); process.exit(1); }
}
const oggi = new Date().toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' });
const rotti = risultati.filter((r) => r.esito === 'rotto'), dubbi = risultati.filter((r) => r.esito === 'ricontrollare');
const riga = (r) => `- [${r.lista}] ${r.t}${r.z ? ' (' + r.z + ')' : ''} — ${r.dett} — ${r.u}`;
const testo = `# Controllo automatico dei link

Ultimo controllo: ${oggi}. Link controllati: ${risultati.length}. Funzionanti: ${risultati.length - rotti.length - dubbi.length}. Rotti: ${rotti.length}. Da ricontrollare: ${dubbi.length}.

Questo file lo scrive ogni settimana il controllo su GitHub (\`strumenti/controlla-link.mjs\`): non modificarlo a mano.
L'aggiornamento automatico corregge per primi i link **rotti** (trova la nuova pagina ufficiale; se non c'è, sposta la misura in ARRIVO).
I link **da ricontrollare** spesso funzionano: alcuni siti pubblici bloccano i controlli automatici. Aprili prima di cambiare qualcosa.

## Rotti
${rotti.length ? rotti.map(riga).join('\n') : 'Nessuno.'}

## Da ricontrollare
${dubbi.length ? dubbi.map(riga).join('\n') : 'Nessuno.'}
`;
fs.writeFileSync(path.join(ROOT, 'strumenti', 'link-controllati.md'), testo);
console.log(`Link controllati: ${risultati.length}, rotti: ${rotti.length}, da ricontrollare: ${dubbi.length}.`);
