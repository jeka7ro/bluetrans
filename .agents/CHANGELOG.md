# Jurnal de modificări (Antigravity ↔ Paperclip)

### 2026-11-11 15:25 — Server de producție Node.js (`server.mjs`) cu volum persistent pentru cele 43 cărți CIV + Taloane/RCA și conectare remote `https://github.com/jeka7ro/bluetrans`
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Creat serverul de producție zero-dependențe `server.mjs`** (pentru Railway / cloud deployment):
     - Servește aplicația compilată din `dist/` cu fallback SPA (`dist/index.html`) și cache imutabil pentru bundle-urile Vite (`/assets/*`).
     - Detectează automat volumul persistent (`process.env.ACTE_FLOTA_DIR` sau `process.env.RAILWAY_VOLUME_MOUNT_PATH/acte-flota`, cu fallback la `public/acte-flota`) și populează automat la prima pornire (`seedPersistentActeFlotaDir()`) toate cele **43 PDF-uri CIV** din `public/acte-flota/`, fără a suprascrie sau recrea actele editate/șterse ulterior.
     - Expune în producție toate endpoint-urile de gestionare acte vehicule (`GET /api/health`, `GET /acte-flota/index.json`, `GET|HEAD /acte-flota/:fileName` cu suport `206 Partial Content` `Range`, `POST /api/acte-flota/upload`, `POST /api/acte-flota/update`, `POST /api/acte-flota/delete`) pentru adăugarea, editarea, înlocuirea și ștergerea live de **Taloane, RCA, CASCO, CMR, ITP, Roviniete, ATP, Leasing** (PDF & imagini).
  2. **Actualizat `package.json` & `.gitignore`**: adăugat `"start": "node server.mjs"` și `"engines": { "node": ">=20" }` (astfel încât Railpack/Railway detectează automat serviciul Node.js) și ignorat `**/.DS_Store`.
  3. **Configurat Git remote `origin`**: conectat la `https://github.com/jeka7ro/bluetrans.git` și rulat protocolul complet Pre-Push `audit-gatekeeper`.
- **Fișiere:** `server.mjs` (nou), `package.json`, `.gitignore`
- **Ramură / Commit:** `main` (pregătit pentru commit & push pe `origin/main` după confirmarea utilizatorului)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · smoke-test `server.mjs` OK (seeding 43 CIV PDF, `Range 206`, upload/delete `Talon - BH 50 STS.pdf`, `/api/health` HTTP 200) · audit Pre-Push `🟢 VERDE — 100% SIGUR PENTRU PUSH` (21/21)

### 2026-11-11 15:18 — Reconstrucție completă 3D sculptată (caroserie unibody cu dublă curbură, habitaclu 3D complet și faruri/grile conforme) pentru `Dacia Logan III` (`B 102 STS`, `B 196 STS`) și `Mercedes-Benz C 250 CDI W204` (`BH 01 STS`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminat complet geometria veche prismatică (`ExtrudeGeometry`) și creat motorul dedicat de suprafețe auto 3D cu dublă curbură în `src/components/SedanMeshBuilder3D.ts`**:
     - Construit `buildLoftedUnibodyGeometry` (104 stații longitudinale cu interpolare spline Hermite `evalSpline1D`, bot și spate rotunjite în plan orizontal prin eșantionare cosinusoidală fără muchii plate, pasaje de roată circulare netede `smoothMax` cu contraaripi interioare închise, praguri retrase, portiere bombate 3D, capotă și portbagaj bombate cu nervuri longitudinale și normale simetrizate `enforceRingSymmetryNormals` fără cusătură pe axa `z = 0`).
     - Construit `buildGreenhouseAndInterior`: plafon bombat 3D, arc continuu vopsit `A-pillar → cantrail → C-pillar` + panou triunghiular vopsit `C-pillar sail panel`, parbriz, lunetă și geamuri laterale curbate (`tumblehome`) din sticlă auto transparentă verzuie (`MeshPhysicalMaterial`) și **interior 3D complet vizibil prin geamuri** (bord sculptat, ceasuri de bord, ecran multimedia, consolă centrală, volan pe stânga, scaune față profilate cu tetiere, banchetă spate cu 3 tetiere, poliță lunetă și oglindă retrovizoare centrală).
  2. **Model 3D autentic `2024 Dacia Logan III TCe 90` (`B 102 STS`, `B 196 STS` — `buildSculptedDaciaLogan3`)**:
     - Culoare oficială **Albastru Iron Metalizat (`RQH` · `#173773`)** aliniată cu CIV RAR (`Albastru`) și cu fotografia de studio `/fleet/dacia-logan-2024-blue.jpg`.
     - Grilă frontală curbată conformă **Dacia Link 2024 (`=== DC ===`)**, faruri conice alungite pe aripi cu semnătura luminoasă LED albă orizontală în **`Y`** sub lentile clare, priză inferioară trapezoidală fagure + radar ADAS + proiectoare ceață în casete negre, semnalizatoare ovale pe aripi, jante pe 16" cu 5 spițe late în V, portbagaj înalt 528L cu inscripția spațiată **`D A C I A`** și stopuri spate rubinii cu semnătură dublă LED în **`Y`**.
  3. **Model 3D autentic `2012 Mercedes-Benz C 250 CDI W204 Facelift Avantgarde` (`BH 01 STS` — `buildSculptedMercedesW204`)**:
     - Vopsea PBR **Negru Obsidian (`#0c1018`, `clearcoat: 1.0`, `clearcoatRoughness: 0.03`)** cu reflexii profunde de lac auto (eliminând aspectul gri metalizat șters anterior).
     - Proporții autentice de berlină executivă cu tracțiune spate (capotă lungă cu emblemă rotundă Mercedes pe vârf, console față scurte, portbagaj clasic 3-box), grilă trapezoidală cromată **Avantgarde** cu 2 lamele 3D și **Steaua Mercedes 3D** centrală, faruri swept Bi-Xenon cu lupă cromată și sprânceană LED albă în formă de **`C`**, bară față sport cu DRL-uri LED orizontale + ornamente cromate, ramă completă cromată în jurul geamurilor + baghetă cromată pe praguri, oglinzi cu dublă bandă LED, jante **Avantgarde 17" în 5 spițe duble**, spate cu Steaua 3D, baghetă cromată, inscripții **`C 250` / `CDI`**, stopuri rubinii cu bare orizontale LED și evacuare dublă cromată pe stânga.
- **Fișiere:** `src/components/SedanMeshBuilder3D.ts` (nou), `src/components/TruckShowroom3D.tsx`, `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome pe toate unghiurile (`Față`, `Profil`, `Spate`) pentru `B 102 STS` (`Dacia Logan III`) și `BH 01 STS` (`Mercedes-Benz C 250 CDI W204`), 0 erori runtime

### 2026-11-11 14:23 — Ceas live și data oficială a României pe prima poziție în header + blocare completă date/ore din trecut la „Cursă nouă” + Localizare GPS Live („Identifică unde sunt”) + Showroom 3D 360° pentru autoturisme (`B 102 STS`, `B 196 STS`, `BH 01 STS`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Ceas oficial live și data României (`Europe/Bucharest`) pe poziția #1 în `<header>` (`src/utils/romaniaTime.ts`, `src/components/RomaniaLiveClock.tsx`, `src/App.tsx`, `src/index.css`)**:
     - Creat motorul de fus orar `romaniaTime.ts` bazat pe `Temporal` (`temporal-polyfill`, `Europe/Bucharest`, `disambiguation: 'compatible'`) și componenta capsulă `<RomaniaLiveClock />` plasată ca **primul element din bara de sus** (`🇷🇴 · RO · HH:MM:SS | Miercuri, 11 Noiembrie 2026`), cu actualizare la secundă (`tabular-nums`), atribut semantic `<time dateTime={...}>` și contrast adaptat pentru Light Mode și Dark Mode.
  2. **Interzicerea propunerii și salvării curselor pe zile sau ore din trecut (`Planning7DaysView.tsx`, `OrdersAndTripsView.tsx`, `App.tsx`)**:
     - Eliminat definitiv propunerea implicită în trecut (ex. `Luni (9 Noi) · Ora 15:00` sau `2026-11-10T08:00`): `findFirstFuturePlanningSlot()` propune automat primul interval liber strict în viitor față de ora României (ex. `Miercuri (11 Noi) · Ora 15:00` la ora `14:21`), avansând automat la a doua zi `08:00` după ora `18:00` sau la săptămâna următoare (`< 9 – 15 Noi 2026 >`).
     - Marcat coloana zilei curente cu insigna **`AZI`**, dezactivat click-ul de creare și Drag & Drop-ul pe celulele din zilele trecute (`LUN 9`, `MAR 10`), dezactivat opțiunile de zile trecute (`· trecut`) și ore trecute (`· oră trecută`) în selectoarele din `Cursă nouă` și `Cursă / Comandă nouă`, adăugat atributul `min` și validare strictă în Wizard-ul din `Comenzi & curse`, plus protecție suplimentară în `handleCreateOrder`, `handleAssignOrderToTrailer` și `handleAcceptProposal` din `App.tsx`.
  3. **Localizare GPS Live („Identifică unde sunt”) în „Cursă nouă” și pe câmpurile de adresă (`GoogleMapsAddressInput.tsx`, `Planning7DaysView.tsx`, `OrdersAndTripsView.tsx`)**:
     - Adăugat `detectCurrentUserGpsPlace()` cu `navigator.geolocation.getCurrentPosition` declanșat la click explicit + geocodare inversă în limba română (OpenStreetMap Nominatim → Photon Komoot → fallback cel mai apropiat hub + coordonate exacte) și înregistrare automată a coordonatelor reale în `LEARNED_PLACE_COORDS` pentru recalcularea instantanee a kilometrilor rutieri și a tarifului recomandat.
     - Adăugat bara dedicată **`Identifică unde sunt (GPS Live)`** în ambele modale de creare cursă (cu card verde `📍 Localizat: ...`, acțiuni `Pune la Încărcare` / `Pune la Descărcare` / `Hartă GPS` și pastilă rapidă cu poziția GPS a camionului selectat), precum și butonul capsulă **`Unde sunt`** și pictograma `<LocateFixed />` direct pe fiecare câmp `GoogleMapsAddressInput`.
  4. **Modele 3D WebGL 360° interactive + Fotografii reale de studio pentru autoturismele M1 (`TruckShowroom3D.tsx`, `FleetVinAndDossierModal.tsx`)**:
     - Construit modelele 3D dedicate `buildDaciaLogan3Sedan` (`B 102 STS`, `B 196 STS` — Dacia Logan III TCe 90 cu semnătura LED în `Y`, sigla nouă `DC` Dacia Link, jante aliaj 16", stopuri spate în `Y` și antenă shark-fin) și `buildMercedesC250W204Sedan` (`BH 01 STS` — Mercedes-Benz C 250 CDI W204 Facelift cu grilă Avantgarde cromată cu steaua 3D, faruri Bi-Xenon `C-shape`, DRL orizontale în bară, jante twin-spoke 17", stopuri LED rubinii și evacuare dublă cromată), alături de fotografiile reale `/fleet/dacia-logan-3-blue.jpg` și `/fleet/mercedes-c250-w204-black.jpg`.
- **Fișiere:** `src/utils/romaniaTime.ts` (nou), `src/components/RomaniaLiveClock.tsx` (nou), `src/index.css`, `src/App.tsx`, `src/components/GoogleMapsAddressInput.tsx`, `src/components/Planning7DaysView.tsx`, `src/components/OrdersAndTripsView.tsx`, `src/components/TruckShowroom3D.tsx`, `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat end-to-end în Chrome (ceas RO #1 în header pe Light/Dark Mode, propunere automată în viitor `Miercuri (11 Noi) · Ora 15:00`, localizare GPS live `Oradea (±12m)` cu recalculare automată km rutieri, Showroom 3D 360° Față/Spate pentru `B 102 STS` și `BH 01 STS`, 0 erori runtime)

### 2026-11-11 11:33 — Gestionare completă (Adăugare · Editare · Înlocuire · Ștergere) pentru toate actele vehiculelor (`CIV`, `Talon`, `RCA`, `CASCO`, `CMR`, `ITP`, `Rovinietă`, `ATP`, `Licență ARR`, `Leasing` — PDF & Imagini)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Backend local de sincronizare în `vite.config.ts` (`acteFlotaSyncPlugin`)**: extins suportul pentru `.pdf`, `.jpg`, `.jpeg`, `.png` și `.webp` cu validare magic-bytes, protecție path-traversal, deduplicare automată fără suprascrierea actelor existente (`pickUniqueFileName`), persistență metadate în `public/acte-flota/meta.json` (`docKind`, `customTitle`, `expiryDate`, `note`, `plate`, `updatedAt`), streaming direct pe `GET /acte-flota/*` fără cache `sirv` învechit și fără full-page reload la salvarea/ștergerea documentelor, plus endpoint-urile `POST /api/acte-flota/{upload,update,delete}`.
  2. **Catalog reactiv și CRUD complet în `src/data/fleetDocuments.ts`**: adăugat tipurile `CIV`, `TALON`, `RCA`, `CASCO`, `CMR`, `ITP`, `ROVINIETA`, `ATP`, `LICENTA`, `LEASING`, `ACT` (`FLEET_DOC_KIND_OPTIONS`), funcțiile `uploadVehiclePdfDocument`, `updateVehiclePdfDocument` (cu redenumire pe disc la schimbarea categoriei și înlocuire fișier), `deleteVehiclePdfDocument` (cu sincronizare autoritativă pe disc fără re-apariția fișierelor șterse + fallback `localStorage` pentru rulări statice) și `summarizeVehicleDocsLabel`.
  3. **Interfață completă de Adăugare / Editare / Înlocuire / Ștergere în `src/components/VehiclePdfViewerModal.tsx`**:
     - Pastile capsulă (`rounded-full`) pentru toate documentele atașate mașinii, cu insignă live de zile rămase până la expirare.
     - Formular inline **`+ Adaugă document`** și **`Editează`** cu selector categorie act, etichetă personalizată, calendar `<ExpiryCalendarField />` (cu calcul live al zilelor rămase), număr poliță / observații și încărcare sau înlocuire fișier PDF / Poză.
     - Bară inline de confirmare la **`Șterge`** (`Da, șterge definitiv` / `Anulează`, zero `window.confirm()`), previzualizare nativă atât pentru PDF (`<iframe>`), cât și pentru poze scanate (`<img>`), dimensiune constantă a ferestrei (`1120 × 860 px`) și buton `X` ancorat strict în dreapta-sus.
  4. **Butoane rapide în `FleetVinAndDossierModal.tsx` și `DriverPortalView.tsx`**: adăugat butonul **`+ Adaugă act`** direct pe fiecare card și în tabelul `Listă` din `Mașinile mele`, actualizat etichetele dinamice (`Acte (2): CIV · RCA`), extins secțiunea de acte din `VehicleDossierModal` (Cap tractor / Autoutilitară / Autoturism + Semiremorcă) și adăugat buton direct de atașare/vizualizare poliță în fereastra rapidă `RCA / CASCO / CMR / Leasing`.
- **Fișiere:** `vite.config.ts`, `src/data/fleetDocuments.ts`, `src/components/VehiclePdfViewerModal.tsx`, `src/components/FleetVinAndDossierModal.tsx`, `src/components/DriverPortalView.tsx`, `src/index.css`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat end-to-end în Chrome (Adăugare PDF `Talon` → Editare în `RCA` + Înlocuire cu imagine `.png` → Persistență după `page.reload()` → Ștergere definitivă cu păstrarea intactă a tuturor celor 43 cărți CIV originale)

### 2026-11-11 11:13 — Fotografii reale de studio pe 100% din cardurile „Mașinile mele” (`IF 58 STS`, `IF 71 STS`, `IF 02 XTS`, `BH 30 STS` aliniate pe generația RAR CIV `N320 Streamline` + eliminare completă ilustrații 2D SVG)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Aliniat generația exactă din Cărțile de Identitate RAR CIV (`D.2 Tip: N320`, `e4*2007/46*0030*...`, motor `DC 13.147`) pentru `IF 58 STS`, `IF 71 STS`, `IF 02 XTS` și `BH 30 STS`**: toate patru sunt acum identificate drept **`Scania R 450 Streamline Highline A4x2NA`** (`Cabină CR19H Streamline Highline`) în `Alb Polar OEM (Alb)` și afișează fotografia reală de studio `/fleet/scania-r-streamline-white.jpg` atât în `Mașinile mele`, cât și în Dosarul Tehnic (`Poză`).
  2. **Eliminat definitiv miniaturile caricaturale 2D SVG din `Mașinile mele` (`FleetVinAndDossierModal.tsx`)**: adăugat `getFleetCardPhoto(decoded)` care garantează o fotografie reală de studio (`/fleet/*.jpg`) pentru toate cele **47/47 vehicule** din flotă și pentru orice serie VIN nouă sau editată (inclusiv suport decodare dinamică `UU1` Dacia Logan III și `WDD` Mercedes-Benz C-Class), și șters complet funcțiile 2D SVG vechi (`renderThreeQuarterTractorSvg`, `renderThreeQuarterSchmitzTrailerSvg`, `renderThreeQuarterCarSvg`).
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat în Chrome pe toate cele 47 carduri din `Mașinile mele` (`Cards missing studio photo: 0`)

### 2026-11-11 10:55 — Fotografie studio reală cu colantare în perspectivă + Showroom 3D 360° dedicat pentru Mercedes-Benz Sprinter 316 CDI Frigo BA04 (`BH 81 STS`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminat complet desenul 2D caricatural vechi și activat atât modul `Poză` (implicit la deschidere), cât și `Showroom 3D · 360°` pentru `Mercedes-Benz Sprinter 316 CDI Frigo BA04` (`BH 81 STS`)**:
     - În `src/components/FleetVinAndDossierModal.tsx`: extins `TrailerPhotoWithLivery` (`variant="sprinter"`) astfel încât fotografia reală de studio `/fleet/sprinter-frigo-black.jpg` (în culoarea **Negru Obsidian** conform CIV RAR `BH 81 STS`) afișează colantarea corporativă **`BLUE TRANS SPEDITION · EXPRESS FRIGO 3.5T`** în perspectivă pe peretele dubei frigorifice albe, atât în Dosarul Tehnic, cât și pe cardul din `Mașinile mele`.
     - În `src/components/TruckShowroom3D.tsx`: construit modelul 3D WebGL dedicat `buildMercedesSprinterFrigo` la scara exactă din Cartea de Identitate RAR `CIV - BH 81 STS.pdf` (`6.50 m` lungime, `2.36 m` lățime, ampatament `3.665 mm`, roți comerciale pe 16" `195/75 R16C` cu jante din oțel ventilate, cabină semi-capotată Mercedes-Benz Sprinter W906 cu capotă înclinată și prize de aer, grilă cu 3 lamele și steaua Mercedes 3D cromată, faruri alungite, bară față neagră mată cu proiectoare ceață și plăcuță `BH 81 STS`, geamuri laterale în treaptă cu oglinzi duble pe brațe extinse, caroserie izotermă albă `BA04` cu profile de aluminiu anodizat, uși spate duble cu bare de închidere din inox și agregat frontal **Thermo King C-250e** deasupra cabinei).
  2. **Auto-vindecare date `localStorage` și etichete corecte de Autoutilitară N1 (fără „Cap tractor” / „Semiremorcă”)**:
     - `loadPersistedFleetItems()` și `VehicleDossierModal` sincronizează automat câmpurile oficiale din CIV RAR (`vin`, `colorHex`, `colorName`, `model`, `year`, `kind`) peste eventuale date vechi din `localStorage` (ex. `Verde Smarald`), păstrând intacte datele editate de utilizator pentru RCA / CASCO / CMR / ITP / Leasing.
     - Toate titlurile, taburile și câmpurile din `VehicleDossierModal` pentru `BH 81 STS` afișează acum corect **`Autoutilitară (BH 81 STS)`**, **`DOSAR TEHNIC COMPLET AUTOUTILITARĂ FRIGO 3.5T (CONFORM CIV RAR & VIN)`**, `Euro 5`, consum `10,8 L/100km`, anvelope `195/75 R16C` și baterie `12V`, ascunzând câmpurile de semiremorcă în Tab 4 (`Editează VIN & date`).
- **Fișiere:** `src/components/TruckShowroom3D.tsx`, `src/components/FleetVinAndDossierModal.tsx`, `src/components/TmsOperationsView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome (`Poză` + `3D 360°` Față / Profil / Uși spate + card `Mașinile mele` + dimensiune fixă modal `1024 × 845 px` pe toate cele 3 taburi)

### 2026-11-11 10:15 — Fixat butonul de închidere `X` strict în colțul dreapta-sus pe toate ferestrele modale (`VehiclePdfViewerModal.tsx` și toate celelalte modale)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Vizualizator PDF Carte de Identitate / Acte (`src/components/VehiclePdfViewerModal.tsx`)**: separat antetul în **Rândul 1 (Titlebar fereastră)** cu `flex flex-nowrap items-start justify-between` (plăcuța RO + titlu document + capsulă `PDF Original` în stânga, și butonul circular `<X />` `w-9 h-9 rounded-full shrink-0` ancorat permanent în **colțul dreapta-sus**) și **Rândul 2 (Toolbar acțiuni)** pe un singur rând (`CIV / + Adaugă PDF` în stânga, `Filă nouă` + `Descarcă PDF` în dreapta). Îmbunătățit totodată fallback-ul `<dialog closedby="any">` cu verificare `pointerdown` + `pointerup` în afara dreptunghiului dialogului și adăugate regulile `dialog:modal` / `dialog::backdrop` (`overscroll-behavior: contain`) în `src/index.css`.
  2. **Standardizare globală pe toate ferestrele și modalele aplicației**: eliminat `flex-wrap` / `flex-col` pe antetele ferestrelor și standardizat butonul `<X className="w-4 h-4" />` (`w-9 h-9 rounded-full shrink-0`, `type="button"`, `aria-label`) fixat în colțul dreapta-sus în `CmrAndInvoiceModal.tsx`, `FleetVinAndDossierModal.tsx` (`VehicleDossierModal` + modalul rapid `RCA / CASCO / CMR / Leasing`), `EuropeLiveMap.tsx` (modul ecran complet), `Planning7DaysView.tsx` (2 modale), `OrdersAndTripsView.tsx`, `TmsOperationsView.tsx` (3 modale), `ClientOffersView.tsx`, `OrderDecisionModal.tsx` și `AuditLogModal.tsx`.
- **Fișiere:** `src/components/VehiclePdfViewerModal.tsx`, `src/components/CmrAndInvoiceModal.tsx`, `src/components/FleetVinAndDossierModal.tsx`, `src/components/EuropeLiveMap.tsx`, `src/components/Planning7DaysView.tsx`, `src/components/OrdersAndTripsView.tsx`, `src/components/TmsOperationsView.tsx`, `src/components/ClientOffersView.tsx`, `src/components/OrderDecisionModal.tsx`, `src/components/AuditLogModal.tsx`, `src/index.css`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat geometric și vizual în Chrome pe desktop (`1512px`) și ecran îngust (`560px`/`640px`): `rightGap=21px, topGap=21px` în `VehiclePdfViewerModal`

### 2026-11-11 09:57 — Salvare permanentă în `localStorage` și sincronizare bidirecțională pentru toate cursele și comenzile create (`App.tsx`, `Planning7DaysView.tsx`, `OrdersAndTripsView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminat pierderea curselor la schimbarea paginii, refresh sau HMR (`usePersistentState` în `src/App.tsx`)**:
     - Ridicat și salvat sincron în `localStorage` (atât direct în setter, cât și prin `useEffect`) toate stările operaționale: `planningCards` (`bluetrans_planning_cards_v1`), `activeLoads` (`bluetrans_active_loads_v1`), `trailers` (`bluetrans_trailers_state_v1`), `unassignedOrders` (`bluetrans_unassigned_orders_v1`) și `proposals` (`bluetrans_proposals_v1`). Anterior, `cards` din `Planning7DaysView.tsx` și `activeLoads` din `OrdersAndTripsView.tsx` erau în `useState` local și se ștergeau la fiecare comutare pe alt meniu (`Flotă`, `Comenzi & curse`, `Dashboard`) sau la reîncărcarea paginii.
  2. **Sincronizare bidirecțională 1:1 între `Planificare` (`Calendar 7 zile`) și `Comenzi & curse`**:
     - Crearea unei curse din `Planificare` (prin noul buton capsulă **`+ Cursă nouă`** din bara `NOIEMBRIE 2026`, prin click pe celulă liberă sau prin `+ Adaugă cursă` pe celulele deja ocupate) o salvează permanent în calendar, o adaugă automat în tabelul `Comenzi & curse` (`activeLoads`) și actualizează LDM-ul și tonajul remorcii.
     - Crearea unei curse din `Comenzi & curse` (`+ Cursă / Comandă nouă` cu opțiunea implicită **`Alocă direct în Calendar 7 zile`**, sau prin Wizard-ul în 3 pași `Confirmă & Trimite în Planning 7 Zile`, unde a fost remediat și bug-ul de desincronizare a `selectedOrderForTrip` la a doua alocare) o salvează simultan atât în tabelul `Comenzi & curse`, cât și direct pe ziua și ora aleasă în `Calendar 7 zile`.
  3. **Accesibilitate și formulare rotunjite (`rounded-full`)**: asociat `<label htmlFor>` + `id` + `name` pe controale, adăugat `<fieldset>` + `<legend>` cu butoane radio vizibile pentru modul de planificare, `type="button"` pe toate butoanele secundare și `role="status" aria-live="polite"` pe confirmările de salvare.
- **Fișiere:** `src/App.tsx`, `src/components/Planning7DaysView.tsx`, `src/components/OrdersAndTripsView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat end-to-end în Chrome (creare cursă în `Planificare` + creare cursă în `Comenzi & curse` + comutare taburi `Flotă`/`Comenzi`/`Planificare` + `page.reload()` complet: ambele curse persistă 100%)

### 2026-11-10 23:51 — Dimensiune și poziție 100% fixe ale ferestrelor modale la comutarea între taburi (`FleetVinAndDossierModal.tsx`, `CmrAndInvoiceModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Dosarul Tehnic 3D (`VehicleDossierModal` din `src/components/FleetVinAndDossierModal.tsx`)**: blocat dimensiunea exterioară a ferestrei la `w-[min(96vw,1024px)] h-[min(91dvh,845px)] flex flex-col overflow-clip`, cu antetul și bara celor 4 taburi fixate sus (`shrink-0`), zona de conținut `role="tabpanel"` internă derulabilă stabil (`flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]`) și subsol unificat fixat jos (`shrink-0`, asociat prin `form={...}` cu formularul din Tab 4). Dimensiunea și coordonatele ferestrei rămân identice la pixel (`1024 × 837 px`, `top: 41 px`, `tablistTop: 149 px`) pe toate cele 4 taburi.
  2. **Fereastra CMR / Factură (`CmrAndInvoiceModal` din `src/components/CmrAndInvoiceModal.tsx`)**: fixat similar carcasa exterioară la `w-[min(96vw,896px)] h-[min(90dvh,760px)] flex flex-col overflow-clip` (cu `print:w-full print:h-auto print:overflow-visible` la tipărire) pentru zero variație de înălțime între taburile `Scrisoare CMR Internațional` și `Factură Proformă / Fiscală (EUR)`.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`, `src/components/CmrAndInvoiceModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat în Chrome (`allDossierHeightsEqual: true`, `allDossierTopsEqual: true`, `allDossierTablistTopsEqual: true`, `allCmrHeightsEqual: true`, 0 erori consolă)

### 2026-11-10 23:39 — Selectoare reale de calendar + calcul automat live al zilelor rămase pentru RCA, CASCO, CMR, ITP, ATP și Tahograf (`ExpiryCalendarField.tsx`, `FleetVinAndDossierModal.tsx`, `TmsOperationsView.tsx`, `index.css`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Componentă reutilizabilă de calendar capsulă cu contor live de zile rămase (`src/components/ExpiryCalendarField.tsx` + `temporal-polyfill`)**:
     - Creat `<ExpiryCalendarField />` cu `<input type="date" autoComplete="off">`, buton explicit `type="button"` cu pictograma `<Calendar />` (`showPicker()`), buton opțional de golire (`×` pentru „Fără CASCO” / „Fără CMR”) și insignă capsulă `rounded-full` (`role="status" aria-live="polite"`) care afișează în timp real `X zile rămase`, `Expiră azi!`, `Expirat (X zile)` sau `Fără CASCO`, cu pictograme semantice (`CheckCircle2`, `AlertTriangle`, `AlertCircle`, `Clock`) și tooltip localizat prin `Temporal.PlainDate` / `Intl.DurationFormat('ro-RO')`.
  2. **Dosar Tehnic 3D (`VehicleDossierModal` din `src/components/FleetVinAndDossierModal.tsx`)**:
     - **Tab 4 (`Editează VIN & date`)**: înlocuit câmpurile text libere cu un `<fieldset>` + `<legend>` cu comutator capsulă `Cap tractor` / `Semiremorcă` și 6 selectoare reale de calendar (**Expirare RCA**, **Expirare CASCO**, **Expirare CMR**, **Expirare ITP**, **Certificat Frigo ATP**, **Verificare Tahograf G2V2**); dezactivat AutoFill/autocorrect pe câmpurile de înmatriculare și VIN (`autoComplete="off" autoCorrect="off" spellCheck={false}`).
     - **Tab 1, Tab 2 și Tab 3**: adăugate insigne capsulă colorate cu numărul exact de zile rămase lângă `RCA`, `CASCO`, `CMR`, `ITP`, `ATP` și `Tahograf`.
  3. **Sincronizare instantanee în „Mașinile mele” și fereastra rapidă `RCA / CASCO / CMR / Leasing` (`MasinileMeleFleetBoard`)**:
     - Click pe oricare celulă `RCA`, `CASCO`, `CMR` sau `Leasing` deschide fereastra poliței cu selector de calendar interactiv + recalculare în timp real a zilelor rămase + salvare în `localStorage` (`bluetrans_masinile_mele_v6`) și actualizare instantanee pe carduri, în tabelul `Listă` și în alertele din Dashboard (`getFleetDocAlerts`).
  4. **Modale de editare Flotă & Șoferi (`src/components/TmsOperationsView.tsx` + `src/index.css`)**:
     - Înlocuite câmpurile text pentru `Expirare ITP`, `RCA / CMR`, `Certificat ATP`, `Expirare Card Tahograf` și `Expirare Atestat CPI/CPC` cu `<ExpiryCalendarField />` și adăugată clasa `.tms-calendar-input` în `src/index.css` pentru contrast optim în Light Mode și Dark Mode.
- **Fișiere:** `src/components/ExpiryCalendarField.tsx` (nou), `src/components/FleetVinAndDossierModal.tsx`, `src/components/TmsOperationsView.tsx`, `src/index.css`, `package.json`, `package-lock.json`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual și funcțional în Chrome (`Tab 4` + `Tab 1` + modal `CASCO` + salvare live `RCA 71 zile` pe cardul `IF 96 STS`)

### 2026-11-10 23:17 — Eliminat butonul redundant `⋮` (3 puncte) din cardurile și tabelul „Mașinile mele” (`FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Eliminat butonul `⋮` din dreapta blocului `RCA | CASCO | CMR | Leasing` pe cardurile din `Carduri` și coloana `⋮` din tabelul `Listă` în `MasinileMeleFleetBoard` (`src/components/FleetVinAndDossierModal.tsx`), întrucât click oriunde pe rând/card deschide deja direct dosarul vehiculului.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome (`Carduri` + `Listă`, 0 `⋮` pe pagină)

### 2026-11-10 23:14 — Toate taburile, sub-taburile, comutatoarele și butoanele din aplicație rotunjite complet stil capsulă (`rounded-full`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Stilizare globală capsulă (`border-radius: 9999px` / `rounded-full`)** în `src/index.css` pe clasele `.tahoe-btn-primary`, `.tahoe-btn-secondary` și `[role="tab"]`, cu indicator de selecție sincronizat direct pe `[role="tab"][aria-selected="true"]` + subliniere accesibilă `::after` (`border-block-end` vizibilă inclusiv în `forced-colors`) și contrast complet atât în Light Mode, cât și în Dark Mode.
  2. **Toate barele de taburi și sub-taburi pe un singur rând (`flex-nowrap overflow-x-auto no-scrollbar`) și complet rotunjite (`rounded-full`)**:
     - `TmsOperationsView.tsx`: bara celor 4 taburi (`Flotă`, `Șoferi & Tahograf`, `Clienți`, `Facturare`) + containerul capsulă exterior + toate butoanele din Șoferi, Clienți, Facturare și modale.
     - `App.tsx`: meniul lateral desktop, bara de sub-taburi de sus (`Calendar 7 zile · Grupaje & disponibilități · Schimburi de remorci · Oferte clienți`, `Comenzi & curse · Vedere șofer`), dock-ul mobil și meniul mobil.
     - `FleetVinAndDossierModal.tsx`, `TruckShowroom3D.tsx`, `VehiclePdfViewerModal.tsx`: cele 4 taburi din Dosarul Tehnic, etichetele `VIN / Euro / Culoare`, comutatorul `3D 360° | Poză`, unghiurile `Față | Profil | Spate`, `Rotire`, `Vezi CIV PDF`, bara de filtre `Mașinile mele`, comutatorul `Carduri | Listă`, `Compact`, `CIV PDF` și toate butoanele din modale.
     - `OrdersAndTripsView.tsx`, `Planning7DaysView.tsx`, `TrailerSwapView.tsx`, `ClientOffersView.tsx`, `CmrAndInvoiceModal.tsx`, `DriverPortalView.tsx`, `EuropeLiveMap.tsx`, `LoginView.tsx`, `TodayView.tsx`, `SmartGroupageView.tsx`, `ControlCenterView.tsx`, `OrderDecisionModal.tsx`, `ClientDropdownSelect.tsx`, `GoogleMapsAddressInput.tsx`: toate butoanele de acțiune, filtrele, pașii wizard și controalele de pe hartă trecute pe `rounded-full`.
- **Fișiere:** `src/index.css`, `src/App.tsx`, `src/components/TmsOperationsView.tsx`, `src/components/FleetVinAndDossierModal.tsx`, `src/components/TruckShowroom3D.tsx`, `src/components/VehiclePdfViewerModal.tsx`, `src/components/OrdersAndTripsView.tsx`, `src/components/Planning7DaysView.tsx`, `src/components/TrailerSwapView.tsx`, `src/components/ClientOffersView.tsx`, `src/components/CmrAndInvoiceModal.tsx`, `src/components/DriverPortalView.tsx`, `src/components/EuropeLiveMap.tsx`, `src/components/LoginView.tsx`, `src/components/TodayView.tsx`, `src/components/SmartGroupageView.tsx`, `src/components/ControlCenterView.tsx`, `src/components/OrderDecisionModal.tsx`, `src/components/ClientDropdownSelect.tsx`, `src/components/GoogleMapsAddressInput.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome (Light + Dark, `Flotă`, `Dosar 3D`, `Planificare`, `Comenzi & curse`, `Login`, 0 erori consolă)

### 2026-11-10 22:39 — Aliniere 100% culori oficiale, motorizări, rezervoare și ani de fabricație din toate cele 43 de Cărți de Identitate RAR CIV (`FleetVinAndDossierModal.tsx`, `TruckShowroom3D.tsx`, `public/fleet/`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Verificat toate cele 43 de PDF-uri RAR CIV scanate din `public/acte-flota/`** (rubricile `R. Culoare` / `18 Culoarea`, `D.2 / D.3`, `P.2`, `52 Capacitatea rezervorului`, `2. An fabricație`) și eliminat orice culoare pusă din oficiu în `KNOWN_VIN_CATALOG`, `FLEET_VIN_DATABASE` și `INITIAL_MASINILE_MELE` (`localStorage` migrat la `bluetrans_masinile_mele_v6`):
     - **10 culori corectate conform CIV RAR**: `B 166 STS` (`ALB`), `B 871 STS` (`ALB`), `BH 12 STS` (`ALB`), `BH 30 STS` (`ALB`), `BH 49 STS` (`ALB`), `BH 72 STS` (`ALB`), `IF 20 STS` (`ALB`), `IF 12 STS` (`GRI`), `BH 81 STS` Sprinter Frigo (`NEGRU`) și semiremorca `BH 33 STS` (`ALBASTRU`).
     - **Motorizări / modele și ani CIV aliniați**: `B 166 STS` & `B 871 STS` (`Scania R 460`, `338 kW`, `615+570 L`), `B 560 STS` (`Scania S 560`, `412 kW`), `IF 12 STS` (`Scania R 450`, `331 kW`), `IF 30 BTS` (`Scania S 450`, `331 kW`), `BH 49 STS` (`Volvo FH 460`, `345 kW`), `BH 46 STS` (`2024`, `405 kW`), plus anii reali din CIV pe cele 10 semiremorci cu caracterul 10 `0` în VIN (`BH 75 STS` `2015`, `BH 67 STS` `2018`, `BH 69 STS` `2009`, `BH 74 STS` `2012`, `BH 91 STS` `2018`, `BH 45 STS` `2013`, `BH 06 XTS` `2017`, `BH 33 STS` `2011`, `BH 47 STS` `2006`, `BH 52 STS` `2009`).
  2. **9 fotografii OEM de studio noi în `public/fleet/`** potrivite 1:1 pe model + culoarea din CIV (`scania-r-nextgen-white.jpg`, `scania-s-nextgen-white.jpg`, `scania-r-nextgen-grey.jpg`, `scania-r-streamline-white.jpg`, `volvo-fh-white.jpg`, `sprinter-frigo-black.jpg`, `dacia-logan-2024-blue.jpg`, `mercedes-c250-w204-black.jpg`, `schmitz-reefer-blue.jpg`), cu colantare albă `BLUE TRANS SPEDITION` pe `BH 33 STS` atât în modul `Poză`, cât și în Showroom-ul 3D 360° (`trailerOemHex`) și pe ansamblul cuplat 16.5m, plus ecuson grilă dinamic (`R 460`, `R 450`, `S 450`, `S 560`, `FH 460`, `FH 540`) în `TruckShowroom3D.tsx`.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`, `src/components/TruckShowroom3D.tsx`, `public/fleet/*.jpg` (9 imagini noi)
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome (Light + Dark, `B 871 STS` Alb `R 460`, `IF 12 STS` Gri `R 450`, `BH 33 STS` Albastru `2011`, `BH 81 STS` Negru, `B 102 STS` Albastru, `BH 01 STS` Negru, 0 imagini rupte, 0 erori consolă)

### 2026-11-10 22:04 — Colantare corporativă denumire companie pe semiremorci în Showroom 3D 360°, fotografii de studio și carduri Flotă (`TruckShowroom3D.tsx`, `FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Showroom 3D 360° (`src/components/TruckShowroom3D.tsx`)**: adăugat inscripționarea corporativă pe ambele pereți laterali de 13.6m (`createReeferSideTexture`, calibrată la raportul UV 12.65m × 2.66m și filtrare anizotropică `16x`) și pe ușile duble din spate (`createReeferRearDoorsTexture`, plăci corporative sub tijele de închidere din inox), atât pe **Tab 2 (`Semiremorcă`)**, cât și pe **Tab 3 (`Ansamblu, anvelope & acte`)** (ansamblul cuplat 16.5m):
     - pentru semiremorcile **BLUE TRANS SPEDITION**: **`BLUE TRANS SPEDITION`** cu chevroane aerodinamice și banda `INTERNATIONAL FRIGO & BI-TEMP LOGISTICS · ROMÂNIA`;
     - pentru semiremorcile **SCANDEXPRES** (ex. `BH 75 STS`, `BH 05 XTS`, `BH 02 XTS`, `BH 03 XTS`): **`SCANDEXPRES`** cu banda `BLUE TRANS SPEDITION GROUP · FRIGO & BI-TEMP LOGISTICS`.
  2. **Fotografii de studio (`Poză`) & Carduri Flotă (`src/components/FleetVinAndDossierModal.tsx`)**: creat componenta `TrailerPhotoWithLivery` care aplică colantarea în perspectivă reală (`mix-blend-mode: multiply`, păstrând reflexiile și îmbinările panourilor Ferroplast/Duoplex) peste fotografiile Schmitz Cargobull și Krone Cool Liner (în Dosar și pe miniaturile cardurilor din **Flotă → Mașinile mele**), actualizat randările 2D SVG de rezervă și adăugat insigna companiei în antetul și caseta `Companie & Producător` din fișa tehnică a semiremorcii.
- **Fișiere:** `src/components/TruckShowroom3D.tsx`, `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome (Light + Dark, Showroom 3D lateral + uși spate + ansamblu 16.5m + mod `Poză` Schmitz/Krone + carduri `Mașinile mele`)

### 2026-11-10 21:43 — Integrare completă a celor 43 de Cărți de Identitate (CIV PDF) pe număr de înmatriculare (`fleetDocuments.ts`, `VehiclePdfViewerModal.tsx`, `FleetVinAndDossierModal.tsx`, `DriverPortalView.tsx`, `vite.config.ts`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Catalog dinamic PDF (`src/data/fleetDocuments.ts` + pluginul `acteFlotaSyncPlugin` din `vite.config.ts`)**: conectat toate cele **43 de fișiere `.pdf` reale** din `public/acte-flota/` pe număr de înmatriculare (inclusiv fișierele cu spații duble gen `CIV - B 506  STS.pdf` sau fără spații gen `CIV-B166STS.pdf`, `CIV-B871STS.pdf`), generat automat `public/acte-flota/index.json` la pornire și la cerere, plus endpoint local `POST /api/acte-flota/upload` pentru încărcarea de PDF-uri noi direct din aplicație în `public/acte-flota/`.
  2. **Vizualizator PDF integrat în aplicație (`src/components/VehiclePdfViewerModal.tsx`)**: fereastră modală nativă `<dialog closedby="any">` deschisă cu `showModal()` (cu fallback click-outside pe coordonate pentru browsere fără `closedBy`), previzualizare PDF nativă în pagină (`#view=FitH`), deschidere în filă nouă, descărcare PDF originală și buton `+ Adaugă PDF` (CIV / Talon / ITP / RCA / CASCO / ATP / Licență).
  3. **Acces în 1 click peste tot în aplicație**:
     - În **Flotă → Mașinile mele** (`MasinileMeleFleetBoard`): filtru dedicat `43 cărți CIV (PDF)`, buton `CIV PDF` pe fiecare card și în tabelul `Listă`, precum și în fereastra de detalii `RCA / CASCO / CMR / Leasing`.
     - În **Dosarul Tehnic 3D (`VehicleDossierModal`)**: bară `Vezi CIV PDF` + descărcare rapidă pe Tab 1 (`Cap tractor` / `Autoturism` / `Autoutilitară 3.5t`), Tab 2 (`Semiremorcă`) și Tab 3 (`Ansamblu, anvelope & acte`), păstrând strict pe un singur rând toate cele 4 taburi și etichetele VIN/Euro/Culoare.
     - În **Portal Șofer (`DriverPortalView.tsx`)**: butoane rapide `CIV Cap Tractor` și `CIV Semiremorcă` pe cardul camionului alocat.
  4. **Aliniere 1:1 cu datele reale din cărțile RAR CIV scanate** (păstrând neschimbate totalurile operaționale `20 capete tractor` și `16 semiremorci` din `getRealFleet()`): adăugate cele 3 autoturisme M1 (`B 102 STS`, `B 196 STS` Dacia Logan III 2024, `BH 01 STS` Mercedes C 250 CDI), actualizate `BH 81 STS` (`Mercedes-Benz Sprinter 316 CDI Frigo 3.5t`, VIN `WDB9061531N496201`) și `BH 41 STS` (`Volvo FH 460 EEV`, VIN `YV2AG20A3EB683074`) conform CIV-urilor reale, și înregistrate separat `IF 58 STS`, `IF 71 STS`, `IF 02 XTS`, `IF 78 STS` și `BH 03 XTS` cu seriile lor reale de șasiu.
- **Fișiere:** `vite.config.ts`, `src/data/fleetDocuments.ts` (nou), `src/components/VehiclePdfViewerModal.tsx` (nou), `src/components/FleetVinAndDossierModal.tsx`, `src/components/DriverPortalView.tsx`, `src/index.css`, `public/acte-flota/index.json` (generat automat)
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome (Light + Dark, Carduri + Listă + Dosar 3D + previzualizare PDF real scanat)

### 2026-11-10 20:59 — Showroom 3D interactiv 360° (Three.js + WebGL + suport .glb) în Dosarul vehiculului (`TruckShowroom3D.tsx`, `FleetVinAndDossierModal.tsx`, `public/models/`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. Construit vizualizatorul **Showroom 3D 360°** (`src/components/TruckShowroom3D.tsx`) cu `Three.js` (`OrbitControls`, `RoomEnvironment` PBR metallic clearcoat, platou rotativ de showroom cu inel LED, jante Alcoa 22.5", roți duble pe puntea motoare, șa de cuplare Jost, furtunuri spiralate aer/EBS în spatele cabinei, plăcuțe 3D `RO` cu numărul real al mașinii și vopsea metalizată sincronizată live cu seria VIN):
     - **Tab 1 (`Cap tractor`)**: modele 3D dedicate pentru **Scania NextGen Highline (R/S)** și **Volvo FH Globetrotter XL** (configurații `4x2` și `6x2`), cu unghiuri rapide (`Față`, `Profil`, `Spate / Șa`) și buton `Rotire / Pauză`.
     - **Tab 2 (`Semiremorcă`)**: semiremorcă frigorifică Bi-Temp 13.6m (**Schmitz Cargobull S.KO Cool** / **Krone Cool Liner**) cu agregat 3D Thermo King, ladă de paleți, picioare de calare, 3 axe și uși duble spate cu 4 tije din inox (`Uși spate`).
     - **Tab 3 (`Ansamblu, anvelope & acte`)**: ansamblul complet cuplat 16.5m (cap tractor + semiremorcă pe șaua de cuplare) rotativ 360°.
  2. Adăugat comutatorul instant **`3D 360° | Poză`** în colțul din dreapta-sus al scenei (fără a afecta barele pe un singur rând) + suport nativ `GLTFLoader` prin `public/models/manifest.json` dacă se adaugă ulterior fișiere CAD `.glb` externe în `public/models/`.
- **Fișiere:** `src/components/TruckShowroom3D.tsx` (nou), `src/components/FleetVinAndDossierModal.tsx`, `public/models/manifest.json` (nou), `public/models/README.txt` (nou), `package.json`, `package-lock.json`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în Chrome (Light + Dark, Scania + Volvo + Semiremorcă + Ansamblu 16.5m + comutator `3D 360° / Poză`)

### 2026-11-10 20:26 — Toate barele din Dosarul vehiculului (cele 4 taburi + etichetele VIN/Euro/Culoare din ambele secțiuni + titlul ferestrei) pe un singur rând (`FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Trecut pe un singur rând (`flex-nowrap` + denumirea românească curată a culorii fără dublura în engleză): (1) bara celor 4 taburi (`Cap tractor` · `Semiremorcă` · `Ansamblu, anvelope & acte` · `Editează VIN & date`), (2) bara cu cele 3 etichete de deasupra pozei (`VIN: ...` · `Euro 6d · 2018` · `🔵 Albastru Metalizat`) atât în secțiunea **Cap tractor**, cât și în secțiunea **Semiremorcă**, (3) bara de sub poză și (4) titlul ferestrei modale (fără ruperea lui `STS` pe rândul 2).
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit `🟢 VERDE` (21/21) · verificat în browser pe ambele taburi (Cap tractor + Semiremorcă)

### 2026-11-10 20:20 — Cele 4 taburi din Dosarul vehiculului pe un singur rând (`FleetVinAndDossierModal.tsx`, `i18n.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Scurtat etichetele celor 4 taburi din fereastra Dosarului tehnic (`Cap tractor (IF 96 STS)` · `Semiremorcă (BH 75 STS)` · `Ansamblu, anvelope & acte` · `Editează VIN & date`) și trecut containerul pe `flex-nowrap` ca să încapă toate pe un singur rând fără să mai sară pe rândul 2.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`, `src/i18n/i18n.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit `🟢 VERDE` (21/21) · verificat în browser (Light Mode)

### 2026-11-10 20:15 — Calcul real distanță rutieră fără „680 km (+14 km)” fals + refacere completă a paginii „Schimburi de remorci” (`Planning7DaysView.tsx`, `GoogleMapsAddressInput.tsx`, `OrdersAndTripsView.tsx`, `EuropeLiveMap.tsx`, `TrailerSwapView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminat „680 km (+14 km)” fals și clarificat ocolul de grupaj:** „Groningen” lipsea din lista de 30 de orașe, motiv pentru care codul cădea pe un fallback fix `680 km`, iar pentru orice comandă `< 10 LDM` adăuga mecanic `(+14 km)` fără să existe ocol și fără să scrie ce înseamnă. Acum dicționarul are peste 170 de orașe europene + coordonatele GPS învățate live din căutarea Google Maps / Photon (`lookupLearnedPlaceCoords`), `Groningen → Rotterdam` calculează distanța reală (**255 km** până în portul Waalhaven, fără ocol inventat), câmpurile necompletate afișează `—` (nu `680 km`), iar acolo unde există efectiv un ocol de la autostradă se afișează explicit `540 km · ocol 14 km` (fără `+` criptic și fără tăiere cu `...`). Pe harta live (`EuropeLiveMap.tsx`), etapele afișează `540 km (etapă 245 km)` în loc de `(+245 km)`.
  2. **Refăcut complet pagina „Schimburi de remorci” (`TrailerSwapView.tsx`) pe un singur ecran:** scoase codurile robotice (`SWAP-RO-DE-01` etc.) și paragrafele lungi duplicate; cele 4 propuneri au titluri simple în română (`Schimb reciproc de remorci`, `Tractor liber preia remorca`, `Echipaj 2 șoferi preia cursa`, `Lăsare remorcă la rampă`), plăcuțe românești reale (`EuroRoPlate`) și încap integral pe ecran alături de fluxul în 3 coloane (**Camion 1 ↔ Punctul de întâlnire + Ce remorci preiau + Butonul „Aprobă schimbul de remorci” ↔ Camion 2**), cu confirmarea ambilor șoferi și opțiunile post-schimb clare atât în Light Mode, cât și în Dark Mode.
- **Fișiere:** `src/components/Planning7DaysView.tsx`, `src/components/GoogleMapsAddressInput.tsx`, `src/components/OrdersAndTripsView.tsx`, `src/components/EuropeLiveMap.tsx`, `src/components/TrailerSwapView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `vite build` OK · audit `🟢 VERDE` (21/21) · verificat vizual în browser (Light + Dark: `Groningen → Rotterdam = 255 km`, `Schimburi de remorci` pe un singur ecran)

### 2026-11-10 19:57 — Logo vectorial dinamic Blue Trans Spedition + denumirea aplicației „SFERLE TMS PRO” conform e-mailului lui Călin (`DynamicBrandLogo.tsx`, `App.tsx`, `LoginView.tsx`, `index.css`, `index.html`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. Verificat e-mailul oficial de la Călin Sferle / Blue Trans Spedition și cele 5 capturi anexate: denumirea cerută explicit este **„SFERLE TMS PRO”** (*„Vă contactăm din partea BLUE TRANS SPEDITION în legătură cu SFERLE TMS PRO, un proiect de software propriu pentru transporturi rutiere...”*). Actualizat titlul aplicației în meniul lateral, ecranul de login, `<title>` din `index.html`, modale și traducerile `i18n.tsx`.
  2. Creat componenta vectorială `DynamicBrandLogo.tsx` direct din curbele originale ale logo-ului Blue Trans Spedition (`bts-logo.svg`), fără chenarul alb lipit peste fundal: puls aerodinamic secvențial pe cele 4 linii de viteză ale semiremorcii, reflexie de lumină (sheen) peste cabină, linie de rulare pe autostradă, micro-suspensie și adaptare automată Light Mode (`#004aad`) / Dark Mode (`#e2e8f0`).
  3. Readus bara de sus la `64px` și trecut `<nav>` din sidebar pe `flex-1 min-h-0` pentru a nu tăia niciodată itemii din meniu.
- **Fișiere:** `src/components/DynamicBrandLogo.tsx` (nou), `src/App.tsx`, `src/components/LoginView.tsx`, `src/index.css`, `index.html`, `src/components/OrdersAndTripsView.tsx`, `src/components/AnalysisAndScenariosView.tsx`, `src/i18n/i18n.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit `🟢 VERDE` (21/21) · verificat vizual în browser (Light + Dark, Dashboard + Login)

### 2026-11-10 22:25 — Logo mai mare în aplicație (`App.tsx`, `LoginView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Logo-ul Blue Trans Spedition din meniul lateral are acum 70 px înălțime (înainte 46); bara de sus pe desktop și antetul meniului au 88 px ca să rămână aliniate. Pe mobil logo-ul are 44 px (înainte 36), iar pe pagina de login 80 px (înainte 52).
- **Fișiere:** `src/App.tsx`, `src/components/LoginView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · captură în browser (mod luminos) verificată

### 2026-11-10 22:15 — Pagina de start redenumită „Dashboard” (`App.tsx`, `TodayView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La cererea utilizatorului, „Start” a devenit „Dashboard” în meniu (sub-titlu „De făcut azi”) și în titlul paginii. Conținutul nu s-a schimbat.
- **Fișiere:** `src/App.tsx`, `src/components/TodayView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK

### 2026-11-10 22:10 — Redenumit „Ce am de făcut azi” în „Start” (`App.tsx`, `TodayView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Numele paginii de start era lung și neclar. În meniu și în titlul paginii se numește acum „Start”, cu sub-titlul „De făcut azi”. Conținutul paginii nu s-a schimbat.
- **Fișiere:** `src/App.tsx`, `src/components/TodayView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK

### 2026-11-10 22:00 — Pagina de start „Ce am de făcut azi”, meniu redus de la 8 la 5 pagini, etichete DEMO (`TodayView.tsx`, `DemoBadge.tsx`, `App.tsx`, `FleetVinAndDossierModal.tsx`, `TmsOperationsView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. Pagină nouă de start **„Ce am de făcut azi”** (prima din meniu, implicită la login/refresh nou): 3 contoare (de plasat / de răspuns / probleme), lista „De plasat” cu recomandare + „Unde o pun?” (motorul LDM), lista „De răspuns” cu Acceptă / Contraofertă / Refuză (aceleași handler-e din App), „Probleme” (RCA/CASCO/CMR reale expirate sau ≤14 zile + șoferi sub 2 h de condus) și „Flota azi” (16 remorci / 20 capete tractor reale).
  2. Meniul are acum 5 pagini: Ce am de făcut azi · Planificare · Comenzi & curse · Flotă · Control Center. Grupaje, Swap și Oferte clienți sunt file în Planificare; „Vedere șofer” e filă în Comenzi & curse; Clienți e deja filă în Flotă. ID-urile vechi de tab (`groupage`, `swap`, `offers`, `clients`, `driver`) merg în continuare. Rolul FINANCIAR intră pe „Oferte clienți”; rolul ȘOFER vede doar Portal Șofer.
  3. Etichetă **DEMO** (pastilă galbenă, ambele teme) pe tot ce e date de test: comenzi, oferte, calendar/curse, grupaje, swap, KPI-uri și GPS din Control Center, portal șofer, filele Șoferi & Tahograf / Clienți / Facturare, culorile și pozele camioanelor. Datele reale (plăcuțe, VIN, RCA/CASCO/CMR/leasing, 16+20) nu au etichetă.
  Notă: „Unde o pun?” din pagina Azi actualizează capacitatea remorcii, dar nu creează card în calendar (cardul se creează doar din Planificare).
- **Fișiere:** `src/components/TodayView.tsx` (nou), `src/components/DemoBadge.tsx` (nou), `src/App.tsx`, `src/components/FleetVinAndDossierModal.tsx` (`getFleetDocAlerts`, badge DEMO), `src/components/TmsOperationsView.tsx`, `src/index.css`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde 21/21 · test în browser (dark + light, toate paginile; plasare comandă, accept/contraofertă, file, refresh, roluri FINANCIAR și ȘOFER). Eroare veche non-fatală în consolă pe Portal Șofer: `_leaflet_pos` (harta din `EuropeLiveMap`).

### 2026-11-10 21:10 — Toată flota reală în Planning: 16 remorci + 20 capete tractor, alese independent (`Planning7DaysView.tsx`, `FleetVinAndDossierModal.tsx`, `ControlCenterView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. În „Creare rapidă în celulă” dropdown-ul „Ansamblu” avea doar cele 7 ansambluri din date demo. Acum sunt două câmpuri: **Remorcă** (toate cele 16 remorci active din flota reală: 7 cu șofer și curse în plan + 9 „fără cursă alocată”) și **Cap tractor** (toate cele 20: 7 cu șofer în plan + 13 libere). Nu s-au inventat perechi sau șoferi pentru restul flotei.
  2. Cardul din calendar păstrează capul tractor ales (`tractorPlate`) și arată cele două plăcuțe.
  3. În panoul „Camioane & Remorci” a apărut secțiunea „Restul flotei · fără cursă alocată” cu plăcuțele celor 9 remorci și 13 capete tractor rămase.
  4. Pentru o remorcă fără traseu GPS în sistem, fereastra de detalii nu mai împrumută harta și traseul altei remorci (înainte afișa traseul TR-4821 al lui BH 67 STS); arată un mesaj și ascunde tahograful inventat.
  5. Control Center: „Remorci” arată acum 16 (flota reală activă) și „20 capete tractor”, în loc de 25 inventat.
  Notă: perechile cap tractor + remorcă și șoferii pentru restul flotei nu sunt în tabelul Google Sheet folosit; până se primesc, rămân alese manual la creare.
- **Fișiere:** `src/components/Planning7DaysView.tsx`, `src/components/FleetVinAndDossierModal.tsx`, `src/components/ControlCenterView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · test în browser: dropdown-uri 16 / 20 opțiuni, card BH 49 STS + BH 59 STS creat, fereastra de detalii se deschide fără erori

### 2026-11-10 20:50 — Câmpul de adresă: lista de sugestii nu mai e tăiată de fereastră, doar locuri din Europa, etichete pe un rând, iconița de pin vizibilă (`GoogleMapsAddressInput.tsx`, `ClientOffersView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. Lista „Sugestii adrese & hub-uri” se afișează acum deasupra ferestrei (portal, poziție fixă sub câmp), nu mai e tăiată de marginea ferestrei și nu mai acoperă câmpurile LDM / Temp / Preț. Se închide la click în afară.
  2. Căutarea live (Photon) este limitată la Europa (casetă geografică + coduri de țară europene), ca să nu mai apară rezultate precum „Altamira, Brazilia”. Hub-urile proprii apar primele.
  3. Etichetele „Încărcare” / „Descărcare” sunt scurte, iar linkul „Google Maps” rămâne pe un rând (înainte se rupea pe 2–3 rânduri).
  4. Iconița de pin roșu din câmp era acoperită de câmpul de text; acum se vede.
  Modificarea se aplică peste tot unde se folosește câmpul de adresă (fereastra „Simulează ofertă”, Planning, Comenzi & curse).
- **Fișiere:** `src/components/GoogleMapsAddressInput.tsx`, `src/components/ClientOffersView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · test în browser (Mod Luminos): tastat „Vien” → Viena (hub propriu) apare primul, apoi doar locuri europene; lista nu e tăiată

### 2026-11-10 20:35 — Header-ul nu mai stă deasupra ferestrelor modale (`App.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Header-ul avea `z-[1100]` (adăugat pentru meniul „Atenție”, scos între timp), așa că rămânea luminos, deasupra fundalului întunecat al ferestrelor modale (ex. „Submit Your Shipment & Offer Your Rate” la „Simulează ofertă nouă de la client”). S-a scos `z-[1100]`; acum fundalul modal acoperă și header-ul.
- **Fișiere:** `src/App.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · verificat în browser (Mod Luminos, fereastra „Simulează ofertă”)

### 2026-11-10 20:25 — Scos butonul „+ Comandă” din header (`App.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La cererea utilizatorului s-a scos butonul „+ Comandă” din bara de sus. Comenzile noi se creează în continuare din pagina „Comenzi & curse” (butonul „Comandă nouă”) și din „Comenzi în așteptare” din Planning.
- **Fișiere:** `src/App.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · verificat în browser

### 2026-11-10 20:15 — Scoase butoanele „Atenție” și „Istoric” din header (`App.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La cererea utilizatorului (header aglomerat) s-au scos din bara de sus butoanele „Atenție” și „Istoric”, adăugate anterior fără să fi fost cerute (eticheta „Atenție” era și invizibilă în Mod Luminos). Rămân în header: căutare, „Oferte”, „+ Comandă”, limbă, temă, deconectare. Înregistrarea modificărilor continuă în fundal (`bluetrans_audit_v1`), dar nu mai există buton pentru a o deschide; componentele `AttentionMenu` și `AuditLogModal` au rămas în cod.
- **Fișiere:** `src/App.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 20:05 — Plăcuță de înmatriculare românească (bandă UE „RO” + număr) în „Mașinile mele” (`EuroRoPlate.tsx`, `FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Numărul vehiculului din cardurile „Mașinile mele” și din rândurile vederii Listă apare acum ca plăcuță de înmatriculare românească (bandă albastră cu stea și „RO”, număr pe fond alb), în aceeași formă ca în Planning, Control Center și hartă. Componentă nouă reutilizabilă: `src/components/EuroRoPlate.tsx` (mărimi `lg` pentru carduri, `sm` pentru tabel).
- **Fișiere:** `src/components/EuroRoPlate.tsx`, `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · verificat în browser (carduri și listă, mod întunecat și luminos)

### 2026-11-10 19:55 — Poză realistă a modelului, în culoarea decodată din VIN, la fiecare vehicul (`FleetVinAndDossierModal.tsx`, `public/fleet/*.jpg`)
- **Autor:** Antigravity
- **Ce s-a făcut:** În „Mașinile mele” (carduri) și în Dosarul vehiculului, desenul generic de camion a fost înlocuit cu o imagine realistă a modelului, aleasă automat din VIN (`getFleetPhoto`): modelul decodat + culoarea decodată → imaginea potrivită. Imagini în `public/fleet/`: `scania-r-streamline-blue`, `scania-r-nextgen-blue`, `scania-s-nextgen-blue`, `volvo-fh-2013-silver`, `volvo-fh-2018-navy`, `volvo-fh-2025-blue`, `schmitz-reefer-white`, `krone-reefer-white` (imagini generate, 3/4 față-stânga, fundal de studio). Dacă pentru o combinație model + culoare nu există imagine (ex. un VIN nou introdus), rămâne randarea SVG în culoarea din VIN. Miniatura din card a fost mărită la 132×92 px.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`, `public/fleet/*.jpg`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · verificat în browser (Scania R/S, Volvo albastru / bleumarin / argintiu, Schmitz; Dosar vehicul)

### 2026-11-10 19:35 — Curățenie în antetele tuturor paginilor: mai puțin text, fără butoane dublate (`ControlCenterView`, `SmartGroupageView`, `ClientOffersView`, `OrdersAndTripsView`, `TrailerSwapView`, `DriverPortalView`, `TmsOperationsView`, `EuropeLiveMap`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La cererea utilizatorului (text care nu se mai termină, butoane și informații dublate) s-au scos din antetele paginilor etichetele-pastilă și paragrafele explicative, iar titlurile au fost scurtate: Control Center, Grupaje & disponibilități, Oferte clienți, Comenzi & curse, Schimburi de remorci, Clienți & contracte. În Control Center s-au scos cele 3 butoane care repetau meniul din stânga (Planning 7 Zile, Trailer Swap, Oferte Clienți), titlul lung „Trasee rutiere… Coridoare rutiere reale: M35 → …” de deasupra hărții și textul „Direcție planificată și descărcări pe traseu” repetat pe fiecare remorcă. În Portalul Șofer s-a scos doar paragraful explicativ. La „Comandă nouă” s-a scos „+” dublat (era și iconiță, și text). Nicio funcție nu a fost scoasă.
- **Fișiere:** `src/components/ControlCenterView.tsx`, `SmartGroupageView.tsx`, `ClientOffersView.tsx`, `OrdersAndTripsView.tsx`, `TrailerSwapView.tsx`, `DriverPortalView.tsx`, `TmsOperationsView.tsx`, `EuropeLiveMap.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · capturi verificate pe toate paginile (Control Center, Groupage, Swap, Portal Șofer, Oferte, Comenzi, Clienți)

### 2026-11-10 19:15 — Pagina Flotă pusă în ordine: scoase duplicatele, mai puțin text (`TmsOperationsView.tsx`, `FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La cererea utilizatorului (informații și butoane dublate, text prea mult):
  1. Scos din pagina Flotă tabelul „Fișa Tehnică a Flotei” (Norma Euro, VIN, culoare, kilometraj, ITP/RCA/ATP, senzori frigo, cu butoanele „Fișă Camion / Fișă Remorcă / Editează”): toate datele sunt în Dosarul vehiculului (click pe vehicul în „Mașinile mele”).
  2. Scos din pagina Flotă widgetul „Decodor serie șasiu (VIN)”: modelul și culoarea se iau deja automat din VIN în „Mașinile mele” și în Dosar.
  3. Antetul paginii: scos titlul lung și rândul de text; rămân doar cele 4 taburi cu nume scurte: Flotă · Șoferi & Tahograf · Clienți (N) · Facturare.
  4. Subtitlul „Mașinile mele” scurtat la o singură propoziție.
  Codul componentelor scoase a rămas în fișiere, nelegat de pagină.
- **Fișiere:** `src/components/TmsOperationsView.tsx`, `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · verificat în browser (pagina Flotă și Dosarul vehiculului se deschid, fără erori)

### 2026-11-10 19:05 — Scos panoul „Adaugă mașină” din pagina Flotă; „Mașinile mele” pe toată lățimea (`FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La cererea utilizatorului („toate mizeriile astea de aici”) s-a scos panoul „Adaugă mașină” (număr + serie VIN + „Verifică & Adaugă”), alături de cardul „Evidența flotei” scos anterior. „Mașinile mele” ocupă acum toată lățimea în ambele moduri (Carduri / Listă). Codul funcției de adăugare (`handleAddVehicleByPlateOrVin`) a rămas în fișier, nelegat de interfață.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · verificat în browser (vederea Listă pe toată lățimea, fără erori)

### 2026-11-10 18:55 — Scoasă cardul „Evidența flotei”; lizibilitate în Mod Luminos pentru elementele noi; CASCO „Activ” corect (`FleetVinAndDossierModal.tsx`, `AttentionMenu.tsx`, `OrderDecisionModal.tsx`, `index.css`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. La cererea utilizatorului s-a scos cardul „Evidența flotei” (sub „Adaugă mașină”).
  2. Comutatorul Carduri / Listă: eticheta „Listă” era alb pe alb în Mod Luminos; acum folosește același stil ca butonul „Compact” (vizibil în ambele moduri).
  3. Antetul tabelului din vederea Listă și caseta de avertisment din „Unde pun comanda?” au culori separate pentru Mod Luminos (clase în `index.css`).
  4. Meniul „Atenție” se închide la click în afara lui sau la Esc (overlay-ul fix nu acoperea pagina din cauza `backdrop-filter` pe header).
  5. **Bug CASCO:** polițele marcate „26.09.2023-Activ” erau tratate ca expirate („-1141 zile” roșu); acum arată „Activ” (verde), fiindcă data din text e începutul, nu sfârșitul.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`, `src/components/AttentionMenu.tsx`, `src/components/OrderDecisionModal.tsx`, `src/index.css`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · capturi în Mod Luminos verificate (listă, modal, istoric, meniu Atenție)

### 2026-11-10 18:45 — „Mașinile mele”: comutator Carduri / Listă (tabel clasic stil macOS Tahoe) cu rânduri pe pagină selectabile și total (`FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** În toolbar-ul „Mașinile mele” s-a adăugat comutatorul **Carduri | Listă** (alegerea se păstrează după refresh). Vederea **Listă** este un tabel în stil Finder / macOS Tahoe: antet fix cu blur, rânduri de 48 px cu fundal alternativ, hover albastru discret, cifre tabulare, coloană `#` cu numărul rândului, coloane sortabile (Număr, Tip, An, RCA, CASCO, CMR) cu săgeți ▲▼, chip-uri colorate RCA / CASCO / CMR / Leasing (click deschide detaliile poliței), click pe rând deschide fișa vehiculului. Subsol: **Rânduri pe pagină** (10 / 25 / 50 / Toate), **„1–10 din 39”** (cu totalul flotei când sunt filtre) și navigare ‹ ›. În modul Listă tabelul ocupă toată lățimea, iar „Adaugă mașină” și „Evidența flotei” trec dedesubt. Vederea Carduri e neschimbată.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · test în browser (headless): comutator, 10 rânduri pe pagină, „1–10 din 39”, sortare după RCA — fără erori

### 2026-11-10 18:30 — „Atenție” (alerte în aplicație), Istoric modificări, oferte acceptate în calendar, disponibilitate 1/3/7 zile cu stări (`attention.ts`, `AttentionMenu.tsx`, `AuditLogModal.tsx`, `App.tsx`, `Planning7DaysView.tsx`, `SmartGroupageView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Buton „Atenție” în header:** listă scurtă (max 8) cu ce cere o decizie, cele mai grave primele: comenzi care nu încap nicăieri, oferte în așteptare (cu conflict de capacitate), șoferi cu mai puțin de 2 h de condus, remorci cu ≥ 4 LDM liberi. Click pe un rând duce la pagina unde se rezolvă. Sunt alerte în aplicație, nu notificări push.
  2. **Buton „Istoric” în header:** înregistrează cine, ce și când (comenzi alocate, oferte acceptate / contraofertate / refuzate / primite, schimburi de remorci, grupaje acceptate). Salvat în `localStorage` (`bluetrans_audit_v1`), ultimele 200.
  3. **Oferta acceptată apare ca card violet în calendarul Planning** (înainte se actualiza doar LDM).
  4. **Disponibilități viitoare:** filtru 1 / 3 / 7 zile și etichete de stare Confirmat / Estimat / Simulat (derivate din starea existentă a sloturilor: grupaj parțial → Confirmat, liberă după descărcare → Estimat, eliberată prin swap → Simulat).
  5. Header-ul are `z-[1100]` ca meniul „Atenție” să stea deasupra conținutului.
- **Fișiere:** `src/data/attention.ts`, `src/components/AttentionMenu.tsx`, `src/components/AuditLogModal.tsx`, `src/App.tsx`, `src/components/Planning7DaysView.tsx`, `src/components/SmartGroupageView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · test în browser (headless): meniul Atenție, acceptare ofertă → card în calendar, Istoric cu intrare, filtru 1 zi la disponibilitate — fără erori

### 2026-11-10 18:15 — Planning: „Unde o pun?” cu recomandare și simulare A/B/C, alocare pe segmentele corecte, comandă demo Viena→Köln (`ldmEngine.ts`, `OrderDecisionModal.tsx`, `Planning7DaysView.tsx`, `App.tsx`, `mockData.ts`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Motor LDM (`src/data/ldmEngine.ts`, funcții pure):** verifică pe fiecare segment al traseului comenzii LDM total, LDM în zona termică potrivită, greutate; Soft-Lock-ul unei oferte în așteptare dă doar avertisment, nu blochează.
  2. **Fereastra „Unde pun comanda?” (`OrderDecisionModal.tsx`):** buton „Unde o pun?” pe fiecare comandă în așteptare; arată până la 3 variante (A/B/C) cu „Recomandat”, capacitate înainte → după pe segmente, venit − cost = câștig estimat și motivele pentru remorcile care nu merg. Simularea nu modifică planul; doar „Confirmă” îl modifică (adaugă card în calendar + actualizează LDM).
  3. **Rând de recomandare** pe fiecare comandă din „Comenzi în așteptare” (ex. „✓ Încape pe BH 67 STS”).
  4. **Corecturi:** drag & drop din calendar alege acum cea mai bună remorcă (înainte punea mereu pe prima) și refuză cu motiv dacă nu încape nicăieri; alocarea (`handleAssignOrderToTrailer`) pune LDM pe segmentele traseului comenzii (înainte: ultimele 2); acceptarea unei oferte folosește traseul ofertei (înainte: segmente cu Viena/Köln scrise fix).
  5. **Comandă demo `CMD-950`** (3 LDM, Viena → Köln, +4°C) conform scenariului obligatoriu din brief.
- **Fișiere:** `src/data/ldmEngine.ts`, `src/components/OrderDecisionModal.tsx`, `src/components/Planning7DaysView.tsx`, `src/App.tsx`, `src/data/mockData.ts`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · test în browser (headless): fereastra se deschide, „Confirmă” adaugă comanda și arată mesajul; acceptarea unei oferte rulează fără erori

### 2026-11-10 18:10 — Logo original Blue Trans Spedition (întreg, cu text) în sidebar, header mobil și login (`App.tsx`, `LoginView.tsx`, `public/bts-logo.svg`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Logo-ul original `bts_logo_sv.svg` de pe bluetranspedition.com (camion + „BLUE TRANS SPEDITION”) este pus întreg, pe card alb, în locul iconiței camion. Desenul nu e modificat, doar `viewBox`-ul e tăiat pe conținut (fără spațiul alb din jur). În sidebar apare logo-ul + „TMS”.
- **Fișiere:** `public/bts-logo.svg`, `src/App.tsx`, `src/components/LoginView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde · verificat vizual pe ecranul de login

### 2026-11-10 18:05 — Scoase definitiv liniile albastre întrerupte (curenți de vânt) de pe hartă (`EuropeLiveMap.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Liniile întrerupte (`windStreams`) au fost repuse anterior din greșeală, fără cerere; acum sunt scoase complet. Rămân pe stratul de vreme doar pastilele cu iconiță + temperatură și zonele de ploaie. Nu s-a adăugat nicio vizualizare nouă de vânt.
- **Fișiere:** `src/components/EuropeLiveMap.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 18:00 — Carduri colorate RCA/CASCO/CMR/Leasing cu 50% mai mici (`FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La alegerea utilizatorului, blocul de 4 carduri a fost redus la jumătate: lățime 470px → 235px, înălțime 82px → 44px, fonturi reduse proporțional (zile pe un singur rând cu „zile”).
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 17:55 — Scoase informațiile duplicate din rândurile „Mașinile mele” (`FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** În stânga rândului s-au scos textele care se repetau cu cardurile colorate: `· RCA: <asigurător>`, firma de leasing și `(SCANDEXPRES)` / `(BLUE TRANS SPEDITION)` din numele modelului (firma rămâne o singură dată, ca pastilă). Rămân doar cardurile colorate `RCA | CASCO | CMR | Leasing`.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 17:50 — Scoasă pagina duplicat „Urmărire Live” + restul flotei reale pe hartă (poziții de test) (`App.tsx`, `EuropeLiveMap.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La confirmarea utilizatorului, pagina „Urmărire Live” (identică cu harta din Control Center) a fost scoasă din meniu și din randare; o sesiune salvată pe `live-tracking` se mută automat pe `control`. Pe hartă s-au adăugat cele 13 capete tractor reale care nu erau în curse (`BH 50 STS`, `IF 74 STS`, `BH 49 STS`, `BH 12 STS`, `BH 30 STS`, `BH 72 STS`, `BH 81 STS`, `BH 07 XTS`, `IF 12 STS`, `IF 20 STS`, `IF 30 BTS`, `BH 41 STS`, `B 166 STS`) cu poziții de TEST (`MOCK_FLEET_POSITIONS`), până la conectarea GPS-ului real.
- **Fișiere:** `src/App.tsx`, `src/components/EuropeLiveMap.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 17:45 — Scos logo-ul (revenit iconița camion) + Vremea rămâne ON după pornire (`App.tsx`, `LoginView.tsx`, `EuropeLiveMap.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** La cererea utilizatorului s-a scos logo-ul adăugat anterior (sidebar, header mobil, login) și fișierul `public/bts-logo.svg`; a revenit iconița camion. Comutatorul de vreme de pe hartă își păstrează starea (`bluetrans_map_weather_on_v1`), deci dacă e ON rămâne ON.
- **Fișiere:** `src/App.tsx`, `src/components/LoginView.tsx`, `src/components/EuropeLiveMap.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 17:40 — Logo real Blue Trans Spedition (de pe bluetranspedition.com) în sidebar, header mobil și login
- **Autor:** Antigravity
- **Ce s-a făcut:** Descărcat `bts_logo_sv.svg` de pe site, salvat ca `public/bts-logo.svg` și folosit (camionul albastru, pe fundal alb) în locul iconiței generice `Truck` în sidebar, header mobil și ecranul de login.
- **Fișiere:** `public/bts-logo.svg`, `src/App.tsx`, `src/components/LoginView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 17:35 — La refresh rămâne pe aceeași secțiune din Flotă (`TmsOperationsView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Secțiunea activă din pagina Flotă (Flotă / Tahograf / Facturare) se salvează în `localStorage` (`bluetrans_tms_section_v1`) și se restaurează la refresh. Tab-ul principal era deja salvat în `App.tsx`.
- **Fișiere:** `src/components/TmsOperationsView.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · audit verde

### 2026-11-10 17:31 — Eliminat etoll.ro / ROV / ITP / Licență din „Mașinile mele”; înlocuite cu RCA · CASCO · CMR · Leasing reale din Google Sheet (`FleetVinAndDossierModal.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:** Scos `ROV etoll.ro`, `ITP`, `Licență`, butonul `+ PLĂTEȘTE / PRELUNGEȘTE`, cardul `Notificări RAR & e-Toll` și popup-ul etoll. Rândurile au acum 4 căsuțe: `RCA | CASCO | CMR | Leasing`, cu zilele rămase calculate din datele reale (poliță, perioadă, firmă, contract). Popup-ul arată compania, nr. poliță/contract și perioada. Cheia localStorage a fost mutată pe `bluetrans_masinile_mele_v4`.
- **Fișiere:** `src/components/FleetVinAndDossierModal.tsx`
- **Ramură / Commit:** `main` (fără commit)
- **Build / Teste:** `tsc -b` OK · `run_prepush_audit.py` 21/21 — 🟢 VERDE

### 2026-11-10 16:59 — Înlocuire Completă Flotă cu cele 39 Vehicule Reale din Google Sheet (`BLUE TRANS SPEDITION` & `SCANDEXPRES`) + Decodare Automată Model & Culoare OEM din Serie VIN + Eliminare Dubluri Segmente în Detalii Cursă (`Planning7DaysView.tsx`, `FleetVinAndDossierModal.tsx`, `mockData.ts`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Înlocuirea tuturor vehiculelor fictive (mock) din întreaga aplicație cu flota 100% reală din Google Sheet (`BLUE TRANS SPEDITION` — 17 capete tractor + 16 semiremorci și `SCANDEXPRES` — 3 capete tractor + 3 semiremorci = 39 vehicule reale)**:
     - Ansamblurile active în toată aplicația sunt acum: `BH 46 STS + BH 67 STS`, `BH 56 STS + BH 69 STS`, `IF 96 STS + BH 75 STS`, `B 506 STS + BH 74 STS`, `B 507 STS + BH 91 STS`, `B 560 STS + BH 23 STS` și `B 871 STS + BH 31 STS`.
     - În [`src/components/FleetVinAndDossierModal.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/FleetVinAndDossierModal.tsx), `KNOWN_VIN_CATALOG` și `INITIAL_MASINILE_MELE` conțin toate cele **39 serii VIN reale** (`YS2S4X200S5783001` ... `WSM00000003243505`), polițele reale RCA (`Alliantz`, `GRAWE`, `HD INSURANCE PLC NICOSIA`, `GENERALI`, `OMNIASIG`, `AXERIA`, `INTERAMERICAN`, `EASY`), CASCO (`GROUPAMA`, `OMNIASIG`, `FLEXICASCO`, `LUTZ`), CMR (`LUTZ W17 3531 12` / `W17 5657 12`) și contractele de credit/leasing (`SCANIA CREDIT`, `VFS INT ROMANIA IFN`, `BT LEASING`, `BCR LEASING`, `UNICREDIT LEASING`).
  2. **Decodare automată Model & Culoare OEM direct din numărul VIN**:
     - Orice modificare a seriei VIN actualizează automat marca, modelul, anul fabricației și culoarea caroseriei OEM fără selector manual de culoare.
  3. **Eliminarea cardurilor de segmente dublate din fereastra „Detalii Cursă” ([`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx))**:
     - S-a eliminat al doilea rând de carduri (`Oradea → Budapesta`, `Budapesta → Viena`, `Viena → Köln`, `Köln → Rotterdam`) de sub `<EuropeLiveMap singleTripMode />`, păstrând un singur card curat de traseu + harta rutieră live.
- **Fișiere:**
  - `src/data/mockData.ts`
  - `src/components/FleetVinAndDossierModal.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `src/components/EuropeLiveMap.tsx`
  - `src/data/highwayGeometries.ts`
  - `src/components/TmsOperationsView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/DriverPortalView.tsx`
  - `src/components/LoginView.tsx`
  - `src/components/AnalysisAndScenariosView.tsx`
  - `src/i18n/i18n.tsx`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.08s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 15:12 — Modulul „Mașinile mele” (`ITP / ROV / RCA / Licență`) cu Randări 3/4 Camion & Semiremorcă Schmitz + Fereastră Verificare RAR & Adăugare Mașină (`FleetVinAndDossierModal.tsx`, `TmsOperationsView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Interfața „Mașinile mele” în pagina de Flotă ([`src/components/FleetVinAndDossierModal.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/FleetVinAndDossierModal.tsx), [`src/components/TmsOperationsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/TmsOperationsView.tsx))**:
     - Fiecare camion (`IF 96 STS`, `BH 50 STS`, `BH 56 STS`, `IF 74 STS`, `BH 101 BTS`, `BH 104 BTS`, `BH 108 BTS`, `BH 112 BTS`, `BH 119 BTS`) și semiremorcă frigorifică (`BH 59 STS`, `BH 61 STS`, `BH 75 STS`, `BH 67 STS`, `BH 71 STS`, `BH 82 BTS`, `BH 91 BTS`) este afișat cu **randare studio 3/4** (cap tractor în culoarea reală / semiremorcă albă Schmitz Cargobull / Krone cu agregat frigo), anul fabricației, seria VIN și blocul cu cele 4 rubrici colorate: **`ITP` | `ROV` (`etoll.ro` / `Semiremorcă`) | `RCA` | `Licență`**.
  2. **Fereastră modală interactivă pentru `ITP`, `ROV`, `RCA` și `Licență`**:
     - Click pe oricare din cele 4 căsuțe (`ITP`, `ROV`, `RCA`, `Licență`) deschide fereastra cu **zilele rămase** (ex. `136 zile rămase`), data expirării (`Expiră pe 25.03.2027` + buton `+ Prelungește 1 An`), butonul **`Găsește o stație ITP / Reînnoiește`** și butonul **`Setări mașină`** (care deschide Dosarul Tehnic Complet & VIN).
  3. **Panou lateral „Adaugă mașină” după număr de înmatriculare și serie VIN**:
     - Permite introducerea numărului (`RO | Număr`) și a seriei VIN, decodând automat marca, modelul și culoarea și adăugând vehiculul în lista „Mașinile mele”.
- **Fișiere:**
  - `src/components/FleetVinAndDossierModal.tsx`
  - `src/components/TmsOperationsView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.39s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 15:02 — Eliminare Texte Suprapuse pe Hartă & Carduri + Iconițe Vreme cu Toggle Switch + Full Screen 100% prin Portal & Card Traseu Dedesubt în Detalii Cursă (`EuropeLiveMap.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminare completă texte suprapuse (`Toate Cursele (7)`, `TR-4821` și Hartă) în [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx)**:
     - S-a eliminat textul `{rDef.totalTechKm} km` din butoanele înguste ale cardului `Toate Cursele (7)` care se suprapunea peste numerele de înmatriculare (`BH 67 STS`).
     - În cardul de traseu (`TR-4821`), la fiecare oraș (`Oradea`, `Budapesta`, `Viena`, `Köln`, `Rotterdam`) s-a eliminat textul lung de vreme (`Parțial noros`, `Ploaie ușoară`, `Vânt de coastă`) care tăia kilometrii din stânga, păstrând **doar iconița Apple Weather + temperatura (`☀️ +11°`, `🌤️ +10°`, `🌧️ +7°`, `💨 +8°`)** lângă `LDM`.
     - S-a eliminat tile-layer-ul extern `tilecache.rainviewer.com` (care afișa tile-uri gri cu `"Zoom Level Not Supported"`) și textele lungi de pe fronturile meteo de pe hartă, înlocuindu-le cu pastile compacte `inline-flex width:max-content` doar cu iconița meteo SVG + temperatura.
  2. **Iconițe de Vreme cu Toggle Switch pe Hartă (`renderMapControlsBar`)**:
     - În colțul din dreapta-sus al hărții, butonul lung de text `"Vreme (Ploi & Vânt): ON"` și bara mare de legendă au fost înlocuite cu un **buton compact cu iconițele meteo (`🌧️` + `💨`) și un comutator vizual (toggle switch iOS)**.
  3. **Full Screen 100% real (`createPortal` în `document.body`) doar cu Harta și Traseul + Card Traseu Dedesubt în Detalii Cursă (`singleTripMode`) + Blocare Zoom Accidental**:
     - La click pe **Full Screen**, harta se deschide prin `createPortal(..., document.body)` pe tot ecranul (`100vw × 100vh`), fără să mai fie tăiată de fereastra modală și fără carduri laterale — afișând 100% doar harta și traseul.
     - În fereastra **Detalii Cursă (`singleTripMode`)**, cardul de traseu este poziționat **dedesubtul hărții (`flex-col`)**, lăsând harta pe toată lățimea.
     - Zoom-ul accidental din scroll / trackpad este strict oprit (`scrollWheelZoom: false`, `doubleClickZoom: false`).
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.03s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 14:02 — Dosar Tehnic Complet Camion & Semiremorcă + Decodor VIN cu Randare Studio Model & Culoare OEM + Eliminare Tab Teoretic „Analiză & Scenarii” (`FleetVinAndDossierModal.tsx`, `TmsOperationsView.tsx`, `App.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminat tab-ul teoretic „Analiză & Scenarii” din meniul aplicației ([`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - S-a scos complet din bara laterală și din meniul mobil pagina de text teoretic/documentație (`AnalysisAndScenariosView`), redirecționând automat sesiunea spre modulul operațional **Flotă, Șoferi & Facturi**.
  2. **Dosar Tehnic Complet pe fiecare Camion și Semiremorcă ([`src/components/FleetVinAndDossierModal.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/FleetVinAndDossierModal.tsx), [`src/components/TmsOperationsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/TmsOperationsView.tsx))**:
     - Click pe **orice rând** din tabelul Flotei (sau direct pe plăcuța de înmatriculare a **Capului Tractor** `BH 101 BTS` / **Semiremorcii** `BH 67 STS`, ori pe butoanele dedicate **`Fișă Camion`** și **`Fișă Remorcă`**) deschide acum **Dosarul Tehnic Complet (`VehicleDossierModal`)** împărțit pe 4 tab-uri:
       - `1. Fișa Cap Tractor` (VIN, culoare OEM, motorizare, cutie viteze, kilometraj CAN-Bus, revizie, consum)
       - `2. Fișa Semiremorcă Frigo` (VIN remorcă Schmitz/Krone, agregat Thermo King/Carrier, temperaturi Zona 1/Zona 2, axe/frâne, certificat ATP)
       - `3. Ansamblu Cuplat (16.5m), Anvelope & Acte` (vedere ansamblu complet cuplat, TPMS presiune anvelope pe punți, ITP/RCA/CMR/Tahograf)
       - `4. Editează Fișa, VIN & Culoarea`
  3. **Decodor Serie Șasiu (VIN ISO 3779) cu Afișarea Imaginii Modelului și a Culorii OEM (`VinLookupWidget` + `VehicleStudioRender`)**:
     - Căutarea după **VIN (17 caractere)** identifică automat producătorul, modelul (`Volvo FH 500`, `Scania R500`, `Mercedes Actros L 1848`, `DAF XG 480`, `Volvo FH 540`, `Schmitz S.KO Cool`, `Krone Cool Liner`, `Mercedes Sprinter 319`, `MAN TGL`), anul, uzina și **afișează randarea studio a modelului în culoarea exactă a camionului** (cu selector interactiv de culori OEM).
- **Fișiere:**
  - `src/components/FleetVinAndDossierModal.tsx`
  - `src/components/TmsOperationsView.tsx`
  - `src/App.tsx`
  - `src/i18n/i18n.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.28s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:35 — Suport Multi-Limbă Complet (`🇷🇴 RO | 🇬🇧 EN | 🇫🇷 FR | 🇩🇪 DE`) cu Selector cu Steaguri în Header și Terminologie Profesională TMS / Transport Frigorific (`i18n.tsx`, `App.tsx`, `LoginView.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Comutator de limbă cu steaguri în bara de sus (`🇷🇴 RO | 🇬🇧 EN | 🇫🇷 FR | 🇩🇪 DE`) pe toate ecranele ([`src/i18n/i18n.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/i18n/i18n.tsx), [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx), [`src/components/LoginView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/LoginView.tsx))**:
     - Adăugat `<LanguageToggleBar />` în bara superioară a aplicației (lângă comutatorul de temă) și pe ecranul de autentificare (`LoginView`), cu persistență în `localStorage` (`bluetrans_tms_lang`).
  2. **Traducere profesională de expediții rutiere și lanț frigorific în Engleză, Franceză și Germană (`RAW_DICTIONARY` + `WORD_REPLACEMENTS` + `MutationObserver`)**:
     - Traduce instantaneu și reversibil toate meniurile, KPI-urile, harta live (inclusiv radarul meteo AccuWeather și ferestrele de tranzit), Planning 7 Zile, motorul Smart Groupage (8 criterii), Smart Trailer Swap (4 scenarii), Portalul Șoferului, Ofertele Clienți (Soft-Lock), Comenzile & CMR/Facturile, Fișa Tehnică a Flotei și Scenariile de Analiză folosind terminologie autentică de transport internațional (*Loading Meters / Mètres de plancher / Lademeter*, *Tractor Unit / Tracteur routier / Sattelzugmaschine*, *Semi-Trailer / Semi-remorque / Sattelauflieger*, *Driver CPC / FIMO-FCO / Schlüsselzahl 95*, *Consignment Note CMR / Lettre de voiture CMR / CMR-Frachtbrief* etc.).
- **Fișiere:**
  - `src/i18n/i18n.tsx`
  - `src/App.tsx`
  - `src/components/LoginView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.04s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:22 — Radar Meteo Stil AccuWeather (`Vreme: ON / OFF`) pe Hartă cu Fronturi de Ploaie, Lapoviță și Curenți de Vânt Animați (`EuropeLiveMap`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Buton `Vreme (Ploi & Vânt): ON / OFF` direct pe hartă + activare automată la intrarea în Full Screen ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx), [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css))**:
     - Când activezi `Vreme: ON` (sau intri în **Full Screen**), pe hartă se suprapun:
       - **Radarul global de precipitații RainViewer** + **fronturile sinoptice AccuWeather** de ploaie (`A3/A61`, `Marea Nordului A1/A12`), vânt de pod (`Øresund E20`) și lapoviță/ninsoare (`Suedia E4`).
       - **Curenții de vânt animați** (`.accuweather-wind-stream`) cu direcția și viteza rafalelor în `km/h` + legenda radar AccuWeather în colțul din dreapta-sus.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `src/index.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `6.78s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:18 — Adăugare Distanțe Tehnice (`km`) pe Traseu & Segmente + Prognoză Meteo cu Iconițe Stil Apple Weather (`EuropeLiveMap`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Distanțe tehnice în km (total coridor, km parcurși, km rămași și km pe fiecare oprire) + Perioada de Tranzit ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**:
     - Fiecare cursă afișează acum caseta tehnică cu distanța totală HGV (`1.580 km`, `1.460 km` etc.), kilometrii parcurși, kilometrii rămași cu durata de conducere estimată și perioada de tranzit (`9 Noi 05:00 → 10 Noi 16:30`), plus kilometrajul tehnic pe fiecare oprire (`0 km (Start)`, `490 km (+490 km)`, `880 km (+390 km)`, `1.460 km (+580 km)`).
  2. **Prognoză Meteo pe Coridor pentru Perioada de Tranzit cu Iconițe Stil Apple Weather (`renderAppleWeatherIcon`)**:
     - Pe fiecare punct de tranzit se afișează vremea estimată în fereastra orară în care ajunge camionul, cu iconițe colorate stil Apple Weather (Soare ☀️, Parțial noros ⛅, Ploaie 🌧️, Vânt de pod 🌬️, Lapoviță/Ninsoare ❄️), temperatura exterioară (`+11°C`, `+7°C`, `+4°C`, `+1°C`) și starea drumului (`Senin · Uscat`, `Ploaie ușoară`, `Vânt 42 km/h`, `Lapoviță · E4`).
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.61s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:12 — Afișare Unul Sub Altul (`Stacked`) în Full Screen pentru Cele Două Carduri din Dreapta Hărții (`EuropeLiveMap`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Stivuire verticală (`unul sub altul`) în modul Full Screen ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**:
     - Când deschizi harta în **Full Screen**, cardul cu lista de curse (`Toate Cursele (7)`) și cardul cu detaliile cursei selectate (`TR-4821`) se așază acum **unul sub altul** într-o singură coloană pe dreapta (`xl:w-[330px]`), eliminând spațiile goale și lăsând harta Full Screen mult mai lată și mai clară.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.82s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:10 — Înălțime Identică (`xl:h-[452px]`) pentru Toate Cele 3 Carduri din Modulul Hărții (`EuropeLiveMap`) + `ResizeObserver`
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Egalizarea înălțimii tuturor celor 3 carduri alăturate din modulul hărții ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**:
     - Harta din stânga, cardul vertical cu lista de curse din mijloc (`Toate Cursele (7)`) și cardul de detalii cursă din dreapta (`TR-4821`) au acum **exact aceeași înălțime (`xl:h-[452px]`)**, aliniate la milimetru atât sus cât și jos.
     - S-a adăugat `ResizeObserver` pe containerul Leaflet pentru redimensionarea automată a hărții și contrast ridicat pe eticheta din stânga-jos în Light Mode.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.41s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:07 — Mutare Coloană Verticală Curse în Partea Dreaptă, Imediat După Hartă (`EuropeLiveMap`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Mutarea coloanei verticale de curse în dreapta hărții ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**:
     - Ordinea este acum: **Harta Rutieră Interactivă** în stânga, urmată în dreapta de **Coloana Verticală de Curse (`Toate Cursele (7)` + cele 7 ansambluri)** și **Panoul de Detalii ale Cursei Selectate**.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.31s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:05 — Afișare Verticală a Listei de Curse în Stânga Hărții (`EuropeLiveMap`) pentru Eliminarea Tăierii Orizontale
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Coloană verticală dedicată pentru selecția curselor în stânga hărții ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**:
     - S-a mutat bara de selecție a curselor (`Toate Cursele (7)` + cele 7 ansambluri cu plăcuțe Euro-RO și `LDM`) dintr-un rând orizontal care tăia ultimul camion în dreapta într-o **coloană verticală ordonată în stânga hărții** (`w-full xl:w-[274px]`), astfel încât toate cursele și numerele de înmatriculare să fie 100% vizibile pe verticală alături de hartă și de panoul de detalii din dreapta.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.42s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:03 — Oprire Zoom Accidental pe Hartă la Scroll: Activare Zoom din Mouse / Trackpad Doar După Click pe Hartă (`EuropeLiveMap`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Dezactivare implicită `scrollWheelZoom: false` și activare exclusiv la click pe hartă ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**:
     - Când derulezi pagina cu rotița mouse-ului sau din trackpad, harta nu mai interceptează accidental scroll-ul.
     - Când dai **click pe hartă** (`onMouseDown` / `map.on('click')`), zoom-ul din mouse / trackpad devine activ (`● Zoom mouse / trackpad activ`), iar când scoți cursorul în afara hărții (`onMouseLeave`), se blochează automat la loc pentru a nu încurca derularea paginii.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.73s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 13:01 — Afișare Hartă Rutieră Interactivă la Deschiderea Oricărei Curse în Modalul de Detalii (`Planning7DaysView` + `EuropeLiveMap`) & Curățare Coloană Calendar
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Hartă rutieră interactivă (`EuropeLiveMap` în mod `singleTripMode`) integrată direct în modalul „DETALII COMPLETE PARTIDĂ MARFĂ & CURSĂ” ([`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx), [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**:
     - Când deschizi orice cursă / card din calendarul **Planning 7 Zile**, în secțiunea **„TRASEUL COMPLET AL CURSEI & HARTA RUTIERĂ LIVE”** se încarcă automat harta interactivă cu traseul rutier complet al acelui ansamblu (`Oradea → Budapesta → Viena → Köln → Rotterdam` etc.), centrată automat pe coridorul cursei, cu punctele de oprire + steaguri de țară, poziția GPS live a camionului și controalele `+`, `−` și `Full Screen`.
     - Dacă schimbi ansamblul din selectorul rapid („Ansamblu Cap Tractor + Remorcă”), harta se actualizează instant pe noul traseu.
  2. **Eliminare fundal roșu și etichetă `VÂRF EXPORT` de pe coloana Miercuri (`MIE 11`) în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)**:
     - Coloana `MIE 11` are acum același aspect curat și uniform ca restul zilelor din calendar.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.96s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:54 — Eliminare Dubluri Butoane Zoom & Full Screen: Păstrată O Singură Bară de Control Direct pe Hartă (`+`, `−`, `Full Screen`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminarea butoanelor duplicate din antetul cardului și a controlului nativ Leaflet din stânga-sus ([`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx), [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css))**:
     - S-au scos butoanele duplicate `Zoom +`, `Zoom −`, `Vedere Europa` și `Full Screen` din antetul de deasupra hărții.
     - S-a dezactivat controlul nativ Leaflet din stânga-sus (`zoomControl: false` + `.leaflet-control-zoom { display: none !important; }`).
     - A rămas **un singur set de butoane direct pe hartă** (în colțul din dreapta-sus al hărții): **`+`**, **`−`** și **`Full Screen`**.
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `src/index.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.13s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:50 — Afișare Steag Țară + Cod Țară (`(🇷🇴 RO)`, `(🇭🇺 HU)`, `(🇦🇹 AT)`, `(🇩🇪 DE)`, `(🇳🇱 NL)`, `(🇸🇪 SE)`, `(🇩🇰 DK)`) peste tot în Aplicație
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Steagul Țării alături de Codul de Țară (`formatCountryBadge`) în toate modulele ([`src/data/mockData.ts`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/data/mockData.ts), [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx), [`src/components/OrdersAndTripsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/OrdersAndTripsView.tsx), [`src/components/SmartGroupageView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/SmartGroupageView.tsx), [`src/components/DriverPortalView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/DriverPortalView.tsx), [`src/components/ClientDropdownSelect.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/ClientDropdownSelect.tsx), [`src/components/GoogleMapsAddressInput.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/GoogleMapsAddressInput.tsx), [`src/components/TmsOperationsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/TmsOperationsView.tsx))**:
     - Peste tot unde apare țara în paranteze sau în badge-uri se afișează acum steagul + codul țării: ex. `Szolnok (🇭🇺 HU)`, `München (🇩🇪 DE)`, `Frankfurt (🇩🇪 DE)`, `Almere (🇳🇱 NL)`, `Oradea (🇷🇴 RO)`, `Viena (🇦🇹 AT)`, `Stockholm (🇸🇪 SE)`, `Kolding (🇩🇰 DK)`.
     - De asemenea, în cardul lateral al hărții (`EuropeLiveMap.tsx`) s-a înlocuit dublarea numărului de cap tractor sub plăcuță cu modelul tractorului (`Scania R500 · Șofer: Mureșan Dan`).
- **Fișiere:**
  - `src/data/mockData.ts`
  - `src/components/EuropeLiveMap.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/SmartGroupageView.tsx`
  - `src/components/DriverPortalView.tsx`
  - `src/components/ClientDropdownSelect.tsx`
  - `src/components/GoogleMapsAddressInput.tsx`
  - `src/components/TmsOperationsView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.51s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:40 — Fix Contrast Text Negru pe Plăcuțele de Înmatriculare Euro-RO când Butonul este Selectat (`bg-[#0A84FF]`) în Light Mode
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Protecție CSS pentru Plăcuțele de Înmatriculare Euro-RO (`.euro-ro-plate-num`, `.euro-ro-plate-star`) în [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css) și toate componentele cu plăcuțe**:
     - Regula globală `[data-theme="light"] .bg-[#0A84FF] * { color: #ffffff !important; }` suprascria textul negru (`#0f172a`) din interiorul plăcuței albe atunci când butonul vehiculului era selectat.
     - S-a adăugat clasa dedicată `.euro-ro-plate-num` cu `background-color: #ffffff !important; color: #0f172a !important;` (și `.euro-ro-plate-star` cu `color: #ffcc00 !important;`) astfel încât numărul de înmatriculare rămâne negru intens și perfect vizibil și când butonul este selectat pe albastru.
- **Fișiere:**
  - `src/index.css`
  - `src/components/EuropeLiveMap.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `src/components/ControlCenterView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/TmsOperationsView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.00s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:36 — Butoane Full Screen + Zoom In (`+`) & Zoom Out (`−`) pentru Harta Live (`EuropeLiveMap.tsx`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Mod Full Screen & Butoane `Zoom +`, `Zoom −`, `Vedere Europa` și `Full Screen` în [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx)**:
     - Adăugate butoane explicite **`Zoom +`**, **`Zoom −`**, **`Vedere Europa`** și **`Full Screen` / `Ieșire Full Screen`** atât în bara de sus a hărții, cât și direct în colțul din dreapta-sus al hărții.
     - La activarea **Full Screen**, harta se extinde pe tot ecranul (`fixed inset-0 z-[9999]`), recalculează automat dimensiunea Leaflet (`map.invalidateSize()`) și blochează scroll-ul paginii din spate (cu suport pentru tasta `Escape`).
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.94s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:33 — Egalizare Înălțime Header Sidebar ↔ Header Principal (`h-[64px]`) și Eliminare Buline/Badge-uri `LIVE` și Titlu Duplicat în Header
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminare buline roșu-galben-verde și badge `LIVE` de deasupra logo-ului `BLUE TRANS TMS` ([`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - S-a șters rândul cu cele 3 buline și pastila `LIVE` de deasupra logo-ului din sidebar.
  2. **Egalizare la pixel a liniei de separare dintre Sidebar și Headerul de sus (`h-[64px]`) + Eliminare titlu și `Live` duplicat în `<header>` ([`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - Atât antetul logo-ului din sidebar, cât și `<header>`-ul din dreapta au acum exact **`h-[64px]`**, astfel încât linia orizontală este continuă; din `<header>` pe desktop s-au eliminat titlul secțiunii și pastila `Live` duplicate.
- **Fișiere:**
  - `src/App.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.19s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:30 — Uniformizare Dimensiuni Carduri în Calendarul Planning 7 Zile (`h-[196px]` Fix și Rânduri Interne Aliniate)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Dimensiuni 100% Identice pentru Toate Cardurile din Calendar ([`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx))**:
     - Fiecare card din calendar are acum înălțime fixă **`h-[196px] w-full`** și rânduri interne cu înălțimi fixe (`h-[36px]` antet client, `h-[26px]` descriere marfă, `h-[20px]` badge-uri `LDM` + `T`, `h-[16px]` rută, `h-[16px]` distanță km + temperatură pe un singur rând fără împărțire pe 2 linii, `h-[17px]` ambele plăcuțe Euro-RO pe un singur rând și `h-[18px]` șofer).
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.40s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:27 — Plăcuțe de Înmatriculare Euro-RO (`[★ RO | Cap Tractor] + [★ RO | Remorcă]`) și Unitate Explicită `LDM` pe Harta Live, Control Center și Tabelul de Comenzi
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Plăcuțe de Înmatriculare Euro-România (`[★ RO | BH 101 BTS] + [★ RO | BH 67 STS]`) și Unitate Explicită `LDM` în [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx)**:
     - Bara de filtre de deasupra hărții (`Toate Cursele (7) | ...`), cardul lateral de rută/checkpoint-uri și markerul GPS de pe hartă afișează acum plăcuțele autentice de înmatriculare Euro-RO pentru **Cap Tractor + Semiremorcă** (`[★ RO | BH 101 BTS] + [★ RO | BH 67 STS]`) și spațiul liber cu unitate explicită **`5.4 LDM`** (în loc de `5.4m`).
  2. **Plăcuțe Euro-RO în [`src/components/ControlCenterView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/ControlCenterView.tsx) și [`src/components/OrdersAndTripsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/OrdersAndTripsView.tsx)**:
     - Cardurile „Remorci active, trasee și LDM liberi” din Control Center și coloana „Remorcă Alocată” din tabelul de comenzi afișează de asemenea ambele plăcuțe Euro-RO (`Cap Tractor + Semiremorcă`).
- **Fișiere:**
  - `src/components/EuropeLiveMap.tsx`
  - `src/components/ControlCenterView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `5.27s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:19 — Implementare Completă a celor 5 Puncte Aprobate: (1) Fișa Tehnică Extinsă Flotă (Norma Euro, Kilometraj, ITP/RCA/ATP), (2) Gestiune Șoferi & Documente, (3) Pagină Dedicată „Clienți & Contracte” CRUD, (4) Calcul Automat Distanță & Cost la Comandă Nouă și (5) Generare/Printare CMR & Factură
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Fișa Tehnică Extinsă a Flotei (`Norma Euro`, `Kilometraj la bord`, `ITP`, `RCA/CMR`, `Certificat Frigo ATP`, `Revizii & Consum`) în [`src/components/TmsOperationsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/TmsOperationsView.tsx)**:
     - Tabel complet cu ambele numere Euro-RO (`Cap Tractor + Semiremorcă`), norma de poluare (`Euro 6e / Euro 6d` + clasa CO2 Maut), kilometrajul actual la bord (`km`), pragul următoarei revizii, consumul mediu (`L/100km` + `AdBlue %`), expirările ITP, RCA/CMR și Certificat Frigo ATP + modal de **Editare Fișă Tehnică** salvat în `localStorage`.
  2. **Gestiune Șoferi & Documente Profesionale (`Permis C+E`, `Atestat CPI/CPC`, `Card Tahograf G2V2`, `Aviz Medical/Psiho`, `Disponibilitate`) în [`src/components/TmsOperationsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/TmsOperationsView.tsx)**:
     - Tabel dedicat pentru toți șoferii (inclusiv echipajele duble), cu date de expirare pentru permis, atestat, card tahograf și aviz medical + buton **`+ Adaugă Șofer Nou`** și modal de editare.
  3. **Pagină & Tab Dedicat „Clienți & Contracte” (Tabel CRUD Complet sincronizat cu Drop-Listul) în [`src/components/TmsOperationsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/TmsOperationsView.tsx), [`src/components/ClientDropdownSelect.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/ClientDropdownSelect.tsx) și [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx)**:
     - Adăugat în meniul principal din stânga (`Clienți & Contracte`) și în taburile operaționale; permite căutare, adăugare (`+ Adaugă Client & Contract`), editare și ștergere clienți (CUI/VAT, țară, coridor implicit, LDM/tonaj/temperatură, tarif `€/km` și `€/LDM`, termen de plată), sincronizat în timp real cu drop-listul din toate formularele.
  4. **Calcul Automat de Distanță Rutieră Reală, Timp de Condus & Cost/Tarif Estimat în Formularul de Comandă Nouă ([`src/components/OrdersAndTripsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/OrdersAndTripsView.tsx), [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx))**:
     - Pe măsură ce selectezi adresele din Google Maps sau schimbi LDM-ul, formularul calculează automat distanța reală pe șosea (`km` + ocol grupaj), orele estimate de condus HGV (`72 km/h`), costul direct și tariful recomandat (`Aplică Tarif`).
  5. **Generare & Printare Document CMR Internațional (Rubricile 1–24) și Factură Proformă / Fiscală ([`src/components/CmrAndInvoiceModal.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/CmrAndInvoiceModal.tsx))**:
     - Integrat în **Planning 7 Zile** (`Detalii Complete Cursă`), **Comenzi & Curse** și **Flotă, Șoferi & Facturi**, cu buton **`Printează / Export PDF`**.
- **Fișiere:**
  - `src/components/CmrAndInvoiceModal.tsx` (nou)
  - `src/components/TmsOperationsView.tsx`
  - `src/components/ClientDropdownSelect.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `src/App.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `2.96s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:02 — Afișare Nume Client 100% Întreg în Antetul Cardului & Badge Explicit `LDM` (`6.8 LDM`) în Corpul Cardului
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - În [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx), s-a eliminat `truncate` și pilula `6.8m` din antetul cardului (care tăia numele clientului la `...ORA`) și s-a lăsat antetul dedicat 100% **numelui întreg al clientului** (`leading-snug break-words`).
  - Pilula de spațiu ocupat a fost mutată în corpul cardului lângă tonaj (`6.8 LDM` · `9.4 T`) și afișează explicit unitatea **`LDM`** (*Loading Meters* — metri liniari de podea ocupați din cei `13.6m` ai semiremorcii).
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.56s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 12:00 — Blocare Scroll Pagină în Spatele Ferestrelor Modale (`modal-scroll-locked`), Calcul Dinamic Distanță Rutieră Reală + Ocol Grupaj (`540 km (+14 km)`) & Afișare Ansamblu (`Cap Tractor + Remorcă`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Blocare completă a scroll-ului paginii din spatele oricărei ferestre modale deschise ([`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css), [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx), [`src/components/OrdersAndTripsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/OrdersAndTripsView.tsx), [`src/components/ClientOffersView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/ClientOffersView.tsx))**:
     - S-a adăugat `useEffect` (`document.body.style.overflow = 'hidden'`, clasa `modal-scroll-locked`) + regula CSS nativă `html:has(.modal-backdrop-lock), body:has(.modal-backdrop-lock) { overflow: hidden !important; overscroll-behavior: none !important; }` și `overscroll-contain` pe toate ferestrele modale (`Detalii Complete Cursă`, `Creare Rapidă în Celulă`, `Adaugă Comandă`, `Simulează Ofertă Client`), oprind definitiv mișcarea paginii din spate la scroll.
  2. **Calcul dinamic al distanței rutiere reale + ocolul de grupaj (`buildRoadDistanceWithDetourLabel`) în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)**:
     - S-au înlocuit cifrele copiate din macheta Davide Chape (`45 km`, `+ 137 km`) cu **distanța rutieră reală pe coridor + ocolul de grupaj doar acolo unde există abatere de la autostradă** (`1.580 km`, `540 km (+14 km)`, `920 km`, `1.440 km (+24 km)`, `1.040 km`, `1.840 km`), atât pe cardurile inițiale, cât și la crearea rapidă sau tragerea unei comenzi în calendar.
     - În selectoarele din modale (`Ansamblu Cap Tractor + Remorcă`), opțiunile afișează ambele numere de înmatriculare (`BH 101 BTS + BH 67 STS — Popa Mircea`).
- **Fișiere:**
  - `src/index.css`
  - `src/components/Planning7DaysView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/ClientOffersView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.56s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:48 — Bază de Clienți Salvați cu Selecție prin Drop-List (`ClientDropdownSelect.tsx`) și Pre-completare Automată
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - S-a creat componenta reutilizabilă [`src/components/ClientDropdownSelect.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/ClientDropdownSelect.tsx) conectată la baza de clienți salvați (`localStorage: bluetrans_tms_saved_clients_v1`, 13 clienți pre-configurați cu CUI/VAT, țară, rută implicită, LDM, tonaj și regim termic + buton **`+ Client nou`** pentru salvarea oricărui client nou direct în bază).
  - Integrată în **Planning 7 Zile** (`Creare Rapidă în Celulă` din [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)), în **Comenzi & Curse** (`Adaugă Comandă` din [`src/components/OrdersAndTripsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/OrdersAndTripsView.tsx)) și în **Oferte Clienți** (`Simulează Ofertă Nouă` din [`src/components/ClientOffersView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/ClientOffersView.tsx)).
- **Fișiere:**
  - `src/components/ClientDropdownSelect.tsx` (nou)
  - `src/components/Planning7DaysView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/ClientOffersView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.18s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:44 — Eliminare Glifă Coruptă pe Litera „e” (Cauzată de Fontul Local `"SF Pro Text"` / `"SF Pro Display"` în Chrome macOS)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - În [`index.html`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/index.html), [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css) și [`src/tahoe-skin.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/tahoe-skin.css), s-au eliminat referințele explicite la `"SF Pro Text"` / `"SF Pro Display"` și `-apple-system` (care în Chrome pe macOS încărcau o variantă locală cu ligaturi SF Symbols corupte pe litera `e` la `font-bold`) și s-a setat exclusiv webfontul curat `"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif` cu `font-feature-settings: "liga" 0, "clig" 0, "calt" 0`.
- **Fișiere:**
  - `index.html`
  - `src/index.css`
  - `src/tahoe-skin.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.55s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:41 — Corectare Contrast Text pe Bara Albastră de Notificare și Butonul `OK` în Modul Luminos
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - În [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx) și [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css), s-a corectat contrastul barei de notificare (toast) și al butonului `OK` pe Modul Luminos, astfel încât textul din bară rămâne alb clar (`#ffffff`) pe fundalul albastru (`#0A84FF`), iar butonul `OK` are fundal alb (`#ffffff`) cu text albastru-închis (`#0369a1`) perfect lizibil.
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `src/index.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.43s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:39 — Afișare Dublă Plăcuță Euro-RO (`Cap Tractor + Remorcă`) pe Cardurile din `Planning 7 Zile`, în Lista de Camioane și în Modalul de Detalii
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - În [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx), s-au afișat **ambele plăcuțe de înmatriculare Euro-Românești** (`[★ RO | BH 101 BTS] + [★ RO | BH 67 STS]`, `[★ RO | BH 108 BTS] + [★ RO | BH 75 STS]` etc., adică **Cap Tractor + Remorcă**) atât pe fiecare card din tabelul **Planning 7 Zile** (cu numele complet al șoferului dedesubt), cât și în panoul **Camioane & Remorci (Echipe)** și în antetul modalului **Detalii Complete Partidă Marfă & Cursă**.
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.04s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:36 — „+ Creare rapidă” Exclusiv pe Celulele Libere & Integrare Google Maps Autocomplete pe Toate Câmpurile de Adresă
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **„+ Creare rapidă” exclusiv pe celulele libere (`cellCards.length === 0`) în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)**:
     - S-a eliminat butonul `+ Creare rapidă` și acțiunea de click pe celulele deja ocupate de un card; acum `+ Creare rapidă` apare **doar** pe celulele goale.
     - S-a corectat contrastul pe rândul 1 al cardului (`card.cargoSpec`: `Frigo Z1: 16 pal`, `Descărcare Viena`) în Modul Luminos (`#0f172a`) în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx) și [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css).
  2. **Componentă reutilizabilă Google Maps Address & Hub Autocomplete ([`src/components/GoogleMapsAddressInput.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/GoogleMapsAddressInput.tsx)) integrată peste tot**:
     - Sugestii instant cu adrese stradale complete, coduri poștale, ieșiri de autostradă HGV și coordonate GPS pentru hub-urile europene (RO, HU, AT, DE, NL, BE, SE) + geocodare live pentru orice stradă/adresă și link direct „Google Maps ↗”.
     - Integrată în **Planning 7 Zile** (`Creare Rapidă`), **Comenzi & Curse** (`+ Comandă nouă` + link direct de rută Google Maps în Wizard-ul `Cursă nouă`) și **Oferte Clienți** (`Simulează Ofertă Nouă`).
- **Fișiere:**
  - `src/components/GoogleMapsAddressInput.tsx` (nou)
  - `src/components/Planning7DaysView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/ClientOffersView.tsx`
  - `src/index.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.49s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:27 — Carduri Mai Înalte și Mai Late în `Planning 7 Zile` (`min-h-[168px]`, Tabel Full-Width `min-w-[1280px]`) pentru Vizibilitate Completă a Textelor
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Carduri mai înalte (`min-h-[168px]`, `p-2.5 space-y-2`) în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)**:
     - S-a mărit înălțimea cardurilor și a celulelor (`min-h-[188px]`) și s-a separat ruta (`Oradea → Rotterdam`, `Viena → Rotterdam`, `Stockholm → Oradea`) pe propriul rând dedicat, deasupra liniei cu distanța (`45 km`, `+ 137 km`) și temperatura (`-18°C`, `+4°C`), iar jos s-a afișat plăcuța Euro-RO (`[★ RO | BH 67 STS]`) și numele complet al șoferului (`Popa Mircea`, `Kovács Attila`).
  2. **Carduri mai late (Calendar pe 100% din lățimea paginii, `min-w-[1280px]`)**:
     - S-a extins containerul principal din [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx) la `max-w-full`, iar în `Planning7DaysView.tsx` tabelul pe 7 zile ocupă acum 100% din lățime (cu panourile `Comenzi în Așteptare` și `Camioane & Remorci` așezate într-un dock pe 2 coloane dedesubt), astfel încât numele clienților, rutele și șoferii sunt complet vizibile.
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `src/App.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `2.97s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:17 — Fundal Real de Hartă OpenStreetMap pe Cardurile din `Planning 7 Zile` (Exact ca în Modelul de Referință)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - Cardurile din [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx) folosesc acum pe fundal tile-uri cartografice reale OpenStreetMap (`https://tile.openstreetmap.org/8/...`) corespunzătoare coridorului fiecărei curse (Viena, Rotterdam, München, Frankfurt/Köln, Hamburg/Stockholm), cu mască de lizibilitate de la stânga la dreapta (`.planning-card-map-mask` în [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css)), linie dublă de separare sub antetul colorat, pilulă albă LDM, badge portocaliu pentru tonaj (`9.8T`), distanță în magenta (`+ 137 km`), temperatură și plăcuța Euro-Românească (`[★ RO | BH 67 STS]`).
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `src/index.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `5.09s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:15 — Eliminare Completă Fonturi Monospace / Robotizate (`index.html`, `EuropeLiveMap.tsx`, `tahoe-skin.css`) & Curățare Padding Forțat pe Tabele în `index.html`
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Eliminare `font-family: monospace` rămas în [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx)**:
     - S-a eliminat `font-family:monospace` din eticheta markerelor de camion și s-a impus familia nativă Apple SF Pro / Inter pe toate elementele (`*`, `::before`, `::after`) în [`index.html`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/index.html) și [`src/tahoe-skin.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/tahoe-skin.css).
  2. **Curățare `tbody td { padding: 7px 12px !important; }` din [`index.html`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/index.html)**:
     - S-a eliminat regula inline din `index.html` care forța `12px` padding lateral pe fiecare celulă de tabel și îngusta cardurile din `Planning 7 Zile`.
- **Fișiere:**
  - `index.html`
  - `src/components/EuropeLiveMap.tsx`
  - `src/tahoe-skin.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.19s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:12 — Eliminare Coloană `ORĂ` din Tabelul `Planning 7 Zile` pentru Lățime Maximă pe Cele 7 Zile
- **Autor:** Antigravity
- **Ce s-a făcut:**
  - S-a eliminat coloana stângă `ORĂ` (`08:00`, `09:00` etc.) din tabelul `Planning 7 Zile` și din lista mobilă în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx), lăsând întregul spațiu orizontal dedicat exclusiv celor 7 zile (`LUN 9` → `DUM 15`). Ora rămâne doar informativă în fereastra de detalii a cursei.
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `5.87s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:10 — Carduri `Planning 7 Zile` stil Davide Chape cu Hartă Cartografică Semitransparentă pe Fundal, Text Lizibil pe Lățime Maximă & Plăcuțe de Înmatriculare Euro-Românești (`[★ RO | BH 67 STS]`)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Lățime extinsă pentru celulele și cardurile din `Planning 7 Zile` ([`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx))**:
     - S-a lărgit tabelul de 7 zile (`flex-1 min-w-0` + coloană dreapta compactă de `270px` + padding redus `p-1` pe celulele zilelor și `w-11` pe coloana `ORĂ`), astfel încât numele clienților, specificațiile mărfii și rutele se văd clar fără trunchiere la 1–2 litere.
  2. **Hartă Cartografică Semitransparentă pe Fundalul Cardurilor (stil Davide Chape) ([`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx))**:
     - Fiecare card din celulele de planning are pe fundal o hartă cartografică semitransparentă (poligoane verzi de relief, curs de apă albastru, grilă stradală și coridor principal de autostradă în galben/portocaliu cu noduri de rută).
  3. **Plăcuță de Înmatriculare Euro-Românească (`[★ RO | BH 67 STS]`) pe un singur rând ([`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx))**:
     - Numărul mașinii este afișat în format autentic de plăcuță de înmatriculare Euro-Românească (bandă albastră UE `#003399` în stânga cu steluță galbenă `★` și `RO` + corp alb cu număr negru bold `BH 67 STS` pe un singur rând `whitespace-nowrap`, fără rupere pe 3 rânduri), atât în cardurile din tabel, cât și în lista `CAMIOANE & REMORCI (ECHIPE)` din dreapta.
- **Fișiere:**
  - `src/components/Planning7DaysView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.12s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 11:05 — Pagină Separată `Urmărire Live` sub `Planning 7 Zile`, Butoane Icon-Only (Fără Dubluri) pentru Temă & Deconectare, și Mod Luminos în `Analiză & Scenarii`
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Pagină separată `Urmărire Live` (`live-tracking`) în meniul din stânga, imediat sub `Planning 7 Zile` ([`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx), [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx))**:
     - S-a mutat modulul `URMĂRIRE LIVE` (`EuropeLiveMap` cu trasee rutiere OSRM camioane) din subsolul tabelului `Planning 7 Zile` într-o **pagină separată dedicată (`Urmărire Live`)**, plasată în Sidebar exact sub `Planning 7 Zile`.
  2. **Eliminare dubluri butoane Temă / Deconectare și transformare în butoane Icon-Only ([`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - S-au eliminat butoanele dublate din cardul de profil din Sidebar.
     - În Header (dreapta-sus), butoanele de schimbare temă (`Sun` / `Moon`) și `Deconectare` (`LogOut`) sunt acum exclusiv **iconițe rotunde** (`w-9 h-9 rounded-full`), fără text.
  3. **Mod Luminos complet în `Analiză & Scenarii` ([`src/components/AnalysisAndScenariosView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/AnalysisAndScenariosView.tsx))**:
     - Toate cardurile din `Analiză & Scenarii` folosesc acum `tahoe-glass` și `tahoe-card-inner`, afișându-se curat pe alb în Modul Luminos.
- **Fișiere:**
  - `src/App.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `src/components/AnalysisAndScenariosView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.16s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 10:34 — Reparare Completă Mod Luminos (Eliminare Casete Gri Murdar & Texte Galbene Ilizibile) + Persistență în `localStorage` a Modului și Sesiunii Alese de User
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Reparare completă Mod Luminos (`[data-theme="light"]` în [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css))**:
     - S-au eliminat casetele gri murdar (`bg-black/30`, `bg-black/35`, `bg-black/40`, `bg-black/50`) din interiorul cardurilor (precum tabelul celor 8 criterii și casetele Cross-Dock din `SmartGroupageView.tsx`), care pe fundal alb deveneau gri-ciment (`#b3b3b3`); acum pe Modul Luminos au suprafață curată `#f8fafc` cu chenar discret `#e2e8f0`.
     - S-au corectat textele pastelate/galbene (`text-[#FFD60A]`, `text-[#FF9F0A]`, `text-amber-300`, `text-emerald-200/300`, `text-sky-200/300`, `text-indigo-300`, `text-purple-300`) care erau ilizibile pe fundal deschis, înlocuindu-le automat pe Modul Luminos cu nuanțe cu contrast ridicat (`#b45309`, `#047857`, `#0369a1`, `#1d4ed8`, `#4338ca`, `#6d28d9`).
     - S-au eliminat regulile duplicate de tabel adăugate la finalul `src/index.css`.
  2. **Persistență în `localStorage` a modului ales (`Mod Luminos` / `Mod Întunecat`) și a sesiunii utilizatorului ([`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - Modul ales de utilizator (`dark` sau `light`) se salvează automat în `localStorage` (`bluetrans_tms_theme`) și pe `document.documentElement[data-theme]`, rămânând memorat la refresh sau reîncărcare.
     - Sesiunea utilizatorului logat (rolul, contul, camionul șoferului și tabul activ) este de asemenea memorată în `localStorage` (`bluetrans_tms_auth_v1`) până când utilizatorul apasă explicit pe `Deconectare`.
- **Fișiere:**
  - `src/index.css`
  - `src/App.tsx`
  - `src/components/TmsOperationsView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `2.62s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 10:08 — Portal de Autentificare Full-Screen (`LoginView.tsx`), Modal Detalii Complete Cursă/Comandă în Planning 7 Zile & Sincronizare Modificări Externe (Paperclip)
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Verificare & Păstrare Modificări Externe (Paperclip)**:
     - S-au verificat și păstrat modificările făcute din extern (Paperclip): cele 2 camionete express (`BH 24 EXP` — 3.5T Oradea → Viena, 4.2 LDM; și `BH 35 EXP` — 7.5T Bi-Temp Szeged → Bratislava → Viena, 6.2 LDM), al 4-lea scenariu de Smart Trailer Swap în [`src/data/mockData.ts`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/data/mockData.ts) și fișierul [`src/tahoe-skin.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/tahoe-skin.css).
  2. **Pagină de Autentificare Full-Screen Reală ([`src/components/LoginView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/LoginView.tsx), [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - S-a eliminat butonul de schimbare rol din Header și s-a implementat o pagină reală de **Login Full-Screen** la intrarea în aplicație (`isAuthenticated = false`), cu două moduri de autentificare:
       - **Personal Birou & Dispecerat (Email + Parolă)** pentru:
         - `Administrator General` (`admin@bluetrans.ro`) — acces total la toate cele 8 module;
         - `Dispecer / Admin Cursă` (`elena.munteanu@bluetrans.ro` — Coridor Vest, `radu.cristea@bluetrans.ro` — Coridor Nord) — acces pe operațiuni, planning, grupaj și coordonare șoferi;
         - `Departament Financiar` (`anca.marinescu@bluetrans.ro`) — acces la Control Center, Comenzi & CMR, Flotă & Facturi.
       - **Șofer Camion / Cabină (Număr Înmatriculare + PIN Cabină)** pentru oricare din cele 7 vehicule (`BH 67 STS`, `BH 71 STS`, `BH 75 STS`, `BH 82 BTS`, `BH 91 BTS`, `BH 24 EXP`, `BH 35 EXP`), care deschide direct **Portalul Șoferului (`DriverPortalView.tsx`)** restricționat strict la cursa atribuită lui, fișa tehnică a camionului și **Adminul Cursei (Dispecerul Coordonator)**.
     - S-a adăugat buton de **`Deconectare` (Logout)** în Sidebar și în Header care readuce utilizatorul în ecranul de Login.
  3. **Modal Detalii Complete Partidă Marfă & Cursă la Click în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)**:
     - Orice click pe un card din tabelul `Planning 7 Zile` deschide fereastra detaliată cu toți parametrii comenzii și ai cursei (client, rută, LDM, tonaj, temperatură, zonă Bi-Temp, șofer, remorcă, venit/profit și acțiuni directe).
- **Fișiere:**
  - `src/components/LoginView.tsx` (nou)
  - `src/App.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `3.82s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 09:35 — Mod Luminos / Mod Întunecat Complet, Unificare Stilistică Planning 7 Zile, Logare pe Grade de Roluri (RBAC) & Portal Dedicat Șoferi + Adminul Cursei
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Stilistică Unificată macOS Tahoe în [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)**:
     - S-a înlocuit caseta albă discordantă cu suprafețele native `tahoe-glass` și `tahoe-card-inner` ale aplicației, astfel încât tabelul de Planning pe 7 zile + ore, panoul `COMENZI ÎN AȘTEPTARE` și panoul `CAMIOANE & REMORCI (ECHIPE)` respectă 100% designul aplicației atât în **Mod Întunecat (`🌙`)**, cât și în **Mod Luminos (`☀️`)**.
     - S-a reparat afișarea numelor clienților în cardurile din celule (fără trunchiere la 1–2 litere).
  2. **Versiune Completă pe Modul Luminos (`☀️ Mod Luminos`) & Modul Întunecat (`🌙 Mod Întunecat`) ([`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css), [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - S-a adăugat buton de comutare instantă `Mod Luminos / Mod Întunecat` în Header Bar și în Sidebar, cu suport complet `[data-theme="light"]` pentru întreaga aplicație.
  3. **Logare pe Diferite Grade de Roluri (`ADMIN`, `DISPECER / ADMIN CURSĂ`, `FINANCIAR`, `ȘOFER CAMION`) & Modul Dedicat pentru Șoferi ([`src/components/DriverPortalView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/DriverPortalView.tsx), [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**:
     - Când un **Șofer** se autentifică (pentru oricare din cele 7 camioane: `BH 67 STS`, `BH 71 STS`, `BH 75 STS`, `BH 82 BTS`, `BH 91 BTS`, `BH 24 EXP`, `BH 35 EXP`), interfața este restricționată automat doar la cursa atribuită lui.
     - Șoferul vede: (a) **Ruta atribuită step-by-step** + harta rutieră OSRM doar cu traseul său, (b) **Fișa tehnică a camionului și semiremorcii** (temperaturi Bi-Temp Z1/Z2, poziție perete Bulkhead, agregat frigo, tonaj util & masă totală, sarcină pe axa motrică, nivel motorină/AdBlue, sigiliu), (c) **Tahograf digital & confirmare Smart Trailer Swap din cabină**, și (d) **Adminul acelei curse (Dispecerul Coordonator)** cu date de contact, instrucțiuni obligatorii pe cursă și chat în timp real Șofer ↔ Admin Cursă.
- **Fișiere:**
  - `src/components/DriverPortalView.tsx` (nou)
  - `src/components/Planning7DaysView.tsx`
  - `src/App.tsx`
  - `src/index.css`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `4.43s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-10 09:26 — Audit Complet al Tuturor Taskurilor, Curățare CSS Tabele (`index.css`), Reparare Header Bar & Butoane Modale + Rute OSRM 100% Camioane + Branding BLUE TRANS TMS
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Curățare CSS conflictual în [`src/index.css`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/index.css)**: S-au eliminat regulile globale `!important` pe `table`, `thead th` (`position: sticky`), `tbody td` (`vertical-align: middle !important`) care suprascriau alinierea celulelor din tabelul de Planning 7 Zile.
  2. **Header Bar & Sidebar ([`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx))**: S-a eliminat poziționarea flotantă (`sticky lg:top-4 lg:mx-4 lg:rounded-[22px]`) care lăsa spațiu deasupra și se suprapunea peste carduri la scroll; acum bara superioară este lipită sus (`w-full border-b`) și se derulează natural la scroll.
  3. **Restaurare pictograme butoane de închidere (`×`) și markere Swap (`⇄`)** care fuseseră golite accidental în [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx), [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx), [`src/components/ClientOffersView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/ClientOffersView.tsx), [`src/components/OrdersAndTripsView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/OrdersAndTripsView.tsx) și [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx).
  4. **Trasee Rutiere Reale Camioane (Zero Linii Aeriene) ([`src/data/highwayGeometries.ts`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/data/highwayGeometries.ts), [`src/components/EuropeLiveMap.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/EuropeLiveMap.tsx))**: ~560 puncte OSRM reale per coridor pentru toate cele **7 vehicule** (`BH 67 STS`, `BH 71 STS`, `BH 75 STS`, `BH 82 BTS`, `BH 91 BTS`, `BH 24 EXP`, `BH 35 EXP`), pe tile-uri OpenStreetMap 100% gratuite (fără API key).
  5. **Branding 100% `BLUE TRANS TMS — Blue Trans Spedition`**: Zero referințe la `SFERLE` în întreaga aplicație.
- **Fișiere:**
  - `src/index.css`
  - `src/App.tsx`
  - `src/data/highwayGeometries.ts`
  - `src/data/mockData.ts`
  - `src/components/EuropeLiveMap.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `src/components/ControlCenterView.tsx`
  - `src/components/ClientOffersView.tsx`
  - `src/components/OrdersAndTripsView.tsx`
  - `src/components/AnalysisAndScenariosView.tsx`
  - `index.html`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `2.90s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-09 23:19 — Redesign macOS Tahoe + Grilă Planning Orară (08:00–15:00 × 7 Zile) cu Creare Rapidă pe Celulă, Drag & Drop 3-Way și Hartă OpenStreetMap Fără API Key
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. **Planning 7 Zile (`src/components/Planning7DaysView.tsx`)**: Reconstruit exact pe structura din captura de referință:
     - Grilă orară pe 7 zile (`LUN 9` .. `DUM 15` × `08:00` .. `15:00`) cu totaluri zilnice de tonaj și LDM (`T | LDM`) sub fiecare zi.
     - Carduri detaliate în celule cu textură de hartă în fundal, header colorat, badge LDM, tonaj portocaliu (`T`), distanță magenta (`km`), temperatură (`°C`) și camion alocat.
     - **Creare rapidă pe orice celulă**: Click pe orice celulă `(Zi, Oră)` deschide instant modalul de adăugare rapidă pre-completat cu ziua și ora celulei.
     - **Drag & Drop în 3 direcții**: (a) mutare carduri între oricare două celule `(Zi, Oră)`, (b) tragere comenzi din panoul lateral **`COMENZI ÎN AȘTEPTARE`** direct pe orice celulă din calendar, (c) tragere camioane/remorci din panoul lateral **`CAMIOANE & REMORCI (ECHIPE)`** direct peste o cursă din calendar pentru alocarea camionului.
     - Secțiunea **`((o)) URMĂRIRE LIVE`** integrată direct sub tabelul de planning.
  2. **Hartă Live OpenStreetMap 100% Gratuită, Fără API Key (`src/components/EuropeLiveMap.tsx`)**:
     - Înlocuit tile-urile Carto (care cereau API key) cu tile-urile oficiale gratuite **OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`)** — zero chei API, rezoluție nativă, markere de camion fără suprapunere, coridoare luminate și puncte Smart Trailer Swap.
  3. **Design macOS Tahoe (Liquid Glass) & Optimizare Mobil (`src/index.css`, `src/App.tsx`, `src/components/ControlCenterView.tsx`, `src/components/ClientOffersView.tsx`, `src/components/TrailerSwapView.tsx`, `src/components/SmartGroupageView.tsx`)**:
     - Sidebar flotant macOS Tahoe pe desktop și dock flotant iOS/Tahoe în partea de jos pe mobil, selector de zile pe mobil și componente tactile.
- **Fișiere:**
  - `src/index.css`
  - `src/App.tsx`
  - `src/components/EuropeLiveMap.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `src/components/ControlCenterView.tsx`
  - `src/components/ClientOffersView.tsx`
  - `src/components/TrailerSwapView.tsx`
  - `src/components/SmartGroupageView.tsx`
  - `package.json`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `2.57s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-09 21:05 — Configurare și pornire server pe portul 3645 (http://localhost:3645)
- **Autor:** Antigravity
- **Ce s-a făcut:** S-a configurat portul implicit `3645` în `vite.config.ts`, s-a pornit serverul de dezvoltare Vite pe `http://localhost:3645/` și s-a deschis aplicația în browser.
- **Fișiere:** `vite.config.ts`, `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** Server dev activ pe `http://localhost:3645/` (`200 OK`).

### 2026-11-09 19:23 — Implementare Completă Smart Groupage (8 Criterii, Comparator Multi-Variantă & Transfer Marfă între Remorci) + Drag & Drop Remorci
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. S-a implementat integral specificația **Smart Groupage – optimizarea grupajelor** în [`src/components/SmartGroupageView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/SmartGroupageView.tsx) și [`src/data/mockData.ts`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/data/mockData.ts):
     - Evaluarea automată a remorcilor compatibile la introducerea unei comenzi noi pe baza celor **8 criterii obligatorii**: (1) Traseu existent, (2) Capacitate LDM pe segmente, (3) Temperatura solicitată, (4) Ore de încărcare și descărcare, (5) Kilometri suplimentari, (6) Timp suplimentar, (7) Cost incremental, (8) Venit și profit estimat.
     - **Comparator Multi-Variantă (`Varianta 1 — Recomandată AI` vs `Varianta 2 — Alternativă Directă` vs `Varianta 3 — Cu Transfer Marfă în Hub`)** pentru ca dispecerul să compare mai multe variante înainte de confirmare.
     - **Identificarea oportunităților de transfer de marfă între remorci (`CARGO_TRANSFER_OPPORTUNITIES`)** în puncte unde transferul este permis contractual și fezabil tehnic (fără sigiliu vamal blocat, cu rampă frigo controlată și stivuitor, ex. Hub Frankfurt și Baza Oradea).
  2. S-a extins **Drag & Drop-ul din [`src/components/Planning7DaysView.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/components/Planning7DaysView.tsx)** astfel încât dispecerul să poată trage cu mouse-ul atât **comenzile**, cât și **remorcile** (pentru interschimbarea rapidă a capetelor tractor/șoferilor direct în tabelul pe 7 zile).
  3. S-a extins Vectorul 3 din [`run_prepush_audit.py`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py) cu verificarea automată a celor 8 criterii Smart Groupage și a modulului de transfer marfă între remorci (`21/21` teste promovate).
- **Fișiere:**
  - `src/data/mockData.ts`
  - `src/components/SmartGroupageView.tsx`
  - `src/components/Planning7DaysView.tsx`
  - `src/App.tsx`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/CHANGELOG.md`
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`21/21` verificări promovate în `2.82s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-09 19:17 — Adăugare Modul Comenzi & Curse (Wizard 3 Pași), Tahograf Digital & Facturare/Profitabilitate
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. S-a adăugat modulul complet **`Comenzi & Curse`** (`src/components/OrdersAndTripsView.tsx`), conform designului desktop TMS din captura clientului: tabel filtrabil de comenzi cu status documente CMR, modal de creare `+ Comandă nouă` (cu sanitizare numerică rezilientă la virgulă/punct și validare LDM `0.4–13.6`, tonaj `<= 22t`, temperatură `-25..+25°C`) și **Wizard-ul „Cursă nouă” în 3 pași (`1. Detalii Comandă -> 2. Alocare Vehicul & Șofer -> 3. Confirmare & LDM`)** care trimite comanda direct în Planning-ul pe 7 zile.
  2. S-a extins modulul **`Flotă, Tahograf & Facturi`** (`src/components/TmsOperationsView.tsx`) cu 3 sub-secțiuni interactive: (a) Telemetrie GPS Cargo Track & senzori agregat frigo Bi-Temp, (b) Monitorizarea timpilor legali din Tahograful Digital (Reg. CE 561/2006 — ore zilnice și săptămânale rămase, eligibilitate Smart Swap), (c) Tabelul de Facturare, Costuri Directe, Bonus Grupaj și Marjă Netă pe cursă/remorcă, cu emitere 1-click a facturii.
  3. S-a conectat căutarea globală din headerul [`src/App.tsx`](file:///Users/eugeniucazmal/Downloads/dev_office/Blue%20Trans/src/App.tsx) pentru filtrarea instantanee după număr remorcă, tractor, șofer sau oraș de pe rută.
- **Fișiere:**
  - `src/components/OrdersAndTripsView.tsx` (nou)
  - `src/components/TmsOperationsView.tsx` (extins)
  - `src/App.tsx` (actualizat cu noul tab `Comenzi & Curse` și căutare globală live)
- **Ramură / Commit:** `main` (fără commit nou)
- **Build / Teste:** `npm run build` OK (0 erori) · `run_prepush_audit.py` OK (`20/20` verificări promovate în `2.28s` — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).

### 2026-11-09 18:35 — Inițializare SFERLE TMS PRO (Blue Trans Spedition), Audit Gatekeeper & Sincronizare Paperclip
- **Autor:** Antigravity
- **Ce s-a făcut:**
  1. Construirea aplicației web interactive **SFERLE TMS PRO — Blue Trans Spedition** (React 19 + TypeScript + Tailwind CSS + Vite) cu toate cele 8 cerințe și cele 5 ecrane de referință: Control Center, Planning pe 7 Zile cu Drag & Drop și calcul LDM/Tonaj pe segmente + Bi-Temp (Zona 1 / Zona 2), Smart Groupage & Alerte Spațiu Neutilizat + Disponibilități Viitoare, modulul diferențiator **Smart Trailer Swap** (cele 4 scenarii obligatorii + cele 4 opțiuni post-swap per tractor + dublă confirmare șoferi + Cargo Track API & Tahograf), Oferte Automate către Clienți cu e-mail comercial, link portal și **Regula Obligatorie Soft-Lock** (`3.0 LDM` din `4.2 LDM`), plus tab-ul și documentul cu răspunsurile analitice pentru Călin Sferle.
  2. Implementarea sistemului automat de verificare Pre-Push în 6 faze **`audit-gatekeeper`** (`.agents/skills/audit-gatekeeper/SKILL.md` și `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`).
  3. Configurarea regulilor de sincronizare continuă **Antigravity ↔ Paperclip** (`.agents/rules/paperclip-sync.md`, `.agents/AGENTS.md`, `.agents/CHANGELOG.md`) și inițializarea depozitului Git local.
- **Fișiere:**
  - `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
  - `src/main.tsx`, `src/index.css`, `src/App.tsx`, `src/data/mockData.ts`
  - `src/components/ControlCenterView.tsx`, `src/components/Planning7DaysView.tsx`, `src/components/SmartGroupageView.tsx`, `src/components/TrailerSwapView.tsx`, `src/components/ClientOffersView.tsx`, `src/components/AnalysisAndScenariosView.tsx`, `src/components/TmsOperationsView.tsx`
  - `ANALIZA_SI_SCENARII_BLUE_TRANS.md`
  - `.agents/skills/audit-gatekeeper/SKILL.md`, `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/rules/paperclip-sync.md`, `.agents/rules/audit-gatekeeper.md`, `.agents/AGENTS.md`, `.agents/CHANGELOG.md`
- **Ramură / Commit:**
  - Ramură: `main` (depozit proaspăt inițializat, fără commit încă — `git log -1 --oneline`: niciun commit efectuat încă)
  - Stare `git status --short`:
    `?? .agents/`, `?? .gitignore`, `?? ANALIZA_SI_SCENARII_BLUE_TRANS.md`, `?? index.html`, `?? package-lock.json`, `?? package.json`, `?? src/`, `?? tsconfig.json`, `?? vite.config.ts`
- **Build / Teste:** `npm run build` (`tsc -b && vite build`) OK (0 erori) · `run_prepush_audit.py` OK (`20/20` verificări promovate — `🟢 VERDE — 100% SIGUR PENTRU PUSH`).
