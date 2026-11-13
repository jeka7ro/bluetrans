import type { CargoOrder, RouteSegment, TrailerUnit } from './mockData';
import {
  computeCostBreakdown,
  evaluateCorridorAlignment,
  evaluatePhysicalLoadingConstraints,
  type CostBreakdown,
} from '../utils/smartLogisticsEngine';

/**
 * Motor de alocare LDM — funcții pure (nu modifică niciodată planul real).
 * Verifică pe fiecare segment:
 *  - LDM total + rezervă Soft-Lock
 *  - Bi-Temp (Zona 1 / Zona 2) + sugestie mutare Bulkhead
 *  - Devieri reale pe coridorul european + calcul cost combustibil & Maut
 *  - Ordinea fizică LIFO (Last-In First-Out)
 *  - Tonaj util & distribuție sarcină pe axă
 *  - Stivuibilitate, Euro-paleți și ore Tahograf CE 561/2006
 */

const CITY_ALIASES: Record<string, string> = {
  wien: 'viena',
  vienna: 'viena',
  viena: 'viena',
  koln: 'koln',
  cologne: 'koln',
  colonia: 'koln',
  munchen: 'munchen',
  munich: 'munchen',
  nurnberg: 'nurnberg',
  nuremberg: 'nurnberg',
  budapest: 'budapesta',
  budapesta: 'budapesta',
};

export const canonCity = (value: string): string => {
  const cleaned = (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z ]/g, '')
    .trim()
    .split(' ')[0];
  return CITY_ALIASES[cleaned] ?? cleaned;
};

export type ZoneKey = 'z1' | 'z2';
export type Verdict = 'ok' | 'tight' | 'blocked';

export const TEMP_TOLERANCE_C = 2;
export const TIGHT_FREE_LDM = 1.0;

export interface SegmentCheck {
  segmentId: string;
  label: string;
  total: number;
  occupiedBefore: number;
  occupiedAfter: number;
  freeAfter: number;
  zone: ZoneKey | null;
  zoneLabel: string;
  zoneFreeBefore: number;
  zoneFreeAfter: number;
  weightBefore: number;
  weightAfter: number;
  maxWeight: number;
  ok: boolean;
  problems: string[];
  warnings: string[];
}

export interface Evaluation {
  trailerId: string;
  orderId: string;
  range: [number, number] | null;
  checks: SegmentCheck[];
  verdict: Verdict;
  headline: string;
  reasons: string[];
  warnings: string[];
  revenueEur: number;
  incrementalCostEur: number;
  contributionEur: number;
  detourKm: number;
  minFreeAfter: number;
  isCorridorDetour?: boolean;
  lifoConflict?: boolean;
  lifoNote?: string;
  axleNote?: string;
  palletNote?: string;
  tachoNote?: string;
  suggestedBulkheadZ1Ldm?: number;
  costBreakdown?: CostBreakdown;
}

const fmt = (n: number) => n.toFixed(1);

export const findSegmentRange = (
  trailer: TrailerUnit,
  order: CargoOrder
): [number, number] | null => {
  const segs = trailer.segments;
  const from = canonCity(order.fromCity);
  const to = canonCity(order.toCity);
  const i = segs.findIndex((s) => canonCity(s.fromCity) === from);
  let j = -1;
  for (let k = segs.length - 1; k >= 0; k--) {
    if (canonCity(segs[k].toCity) === to) {
      j = k;
      break;
    }
  }
  if (i < 0 || j < 0 || j < i) return null;
  return [i, j];
};

const pickZone = (
  seg: RouteSegment,
  order: CargoOrder
): { zone: ZoneKey | null; compatible: boolean } => {
  const z1ok = Math.abs(seg.zone1Temp - order.tempReq) <= TEMP_TOLERANCE_C;
  const z2ok = Math.abs(seg.zone2Temp - order.tempReq) <= TEMP_TOLERANCE_C;
  const z1Free = seg.zone1MaxLdm - seg.zone1OccupiedLdm;
  const z2Free = seg.zone2MaxLdm - seg.zone2OccupiedLdm;
  const candidates: { zone: ZoneKey; free: number }[] = [];
  if (z2ok) candidates.push({ zone: 'z2', free: z2Free });
  if (z1ok) candidates.push({ zone: 'z1', free: z1Free });
  if (candidates.length === 0) return { zone: null, compatible: false };
  const fitting = candidates.find((c) => c.free >= order.ldm - 1e-9);
  return { zone: (fitting ?? candidates[0]).zone, compatible: true };
};

export const incrementalCostEur = (order: CargoOrder, detourKm = 0): number =>
  computeCostBreakdown(order.ldm, detourKm, order.fromCountry, order.toCountry)
    .totalIncrementalEur;

export const evaluateAllocation = (
  trailer: TrailerUnit,
  order: CargoOrder
): Evaluation => {
  const revenue = order.revenueEur;

  const exactRange = findSegmentRange(trailer, order);
  const corridorAlign = exactRange
    ? null
    : evaluateCorridorAlignment(trailer, order.fromCity, order.toCity);

  const range: [number, number] | null =
    exactRange ??
    (corridorAlign && corridorAlign.matchesCorridor
      ? corridorAlign.segmentRange
      : null);

  const detourKm = exactRange ? 0 : corridorAlign?.detourKm ?? 0;
  const isCorridorDetour = Boolean(!exactRange && range);

  if (!range) {
    return {
      trailerId: trailer.id,
      orderId: order.id,
      revenueEur: revenue,
      detourKm,
      range: null,
      checks: [],
      verdict: 'blocked',
      headline: 'Nu merge pe traseul comenzii',
      warnings: [],
      reasons: [
        corridorAlign?.reason ||
          `Remorca ${trailer.id} (${trailer.routeSummary.join(' → ')}) nu trece de la ${order.fromCity} la ${order.toCity}.`,
      ],
      incrementalCostEur: 0,
      contributionEur: 0,
      minFreeAfter: 0,
    };
  }

  const checks: SegmentCheck[] = [];
  for (let k = range[0]; k <= range[1]; k++) {
    const seg = trailer.segments[k];
    const problems: string[] = [];
    const label = `${seg.fromCity} → ${seg.toCity}`;

    const warnings: string[] = [];
    // Soft-Lock: ofertă în așteptare nu blochează definitiv, dar avertizează la conflict
    const softReserved = seg.softReservedLdm ?? 0;
    const freeBefore = seg.totalLdm - seg.occupiedLdm;
    const occupiedAfter = +(seg.occupiedLdm + order.ldm).toFixed(1);
    const freeAfter = +(seg.totalLdm - occupiedAfter).toFixed(1);
    if (softReserved > 0 && freeAfter >= 0 && freeAfter < softReserved - 1e-9) {
      warnings.push(
        `Pe ${label} o ofertă în așteptare ține provizoriu ${fmt(softReserved)} LDM. După această comandă rămân ${fmt(freeAfter)} LDM, deci nu mai încap amândouă.`
      );
    }
    if (freeBefore < order.ldm - 1e-9) {
      problems.push(
        `Pe ${label} mai sunt ${fmt(Math.max(0, freeBefore))} LDM liberi, comanda cere ${fmt(order.ldm)}.`
      );
    }

    const { zone, compatible } = pickZone(seg, order);
    let zoneFreeBefore = 0;
    let zoneLabel = '—';
    if (!compatible || !zone) {
      problems.push(
        `Temperatura +${order.tempReq}°C nu se potrivește cu zonele remorcii (${seg.zone1Temp}°C / ${seg.zone2Temp > 0 ? '+' : ''}${seg.zone2Temp}°C).`
      );
    } else {
      const max = zone === 'z1' ? seg.zone1MaxLdm : seg.zone2MaxLdm;
      const occ = zone === 'z1' ? seg.zone1OccupiedLdm : seg.zone2OccupiedLdm;
      const temp = zone === 'z1' ? seg.zone1Temp : seg.zone2Temp;
      zoneFreeBefore = +(max - occ).toFixed(1);
      zoneLabel = `${zone === 'z1' ? 'Zona 1 (față)' : 'Zona 2 (spate)'} ${temp > 0 ? '+' : ''}${temp}°C`;
      if (zoneFreeBefore < order.ldm - 1e-9) {
        problems.push(
          `În ${zoneLabel} mai sunt ${fmt(Math.max(0, zoneFreeBefore))} LDM liberi, comanda cere ${fmt(order.ldm)}.`
        );
      }
    }

    const weightAfter = +(seg.payloadTons + order.weightTons).toFixed(1);
    if (weightAfter > seg.maxPayloadTons + 1e-9) {
      problems.push(
        `Greutate peste limită pe ${label}: ${fmt(weightAfter)} t din maxim ${fmt(seg.maxPayloadTons)} t.`
      );
    }

    checks.push({
      segmentId: seg.id,
      label,
      total: seg.totalLdm,
      occupiedBefore: seg.occupiedLdm,
      occupiedAfter,
      freeAfter,
      zone,
      zoneLabel,
      zoneFreeBefore,
      zoneFreeAfter: +(zoneFreeBefore - order.ldm).toFixed(1),
      weightBefore: seg.payloadTons,
      weightAfter,
      maxWeight: seg.maxPayloadTons,
      ok: problems.length === 0,
      problems,
      warnings,
    });
  }

  const chosenZone = checks[0]?.zone ?? null;
  const physical = evaluatePhysicalLoadingConstraints(
    trailer,
    order,
    range,
    chosenZone,
    detourKm
  );

  const reasons = checks.flatMap((c) => c.problems);
  const warnings = checks.flatMap((c) => c.warnings);

  if (physical.lifoConflict) {
    warnings.push(physical.lifoNote);
  }
  if (!physical.axleBalanceOk && reasons.length === 0) {
    warnings.push(physical.axleNote);
  }
  if (physical.palletWarning) {
    warnings.push(physical.palletNote);
  }
  if (!physical.tachoOk) {
    warnings.push(physical.tachoNote);
  }
  if (physical.suggestedBulkheadZ1Ldm && reasons.some((r) => r.includes('Zona'))) {
    warnings.push(
      `Sugestie Bulkhead: mutând peretele la ${physical.suggestedBulkheadZ1Ldm}m încap ambele zone fără conflict!`
    );
  }
  if (isCorridorDetour && corridorAlign) {
    warnings.unshift(
      `Rutare cu deviere pe coridor (+${detourKm} km · +${corridorAlign.extraTimeMinutes} min HGV).`
    );
  }

  const minFreeAfter = Math.min(...checks.map((c) => c.freeAfter));
  const heavy = checks.some((c) => c.weightAfter >= c.maxWeight * 0.95);
  const blocked = reasons.length > 0;
  const tight =
    !blocked &&
    (minFreeAfter < TIGHT_FREE_LDM ||
      heavy ||
      warnings.length > 0 ||
      physical.lifoConflict ||
      !physical.tachoOk);

  const costBreakdown = computeCostBreakdown(
    order.ldm,
    detourKm,
    order.fromCountry,
    order.toCountry
  );
  const cost = costBreakdown.totalIncrementalEur;

  const verdict: Verdict = blocked ? 'blocked' : tight ? 'tight' : 'ok';
  const headline = blocked
    ? 'Nu se poate'
    : tight
      ? physical.lifoConflict
        ? 'Încape, dar necesită ordonare LIFO / culoar'
        : !physical.tachoOk
          ? 'Încape fizic, dar risc ore Tahograf (Swap recomandat)'
          : minFreeAfter < TIGHT_FREE_LDM
            ? `Încape, dar rămân doar ${fmt(Math.max(0, minFreeAfter))} LDM liberi`
            : warnings.length > 0
              ? isCorridorDetour
                ? `Compatibil pe coridor (+${detourKm} km ocol) · contribuție +${revenue - cost} €`
                : 'Încape, dar o ofertă în așteptare ține provizoriu același spațiu'
              : 'Încape, dar e aproape de limita de greutate'
      : `Încape pe tot traseul · rămân ${fmt(minFreeAfter)} LDM liberi`;

  return {
    trailerId: trailer.id,
    orderId: order.id,
    revenueEur: revenue,
    detourKm,
    range,
    checks,
    verdict,
    headline,
    reasons,
    warnings,
    incrementalCostEur: cost,
    contributionEur: revenue - cost,
    minFreeAfter,
    isCorridorDetour,
    lifoConflict: physical.lifoConflict,
    lifoNote: physical.lifoNote,
    axleNote: physical.axleNote,
    palletNote: physical.palletNote,
    tachoNote: physical.tachoNote,
    suggestedBulkheadZ1Ldm: physical.suggestedBulkheadZ1Ldm,
    costBreakdown,
  };
};

/** Aplică alocarea pe o COPIE a remorcii (pur). Se folosește doar după confirmare. */
export const applyAllocation = (
  trailer: TrailerUnit,
  order: CargoOrder,
  evaluation: Evaluation
): TrailerUnit | null => {
  if (!evaluation.range) return null;
  const [i, j] = evaluation.range;
  const segments = trailer.segments.map((seg, idx) => {
    if (idx < i || idx > j) return seg;
    const check = evaluation.checks[idx - i];
    const zone = check?.zone;
    return {
      ...seg,
      occupiedLdm: Math.min(seg.totalLdm, +(seg.occupiedLdm + order.ldm).toFixed(1)),
      zone1OccupiedLdm:
        zone === 'z1' ? +(seg.zone1OccupiedLdm + order.ldm).toFixed(1) : seg.zone1OccupiedLdm,
      zone2OccupiedLdm:
        zone === 'z2' ? +(seg.zone2OccupiedLdm + order.ldm).toFixed(1) : seg.zone2OccupiedLdm,
      payloadTons: +(seg.payloadTons + order.weightTons).toFixed(1),
      loadingOrders:
        idx === i
          ? [
              ...seg.loadingOrders,
              `${order.id} (${order.client}: ${order.fromCity} -> ${order.toCity}, ${order.ldm} LDM @ +${order.tempReq}°C)`,
            ]
          : seg.loadingOrders,
      unloadingOrders:
        idx === j
          ? [
              ...seg.unloadingOrders,
              `${order.id} Descarcă la ${order.toCity}: -${order.ldm} LDM (+${order.tempReq}°C, ${order.weightTons}t)`,
            ]
          : seg.unloadingOrders,
    };
  });

  const newOccupied = +(trailer.occupiedLdm + order.ldm).toFixed(1);
  return {
    ...trailer,
    occupiedLdm: newOccupied,
    freeLdm: Math.max(0, +(trailer.totalLdm - newOccupied).toFixed(1)),
    currentWeightTons: +(trailer.currentWeightTons + order.weightTons).toFixed(1),
    segments,
  };
};

const VERDICT_RANK: Record<Verdict, number> = { ok: 0, tight: 1, blocked: 2 };

/** Evaluează toate remorcile și le ordonează: cele care merg primele, cu cea mai mare contribuție. */
export const rankTrailersForOrder = (
  trailers: TrailerUnit[],
  order: CargoOrder
): Evaluation[] =>
  trailers
    .map((t) => evaluateAllocation(t, order))
    .sort((a, b) => {
      if (VERDICT_RANK[a.verdict] !== VERDICT_RANK[b.verdict]) {
        return VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
      }
      if (b.contributionEur !== a.contributionEur) return b.contributionEur - a.contributionEur;
      return b.minFreeAfter - a.minFreeAfter;
    });
