import React, { useEffect, useState } from 'react';
import {
  Printer,
  FileCheck2,
  Receipt,
  Truck,
  ThermometerSnowflake,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface PrintableTripDocData {
  docType: 'CMR' | 'INVOICE';
  referenceNo: string; // e.g. 'CMR-2026-9023' or 'BTS-2026-4418'
  clientName: string;
  clientVat?: string;
  fromCity: string;
  toCity: string;
  cargoDesc: string;
  ldm: number;
  weightTons: number;
  tempRegime: string;
  tractorPlate: string;
  trailerPlate: string;
  driverName: string;
  revenueEur: number;
  groupageBonusEur?: number;
  directCostsEur?: number;
  issueDate?: string;
  dueDate?: string;
}

interface CmrAndInvoiceModalProps {
  docData: PrintableTripDocData | null;
  onClose: () => void;
  hideInvoice?: boolean;
}

export const CmrAndInvoiceModal: React.FC<CmrAndInvoiceModalProps> = ({
  docData,
  onClose,
  hideInvoice = false,
}) => {
  const [activeDocTab, setActiveDocTab] = useState<'CMR' | 'INVOICE'>(
    hideInvoice ? 'CMR' : docData?.docType || 'CMR'
  );

  useEffect(() => {
    if (docData) {
      setActiveDocTab(hideInvoice ? 'CMR' : docData.docType);
      document.body.classList.add('modal-scroll-locked');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    };
  }, [docData, hideInvoice]);

  if (!docData) return null;

  const palletsEstimate = Math.max(1, Math.round(docData.ldm * 2.5));
  const issueDateStr = docData.issueDate || '10.11.2026';
  const dueDateStr = docData.dueDate || '10.12.2026 (30 zile)';
  const vatCodeStr = docData.clientVat || 'ATU19482105 / Intracomunitar';

  return (
    <div
      onClick={onClose}
      className="modal-backdrop-lock fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overscroll-contain print:static print:p-0 print:bg-transparent"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tahoe-glass-elevated rounded-[28px] w-[min(96vw,896px)] h-[min(90dvh,760px)] p-5 sm:p-6 flex flex-col gap-4 shadow-2xl border border-white/20 overflow-clip print:w-full print:h-auto print:overflow-visible"
      >
        {/* Top Action Bar (pinned — all tabs & actions fit on 1 row on mobile & PC) */}
        <div className="shrink-0 flex flex-nowrap items-center justify-between gap-1.5 sm:gap-3 border-b border-white/15 pb-3.5">
          <div
            role="tablist"
            aria-label="Tip document transport"
            className="min-w-0 flex-1 grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-2 sm:flex-nowrap sm:overflow-x-auto no-scrollbar"
            onKeyDown={(e) => {
              if (hideInvoice) return;
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const next = activeDocTab === 'CMR' ? 'INVOICE' : 'CMR';
              setActiveDocTab(next);
              const targetEl = e.currentTarget.querySelector<HTMLButtonElement>(
                `[data-doc-tab="${next}"]`
              );
              targetEl?.focus();
            }}
          >
            <button
              id="cmr-modal-tab-cmr"
              type="button"
              role="tab"
              data-doc-tab="CMR"
              aria-selected={activeDocTab === 'CMR'}
              tabIndex={activeDocTab === 'CMR' ? 0 : -1}
              onClick={(e) => {
                setActiveDocTab('CMR');
                e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}
              className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-extrabold whitespace-nowrap sm:shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer tahoe-btn-secondary text-white/85"
            >
              <FileCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden truncate">CMR</span>
              <span className="hidden sm:inline">Scrisoare CMR Internațional</span>
            </button>
            {!hideInvoice && (
              <button
                id="cmr-modal-tab-invoice"
                type="button"
                role="tab"
                data-doc-tab="INVOICE"
                aria-selected={activeDocTab === 'INVOICE'}
                tabIndex={activeDocTab === 'INVOICE' ? 0 : -1}
                onClick={(e) => {
                  setActiveDocTab('INVOICE');
                  e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }}
                className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-extrabold whitespace-nowrap sm:shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer tahoe-btn-secondary text-white/85"
              >
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="sm:hidden truncate">Factură</span>
                <span className="hidden sm:inline">Factură Proformă / Fiscală (EUR)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[38px] sm:min-h-0 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-[11px] sm:text-xs font-extrabold flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shadow-md cursor-pointer shrink-0"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">PDF</span>
              <span className="hidden sm:inline">Printează / Export PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Închide fereastra CMR / Factură"
              className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          role="tabpanel"
          aria-labelledby={activeDocTab === 'CMR' ? 'cmr-modal-tab-cmr' : 'cmr-modal-tab-invoice'}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] pr-0.5 print:overflow-visible"
        >

        {/* =================================================================
            VIEW 1: INTERNATIONAL CMR CONSIGNMENT NOTE (RUBRIQUES 1–24)
        ================================================================== */}
        {activeDocTab === 'CMR' && (
          <div className="tahoe-card-inner rounded-2xl p-5 border-2 border-rose-500/40 space-y-4 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-rose-500/35 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold uppercase">
                  EXEMPLAR PENTRU EXPEDITOR / TRANSPORTATOR · CONVENȚIA CMR
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                  SCRISOARE DE TRANSPORT INTERNAȚIONAL (CMR)
                </h2>
                <p className="text-[11px] text-white/65">
                  Acest transport este supus, cu toate clauzele contrare, Convenției referitoare la contractul de transport internațional de mărfuri pe șosele (CMR).
                </p>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-[10px] uppercase font-bold text-white/55">
                  SERIE & NUMĂR CMR
                </div>
                <div className="text-base font-extrabold text-[#64D2FF]">
                  RO-BTS-{docData.referenceNo}
                </div>
                <div className="text-[11px] text-white/65">
                  Data emiterii: {issueDateStr}
                </div>
              </div>
            </div>

            {/* Boxes 1, 2, 16 (Sender, Consignee, Carrier) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-white/15 bg-white/[0.03] space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-rose-300">
                  1. Expeditor (Nume, adresă, țară)
                </div>
                <div className="font-extrabold text-white text-sm">
                  {docData.clientName}
                </div>
                <div className="text-[11px] text-white/70">
                  Punct Încărcare: {docData.fromCity}
                </div>
                <div className="text-[10px] text-white/55">
                  Cod TVA / VAT: {vatCodeStr}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-white/15 bg-white/[0.03] space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-rose-300">
                  2. Destinatar (Nume, adresă, țară)
                </div>
                <div className="font-extrabold text-white text-sm">
                  Hub Logistic / Depozit Frigo {docData.toCity}
                </div>
                <div className="text-[11px] text-white/70">
                  Punct Descărcare: {docData.toCity}
                </div>
                <div className="text-[10px] text-white/55">
                  Recepție Rampa Temperatură Controlată
                </div>
              </div>

              <div className="p-3 rounded-xl border border-white/15 bg-white/[0.03] space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-[#64D2FF]">
                  16. Transportator (Nume, adresă, CUI)
                </div>
                <div className="font-extrabold text-white text-sm">
                  SC BLUE TRANS SPEDITION SRL
                </div>
                <div className="text-[11px] text-white/70">
                  Calea Borșului nr. 45, Oradea, Jud. Bihor (RO)
                </div>
                <div className="text-[10px] text-[#30D158] font-bold">
                  CUI: RO14892310 · Licență UE: LTP-084912
                </div>
              </div>
            </div>

            {/* Boxes 3, 4 & 17 (Loading, Unloading, Vehicle Assembly) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-white/15 bg-white/[0.03]">
                <div className="text-[10px] font-extrabold uppercase text-white/55">
                  3. Locul și data încărcării mărfii
                </div>
                <div className="font-bold text-white mt-0.5">
                  {docData.fromCity} · {issueDateStr}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-white/15 bg-white/[0.03]">
                <div className="text-[10px] font-extrabold uppercase text-white/55">
                  4. Locul prevăzut pentru livrarea mărfii
                </div>
                <div className="font-bold text-white mt-0.5">
                  {docData.toCity} (Conform ETA TMS)
                </div>
              </div>
              <div className="p-3 rounded-xl border border-white/15 bg-white/[0.03]">
                <div className="text-[10px] font-extrabold uppercase text-[#64D2FF]">
                  23. Ansamblu Rutier (Cap Tractor + Semiremorcă) & Șofer
                </div>
                <div className="font-extrabold text-white mt-0.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#0A84FF]" />
                  <span>
                    {docData.tractorPlate} + {docData.trailerPlate}
                  </span>
                </div>
                <div className="text-[11px] text-white/70">
                  Șofer titular: <strong>{docData.driverName}</strong>
                </div>
              </div>
            </div>

            {/* Boxes 6–12 (Cargo Description, Pallets, Weight, LDM, Temperature) */}
            <div className="rounded-xl border border-white/15 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/10 text-white/75 uppercase text-[10px]">
                    <th className="py-2.5 px-3">6–9. Mărci, Număr Colete & Natura Mărfii</th>
                    <th className="py-2.5 px-3">Nr. Europaleți</th>
                    <th className="py-2.5 px-3">11. Greutate Brută (T)</th>
                    <th className="py-2.5 px-3">12. Spațiu Podea (LDM)</th>
                    <th className="py-2.5 px-3">13. Instrucțiuni Temperatură Frigo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="py-3 px-3 font-bold text-white">
                      {docData.cargoDesc}
                      <div className="text-[10px] font-normal text-white/60">
                        Marfă paletizată · Schimb paleți EUR: Nu · Sigiliu Frigo activ
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums font-bold text-white">
                      {palletsEstimate} pal EUR (80×120)
                    </td>
                    <td className="py-3 px-3 tabular-nums font-extrabold text-[#FF9F0A]">
                      {docData.weightTons.toFixed(1)} Tone ({Math.round(docData.weightTons * 1000)} kg)
                    </td>
                    <td className="py-3 px-3 tabular-nums font-extrabold text-[#64D2FF]">
                      {docData.ldm.toFixed(1)} LDM (din 13.6m)
                    </td>
                    <td className="py-3 px-3 tabular-nums font-extrabold text-[#30D158]">
                      <span className="inline-flex items-center gap-1">
                        <ThermometerSnowflake className="w-3.5 h-3.5" />
                        {docData.tempRegime} (Termograf Cargo Track)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Boxes 22, 23, 24 (Stamps & Signatures) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-dashed border-white/25 min-h-[82px] flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-white/60">
                  22. Semnătura și ștampila expeditorului
                </span>
                <span className="text-[11px] font-bold text-white/80">
                  {docData.clientName} ({docData.fromCity})
                </span>
              </div>
              <div className="p-3 rounded-xl border border-dashed border-[#0A84FF]/45 min-h-[82px] flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-[#64D2FF]">
                  23. Semnătura și ștampila transportatorului
                </span>
                <div className="text-[11px] font-extrabold text-white">
                  SC BLUE TRANS SPEDITION SRL · {docData.driverName}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-dashed border-white/25 min-h-[82px] flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-white/60">
                  24. Marfa primită — Semnătura și ștampila destinatarului
                </span>
                <span className="text-[11px] font-bold text-[#30D158] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmare Electronică e-CMR / POD
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            VIEW 2: PROFORMA / FISCAL INVOICE (EUR)
        ================================================================== */}
        {activeDocTab === 'INVOICE' && !hideInvoice && (
          <div className="tahoe-card-inner rounded-2xl p-5 border border-white/15 space-y-4 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-3.5">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40 text-[10px] font-extrabold uppercase">
                  FACTURĂ TRANSPORT INTERNAȚIONAL DE MARFĂ (EUR)
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                  FACTURĂ FISCALĂ SERIA BTS NR. {docData.referenceNo}
                </h2>
                <p className="text-[11px] text-white/65">
                  Anexă obligatorie: Scrisoare CMR semnată + Grafic temperatură agregat frigo Bi-Temp Cargo Track.
                </p>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-[11px] text-white/70">
                  Data emiterii: <strong>{issueDateStr}</strong>
                </div>
                <div className="text-[11px] text-white/70">
                  Scadență plată: <strong>{dueDateStr}</strong>
                </div>
                <div className="text-[11px] text-[#30D158] font-bold mt-0.5">
                  Monedă facturare: EUR (€)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-white/15 bg-white/[0.03] space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-[#64D2FF]">
                  FURNIZOR (PRESTATOR TRANSPORT)
                </div>
                <div className="font-extrabold text-white text-sm">
                  SC BLUE TRANS SPEDITION SRL
                </div>
                <div className="text-white/70">
                  CUI: RO14892310 · Reg. Com.: J05/1142/2018
                </div>
                <div className="text-white/70">
                  Sediul: Calea Borșului nr. 45, Oradea, Jud. Bihor, România
                </div>
                <div className="text-[#30D158] font-bold tabular-nums pt-1">
                  IBAN EUR: RO49 BTRL EURC RT04 8291 0401 (Banca Transilvania) · SWIFT: BTRLRO22
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/15 bg-white/[0.03] space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-[#FF9F0A]">
                  CLIENT (BENEFICIAR)
                </div>
                <div className="font-extrabold text-white text-sm">
                  {docData.clientName}
                </div>
                <div className="text-white/70">
                  Cod TVA Intracomunitar (VIES): <strong>{vatCodeStr}</strong>
                </div>
                <div className="text-white/70">
                  Coridor facturat: <strong>{docData.fromCity} → {docData.toCity}</strong>
                </div>
                <div className="text-white/70">
                  Ansamblu rutier: <strong>{docData.tractorPlate} + {docData.trailerPlate}</strong> ({docData.driverName})
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/15 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/10 text-white/75 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Nr.</th>
                    <th className="py-2.5 px-3">Denumire Servicii Transport & Detalii Cursă</th>
                    <th className="py-2.5 px-3">Cantitate / LDM</th>
                    <th className="py-2.5 px-3">Valoare Netă (EUR)</th>
                    <th className="py-2.5 px-3">Regim TVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="py-3 px-3 tabular-nums font-bold text-white">1</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">
                        Transport rutier internațional frigorific: {docData.fromCity} → {docData.toCity}
                      </div>
                      <div className="text-[11px] text-white/65">
                        Ansamblu: {docData.tractorPlate} + {docData.trailerPlate} · Marfă: {docData.cargoDesc} · {docData.weightTons.toFixed(1)}T · Regim termic: {docData.tempRegime}
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums font-bold text-white">
                      1 cursă ({docData.ldm.toFixed(1)} LDM)
                    </td>
                    <td className="py-3 px-3 tabular-nums font-extrabold text-white">
                      {docData.revenueEur.toFixed(2)} €
                    </td>
                    <td className="py-3 px-3 text-[11px] text-white/70">
                      0% (Taxare inversă intracomunitară)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/15">
              <div className="text-[11px] text-white/65">
                Scutit cu drept de deducere / Taxare inversă conform Art. 278 alin. (2) Cod Fiscal (Dir. 2006/112/CE).
              </div>
              <div className="text-right tabular-nums">
                <div className="text-[11px] text-white/65">
                  Total Net de Plată:
                </div>
                <div className="text-xl font-extrabold text-[#30D158]">
                  {docData.revenueEur.toFixed(2)} EUR
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
