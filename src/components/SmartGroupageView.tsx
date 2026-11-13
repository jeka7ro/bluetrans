import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  CalendarClock,
  CheckCircle2,
  Building2,
  Globe,
  PackagePlus,
  Mail,
  GitCompare,
  ArrowLeftRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  CargoOrder,
  SmartGroupageMatch,
  FutureAvailabilitySlot,
  TrailerUnit,
  MULTI_VARIANT_GROUPAGE_ANALYSES,
  CARGO_TRANSFER_OPPORTUNITIES,
  CargoTransferOpportunity,
  GroupageCandidateVariant,
  formatCountryBadge,
} from '../data/mockData';
import type { HourlyPlanningCard } from './Planning7DaysView';
import {
  buildDynamicGroupageVariants,
  computeDynamicFutureAvailabilitySlots,
  detectDynamicCargoTransfers,
} from '../utils/smartLogisticsEngine';

interface SmartGroupageViewProps {
  trailers: TrailerUnit[];
  matches: SmartGroupageMatch[];
  futureSlots: FutureAvailabilitySlot[];
  unassignedOrders?: CargoOrder[];
  planningCards?: HourlyPlanningCard[];
  exchangeMatches?: SmartGroupageMatch[];
  isScanningExchanges?: boolean;
  onScanExchanges?: () => void;
  onConfirmGroupageVariant?: (variant: GroupageCandidateVariant) => void;
  onApproveCargoTransfer?: (xfer: CargoTransferOpportunity) => void;
  onAcceptGroupageMatch: (match: SmartGroupageMatch) => void;
  onNavigateToOffers: () => void;
}

export const SmartGroupageView: React.FC<SmartGroupageViewProps> = ({
  trailers,
  matches,
  futureSlots,
  unassignedOrders = [],
  planningCards = [],
  exchangeMatches = [],
  isScanningExchanges = false,
  onScanExchanges,
  onConfirmGroupageVariant,
  onApproveCargoTransfer,
  onAcceptGroupageMatch,
  onNavigateToOffers,
}) => {
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [acceptedMatchIds, setAcceptedMatchIds] = useState<string[]>([]);
  const [selectedOrderForComparison, setSelectedOrderForComparison] =
    useState<string>('CMD-951');
  const [confirmedVariantId, setConfirmedVariantId] = useState<string | null>(null);
  const [approvedTransferIds, setApprovedTransferIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const combinedMatches = useMemo(() => {
    const seen = new Set<string>();
    const out: SmartGroupageMatch[] = [];
    for (const m of [...matches, ...exchangeMatches]) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [matches, exchangeMatches]);

  const filteredMatches =
    sourceFilter === 'ALL'
      ? combinedMatches
      : combinedMatches.filter((m) => m.sourceType === sourceFilter);

  const trailersWithUnusedSpace = trailers.filter((t) => t.freeLdm > 0);

  const comparisonOrderTabs = useMemo(() => {
    const defaults: { id: string; short: string; full: string; order?: CargoOrder }[] = [
      {
        id: 'CMD-951',
        short: 'CMD-951 · 3 LDM',
        full: 'CMD-951: Viena → Rotterdam (3 LDM)',
        order: unassignedOrders.find((o) => o.id === 'CMD-951'),
      },
      {
        id: 'CMD-954',
        short: 'CMD-954 · 2 LDM',
        full: 'CMD-954: München → Almere (2 LDM)',
        order: unassignedOrders.find((o) => o.id === 'CMD-954'),
      },
    ];
    for (const o of unassignedOrders) {
      if (o.id !== 'CMD-951' && o.id !== 'CMD-954') {
        defaults.push({
          id: o.id,
          short: `${o.id} · ${o.ldm} LDM`,
          full: `${o.id}: ${o.fromCity} → ${o.toCity} (${o.ldm} LDM)`,
          order: o,
        });
      }
    }
    return defaults.slice(0, 5);
  }, [unassignedOrders]);

  const selectedComparisonOrder = useMemo<CargoOrder>(() => {
    const found = unassignedOrders.find((o) => o.id === selectedOrderForComparison);
    if (found) return found;
    return {
      id: selectedOrderForComparison,
      client: 'Marfă Grupaj Prioritară',
      fromCity: selectedOrderForComparison === 'CMD-954' ? 'München' : 'Viena',
      fromCountry: selectedOrderForComparison === 'CMD-954' ? 'DE' : 'AT',
      toCity: selectedOrderForComparison === 'CMD-954' ? 'Almere' : 'Rotterdam',
      toCountry: 'NL',
      ldm: selectedOrderForComparison === 'CMD-954' ? 2.0 : 3.0,
      weightTons: selectedOrderForComparison === 'CMD-954' ? 3.2 : 4.5,
      pallets: selectedOrderForComparison === 'CMD-954' ? 5 : 8,
      stackable: true,
      palletExchange: false,
      tempReq: 4,
      tempZone: 'Flexibil',
      revenueEur: selectedOrderForComparison === 'CMD-954' ? 520 : 880,
      status: 'Nealocat',
      loadingWindow: 'Azi 17:00',
      deliveryDeadline: 'Mâine 12:00',
    };
  }, [unassignedOrders, selectedOrderForComparison]);

  const currentVariants: GroupageCandidateVariant[] = useMemo(
    () =>
      buildDynamicGroupageVariants(
        selectedComparisonOrder,
        trailers,
        MULTI_VARIANT_GROUPAGE_ANALYSES[selectedOrderForComparison]
      ),
    [selectedComparisonOrder, trailers, selectedOrderForComparison]
  );

  const transfers: CargoTransferOpportunity[] = useMemo(
    () =>
      detectDynamicCargoTransfers(trailers, CARGO_TRANSFER_OPPORTUNITIES).map((x) =>
        approvedTransferIds.includes(x.id)
          ? { ...x, status: 'Aprobat în Planning' as const }
          : x
      ),
    [trailers, approvedTransferIds]
  );

  const mergedFutureSlots = useMemo(
    () => computeDynamicFutureAvailabilitySlots(trailers, planningCards, futureSlots),
    [trailers, planningCards, futureSlots]
  );

  const [availHorizon, setAvailHorizon] = useState<number>(7);
  // Suportă atât sloturi datate ('10 Nov') cât și sloturi dinamice relative ('+2 zile')
  const DEMO_TODAY_DAY = 9;
  const slotOffsetDays = (s: { availableDate: string }) => {
    const rel = s.availableDate.match(/\+(\d+)\s*zile?/i);
    if (rel) return Number(rel[1]);
    const m = s.availableDate.match(/(\d{1,2})\s*Nov/i);
    return m ? Number(m[1]) - DEMO_TODAY_DAY : 0;
  };
  const visibleSlots = mergedFutureSlots.filter((s) => slotOffsetDays(s) <= availHorizon);
  const slotState = (status: string) =>
    status.startsWith('Eliberată')
      ? { label: 'Simulat', bg: 'rgba(191,90,242,0.18)', color: '#BF5AF2' }
      : status.startsWith('100%')
        ? { label: 'Estimat', bg: 'rgba(255,159,10,0.18)', color: '#FF9F0A' }
        : { label: 'Confirmat', bg: 'rgba(48,209,88,0.15)', color: '#30D158' };

  const handleConfirmVariant = (variant: GroupageCandidateVariant) => {
    setConfirmedVariantId(variant.id);
    onConfirmGroupageVariant?.(variant);
    setToast(
      `${variant.variantRank} pe remorca ${variant.trailerId} a fost CONFIRMATĂ și aplicată în Planning! Profit net estimat: +${variant.criterion8_estimatedProfitEur} €.`
    );
  };

  const handleApproveCargoTransfer = (xferId: string) => {
    const target = transfers.find((x) => x.id === xferId);
    setApprovedTransferIds((prev) => (prev.includes(xferId) ? prev : [...prev, xferId]));
    if (target) {
      onApproveCargoTransfer?.(target);
      setToast(
        `Transferul ${target.code} (${target.donorTrailerId} → ${target.receiverTrailerId} în ${target.transferHubCity}) a fost aprobat în Planning! Economie: +${target.netGainEur} €.`
      );
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header — single compact row on mobile, unchanged on desktop */}
      <div className="tahoe-glass rounded-[22px] sm:rounded-[28px] p-3 sm:p-6 flex flex-row items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-base sm:text-2xl font-bold text-white tracking-tight truncate">
          Grupaje &amp; disponibilități
        </h1>

        <button
          onClick={onNavigateToOffers}
          className="tahoe-btn-primary px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
        >
          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="sm:hidden">Oferte →</span>
          <span className="hidden sm:inline">Trimite Oferte Automate →</span>
        </button>
      </div>

      {toast && (
        <div className="tahoe-glass-elevated border-[#30D158]/40 text-white px-4 py-3 rounded-full text-xs sm:text-sm flex items-center justify-between gap-3">
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="px-3 py-1 rounded-full bg-white/10 text-xs text-[#64D2FF] font-semibold shrink-0 cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* SECTION 1: 8-CRITERIA MULTI-VARIANT COMPARATOR */}
      <div className="tahoe-glass rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3 border-b border-white/[0.08] pb-3 sm:pb-4">
          <div>
            <span className="text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64D2FF] flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5 shrink-0" />
              Comparator Multi-Variantă (8 Criterii)
            </span>
            <h2 className="hidden sm:block text-base sm:text-lg font-bold text-white mt-0.5">
              Compară variantele compatibile înainte de confirmare
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {comparisonOrderTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedOrderForComparison(tab.id)}
                className={`min-w-0 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold truncate transition cursor-pointer ${
                  selectedOrderForComparison === tab.id
                    ? 'bg-[#0A84FF] text-white shadow-md'
                    : 'bg-white/[0.06] text-white/70 hover:text-white'
                }`}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.full}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Variants Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {currentVariants.map((v, idx) => {
            const isRecommended = idx === 0;
            const isConfirmed = confirmedVariantId === v.id;

            return (
              <div
                key={v.id}
                className={`rounded-[24px] p-4 sm:p-5 flex flex-col justify-between space-y-4 transition ${
                  isConfirmed
                    ? 'tahoe-glass-elevated ring-1 ring-[#30D158]'
                    : isRecommended
                    ? 'tahoe-glass-elevated ring-1 ring-[#0A84FF]/60'
                    : 'tahoe-card-inner'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isRecommended
                          ? 'bg-[#30D158]/20 text-[#30D158]'
                          : v.involvesCargoTransfer
                          ? 'bg-[#FF9F0A]/20 text-[#FF9F0A]'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {v.variantRank}
                    </span>
                    <span className="tabular-nums text-xs font-bold text-[#64D2FF]">
                      {v.aiScore}/100
                    </span>
                  </div>

                  <div>
                    <div className="text-base font-bold text-white tracking-tight">
                      {v.trailerId}
                    </div>
                    <div className="text-xs text-white/55">
                      {v.tractorId} · {v.driverName}
                    </div>
                  </div>

                  {/* 8 Criteria Compact Apple List */}
                  <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-white/50">1. Traseu:</span>
                      <span className="text-white/90 text-right font-medium">
                        {v.criterion1_existingRoute}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-white/50">2. LDM Segment:</span>
                      <span className="text-[#30D158] text-right font-semibold">
                        {v.criterion2_segmentLabel}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-white/50">3. Temperatură:</span>
                      <span className="text-[#64D2FF] text-right">
                        {v.criterion3_tempCompatibility}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-white/50">4. Fereastră:</span>
                      <span className="text-white/85 text-right">
                        {v.criterion4_timeWindowsFit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/[0.07] tabular-nums">
                      <div>
                        <span className="text-white/45 block text-[10px]">5. Km extra</span>
                        <strong className="text-white">+{v.criterion5_extraKm} km</strong>
                      </div>
                      <div>
                        <span className="text-white/45 block text-[10px]">6. Timp extra</span>
                        <strong className="text-white">+{v.criterion6_extraTimeMin} min</strong>
                      </div>
                      <div>
                        <span className="text-white/45 block text-[10px]">7. Cost incr.</span>
                        <strong className="text-[#FF9F0A]">-{v.criterion7_incrementalCostEur} €</strong>
                      </div>
                      <div>
                        <span className="text-white/45 block text-[10px]">8. Profit Net</span>
                        <strong className="text-[#30D158]">
                          +{v.criterion8_estimatedProfitEur} €
                        </strong>
                      </div>
                    </div>
                  </div>

                  {v.involvesCargoTransfer && v.transferNote && (
                    <div className="p-2.5 rounded-xl bg-[#FF9F0A]/12 border border-[#FF9F0A]/25 text-[11px] text-[#FFD60A]">
                      Include Transfer: {v.transferNote}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleConfirmVariant(v)}
                  className={`w-full py-2.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isConfirmed
                      ? 'bg-[#30D158] text-black'
                      : isRecommended
                      ? 'tahoe-btn-primary'
                      : 'tahoe-btn-secondary text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isConfirmed ? 'Variantă Confirmată ' : 'Confirmă Varianta'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: CARGO TRANSFER OPPORTUNITIES BETWEEN TRAILERS */}
      <div className="tahoe-glass rounded-[28px] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E5CE6] flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#64D2FF]" />
              Transfer de Marfă între Remorci (Cross-Dock)
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Consolidare grupaje în puncte permise și fezabile
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#30D158]/15 text-[#30D158]">
            Fezabilitate Verificată
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {transfers.map((xfer) => {
            const isApproved = xfer.status === 'Aprobat în Planning';

            return (
              <div
                key={xfer.id}
                className="tahoe-card-inner rounded-[24px] p-4 sm:p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#5E5CE6]/25 text-[#64D2FF] tabular-nums font-bold text-xs">
                      {xfer.donorTrailerId} → {xfer.receiverTrailerId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isApproved
                          ? 'bg-[#30D158]/20 text-[#30D158]'
                          : 'bg-[#FF9F0A]/20 text-[#FF9F0A]'
                      }`}
                    >
                      {xfer.status}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {xfer.title}
                  </h3>

                  <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-3 text-xs space-y-1.5 text-white/80">
                    <div>
                      <span className="text-white/50">Marfă: </span>
                      <strong className="text-white">{xfer.cargoDescription}</strong> ({xfer.ldmTransferred} LDM · {xfer.palletsCount} pal)
                    </div>
                    <div>
                      <span className="text-white/50">Punct transfer: </span>
                      <strong className="text-[#64D2FF]">{xfer.transferHubName}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#30D158]/12 text-[#30D158] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Fără sigiliu vamal
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#30D158]/12 text-[#30D158] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Rampă Frigo OK
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between gap-3">
                  <div className="text-xs tabular-nums">
                    <span className="text-white/60">-{xfer.kmSaved} km · </span>
                    <strong className="text-[#30D158]">+{xfer.netGainEur} € net</strong>
                  </div>

                  <button
                    disabled={isApproved}
                    onClick={() => handleApproveCargoTransfer(xfer.id)}
                    className="tahoe-btn-primary px-4 py-2 rounded-full text-xs disabled:opacity-40 cursor-pointer"
                  >
                    {isApproved ? 'Aprobat ' : 'Aprobă Transfer'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: SUGESTII DE MARFĂ (Comenzi Interne, Clienți Recurenți, Burse) */}
      <div className="tahoe-glass rounded-[28px] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.08] pb-4">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0A84FF]" />
            Sugestii de Marfă pentru Spațiul Liber ({trailersWithUnusedSpace.length} remorci)
          </h2>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onScanExchanges && (
              <button
                type="button"
                disabled={isScanningExchanges}
                onClick={onScanExchanges}
                className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40 hover:bg-[#30D158]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningExchanges ? 'animate-spin' : ''}`} />
                <span>{isScanningExchanges ? 'Se scanează...' : 'Scanează Burse'}</span>
              </button>
            )}
            <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5 sm:overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: `Toate (${combinedMatches.length})`, mobileLabel: `Toate (${combinedMatches.length})` },
                { id: 'Comandă Internă', label: 'Interne', mobileLabel: 'Interne' },
                { id: 'Client Recurent', label: 'Clienți Recurenți', mobileLabel: 'Recurenți' },
                { id: 'Bursă (TimoCom / Trans.eu)', label: 'Burse', mobileLabel: 'Burse' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={sourceFilter === tab.id}
                  onClick={() => setSourceFilter(tab.id)}
                  className={`min-w-0 w-full sm:w-auto min-h-[36px] sm:min-h-0 px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center justify-center whitespace-nowrap transition cursor-pointer border ${
                    sourceFilter === tab.id
                      ? 'bg-[#0A84FF] border-[#0A84FF] text-white'
                      : 'bg-white/[0.06] border-transparent text-white/65 hover:text-white'
                  }`}
                >
                  <span className="sm:hidden truncate">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filteredMatches.map((m) => {
            const isAccepted = acceptedMatchIds.includes(m.id);

            return (
              <div
                key={m.id}
                className="tahoe-card-inner rounded-[24px] p-4 sm:p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#0A84FF]/20 text-[#64D2FF] tabular-nums font-bold text-xs">
                        {m.targetTrailerId}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-white/75 text-[11px] flex items-center gap-1">
                        {m.sourceType === 'Client Recurent' ? (
                          <Building2 className="w-3 h-3 text-[#30D158]" />
                        ) : m.sourceType === 'Comandă Internă' ? (
                          <PackagePlus className="w-3 h-3 text-[#0A84FF]" />
                        ) : (
                          <Globe className="w-3 h-3 text-[#FF9F0A]" />
                        )}
                        {m.sourceType}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums font-bold text-[#30D158]">
                      {m.matchScore}%
                    </span>
                  </div>

                  <div>
                    <div className="text-base font-bold text-white">{m.clientName}</div>
                    <div className="text-xs text-white/55 mt-0.5">
                      {m.pickupCity} → {m.deliveryCity} · {m.ldmRequired} LDM · +{m.tempRequired}°C
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-black/30 p-3 rounded-2xl border border-white/[0.06]">
                    <div>
                      <div className="text-[10px] text-white/50">Tarif</div>
                      <div className="text-sm sm:text-base font-bold text-white tabular-nums whitespace-nowrap">
                        {m.estimatedRateEur}&#160;€
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50">Cost Incr.</div>
                      <div className="text-sm sm:text-base font-bold text-white/80 tabular-nums whitespace-nowrap">
                        -{m.incrementalCostEur}&#160;€
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50">Contribuție</div>
                      <div className="text-sm sm:text-base font-bold text-[#30D158] tabular-nums whitespace-nowrap">
                        +{m.netContributionEur}&#160;€
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.07] flex items-center justify-between gap-2">
                  <span className="text-xs text-white/55">{m.loadingWindow}</span>
                  <button
                    disabled={isAccepted}
                    onClick={() => {
                      setAcceptedMatchIds((prev) => [...prev, m.id]);
                      onAcceptGroupageMatch(m);
                      setToast(
                        `Grupajul "${m.clientName}" (${m.ldmRequired} LDM) a fost alocat pe ${m.targetTrailerId}!`
                      );
                    }}
                    className="tahoe-btn-primary px-4 py-2 rounded-full text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isAccepted ? 'Alocat ' : 'Alocă pe Remorcă'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: DISPONIBILITĂȚI VIITOARE */}
      <div className="tahoe-glass rounded-[28px] p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64D2FF] flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Disponibilități Viitoare
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Unde și când putem încărca în următoarele zile
            </h2>
          </div>
        </div>

        {/* Filtru orizont: 1 / 3 / 7 zile */}
        <div className="flex flex-wrap items-center gap-2">
          {[1, 3, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setAvailHorizon(d)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition border"
              style={
                availHorizon === d
                  ? { backgroundColor: '#0A84FF', color: '#ffffff', borderColor: '#0A84FF' }
                  : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }
              }
            >
              {d === 1 ? '1 zi' : `${d} zile`}
            </button>
          ))}
          <span className="text-xs text-white/60">
            {visibleSlots.length} remorci disponibile · <strong className="text-[#30D158]">Confirmat</strong> = din planul confirmat · <strong className="text-[#FF9F0A]">Estimat</strong> = depinde de ETA la descărcare · <strong className="text-[#BF5AF2]">Simulat</strong> = depinde de un schimb încă neconfirmat
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {visibleSlots.length === 0 && (
            <div className="col-span-full text-sm text-white/65 py-4">
              Nicio remorcă nu se eliberează în {availHorizon === 1 ? 'următoarea zi' : `următoarele ${availHorizon} zile`}.
            </div>
          )}
          {visibleSlots.map((slot) => (
            <div
              key={slot.id}
              className="tahoe-card-inner rounded-[22px] p-4 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm tabular-nums font-bold text-white">
                    {slot.trailerId}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#30D158]/15 text-[#30D158]">
                    {slot.freeLdm} LDM
                  </span>
                </div>
                <div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                    style={{ backgroundColor: slotState(slot.status).bg, color: slotState(slot.status).color }}
                  >
                    {slotState(slot.status).label}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#64D2FF]">
                  {slot.availableDate} · {slot.availableTime}
                </div>
                <div className="text-sm font-bold text-white">
                  {slot.city} ({formatCountryBadge(slot.country)})
                </div>
                <div className="text-xs text-white/55">{slot.preferredReturnCorridor}</div>
              </div>

              <button
                onClick={onNavigateToOffers}
                className="tahoe-btn-secondary w-full py-2 rounded-full text-xs text-[#64D2FF] font-semibold cursor-pointer"
              >
                Ofertează ({slot.suggestedClientsCount} clienți) →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
