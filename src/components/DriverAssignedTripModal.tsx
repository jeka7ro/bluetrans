import React, { useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  MapPin,
  Navigation,
  Printer,
  Radio,
  Receipt,
  Route,
  ThermometerSnowflake,
  X,
} from 'lucide-react';
import { TrailerUnit } from '../data/mockData';
import type { HourlyPlanningCard } from './Planning7DaysView';
import { EuropeLiveMap } from './EuropeLiveMap';
import { buildSingleCardMapTrip } from '../utils/planningRouteSync';
import {
  buildGoogleMapsDirectionsUrl,
  computeHgvRouteMetrics,
  downloadTruckCorridorGpx,
  resolveHgvVehicleProfile,
} from '../utils/googleMapsLinks';
import {
  formatPlanningOrderPosition,
  getPlanningWeekMeta,
  getRomaniaZonedNow,
} from '../utils/romaniaTime';

interface DriverAssignedTripModalProps {
  card: HourlyPlanningCard | null;
  trailers: TrailerUnit[];
  cmrStatusLabel?: string;
  onClose: () => void;
  onOpenCmrOnly: (card: HourlyPlanningCard, detailTrailer: TrailerUnit, tractorPlate: string) => void;
  onQuickAddExpenseForTrip?: (card: HourlyPlanningCard) => void;
}

const WEEK_LABELS_FALLBACK = [
  { short: 'LUN', label: 'Luni', date: '9 Noi' },
  { short: 'MAR', label: 'Marți', date: '10 Noi' },
  { short: 'MIE', label: 'Miercuri', date: '11 Noi' },
  { short: 'JOI', label: 'Joi', date: '12 Noi' },
  { short: 'VIN', label: 'Vineri', date: '13 Noi' },
  { short: 'SÂM', label: 'Sâmbătă', date: '14 Noi' },
  { short: 'DUM', label: 'Duminică', date: '15 Noi' },
];

function renderCompactEuroPlate(plate: string) {
  return (
    <span className="euro-ro-plate inline-flex items-stretch rounded-md overflow-hidden border border-slate-300/80 shadow-xs text-[11px] font-black leading-none shrink-0">
      <span className="bg-[#003399] text-white px-1 py-0.5 flex flex-col items-center justify-center text-[7px] font-extrabold leading-none">
        <span className="euro-ro-plate-star text-[#FFCC00] leading-none">★</span>
        <span className="leading-none mt-0.5">RO</span>
      </span>
      <span className="euro-ro-plate-num bg-white text-slate-950 px-1.5 py-0.5 tracking-wide flex items-center">
        {plate}
      </span>
    </span>
  );
}

export const DriverAssignedTripModal: React.FC<DriverAssignedTripModalProps> = ({
  card,
  trailers,
  cmrStatusLabel = 'CMR Activ',
  onClose,
  onOpenCmrOnly,
  onQuickAddExpenseForTrip,
}) => {
  useEffect(() => {
    if (!card) return;
    document.body.classList.add('modal-scroll-locked');
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    };
  }, [card, onClose]);

  if (!card) return null;

  const roNow = getRomaniaZonedNow();
  const detailMapTrip = buildSingleCardMapTrip(card, trailers, roNow);
  const detailTrailer = detailMapTrip.trailer;
  const detailTractorPlate =
    card.tractorPlate ?? detailTrailer.tractorId.split(' (')[0];
  const detailIsTwoPlates = detailTractorPlate !== detailTrailer.id;

  const detDay =
    getPlanningWeekMeta(card.weekOffset ?? 0, roNow).days[card.dayIndex] ||
    WEEK_LABELS_FALLBACK[card.dayIndex] ||
    WEEK_LABELS_FALLBACK[0];

  const checkpoints = detailMapTrip.routeDef.checkpoints || [];
  const originCity = checkpoints[0]
    ? `${checkpoints[0].city}, ${checkpoints[0].country}`
    : card.routeLabel.split(' → ')[0] || 'Oradea';
  const destCity =
    checkpoints[checkpoints.length - 1]
      ? `${checkpoints[checkpoints.length - 1].city}, ${checkpoints[checkpoints.length - 1].country}`
      : card.routeLabel.split(' → ').slice(-1)[0] || 'Rotterdam';
  const midStops = checkpoints.slice(1, -1).map((cp) => `${cp.city}, ${cp.country}`);
  const hgvProfile = resolveHgvVehicleProfile(detailTrailer.totalLdm);
  const hgvMetrics = computeHgvRouteMetrics(detailMapTrip.routeDef.totalTechKm, {
    isHgv: hgvProfile.isHgv,
    isDoubleCrew: detailTrailer.isDoubleCrew,
  });
  const googleMapsUrl = buildGoogleMapsDirectionsUrl(originCity, destCity, midStops, {
    hgv: hgvProfile.isHgv,
  });

  return (
    <div
      onClick={onClose}
      className="modal-backdrop-lock fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalii cursă ${card.clientName}`}
        className="tahoe-glass-elevated rounded-[24px] sm:rounded-[26px] max-w-5xl w-full p-3 sm:p-5 space-y-2.5 sm:space-y-4 shadow-2xl border border-white/20 my-auto max-h-[92vh] overflow-y-auto overscroll-contain"
      >
        {/* Top Header */}
        <div className="flex flex-nowrap items-start justify-between gap-2.5 border-b border-white/15 pb-2.5 sm:pb-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
                ORDIN DE TRANSPORT &amp; TRASEU ȘOFER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30">
                {detDay.short} {detDay.date} · {formatPlanningOrderPosition(card.hourSlot)}
              </span>
              {detailMapTrip.lifecycle === 'past' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Finalizată</span>
                </span>
              ) : detailMapTrip.lifecycle === 'planned' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/35">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Planificată</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
                  <Radio className="w-3 h-3 shrink-0" />
                  <span>În tranzit</span>
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-xl font-extrabold text-white mt-1 break-words leading-snug">
              {card.clientName} · {card.routeLabel}
            </h2>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-white/75 mt-1">
              <span className="hidden sm:inline">Alocat pe</span>
              {detailIsTwoPlates && (
                <>
                  {renderCompactEuroPlate(detailTractorPlate)}
                  <span className="font-black text-white/60">+</span>
                </>
              )}
              {renderCompactEuroPlate(detailTrailer.id)}
              <span className="hidden sm:inline">({detailTrailer.trailerType})</span>
              <span className="text-white/40">·</span>
              <strong className="text-white">{card.driverName || detailTrailer.driver1.name}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Închide detaliile cursei"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Operational KPI Metrics — slim 4-col bar even on mobile */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <div className="tahoe-card-inner rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-white/55 truncate">
              <span className="sm:hidden">LDM</span>
              <span className="hidden sm:inline">SPAȚIU MARFĂ (LDM)</span>
            </div>
            <div className="text-xs sm:text-base font-extrabold text-[#64D2FF] tabular-nums mt-0.5 whitespace-nowrap">
              {card.ldm.toFixed(1)}<span className="hidden sm:inline"> LDM</span><span className="sm:hidden">m</span>
            </div>
            <div className="hidden sm:block text-[10.5px] text-white/55">
              din {detailTrailer.totalLdm.toFixed(1)}m total remorcă
            </div>
          </div>

          <div className="tahoe-card-inner rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-white/55 truncate">
              <span className="sm:hidden">Tonaj</span>
              <span className="hidden sm:inline">TONAJ &amp; PALEȚI</span>
            </div>
            <div className="text-xs sm:text-base font-extrabold text-[#FF9F0A] tabular-nums mt-0.5 whitespace-nowrap">
              {card.weightTons.toFixed(1)} T
            </div>
            <div className="hidden sm:block text-[10.5px] text-white/70 truncate" title={card.cargoSpec}>
              {card.cargoSpec}
            </div>
          </div>

          <div className="tahoe-card-inner rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-white/55 truncate">
              <span className="sm:hidden">Temp.</span>
              <span className="hidden sm:inline">REGIM TERMIC CERUT</span>
            </div>
            <div className="text-xs sm:text-base font-extrabold text-white tabular-nums mt-0.5 flex items-center justify-center sm:justify-start gap-0.5 sm:gap-1 whitespace-nowrap">
              <ThermometerSnowflake className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#64D2FF] shrink-0" />
              <span>
                {card.tempCelsius > 0 ? `+${card.tempCelsius}` : card.tempCelsius}°C
              </span>
            </div>
            <div className="hidden sm:block text-[10px] text-white/60">
              Distanță traseu: {card.kmDist || `${detailMapTrip.routeDef.totalTechKm} km`}
            </div>
          </div>

          <div className="tahoe-card-inner rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-white/55 truncate">
              <span className="sm:hidden">CMR</span>
              <span className="hidden sm:inline">DOCUMENT TRANSPORT (CMR)</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[#30D158] mt-0.5 flex items-center justify-center sm:justify-start gap-1 whitespace-nowrap truncate">
              <FileCheck2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">{cmrStatusLabel}</span>
            </div>
            <div className="hidden sm:block text-[10.5px] text-white/55 mt-0.5">
              Ref: {card.linkedLoadId || card.id.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Route Breakdown & Step-by-Step Corridor Checkpoints */}
        <div className="tahoe-card-inner rounded-2xl p-2.5 sm:p-3 border border-white/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <div className="hidden sm:flex text-[10.5px] font-extrabold uppercase tracking-wider text-[#64D2FF] items-center gap-1.5">
                <Route className="w-3.5 h-3.5" />
                <span>CORIDOR RUTIER &amp; PUNCTE OPRIRE HGV</span>
              </div>
              <div className="text-xs font-semibold text-white/80 truncate">
                {detailMapTrip.routeDef.highwayCorridor} ·{' '}
                <span className="tabular-nums text-[#30D158]">
                  {detailMapTrip.routeDef.totalTechKm} km ({detailMapTrip.routeDef.estDriveHours})
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
              {detailMapTrip.routeDef.coordinates.length >= 2 && (
                <button
                  type="button"
                  onClick={() =>
                    downloadTruckCorridorGpx(
                      `${detailTrailer.id}-${detailMapTrip.routeDef.tripCode}`,
                      `${card.clientName} · ${detailMapTrip.routeDef.highwayCorridor}`,
                      detailMapTrip.routeDef.coordinates,
                      checkpoints.map((cp) => ({
                        city: cp.city,
                        country: cp.country,
                        coords: cp.coords,
                      }))
                    )
                  }
                  title="Descarcă ruta HGV 40T (.gpx) pentru GPS dedicat de camion"
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] text-[11px] sm:text-xs font-extrabold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>GPX 40T</span>
                </button>
              )}
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={hgvProfile.googleMapsWarningRo}
                className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#0A84FF] hover:brightness-110 text-[11px] sm:text-xs font-extrabold flex items-center gap-1 shrink-0 transition shadow-xs"
                style={{ color: '#ffffff' }}
              >
                <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" style={{ color: '#ffffff' }} />
                <span className="sm:hidden" style={{ color: '#ffffff' }}>Google Maps 40T</span>
                <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Google Maps · Coridor 40T</span>
                <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" style={{ color: '#ffffff' }} />
              </a>
            </div>
          </div>

          <div
            className="rounded-xl px-2.5 py-1 sm:py-1.5 bg-amber-500/[0.08] border border-amber-400/25 flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] sm:text-[11px]"
            title={hgvProfile.googleMapsWarningRo}
          >
            <span className="font-bold text-amber-300">
              {hgvProfile.shortBadge} · {hgvMetrics.tachoBreakdownRo}
              <span className="hidden sm:inline"> · L 16.5m</span>
            </span>
            <span className="hidden sm:inline text-white/70">
              Google Maps folosește doar profil auto (punctele A3/M0/A4/A8/A67 injectate) — verifică &gt;7.5t / H 4.0m.
            </span>
            <span className="sm:hidden text-white/65">
              Profil auto Maps — verifică &gt;7.5t
            </span>
          </div>

          {checkpoints.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {checkpoints.map((cp, idx) => (
                <React.Fragment key={`${cp.city}-${idx}`}>
                  {idx > 0 && (
                    <span className="text-white/30 text-[10px] font-bold hidden sm:inline">
                      →
                    </span>
                  )}
                  <div
                    title={`${cp.city} (${cp.country}) · ${cp.eta} · ${cp.techKm}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tabular-nums ${
                      cp.current
                        ? 'bg-[#0A84FF]/15 border-[#0A84FF]/45 text-white'
                        : cp.completed
                          ? 'bg-[#30D158]/10 border-[#30D158]/30 text-white'
                          : 'bg-white/[0.04] border-white/15 text-white/85'
                    }`}
                  >
                    <MapPin className="w-3 h-3 text-[#64D2FF] shrink-0" />
                    <span className="font-bold">
                      {idx + 1}. {cp.city}
                    </span>
                    <span className="text-[#FF9F0A] font-bold">
                      {cp.tempC > 0 ? `+${cp.tempC}` : cp.tempC}°C
                    </span>
                    <span className="text-white/55 text-[10px]">
                      · {cp.techKm.split(' (')[0]}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Interactive Map for THIS Specific Trip */}
          <EuropeLiveMap
            trailers={[detailTrailer]}
            singleTripItem={detailMapTrip}
            singleTripMode
            heightClass="h-[260px] sm:h-[310px]"
          />
        </div>

        {/* Footer Actions — CMR only (NO Factură!) + Expense Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/15">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenCmrOnly(card, detailTrailer, detailTractorPlate)}
              className="px-4 py-2 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/40 text-[#64D2FF] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Vezi / Printează CMR</span>
            </button>

            {onQuickAddExpenseForTrip && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickAddExpenseForTrip(card);
                }}
                className="px-4 py-2 rounded-full bg-[#FF9F0A]/15 hover:bg-[#FF9F0A]/25 border border-[#FF9F0A]/40 text-[#FF9F0A] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Atașează Bon / Cheltuială Cursă</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
