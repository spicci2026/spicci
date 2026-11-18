# Spicci — istruzioni per l'aggiornamento automatico

Spicci (https://spicci2026.github.io/spicci/) è un'app gratuita che mostra ai giovani italiani i bonus, i contributi e le agevolazioni di Stato, Regioni e Comuni adatti al loro profilo. Il sito è pubblicato da GitHub Pages dal ramo `main` di questo repository: **ogni push su `main` va online in 1-2 minuti**. Il titolare non approva gli aggiornamenti: le protezioni qui sotto sostituiscono il controllo umano.

## Dove sta il catalogo
Tutto è dentro `index.html`, nel primo `<script>`:
- `ATTIVI` — misure aperte ora. Campi: `t` titolo, `c` categoria (Famiglia, Casa, Lavoro, Studio, Reddito, Salute, Mobilità, Impresa, Cultura…), `i` emoji facoltativa, `z` territorio facoltativo (nome esatto di una Regione in `REGIONI` o di una chiave di `LOC`), `dub:1` se le fonti si contraddicono, `a` importo, `r` per chi, `todo` cosa fare, `e` ente (deve trovare un link in `SITI`), `u` link alla **pagina ufficiale precisa** del bonus, `s` scadenza/stato, `k` caselle richieste (facoltativo), `m(p)` funzione di abbinamento.
- `ARRIVO` — misure chiuse con prossima edizione attesa o annunciate. Campi: `t`, `c`, `z`, `a`, `w` quando, `r`, `u` facoltativo (pagina ufficiale precisa), `k` facoltativo, `m(p)` che restituisce vero/falso.
- `NEWS` — novità (massimo ~12). Campi: `d` data/scadenza breve, `t`, `p` testo, `src` fonte; `reg:"Regione"` o `loc:true` per le novità locali.
- `LOC` — Comuni e aree locali coperti, con i nomi che l'utente può scrivere. `SITI` — elenco [ente, link ufficiale]: `urlFor` prende la **prima** voce il cui nome è contenuto in `e`, quindi le voci specifiche vanno **prima** di quelle generiche.

### Funzione `m(p)` per ATTIVI
Restituisce `null` se la misura non riguarda la persona, `OK("perché", importoFacoltativo)` se probabilmente ne ha diritto, `CHK("perché")` se deve verificare. Helper: `isee(p, soglia, "perché")` (gestisce ISEE sconosciuto), `giovane(p, sud)`.
Campi del profilo `p`: `eta` (numero), `genere` ('f'|'m'|''), `regione`, `prov` ('Trento'|'Bolzano'|''), `lavoro` ('dipendente'|'autonomo'|'disoccupato'|'studente'|'pensionato'), `nucleo`, `figli`, `isee` (numero o `null` se non lo sa), `comune` (minuscolo), `loc` (chiave di LOC o null), `er` (Emilia-Romagna), `rub` (Rubicone e Mare), e i sì/no delle caselle (dal 18/11/2026):
- Casa: `affitto` (vivo in affitto), `sfratto` (faccio fatica a pagare l'affitto; implica `affitto`), `compra` (vorrei comprare la mia prima casa), `mutuo` (ho già un mutuo), `lavori` (ristrutturo), `caldaia` (caldaia, stufa o pannelli solari).
- Famiglia: `attesa` (aspetto un bambino), `nato` (figlio nato o adottato dal 2025), `under3`, `scuola` (figli a scuola; vero anche per gli studenti sotto i 20 anni), `sport` (figli che fanno sport o centri estivi), `solo` (genitore solo).
- Lavoro e studio: `impresa` (vorrei aprire un'attività), `assumo` (vorrei assumere), `agri` (agricoltura), `corso` (corso per trovare lavoro), `uni` (io o un figlio all'università; vero anche per gli studenti dai 18 anni), `estero` (esperienza all'estero).
- Salute: `cura` (assisto un familiare anziano o non autosufficiente), `disab` (disabilità in famiglia), `psico` (psicologo).
- Spostamenti e altro: `mezzi` (bus, treni, metro), `auto` (devo cambiare auto), `elettrico`, `animale`, `trasf` (vorrei trasferirmi in un piccolo Comune o al Sud).

Campo facoltativo `k` (in ATTIVI e ARRIVO): la misura compare solo se è spuntata almeno una delle caselle indicate, separate da `|`. Esempi: `k:"scuola"` per libri, borse e mense scolastiche; `k:"sport"` per voucher sport e centri estivi; `k:"scuola|mezzi"` per gli abbonamenti studenti; `k:"sfratto"` per i fondi morosità e sfratti; `k:"cura"` per i contributi ai caregiver. Usalo per le misure che riguardano una situazione precisa. Non serve per quelle che dipendono solo da età, ISEE, figli o territorio: quelle le capisce già `m`. I testi delle caselle restano brevi e generici, senza nomi di bonus o di luoghi.
Per le misure locali usa sempre `p.loc==='Comune di X'` (o `p.regione==='X'` per le regionali): mai mostrare una misura locale a chi vive altrove.

## Regole editoriali (obbligatorie)
1. **Solo fonti ufficiali per inserire o cambiare una misura**: INPS, Agenzia delle Entrate, MIMIT, Invitalia, Gazzetta Ufficiale, ministeri, siti di Regioni, Comuni, Unioni, ATS/ASL, portali UE. I siti di notizie servono solo come segnale per andare a cercare la fonte ufficiale. Se non trovi la fonte ufficiale, non inserire; se le fonti si contraddicono, usa `dub:1`.
2. Le misure ancora in discussione (es. legge di bilancio non approvata) vanno solo in `NEWS` o in `ARRIVO`, mai in `ATTIVI`.
3. Linguaggio prudente e semplice: "potresti averne diritto", frasi brevi, niente promesse. Niente affermazioni come "Lo Stato ti deve…".
4. Importi e soglie ISEE esattamente come nella fonte; se cambiano, aggiorna anche la funzione `m`.
5. **Link alla pagina precisa**: ogni misura nuova o modificata deve avere `u` = indirizzo https della pagina ufficiale che parla proprio di quel bonus (scheda del servizio, bando, avviso o pagina del Comune), mai la home dell'ente o un portale generico. Copia l'indirizzo dalla pagina che hai davvero aperto o trovato nei risultati di ricerca: non costruirlo e non indovinarlo. Se non trovi la pagina precisa, lascia `u` vuoto (l'app mostra il sito dell'ente). In più, se l'ente non è in `SITI`, aggiungi il sito ufficiale dell'ente (https), prima delle voci generiche.
6. Non togliere mai l'avvertenza "non è un sito della Pubblica Amministrazione" né i link a privacy, termini, fonti, aiuto.
7. Nessun dato personale, nessun tracciamento, nessuna pubblicità, nessun link di affiliazione: i dati dell'utente restano sul suo dispositivo.

## Procedura (lunedì, mercoledì e venerdì)
1. **Scadenze**: confronta la data di oggi (Europe/Rome) con `s` di ATTIVI, `w` di ARRIVO e `d` di NEWS.
   - Misura scaduta → spostala in `ARRIVO` con `w:"Chiuso il …, prossima edizione attesa …"` se di solito si ripete, altrimenti eliminala.
   - Misura in ARRIVO che ha aperto (verificato sulla fonte ufficiale) → spostala in `ATTIVI` con `todo`, `e`, `s` e una funzione `m` che usa `OK`/`CHK`.
   - Novità superate → aggiornale o toglile.
2. **Novità nazionali (a ogni esecuzione)**: cerca su INPS (messaggi e circolari), Agenzia delle Entrate, MIMIT, Invitalia, Gazzetta Ufficiale: nuovi bonus, aperture e chiusure di sportelli, nuovi importi o soglie ISEE.
3. **Territori a rotazione**: l'aggiornamento gira 3 volte a settimana (lunedì, mercoledì, venerdì). A ogni esecuzione controlla il gruppo indicato come "Prossimo" in `strumenti/rotazione.md` (bandi aperti, chiusi e nuovi), poi sposta "Prossimo" al gruppo successivo (dopo il 6 si torna all'1). Un giro completo dura 2 settimane.
4. **Espansione Comuni (a ogni esecuzione)**: aggiungi fino a 4 Comuni presi in ordine da `strumenti/comuni-da-aggiungere.md`. Quando l'elenco dei capoluoghi è finito, prosegui con gli altri Comuni sopra i 50.000 abitanti (dati ISTAT), dal più popoloso, aggiungendoli all'elenco. Per ognuno: cerca sul sito ufficiale del Comune (e dell'eventuale Ambito/Unione) le misure attive o ricorrenti (affitto, bollette/TARI, nidi e famiglie, giovani, trasporti, sport, studio); aggiungi in `LOC` la chiave `"Comune di X":{reg:"Regione esatta",nomi:["x", varianti senza accenti o con frazioni note]}`, in `SITI` il link ufficiale del Comune **prima** delle voci generiche, e le misure in `ATTIVI`/`ARRIVO` con `z:"Comune di X"` e `m` che controlla `p.loc==='Comune di X'`. Almeno una misura verificata sul sito ufficiale, altrimenti sposta il Comune in "Rimandati" con il motivo. Aggiorna l'elenco (sposta in "Fatti" con la data).
5. **Tipi di bonus a rotazione (a ogni esecuzione)**: controlla il gruppo "Prossimo" di `strumenti/tipi-di-bonus.md`. Per ogni voce del gruppo verifica sulla fonte ufficiale se esiste ed è aperta; se manca nel catalogo aggiungila (ATTIVI se aperta, ARRIVO se annunciata o chiusa con nuova edizione attesa), con `u`, `m` ed eventuale `k`. Poi sposta "Prossimo" al gruppo successivo.
6. **Link precisi (a ogni esecuzione, finché ne mancano)**: aggiungi `u` a fino a 8 misure di ATTIVI che non l'hanno, prima le nazionali, poi le regionali, poi le comunali. `node strumenti/verifica.mjs` dice quante ne mancano. Queste aggiunte non contano nel limite del punto 7.
7. Al massimo **15 modifiche per esecuzione** (contano scadenze, nuovi Comuni e nuovi bonus): meglio poche e verificate. Se non trovi niente di nuovo, aggiorna solo le scadenze.
8. **Verifica**: `node strumenti/verifica.mjs` deve finire con "Verifica superata.". Se fallisce, correggi; se non riesci, **non pubblicare**.
9. **Versione**: in `sw.js` aggiorna `const V='spicci-AAAA-MM-GG' + lettera` con la data di oggi (così le app installate scaricano la nuova versione).
10. **Registro**: aggiungi in cima a `strumenti/registro.md` una riga per ogni modifica: data, cosa, fonte ufficiale (link).
11. **Pubblica**: un solo commit su `main` con messaggio "Aggiornamento catalogo AAAA-MM-GG: …", poi push. Dopo 2 minuti controlla che https://spicci2026.github.io/spicci/sw.js mostri la nuova versione.

Le soglie minime in `strumenti/verifica.mjs` (misure attive e in arrivo) servono a bloccare cancellazioni accidentali: abbassale solo se le misure sono davvero diminuite, spiegandolo nel registro.
