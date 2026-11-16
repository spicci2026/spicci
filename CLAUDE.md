# Spicci — istruzioni per l'aggiornamento automatico

Spicci (https://spicci2026.github.io/spicci/) è un'app gratuita che mostra ai giovani italiani i bonus, i contributi e le agevolazioni di Stato, Regioni e Comuni adatti al loro profilo. Il sito è pubblicato da GitHub Pages dal ramo `main` di questo repository: **ogni push su `main` va online in 1-2 minuti**. Il titolare non approva gli aggiornamenti: le protezioni qui sotto sostituiscono il controllo umano.

## Dove sta il catalogo
Tutto è dentro `index.html`, nel primo `<script>`:
- `ATTIVI` — misure aperte ora. Campi: `t` titolo, `c` categoria (Famiglia, Casa, Lavoro, Studio, Reddito, Salute, Mobilità, Impresa, Cultura…), `i` emoji facoltativa, `z` territorio facoltativo (nome esatto di una Regione in `REGIONI` o di una chiave di `LOC`), `dub:1` se le fonti si contraddicono, `a` importo, `r` per chi, `todo` cosa fare, `e` ente (deve trovare un link in `SITI`), `s` scadenza/stato, `m(p)` funzione di abbinamento.
- `ARRIVO` — misure chiuse con prossima edizione attesa o annunciate. Campi: `t`, `c`, `z`, `a`, `w` quando, `r`, `m(p)` che restituisce vero/falso.
- `NEWS` — novità (massimo ~12). Campi: `d` data/scadenza breve, `t`, `p` testo, `src` fonte; `reg:"Regione"` o `loc:true` per le novità locali.
- `LOC` — Comuni e aree locali coperti, con i nomi che l'utente può scrivere. `SITI` — elenco [ente, link ufficiale]: `urlFor` prende la **prima** voce il cui nome è contenuto in `e`, quindi le voci specifiche vanno **prima** di quelle generiche.

### Funzione `m(p)` per ATTIVI
Restituisce `null` se la misura non riguarda la persona, `OK("perché", importoFacoltativo)` se probabilmente ne ha diritto, `CHK("perché")` se deve verificare. Helper: `isee(p, soglia, "perché")` (gestisce ISEE sconosciuto), `giovane(p, sud)`.
Campi del profilo `p`: `eta` (numero), `genere` ('f'|'m'|''), `regione`, `prov` ('Trento'|'Bolzano'|''), `lavoro` ('dipendente'|'autonomo'|'disoccupato'|'studente'|'pensionato'), `nucleo`, `figli`, `isee` (numero o `null` se non lo sa), `comune` (minuscolo), `loc` (chiave di LOC o null), `er` (Emilia-Romagna), `rub` (Rubicone e Mare), e i sì/no `affitto`, `compra`, `lavori`, `impresa`, `under3`, `nato`, `animale`, `elettrico`.
Per le misure locali usa sempre `p.loc==='Comune di X'` (o `p.regione==='X'` per le regionali): mai mostrare una misura locale a chi vive altrove.

## Regole editoriali (obbligatorie)
1. **Solo fonti ufficiali per inserire o cambiare una misura**: INPS, Agenzia delle Entrate, MIMIT, Invitalia, Gazzetta Ufficiale, ministeri, siti di Regioni, Comuni, Unioni, ATS/ASL, portali UE. I siti di notizie servono solo come segnale per andare a cercare la fonte ufficiale. Se non trovi la fonte ufficiale, non inserire; se le fonti si contraddicono, usa `dub:1`.
2. Le misure ancora in discussione (es. legge di bilancio non approvata) vanno solo in `NEWS` o in `ARRIVO`, mai in `ATTIVI`.
3. Linguaggio prudente e semplice: "potresti averne diritto", frasi brevi, niente promesse. Niente affermazioni come "Lo Stato ti deve…".
4. Importi e soglie ISEE esattamente come nella fonte; se cambiano, aggiorna anche la funzione `m`.
5. Non inventare link: se l'ente non è in `SITI`, aggiungi il sito ufficiale dell'ente (https), prima delle voci generiche.
6. Non togliere mai l'avvertenza "non è un sito della Pubblica Amministrazione" né i link a privacy, termini, fonti, aiuto.
7. Nessun dato personale, nessun tracciamento, nessuna pubblicità, nessun link di affiliazione: i dati dell'utente restano sul suo dispositivo.

## Procedura giornaliera
1. **Scadenze**: confronta la data di oggi (Europe/Rome) con `s` di ATTIVI, `w` di ARRIVO e `d` di NEWS.
   - Misura scaduta → spostala in `ARRIVO` con `w:"Chiuso il …, prossima edizione attesa …"` se di solito si ripete, altrimenti eliminala.
   - Misura in ARRIVO che ha aperto (verificato sulla fonte ufficiale) → spostala in `ATTIVI` con `todo`, `e`, `s` e una funzione `m` che usa `OK`/`CHK`.
   - Novità superate → aggiornale o toglile.
2. **Novità nazionali (ogni giorno)**: cerca su INPS (messaggi e circolari), Agenzia delle Entrate, MIMIT, Invitalia, Gazzetta Ufficiale: nuovi bonus, aperture e chiusure di sportelli, nuovi importi o soglie ISEE.
3. **Territori a rotazione** (un giro a settimana): lunedì Emilia-Romagna (Rubicone e Mare, Bologna, Rimini, Modena, Ferrara, Ravenna) e Lombardia; martedì Lazio, Campania, Veneto; mercoledì Piemonte, Liguria, Toscana, Marche, Umbria; giovedì Puglia, Sicilia, Sardegna, Calabria, Basilicata; venerdì Abruzzo, Molise, Friuli-Venezia Giulia, Trentino-Alto Adige, Valle d'Aosta; sabato i Comuni capoluogo e sopra i 100.000 abitanti presenti in `LOC`; domenica solo scadenze e nazionale. Controlla bandi aperti, chiusi e nuovi.
4. **Espansione Comuni (ogni giorno, finché l'elenco non è vuoto)**: aggiungi fino a 3 Comuni presi in ordine da `strumenti/comuni-da-aggiungere.md`. Per ognuno: cerca sul sito ufficiale del Comune (e dell'eventuale Ambito/Unione) le misure attive o ricorrenti (affitto, bollette/TARI, nidi e famiglie, giovani, trasporti, sport, studio); aggiungi in `LOC` la chiave `"Comune di X":{reg:"Regione esatta",nomi:["x", varianti senza accenti o con frazioni note]}`, in `SITI` il link ufficiale del Comune **prima** delle voci generiche, e le misure in `ATTIVI`/`ARRIVO` con `z:"Comune di X"` e `m` che controlla `p.loc==='Comune di X'`. Almeno una misura verificata sul sito ufficiale, altrimenti sposta il Comune in "Rimandati" con il motivo. Aggiorna l'elenco (sposta in "Fatti" con la data).
5. Al massimo **10 modifiche al giorno** (contano anche quelle dei nuovi Comuni): meglio poche e verificate. Se non trovi niente di nuovo, aggiorna solo le scadenze.
6. **Verifica**: `node strumenti/verifica.mjs` deve finire con "Verifica superata.". Se fallisce, correggi; se non riesci, **non pubblicare**.
7. **Versione**: in `sw.js` aggiorna `const V='spicci-AAAA-MM-GG' + lettera` con la data di oggi (così le app installate scaricano la nuova versione).
8. **Registro**: aggiungi in cima a `strumenti/registro.md` una riga per ogni modifica: data, cosa, fonte ufficiale (link).
9. **Pubblica**: un solo commit su `main` con messaggio "Aggiornamento catalogo AAAA-MM-GG: …", poi push. Dopo 2 minuti controlla che https://spicci2026.github.io/spicci/sw.js mostri la nuova versione.

Le soglie minime in `strumenti/verifica.mjs` (misure attive e in arrivo) servono a bloccare cancellazioni accidentali: abbassale solo se le misure sono davvero diminuite, spiegandolo nel registro.
