---
name: audit-gatekeeper
description: >
  Sistem automat de verificare Pre-Push în 6 faze pentru proiectul SFERLE TMS PRO (Blue Trans Spedition),
  inspirat din arhitectura cloudflare/security-audit-skill și extins cu invarianții de business TMS
  (LDM 13.6m pe segmente, Bi-Temp Zona 1/Zona 2, Regula Soft-Lock 3.0/4.2 LDM, Smart Trailer Swap,
  Contribuție Netă Grupaj), reziliența formularelor, integritatea datelor (100% READ-ONLY) și securitate.
---

# 🛡️ Skill: `audit-gatekeeper` (Pre-Push Gatekeeper în 6 Faze)

Acest skill definește protocolul obligatoriu de verificare înainte de orice `git commit` sau `git push` în proiectul **SFERLE TMS PRO — Blue Trans Spedition**.

> **REGULĂ DE AUR (100% READ-ONLY):** Nicio verificare din `audit-gatekeeper` nu are voie să altereze baza de date (interzis `db.commit()`, `INSERT`, `UPDATE`, `DELETE` persistente) sau să modifice fișierele sursă ale aplicației în timpul auditului.

---

## Comandă Rapidă de Execuție

```bash
# Audit complet (include compilarea TypeScript + Vite build de producție)
python3 .agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py

# Audit rapid în timpul dezvoltării (verifică TypeScript tsc --noEmit fără vite bundle)
python3 .agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py --skip-build
```

---

## Arhitectura în 6 Faze (Inspirată din `cloudflare/security-audit-skill`)

### Faza 1: Reconnaissance & Inventar (`git status -s`, `git diff`)
- Inventariază starea depozitului Git (`git status -s`, `git diff --stat`), fișierele modificate în Frontend (`src/`), configurații (`package.json`, `tsconfig.json`, `vite.config.ts`) și eventuale module Backend / DB.
- Identifică suprafața de impact a modificărilor curente (componente React, modele de date TMS, formulare, rute API).

### Faza 2: Hunting pe 5 Vectori Critici

#### Vector 1: Reziliența Formularelor și Validarea Datelor
- Verifică toate formularele interactive din aplicație (ex. Portalul de Ofertare Client și Contraoferta Dispecer din `src/components/ClientOffersView.tsx`, filtrele și inputurile din `src/components/TrailerSwapView.tsx` și `src/App.tsx`) și eventualele scheme backend (`Pydantic` / `Zod`).
- Testează și auditează tratarea cazurilor-limită pe inputuri numerice (`LDM`, `Temperatură °C`, `Preț Oferit €`, `Contraofertă €`):
  - Inputuri golite (`""`, `null`, `undefined`, `NaN`);
  - Valori zecimale introduse cu virgulă (`"4,2"`, `"12,5"`) care în lipsa normalizării pot provoca `NaN` în UI sau `422 Unprocessable Entity` / `500 Internal Server Error` pe backend;
  - Respectarea limitelor fizice (`0 < LDM <= 13.6`, tonaj `<= 22.0t`).

#### Vector 2: Integritatea Datelor și Izolarea Multi-Tenant / Filtre DB
- Auditează 100% READ-ONLY structurile de date din `src/data/mockData.ts` (și orice bază de date conectată ulterior):
  - Prezența și unicitatea ID-urilor pentru toate remorcile (`INITIAL_TRAILERS`), comenzile nealocate (`UNASSIGNED_ORDERS`), recomandările de grupaj (`SMART_GROUPAGE_MATCHES`), propunerile clienților (`INITIAL_PROPOSALS`), scenariile de schimb (`TRAILER_SWAP_SCENARIOS`) și sloturile viitoare (`FUTURE_AVAILABILITY_SLOTS`).
  - Completitudinea grilei de **Planning pe 7 zile** (`schedule7Days` trebuie să conțină exact 7 zile: `dayIndex` `0..6` pentru fiecare remorcă).
  - Prevenirea dispariției datelor la tranziția dintre date statice și DB sau la aplicarea filtrelor multi-tenant.

#### Vector 3: Invarianți de Business și Calcule Critice ale Proiectului (Etaloane TMS)
1. **Invariantul Capacității Fizice (13.6 LDM & 22.0t)**:
   - Pe fiecare remorcă și pe fiecare segment: `occupiedLdm + freeLdm == 13.6` (toleranță `1e-5`), `0 <= occupiedLdm <= 13.6`, `currentWeightTons <= maxWeightTons (22.0t)`.
2. **Invariantul Bi-Temp (Cele 2 Zone de Temperatură)**:
   - Pe fiecare segment Bi-Temp: `zone1MaxLdm + zone2MaxLdm == totalLdm (13.6)` și `zone1OccupiedLdm + zone2OccupiedLdm == occupiedLdm`.
3. **Invariantul Financiar al Contribuției Nete (Etalonul Călin Sferle: `550 € - 180 € = 370 €`)**:
   - Pentru orice ofertă de client sau recomandare de grupaj: `Preț Oferit - Cost Suplimentar Estimat (km + taxe + timp) == Contribuție Estimată`.
   - Verifică explicit cazul etalon Viena → Rotterdam (`3.0 LDM`, `+4°C`, `550 € - 180 € = +370 €`).
4. **Invariantul Regulii Obligatorii Soft-Lock (`3.0 LDM` din `4.2 LDM`)**:
   - O ofertă în starea `Pending review` nu blochează definitiv `occupiedLdm`, dar setează `softReservedLdm` și declanșează `hasConflictWarning = true` când există o ofertă concurentă incompatibilă (`3.0 + 2.4 = 5.4 > 4.2 LDM`).
   - La acceptare (`handleAcceptProposal`), capacitatea rămasă se recalculează exact (`4.2 - 3.0 = 1.2 LDM`).
5. **Invariantul Smart Trailer Swap (4 Scenarii Obligatorii + 4 Opțiuni Post-Swap + Dublă Confirmare)**:
   - Existența celor 4 scenarii obligatorii (`RECIPROCAL_SWAP`, `UNILATERAL_TAKEOVER`, `DOUBLE_CREW_RELAY`, `EARLY_TRAILER_RELEASE`) și a celor 4 acțiuni post-schimb selectabile independent pentru fiecare tractor (`ORADEA_BASE`, `RETURN_ORIGIN_DIR`, `NEW_DESTINATION_EMPTY_OR_LOAD`, `CONTINUE_NEW_TRAILER_ROUTE`).
   - Interzicerea aprobării schimbului fără confirmarea ambilor șoferi (`tractorA.driverConfirmed && tractorB.driverConfirmed`).

#### Vector 4: Reguli UI și de Arhitectură
- Interzicerea dialogurilor native blocante (`alert()`, `window.confirm()`, `window.prompt()`).
- Interzicerea instrucțiunilor `debugger;` uitate în cod.
- Verificarea compilării curate TypeScript (`tsc -b` / `tsc --noEmit`) și a bundle-ului de producție Vite (`npm run build`).

#### Vector 5: Securitate (Auth, IDOR, Secrete Expuse)
- Scanarea întregului cod frontend (`src/`) pentru a preveni expunerea de chei API private, tokenuri Cargo Track, parole sau secrete hardcodate.
- Interzicerea funcțiilor nesigure (`eval()`, `dangerouslySetInnerHTML`).
- Verificarea protecției rutelor API și a controalelor IDOR (dacă există backend activ).

---

### Faza 3: Independent QA Verification
- Pentru modificările complexe care ating simultan logica de calcul LDM pe segmente, algoritmul Soft-Lock sau sincronizarea Smart Trailer Swap, un sub-agent independent (`research` / QA) revizuiește diff-ul și raportul generat de script pentru a confirma absența regresiilor logice.

---

### Fazele 4–6: Raportare, Clasificare Severitate și Semafor Pre-Push
Scriptul consolidează rezultatele într-un tabel structurat pe cei 5 vectori și emite verdictul final:
- `🟢 VERDE — 100% SIGUR PENTRU PUSH`: Toți vectorii critici și invarianții de business au trecut cu `0` erori blocante. Agentul poate cere permisiunea utilizatorului pentru `git commit` / `git push`.
- `🔴 BLOCAT — INTERZIS PUSH`: Cel puțin un vector critic a eșuat. Agentul trebuie să remedieze cauza și să re-ruleze auditul până la obținerea semaforului `🟢 VERDE`.

