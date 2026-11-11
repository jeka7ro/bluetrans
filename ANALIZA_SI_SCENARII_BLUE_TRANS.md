# SFERLE TMS PRO (BLUE TRANS SPEDITION) — Analiză Funcțională, Reguli Operaționale, Smart Trailer Swap și Scenarii de Testare

Acest document sintetizează analiza tehnică și operațională a celor **8 module propuse** și a celor **5 exemple vizuale**, oferind răspunsurile structurate la întrebările lui Călin Sferle și scenariile reale de testare pentru **Blue Trans Spedition** (cu țintă dublă: creșterea rentabilității interne și transformarea ulterioară în produs comercial SaaS).

---

## 1. Ce funcții ar ajuta efectiv dispecerii în fiecare zi?

1. **Vizualizarea instantanee a LDM pe segmente fără a deschide fiecare remorcă (`Smart Planning Card`)**:
   - Dispecerul vede dimineața toate cele 25 de remorci cu: poziția GPS actuală (prin Cargo Track API), ruta completă (`Oradea → Budapesta → Viena → Köln → Rotterdam`), unde scade încărcătura și câți LDM devin liberi după fiecare descărcare.
2. **Calculul automat al Contribuției Nete la Grupaj (`Preț oferit - Cost incremental = Contribuție netă`)**:
   - Când apare o cerere de grupaj (ex. `Viena → Rotterdam · 3 LDM · +4°C · 550 €`), TMS-ul scade automat kilometrii suplimentari de ocol, taxele de drum (Maut AT/DE/NL) și timpul la rampă (`180 €`) și afișează direct profitul net generat (`+370 €`).
3. **Generatorul 1-Click de Oferte Automate către Clienții de pe Coridor**:
   - Când o remorcă are `4.2 LDM` liberi între Viena și Rotterdam, dispecerul nu mai scrie manual 15 mesaje pe WhatsApp sau e-mail, ci trimite cu un singur click linkul unic de ofertare către clienții recurenți de pe acel coridor.
4. **Simulatorul de Schimb de Remorci (`Smart Trailer Swap`)**:
   - Calculează automat punctul optim de întâlnire (ex. `Autohof Hegyeshalom M1` sau `Autohof Neumarkt A3`), decalajul de așteptare în minute și încadrarea în programul legal de tahograf al ambilor șoferi.

---

## 2. Ce informații lipsesc din interfața Planning (din conceptele vizuale inițiale) și au fost adăugate în aplicație?

În schițele vizuale inițiale (care sunt excelente prin claritate și simplitate), lipseau **5 indicatori critici în transportul frigorific de grupaj**, pe care i-am integrat în aplicație fără a încărca interfața:

1. **Tonajul util disponibil și sarcina pe axă (nu doar LDM!)**:
   - O remorcă frigorifică poate avea `5.4 LDM` liberi pe podea, dar dacă marfa deja încărcată cântărește `19.5 tone`, mai poate prelua legal doar `2.5 tone`. În TMS am afișat simultan atât `LDM liberi`, cât și `Tonaj disponibil (t)`.
2. **Poziția peretelui despărțitor mobil (Bulkhead Bi-Temp) și cele 2 zone de temperatură**:
   - La remorcile Bi-Temp (`Zona 1 Față: -18°C` vs. `Zona 2 Spate: +4°C`), spațiul liber utilizabil pentru grupaj pe parcurs se află în **Zona 2 (spre ușile rampei)**. Am inclus diagrama 2D a remorcii cu ambele camere de temperatură.
3. **Ordinea de încărcare/descărcare LIFO (Last-In, First-Out)**:
   - Nu poți încărca la Viena o marfă care descarcă la Rotterdam în spatele unei mărfi care trebuie descărcată mai devreme la Köln, decât dacă există culoar sau transpaletizare permisă.
4. **Orele de conducere rămase în Tahograf & Regimul Echipaj (1 șofer vs. 2 șoferi)**:
   - Adăugate direct pe fiecare rând din Planning-ul pe 7 zile (`ex: Condus rămas azi: 4.5h / Săpt: 28h`).
5. **Regimul de schimb de paleți (Euro-paleți) și înălțimea paleților (Stivuibil / Nestivuibil)**.

---

## 3. Ce operațiuni consumă cel mai mult timp în prezent?

1. **Recalcularea manuală a spațiului după descărcări parțiale**: verificarea comenzilor din fiecare camion pentru a ști câți LDM și câte tone rămân libere pe segmentul 2 sau 3 al cursei.
2. **Coordonarea telefonică a schimburilor de remorci (Trailer Swap)**: zeci de apeluri între dispecer și cei doi șoferi pentru a estima unde se întâlnesc, cine ajunge primul și câte ore de condus mai are fiecare.
3. **Ofertarea manuală a spațiului rămas gol**: redactarea e-mailurilor și mesajelor către clienți pentru cei 2–6 LDM rămași neutilizați și centralizarea ofertelor de preț.
4. **Căutarea repetitivă pe bursele de transport (TimoCom / Trans.eu)** pentru fiecare segment eliberat pe traseu.

---

## 4. Ce situații de grupaj și schimb de remorci trebuie testate?

### A. Situații de Grupaj Frigo Bi-Temp:
- **Grupaj în cascadă (Multi-Pick / Multi-Drop)**: Remorca pleacă din Oradea aproape plină (`12.4 / 13.6 LDM`), descarcă parțial la Viena (`-4.2 LDM`), încarcă la Viena `3.0 LDM` spre Rotterdam și mai rămâne cu `1.2 LDM` pe care TMS-ul îi ofertează automat în continuare.
- **Separare Bi-Temp `-18°C` + `+4°C`**: Verificarea compatibilității temperaturii cerute de client cu temperatura setată în Zona 2 a remorcii.

### B. Cele 4 Scenarii Obligatorii în Modulul `Smart Trailer Swap`:
1. **Două tractoare schimbă reciproc remorcile (`Swap Reciproc A ↔ B`)**: Tractorul de export din Oradea predă remorca la Hegyeshalom (HU/AT) unui tractor care vine din Germania cu o remorcă de Oradea.
2. **Un tractor preia o remorcă de la alt tractor (`Preluare Unilaterală / Drop & Hook`)**: Un tractor al cărui șofer intră în pauză de 11h/45h predă remorca unui tractor solo disponibil în apropiere.
3. **Un tractor cu echipaj de doi șoferi preia o remorcă pentru a continua traseul mai rapid (`Relay Echipaj 2x`)**: Salvează livrările urgente (Pharma / Fresh) cu respectarea timpilor legali din Reg. CE 561/2006 (program extins de echipaj).
4. **O remorcă este eliberată mai devreme pentru un client sau o încărcare viitoare (`Early Trailer Release`)**.

În toate cele 4 scenarii, dispecerul poate selecta independent pentru fiecare tractor una dintre cele **4 opțiuni post-schimb**:
1. *Revenire la baza din Oradea.*
2. *Revenire pe direcția din care a venit.*
3. *Deplasare către altă destinație, inclusiv cu remorcă goală.*
4. *Continuarea traseului și descărcarea remorcii nou primite, conform instrucțiunilor TMS.*

---

## 5. Ce reguli și excepții obligatorii trebuie respectate de TMS?

1. **Regula Obligatorie Soft-Lock la Ofertele Clienților**:
   - Dacă un client trimite o ofertă pentru `3 LDM` din cei `4,2 LDM` disponibili, **TMS-ul NU blochează definitiv spațiul până la acceptarea dispecerului**, dar afișează o **avertizare de conflict** dacă între timp apare o altă comandă/ofertă incompatibilă (ex. `2,4 LDM`).
   - După apăsarea butonului **Acceptă**, comanda intră automat în Planning, spațiul disponibil se recalculează pe fiecare segment (`4,2 → 1,2 LDM`), iar sistemul continuă să caute marfă pentru capacitatea rămasă.
2. **Regula de Dublă Confirmare la Smart Trailer Swap**:
   - Niciun schimb de remorci nu modifică traseele oficiale fără: **(a)** Confirmarea cu ambii șoferi + **(b)** Aprobarea dispecerului în TMS.
3. **Regula de Compatibilitate Tehnică și Legală**:
   - Verificare automată a orelor de tahograf, a compatibilității cuplei (standard/mega), a alimentării agregatului frigorific și a ferestrelor de livrare (SLA) ale mărfurilor aflate deja pe remorcă.

---

## 6. Ce funcții trebuie dezvoltate primele? (Ordinea Recomandată MVP → Produs SaaS)

### Etapa 1 — Nucleul Operațional Blue Trans (Săptămânile 1–4)
- **Control Center + Planning pe 7 zile** (remorci, tractoare, șoferi, descărcări).
- **Motorul de calcul automat LDM + Tonaj pe segmente și 2 zone de temperatură (Bi-Temp)**.
- **Drag & Drop** pentru mutarea rapidă a comenzilor și simularea variantelor.
- **Integrarea Cargo Track API** (poziție GPS live, viteză, ETA) și citirea timpilor de tahograf.

### Etapa 2 — Planning-ul care Generează Oportunități Comerciale (Săptămânile 5–8)
- **Alertele de spațiu neutilizat** + **Generatorul automat de E-mail & Link Portal Client**.
- **Inbox-ul Dispecerului (`Acceptă / Contraofertă / Refuză`)** cu **Regula Soft-Lock** și calculul contribuției nete.
- **Disponibilități viitoare pe 7 zile** (prognoza camioanelor care devin libere pe regiuni).

### Etapa 3 — Diferențiatorul Comercial & Scalare SaaS (Săptămânile 9–12)
- **Modulul complet `Smart Trailer Swap`** (cele 4 scenarii obligatorii + cele 4 opțiuni post-swap per tractor + propunerea punctelor de întâlnire).
- **Integrarea cu bursele de transport (TimoCom / Trans.eu)** și arhitectura Multi-Tenant pentru comercializarea **Sferle TMS Pro** către alte companii de transport.

