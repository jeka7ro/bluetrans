import React, { useState, useEffect, useId } from 'react';
import { OrderDecisionModal } from './OrderDecisionModal';
import { getRealFleet } from './FleetVinAndDossierModal';
import {
  rankTrailersForOrder,
  evaluateAllocation,
  type Evaluation,
} from '../data/ldmEngine';
import {
  findCityCoords,
  CITY_COORDS_FOR_ROAD_KM,
} from '../utils/smartLogisticsEngine';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Truck,
  MapPin,
  CheckCircle2,
  ClipboardList,
  Radio,
  ThermometerSnowflake,
  Sliders,
  Maximize2,
  RefreshCw,
  Layers,
  Printer,
  Receipt,
  Clock,
  AlertCircle,
  LocateFixed,
  Loader2,
  ExternalLink,
  Download,
  ArrowRight,
  Navigation,
  FileCheck2,
  X,
} from 'lucide-react';
import {
  getCachedLiveEuropeanWeather,
  resolveLiveCheckpointWeather,
  subscribeLiveEuropeanWeather,
  type LiveEuropeanWeatherSnapshot,
} from '../utils/accuWeatherCanvas';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  computeHgvRouteMetrics,
  downloadTruckCorridorGpx,
  resolveHgvVehicleProfile,
  splitRouteStops,
} from '../utils/googleMapsLinks';
import {
  findFirstFuturePlanningSlot,
  formatPlanningOrderPosition,
  formatRomaniaClockSnapshot,
  getDefaultPlanningWeekOffset,
  getPlanningOrderNumber,
  getPlanningWeekMeta,
  getRomaniaZonedNow,
  isPlanningSlotInPast,
} from '../utils/romaniaTime';
import {
  TrailerUnit,
  CargoOrder,
  ClientShipmentProposal,
} from '../data/mockData';
import {
  GoogleMapsAddressInput,
  detectCurrentUserGpsPlace,
  type DetectedUserGpsLocation,
} from './GoogleMapsAddressInput';
import { ClientDropdownSelect } from './ClientDropdownSelect';
import { EuropeLiveMap } from './EuropeLiveMap';
import {
  buildSingleCardMapTrip,
  getPlanningCardLifecycle,
  resolveCityGeo,
} from '../utils/planningRouteSync';
import {
  CmrAndInvoiceModal,
  PrintableTripDocData,
} from './CmrAndInvoiceModal';

export const WEEK_DAYS = [
  { short: 'LUN', label: 'Luni', date: '9 Noi' },
  { short: 'MAR', label: 'Marți', date: '10 Noi' },
  { short: 'MIE', label: 'Miercuri', date: '11 Noi' },
  { short: 'JOI', label: 'Joi', date: '12 Noi' },
  { short: 'VIN', label: 'Vineri', date: '13 Noi' },
  { short: 'SÂM', label: 'Sâmbătă', date: '14 Noi' },
  { short: 'DUM', label: 'Duminică', date: '15 Noi' },
];

export interface HourlyPlanningCard {
  id: string;
  weekOffset?: number; // 0 = 9–15 Nov 2026, 1 = 16–22 Nov 2026, etc.
  isoDate?: string; // '2026-11-11'
  dayIndex: number; // 0 = LUN .. 6 = DUM
  hourSlot: string; // '08:00' .. '18:00'
  clientName: string;
  ldm: number;
  weightTons: number;
  cargoSpec: string;
  routeLabel: string;
  kmDist: string;
  tempCelsius: number;
  trailerId: string;
  driverName: string;
  tractorPlate?: string;
  colorTheme: 'blue' | 'green' | 'amber' | 'purple';
  completed?: boolean;
  revenueEur?: number;
  linkedLoadId?: string;
  fromCoords?: [number, number];
  toCoords?: [number, number];
}

export interface DirectTripPayload {
  card: HourlyPlanningCard;
  fromCity: string;
  toCity: string;
  pallets: number;
  revenueEur: number;
}

interface Planning7DaysViewProps {
  trailers: TrailerUnit[];
  unassignedOrders?: CargoOrder[];
  proposals?: ClientShipmentProposal[];
  cards: HourlyPlanningCard[];
  setCards?: React.Dispatch<React.SetStateAction<HourlyPlanningCard[]>>;
  initialSelectedTrailerId?: string;
  /** Când este setat, grila devine read-only și afișează exclusiv cursele acestui camion/remorcă fără date financiare */
  driverScopeTrailerId?: string;
  driverTractorPlate?: string;
  cmrStatusLookup?: (card: HourlyPlanningCard) => string;
  onAttachExpenseForTrip?: (tripRef: string, tripLabel: string) => void;
  onAssignOrderToTrailer?: (
    orderId: string,
    trailerId: string,
    targetDayIndex?: number,
    targetHourSlot?: string,
    targetWeekOffset?: number
  ) => void;
  onCreateDirectTrip?: (payload: DirectTripPayload) => void;
  onDeletePlanningCard?: (cardId: string, linkedLoadId?: string) => void;
  onMoveScheduleBlock?: (
    fromTrailerId: string,
    blockId: string,
    toTrailerId: string,
    toDayIndex: number
  ) => void;
  onUpdateBulkhead?: (trailerId: string, newZone1MaxLdm: number) => void;
}

export const HOUR_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

// Coordonatele orașelor și findCityCoords sunt centralizate în ../utils/smartLogisticsEngine
export { CITY_COORDS_FOR_ROAD_KM, findCityCoords };

function formatRoKm(km: number): string {
  return km >= 1000
    ? `${Math.floor(km / 1000)}.${String(km % 1000).padStart(3, '0')} km`
    : `${km} km`;
}

export function buildRoadDistanceWithDetourLabel(
  fromText: string,
  toText: string,
  detourKm = 0
): string {
  const c1 = findCityCoords(fromText);
  const c2 = findCityCoords(toText);
  if (!c1 || !c2) return '—';

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(c2[0] - c1[0]);
  const dLon = toRad(c2[1] - c1[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1[0])) * Math.cos(toRad(c2[0])) * Math.sin(dLon / 2) ** 2;
  const airKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadKm =
    airKm < 3 ? 15 : Math.max(25, Math.round((airKm * 1.24) / 5) * 5);

  const baseFormatted = formatRoKm(roadKm);
  return detourKm > 0
    ? `${baseFormatted} · ocol ${detourKm} km`
    : baseFormatted;
}

export const INITIAL_HOURLY_CARDS: HourlyPlanningCard[] = [
  {
    id: 'card-1',
    dayIndex: 0,
    hourSlot: '08:00',
    clientName: 'Unilever Frozen',
    ldm: 5.2,
    weightTons: 9.8,
    cargoSpec: 'Frigo Z1: 16 pal x 80x120',
    routeLabel: 'Oradea → Rotterdam',
    kmDist: '1.580 km',
    tempCelsius: -18,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'blue',
    completed: true,
  },
  {
    id: 'card-2',
    dayIndex: 0,
    hourSlot: '09:00',
    clientName: 'Agrana Fruit AT',
    ldm: 4.2,
    weightTons: 5.6,
    cargoSpec: 'Frigo Z2: 14 pal · Lactate',
    routeLabel: 'Oradea → Viena',
    kmDist: '540 km · ocol 14 km',
    tempCelsius: 4,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'blue',
    completed: true,
  },
  {
    id: 'card-3',
    dayIndex: 0,
    hourSlot: '10:00',
    clientName: 'Transilvania Lactate',
    ldm: 6.8,
    weightTons: 11.4,
    cargoSpec: 'Bi-Temp: 20 pal · Cașcaval',
    routeLabel: 'Cluj → München',
    kmDist: '920 km',
    tempCelsius: 4,
    trailerId: 'BH 74 STS',
    driverName: 'Varga Zsolt',
    colorTheme: 'green',
  },
  {
    id: 'card-4',
    dayIndex: 0,
    hourSlot: '11:00',
    clientName: 'MeatPack Hungary',
    ldm: 6.8,
    weightTons: 12.4,
    cargoSpec: 'Congelate: 20 pal · Carne',
    routeLabel: 'Szolnok → Almere',
    kmDist: '1.440 km · ocol 24 km',
    tempCelsius: -20,
    trailerId: 'BH 69 STS',
    driverName: 'Ionescu Dan',
    colorTheme: 'green',
  },
  {
    id: 'card-5',
    dayIndex: 0,
    hourSlot: '12:00',
    clientName: 'Danone Fresh RO',
    ldm: 3.0,
    weightTons: 4.5,
    cargoSpec: 'Grupaj Z2: 9 pal · Iaurt',
    routeLabel: 'Oradea → Köln',
    kmDist: '1.340 km · ocol 18 km',
    tempCelsius: 4,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'green',
  },
  {
    id: 'card-6',
    dayIndex: 0,
    hourSlot: '13:00',
    clientName: 'FrieslandCampina',
    ldm: 4.6,
    weightTons: 7.2,
    cargoSpec: 'Frigo Z2: 12 pal · Brânzeturi',
    routeLabel: 'Szolnok → Frankfurt',
    kmDist: '1.120 km · ocol 22 km',
    tempCelsius: 2,
    trailerId: 'BH 69 STS',
    driverName: 'Ionescu Dan',
    colorTheme: 'green',
  },
  {
    id: 'card-7',
    dayIndex: 0,
    hourSlot: '14:00',
    clientName: 'Caroli Foods Bi-Temp',
    ldm: 9.6,
    weightTons: 15.8,
    cargoSpec: 'FTL/Grupaj: 26 pal · Mezeluri',
    routeLabel: 'Oradea → Stuttgart',
    kmDist: '1.180 km',
    tempCelsius: 2,
    trailerId: 'BH 74 STS',
    driverName: 'Varga Zsolt',
    colorTheme: 'green',
  },
  {
    id: 'card-8',
    dayIndex: 1,
    hourSlot: '08:00',
    clientName: 'TERASSA FRIGO',
    ldm: 4.2,
    weightTons: 6.3,
    cargoSpec: 'Descărcare Viena (+4.2m liberi)',
    routeLabel: 'Viena → Rotterdam',
    kmDist: '1.040 km',
    tempCelsius: -1,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'blue',
  },
  {
    id: 'card-9',
    dayIndex: 1,
    hourSlot: '09:00',
    clientName: 'LEMMER FLORA',
    ldm: 6.8,
    weightTons: 9.4,
    cargoSpec: 'Flori & Plante · 18 pal',
    routeLabel: 'Rotterdam → Stockholm',
    kmDist: '1.460 km · ocol 35 km',
    tempCelsius: 4,
    trailerId: 'BH 75 STS',
    driverName: 'Kovács Attila',
    colorTheme: 'blue',
  },
  {
    id: 'card-10',
    dayIndex: 1,
    hourSlot: '10:00',
    clientName: 'Bayernland Milch',
    ldm: 2.2,
    weightTons: 3.8,
    cargoSpec: 'Descărcare München (+2.2m)',
    routeLabel: 'München → Frankfurt',
    kmDist: '395 km',
    tempCelsius: 4,
    trailerId: 'BH 69 STS',
    driverName: 'Ionescu Dan',
    colorTheme: 'green',
  },
  {
    id: 'card-11',
    dayIndex: 1,
    hourSlot: '11:00',
    clientName: 'Nature’s Pride BV',
    ldm: 5.2,
    weightTons: 8.6,
    cargoSpec: 'Exotice +6°C · 15 pal',
    routeLabel: 'Rotterdam → Göteborg',
    kmDist: '1.150 km · ocol 28 km',
    tempCelsius: 6,
    trailerId: 'BH 91 STS',
    driverName: 'Stan + Rusu',
    colorTheme: 'green',
  },
  {
    id: 'card-12',
    dayIndex: 1,
    hourSlot: '12:00',
    clientName: 'Dr. Oetker Frigo',
    ldm: 2.4,
    weightTons: 3.1,
    cargoSpec: 'Grupaj Hamburg (-2.4m)',
    routeLabel: 'Rotterdam → Hamburg',
    kmDist: '510 km',
    tempCelsius: 4,
    trailerId: 'BH 75 STS',
    driverName: 'Kovács Attila',
    colorTheme: 'amber',
  },
  {
    id: 'card-13',
    dayIndex: 1,
    hourSlot: '13:00',
    clientName: 'Hochland Süd',
    ldm: 2.8,
    weightTons: 4.5,
    cargoSpec: 'Descărcare München (+4.0m)',
    routeLabel: 'Suben → München',
    kmDist: '175 km · ocol 14 km',
    tempCelsius: 4,
    trailerId: 'BH 74 STS',
    driverName: 'Varga Zsolt',
    colorTheme: 'amber',
  },
  {
    id: 'card-14',
    dayIndex: 1,
    hourSlot: '14:00',
    clientName: 'CEDRIC VENLO',
    ldm: 3.2,
    weightTons: 4.5,
    cargoSpec: 'Grupaj Venlo → Kolding',
    routeLabel: 'Venlo → Kolding',
    kmDist: '620 km',
    tempCelsius: 2,
    trailerId: 'BH 91 STS',
    driverName: 'Stan + Rusu',
    colorTheme: 'amber',
  },
  {
    id: 'card-15',
    dayIndex: 3,
    hourSlot: '09:00',
    clientName: 'Arla Foods Retur',
    ldm: 10.2,
    weightTons: 12.8,
    cargoSpec: 'Retur Suedia → Oradea · 28 pal',
    routeLabel: 'Stockholm → Oradea',
    kmDist: '1.840 km',
    tempCelsius: 4,
    trailerId: 'BH 75 STS',
    driverName: 'Kovács Attila',
    colorTheme: 'amber',
  },
  {
    id: 'card-16',
    dayIndex: 2,
    hourSlot: '08:00',
    clientName: 'Royal FloraHolland',
    ldm: 4.4,
    weightTons: 5.2,
    cargoSpec: 'Frigo Z2: 11 pal · Flori & Plante',
    routeLabel: 'Rotterdam → Köln',
    kmDist: '265 km',
    tempCelsius: 4,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'green',
    completed: true,
  },
  {
    id: 'card-17',
    dayIndex: 3,
    hourSlot: '08:00',
    clientName: 'Dr. Oetker Logistics',
    ldm: 5.6,
    weightTons: 8.4,
    cargoSpec: 'Congelate Z1: 14 pal · Produse congelate',
    routeLabel: 'Köln → München',
    kmDist: '575 km',
    tempCelsius: -18,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'blue',
    completed: true,
  },
  {
    id: 'card-18',
    dayIndex: 4,
    hourSlot: '08:00',
    clientName: 'Kuehne+Nagel Fresh DE',
    ldm: 5.2,
    weightTons: 8.2,
    cargoSpec: 'Bi-Temp Z1: 13 pal · Carne congelată',
    routeLabel: 'München → Viena',
    kmDist: '435 km',
    tempCelsius: -18,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'blue',
  },
  {
    id: 'card-19',
    dayIndex: 4,
    hourSlot: '10:00',
    clientName: 'Agrana Fruit Retur',
    ldm: 3.6,
    weightTons: 5.4,
    cargoSpec: 'Bi-Temp Z2: 9 pal · Concentrat fructe',
    routeLabel: 'Viena → Oradea',
    kmDist: '540 km',
    tempCelsius: 4,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'green',
  },
  {
    id: 'card-20',
    dayIndex: 5,
    hourSlot: '08:00',
    clientName: 'Kaufland Logistic RO',
    ldm: 4.8,
    weightTons: 7.0,
    cargoSpec: 'Distribuție Regională: 12 pal · Lactate',
    routeLabel: 'Oradea → Cluj-Napoca',
    kmDist: '155 km',
    tempCelsius: 2,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'amber',
  },
  {
    id: 'card-21',
    dayIndex: 6,
    hourSlot: '08:00',
    clientName: 'Metro Cash & Carry',
    ldm: 4.0,
    weightTons: 5.8,
    cargoSpec: 'Bi-Temp Z2: 10 pal · Alimente reci',
    routeLabel: 'Cluj-Napoca → Budapesta',
    kmDist: '410 km',
    tempCelsius: 4,
    trailerId: 'BH 67 STS',
    driverName: 'Popa Ioan',
    colorTheme: 'green',
  },
];

const TRUCK_BORDER_COLORS: Record<string, string> = {
  'BH 67 STS': 'border-l-[#ef4444]',
  'BH 69 STS': 'border-l-[#0A84FF]',
  'BH 75 STS': 'border-l-[#a855f7]',
  'BH 74 STS': 'border-l-[#f59e0b]',
  'BH 91 STS': 'border-l-[#10b981]',
  'BH 23 STS': 'border-l-[#06b6d4]',
  'BH 31 STS': 'border-l-[#ec4899]',
};

/** Remorcă din flota reală care nu are încă traseu / șofer în plan: date minime, fără să împrumute datele altei remorci. */
const buildUnassignedTrailerFromCard = (
  base: TrailerUnit,
  card: HourlyPlanningCard
): TrailerUnit => {
  const [fromCity, toCity] = card.routeLabel.split('→').map((s) => s.trim());
  return {
    ...base,
    id: card.trailerId,
    tractorId: card.tractorPlate ?? '—',
    driver1: { ...base.driver1, name: '—', phone: '—' },
    driver2: undefined,
    isDoubleCrew: false,
    trailerType: 'Frigo Bi-Temp (Schmitz Dual-Zone)',
    status: 'Planificat',
    routeSummary: [fromCity, toCity],
    currentLocation: {
      city: 'Oradea (bază)',
      country: 'RO',
      lat: 47.0722,
      lng: 21.9217,
      speedKmh: 0,
      cargoTrackLastPing: '—',
    },
    totalLdm: 13.6,
    occupiedLdm: card.ldm,
    freeLdm: Math.max(0, +(13.6 - card.ldm).toFixed(1)),
    softReservedLdm: 0,
    currentWeightTons: card.weightTons,
    segments: [
      {
        ...base.segments[0],
        id: `seg-${card.id}`,
        fromCity,
        fromCountry: '',
        toCity,
        toCountry: '',
        distanceKm: 0,
        etaStart: '—',
        etaEnd: '—',
        occupiedLdm: card.ldm,
        totalLdm: 13.6,
        zone1OccupiedLdm: 0,
        zone2Temp: card.tempCelsius,
        zone2OccupiedLdm: card.ldm,
        payloadTons: card.weightTons,
        loadingOrders: [],
        unloadingOrders: [],
        softReservedLdm: 0,
      },
    ],
  };
};

const noopSetCards: React.Dispatch<React.SetStateAction<HourlyPlanningCard[]>> = () => {};

function normalizePlateMatch(raw = ''): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export const Planning7DaysView: React.FC<Planning7DaysViewProps> = ({
  trailers,
  unassignedOrders = [],
  proposals = [],
  cards,
  setCards = noopSetCards,
  initialSelectedTrailerId,
  driverScopeTrailerId,
  driverTractorPlate,
  cmrStatusLookup,
  onAttachExpenseForTrip,
  onAssignOrderToTrailer = () => {},
  onCreateDirectTrip,
  onDeletePlanningCard,
  onUpdateBulkhead = () => {},
}) => {
  const isDriverView = Boolean(driverScopeTrailerId);
  const [liveWeatherSnap, setLiveWeatherSnap] =
    useState<LiveEuropeanWeatherSnapshot | null>(() =>
      getCachedLiveEuropeanWeather()
    );
  useEffect(() => {
    return subscribeLiveEuropeanWeather((snap) => setLiveWeatherSnap(snap));
  }, []);

  const scopedCards = React.useMemo(() => {
    const scopeTrailerNorm = normalizePlateMatch(driverScopeTrailerId);
    const scopeTractorNorm = normalizePlateMatch(driverTractorPlate);
    return cards
      .filter((c) => {
        if (!scopeTrailerNorm) return true;
        const cTrNorm = normalizePlateMatch(c.trailerId);
        const cTracNorm = normalizePlateMatch(c.tractorPlate);
        return (
          cTrNorm === scopeTrailerNorm ||
          (Boolean(scopeTractorNorm) && cTracNorm === scopeTractorNorm)
        );
      })
      .map((c) => ({
        ...c,
        hourSlot: HOUR_SLOTS.includes(c.hourSlot) ? c.hourSlot : HOUR_SLOTS[0],
      }));
  }, [cards, driverScopeTrailerId, driverTractorPlate]);

  const qcFormId = useId();
  const [roClock, setRoClock] = useState(() =>
    formatRomaniaClockSnapshot(getRomaniaZonedNow())
  );
  const [weekOffset, setWeekOffset] = useState<number>(() =>
    getDefaultPlanningWeekOffset(roClock.zdt)
  );
  const weekMeta = React.useMemo(
    () => getPlanningWeekMeta(weekOffset, roClock.zdt),
    [weekOffset, roClock]
  );
  const [mobileDayIdx, setMobileDayIdx] = useState<number>(() => {
    const todayIdx = getPlanningWeekMeta(
      getDefaultPlanningWeekOffset()
    ).days.findIndex((d) => d.isToday);
    return todayIdx >= 0 ? todayIdx : 0;
  });
  const [showMobileEmptyPastSlots, setShowMobileEmptyPastSlots] =
    useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [decisionOrderId, setDecisionOrderId] = useState<string | null>(null);
  const [lastCreatedCardId, setLastCreatedCardId] = useState<string | null>(null);
  const [qcError, setQcError] = useState<string | null>(null);
  const [cardStatusFilter, setCardStatusFilter] = useState<
    'all' | 'active' | 'past'
  >('all');

  const weekCardsAll = React.useMemo(
    () => scopedCards.filter((c) => (c.weekOffset ?? 0) === weekOffset),
    [scopedCards, weekOffset]
  );

  const weekFilterCounts = React.useMemo(() => {
    let active = 0;
    let past = 0;
    for (const c of weekCardsAll) {
      const life = getPlanningCardLifecycle(c, trailers, roClock.zdt);
      if (life.lifecycle === 'past') past += 1;
      else active += 1;
    }
    return { all: weekCardsAll.length, active, past };
  }, [weekCardsAll, trailers, roClock.zdt]);

  const matchesCardFilter = (card: HourlyPlanningCard): boolean => {
    if (cardStatusFilter === 'all') return true;
    const life = getPlanningCardLifecycle(card, trailers, roClock.zdt);
    return cardStatusFilter === 'past'
      ? life.lifecycle === 'past'
      : life.lifecycle !== 'past';
  };

  // Refresh Romania clock every 15s so past-hour cutoffs stay live without page reload
  useEffect(() => {
    const interval = window.setInterval(() => {
      setRoClock(formatRomaniaClockSnapshot(getRomaniaZonedNow()));
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const isSlotOccupied = (wOff: number, dIdx: number, hSlot: string): boolean =>
    scopedCards.some(
      (c) => (c.weekOffset ?? 0) === wOff && c.dayIndex === dIdx && c.hourSlot === hSlot
    );

  const findFirstFutureEmptySlot = (
    preferredDay?: number,
    targetWeek = weekOffset
  ): {
    weekOffset: number;
    dayIndex: number;
    hourSlot: string;
    isoDate: string;
  } => {
    const freshNow = getRomaniaZonedNow();
    setRoClock(formatRomaniaClockSnapshot(freshNow));
    return findFirstFuturePlanningSlot({
      weekOffset: targetWeek,
      preferredDayIndex: preferredDay,
      isSlotOccupied,
      zdtNow: freshNow,
    });
  };

  const openQuickCreateModal = (preferredDay?: number) => {
    const slot = findFirstFutureEmptySlot(preferredDay, weekOffset);
    if (slot.weekOffset !== weekOffset) {
      setWeekOffset(slot.weekOffset);
    }
    setQcError(null);
    setQuickCreateCell({
      weekOffset: slot.weekOffset,
      dayIndex: slot.dayIndex,
      hourSlot: slot.hourSlot,
    });
  };

  useEffect(() => {
    if (!lastCreatedCardId) return;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-card-id="${lastCreatedCardId}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    });
    const timer = window.setTimeout(() => setLastCreatedCardId(null), 5000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [lastCreatedCardId]);

  // Ofertele ACCEPTATE apar ca card în calendar (confirmarea actualizează planning-ul)
  useEffect(() => {
    const accepted = proposals.filter((p) => p.status === 'Accepted');
    if (accepted.length === 0) return;
    setCards((prev) => {
      const missing = accepted.filter((p) => !prev.some((c) => c.id === `offer-${p.id}`));
      if (missing.length === 0) return prev;
      const added: HourlyPlanningCard[] = missing.map((p) => {
        const tr = trailers.find((x) => x.id === p.trailerId);
        const win = p.loadingWindow.toLowerCase();
        const dayNum = win.match(/(\d{1,2})\s*nov/);
        const dayIdx = dayNum
          ? Math.min(6, Math.max(0, Number(dayNum[1]) - 9))
          : win.startsWith('azi')
            ? 0
            : win.startsWith('poim')
              ? 2
              : 1;
        const hourMatch = p.loadingWindow.match(/(\d{2}):/);
        const hourSlot =
          (hourMatch && HOUR_SLOTS.find((h) => h.startsWith(hourMatch[1]))) || '08:00';
        return {
          id: `offer-${p.id}`,
          dayIndex: dayIdx,
          hourSlot,
          clientName: p.clientName,
          ldm: p.ldmRequested,
          weightTons: p.weightTons,
          cargoSpec: `Ofertă acceptată · ${p.offeredPriceEur} €`,
          routeLabel: `${p.routeFrom} → ${p.routeTo}`,
          kmDist: buildRoadDistanceWithDetourLabel(
            p.routeFrom,
            p.routeTo,
            p.detourKm || 0
          ),
          tempCelsius: p.tempRequired,
          trailerId: p.trailerId,
          driverName: tr ? tr.driver1.name : '—',
          colorTheme: 'purple',
        };
      });
      return [...prev, ...added];
    });
  }, [proposals, trailers]);

  // Drag & Drop State
  const [dragPayload, setDragPayload] = useState<{
    kind: 'CARD' | 'PENDING_ORDER' | 'TRUCK';
    id: string;
  } | null>(null);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const [pendingTruckAssign, setPendingTruckAssign] = useState<{
    card: HourlyPlanningCard;
    trailer: TrailerUnit;
    evaluation: Evaluation;
  } | null>(null);

  // In-App Confirmation Popup State when moving / reordering a Planning Card
  const [pendingCardMove, setPendingCardMove] = useState<{
    card: HourlyPlanningCard;
    fromWeekOffset: number;
    fromDayIndex: number;
    fromDayLabel: string;
    fromDayDate: string;
    fromIsToday: boolean;
    fromHourSlot: string;
    fromOrderNum: number;
    toWeekOffset: number;
    toDayIndex: number;
    toIsoDate: string;
    toDayShort: string;
    toDayLabel: string;
    toDayDate: string;
    toIsToday: boolean;
    toIsPastDay: boolean;
    toHourSlot: string;
    toOrderNum: number;
    swapWithCard?: HourlyPlanningCard;
  } | null>(null);
  const moveDialogRef = React.useRef<HTMLDialogElement | null>(null);
  const moveDialogTitleId = useId();

  useEffect(() => {
    const dialog = moveDialogRef.current;
    if (!dialog) return;
    if (pendingCardMove) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [pendingCardMove]);

  useEffect(() => {
    const dialog = moveDialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;
    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = outside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && outside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Full Course & Order Detail Modal State (when clicking any card in Planning)
  const [selectedCardDetail, setSelectedCardDetail] =
    useState<HourlyPlanningCard | null>(null);
  const [printableDoc, setPrintableDoc] =
    useState<PrintableTripDocData | null>(null);

  // Quick Create on Cell Modal State ("creare rapidă pe orice celulă viitoare")
  const [quickCreateCell, setQuickCreateCell] = useState<{
    weekOffset: number;
    dayIndex: number;
    hourSlot: string;
  } | null>(null);
  const [qcClient, setQcClient] = useState('Agrana Fruit Central');
  const [qcFrom, setQcFrom] = useState('Viena');
  const [qcTo, setQcTo] = useState('Rotterdam');
  const [qcLdm, setQcLdm] = useState('3.0');
  const [qcWeight, setQcWeight] = useState('4.2');
  const [qcPallets, setQcPallets] = useState('9');
  const [qcTemp, setQcTemp] = useState('4');
  const [qcRevenue, setQcRevenue] = useState('680');
  const [qcTrailerId, setQcTrailerId] = useState(
    initialSelectedTrailerId || 'BH 67 STS'
  );
  const [qcTractorId, setQcTractorId] = useState('BH 46 STS');
  const realFleet = React.useMemo(() => getRealFleet(), []);
  const idleTrailers = realFleet.trailers.filter((v) => !trailers.some((t) => t.id === v.plate));
  const idleTractors = realFleet.tractors.filter(
    (v) => !trailers.some((t) => t.tractorId.split(' (')[0] === v.plate)
  );
  const [qcTheme, setQcTheme] = useState<'blue' | 'green' | 'amber' | 'purple'>('blue');
  const [qcLocatingGps, setQcLocatingGps] = useState<boolean>(false);
  const [qcDetectedGps, setQcDetectedGps] = useState<DetectedUserGpsLocation | null>(null);
  const [qcGpsError, setQcGpsError] = useState<string | null>(null);

  const handleQcIdentifyMyLocation = async (target: 'from' | 'to' = 'from') => {
    if (qcLocatingGps) return;
    setQcLocatingGps(true);
    setQcGpsError(null);
    try {
      const place = await detectCurrentUserGpsPlace();
      setQcDetectedGps(place);
      if (target === 'from') {
        setQcFrom(place.city);
      } else {
        setQcTo(place.city);
      }
    } catch (err) {
      setQcGpsError(
        err instanceof Error
          ? err.message
          : 'Nu am putut identifica poziția curentă.'
      );
    } finally {
      setQcLocatingGps(false);
    }
  };

  // Lock background page scroll whenever a modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedCardDetail || quickCreateCell || printableDoc);
    if (isAnyModalOpen) {
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
  }, [selectedCardDetail, quickCreateCell, printableDoc]);

  // Open In-App Confirmation Popup before moving or reordering a Planning Card
  const requestCardMoveConfirmation = (
    sourceCard: HourlyPlanningCard,
    targetWeekOffset: number,
    targetDayIdx: number,
    targetHour: string,
    explicitSwapCard?: HourlyPlanningCard
  ) => {
    const freshNow = getRomaniaZonedNow();
    const fromWeekOffset = sourceCard.weekOffset ?? 0;
    if (
      fromWeekOffset === targetWeekOffset &&
      sourceCard.dayIndex === targetDayIdx &&
      sourceCard.hourSlot === targetHour
    ) {
      return;
    }

    const sourceWeekMeta = getPlanningWeekMeta(fromWeekOffset, freshNow);
    const sourceDayMeta = sourceWeekMeta.days[sourceCard.dayIndex];
    const targetWeekMeta = getPlanningWeekMeta(targetWeekOffset, freshNow);
    const targetDayMeta = targetWeekMeta.days[targetDayIdx];
    if (!targetDayMeta) return;

    const isSameDayReorder =
      fromWeekOffset === targetWeekOffset &&
      sourceCard.dayIndex === targetDayIdx;

    let swapWithCard: HourlyPlanningCard | undefined = explicitSwapCard;
    if (!swapWithCard && isSameDayReorder) {
      const targetCellCards = cards.filter(
        (c) =>
          c.id !== sourceCard.id &&
          (c.weekOffset ?? 0) === targetWeekOffset &&
          c.dayIndex === targetDayIdx &&
          c.hourSlot === targetHour
      );
      if (targetCellCards.length === 1) {
        swapWithCard = targetCellCards[0];
      }
    }

    setPendingCardMove({
      card: sourceCard,
      fromWeekOffset,
      fromDayIndex: sourceCard.dayIndex,
      fromDayLabel:
        sourceDayMeta?.label ?? WEEK_DAYS[sourceCard.dayIndex]?.label ?? 'Zi',
      fromDayDate:
        sourceDayMeta?.date ?? WEEK_DAYS[sourceCard.dayIndex]?.date ?? '',
      fromIsToday: Boolean(sourceDayMeta?.isToday),
      fromHourSlot: sourceCard.hourSlot,
      fromOrderNum: getPlanningOrderNumber(sourceCard.hourSlot),
      toWeekOffset: targetWeekOffset,
      toDayIndex: targetDayIdx,
      toIsoDate: targetDayMeta.isoDate,
      toDayShort: targetDayMeta.short,
      toDayLabel: targetDayMeta.label,
      toDayDate: targetDayMeta.date,
      toIsToday: targetDayMeta.isToday,
      toIsPastDay: targetDayMeta.isPastDay,
      toHourSlot: targetHour,
      toOrderNum: getPlanningOrderNumber(targetHour),
      swapWithCard,
    });
  };

  // Apply Confirmed Card Move / Order Swap
  const applyConfirmedCardMove = (
    move: NonNullable<typeof pendingCardMove>
  ) => {
    const fromIsoResolved =
      move.card.isoDate ||
      getPlanningWeekMeta(move.fromWeekOffset, getRomaniaZonedNow()).days[
        move.fromDayIndex
      ]?.isoDate;

    const movedPrimary: HourlyPlanningCard = {
      ...move.card,
      weekOffset: move.toWeekOffset,
      isoDate: move.toIsoDate,
      dayIndex: move.toDayIndex,
      hourSlot: move.toHourSlot,
      completed: move.toIsPastDay ? move.card.completed : false,
    };

    setCards((prev) =>
      prev.map((c) => {
        if (c.id === move.card.id) {
          return movedPrimary;
        }
        if (move.swapWithCard && c.id === move.swapWithCard.id) {
          return {
            ...c,
            weekOffset: move.fromWeekOffset,
            isoDate: fromIsoResolved ?? c.isoDate,
            dayIndex: move.fromDayIndex,
            hourSlot: move.fromHourSlot,
          };
        }
        return c;
      })
    );

    if (selectedCardDetail?.id === move.card.id) {
      setSelectedCardDetail(movedPrimary);
    }

    if (move.swapWithCard) {
      setToastMessage(
        `Ordinea comenzilor actualizată pe ${move.toDayShort} ${move.toDayDate}: „${move.card.clientName}” → Ordinea #${move.toOrderNum} (schimb cu „${move.swapWithCard.clientName}” → Ordinea #${move.fromOrderNum}).`
      );
    } else {
      setToastMessage(
        `Comanda „${move.card.clientName}” (${move.card.ldm} LDM) a fost mutată pe ${move.toDayShort} ${move.toDayDate}${move.toIsToday ? ' (AZI)' : ''} · Ordinea #${move.toOrderNum}!`
      );
    }
  };

  const commitTrailerAssignToCard = (
    trailerObj: TrailerUnit,
    targetCard: HourlyPlanningCard,
    ev?: Evaluation
  ) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === targetCard.id
          ? {
              ...c,
              trailerId: trailerObj.id,
              tractorPlate: trailerObj.tractorId.split(' (')[0],
              driverName: trailerObj.driver1.name,
            }
          : c
      )
    );
    const contribSuffix = ev ? ` (+${ev.contributionEur} € estimat)` : '';
    setToastMessage(
      `Camionul ${trailerObj.id} (${trailerObj.driver1.name}) a fost alocat pe cursa "${targetCard.clientName}"${contribSuffix}!`
    );
  };

  const evaluateAndAssignTrailerToCard = (
    trailerObj: TrailerUnit,
    targetCard: HourlyPlanningCard
  ) => {
    const [fromCity = 'Oradea', toCity = 'Rotterdam'] = targetCard.routeLabel
      .split('→')
      .map((s) => s.trim())
      .filter(Boolean);
    const syntheticOrder: CargoOrder = {
      id: targetCard.linkedLoadId || targetCard.id,
      client: targetCard.clientName,
      fromCity,
      fromCountry: '',
      toCity,
      toCountry: '',
      ldm: targetCard.ldm,
      weightTons: targetCard.weightTons,
      pallets: Math.max(1, Math.round(targetCard.ldm * 2.4)),
      stackable: true,
      palletExchange: false,
      tempReq: targetCard.tempCelsius,
      tempZone: 'Zona 2 (Spate)',
      revenueEur: targetCard.revenueEur ?? Math.round(targetCard.ldm * 280),
      status: 'Nealocat',
      loadingWindow: targetCard.hourSlot,
      deliveryDeadline: '',
    };
    const ev = evaluateAllocation(trailerObj, syntheticOrder);
    if (ev.verdict === 'ok' && !ev.lifoConflict) {
      commitTrailerAssignToCard(trailerObj, targetCard, ev);
    } else {
      setPendingTruckAssign({ card: targetCard, trailer: trailerObj, evaluation: ev });
    }
  };

  // Drop handler on a Calendar Cell (dayIndex, hourSlot)
  const handleDropOnCell = (targetDayIdx: number, targetHour: string) => {
    setHoveredCellKey(null);
    if (!dragPayload) return;

    const freshNow = getRomaniaZonedNow();
    const targetDayMeta = getPlanningWeekMeta(weekOffset, freshNow).days[targetDayIdx];
    const targetIsPast =
      !targetDayMeta ||
      isPlanningSlotInPast(targetDayMeta.isoDate, targetHour, freshNow);

    if (dragPayload.kind === 'CARD') {
      const sourceCard = cards.find((c) => c.id === dragPayload.id);
      if (sourceCard && targetDayMeta) {
        requestCardMoveConfirmation(
          sourceCard,
          weekOffset,
          targetDayIdx,
          targetHour
        );
      }
    } else if (dragPayload.kind === 'PENDING_ORDER') {
      if (targetIsPast) {
        const snap = formatRomaniaClockSnapshot(freshNow);
        setToastMessage(
          `Nu poți planifica o comandă nouă pe o zi deja încheiată (${targetDayMeta?.label ?? ''} ${targetDayMeta?.date ?? ''} — Data curentă: ${snap.dateCompact}). Trage comanda pe ziua de azi sau pe o zi următoare!`
        );
        setDragPayload(null);
        return;
      }
      const order = unassignedOrders.find((o) => o.id === dragPayload.id);
      const rankedForDrop = order ? rankTrailersForOrder(trailers, order) : [];
      const bestForDrop = rankedForDrop.find((r) => r.verdict !== 'blocked');
      const assignedTrailer = bestForDrop
        ? trailers.find((tr) => tr.id === bestForDrop.trailerId)
        : undefined;
      if (order && !assignedTrailer) {
        setToastMessage(
          `Comanda ${order.id} (${order.ldm} LDM) nu încape pe nicio remorcă. ${rankedForDrop[0]?.reasons[0] ?? ''}`
        );
      } else if (order && assignedTrailer) {
        onAssignOrderToTrailer(
          order.id,
          assignedTrailer.id,
          targetDayIdx,
          targetHour,
          weekOffset
        );
        setLastCreatedCardId(`card-ord-${order.id}`);
        setToastMessage(
          `Comanda în așteptare "${order.client}" (${order.ldm} LDM) a fost planificată pe ${targetDayMeta.short} ${targetDayMeta.date} · ${formatPlanningOrderPosition(targetHour)} pe ${assignedTrailer.id}!`
        );
      }
    } else if (dragPayload.kind === 'TRUCK') {
      // If user drops a truck on a cell that already has a card, evaluate LDM/Temp/LIFO/Tacho before assigning
      const existingCard = cards.find(
        (c) =>
          (c.weekOffset ?? 0) === weekOffset &&
          c.dayIndex === targetDayIdx &&
          c.hourSlot === targetHour
      );
      const trailerObj = trailers.find((t) => t.id === dragPayload.id);
      if (existingCard && trailerObj) {
        evaluateAndAssignTrailerToCard(trailerObj, existingCard);
      } else if (trailerObj) {
        if (targetIsPast) {
          const snap = formatRomaniaClockSnapshot(freshNow);
          setToastMessage(
            `Nu poți deschide o cursă nouă pe o zi deja încheiată (${targetDayMeta?.label ?? ''} ${targetDayMeta?.date ?? ''} — Data curentă: ${snap.dateCompact}).`
          );
        } else {
          setQcTrailerId(trailerObj.id);
          setQcError(null);
          setQuickCreateCell({
            weekOffset,
            dayIndex: targetDayIdx,
            hourSlot: targetHour,
          });
        }
      }
    }

    setDragPayload(null);
  };

  // Drop a Truck or another Card directly onto an existing Card
  const handleDropOnCard = (
    e: React.DragEvent,
    targetCard: HourlyPlanningCard
  ) => {
    e.stopPropagation();
    setHoveredCardId(null);
    setHoveredCellKey(null);

    if (dragPayload?.kind === 'TRUCK') {
      const trailerObj = trailers.find((t) => t.id === dragPayload.id);
      if (trailerObj) {
        evaluateAndAssignTrailerToCard(trailerObj, targetCard);
      }
      setDragPayload(null);
      return;
    }

    if (dragPayload?.kind === 'CARD' && dragPayload.id !== targetCard.id) {
      const sourceCard = cards.find((c) => c.id === dragPayload.id);
      if (sourceCard) {
        const isSameDay =
          (sourceCard.weekOffset ?? 0) === (targetCard.weekOffset ?? 0) &&
          sourceCard.dayIndex === targetCard.dayIndex;
        requestCardMoveConfirmation(
          sourceCard,
          targetCard.weekOffset ?? weekOffset,
          targetCard.dayIndex,
          targetCard.hourSlot,
          isSameDay ? targetCard : undefined
        );
      }
      setDragPayload(null);
    }
  };

  // Submit Quick Create on Cell
  const handleQuickCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCreateCell) return;

    const freshNow = getRomaniaZonedNow();
    const submitWeekMeta = getPlanningWeekMeta(quickCreateCell.weekOffset, freshNow);
    const submitDayMeta = submitWeekMeta.days[quickCreateCell.dayIndex];
    if (
      !submitDayMeta ||
      isPlanningSlotInPast(submitDayMeta.isoDate, quickCreateCell.hourSlot, freshNow)
    ) {
      const nextValid = findFirstFuturePlanningSlot({
        weekOffset: quickCreateCell.weekOffset,
        preferredDayIndex: quickCreateCell.dayIndex,
        isSlotOccupied,
        zdtNow: freshNow,
      });
      setRoClock(formatRomaniaClockSnapshot(freshNow));
      setQuickCreateCell({
        weekOffset: nextValid.weekOffset,
        dayIndex: nextValid.dayIndex,
        hourSlot: nextValid.hourSlot,
      });
      const nextDayLabel =
        getPlanningWeekMeta(nextValid.weekOffset, freshNow).days[nextValid.dayIndex];
      setQcError(
        `Ziua selectată s-a încheiat deja. Poziția a fost actualizată automat la ${nextDayLabel.label} (${nextDayLabel.date}) · ${formatPlanningOrderPosition(nextValid.hourSlot)}. Apasă din nou „Salvează Cursa”.`
      );
      return;
    }

    const parseSafe = (val: string, fallback: number): number => {
      const n = parseFloat(val.trim().replace(',', '.'));
      return Number.isFinite(n) ? n : fallback;
    };

    const ldmNum = Math.min(13.6, Math.max(0.4, parseSafe(qcLdm, 2.4)));
    const weightNum = Math.min(24.0, Math.max(0.2, parseSafe(qcWeight, 3.5)));
    const palletsNum = Math.max(1, Math.round(parseSafe(qcPallets, 6)));
    const tempNum = Math.round(parseSafe(qcTemp, 4));
    const trKnown = trailers.find((t) => t.id === qcTrailerId);

    const fromShort = qcFrom.split(',')[0].trim() || 'Oradea';
    const toShort = qcTo.split(',')[0].trim() || 'Rotterdam';
    const computedDist = buildRoadDistanceWithDetourLabel(qcFrom, qcTo, 0);
    const roadKmNum =
      parseInt(computedDist.split(' km')[0].replace(/\./g, ''), 10) || 650;
    const autoTariff = Math.round(
      (roadKmNum * 1.18 * Math.max(0.22, ldmNum / 13.6) + 65) * 1.38 +
        ldmNum * 35
    );
    const revNum = Math.max(50, Math.round(parseSafe(qcRevenue, autoTariff)));

    const stamp = Date.now().toString().slice(-5);
    const linkedLoadId = `LD-${stamp}`;
    const cardId = `card-${Date.now()}`;

    const fromGeoResolved = resolveCityGeo(qcFrom);
    const toGeoResolved = resolveCityGeo(qcTo);

    const created: HourlyPlanningCard = {
      id: cardId,
      weekOffset: quickCreateCell.weekOffset,
      isoDate: submitDayMeta.isoDate,
      dayIndex: quickCreateCell.dayIndex,
      hourSlot: quickCreateCell.hourSlot,
      clientName: qcClient.trim() || 'Cursă Nouă',
      ldm: ldmNum,
      weightTons: weightNum,
      cargoSpec: `Grupaj: ${palletsNum} pal · Frigo`,
      routeLabel: `${fromShort} → ${toShort}`,
      kmDist: computedDist,
      tempCelsius: tempNum,
      trailerId: qcTrailerId,
      driverName: trKnown ? trKnown.driver1.name : '—',
      tractorPlate: qcTractorId || undefined,
      colorTheme: qcTheme,
      revenueEur: revNum,
      linkedLoadId,
      fromCoords: fromGeoResolved.coords,
      toCoords: toGeoResolved.coords,
    };

    setCards((prev) => [...prev, created]);
    onCreateDirectTrip?.({
      card: created,
      fromCity: fromShort,
      toCity: toShort,
      pallets: palletsNum,
      revenueEur: revNum,
    });
    if (weekOffset !== created.weekOffset && typeof created.weekOffset === 'number') {
      setWeekOffset(created.weekOffset);
    }
    setQcError(null);
    setQuickCreateCell(null);
    setLastCreatedCardId(created.id);
    setToastMessage(
      `Cursa "${created.clientName}" (${created.ldm} LDM · ${revNum} €) a fost salvată pe ${submitDayMeta.short} ${submitDayMeta.date} (${formatPlanningOrderPosition(created.hourSlot)}) pe ${created.trailerId} și sincronizată automat în Control Center și Comenzi & curse!`
    );
  };

  // Authentic Euro-Romanian License Plate Badge (`[★ RO | BH 67 STS]`)
  const renderEuroRoPlate = (plate: string, compact = true) => (
    <span
      className={`inline-flex items-stretch rounded-[3.5px] overflow-hidden border border-slate-500/85 shadow-2xs shrink-0 whitespace-nowrap select-none ${
        compact ? 'h-[15px]' : 'h-[20px]'
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      <span
        className={`flex flex-col items-center justify-center bg-[#003399] font-extrabold leading-none ${
          compact ? 'px-[2.5px] text-[5px]' : 'px-[4px] text-[6.5px]'
        }`}
        style={{ backgroundColor: '#003399', color: '#ffffff' }}
      >
        <span
          className="euro-ro-plate-star"
          style={{ color: '#ffcc00', fontSize: compact ? '4.5px' : '6px', lineHeight: 1 }}
        >
          ★
        </span>
        <span style={{ color: '#ffffff', lineHeight: 1, marginTop: '0.5px' }}>RO</span>
      </span>
      <span
        className={`euro-ro-plate-num flex items-center font-black tracking-[0.01em] tabular-nums leading-none whitespace-nowrap ${
          compact ? 'px-1 text-[8.5px]' : 'px-2 text-[11px]'
        }`}
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {plate}
      </span>
    </span>
  );

  // Render a single Shipment Card inside a cell (Sleek Dark Tahoe Glass & Clean Light Mode with Cartographic Texture & Euro-RO Plates)
  const renderCellCard = (card: HourlyPlanningCard) => {
    // Pick authentic OpenStreetMap highway tile for each corridor (Vienna, Rotterdam, Munich, Frankfurt, Hamburg)
    const osmTileUrl = card.routeLabel.includes('Viena')
      ? 'https://tile.openstreetmap.org/8/139/88.png'
      : card.routeLabel.includes('München') || card.routeLabel.includes('Stuttgart')
      ? 'https://tile.openstreetmap.org/8/136/88.png'
      : card.routeLabel.includes('Frankfurt') || card.routeLabel.includes('Köln')
      ? 'https://tile.openstreetmap.org/8/133/86.png'
      : card.routeLabel.includes('Hamburg') ||
        card.routeLabel.includes('Stockholm') ||
        card.routeLabel.includes('Göteborg')
      ? 'https://tile.openstreetmap.org/8/135/82.png'
      : 'https://tile.openstreetmap.org/8/131/84.png';

    const isDropHovered =
      !isDriverView &&
      hoveredCardId === card.id &&
      (dragPayload?.kind === 'TRUCK' ||
        (dragPayload?.kind === 'CARD' && dragPayload.id !== card.id));
    const matchedTrailer = trailers.find((t) => t.id === card.trailerId);
    const tractorPlate =
      card.tractorPlate ??
      (matchedTrailer ? matchedTrailer.tractorId.split(' (')[0] : '—');
    const isTwoPlateAssembly = tractorPlate !== card.trailerId && tractorPlate !== '—';

    const isJustCreated = lastCreatedCardId === card.id;
    const cardLife = getPlanningCardLifecycle(card, trailers, roClock.zdt);
    const isPastCard = cardLife.lifecycle === 'past';
    const routeStops = splitRouteStops(card.routeLabel);
    const cardHgv = resolveHgvVehicleProfile(matchedTrailer?.totalLdm ?? 13.6).isHgv;
    const routeDirectionsUrl = buildGoogleMapsDirectionsUrl(
      routeStops[0] || 'Oradea',
      routeStops[routeStops.length - 1] || routeStops[0] || 'Oradea',
      routeStops.slice(1, -1),
      { hgv: cardHgv }
    );

    return (
      <article
        key={card.id}
        data-card-id={card.id}
        data-card-theme={card.colorTheme}
        data-card-lifecycle={cardLife.lifecycle}
        draggable={!isDriverView}
        onDragStart={(e) => {
          if (isDriverView) return;
          e.stopPropagation();
          setDragPayload({ kind: 'CARD', id: card.id });
        }}
        onDragEnd={() => {
          if (isDriverView) return;
          setDragPayload(null);
          setHoveredCellKey(null);
          setHoveredCardId(null);
        }}
        onDragOver={(e) => {
          if (isDriverView) return;
          if (
            dragPayload?.kind === 'TRUCK' ||
            (dragPayload?.kind === 'CARD' && dragPayload.id !== card.id)
          ) {
            e.preventDefault();
            e.stopPropagation();
            setHoveredCardId(card.id);
          }
        }}
        onDragLeave={() => !isDriverView && setHoveredCardId(null)}
        onDrop={(e) => !isDriverView && handleDropOnCard(e, card)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedCardDetail(card);
        }}
        className={`planning-trip-card relative rounded-2xl ${
          isDriverView ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
        } overflow-hidden select-none h-[196px] w-full flex flex-col ${
          isPastCard ? 'border-dashed border-2' : ''
        } ${isDropHovered ? 'ring-2 ring-[#0A84FF] scale-[1.02]' : ''} ${
          isJustCreated ? 'ring-2 ring-[#30D158] shadow-lg shadow-[#30D158]/25' : ''
        }`}
      >
        {/* Card Top Colored Header Strip — Fixed Height 36px, Full Client Name & Clear Lifecycle Badge */}
        <header
          className="planning-card-header relative z-10 px-2 h-[36px] shrink-0 flex items-center justify-between gap-1"
          title={`${card.clientName} · ${cardLife.badgeLabel} (${card.ldm.toFixed(1)} LDM · ${card.weightTons.toFixed(1)}T)`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isPastCard ? (
              <CheckCircle2 className="w-3.5 h-3.5 planning-card-icon shrink-0" aria-hidden="true" />
            ) : (
              <span className="planning-card-dot shrink-0" aria-hidden="true" />
            )}
            <h3 className="planning-card-title text-[11px] font-extrabold leading-[1.15] line-clamp-2 break-words min-w-0">
              {card.clientName}
            </h3>
          </div>

          <span
            data-status={
              isPastCard
                ? 'past'
                : cardLife.lifecycle === 'planned'
                  ? 'planned'
                  : 'active'
            }
            className="planning-status-badge px-2 py-[3px] rounded-full text-[9.5px] font-extrabold uppercase tracking-[0.01em] shrink-0 leading-none"
          >
            {isPastCard
              ? '✓ Trecută'
              : cardLife.lifecycle === 'planned'
                ? '◷ Plan'
                : '● Activă'}
          </span>
        </header>

        {/* Card Body with Theme-Adaptive Cartographic Background (Uniform Fixed Row Heights) */}
        <div className="relative z-10 p-2 text-[11px] flex-1 flex flex-col justify-between overflow-hidden">
          {/* OpenStreetMap Tile Layer on Background (Dark-filtered in Dark Mode, Natural in Light Mode) */}
          <div
            className="planning-card-map-tile absolute inset-0 pointer-events-none bg-cover bg-right"
            style={{
              backgroundImage: `url(${osmTileUrl})`,
              backgroundSize: '145%',
              backgroundPosition: '82% 45%',
            }}
          />
          {/* Smooth Left-to-Right Readability Mask over Map Tile */}
          <div className="absolute inset-0 pointer-events-none planning-card-map-mask" />

          {/* Row 1: Cargo Spec (Fixed 26px height) + Explicit LDM & Tonnage Pills (Fixed 20px height) */}
          <div className="relative z-10 space-y-1">
            <div className="planning-card-cargo font-semibold flex items-start gap-1 text-[10.5px] leading-[1.15] h-[26px] overflow-hidden">
              <Layers className="w-3.5 h-3.5 planning-card-icon shrink-0 mt-0.5" />
              <span className="line-clamp-2 break-words">{card.cargoSpec}</span>
            </div>
            <div className="flex items-center justify-between gap-1.5 h-[20px]">
              <span
                className="planning-pill-ldm px-1.5 py-0.5 rounded-md font-extrabold tabular-nums text-[10px] leading-none shrink-0"
                title="Metri liniari de podea ocupați în semiremorcă (din 13.6 LDM)"
              >
                {card.ldm.toFixed(1)} LDM
              </span>
              <span
                className="planning-pill-tons px-1.5 py-0.5 rounded-md font-extrabold tabular-nums text-[10px] leading-none shrink-0"
                title="Greutate brută partidă marfă (Tone)"
              >
                {card.weightTons.toFixed(1)} T
              </span>
            </div>
          </div>

          {/* Row 2: Full Route (Clickable Google Maps Stops) + Distance + Temperature */}
          <div className="planning-card-divider relative z-10 pt-1 space-y-0.5">
            <div className="planning-card-route flex items-center gap-1 font-extrabold text-[11px] leading-tight h-[16px] min-w-0">
              <a
                href={routeDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`Deschide traseul ${card.routeLabel} în Google Maps`}
                aria-label={`Deschide traseul ${card.routeLabel} în Google Maps`}
                className="shrink-0 hover:scale-110 transition"
              >
                <MapPin className="w-3 h-3 planning-card-icon shrink-0" />
              </a>
              <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
                {routeStops.length > 0 ? (
                  routeStops.map((stop, sIdx) => (
                    <React.Fragment key={`${card.id}-stop-${sIdx}`}>
                      {sIdx > 0 && <span className="shrink-0 opacity-75">→</span>}
                      <a
                        href={buildGoogleMapsPlaceUrl(stop)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={`Deschide adresa ${stop} direct în Google Maps`}
                        className="truncate hover:underline decoration-1 underline-offset-2 cursor-pointer"
                      >
                        {stop}
                      </a>
                    </React.Fragment>
                  ))
                ) : (
                  <span className="truncate">{card.routeLabel}</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-1 whitespace-nowrap tabular-nums text-[9.5px] h-[16px]">
              <span
                className="planning-card-km font-bold truncate tracking-[-0.015em]"
                title={card.kmDist}
              >
                {card.kmDist}
              </span>
              <span className="planning-card-temp font-extrabold flex items-center gap-0.5 shrink-0">
                <ThermometerSnowflake className="w-3 h-3 planning-card-icon" />
                {card.tempCelsius > 0 ? `+${card.tempCelsius}` : card.tempCelsius}°C
              </span>
            </div>
          </div>

          {/* Row 3: Footer with BOTH Authentic Euro-Romanian License Plates (`Cap Tractor + Remorcă`) + Driver Name */}
          <footer className="planning-card-divider relative z-10 pt-1 space-y-1">
            <div className="flex items-center gap-0.5 whitespace-nowrap h-[17px]">
              {isTwoPlateAssembly && (
                <>
                  {renderEuroRoPlate(tractorPlate, true)}
                  <span className="planning-card-plus text-[9px] font-black leading-none">
                    +
                  </span>
                </>
              )}
              {renderEuroRoPlate(card.trailerId, true)}
            </div>
            <div className="flex items-center justify-between h-[18px]">
              <span className="planning-driver-chip text-[10px] font-bold truncate px-1.5 py-0.5 rounded-md w-full">
                Șofer: {card.driverName}
              </span>
            </div>
          </footer>
        </div>
      </article>
    );
  };

  const decisionOrder = decisionOrderId
    ? unassignedOrders.find((o) => o.id === decisionOrderId)
    : undefined;

  const handleConfirmFromDecision = (order: CargoOrder, trailerId: string) => {
    const tr = trailers.find((x) => x.id === trailerId);
    if (!tr) return;
    const dayFound = WEEK_DAYS.findIndex((d) =>
      order.loadingWindow.toLowerCase().startsWith(d.label.toLowerCase())
    );
    const preferredDayIdx = dayFound >= 0 ? dayFound : undefined;
    const hourMatch = order.loadingWindow.match(/(\d{2}):/);
    const rawHour =
      (hourMatch && HOUR_SLOTS.find((h) => h.startsWith(hourMatch[1]))) ||
      undefined;
    const safeSlot = findFirstFuturePlanningSlot({
      weekOffset,
      preferredDayIndex: preferredDayIdx,
      preferredHourSlot: rawHour,
      isSlotOccupied,
      zdtNow: getRomaniaZonedNow(),
    });
    onAssignOrderToTrailer(
      order.id,
      tr.id,
      safeSlot.dayIndex,
      safeSlot.hourSlot,
      safeSlot.weekOffset
    );
    if (safeSlot.weekOffset !== weekOffset) {
      setWeekOffset(safeSlot.weekOffset);
    }
    setLastCreatedCardId(`card-ord-${order.id}`);
    setDecisionOrderId(null);
    setToastMessage(
      `Comanda ${order.id} (${order.fromCity} → ${order.toCity}, ${order.ldm} LDM) a fost confirmată pe ${tr.id}. Capacitatea s-a actualizat pe segmentele traseului.`
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-2.5 rounded-full shadow-lg text-xs sm:text-sm font-bold flex items-center justify-between gap-3 border border-[#0284c7]"
          style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
        >
          <span style={{ color: '#ffffff' }}>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="px-3 py-1 rounded-full text-xs font-extrabold shadow-xs cursor-pointer shrink-0"
            style={{ backgroundColor: '#ffffff', color: '#0369a1' }}
          >
            OK
          </button>
        </div>
      )}

      {decisionOrder && (
        <OrderDecisionModal
          order={decisionOrder}
          trailers={trailers}
          onConfirm={handleConfirmFromDecision}
          onAdjustBulkhead={onUpdateBulkhead}
          onClose={() => setDecisionOrderId(null)}
        />
      )}

      {/* MAIN WORKSPACE: Full-Width 7-Day Grid on Top + 2-Column Pending Orders & Trucks Dock Below */}
      <div className="flex flex-col gap-4 items-stretch">
        {/* TOP FULL-WIDTH 7-DAY CALENDAR */}
        <div className="w-full space-y-4">
          {/* Planning Calendar Card — Unified macOS Tahoe Glass Surface */}
          <div className="tahoe-glass rounded-[26px] overflow-hidden">
            {/* Top Header Bar — Clean single-row toolbar on Desktop, compact 2-row layout on Mobile */}
            <div className="planning-toolbar-header px-3.5 sm:px-5 py-2.5 sm:py-3 text-white flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-3 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                  <Calendar
                    className="w-4 h-4 text-[#64D2FF] shrink-0 hidden sm:block"
                    aria-hidden="true"
                  />
                  <h1 className="text-[13.5px] sm:text-lg font-extrabold tracking-tight uppercase text-white whitespace-nowrap shrink-0">
                    {weekMeta.monthYearTitle}
                  </h1>

                  <div className="flex items-center tahoe-btn-secondary rounded-full px-0.5 sm:px-1 py-0.5 text-[11px] sm:text-xs font-bold text-white shrink-0">
                    <button
                      type="button"
                      onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                      disabled={weekOffset === 0}
                      aria-label="Săptămâna anterioară"
                      className="p-1 rounded-full hover:bg-white/10 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <span className="sm:hidden px-1 tabular-nums whitespace-nowrap">
                      {weekMeta.rangeLabel.replace(/\s+\d{4}$/, '')}
                    </span>
                    <span className="hidden sm:inline px-2 tabular-nums whitespace-nowrap">
                      {weekMeta.rangeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWeekOffset((w) => w + 1)}
                      aria-label="Săptămâna următoare"
                      className="p-1 rounded-full hover:bg-white/10 cursor-pointer transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {weekOffset > 0 && (
                    <button
                      type="button"
                      onClick={() => setWeekOffset(0)}
                      className="hidden md:inline-flex px-2.5 py-1 rounded-full tahoe-btn-secondary text-[11px] font-bold text-[#64D2FF] cursor-pointer whitespace-nowrap"
                    >
                      Săpt. curentă
                    </button>
                  )}
                </div>

                {!isDriverView && (
                  <button
                    type="button"
                    onClick={() => openQuickCreateModal()}
                    className="sm:hidden px-3 py-1.5 rounded-full tahoe-btn-primary text-[11px] font-extrabold text-white inline-flex items-center gap-1 shadow-md transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cursă</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                {/* Segmented Filter: Toate | Active | Trecute */}
                <div
                  role="group"
                  aria-label="Filtru stare curse în calendar"
                  className="w-full grid grid-cols-3 sm:w-auto sm:inline-flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/15"
                >
                  <button
                    type="button"
                    aria-pressed={cardStatusFilter === 'all'}
                    onClick={() => setCardStatusFilter('all')}
                    className={`min-w-0 px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center whitespace-nowrap cursor-pointer border ${
                      cardStatusFilter === 'all'
                        ? 'bg-[#0A84FF] text-white border-[#64D2FF]/50 shadow-xs'
                        : 'border-transparent text-white/70 hover:text-white'
                    }`}
                  >
                    <span className="truncate">Toate ({weekFilterCounts.all})</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={cardStatusFilter === 'active'}
                    onClick={() => setCardStatusFilter('active')}
                    className={`min-w-0 px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer border ${
                      cardStatusFilter === 'active'
                        ? 'bg-[#0A84FF] text-white border-[#64D2FF]/50 shadow-xs'
                        : 'border-transparent text-white/70 hover:text-white'
                    }`}
                  >
                    <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">Active ({weekFilterCounts.active})</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={cardStatusFilter === 'past'}
                    onClick={() => setCardStatusFilter('past')}
                    className={`min-w-0 px-2 sm:px-3 py-1.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer border ${
                      cardStatusFilter === 'past'
                        ? 'bg-emerald-600 text-white border-emerald-300/50 shadow-xs'
                        : 'border-transparent text-white/70 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">Trecute ({weekFilterCounts.past})</span>
                  </button>
                </div>

                {!isDriverView && (
                  <button
                    type="button"
                    onClick={() => openQuickCreateModal()}
                    className="hidden sm:inline-flex px-4 py-1.5 rounded-full tahoe-btn-primary text-xs font-extrabold text-white items-center gap-1.5 shadow-md transition cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cursă nouă</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Day Selector Bar (Visible on Mobile/Tablet `< lg` — all 7 days fit on 1 row on mobile) */}
            <div className="tps-subtab-scroller lg:hidden grid grid-cols-7 gap-1 p-2 sm:flex sm:items-center sm:gap-1.5 sm:flex-nowrap sm:overflow-x-auto no-scrollbar sm:p-3 border-b border-white/10">
              {weekMeta.days.map((d, idx) => {
                const dayCards = scopedCards.filter(
                  (c) =>
                    (c.weekOffset ?? 0) === weekOffset &&
                    c.dayIndex === idx &&
                    matchesCardFilter(c)
                );
                const totalLdm = dayCards.reduce((s, c) => s + c.ldm, 0);
                return (
                  <button
                    key={d.isoDate}
                    type="button"
                    aria-pressed={mobileDayIdx === idx}
                    onClick={(e) => {
                      setMobileDayIdx(idx);
                      setShowMobileEmptyPastSlots(false);
                      e.currentTarget.scrollIntoView({
                        block: 'nearest',
                        inline: 'center',
                      });
                    }}
                    className={`min-w-0 w-full sm:w-auto px-0.5 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl sm:rounded-full text-xs font-bold whitespace-nowrap sm:shrink-0 transition cursor-pointer border ${
                      mobileDayIdx === idx
                        ? 'bg-[#0A84FF] border-[#0A84FF] text-white shadow'
                        : d.isPastDay
                          ? 'tahoe-card-inner border-transparent text-white/45'
                          : 'tahoe-card-inner border-transparent text-white/85'
                    }`}
                  >
                    {/* Compact 7-column mobile day pill (`< 640px`) */}
                    <div className="sm:hidden flex flex-col items-center justify-center leading-none">
                      <span className="text-[9.5px] font-extrabold uppercase tracking-tight opacity-85">
                        {d.short}
                      </span>
                      <span className="text-[13px] font-black tabular-nums leading-tight mt-0.5">
                        {d.dayNum}
                      </span>
                      <span
                        className={`text-[8.5px] font-extrabold tabular-nums mt-0.5 px-1 rounded-full ${
                          d.isToday
                            ? mobileDayIdx === idx
                              ? 'bg-white/25 text-white'
                              : 'bg-[#30D158] text-white'
                            : 'opacity-80'
                        }`}
                      >
                        {d.isToday
                          ? 'AZI'
                          : totalLdm > 0
                            ? `${totalLdm.toFixed(1)}m`
                            : '—'}
                      </span>
                    </div>

                    {/* Tablet (`640px–1023px`) day pill */}
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1">
                        <span>
                          {d.short} {d.dayNum}
                        </span>
                        {d.isToday && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#30D158] text-white">
                            AZI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-80 tabular-nums">
                        {totalLdm.toFixed(1)} LDM
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mobile Day Cards List (`< lg`) — Order-based positions (#1..#11), auto-collapses empty slots on completed past days */}
            <div className="lg:hidden divide-y divide-white/10">
              {(() => {
                const mobileDayMeta =
                  weekMeta.days[mobileDayIdx] || weekMeta.days[0];
                const slotEntries = HOUR_SLOTS.map((hour) => {
                  const isMobileSlotPast = isPlanningSlotInPast(
                    mobileDayMeta.isoDate,
                    hour,
                    roClock.zdt
                  );
                  const cellCards = scopedCards.filter(
                    (c) =>
                      (c.weekOffset ?? 0) === weekOffset &&
                      c.dayIndex === mobileDayIdx &&
                      c.hourSlot === hour &&
                      matchesCardFilter(c)
                  );
                  return {
                    hour,
                    isMobileSlotPast,
                    cellCards,
                    isCellEmpty: cellCards.length === 0,
                  };
                });

                const emptyPastSlots = isDriverView
                  ? []
                  : slotEntries.filter(
                      (entry) => entry.isCellEmpty && entry.isMobileSlotPast
                    );
                const visibleEntries = isDriverView
                  ? slotEntries.filter((entry) => !entry.isCellEmpty)
                  : showMobileEmptyPastSlots
                    ? slotEntries
                    : slotEntries.filter(
                        (entry) => !(entry.isCellEmpty && entry.isMobileSlotPast)
                      );

                return (
                  <>
                    {!isDriverView && emptyPastSlots.length > 0 && (
                      <button
                        type="button"
                        aria-expanded={showMobileEmptyPastSlots}
                        onClick={() =>
                          setShowMobileEmptyPastSlots((prev) => !prev)
                        }
                        className="w-full px-3.5 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] text-[11px] font-semibold text-white/55 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="tabular-nums truncate">
                          {emptyPastSlots.length === 1
                            ? `1 poziție liberă din ziua încheiată (${formatPlanningOrderPosition(emptyPastSlots[0].hour)})`
                            : `${emptyPastSlots.length} poziții libere din ziua încheiată (#${getPlanningOrderNumber(emptyPastSlots[0].hour)}–#${getPlanningOrderNumber(emptyPastSlots[emptyPastSlots.length - 1].hour)})`}
                        </span>
                        <span className="text-[#64D2FF] font-bold shrink-0">
                          {showMobileEmptyPastSlots ? 'Ascunde' : 'Afișează'}
                        </span>
                      </button>
                    )}

                    {visibleEntries.length === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-white/55">
                        Nu există curse programate pentru {mobileDayMeta.label} ({mobileDayMeta.date}).
                      </div>
                    )}

                    {visibleEntries.map(
                      ({ hour, isMobileSlotPast, cellCards, isCellEmpty }) => (
                        <div
                          key={hour}
                          onClick={() => {
                            if (isDriverView || !isCellEmpty) return;
                            if (isMobileSlotPast) {
                              setToastMessage(
                                `Ziua ${mobileDayMeta.label} (${mobileDayMeta.date}) este deja încheiată. Selectează ziua de azi sau o zi următoare pentru o cursă nouă.`
                              );
                              return;
                            }
                            setQcError(null);
                            setQuickCreateCell({
                              weekOffset,
                              dayIndex: mobileDayIdx,
                              hourSlot: hour,
                            });
                          }}
                          className="p-3 flex items-start gap-3 hover:bg-white/5 transition"
                        >
                          <div className="flex-1 space-y-2 min-w-0">
                            {cellCards.map((c) => renderCellCard(c))}
                            {!isDriverView && isCellEmpty && !isMobileSlotPast && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQcError(null);
                                  setQuickCreateCell({
                                    weekOffset,
                                    dayIndex: mobileDayIdx,
                                    hourSlot: hour,
                                  });
                                }}
                                className="w-full min-h-[38px] py-2 rounded-full border border-dashed border-white/20 text-[11px] font-semibold text-white/60 hover:text-[#64D2FF] hover:border-[#0A84FF] flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" /> Creare rapidă · {formatPlanningOrderPosition(hour)}
                              </button>
                            )}
                            {!isDriverView && isCellEmpty && isMobileSlotPast && (
                              <div className="text-[11px] text-white/35 text-center py-1 tabular-nums">
                                {formatPlanningOrderPosition(hour)} · zi încheiată
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </>
                );
              })()}
            </div>

            {/* Desktop Full 7-Day Grid (`lg:block`) — No Hour Column, 100% Width for the 7 Days */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse table-fixed min-w-[1040px]">
                <thead>
                  <tr className="border-b border-white/15 bg-white/[0.03]">
                    {weekMeta.days.map((day, dIdx) => {
                      const dayCards = scopedCards.filter(
                        (c) =>
                          (c.weekOffset ?? 0) === weekOffset &&
                          c.dayIndex === dIdx &&
                          matchesCardFilter(c)
                      );
                      const sumTons = dayCards.reduce(
                        (acc, c) => acc + c.weightTons,
                        0
                      );
                      const sumLdm = dayCards.reduce((acc, c) => acc + c.ldm, 0);
                      return (
                        <th
                          key={day.isoDate}
                          className={`py-2.5 px-2 text-center border-r border-white/10 last:border-r-0 ${
                            day.isToday
                              ? 'bg-[#0A84FF]/10'
                              : day.isPastDay
                                ? 'opacity-75'
                                : ''
                          }`}
                        >
                          <div className="flex items-baseline justify-center gap-1.5">
                            <span
                              className={`text-xs font-extrabold uppercase tracking-wide ${
                                day.isToday
                                  ? 'text-[#0A84FF]'
                                  : day.isPastDay
                                    ? 'text-white/45'
                                    : 'text-[#64D2FF]'
                              }`}
                            >
                              {day.short}
                            </span>
                            <span
                              className={`text-base font-black leading-none tabular-nums ${
                                day.isPastDay ? 'text-white/60' : 'text-white'
                              }`}
                            >
                              {day.dayNum}
                            </span>
                            {day.isToday && (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider leading-none"
                                style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
                              >
                                AZI
                              </span>
                            )}
                          </div>
                          {sumLdm > 0 ? (
                            <div className="mt-1 text-[11px] tabular-nums font-extrabold flex items-center justify-center gap-1.5">
                              <span className="text-[#FF9F0A]">
                                {sumTons.toFixed(1)}T
                              </span>
                              <span className="text-white/30">·</span>
                              <span className="text-[#64D2FF]">
                                {sumLdm.toFixed(1)} LDM
                              </span>
                            </div>
                          ) : !day.hasFutureSlots ? (
                            <div className="mt-1 text-[11px] text-white/35 font-semibold">
                              Trecut
                            </div>
                          ) : (
                            <div className="mt-1 text-[11px] text-white/55 font-medium">
                              Disponibil
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {(() => {
                    const activeWeekHours = isDriverView
                      ? HOUR_SLOTS.filter((h) =>
                          scopedCards.some(
                            (c) =>
                              (c.weekOffset ?? 0) === weekOffset &&
                              c.hourSlot === h &&
                              matchesCardFilter(c)
                          )
                        )
                      : HOUR_SLOTS;
                    const rowsToRender =
                      isDriverView && activeWeekHours.length === 0
                        ? [HOUR_SLOTS[0]]
                        : activeWeekHours;
                    return rowsToRender;
                  })().map((hour) => (
                    <tr key={hour} className="min-h-[188px]">
                      {/* 7 Day Cells for this Order Row (No Left Hour Column) */}
                      {weekMeta.days.map((day, dIdx) => {
                        const cellKey = `${day.isoDate}-${hour}`;
                        const isPastSlot = isPlanningSlotInPast(
                          day.isoDate,
                          hour,
                          roClock.zdt
                        );
                        const canAcceptDragDrop =
                          !isDriverView && (dragPayload?.kind === 'CARD' || !isPastSlot);
                        const cellCards = scopedCards.filter(
                          (c) =>
                            (c.weekOffset ?? 0) === weekOffset &&
                            c.dayIndex === dIdx &&
                            c.hourSlot === hour &&
                            matchesCardFilter(c)
                        );
                        const isCellEmpty = cellCards.length === 0;
                        const isHovered = hoveredCellKey === cellKey;

                        return (
                          <td
                            key={cellKey}
                            data-day-index={dIdx}
                            data-order-slot={hour}
                            data-order-num={getPlanningOrderNumber(hour)}
                            onDragOver={(e) => {
                              if (canAcceptDragDrop) {
                                e.preventDefault();
                                setHoveredCellKey(cellKey);
                              }
                            }}
                            onDragLeave={() => !isDriverView && setHoveredCellKey(null)}
                            onDrop={() => !isDriverView && handleDropOnCell(dIdx, hour)}
                            onClick={() => {
                              if (isDriverView || !isCellEmpty) return;
                              if (isPastSlot) {
                                setToastMessage(
                                  `Ziua ${day.label} (${day.date}) este deja încheiată. Selectează o poziție din ziua de azi sau dintr-o zi următoare ori apasă „+ Cursă nouă”.`
                                );
                                return;
                              }
                              setQcError(null);
                              setQuickCreateCell({
                                weekOffset,
                                dayIndex: dIdx,
                                hourSlot: hour,
                              });
                            }}
                            className={`group p-2 align-top border-r border-white/10 last:border-r-0 min-h-[188px] transition ${
                              isDriverView
                                ? 'cursor-default'
                                : isCellEmpty
                                  ? isPastSlot
                                    ? 'cursor-not-allowed bg-black/[0.04]'
                                    : 'cursor-pointer'
                                  : 'cursor-default'
                            } ${
                              isHovered && canAcceptDragDrop
                                ? 'bg-[#0A84FF]/20 ring-2 ring-inset ring-[#0A84FF]'
                                : !isDriverView && !isPastSlot
                                  ? 'hover:bg-white/[0.05]'
                                  : ''
                            }`}
                          >
                            <div className="space-y-2 min-h-[172px] flex flex-col justify-center">
                              {!isCellEmpty ? (
                                <div className="space-y-2 w-full">
                                  {cellCards.map((c) => renderCellCard(c))}
                                  {!isDriverView && !isPastSlot && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setQcError(null);
                                        setQuickCreateCell({
                                          weekOffset,
                                          dayIndex: dIdx,
                                          hourSlot: hour,
                                        });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity w-full flex items-center justify-center py-1.5 rounded-full border border-dashed border-[#0A84FF]/45 text-[10.5px] font-bold text-[#64D2FF] bg-[#0A84FF]/10 hover:bg-[#0A84FF]/20 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3 mr-1" /> Adaugă cursă ({formatPlanningOrderPosition(hour)})
                                    </button>
                                  )}
                                </div>
                              ) : !isDriverView && !isPastSlot ? (
                                /* Rapid Create Hover Trigger inside Today & Future Empty Cells */
                                <div
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center py-2.5 rounded-full border border-dashed border-[#0A84FF]/50 text-[11px] font-bold text-[#64D2FF] bg-[#0A84FF]/10"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Creare rapidă · {formatPlanningOrderPosition(hour)}
                                </div>
                              ) : isDriverView && dIdx === 3 && hour === HOUR_SLOTS[0] && weekFilterCounts.all === 0 ? (
                                <div className="text-[11px] text-white/45 text-center px-2">
                                  Fără curse programate
                                </div>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BOTTOM 2-COLUMN DOCK: Left = COMENZI ÎN AȘTEPTARE | Right = CAMIOANE & REMORCI (Admin only) */}
        {!isDriverView && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PANEL 1: COMENZI ÎN AȘTEPTARE */}
          <div className="tahoe-glass rounded-[24px] overflow-hidden">
            <div className="planning-toolbar-header px-4 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#64D2FF]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  COMENZI ÎN AȘTEPTARE
                </span>
              </div>
              <button
                type="button"
                onClick={() => openQuickCreateModal()}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                title="Adaugă cursă nouă"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2.5 max-h-[360px] overflow-y-auto">
              {unassignedOrders.map((order) => (
                <div
                  key={order.id}
                  draggable
                  onDragStart={() =>
                    setDragPayload({ kind: 'PENDING_ORDER', id: order.id })
                  }
                  onDragEnd={() => setDragPayload(null)}
                  onClick={() => {
                    setQcClient(order.client);
                    setQcFrom(order.fromCity);
                    setQcTo(order.toCity);
                    setQcLdm(String(order.ldm));
                    setQcWeight(String(order.weightTons));
                    setQcPallets(String(order.pallets));
                    setQcTemp(String(order.tempReq));
                    setQcRevenue(String(order.revenueEur));
                    openQuickCreateModal();
                  }}
                  className="p-3 rounded-2xl tahoe-card-inner hover:bg-white/10 border border-rose-500/30 transition cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#0A84FF]/20 text-[#64D2FF] font-extrabold text-xs truncate">
                      {order.client}
                    </span>
                    <span className="text-[11px] font-extrabold text-[#FF9F0A] tabular-nums shrink-0">
                      {order.ldm.toFixed(1)} LDM
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/75">
                    <span className="flex items-center gap-1 font-semibold text-white truncate">
                      <MapPin className="w-3 h-3 text-[#64D2FF] shrink-0" />
                      {order.fromCity} → {order.toCity}
                    </span>
                    <span className="text-white/60 tabular-nums shrink-0">
                      · {order.weightTons}T · +{order.tempReq}°C
                    </span>
                  </div>
                  {(() => {
                    const bestMatch = rankTrailersForOrder(trailers, order).find(
                      (r) => r.verdict !== 'blocked'
                    );
                    return (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className="text-[11px] font-bold truncate"
                          style={{
                            color: bestMatch
                              ? bestMatch.verdict === 'ok'
                                ? '#30D158'
                                : '#FF9F0A'
                              : '#FF453A',
                          }}
                        >
                          {bestMatch
                            ? `${bestMatch.verdict === 'ok' ? '✓ Încape pe' : '! Strâmt pe'} ${bestMatch.trailerId}`
                            : '✕ Nu încape pe nicio remorcă'}
                        </span>
                        <button
                          type="button"
                          draggable={false}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecisionOrderId(order.id);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-extrabold cursor-pointer shrink-0 hover:brightness-110"
                          style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
                        >
                          Unde o pun?
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM PANEL: CAMIOANE / REMORCI (ECHIPE) */}
          <div className="tahoe-glass rounded-[24px] overflow-hidden">
            <div className="planning-toolbar-header px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#64D2FF]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  CAMIOANE & REMORCI (ECHIPE)
                </span>
              </div>
              <p className="text-[11px] text-white/70 mt-0.5">
                Trage un camion peste cursă sau dă click pentru detalii remorcă.
              </p>
            </div>

            <div className="p-3 space-y-2.5 max-h-[440px] overflow-y-auto">
              {trailers.map((t) => {
                const borderStyle =
                  TRUCK_BORDER_COLORS[t.id] || 'border-l-[#0A84FF]';
                const tractorPlate = t.tractorId.split(' (')[0];
                const isTwoPlates = tractorPlate !== t.id;

                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() =>
                      setDragPayload({ kind: 'TRUCK', id: t.id })
                    }
                    onDragEnd={() => setDragPayload(null)}
                    onClick={() => {
                      const trailerCard =
                        weekCardsAll.find((c) => c.trailerId === t.id) ||
                        cards.find((c) => c.trailerId === t.id);
                      if (trailerCard) {
                        setSelectedCardDetail(trailerCard);
                      } else {
                        setQcTrailerId(t.id);
                        setQcTractorId(tractorPlate);
                        openQuickCreateModal();
                      }
                    }}
                    className={`p-3 rounded-2xl tahoe-card-inner hover:bg-white/10 border border-white/10 border-l-4 ${borderStyle} flex items-center justify-between gap-2 transition cursor-grab active:cursor-grabbing select-none`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isTwoPlates && (
                            <>
                              {renderEuroRoPlate(tractorPlate, true)}
                              <span className="text-[10px] font-black text-white/55">
                                +
                              </span>
                            </>
                          )}
                          {renderEuroRoPlate(t.id, true)}
                          <span className="text-xs font-extrabold text-white truncate">
                            {t.driver1.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-white/55 uppercase">
                          {t.driver2 ? '2 MEMBERS (ECHIPAJ)' : '1 MEMBER'} ·{' '}
                          <span className="text-[#30D158] tabular-nums">
                            {t.freeLdm.toFixed(1)}m liberi
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="w-6 h-6 rounded-full bg-white/10 text-white/75 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      E
                    </span>
                  </div>
                );
              })}

              {(idleTrailers.length > 0 || idleTractors.length > 0) && (
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/60">
                    Restul flotei · fără cursă alocată
                  </div>
                  <div className="text-[11px] text-white/55">
                    Remorci ({idleTrailers.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {idleTrailers.map((v) => (
                      <span key={v.plate} title={`${v.brand} · ${v.company}`}>
                        {renderEuroRoPlate(v.plate, true)}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-white/55">
                    Capete tractor ({idleTractors.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {idleTractors.map((v) => (
                      <span key={v.plate} title={`${v.brand} · ${v.company}`}>
                        {renderEuroRoPlate(v.plate, true)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* MODAL: DETALII COMPLETE CURSĂ / COMANDĂ DIN PLANNING */}
      {selectedCardDetail && (() => {
        const knownDetailTrailer = trailers.find(
          (t) => t.id === selectedCardDetail.trailerId
        );
        const detailMapTrip = buildSingleCardMapTrip(
          selectedCardDetail,
          trailers,
          roClock.zdt
        );
        const detailTrailer: TrailerUnit = detailMapTrip.trailer;
        const detailTractorPlate =
          selectedCardDetail.tractorPlate ??
          detailTrailer.tractorId.split(' (')[0];
        const detailIsTwoPlates = detailTractorPlate !== detailTrailer.id;
        const estRevenueEur = isDriverView
          ? 0
          : selectedCardDetail.revenueEur ?? Math.round(selectedCardDetail.ldm * 210 + 180);
        const estCostEur = isDriverView ? 0 : Math.round(selectedCardDetail.ldm * 65 + 70);
        const estProfitEur = estRevenueEur - estCostEur;
        const modalStops = splitRouteStops(selectedCardDetail.routeLabel);
        const modalProfile = resolveHgvVehicleProfile(detailTrailer.totalLdm);
        const modalDirectionsUrl = buildGoogleMapsDirectionsUrl(
          detailMapTrip.routeDef.checkpoints[0]
            ? `${detailMapTrip.routeDef.checkpoints[0].city}, ${detailMapTrip.routeDef.checkpoints[0].country}`
            : modalStops[0] || 'Oradea',
          detailMapTrip.routeDef.checkpoints[detailMapTrip.routeDef.checkpoints.length - 1]
            ? `${detailMapTrip.routeDef.checkpoints[detailMapTrip.routeDef.checkpoints.length - 1].city}, ${detailMapTrip.routeDef.checkpoints[detailMapTrip.routeDef.checkpoints.length - 1].country}`
            : modalStops[modalStops.length - 1] || 'Oradea',
          detailMapTrip.routeDef.checkpoints
            .slice(1, -1)
            .map((cp) => `${cp.city}, ${cp.country}`),
          { hgv: modalProfile.isHgv }
        );
        const driverCmrStatusLabel =
          cmrStatusLookup?.(selectedCardDetail) || 'CMR Activ';

        return (
          <div
            onClick={() => setSelectedCardDetail(null)}
            className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Detalii cursă ${selectedCardDetail.clientName}`}
              className="tahoe-glass-elevated rounded-[24px] sm:rounded-[28px] max-w-5xl w-full p-3 sm:p-5 space-y-2.5 sm:space-y-4 shadow-2xl border border-white/20 my-auto max-h-[92vh] overflow-y-auto overscroll-contain"
            >
              {/* Top Header — ultra-compact on mobile, X always in top-right corner */}
              <div className="flex flex-nowrap items-start justify-between gap-2.5 border-b border-white/15 pb-2.5 sm:pb-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
                      DETALII PARTIDĂ MARFĂ &amp; CURSĂ
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30">
                      {(() => {
                        const detDay =
                          getPlanningWeekMeta(
                            selectedCardDetail.weekOffset ?? 0,
                            roClock.zdt
                          ).days[selectedCardDetail.dayIndex] ||
                          WEEK_DAYS[selectedCardDetail.dayIndex];
                        return `${detDay.short} ${detDay.date} · #${getPlanningOrderNumber(selectedCardDetail.hourSlot)}`;
                      })()}
                    </span>
                    {detailMapTrip.lifecycle === 'past' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
                        <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Finalizată</span>
                      </span>
                    ) : detailMapTrip.lifecycle === 'planned' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/35">
                        <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Planificată</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
                        <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>În tranzit</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-xl font-extrabold text-white mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
                    <span>{selectedCardDetail.clientName}</span>
                    <span className="text-white/40">·</span>
                    {modalStops.length > 0 ? (
                      modalStops.map((stop, idx) => (
                        <React.Fragment key={`mstop-${idx}`}>
                          {idx > 0 && <span className="text-white/50">→</span>}
                          <a
                            href={buildGoogleMapsPlaceUrl(stop)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Deschide ${stop} în Google Maps`}
                            className="inline-flex items-center gap-0.5 text-[#64D2FF] hover:underline decoration-2 underline-offset-4"
                          >
                            <span>{stop}</span>
                            <ExternalLink className="w-3 h-3 opacity-80" />
                          </a>
                        </React.Fragment>
                      ))
                    ) : (
                      <span>{selectedCardDetail.routeLabel}</span>
                    )}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-white/75 mt-1">
                    <span className="hidden sm:inline">Alocat pe</span>
                    {detailIsTwoPlates && (
                      <>
                        {renderEuroRoPlate(detailTractorPlate, false)}
                        <span className="font-black text-white/60">+</span>
                      </>
                    )}
                    {renderEuroRoPlate(detailTrailer.id, false)}
                    <span className="hidden sm:inline">({detailTrailer.trailerType})</span>
                    <span className="text-white/40">·</span>
                    <strong className="text-white">{detailTrailer.driver1.name}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCardDetail(null)}
                  aria-label="Închide detaliile cursei"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Primary Metrics — single slim row even on 390px phone */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <div className="tahoe-card-inner rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase text-white/55 truncate">
                    <span className="sm:hidden">LDM</span>
                    <span className="hidden sm:inline">SPAȚIU OCUPAT (LDM)</span>
                  </div>
                  <div className="text-xs sm:text-base font-extrabold text-[#64D2FF] tabular-nums mt-0.5 whitespace-nowrap">
                    {selectedCardDetail.ldm.toFixed(1)}<span className="hidden sm:inline"> LDM</span><span className="sm:hidden">m</span>
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
                    {selectedCardDetail.weightTons.toFixed(1)} T
                  </div>
                  <div className="hidden sm:block text-[10.5px] text-white/65 truncate">
                    {selectedCardDetail.cargoSpec}
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
                      {selectedCardDetail.tempCelsius > 0
                        ? `+${selectedCardDetail.tempCelsius}`
                        : selectedCardDetail.tempCelsius}
                      °C
                    </span>
                  </div>
                  <div className="hidden sm:block text-[10.5px] text-white/55">
                    Distanță / Ocol: {selectedCardDetail.kmDist}
                  </div>
                </div>

                {isDriverView ? (
                  <div className="tahoe-card-inner rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase text-white/55 truncate">
                      <span className="sm:hidden">CMR</span>
                      <span className="hidden sm:inline">DOCUMENT TRANSPORT (CMR)</span>
                    </div>
                    <div className="text-xs sm:text-base font-extrabold text-[#30D158] flex items-center justify-center sm:justify-start gap-1 mt-0.5 whitespace-nowrap truncate">
                      <FileCheck2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" />
                      <span className="truncate">{driverCmrStatusLabel}</span>
                    </div>
                    <div className="hidden sm:block text-[10.5px] text-white/55 tabular-nums truncate">
                      Ref: {selectedCardDetail.id.toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <div className="tahoe-card-inner rounded-xl p-1.5 sm:p-2.5 text-center sm:text-left">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase text-white/55 truncate">
                      <span className="sm:hidden">Net Est.</span>
                      <span className="hidden sm:inline">CONTRIBUȚIE NETĂ EST.</span>
                    </div>
                    <div className="text-xs sm:text-base font-extrabold text-[#30D158] tabular-nums mt-0.5 whitespace-nowrap">
                      +{estProfitEur} €
                    </div>
                    <div className="hidden sm:block text-[10.5px] text-white/55 tabular-nums">
                      Venit {estRevenueEur} € · Cost {estCostEur} €
                    </div>
                  </div>
                )}
              </div>

              {/* Edit Assignment / Reschedule Controls (Admin & Dispatcher Only) */}
              {!isDriverView && (
              <div className="tahoe-card-inner rounded-2xl p-4 space-y-3 border border-white/10">
                <div className="text-xs font-bold uppercase tracking-wider text-[#64D2FF]">
                  MODIFICARE RAPIDĂ ALOCARE CAMION, ZI SAU ORDINEA COMENZII
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-white/70 mb-1">
                      Ansamblu (Cap Tractor + Remorcă)
                    </label>
                    <select
                      value={selectedCardDetail.trailerId}
                      onChange={(e) => {
                        const chosenId = e.target.value;
                        const newTr = trailers.find((t) => t.id === chosenId);
                        const updated: HourlyPlanningCard = {
                          ...selectedCardDetail,
                          trailerId: chosenId,
                          driverName: newTr ? newTr.driver1.name : selectedCardDetail.driverName,
                          tractorPlate: newTr
                            ? newTr.tractorId.split(' (')[0]
                            : selectedCardDetail.tractorPlate,
                        };
                        setSelectedCardDetail(updated);
                        setCards((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c))
                        );
                      }}
                      className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                    >
                      <optgroup label="Cu șofer și curse în plan">
                        {trailers.map((t) => {
                          const trPlate = t.tractorId.split(' (')[0];
                          const pairLabel =
                            trPlate !== t.id ? `${trPlate} + ${t.id}` : t.id;
                          return (
                            <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                              {pairLabel} — {t.driver1.name} ({t.freeLdm.toFixed(1)}m liberi)
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label={`Vehicule disponibile din Flotă (${idleTrailers.length})`}>
                        {idleTrailers.map((v) => (
                          <option key={v.plate} value={v.plate} className="bg-slate-900 text-white">
                            {v.plate} · {v.company}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-white/70 mb-1">
                      Ziua Planificată
                    </label>
                    <select
                      value={selectedCardDetail.dayIndex}
                      onChange={(e) => {
                        const newDay = parseInt(e.target.value, 10);
                        requestCardMoveConfirmation(
                          selectedCardDetail,
                          selectedCardDetail.weekOffset ?? 0,
                          newDay,
                          selectedCardDetail.hourSlot
                        );
                      }}
                      className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                    >
                      {getPlanningWeekMeta(
                        selectedCardDetail.weekOffset ?? 0,
                        roClock.zdt
                      ).days.map((d) => (
                        <option
                          key={d.isoDate}
                          value={d.dayIndex}
                          className="bg-slate-900 text-white"
                        >
                          {d.label} ({d.date}){d.isToday ? ' · AZI' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-white/70 mb-1">
                      Ordinea Comenzii pe Zi
                    </label>
                    <select
                      value={selectedCardDetail.hourSlot}
                      onChange={(e) => {
                        requestCardMoveConfirmation(
                          selectedCardDetail,
                          selectedCardDetail.weekOffset ?? 0,
                          selectedCardDetail.dayIndex,
                          e.target.value
                        );
                      }}
                      className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                    >
                      {HOUR_SLOTS.map((h) => (
                        <option key={h} value={h} className="bg-slate-900 text-white">
                          {formatPlanningOrderPosition(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              )}

              {/* Full Route Map, Segments, Live Meteo & Clickable Google Maps Stops */}
              <div className="tahoe-card-inner rounded-2xl p-2.5 sm:p-3 space-y-2 border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="hidden sm:block text-xs font-bold uppercase tracking-wider text-[#30D158]">
                      TRASEUL COMPLET AL CURSEI ({detailTrailer.id}) · HARTĂ &amp; METEO LIVE
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      <span className="hidden sm:inline">Coridor: </span>
                      {detailTrailer.routeSummary.join(' → ')} ·{' '}
                      <span className="text-[#64D2FF]">
                        {detailMapTrip.routeDef.totalTechKm.toLocaleString('ro-RO')} km
                      </span>{' '}
                      <span className="hidden sm:inline">
                        · Liber remorcă:{' '}
                        <span className="text-[#30D158]">
                          {detailTrailer.freeLdm.toFixed(1)} LDM
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
                    {knownDetailTrailer && (
                      <div className="hidden sm:block text-xs text-white/70 tabular-nums">
                        Z1: <strong>{detailTrailer.zone1Temp}°C</strong> / Z2:{' '}
                        <strong>+{detailTrailer.zone2Temp}°C</strong> · Tahograf:{' '}
                        <strong>{detailTrailer.driver1.remainingDailyDriveHours}h azi</strong>
                      </div>
                    )}
                    {detailMapTrip.routeDef.coordinates.length >= 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadTruckCorridorGpx(
                            `${selectedCardDetail.trailerId}-${detailMapTrip.routeDef.tripCode}`,
                            `${selectedCardDetail.clientName} · ${detailMapTrip.routeDef.highwayCorridor}`,
                            detailMapTrip.routeDef.coordinates,
                            detailMapTrip.routeDef.checkpoints.map((cp) => ({
                              city: cp.city,
                              country: cp.country,
                              coords: cp.coords,
                            }))
                          )
                        }
                        title="Descarcă ruta HGV 40T (.gpx) pentru GPS dedicat de camion (Garmin dēzl, TomTom GO Expert, Sygic Truck)"
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>GPX 40T</span>
                      </button>
                    )}
                    <a
                      href={modalDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={modalProfile.googleMapsWarningRo}
                      className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#30D158]/20 hover:bg-[#30D158]/30 border border-[#30D158]/40 text-[#30D158] text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 shrink-0"
                    >
                      <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="sm:hidden">Google Maps (40T)</span>
                      <span className="hidden sm:inline">Navighează în Google Maps (40T)</span>
                      <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </a>
                  </div>
                </div>

                <div
                  className="rounded-xl px-2.5 py-1 sm:py-1.5 bg-amber-500/[0.08] border border-amber-400/25 flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] sm:text-[11px]"
                  title={modalProfile.googleMapsWarningRo}
                >
                  <span className="font-bold text-amber-300">
                    {modalProfile.shortBadge} · {detailMapTrip.routeDef.estDriveHours}
                    <span className="hidden sm:inline"> · L 16.5m · Vit. med. 73 km/h + CE 561</span>
                  </span>
                  <span className="hidden sm:inline text-white/70">
                    Google Maps folosește doar profil autoturism — punctele A3/M0/A4/A8/A67 sunt injectate automat; verifică restricțiile &gt;7.5t &amp; H 4.0m.
                  </span>
                  <span className="sm:hidden text-white/65">
                    Profil auto Maps — verifică &gt;7.5t
                  </span>
                </div>

                {/* Compact Inline Checkpoints Strip (Open Any Stop in Google Maps + Live Meteo) */}
                {detailMapTrip.routeDef.checkpoints.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {detailMapTrip.routeDef.checkpoints.map((cp, cpIdx) => {
                      const liveWx = resolveLiveCheckpointWeather(
                        liveWeatherSnap,
                        cp.city,
                        cp.coords
                      );
                      const wxTemp = liveWx ? Math.round(liveWx.tempC) : cp.tempC;
                      const wxDesc = liveWx ? liveWx.weatherDescRo : cp.weatherDesc;
                      const shortKm = cp.techKm.split(' (')[0];
                      return (
                        <React.Fragment key={`${cp.city}-${cpIdx}`}>
                          {cpIdx > 0 && (
                            <span className="text-white/30 text-[10px] font-bold hidden sm:inline">
                              →
                            </span>
                          )}
                          <a
                            href={buildGoogleMapsPlaceUrl(`${cp.city}, ${cp.country}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${cp.city} (${cp.country}) · ${wxTemp > 0 ? `+${wxTemp}` : wxTemp}°C (${wxDesc}) · ${cp.techKm} — Click pentru Google Maps`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition hover:border-[#0A84FF]/60 tabular-nums ${
                              cp.completed
                                ? 'bg-[#30D158]/10 border-[#30D158]/30 text-white'
                                : cp.current
                                  ? 'bg-[#0A84FF]/15 border-[#0A84FF]/45 text-white'
                                  : 'bg-white/[0.04] border-white/15 text-white/85'
                            }`}
                          >
                            <MapPin className="w-3 h-3 text-[#64D2FF] shrink-0" />
                            <span className="font-bold">
                              {cpIdx + 1}. {cp.city}
                            </span>
                            <span className="text-[#FF9F0A] font-bold">
                              {wxTemp > 0 ? `+${wxTemp}` : wxTemp}°C
                            </span>
                            <span className="text-white/55 text-[10px]">
                              · {shortKm}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 text-[#64D2FF] shrink-0 opacity-80" />
                          </a>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Per-Trailer Bi-Temp 13.6m Bulkhead & Segment LDM Disclosure (Admin only) */}
                {!isDriverView && knownDetailTrailer && knownDetailTrailer.segments.length > 0 && (
                  <details className="planning-bitemp-disclosure rounded-xl border border-white/12 bg-black/20 px-3.5 py-2.5 text-xs">
                    <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2 font-bold text-white">
                        <Sliders
                          className="w-3.5 h-3.5 text-[#64D2FF] shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          Perete despărțitor Bi-Temp 13.6m ({knownDetailTrailer.id}):{' '}
                          <span className="text-[#64D2FF] tabular-nums">
                            Z1 {(knownDetailTrailer.segments[0]?.zone1MaxLdm ?? 6.8).toFixed(1)}m
                          </span>{' '}
                          /{' '}
                          <span className="text-[#30D158] tabular-nums">
                            Z2 {(knownDetailTrailer.segments[0]?.zone2MaxLdm ?? 6.8).toFixed(1)}m
                          </span>
                        </span>
                      </span>
                      <span className="planning-bitemp-toggle-hint text-[11px] font-bold text-[#64D2FF]">
                        Reglează compartimentele ▾
                      </span>
                    </summary>

                    <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label
                          htmlFor={`${qcFormId}-bulkhead`}
                          className="text-xs font-semibold text-white/80"
                        >
                          Poziție perete Zona 1 ({knownDetailTrailer.zone1Temp}°C) / Zona 2 (+{knownDetailTrailer.zone2Temp}°C)
                        </label>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <input
                            id={`${qcFormId}-bulkhead`}
                            type="range"
                            min={3.4}
                            max={10.2}
                            step={0.4}
                            value={knownDetailTrailer.segments[0]?.zone1MaxLdm ?? 6.8}
                            style={
                              {
                                '--progress': `${Math.round(
                                  (((knownDetailTrailer.segments[0]?.zone1MaxLdm ?? 6.8) -
                                    3.4) /
                                    (10.2 - 3.4)) *
                                    100
                                )}%`,
                              } as React.CSSProperties
                            }
                            onChange={(e) =>
                              onUpdateBulkhead(
                                knownDetailTrailer.id,
                                parseFloat(e.target.value)
                              )
                            }
                            className="bitemp-range-slider flex-1 sm:w-44 cursor-pointer"
                          />
                          <span className="text-xs font-extrabold tabular-nums text-white shrink-0">
                            {(knownDetailTrailer.segments[0]?.zone1MaxLdm ?? 6.8).toFixed(1)}m /{' '}
                            {(knownDetailTrailer.segments[0]?.zone2MaxLdm ?? 6.8).toFixed(1)}m
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {knownDetailTrailer.segments.map((seg) => (
                          <div
                            key={seg.id}
                            className="tahoe-card-inner rounded-xl p-2.5 text-[11px] space-y-1"
                          >
                            <div className="font-bold text-white truncate">
                              {seg.fromCity} → {seg.toCity}
                            </div>
                            <div className="flex justify-between tabular-nums">
                              <span className="text-white/60">
                                Ocupat: {seg.occupiedLdm.toFixed(1)}m
                              </span>
                              <span className="text-[#30D158] font-bold">
                                Liber: {Math.max(0, seg.totalLdm - seg.occupiedLdm).toFixed(1)} LDM
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

                {/* Interactive Leaflet HGV Map for THIS Specific Trip's Complete Route */}
                <EuropeLiveMap
                  trailers={[detailTrailer]}
                  singleTripItem={detailMapTrip}
                  singleTripMode
                  heightClass="h-[260px] sm:h-[310px]"
                />
              </div>

              {/* Footer Actions */}
              {isDriverView ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/15">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const [fromPart, toPart] =
                          selectedCardDetail.routeLabel.split(' → ');
                        setPrintableDoc({
                          docType: 'CMR',
                          referenceNo: selectedCardDetail.id.toUpperCase(),
                          clientName: selectedCardDetail.clientName,
                          fromCity: fromPart || 'Oradea',
                          toCity: toPart || 'Rotterdam',
                          cargoDesc: selectedCardDetail.cargoSpec,
                          ldm: selectedCardDetail.ldm,
                          weightTons: selectedCardDetail.weightTons,
                          tempRegime: `${
                            selectedCardDetail.tempCelsius > 0
                              ? `+${selectedCardDetail.tempCelsius}`
                              : selectedCardDetail.tempCelsius
                          }°C`,
                          tractorPlate: detailTractorPlate,
                          trailerPlate: detailTrailer.id,
                          driverName: selectedCardDetail.driverName || detailTrailer.driver1.name,
                          revenueEur: 0,
                        });
                      }}
                      className="px-4 py-2 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/40 text-[#64D2FF] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Vezi / Printează CMR</span>
                    </button>

                    {onAttachExpenseForTrip && (
                      <button
                        type="button"
                        onClick={() => {
                          const refId =
                            selectedCardDetail.linkedLoadId || selectedCardDetail.id;
                          const label = `${selectedCardDetail.clientName} · ${selectedCardDetail.routeLabel}`;
                          setSelectedCardDetail(null);
                          onAttachExpenseForTrip(refId, label);
                        }}
                        className="px-4 py-2 rounded-full bg-[#FF9F0A]/15 hover:bg-[#FF9F0A]/25 border border-[#FF9F0A]/40 text-[#FF9F0A] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Atașează Bon / Cheltuială</span>
                      </button>
                    )}

                    <a
                      href={modalDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-full bg-[#30D158]/20 hover:bg-[#30D158]/30 border border-[#30D158]/40 text-[#30D158] text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Deschide Google Maps</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCardDetail(null)}
                    className="px-5 py-2 rounded-full tahoe-btn-primary text-xs font-bold text-white cursor-pointer"
                  >
                    Închide
                  </button>
                </div>
              ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/15">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...selectedCardDetail,
                        completed: !selectedCardDetail.completed,
                      };
                      setSelectedCardDetail(updated);
                      setCards((prev) =>
                        prev.map((c) => (c.id === updated.id ? updated : c))
                      );
                    }}
                    className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#30D158]" />
                    <span>
                      {selectedCardDetail.completed
                        ? 'Reactivează (Mută în Active)'
                        : 'Marchează Finalizată (Trecută)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const [fromPart, toPart] =
                        selectedCardDetail.routeLabel.split(' → ');
                      setPrintableDoc({
                        docType: 'CMR',
                        referenceNo: selectedCardDetail.id.toUpperCase(),
                        clientName: selectedCardDetail.clientName,
                        fromCity: fromPart || 'Oradea',
                        toCity: toPart || 'Rotterdam',
                        cargoDesc: selectedCardDetail.cargoSpec,
                        ldm: selectedCardDetail.ldm,
                        weightTons: selectedCardDetail.weightTons,
                        tempRegime: `${
                          selectedCardDetail.tempCelsius > 0
                            ? `+${selectedCardDetail.tempCelsius}`
                            : selectedCardDetail.tempCelsius
                        }°C`,
                        tractorPlate: detailTractorPlate,
                        trailerPlate: detailTrailer.id,
                        driverName: detailTrailer.driver1.name,
                        revenueEur: selectedCardDetail.revenueEur ?? estRevenueEur,
                      });
                    }}
                    className="px-4 py-2 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/40 text-[#64D2FF] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print CMR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const [fromPart, toPart] =
                        selectedCardDetail.routeLabel.split(' → ');
                      setPrintableDoc({
                        docType: 'INVOICE',
                        referenceNo: `44${selectedCardDetail.id.replace(/\D/g, '') || '25'}`,
                        clientName: selectedCardDetail.clientName,
                        fromCity: fromPart || 'Oradea',
                        toCity: toPart || 'Rotterdam',
                        cargoDesc: selectedCardDetail.cargoSpec,
                        ldm: selectedCardDetail.ldm,
                        weightTons: selectedCardDetail.weightTons,
                        tempRegime: `${
                          selectedCardDetail.tempCelsius > 0
                            ? `+${selectedCardDetail.tempCelsius}`
                            : selectedCardDetail.tempCelsius
                        }°C`,
                        tractorPlate: detailTractorPlate,
                        trailerPlate: detailTrailer.id,
                        driverName: detailTrailer.driver1.name,
                        revenueEur: selectedCardDetail.revenueEur ?? estRevenueEur,
                      });
                    }}
                    className="px-4 py-2 rounded-full bg-[#30D158]/15 hover:bg-[#30D158]/25 border border-[#30D158]/40 text-[#30D158] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Factură Proformă</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeletePlanningCard) {
                        onDeletePlanningCard(
                          selectedCardDetail.id,
                          selectedCardDetail.linkedLoadId
                        );
                      } else {
                        setCards((prev) =>
                          prev.filter((c) => c.id !== selectedCardDetail.id)
                        );
                      }
                      setSelectedCardDetail(null);
                      setToastMessage(
                        `Partida "${selectedCardDetail.clientName}" a fost eliminată din grila de planning.`
                      );
                    }}
                    className="px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Șterge din Celulă
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCardDetail(null)}
                    className="px-5 py-2 rounded-full tahoe-btn-primary text-xs font-bold text-white cursor-pointer"
                  >
                    Salvează & Închide
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL: CREARE RAPIDĂ PE ORICE CELULĂ VIITOARE / CURSĂ NOUĂ */}
      {quickCreateCell && (() => {
        const modalWeekMeta = getPlanningWeekMeta(
          quickCreateCell.weekOffset,
          roClock.zdt
        );
        const modalDay =
          modalWeekMeta.days[quickCreateCell.dayIndex] || modalWeekMeta.days[0];
        const selectedQcTrailerObj = trailers.find((t) => t.id === qcTrailerId);

        return (
          <div
            onClick={() => {
              setQcError(null);
              setQuickCreateCell(null);
            }}
            className="modal-backdrop-lock fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overscroll-contain overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="tahoe-glass-elevated rounded-[26px] max-w-md w-full p-6 space-y-3.5 shadow-2xl border border-white/20 max-h-[92vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64D2FF]">
                      CURSĂ NOUĂ · SALVARE PERMANENTĂ
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/35 text-[10px] font-bold text-[#64D2FF] tabular-nums">
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span>RO: {roClock.dateCompact} · {roClock.timeShort}</span>
                    </span>
                  </div>
                  <h3
                    id={`${qcFormId}-heading`}
                    className="text-lg font-extrabold text-white truncate mt-0.5"
                  >
                    {modalDay.label} ({modalDay.date}) ·{' '}
                    {formatPlanningOrderPosition(quickCreateCell.hourSlot)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQcError(null);
                    setQuickCreateCell(null);
                  }}
                  className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
                  aria-label="Închide fereastra"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {qcError && (
                <div
                  role="alert"
                  className="px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{qcError}</span>
                </div>
              )}

              <form
                aria-labelledby={`${qcFormId}-heading`}
                onSubmit={handleQuickCreateSubmit}
                className="space-y-3 text-xs"
              >
                {/* Day & Slot Picker inside Quick Create (Past Days & Past Hours Disabled) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${qcFormId}-day`}
                      className="block font-bold text-white/75 mb-1"
                    >
                      Ziua încărcării
                    </label>
                    <select
                      id={`${qcFormId}-day`}
                      name="dayIndex"
                      value={quickCreateCell.dayIndex}
                      onChange={(e) => {
                        const nextDay = Number(e.target.value);
                        const nextDayMeta = modalWeekMeta.days[nextDay];
                        if (!nextDayMeta || !nextDayMeta.hasFutureSlots) return;
                        const currentHourStillValid = !isPlanningSlotInPast(
                          nextDayMeta.isoDate,
                          quickCreateCell.hourSlot,
                          roClock.zdt
                        );
                        const nextSlot = currentHourStillValid
                          ? quickCreateCell.hourSlot
                          : findFirstFuturePlanningSlot({
                              weekOffset: quickCreateCell.weekOffset,
                              preferredDayIndex: nextDay,
                              isSlotOccupied,
                              zdtNow: roClock.zdt,
                            }).hourSlot;
                        setQcError(null);
                        setQuickCreateCell({
                          weekOffset: quickCreateCell.weekOffset,
                          dayIndex: nextDay,
                          hourSlot: nextSlot,
                        });
                      }}
                      className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white font-bold border border-white/15"
                    >
                      {modalWeekMeta.days.map((d) => (
                        <option
                          key={d.isoDate}
                          value={d.dayIndex}
                          disabled={!d.hasFutureSlots}
                          className="bg-slate-900 text-white"
                        >
                          {d.label} ({d.date})
                          {!d.hasFutureSlots
                            ? ' · trecut'
                            : d.isToday
                              ? ' · AZI'
                              : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`${qcFormId}-slot`}
                      className="block font-bold text-white/75 mb-1"
                    >
                      Ordinea comenzii pe zi
                    </label>
                    <select
                      id={`${qcFormId}-slot`}
                      name="hourSlot"
                      value={quickCreateCell.hourSlot}
                      onChange={(e) => {
                        setQcError(null);
                        setQuickCreateCell({
                          ...quickCreateCell,
                          hourSlot: e.target.value,
                        });
                      }}
                      className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white font-bold border border-white/15 tabular-nums"
                    >
                      {HOUR_SLOTS.map((slot) => {
                        const slotPast = isPlanningSlotInPast(
                          modalDay.isoDate,
                          slot,
                          roClock.zdt
                        );
                        const occupied = isSlotOccupied(
                          quickCreateCell.weekOffset,
                          quickCreateCell.dayIndex,
                          slot
                        );
                        return (
                          <option
                            key={slot}
                            value={slot}
                            disabled={slotPast}
                            className="bg-slate-900 text-white"
                          >
                            {formatPlanningOrderPosition(slot)}{' '}
                            {slotPast
                              ? '· zi încheiată'
                              : occupied
                                ? '· ocupat (+grupaj)'
                                : '· liber'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <ClientDropdownSelect
                  label="Client / Denumire Cursă (din Baza de Clienți)"
                  value={qcClient}
                  onChange={setQcClient}
                  onSelectClientRecord={(client) => {
                    setQcFrom(client.defaultFromCity);
                    setQcTo(client.defaultToCity);
                    setQcLdm(String(client.defaultLdm));
                    setQcWeight(String(client.defaultWeightTons));
                    setQcTemp(String(client.defaultTemp));
                  }}
                />

                {/* Live Geolocation Bar ("Identifică unde sunt" + Poziția GPS a camionului selectat) */}
                <div className="p-2.5 rounded-2xl tahoe-card-inner border border-[#0A84FF]/35 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleQcIdentifyMyLocation('from')}
                      disabled={qcLocatingGps}
                      className="px-3 py-1.5 rounded-full tahoe-btn-primary text-[11px] font-extrabold text-white inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {qcLocatingGps ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <LocateFixed className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>
                        {qcLocatingGps
                          ? 'Se identifică unde ești...'
                          : 'Identifică unde sunt (GPS Live)'}
                      </span>
                    </button>

                    {selectedQcTrailerObj && (
                      <button
                        type="button"
                        onClick={() =>
                          setQcFrom(
                            selectedQcTrailerObj.currentLocation.city.split(' (')[0]
                          )
                        }
                        title="Preia orașul în care se află acum camionul selectat"
                        className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[10.5px] font-bold text-white/85 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Radio className="w-3 h-3 text-[#30D158] shrink-0" />
                        <span className="truncate max-w-[165px]">
                          Camion: {selectedQcTrailerObj.currentLocation.city.split(' (')[0]}
                        </span>
                      </button>
                    )}
                  </div>

                  {qcDetectedGps && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/12 border border-emerald-500/35 text-[10.5px] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#30D158] truncate">
                          📍 Localizat: {qcDetectedGps.city} (±{qcDetectedGps.accuracyMeters}m)
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${qcDetectedGps.lat},${qcDetectedGps.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-[#0A84FF] hover:underline shrink-0"
                        >
                          <span>Hartă GPS</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="text-white/75 truncate text-[10px]">
                        {qcDetectedGps.fullAddress}
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setQcFrom(qcDetectedGps.city)}
                          className="px-2.5 py-0.5 rounded-full bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/40 text-[#64D2FF] text-[10px] font-extrabold cursor-pointer"
                        >
                          Pune la Încărcare
                        </button>
                        <button
                          type="button"
                          onClick={() => setQcTo(qcDetectedGps.city)}
                          className="px-2.5 py-0.5 rounded-full tahoe-btn-secondary text-white/85 text-[10px] font-bold cursor-pointer"
                        >
                          Pune la Descărcare
                        </button>
                      </div>
                    </div>
                  )}

                  {qcGpsError && (
                    <div
                      role="alert"
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10.5px] font-semibold flex items-start gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{qcGpsError}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <GoogleMapsAddressInput
                    label="Încărcare"
                    required
                    value={qcFrom}
                    onChange={setQcFrom}
                    placeholder="Ex: Oradea, Calea Borșului 45..."
                  />
                  <GoogleMapsAddressInput
                    label="Descărcare"
                    required
                    value={qcTo}
                    onChange={setQcTo}
                    placeholder="Ex: Rotterdam, Waalhaven 85..."
                  />
                </div>

              {/* Live Road Distance & HGV 40T Drive Preview */}
              {(() => {
                const qcDistLabel = buildRoadDistanceWithDetourLabel(qcFrom, qcTo, 0);
                const qcKmNum = parseInt(qcDistLabel.split(' km')[0].replace(/\./g, ''), 10) || 450;
                const qcHgv = computeHgvRouteMetrics(qcKmNum, { isHgv: true });
                return (
                  <div className="px-3 py-2 rounded-2xl tahoe-card-inner border border-[#0A84FF]/30 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
                    <span className="text-white/70 font-semibold">
                      Rută Camion 40T (73 km/h + CE 561):
                    </span>
                    <span className="font-extrabold text-[#64D2FF]">
                      {qcDistLabel} · {qcHgv.tachoBreakdownRo}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label
                    htmlFor={`${qcFormId}-ldm`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    LDM (m)
                  </label>
                  <input
                    id={`${qcFormId}-ldm`}
                    name="ldm"
                    type="number"
                    step="0.2"
                    min="0.4"
                    max="13.6"
                    required
                    value={qcLdm}
                    onChange={(e) => setQcLdm(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3 py-2 text-white tabular-nums font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${qcFormId}-weight`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    Tonaj (T)
                  </label>
                  <input
                    id={`${qcFormId}-weight`}
                    name="weightTons"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    required
                    value={qcWeight}
                    onChange={(e) => setQcWeight(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3 py-2 text-white tabular-nums font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${qcFormId}-pallets`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    Paleți
                  </label>
                  <input
                    id={`${qcFormId}-pallets`}
                    name="pallets"
                    type="number"
                    min="1"
                    max="33"
                    required
                    value={qcPallets}
                    onChange={(e) => setQcPallets(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3 py-2 text-white tabular-nums font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${qcFormId}-temp`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    Temp (°C)
                  </label>
                  <input
                    id={`${qcFormId}-temp`}
                    name="tempCelsius"
                    type="number"
                    required
                    value={qcTemp}
                    onChange={(e) => setQcTemp(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3 py-2 text-white tabular-nums font-bold border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${qcFormId}-trailer`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    Remorcă
                  </label>
                  <select
                    id={`${qcFormId}-trailer`}
                    name="trailerId"
                    value={qcTrailerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setQcTrailerId(id);
                      const known = trailers.find((t) => t.id === id);
                      if (known) setQcTractorId(known.tractorId.split(' (')[0]);
                    }}
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white font-bold border border-white/15"
                  >
                    <optgroup label="Cu șofer și curse în plan">
                      {trailers.map((t) => (
                        <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                          {t.id} · {t.driver1.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={`Fără cursă alocată (${idleTrailers.length})`}>
                      {idleTrailers.map((v) => (
                        <option key={v.plate} value={v.plate} className="bg-slate-900 text-white">
                          {v.plate} · {v.company}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${qcFormId}-tractor`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    Cap tractor
                  </label>
                  <select
                    id={`${qcFormId}-tractor`}
                    name="tractorId"
                    value={qcTractorId}
                    onChange={(e) => setQcTractorId(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white font-bold border border-white/15"
                  >
                    <optgroup label="Cu șofer în plan">
                      {trailers.map((t) => {
                        const plate = t.tractorId.split(' (')[0];
                        return (
                          <option key={plate} value={plate} className="bg-slate-900 text-white">
                            {plate} · {t.driver1.name}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label={`Libere (${idleTractors.length})`}>
                      {idleTractors.map((v) => (
                        <option key={v.plate} value={v.plate} className="bg-slate-900 text-white">
                          {v.plate} · {v.company}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${qcFormId}-revenue`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    Tarif Agreat (EUR)
                  </label>
                  <input
                    id={`${qcFormId}-revenue`}
                    name="revenueEur"
                    type="number"
                    min="50"
                    required
                    value={qcRevenue}
                    onChange={(e) => setQcRevenue(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-[#30D158] tabular-nums font-extrabold border border-[#30D158]/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${qcFormId}-theme`}
                    className="block font-bold text-white/75 mb-1"
                  >
                    Culoare Card
                  </label>
                  <select
                    id={`${qcFormId}-theme`}
                    name="colorTheme"
                    value={qcTheme}
                    onChange={(e) =>
                      setQcTheme(
                        e.target.value as 'blue' | 'green' | 'amber' | 'purple'
                      )
                    }
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white font-bold border border-white/15"
                  >
                    <option value="blue" className="bg-slate-900 text-white">Albastru (Confirmate)</option>
                    <option value="green" className="bg-slate-900 text-white">Verde (Grupaj Activ)</option>
                    <option value="amber" className="bg-slate-900 text-white">Galben (Descărcare / Parțial)</option>
                    <option value="purple" className="bg-slate-900 text-white">Mov (Prioritar / Swap)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQcError(null);
                    setQuickCreateCell(null);
                  }}
                  className="px-4 py-2.5 rounded-full tahoe-btn-secondary text-white font-bold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full tahoe-btn-primary text-white font-bold shadow-md cursor-pointer"
                >
                  + Salvează Cursa ({modalDay.short} {modalDay.dayNum} · #{getPlanningOrderNumber(quickCreateCell.hourSlot)})
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* IN-APP CONFIRMATION POPUP (`<dialog>`) WHEN MOVING OR REORDERING A PLANNING CARD */}
      <dialog
        ref={moveDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby={moveDialogTitleId}
        className="tps-confirm-dialog"
        onClose={(e) => {
          const dialog = e.currentTarget;
          const action = dialog.returnValue;
          dialog.returnValue = '';
          if (action === 'confirm' && pendingCardMove) {
            applyConfirmedCardMove(pendingCardMove);
          }
          setPendingCardMove(null);
        }}
      >
        {pendingCardMove && (() => {
          const moveTrailer = trailers.find(
            (t) => t.id === pendingCardMove.card.trailerId
          );
          const moveTractorPlate =
            pendingCardMove.card.tractorPlate ??
            (moveTrailer ? moveTrailer.tractorId.split(' (')[0] : '—');
          const hasTwoPlates =
            moveTractorPlate !== pendingCardMove.card.trailerId &&
            moveTractorPlate !== '—';

          return (
            <div className="tahoe-glass-elevated rounded-[26px] p-5 sm:p-6 space-y-4 shadow-2xl border border-white/20">
              <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3.5">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/35">
                    <RefreshCw className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Confirmare mutare comandă</span>
                  </span>
                  <h2
                    id={moveDialogTitleId}
                    className="text-base sm:text-lg font-extrabold text-white mt-1.5 leading-snug"
                  >
                    Ești sigur că vrei să muți această comandă?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => moveDialogRef.current?.close()}
                  aria-label="Închide fereastra de confirmare"
                  className="w-8 h-8 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Card Summary */}
              <div className="tahoe-card-inner rounded-2xl p-3.5 space-y-2 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-white truncate">
                    {pendingCardMove.card.clientName}
                  </span>
                  <span className="text-xs font-extrabold text-[#64D2FF] tabular-nums shrink-0">
                    {pendingCardMove.card.ldm.toFixed(1)} LDM ·{' '}
                    {pendingCardMove.card.weightTons.toFixed(1)} T
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/75">
                  <span className="inline-flex items-center gap-1 font-semibold truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#0A84FF] shrink-0" aria-hidden="true" />
                    <span>{pendingCardMove.card.routeLabel}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0">
                    {hasTwoPlates && (
                      <>
                        {renderEuroRoPlate(moveTractorPlate, true)}
                        <span className="text-[10px] font-black text-white/60">+</span>
                      </>
                    )}
                    {renderEuroRoPlate(pendingCardMove.card.trailerId, true)}
                  </span>
                </div>
              </div>

              {/* From -> To Order Position */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2.5 text-xs">
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">
                    Poziție actuală
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {pendingCardMove.fromDayLabel} ({pendingCardMove.fromDayDate})
                    {pendingCardMove.fromIsToday ? ' · AZI' : ''}
                  </div>
                  <div className="text-xs font-bold text-white/70 tabular-nums mt-0.5">
                    Ordinea #{pendingCardMove.fromOrderNum}
                  </div>
                </div>

                <div className="hidden sm:flex w-8 h-8 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/35 items-center justify-center text-[#0A84FF] shrink-0">
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3 border border-[#0A84FF]/45 bg-[#0A84FF]/10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64D2FF]">
                    Noua poziție
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {pendingCardMove.toDayLabel} ({pendingCardMove.toDayDate})
                    {pendingCardMove.toIsToday ? ' · AZI' : ''}
                  </div>
                  <div className="text-xs font-extrabold text-[#64D2FF] tabular-nums mt-0.5">
                    Ordinea #{pendingCardMove.toOrderNum}
                  </div>
                </div>
              </div>

              {pendingCardMove.swapWithCard && (
                <div className="px-3.5 py-2 rounded-2xl bg-[#0A84FF]/12 border border-[#0A84FF]/35 text-[11.5px] font-bold text-[#64D2FF] flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Schimbă ordinea pe aceeași zi cu „{pendingCardMove.swapWithCard.clientName}” (#{pendingCardMove.fromOrderNum} ↔ #{pendingCardMove.toOrderNum}).
                  </span>
                </div>
              )}

              {pendingCardMove.toIsPastDay &&
                !(
                  pendingCardMove.fromWeekOffset ===
                    pendingCardMove.toWeekOffset &&
                  pendingCardMove.fromDayIndex === pendingCardMove.toDayIndex
                ) && (
                  <div className="px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-[11.5px] font-semibold text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      Notă: {pendingCardMove.toDayLabel} ({pendingCardMove.toDayDate}) este o zi anterioară zilei de azi, dar poți confirma mutarea comenzii dacă dorești.
                    </span>
                  </div>
                )}

              <p className="text-xs text-white/70 leading-relaxed">
                Planificarea ține cont de zi și de ordinea comenzilor pe zi, fără restricție de oră.
              </p>

              <form method="dialog" className="pt-1 flex items-center justify-end gap-2.5">
                <button
                  value="cancel"
                  autoFocus
                  className="px-4 py-2.5 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
                >
                  Nu, păstrează
                </button>
                <button
                  value="confirm"
                  className="px-5 py-2.5 rounded-full tahoe-btn-primary text-xs font-extrabold text-white shadow-md cursor-pointer"
                >
                  Da, mută comanda
                </button>
              </form>
            </div>
          );
        })()}
      </dialog>

      {/* Printable CMR & Fiscal Invoice Modal */}
      <CmrAndInvoiceModal
        docData={printableDoc}
        hideInvoice={isDriverView}
        onClose={() => setPrintableDoc(null)}
      />

      {/* Conflict Verification Modal when dropping a truck with LDM/temp/tacho/LIFO warnings */}
      {pendingTruckAssign && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPendingTruckAssign(null)}
        >
          <div
            className="tahoe-glass-elevated rounded-[26px] max-w-md w-full p-5 space-y-4 border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40">
                  Verificare LDM / Bi-Temp / LIFO
                </span>
                <h3 className="text-base font-extrabold text-white mt-1.5">
                  Alocare {pendingTruckAssign.trailer.id} → {pendingTruckAssign.card.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingTruckAssign(null)}
                className="w-8 h-8 rounded-full tahoe-card-inner border border-white/15 flex items-center justify-center text-white cursor-pointer"
                aria-label="Închide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="tahoe-card-inner rounded-2xl p-3 space-y-1.5 text-xs">
              <div className="font-bold text-white">
                {pendingTruckAssign.evaluation.headline}
              </div>
              {pendingTruckAssign.evaluation.reasons.map((r) => (
                <div key={r} className="text-[#FF453A] font-semibold">
                  ✕ {r}
                </div>
              ))}
              {pendingTruckAssign.evaluation.warnings.map((w) => (
                <div key={w} className="text-[#FF9F0A]">
                  ⚠ {w}
                </div>
              ))}
              {pendingTruckAssign.evaluation.lifoNote && (
                <div className="text-white/75 pt-1 border-t border-white/10">
                  {pendingTruckAssign.evaluation.lifoNote}
                </div>
              )}
              {pendingTruckAssign.evaluation.tachoNote && (
                <div className="text-white/75">{pendingTruckAssign.evaluation.tachoNote}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingTruckAssign(null)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => {
                  commitTrailerAssignToCard(
                    pendingTruckAssign.trailer,
                    pendingTruckAssign.card,
                    pendingTruckAssign.evaluation
                  );
                  setPendingTruckAssign(null);
                }}
                className="px-4 py-2 rounded-full text-xs font-extrabold bg-[#0A84FF] text-white cursor-pointer hover:brightness-110 transition"
              >
                Alocă oricum pe {pendingTruckAssign.trailer.id}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
