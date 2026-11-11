import React, { useEffect, useMemo, useState } from 'react';
import { getRealFleet } from './FleetVinAndDossierModal';
import {
  Truck,
  PackageCheck,
  AlertTriangle,
  Clock,
  Navigation,
  ThermometerSnowflake,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import {
  TrailerUnit,
  SmartGroupageMatch,
  ClientShipmentProposal,
} from '../data/mockData';
import type { HourlyPlanningCard } from './Planning7DaysView';
import { EuropeLiveMap } from './EuropeLiveMap';
import { buildControlCenterMapTrips } from '../utils/planningRouteSync';
import { getRomaniaZonedNow } from '../utils/romaniaTime';

interface ControlCenterViewProps {
  trailers: TrailerUnit[];
  planningCards?: HourlyPlanningCard[];
  matches: SmartGroupageMatch[];
  proposals: ClientShipmentProposal[];
  onNavigate: (tab: string, trailerId?: string) => void;
}

export const ControlCenterView: React.FC<ControlCenterViewProps> = ({
  trailers,
  planningCards = [],
  matches,
  proposals,
  onNavigate,
}) => {
  const [roNow, setRoNow] = useState(() => getRomaniaZonedNow());
  const [tripScopeFilter, setTripScopeFilter] = useState<'active' | 'past'>('active');

  useEffect(() => {
    const id = window.setInterval(() => {
      setRoNow(getRomaniaZonedNow());
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const { activeTrips, pastTrips } = useMemo(
    () => buildControlCenterMapTrips(trailers, planningCards, roNow),
    [trailers, planningCards, roNow]
  );

  const displayedListTrips = tripScopeFilter === 'past' ? pastTrips : activeTrips;

  const totalFreeLdm = trailers.reduce((acc, t) => acc + t.freeLdm, 0);
  const realFleetCounts = (() => {
    const f = getRealFleet();
    return { trailers: f.trailers.length, tractors: f.tractors.length };
  })();
  const pendingProposals = proposals.filter(
    (p) => p.status === 'Pending review'
  );

  const renderEuroRoPlate = (plate: string) => (
    <span
      className="inline-flex items-stretch rounded-[4px] overflow-hidden border border-slate-500/85 shadow-2xs shrink-0 whitespace-nowrap select-none h-[18px]"
      style={{ backgroundColor: '#ffffff' }}
    >
      <span
        className="flex flex-col items-center justify-center bg-[#003399] font-extrabold leading-none px-[3.5px] text-[6px]"
        style={{ backgroundColor: '#003399', color: '#ffffff' }}
      >
        <span
          className="euro-ro-plate-star"
          style={{ color: '#ffcc00', fontSize: '5.5px', lineHeight: 1 }}
        >
          ★
        </span>
        <span style={{ color: '#ffffff', lineHeight: 1, marginTop: '1px' }}>RO</span>
      </span>
      <span
        className="euro-ro-plate-num flex items-center font-black tracking-[0.03em] tabular-nums leading-none whitespace-nowrap px-1.5 text-[10px]"
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {plate}
      </span>
    </span>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="sr-only">Control Center</h1>

      {/* Primary 6-Widget Row */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        <div className="tahoe-glass rounded-[22px] p-3.5 sm:p-4 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-between text-white/55 text-[11px] font-medium">
            <span>Remorci</span>
            <Truck className="hidden sm:block w-4 h-4 text-[#0A84FF]" aria-hidden="true" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            {realFleetCounts.trailers}
          </div>
          <div className="hidden sm:block text-[11px] text-white/50 mt-1">
            Flotă activă · {realFleetCounts.tractors} capete tractor
          </div>
        </div>

        <div
          onClick={() => onNavigate('groupage')}
          className="tahoe-glass rounded-[22px] p-3.5 sm:p-4 text-center sm:text-left cursor-pointer hover:border-[#30D158]/40 transition"
        >
          <div className="flex items-center justify-center sm:justify-between text-white/55 text-[11px] font-medium">
            <span>Cu spațiu liber</span>
            <PackageCheck className="hidden sm:block w-4 h-4 text-[#30D158]" aria-hidden="true" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#30D158] mt-1 tracking-tight">
            9
          </div>
          <div className="hidden sm:block text-[11px] text-white/50 mt-1">
            Disponibile grupaj
          </div>
        </div>

        <div
          onClick={() => onNavigate('groupage')}
          className="tahoe-glass rounded-[22px] p-3.5 sm:p-4 text-center sm:text-left cursor-pointer hover:border-[#0A84FF]/40 transition"
        >
          <div className="flex items-center justify-center sm:justify-between text-white/55 text-[11px] font-medium">
            <span>LDM disponibili</span>
            <Sparkles className="hidden sm:block w-4 h-4 text-[#64D2FF]" aria-hidden="true" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            42
          </div>
          <div className="hidden sm:block text-[11px] text-[#64D2FF] mt-1">
            {totalFreeLdm.toFixed(1)} LDM pe coridor
          </div>
        </div>

        <div
          onClick={() => onNavigate('groupage')}
          className="tahoe-glass rounded-[22px] p-3.5 sm:p-4 text-center sm:text-left cursor-pointer"
        >
          <div className="flex items-center justify-center sm:justify-between text-white/55 text-[11px] font-medium">
            <span>Curând libere</span>
            <Clock className="hidden sm:block w-4 h-4 text-[#64D2FF]" aria-hidden="true" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#64D2FF] mt-1 tracking-tight">
            8
          </div>
          <div className="hidden sm:block text-[11px] text-white/50 mt-1">
            În 24–48h
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setTripScopeFilter((prev) => (prev === 'active' ? 'past' : 'active'))
          }
          className="tahoe-glass rounded-[22px] p-3.5 sm:p-4 text-center sm:text-left cursor-pointer hover:border-[#5E5CE6]/45"
        >
          <div className="flex items-center justify-center sm:justify-between text-white/55 text-[11px] font-medium">
            <span>Curse active</span>
            <Navigation className="hidden sm:block w-4 h-4 text-[#5E5CE6]" aria-hidden="true" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight tabular-nums">
            {activeTrips.length}
          </div>
          <div className="hidden sm:block text-[11px] text-[#30D158] mt-1 tabular-nums">
            {pastTrips.length} curse trecute · vezi pe hartă
          </div>
        </button>

        <div
          onClick={() => onNavigate('offers')}
          className="tahoe-glass rounded-[22px] p-3.5 sm:p-4 text-center sm:text-left cursor-pointer border-[#FF9F0A]/30"
        >
          <div className="flex items-center justify-center sm:justify-between text-[#FF9F0A] text-[11px] font-medium">
            <span>Alerte urgente</span>
            <AlertTriangle className="hidden sm:block w-4 h-4 text-[#FF9F0A]" aria-hidden="true" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#FF9F0A] mt-1 tracking-tight">
            3
          </div>
          <div className="hidden sm:block text-[11px] text-white/55 mt-1">
            Soft-Lock & Swap
          </div>
        </div>
      </div>

      {/* Real Interactive Europe GPS Map + Synchronized Active / Past Planning Trips */}
      <EuropeLiveMap
        trailers={trailers}
        activeTrips={activeTrips}
        pastTrips={pastTrips}
        tripScopeFilter={tripScopeFilter}
        onTripScopeFilterChange={setTripScopeFilter}
        onSelectTrailer={(trailerId) => onNavigate('planning', trailerId)}
        onNavigateSwap={() => onNavigate('swap')}
        heightClass="h-[340px] sm:h-[400px]"
      />

      {/* Main Split Grid: Left = Smart Planning Cards (Active vs Trecute) | Right = Live Proposal + Top Groupage */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column (7 cols) */}
        <div className="xl:col-span-7 tahoe-glass rounded-[26px] p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                SMART PLANNING · SINCRONIZAT CU CALENDARUL
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 tracking-tight">
                {tripScopeFilter === 'past'
                  ? 'Curse trecute și livrări finalizate'
                  : 'Curse active, programate și LDM liberi'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Filtru listă curse active sau trecute"
                className="inline-flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/10"
              >
                <button
                  type="button"
                  aria-pressed={tripScopeFilter === 'active'}
                  onClick={() => setTripScopeFilter('active')}
                  className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer border ${
                    tripScopeFilter === 'active'
                      ? 'bg-[#0A84FF] text-white border-[#64D2FF]/50'
                      : 'border-transparent text-white/70 hover:text-white'
                  }`}
                >
                  <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>Active ({activeTrips.length})</span>
                </button>
                <button
                  type="button"
                  aria-pressed={tripScopeFilter === 'past'}
                  onClick={() => setTripScopeFilter('past')}
                  className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer border ${
                    tripScopeFilter === 'past'
                      ? 'bg-emerald-600 text-white border-emerald-300/50'
                      : 'border-transparent text-white/70 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>Trecute ({pastTrips.length})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('planning')}
                className="px-3 py-1.5 rounded-full tahoe-btn-secondary text-xs font-semibold text-[#64D2FF] flex items-center gap-1 cursor-pointer"
              >
                <span>7 Zile</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {displayedListTrips.length === 0 ? (
              <div className="tahoe-card-inner rounded-[22px] p-6 text-center text-sm text-white/65">
                Nu există curse în această categorie.
              </div>
            ) : (
              displayedListTrips.map((item) => {
                const trailer = item.trailer;
                const occupiedPct = Math.min(
                  100,
                  Math.round((trailer.occupiedLdm / trailer.totalLdm) * 100)
                );
                const softReservedPct = Math.round(
                  (trailer.softReservedLdm / trailer.totalLdm) * 100
                );
                const isAlmostFull = trailer.freeLdm <= 2.5;

                return (
                  <div
                    key={item.mapId}
                    onClick={() => onNavigate('planning', trailer.id)}
                    className={`tahoe-card-inner hover:bg-white/10 rounded-[22px] p-4 sm:p-5 transition-colors duration-150 cursor-pointer ${
                      item.lifecycle === 'past' ? 'opacity-90 border border-emerald-500/25' : ''
                    }`}
                  >
                    {/* Top Row: Plate + Lifecycle Status + LDM */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {(() => {
                          const trPlate = trailer.tractorId.split(' (')[0];
                          const isTwo = Boolean(trPlate && trPlate !== trailer.id);
                          return (
                            <span className="inline-flex items-center gap-1">
                              {isTwo && (
                                <>
                                  {renderEuroRoPlate(trPlate)}
                                  <span className="font-black text-white/80 text-xs">+</span>
                                </>
                              )}
                              {renderEuroRoPlate(trailer.id)}
                            </span>
                          );
                        })()}

                        {item.lifecycle === 'past' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            <span>{item.badgeLabel}</span>
                          </span>
                        ) : item.lifecycle === 'planned' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/35">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            <span>{item.badgeLabel}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/35">
                            <Radio className="w-3 h-3" aria-hidden="true" />
                            <span>În tranzit</span>
                          </span>
                        )}

                        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/75">
                          Șofer: {trailer.driver1.name}
                        </span>
                      </div>

                      {item.lifecycle === 'past' ? (
                        <span className="text-sm sm:text-base font-bold text-emerald-400 shrink-0 tabular-nums">
                          {trailer.occupiedLdm.toFixed(1)} LDM livrați ✓
                        </span>
                      ) : (
                        <span
                          className={`text-base sm:text-lg font-bold tracking-tight shrink-0 tabular-nums ${
                            isAlmostFull ? 'text-[#FF9F0A]' : 'text-[#30D158]'
                          }`}
                        >
                          {trailer.freeLdm.toFixed(1)} LDM liberi
                        </span>
                      )}
                    </div>

                    {/* Client & Route Chain */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-white/85 font-medium">
                      <span className="text-[#64D2FF]">◎</span>
                      {item.clientLabel && (
                        <strong className="text-white mr-1">{item.clientLabel}:</strong>
                      )}
                      {trailer.routeSummary.map((city, idx) => (
                        <React.Fragment key={idx}>
                          <span>{city}</span>
                          {idx < trailer.routeSummary.length - 1 && (
                            <span className="text-white/40">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3.5 w-full h-3 bg-[#30D158]/35 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${item.lifecycle === 'past' ? 100 : occupiedPct}%`,
                        }}
                        className={`${
                          item.lifecycle === 'past' ? 'bg-emerald-500' : 'bg-[#0A84FF]'
                        } h-full rounded-l-full transition-all duration-300`}
                      />
                      {item.lifecycle !== 'past' && trailer.softReservedLdm > 0 && (
                        <div
                          style={{ width: `${softReservedPct}%` }}
                          className="bg-[#FF9F0A] h-full transition-all duration-300"
                        />
                      )}
                      {item.lifecycle !== 'past' && (
                        <div className="flex-1 bg-[#30D158]/80 h-full" />
                      )}
                    </div>

                    {/* Bottom Info Row */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 text-white/70">
                        <span>
                          {item.lifecycle === 'past' ? 'Partidă:' : 'Ocupat:'}{' '}
                          <strong className="text-white tabular-nums">
                            {trailer.occupiedLdm.toFixed(1)} / {trailer.totalLdm.toFixed(1)} LDM
                          </strong>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#64D2FF]/15 text-[#64D2FF] text-[11px] font-medium tabular-nums">
                          <ThermometerSnowflake className="w-3 h-3" aria-hidden="true" />
                          {trailer.zone1Temp}°C / +{trailer.zone2Temp}°C
                        </span>
                      </div>

                      <span
                        className={`font-semibold ${
                          item.lifecycle === 'past'
                            ? 'text-emerald-400'
                            : item.lifecycle === 'planned'
                              ? 'text-amber-400'
                              : isAlmostFull
                                ? 'text-[#FF9F0A]'
                                : 'text-[#30D158]'
                        }`}
                      >
                        {item.lifecycle === 'past'
                          ? 'Cursă finalizată'
                          : item.lifecycle === 'planned'
                            ? `Plecare ${item.shortTimeBadge}`
                            : isAlmostFull
                              ? 'Aproape completă'
                              : 'Spațiu disponibil'}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-white/8 flex items-center justify-between text-xs text-[#64D2FF] font-medium">
                      <span>
                        {item.lifecycle === 'past'
                          ? 'Destinație & program'
                          : item.lifecycle === 'planned'
                            ? 'Punct încărcare'
                            : 'Locație actuală'}
                      </span>
                      <span className="text-white/55 tabular-nums text-[11px]">
                        {trailer.currentLocation.city} ·{' '}
                        {item.routeDef.totalTechKm.toLocaleString('ro-RO')} km
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Dispatcher Proposal Card + Top Groupage */}
        <div className="xl:col-span-5 space-y-5">
          <div className="tahoe-glass-elevated rounded-[26px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#30D158]">
                  CE PRIMEȘTE DISPECERUL
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  New shipment proposal
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/35">
                Pending review
              </span>
            </div>

            {pendingProposals[0] ? (
              <div className="tahoe-card-inner rounded-[22px] p-4 space-y-4">
                <div className="text-sm text-white/80 font-medium">
                  {pendingProposals[0].routeFrom} → {pendingProposals[0].routeTo} ·{' '}
                  <strong className="text-white">{pendingProposals[0].ldmRequested} LDM</strong> ·{' '}
                  <strong className="text-[#64D2FF]">+{pendingProposals[0].tempRequired}°C</strong>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/10">
                  <div>
                    <div className="text-[11px] text-white/55">Preț oferit</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
                      {pendingProposals[0].offeredPriceEur} €
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/55">Cost suplimentar</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-white/90 tracking-tight mt-0.5">
                      {pendingProposals[0].incrementalCostEur} €
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/55">Contribuție est.</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#30D158] tracking-tight mt-0.5">
                      {pendingProposals[0].estimatedContributionEur} €
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('offers')}
                    className="py-2.5 rounded-full border border-[#30D158]/70 bg-[#30D158]/15 hover:bg-[#30D158]/25 text-[#30D158] font-semibold text-xs transition cursor-pointer"
                  >
                    Acceptă
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('offers')}
                    className="py-2.5 rounded-full tahoe-btn-secondary text-white font-semibold text-xs transition cursor-pointer"
                  >
                    Contraofertă
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('offers')}
                    className="py-2.5 rounded-full tahoe-btn-secondary text-white/70 hover:text-white font-semibold text-xs transition cursor-pointer"
                  >
                    Refuză
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/60">
                Toate propunerile au fost procesate.
              </div>
            )}
          </div>

          <div className="tahoe-glass rounded-[26px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Recomandări Grupaj (8 Criterii AI)
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('groupage')}
                className="px-3 py-1 rounded-full tahoe-btn-secondary text-xs text-[#64D2FF] font-semibold cursor-pointer"
              >
                Vezi toate →
              </button>
            </div>
            <div className="space-y-2.5">
              {matches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onNavigate('groupage')}
                  className="p-3.5 rounded-[18px] tahoe-card-inner hover:bg-white/10 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#64D2FF]">
                        {m.targetTrailerId}
                      </span>
                      <span className="text-[11px] text-white/50 truncate">
                        · {m.sourceType}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-white mt-0.5 truncate">
                      {m.pickupCity} → {m.deliveryCity} ({m.ldmRequired} LDM)
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-[#30D158]">
                      +{m.netContributionEur} €
                    </div>
                    <div className="text-[11px] text-white/50">+{m.detourKm} km</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
