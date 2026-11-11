import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Repeat,
  ShieldCheck,
  Rocket,
  FileSpreadsheet,
  Target,
} from 'lucide-react';

export const AnalysisAndScenariosView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="tahoe-glass rounded-[28px] p-5 shadow-xl">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
          ANALIZĂ TEHNICĂ & OPERAȚIONALĂ · BLUE TRANS SPEDITION
        </span>
        <h1 className="text-2xl font-bold text-white mt-1.5">
          Analiza Funcționalităților, Reguli Operaționale, Prioritizare MVP și Scenarii Reale de Testare
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Obiectiv: Creșterea eficienței și rentabilității flotei frigorifice Blue Trans Spedition.
        </p>
      </div>

      {/* The 6 Core Questions from Blue Trans Spedition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Ce funcții ar ajuta efectiv dispecerii în fiecare zi */}
        <div className="tahoe-glass rounded-[24px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase">
            <CheckCircle2 className="w-4 h-4" />
            1. Ce funcții ajută efectiv dispecerii în fiecare zi
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong className="text-white">• Vederea „dintr-o privire” a LDM pe segmente (fără a deschide remorca):</strong> Bara vizuală de 13.6 LDM care arată instant unde se eliberează spațiu după prima descărcare (ex: după Viena se eliberează 4.2 LDM spre Rotterdam).
            </li>
            <li>
              <strong className="text-white">• Calculatorul de Contribuție Netă la Grupaj:</strong> Când apare o marfă de 3 LDM cu 550 €, dispecerul vede în 2 secunde costul incremental real (km de ocol + taxe drum AT/DE/MAUT + timp rampă = 180 €) și marja netă (+370 €).
            </li>
            <li>
              <strong className="text-white">• Generatorul 1-Click de Oferte către Clienții de pe Coridor:</strong> Elimină zecile de mesaje manuale pe WhatsApp/e-mail când rămân 3–5 LDM liberi.
            </li>
            <li>
              <strong className="text-white">• Simulatorul Drag & Drop cu verificare Tahograf + Temperatură:</strong> Previne alocarea unei comenzi pe un camion al cărui șofer rămâne fără program de condus înainte de rampa de descărcare.
            </li>
          </ul>
        </div>

        {/* 2. Ce informații lipsesc din interfața Planning (din schițele inițiale) */}
        <div className="tahoe-glass rounded-[24px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase">
            <AlertTriangle className="w-4 h-4" />
            2. Ce informații lipseau din interfața inițială (și le-am adăugat)
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong className="text-white">• Tonajul util disponibil și sarcina pe axă (nu doar LDM!):</strong> O remorcă poate avea 5.4 LDM liberi pe podea, dar dacă marfa existentă are 19.5 tone, mai poate încărca legal doar 2.5 tone. Am adăugat bară dublă: <code className="text-blue-300">LDM + Tonaj (t)</code>.
            </li>
            <li>
              <strong className="text-white">• Poziția Peretelui Despărțitor (Bulkhead Bi-Temp) și Ordinea LIFO:</strong> La grupajul frigo cu 2 temperaturi (ex: -18°C în față, +4°C în spate), marfa nou încărcată trebuie să fie compatibilă cu zona din spate (ușile rampei) și cu ordinea descărcărilor (Last-In, First-Out).
            </li>
            <li>
              <strong className="text-white">• Timpii de conducere rămași din Tahograf & Regimul Echipaj (1x vs 2x șoferi):</strong> Fără orele rămase azi/săptămânal, un traseu care pare fezabil pe hartă poate bloca marfa 9h/11h în parcare.
            </li>
            <li>
              <strong className="text-white">• Schimbul de paleți (Euro-paleți) și înălțimea utilă:</strong> Esențial pentru clienții din Austria/Germania/Olanda.
            </li>
          </ul>
        </div>

        {/* 3. Ce operațiuni consumă cel mai mult timp în prezent */}
        <div className="tahoe-glass rounded-[24px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase">
            <Clock className="w-4 h-4" />
            3. Ce operațiuni consumă cel mai mult timp în prezent
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong className="text-white">• Recalcularea manuală a spațiului după descărcări parțiale:</strong> Dispecerul trebuie să verifice în tabele/foi fiecare comandă de pe camion ca să știe câți LDM rămân liberi între Viena și Köln.
            </li>
            <li>
              <strong className="text-white">• Sincronizarea pentru Schimbul de Remorci (Trailer Swap):</strong> Apeluri telefonice repetate către 2 șoferi, verificat poziția pe GPS (Cargo Track), estimat „din ochi” unde se întâlnesc pe M1/A3 și cât așteaptă unul după celălalt.
            </li>
            <li>
              <strong className="text-white">• Trimiterea manuală de e-mailuri de disponibilitate și negocierea prețului:</strong> Compunerea mesajelor către clienți și așteptarea răspunsurilor nesistematizate.
            </li>
            <li>
              <strong className="text-white">• Căutarea manuală pe burse (TimoCom / Trans.eu) pentru fiecare segment gol:</strong> Necesită filtre repetate pe fiecare oraș de tranzit.
            </li>
          </ul>
        </div>

        {/* 4. Ce situații de grupaj sau schimb de remorci trebuie testate */}
        <div className="tahoe-glass rounded-[24px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase">
            <Repeat className="w-4 h-4" />
            4. Ce situații de grupaj și schimb de remorci trebuie testate
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong className="text-white">• Grupaj în cascadă (Multi-Drop & Multi-Pick):</strong> Camionul pleacă din Oradea cu 3 partide, descarcă la Viena 4.2 LDM, încarcă la Viena 3.0 LDM pentru Rotterdam, iar pentru restul de 1.2 LDM mai ia 3 paleți din Köln.
            </li>
            <li>
              <strong className="text-white">• Cele 4 scenarii obligatorii de Smart Trailer Swap:</strong> (A) Schimb reciproc pe axa RO–Vest (Hegyeshalom), (B) Preluare unilaterală de către un tractor solo, (C) Preluare în regim releu de către un echipaj de 2 șoferi pentru salvare SLA, (D) Eliberare anticipată a remorcii la rampă.
            </li>
            <li>
              <strong className="text-white">• Conflictul de oferte simultane (Soft-Lock Test):</strong> Doi clienți primesc linkul pentru 4.2 LDM liberi și trimit oferte de 3.0 LDM, respectiv 2.4 LDM în același timp.
            </li>
          </ul>
        </div>

        {/* 5. Ce reguli și excepții trebuie respectate */}
        <div className="tahoe-glass rounded-[24px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase">
            <ShieldCheck className="w-4 h-4" />
            5. Ce reguli și excepții obligatorii trebuie respectate
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong className="text-white">• Regula Soft-Lock la Oferte:</strong> O propunere de la client (ex. 3 LDM din 4.2 LDM) NU blochează definitiv spațiul până la acceptarea dispecerului, dar afișează alertă de conflict dacă apare o comandă incompatibilă.
            </li>
            <li>
              <strong className="text-white">• Regula Aprobării Schimbului de Remorci:</strong> Niciun Trailer Swap nu devine activ în Planning fără: (1) Confirmarea ambilor șoferi + (2) Aprobarea dispecerului + (3) Selecția explicită a direcției post-schimb (1 din cele 4 opțiuni) pentru fiecare tractor.
            </li>
            <li>
              <strong className="text-white">• Regula LIFO și Incompatibilitate Mărfuri/Temperaturi:</strong> Nu se blochează marfa care descarcă la Köln în spatele mărfii care descarcă la Rotterdam; nu se combină temperaturi incompatibile în aceeași cameră.
            </li>
          </ul>
        </div>

        {/* 6. Ce funcții ar trebui dezvoltate primele (Ordinea MVP) */}
        <div className="tahoe-glass rounded-[24px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase">
            <Rocket className="w-4 h-4" />
            6. Ce funcții trebuie dezvoltate primele (Roadmap MVP → SaaS)
          </div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <li>
              <strong className="text-emerald-300">• Faza 1 (Săptămânile 1–4 — Nucleul Operațional):</strong> Control Center + Planning pe 7 zile + Calcul automat LDM & Tonaj pe segmente și 2 zone de temperatură + Drag & Drop + Integrare Cargo Track API (GPS).
            </li>
            <li>
              <strong className="text-blue-300">• Faza 2 (Săptămânile 5–8 — Motorul Comercial):</strong> Generatorul automat de Oferte (E-mail + Link Portal Client) + Inbox Dispecer (Acceptă / Contraofertă / Refuză cu Regula Soft-Lock) + Radar Disponibilități Viitoare.
            </li>
            <li>
              <strong className="text-amber-300">• Faza 3 (Săptămânile 9–12 — Diferențiatorul Smart Swap & AI):</strong> Simulatorul Smart Trailer Swap cu date de tahograf și cele 4 scenarii obligatorii + Conectare API Burse de Transport & pregătire Multi-Tenant SaaS.
            </li>
          </ul>
        </div>
      </div>

      {/* 4 Concrete Real-World Blue Trans Test Scenarios */}
      <div className="tahoe-glass rounded-[28px] p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <Target className="w-5 h-5 text-blue-400" />
          <span>
            Scenarii Reale din Activitatea BLUE TRANS Pregătite pentru Testarea Software-ului
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="tahoe-card-inner rounded-2xl p-4 space-y-1.5">
            <div className="tabular-nums font-bold text-blue-400">
              SCENARIUL DE TEST #1 · GRUPAJ BI-TEMP DINAMIC PE CORIDORUL HU → AT → DE → NL
            </div>
            <div className="font-bold text-white text-sm">
              Remorca BH 67 STS (Oradea → Budapesta → Viena → Köln → Rotterdam)
            </div>
            <p className="text-slate-300 leading-relaxed">
              Pleacă din Oradea cu 12.4 LDM ocupați (5.2 LDM la -18°C în Zona 1 și 7.2 LDM la +4°C în Zona 2). La Viena descarcă 4.2 LDM (+4°C). TMS-ul detectează automat că pe segmentul Viena → Köln → Rotterdam rămân liberi 5.4 LDM (4.2 LDM în Zona 2 fără mutarea peretelui), trimite ofertă la Agrana Viena, primește ofertă de 3.0 LDM la 550 €, aplică regula Soft-Lock și după acceptare recalculează restul la 1.2 LDM liberi.
            </p>
          </div>

          <div className="tahoe-card-inner rounded-2xl p-4 space-y-1.5">
            <div className="tabular-nums font-bold text-amber-400">
              SCENARIUL DE TEST #2 · SMART TRAILER SWAP LA GRANIȚA HU/AT (HEGYESHALOM)
            </div>
            <div className="font-bold text-white text-sm">
              Schimb reciproc între BH 46 STS (Export) și BH 49 STS (Import spre Oradea)
            </div>
            <p className="text-slate-300 leading-relaxed">
              Șoferul de pe BH 46 STS mai are doar 4h 30m de condus. TMS-ul identifică prin Cargo Track API că tractorul BH 49 STS (cu șofer odihnit după pauza de 11h) vine dinspre Viena cu o remorcă de Oradea. Propune întâlnire la Autohof Hegyeshalom (decalaj ETA 7 minute). După confirmarea șoferilor și aprobarea dispecerului, tractorul 1 revine la baza din Oradea (Opțiunea 1), iar tractorul 2 continuă spre Rotterdam (Opțiunea 4).
            </p>
          </div>

          <div className="tahoe-card-inner rounded-2xl p-4 space-y-1.5">
            <div className="tabular-nums font-bold text-emerald-400">
              SCENARIUL DE TEST #3 · RELEU CU ECHIPAJ DE 2 ȘOFERI ÎN GERMANIA (A3)
            </div>
            <div className="font-bold text-white text-sm">
              Preluare remorcă urgentă BH 69 STS de către echipajul dublu B 507 STS
            </div>
            <p className="text-slate-300 leading-relaxed">
              Remorca BH 69 STS (Szolnok → München → Frankfurt → Almere) riscă să întârzie la rampa din Frankfurt din cauza expirării programului șoferului unic. TMS-ul simulează preluarea remorcii în Autohof Neumarkt (A3) de către un tractor cu 2 șoferi (echipaj), salvând 9.5 ore de staționare și evitând penalități SLA de 800 €.
            </p>
          </div>

          <div className="tahoe-card-inner rounded-2xl p-4 space-y-1.5">
            <div className="tabular-nums font-bold text-sky-400">
              SCENARIUL DE TEST #4 · VÂNZARE ANTICIPATĂ DISPONIBILITĂȚI VIITOARE (NL / SE)
            </div>
            <div className="font-bold text-white text-sm">
              Alocarea returului pentru BH 75 STS și BH 74 STS cu 24h înainte de descărcare
            </div>
            <p className="text-slate-300 leading-relaxed">
              Cu 24h înainte ca BH 74 STS să finalizeze descărcarea în Stuttgart și BH 75 STS în Stockholm, modulul „Disponibilități Viitoare” listează automat ferestrele și regiunile unde camioanele devin 100% libere (13.6 LDM) și declanșează oferte automate către clienții de retur spre România/Ungaria.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

