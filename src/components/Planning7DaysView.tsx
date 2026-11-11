import React, { useState, useEffect, useId } from 'react';
import { OrderDecisionModal } from './OrderDecisionModal';
import { getRealFleet } from './FleetVinAndDossierModal';
import { rankTrailersForOrder } from '../data/ldmEngine';
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
  X,
} from 'lucide-react';
import {
  findFirstFuturePlanningSlot,
  formatRomaniaClockSnapshot,
  getDefaultPlanningWeekOffset,
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
  lookupLearnedPlaceCoords,
  normalizePlaceKey,
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
  unassignedOrders: CargoOrder[];
  proposals?: ClientShipmentProposal[];
  cards: HourlyPlanningCard[];
  setCards: React.Dispatch<React.SetStateAction<HourlyPlanningCard[]>>;
  initialSelectedTrailerId?: string;
  onAssignOrderToTrailer: (
    orderId: string,
    trailerId: string,
    targetDayIndex?: number,
    targetHourSlot?: string,
    targetWeekOffset?: number
  ) => void;
  onCreateDirectTrip?: (payload: DirectTripPayload) => void;
  onDeletePlanningCard?: (cardId: string, linkedLoadId?: string) => void;
  onMoveScheduleBlock: (
    fromTrailerId: string,
    blockId: string,
    toTrailerId: string,
    toDayIndex: number
  ) => void;
  onUpdateBulkhead: (trailerId: string, newZone1MaxLdm: number) => void;
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

const CITY_COORDS_FOR_ROAD_KM: Record<string, [number, number]> = {
  // România
  oradea: [47.0722, 21.9211],
  bors: [47.1167, 21.8167],
  cluj: [46.7712, 23.6236],
  'cluj-napoca': [46.7712, 23.6236],
  turda: [46.5667, 23.7833],
  bistrita: [47.1333, 24.5],
  'baia mare': [47.6567, 23.585],
  'satu mare': [47.79, 22.8857],
  carei: [47.6833, 22.4667],
  zalau: [47.1911, 23.0572],
  'targu mures': [46.5425, 24.5575],
  timisoara: [45.7489, 21.2087],
  arad: [46.1866, 21.3123],
  nadlac: [46.1667, 20.75],
  deva: [45.8833, 22.9],
  sebes: [45.96, 23.57],
  'alba iulia': [46.0667, 23.5833],
  sibiu: [45.7983, 24.1256],
  brasov: [45.6427, 25.5887],
  ploiesti: [44.9462, 26.0254],
  pitesti: [44.8565, 24.8692],
  craiova: [44.3302, 23.7949],
  bucuresti: [44.4268, 26.1025],
  constanta: [44.1598, 28.6348],
  giurgiu: [43.9037, 25.9699],
  bacau: [46.567, 26.9146],
  iasi: [47.1585, 27.6014],
  suceava: [47.6514, 26.2556],
  // Ungaria
  szolnok: [47.1621, 20.1825],
  szeged: [46.253, 20.1414],
  debrecen: [47.5316, 21.6273],
  budapesta: [47.4979, 19.0402],
  budapest: [47.4979, 19.0402],
  gyor: [47.6875, 17.6504],
  hegyeshalom: [47.9142, 17.1553],
  mosonmagyarovar: [47.8679, 17.2699],
  kecskemet: [46.8964, 19.6897],
  miskolc: [48.1035, 20.7784],
  pecs: [46.0727, 18.2323],
  szekesfehervar: [47.186, 18.4221],
  tatabanya: [47.5692, 18.4048],
  // Austria
  viena: [48.2082, 16.3738],
  wien: [48.2082, 16.3738],
  'wiener neudorf': [48.0845, 16.3218],
  schwechat: [48.1411, 16.4785],
  parndorf: [47.9944, 16.8583],
  nickelsdorf: [47.9375, 17.0686],
  linz: [48.3069, 14.2858],
  wels: [48.1575, 14.0289],
  suben: [48.4114, 13.4317],
  salzburg: [47.8095, 13.055],
  graz: [47.0707, 15.4395],
  innsbruck: [47.2692, 11.4041],
  klagenfurt: [46.6247, 14.3053],
  // Germania
  munchen: [48.1351, 11.582],
  munich: [48.1351, 11.582],
  augsburg: [48.3705, 10.8978],
  ulm: [48.4011, 9.9876],
  regensburg: [49.0134, 12.1016],
  passau: [48.5665, 13.4319],
  ingolstadt: [48.7665, 11.4257],
  nurnberg: [49.4521, 11.0767],
  wurzburg: [49.7913, 9.9534],
  stuttgart: [48.7758, 9.1829],
  heilbronn: [49.1427, 9.2109],
  karlsruhe: [49.0069, 8.4037],
  mannheim: [49.4875, 8.466],
  freiburg: [47.999, 7.8421],
  frankfurt: [50.1109, 8.6821],
  darmstadt: [49.8728, 8.6512],
  mainz: [49.9929, 8.2473],
  wiesbaden: [50.0782, 8.2398],
  kassel: [51.3127, 9.4797],
  koln: [50.9375, 6.9603],
  cologne: [50.9375, 6.9603],
  bonn: [50.7374, 7.0982],
  aachen: [50.7753, 6.0839],
  dusseldorf: [51.2277, 6.7735],
  duisburg: [51.4344, 6.7623],
  essen: [51.4556, 7.0116],
  dortmund: [51.5136, 7.4653],
  bochum: [51.4818, 7.2162],
  wuppertal: [51.2562, 7.1508],
  munster: [51.9607, 7.6261],
  bielefeld: [52.0302, 8.5325],
  osnabruck: [52.2799, 8.0472],
  bremen: [53.0793, 8.8017],
  hannover: [52.3759, 9.732],
  hamburg: [53.5511, 9.9937],
  kiel: [54.3233, 10.1228],
  lubeck: [53.8655, 10.6866],
  rostock: [54.0924, 12.0991],
  berlin: [52.52, 13.405],
  magdeburg: [52.1205, 11.6276],
  leipzig: [51.3397, 12.3731],
  dresden: [51.0504, 13.7373],
  erfurt: [50.9848, 11.0299],
  saarbrucken: [49.2402, 6.9969],
  // Olanda & Belgia & Luxemburg
  groningen: [53.2194, 6.5665],
  leeuwarden: [53.2012, 5.7999],
  assen: [52.9925, 6.5649],
  zwolle: [52.5168, 6.083],
  enschede: [52.2215, 6.8937],
  apeldoorn: [52.2112, 5.9699],
  arnhem: [51.9851, 5.8987],
  nijmegen: [51.8126, 5.8372],
  almere: [52.3508, 5.2647],
  amsterdam: [52.3676, 4.9041],
  haarlem: [52.3874, 4.6462],
  leiden: [52.1601, 4.497],
  'den haag': [52.0705, 4.3007],
  haga: [52.0705, 4.3007],
  utrecht: [52.0907, 5.1214],
  rotterdam: [51.9244, 4.4777],
  breda: [51.5719, 4.7683],
  tilburg: [51.5555, 5.0913],
  eindhoven: [51.4416, 5.4697],
  venlo: [51.3704, 6.1724],
  maastricht: [50.8514, 5.691],
  antwerpen: [51.2194, 4.4025],
  anvers: [51.2194, 4.4025],
  bruxelles: [50.8503, 4.3517],
  brussels: [50.8503, 4.3517],
  gent: [51.0543, 3.7174],
  zeebrugge: [51.3308, 3.2075],
  liege: [50.6326, 5.5797],
  charleroi: [50.4108, 4.4446],
  luxemburg: [49.6116, 6.1319],
  luxembourg: [49.6116, 6.1319],
  // Cehia, Slovacia, Polonia
  praga: [50.0755, 14.4378],
  praha: [50.0755, 14.4378],
  brno: [49.1951, 16.6068],
  ostrava: [49.8209, 18.2625],
  plzen: [49.7384, 13.3736],
  bratislava: [48.1486, 17.1077],
  trnava: [48.3774, 17.5883],
  nitra: [48.3061, 18.0764],
  zilina: [49.2231, 18.7394],
  kosice: [48.7164, 21.2611],
  varsovia: [52.2297, 21.0122],
  warszawa: [52.2297, 21.0122],
  wroclaw: [51.1079, 17.0385],
  poznan: [52.4064, 16.9252],
  lodz: [51.7592, 19.456],
  katowice: [50.2649, 19.0238],
  krakow: [50.0647, 19.945],
  gdansk: [54.352, 18.6466],
  szczecin: [53.4285, 14.5528],
  // Franța, Italia, Elveția, Spania, UK
  paris: [48.8566, 2.3522],
  lille: [50.6292, 3.0573],
  calais: [50.9513, 1.8587],
  strasbourg: [48.5734, 7.7521],
  metz: [49.1193, 6.1757],
  reims: [49.2583, 4.0317],
  lyon: [45.764, 4.8357],
  marseille: [43.2965, 5.3698],
  bordeaux: [44.8378, -0.5792],
  toulouse: [43.6047, 1.4442],
  milano: [45.4642, 9.19],
  torino: [45.0703, 7.6869],
  verona: [45.4384, 10.9916],
  padova: [45.4064, 11.8768],
  bologna: [44.4949, 11.3426],
  parma: [44.8015, 10.3279],
  brescia: [45.5416, 10.2118],
  bergamo: [45.6983, 9.6773],
  roma: [41.9028, 12.4964],
  zurich: [47.3769, 8.5417],
  basel: [47.5596, 7.5886],
  berna: [46.948, 7.4474],
  bern: [46.948, 7.4474],
  geneva: [46.2044, 6.1432],
  madrid: [40.4168, -3.7038],
  barcelona: [41.3874, 2.1686],
  zaragoza: [41.6488, -0.8891],
  valencia: [39.4699, -0.3763],
  londra: [51.5072, -0.1276],
  london: [51.5072, -0.1276],
  dover: [51.1279, 1.3134],
  felixstowe: [51.9617, 1.3513],
  // Danemarca, Suedia, Norvegia & Sud-Est
  padborg: [54.8258, 9.36],
  kolding: [55.4904, 9.4722],
  odense: [55.4038, 10.4024],
  aarhus: [56.1629, 10.2039],
  copenhaga: [55.6761, 12.5683],
  kobenhavn: [55.6761, 12.5683],
  malmo: [55.605, 13.0038],
  helsingborg: [56.0465, 12.6945],
  goteborg: [57.7089, 11.9746],
  jonkoping: [57.7826, 14.1618],
  stockholm: [59.3293, 18.0686],
  oslo: [59.9139, 10.7522],
  ljubljana: [46.0569, 14.5058],
  maribor: [46.5547, 15.6459],
  zagreb: [45.815, 15.9819],
  sofia: [42.6977, 23.3219],
  ruse: [43.8356, 25.9657],
};

const SORTED_CITY_COORD_ENTRIES = Object.entries(CITY_COORDS_FOR_ROAD_KM).sort(
  (a, b) => b[0].length - a[0].length
);

function findCityCoords(rawText: string): [number, number] | null {
  if (!rawText || !rawText.trim()) return null;
  const learned = lookupLearnedPlaceCoords(rawText);
  if (learned) return learned;

  const norm = normalizePlaceKey(rawText);
  const head = normalizePlaceKey(rawText.split(/[,(→]/)[0] || '');
  if (head && CITY_COORDS_FOR_ROAD_KM[head]) {
    return CITY_COORDS_FOR_ROAD_KM[head];
  }
  for (const [key, coords] of SORTED_CITY_COORD_ENTRIES) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(norm)) {
      return coords;
    }
  }
  return null;
}

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
    driverName: 'Popa Mircea',
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
    driverName: 'Popa Mircea',
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
    driverName: 'Popa Mircea',
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
    driverName: 'Popa Mircea',
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

export const Planning7DaysView: React.FC<Planning7DaysViewProps> = ({
  trailers,
  unassignedOrders,
  proposals = [],
  cards,
  setCards,
  initialSelectedTrailerId,
  onAssignOrderToTrailer,
  onCreateDirectTrip,
  onDeletePlanningCard,
  onUpdateBulkhead,
}) => {
  const qcFormId = useId();
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>(
    initialSelectedTrailerId || trailers[0].id
  );
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
  const [showBiTempInspector, setShowBiTempInspector] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [decisionOrderId, setDecisionOrderId] = useState<string | null>(null);
  const [lastCreatedCardId, setLastCreatedCardId] = useState<string | null>(null);
  const [qcError, setQcError] = useState<string | null>(null);
  const [cardStatusFilter, setCardStatusFilter] = useState<
    'all' | 'active' | 'past'
  >('all');

  const weekCardsAll = React.useMemo(
    () => cards.filter((c) => (c.weekOffset ?? 0) === weekOffset),
    [cards, weekOffset]
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
    cards.some(
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
  const [qcTrailerId, setQcTrailerId] = useState('BH 67 STS');
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

  const selectedTrailer =
    trailers.find((t) => t.id === selectedTrailerId) || trailers[0];

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
      if (targetIsPast) {
        const snap = formatRomaniaClockSnapshot(freshNow);
        setToastMessage(
          `Nu poți muta cursa pe o dată/oră din trecut (${targetDayMeta?.label ?? ''} ${targetDayMeta?.date ?? ''} · ora ${targetHour} — Ora României: ${snap.dateCompact}, ${snap.timeShort}).`
        );
        setDragPayload(null);
        return;
      }
      setCards((prev) =>
        prev.map((c) =>
          c.id === dragPayload.id
            ? {
                ...c,
                weekOffset,
                isoDate: targetDayMeta.isoDate,
                dayIndex: targetDayIdx,
                hourSlot: targetHour,
              }
            : c
        )
      );
      const moved = cards.find((c) => c.id === dragPayload.id);
      if (moved) {
        setToastMessage(
          `Cursa "${moved.clientName}" (${moved.ldm} LDM) a fost mutată pe ${targetDayMeta.short} ${targetDayMeta.date} la ora ${targetHour}!`
        );
      }
    } else if (dragPayload.kind === 'PENDING_ORDER') {
      if (targetIsPast) {
        const snap = formatRomaniaClockSnapshot(freshNow);
        setToastMessage(
          `Nu poți planifica o comandă nouă în trecut (${targetDayMeta?.label ?? ''} ${targetDayMeta?.date ?? ''} · ora ${targetHour} — Ora României: ${snap.dateCompact}, ${snap.timeShort}). Trage comanda pe o celulă viitoare!`
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
          `Comanda în așteptare "${order.client}" (${order.ldm} LDM) a fost planificată pe ${targetDayMeta.short} ${targetDayMeta.date} la ora ${targetHour} pe ${assignedTrailer.id}!`
        );
      }
    } else if (dragPayload.kind === 'TRUCK') {
      // If user drops a truck on a cell that already has a card, assign truck to that card; otherwise open quick create ONLY if slot is in future
      const existingCard = cards.find(
        (c) =>
          (c.weekOffset ?? 0) === weekOffset &&
          c.dayIndex === targetDayIdx &&
          c.hourSlot === targetHour
      );
      const trailerObj = trailers.find((t) => t.id === dragPayload.id);
      if (existingCard && trailerObj) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === existingCard.id
              ? {
                  ...c,
                  trailerId: trailerObj.id,
                  driverName: trailerObj.driver1.name,
                }
              : c
          )
        );
        setToastMessage(
          `Camionul ${trailerObj.id} (${trailerObj.driver1.name}) a fost alocat pe cursa "${existingCard.clientName}"!`
        );
      } else if (trailerObj) {
        if (targetIsPast) {
          const snap = formatRomaniaClockSnapshot(freshNow);
          setToastMessage(
            `Nu poți deschide o cursă nouă în trecut (${targetDayMeta?.label ?? ''} ${targetDayMeta?.date ?? ''} · ora ${targetHour} — Ora României: ${snap.dateCompact}, ${snap.timeShort}).`
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

  // Drop a Truck directly onto a Card
  const handleDropTruckOnCard = (
    e: React.DragEvent,
    targetCard: HourlyPlanningCard
  ) => {
    e.stopPropagation();
    setHoveredCardId(null);
    setHoveredCellKey(null);

    if (dragPayload?.kind === 'TRUCK') {
      const trailerObj = trailers.find((t) => t.id === dragPayload.id);
      if (trailerObj) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === targetCard.id
              ? {
                  ...c,
                  trailerId: trailerObj.id,
                  driverName: trailerObj.driver1.name,
                }
              : c
          )
        );
        setToastMessage(
          `Camionul ${trailerObj.id} (${trailerObj.driver1.name}) a fost asociat cu succes pe lucrarea "${targetCard.clientName}" (${targetCard.ldm} LDM)!`
        );
        setDragPayload(null);
      }
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
        `Data sau ora selectată a trecut deja în fusul orar al României. Slotul a fost actualizat automat la ${nextDayLabel.label} (${nextDayLabel.date}) · ora ${nextValid.hourSlot}. Apasă din nou „Salvează Cursa”.`
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
      `Cursa "${created.clientName}" (${created.ldm} LDM · ${revNum} €) a fost salvată pe ${submitDayMeta.short} ${submitDayMeta.date} (${created.hourSlot}) pe ${created.trailerId} și sincronizată automat în Control Center și Comenzi & curse!`
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

    const isTruckHovered = hoveredCardId === card.id && dragPayload?.kind === 'TRUCK';
    const matchedTrailer = trailers.find((t) => t.id === card.trailerId);
    const tractorPlate =
      card.tractorPlate ??
      (matchedTrailer ? matchedTrailer.tractorId.split(' (')[0] : '—');
    const isTwoPlateAssembly = tractorPlate !== card.trailerId && tractorPlate !== '—';

    const isJustCreated = lastCreatedCardId === card.id;
    const cardLife = getPlanningCardLifecycle(card, trailers, roClock.zdt);
    const isPastCard = cardLife.lifecycle === 'past';

    return (
      <article
        key={card.id}
        data-card-id={card.id}
        data-card-theme={card.colorTheme}
        data-card-lifecycle={cardLife.lifecycle}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDragPayload({ kind: 'CARD', id: card.id });
        }}
        onDragOver={(e) => {
          if (dragPayload?.kind === 'TRUCK') {
            e.preventDefault();
            e.stopPropagation();
            setHoveredCardId(card.id);
          }
        }}
        onDragLeave={() => setHoveredCardId(null)}
        onDrop={(e) => handleDropTruckOnCard(e, card)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedTrailerId(card.trailerId);
          setSelectedCardDetail(card);
        }}
        className={`planning-trip-card relative rounded-2xl cursor-grab active:cursor-grabbing overflow-hidden select-none h-[196px] w-full flex flex-col ${
          isPastCard ? 'border-dashed border-2 opacity-80' : ''
        } ${isTruckHovered ? 'ring-2 ring-[#0A84FF] scale-[1.02]' : ''} ${
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
            className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-tight shrink-0 leading-none border ${
              isPastCard
                ? 'bg-emerald-950/55 text-emerald-200 border-emerald-300/45'
                : cardLife.lifecycle === 'planned'
                  ? 'bg-amber-950/55 text-amber-200 border-amber-300/45'
                  : 'bg-sky-950/55 text-sky-100 border-white/35'
            }`}
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

          {/* Row 2: Full Route + High-Contrast Distance + Temperature */}
          <div className="planning-card-divider relative z-10 pt-1 space-y-0.5">
            <div className="planning-card-route flex items-center gap-1 font-extrabold text-[11px] leading-tight h-[16px]">
              <MapPin className="w-3 h-3 planning-card-icon shrink-0" />
              <span className="truncate">{card.routeLabel}</span>
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
          onClose={() => setDecisionOrderId(null)}
        />
      )}

      {/* MAIN WORKSPACE: Full-Width 7-Day Grid on Top + 2-Column Pending Orders & Trucks Dock Below */}
      <div className="flex flex-col gap-4 items-stretch">
        {/* TOP FULL-WIDTH 7-DAY CALENDAR */}
        <div className="w-full space-y-4">
          {/* Planning Calendar Card — Unified macOS Tahoe Glass Surface */}
          <div className="tahoe-glass rounded-[26px] overflow-hidden">
            {/* Top Header Bar */}
            <div className="bg-gradient-to-r from-[#0A84FF]/30 via-[#0284c7]/25 to-[#5E5CE6]/30 border-b border-white/15 px-4 sm:px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase text-white">
                  {weekMeta.monthYearTitle}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white">
                  <Calendar className="w-3.5 h-3.5 text-[#64D2FF]" />
                  <span>Click pe celulele viitoare pt. Creare Rapidă · Drag & Drop activ</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Segmented Filter: Toate | Active | Trecute */}
                <div
                  role="group"
                  aria-label="Filtru stare curse în calendar"
                  className="inline-flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/15"
                >
                  <button
                    type="button"
                    aria-pressed={cardStatusFilter === 'all'}
                    onClick={() => setCardStatusFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold cursor-pointer border ${
                      cardStatusFilter === 'all'
                        ? 'bg-[#0A84FF] text-white border-[#64D2FF]/50 shadow-xs'
                        : 'border-transparent text-white/70 hover:text-white'
                    }`}
                  >
                    Toate ({weekFilterCounts.all})
                  </button>
                  <button
                    type="button"
                    aria-pressed={cardStatusFilter === 'active'}
                    onClick={() => setCardStatusFilter('active')}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer border ${
                      cardStatusFilter === 'active'
                        ? 'bg-[#0A84FF] text-white border-[#64D2FF]/50 shadow-xs'
                        : 'border-transparent text-white/70 hover:text-white'
                    }`}
                  >
                    <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Active ({weekFilterCounts.active})</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={cardStatusFilter === 'past'}
                    onClick={() => setCardStatusFilter('past')}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer border ${
                      cardStatusFilter === 'past'
                        ? 'bg-emerald-600 text-white border-emerald-300/50 shadow-xs'
                        : 'border-transparent text-white/70 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>Trecute ({weekFilterCounts.past})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => openQuickCreateModal()}
                  className="px-4 py-1.5 rounded-full tahoe-btn-primary text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cursă nouă</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBiTempInspector((v) => !v)}
                  className="px-3.5 py-1.5 rounded-full tahoe-btn-secondary text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#64D2FF]" />
                  <span>Bi-Temp 13.6m ({selectedTrailer.id})</span>
                </button>

                <div className="flex items-center tahoe-btn-secondary rounded-full px-1.5 py-1 text-xs font-bold text-white">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                    disabled={weekOffset === 0}
                    aria-label="Săptămâna anterioară"
                    className="p-1 rounded-full hover:bg-white/10 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 tabular-nums whitespace-nowrap">
                    {weekMeta.rangeLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => w + 1)}
                    aria-label="Săptămâna următoare"
                    className="p-1 rounded-full hover:bg-white/10 cursor-pointer transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Day Selector Bar (Visible on Mobile/Tablet `< lg`) */}
            <div className="lg:hidden flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar p-3 border-b border-white/10">
              {weekMeta.days.map((d, idx) => {
                const dayCards = cards.filter(
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
                    onClick={() => setMobileDayIdx(idx)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                      mobileDayIdx === idx
                        ? 'bg-[#0A84FF] text-white shadow'
                        : d.isPastDay
                          ? 'tahoe-card-inner text-white/45'
                          : 'tahoe-card-inner text-white/85'
                    }`}
                  >
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
                  </button>
                );
              })}
            </div>

            {/* Mobile Day Cards List (`< lg`) */}
            <div className="lg:hidden divide-y divide-white/10">
              {HOUR_SLOTS.map((hour) => {
                const mobileDayMeta = weekMeta.days[mobileDayIdx] || weekMeta.days[0];
                const isMobileSlotPast = isPlanningSlotInPast(
                  mobileDayMeta.isoDate,
                  hour,
                  roClock.zdt
                );
                const cellCards = cards.filter(
                  (c) =>
                    (c.weekOffset ?? 0) === weekOffset &&
                    c.dayIndex === mobileDayIdx &&
                    c.hourSlot === hour &&
                    matchesCardFilter(c)
                );
                const isCellEmpty = cellCards.length === 0;
                return (
                  <div
                    key={hour}
                    onClick={() => {
                      if (!isCellEmpty) return;
                      if (isMobileSlotPast) {
                        setToastMessage(
                          `Nu se poate programa o cursă nouă în trecut (${mobileDayMeta.label}, ${mobileDayMeta.date} · ora ${hour} — Ora României: ${roClock.dateCompact}, ${roClock.timeShort}).`
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
                    <div className="flex-1 space-y-2">
                      {cellCards.map((c) => renderCellCard(c))}
                      {isCellEmpty && !isMobileSlotPast && (
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
                          className="w-full py-1.5 rounded-full border border-dashed border-white/20 text-[11px] font-semibold text-white/55 hover:text-[#64D2FF] hover:border-[#0A84FF] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Creare rapidă ({hour})
                        </button>
                      )}
                      {isCellEmpty && isMobileSlotPast && (
                        <div className="text-[11px] text-white/35 text-center py-1 tabular-nums">
                          {hour} · interval trecut (Ora României)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Full 7-Day Grid (`lg:block`) — No Hour Column, 100% Width for the 7 Days */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse table-fixed min-w-[1280px]">
                <thead>
                  <tr className="border-b border-white/15 bg-white/[0.03]">
                    {weekMeta.days.map((day, dIdx) => {
                      const dayCards = cards.filter(
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
                          className={`py-3 px-2.5 text-center border-r border-white/10 last:border-r-0 ${
                            day.isToday
                              ? 'bg-[#0A84FF]/10'
                              : day.isPastDay
                                ? 'opacity-75'
                                : ''
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
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
                            {day.isToday && (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                                style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
                              >
                                AZI
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-xl font-extrabold leading-tight tabular-nums ${
                              day.isPastDay ? 'text-white/60' : 'text-white'
                            }`}
                          >
                            {day.dayNum}
                          </div>
                          {sumLdm > 0 ? (
                            <div className="mt-1 text-[11px] tabular-nums font-extrabold flex items-center justify-center gap-1.5">
                              <span className="text-[#FF9F0A]">
                                {sumTons.toFixed(1)}T
                              </span>
                              <span className="text-white/30">|</span>
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
                  {HOUR_SLOTS.map((hour) => (
                    <tr key={hour} className="min-h-[188px]">
                      {/* 7 Day Cells for this Row (No Left Hour Column) */}
                      {weekMeta.days.map((day, dIdx) => {
                        const cellKey = `${day.isoDate}-${hour}`;
                        const isPastSlot = isPlanningSlotInPast(
                          day.isoDate,
                          hour,
                          roClock.zdt
                        );
                        const cellCards = cards.filter(
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
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (!isPastSlot) {
                                setHoveredCellKey(cellKey);
                              }
                            }}
                            onDragLeave={() => setHoveredCellKey(null)}
                            onDrop={() => handleDropOnCell(dIdx, hour)}
                            onClick={() => {
                              if (!isCellEmpty) return;
                              if (isPastSlot) {
                                setToastMessage(
                                  `Nu se poate programa o cursă nouă pe o dată sau oră din trecut (${day.label}, ${day.date} · ora ${hour} — Ora României: ${roClock.dateCompact}, ${roClock.timeShort}). Selectează o celulă viitoare sau apasă „+ Cursă nouă”.`
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
                              isCellEmpty
                                ? isPastSlot
                                  ? 'cursor-not-allowed bg-black/[0.04]'
                                  : 'cursor-pointer'
                                : 'cursor-default'
                            } ${
                              isHovered && !isPastSlot
                                ? 'bg-[#0A84FF]/20 ring-2 ring-inset ring-[#0A84FF]'
                                : !isPastSlot
                                  ? 'hover:bg-white/[0.05]'
                                  : ''
                            }`}
                          >
                            <div className="space-y-2 min-h-[172px] flex flex-col justify-center">
                              {!isCellEmpty ? (
                                <div className="space-y-2 w-full">
                                  {cellCards.map((c) => renderCellCard(c))}
                                  {!isPastSlot && (
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
                                      <Plus className="w-3 h-3 mr-1" /> Adaugă cursă
                                    </button>
                                  )}
                                </div>
                              ) : !isPastSlot ? (
                                /* Rapid Create Hover Trigger ONLY inside Future Empty Cells */
                                <div
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center py-2.5 rounded-full border border-dashed border-[#0A84FF]/50 text-[11px] font-bold text-[#64D2FF] bg-[#0A84FF]/10"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Creare rapidă ({hour})
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

          {/* Collapsible Bi-Temp 13.6m & Segment Inspector Drawer */}
          {showBiTempInspector && (
            <div className="tahoe-glass rounded-[24px] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                    SIMULATOR COMPARTIMENTARE BI-TEMP 13.6M & LDM PE SEGMENTE
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Remorca {selectedTrailer.id} · Perete Despărțitor (Bulkhead):{' '}
                    {(selectedTrailer.segments[0]?.zone1MaxLdm ?? 6.8).toFixed(1)}m /{' '}
                    {(selectedTrailer.segments[0]?.zone2MaxLdm ?? 6.8).toFixed(1)}m
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3.4}
                    max={10.2}
                    step={0.4}
                    value={selectedTrailer.segments[0]?.zone1MaxLdm ?? 6.8}
                    onChange={(e) =>
                      onUpdateBulkhead(
                        selectedTrailer.id,
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-36 accent-[#0A84FF] cursor-pointer"
                  />
                  <button
                    onClick={() => setShowBiTempInspector(false)}
                    className="px-3 py-1 rounded-full bg-white/10 text-xs text-white/80 cursor-pointer"
                  >
                    Închide
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {selectedTrailer.segments.map((seg) => (
                  <div
                    key={seg.id}
                    className="tahoe-card-inner rounded-2xl p-3.5 text-xs space-y-1.5"
                  >
                    <div className="font-bold text-white">
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
                    <div className="text-[11px] text-[#64D2FF]">
                      {seg.unloadingOrders[0] || seg.loadingOrders[0] || `${seg.etaStart} → ${seg.etaEnd}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM 2-COLUMN DOCK: Left = COMENZI ÎN AȘTEPTARE | Right = CAMIOANE & REMORCI (ECHIPE) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PANEL 1: COMENZI ÎN AȘTEPTARE */}
          <div className="tahoe-glass rounded-[24px] overflow-hidden">
            <div className="bg-gradient-to-r from-[#0A84FF]/35 to-[#0284c7]/30 border-b border-white/15 px-4 py-3.5 text-white flex items-center justify-between">
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
            <div className="bg-gradient-to-r from-[#0A84FF]/35 to-[#0284c7]/30 border-b border-white/15 px-4 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#64D2FF]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  CAMIOANE & REMORCI (ECHIPE)
                </span>
              </div>
              <p className="text-[11px] text-white/70 mt-0.5">
                Trage un camion peste lucrare / cursă.
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
                      setSelectedTrailerId(t.id);
                      setShowBiTempInspector(true);
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
        const estRevenueEur = Math.round(selectedCardDetail.ldm * 210 + 180);
        const estCostEur = Math.round(selectedCardDetail.ldm * 65 + 70);
        const estProfitEur = estRevenueEur - estCostEur;

        return (
          <div
            onClick={() => setSelectedCardDetail(null)}
            className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="tahoe-glass-elevated rounded-[28px] max-w-5xl w-full p-5 sm:p-6 space-y-5 shadow-2xl border border-white/20 my-auto max-h-[92vh] overflow-y-auto overscroll-contain"
            >
              {/* Top Header — X always in top-right corner */}
              <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
                      DETALII COMPLETE PARTIDĂ MARFĂ & CURSĂ
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30">
                      {(() => {
                        const detDay =
                          getPlanningWeekMeta(
                            selectedCardDetail.weekOffset ?? 0,
                            roClock.zdt
                          ).days[selectedCardDetail.dayIndex] ||
                          WEEK_DAYS[selectedCardDetail.dayIndex];
                        return `${detDay.label} (${detDay.date}) · Ora ${selectedCardDetail.hourSlot}`;
                      })()}
                    </span>
                    {detailMapTrip.lifecycle === 'past' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
                        <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Cursă trecută / finalizată</span>
                      </span>
                    ) : detailMapTrip.lifecycle === 'planned' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/35">
                        <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Cursă activă (Planificată)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1 bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
                        <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Cursă activă (În tranzit)</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 truncate">
                    {selectedCardDetail.clientName} — {selectedCardDetail.routeLabel}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/75 mt-1.5">
                    <span>Alocat pe ansamblul</span>
                    {detailIsTwoPlates && (
                      <>
                        {renderEuroRoPlate(detailTractorPlate, false)}
                        <span className="font-black text-white/60">+</span>
                      </>
                    )}
                    {renderEuroRoPlate(detailTrailer.id, false)}
                    <span>({detailTrailer.trailerType}) · Șofer:</span>
                    <strong className="text-white">{detailTrailer.driver1.name}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCardDetail(null)}
                  aria-label="Închide detaliile cursei"
                  className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Primary Metrics of This Order / Shipment */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="tahoe-card-inner rounded-2xl p-3.5">
                  <div className="text-[10px] font-bold uppercase text-white/55">
                    SPAȚIU OCUPAT (LDM)
                  </div>
                  <div className="text-lg font-extrabold text-[#64D2FF] tabular-nums mt-0.5">
                    {selectedCardDetail.ldm.toFixed(1)} LDM
                  </div>
                  <div className="text-[11px] text-white/55">
                    din {detailTrailer.totalLdm.toFixed(1)}m total remorcă
                  </div>
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3.5">
                  <div className="text-[10px] font-bold uppercase text-white/55">
                    TONAJ & PALEȚI
                  </div>
                  <div className="text-lg font-extrabold text-[#FF9F0A] tabular-nums mt-0.5">
                    {selectedCardDetail.weightTons.toFixed(1)} T
                  </div>
                  <div className="text-[11px] text-white/65 truncate">
                    {selectedCardDetail.cargoSpec}
                  </div>
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3.5">
                  <div className="text-[10px] font-bold uppercase text-white/55">
                    REGIM TERMIC CERUT
                  </div>
                  <div className="text-lg font-extrabold text-white tabular-nums mt-0.5 flex items-center gap-1">
                    <ThermometerSnowflake className="w-4 h-4 text-[#64D2FF]" />
                    <span>
                      {selectedCardDetail.tempCelsius > 0
                        ? `+${selectedCardDetail.tempCelsius}`
                        : selectedCardDetail.tempCelsius}
                      °C
                    </span>
                  </div>
                  <div className="text-[11px] text-white/55">
                    Distanță / Ocol: {selectedCardDetail.kmDist}
                  </div>
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3.5">
                  <div className="text-[10px] font-bold uppercase text-white/55">
                    CONTRIBUȚIE NETĂ EST.
                  </div>
                  <div className="text-lg font-extrabold text-[#30D158] tabular-nums mt-0.5">
                    +{estProfitEur} €
                  </div>
                  <div className="text-[11px] text-white/55 tabular-nums">
                    Venit {estRevenueEur} € · Cost {estCostEur} €
                  </div>
                </div>
              </div>

              {/* Edit Assignment / Reschedule Controls */}
              <div className="tahoe-card-inner rounded-2xl p-4 space-y-3 border border-white/10">
                <div className="text-xs font-bold uppercase tracking-wider text-[#64D2FF]">
                  MODIFICARE RAPIDĂ ALOCARE CAMION, ZI SAU ORĂ
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
                        const updated = {
                          ...selectedCardDetail,
                          dayIndex: newDay,
                        };
                        setSelectedCardDetail(updated);
                        setCards((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c))
                        );
                      }}
                      className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                    >
                      {WEEK_DAYS.map((d, idx) => (
                        <option key={idx} value={idx} className="bg-slate-900 text-white">
                          {d.label} ({d.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-white/70 mb-1">
                      Ora Planificată
                    </label>
                    <select
                      value={selectedCardDetail.hourSlot}
                      onChange={(e) => {
                        const updated = {
                          ...selectedCardDetail,
                          hourSlot: e.target.value,
                        };
                        setSelectedCardDetail(updated);
                        setCards((prev) =>
                          prev.map((c) => (c.id === updated.id ? updated : c))
                        );
                      }}
                      className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                    >
                      {HOUR_SLOTS.map((h) => (
                        <option key={h} value={h} className="bg-slate-900 text-white">
                          Ora {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Full Route Map, Segments & Bi-Temp Compartment of the Assigned Trailer */}
              <div className="tahoe-card-inner rounded-2xl p-4 space-y-3.5 border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#30D158]">
                      TRASEUL COMPLET AL CURSEI ({detailTrailer.id}) & HARTA RUTIERĂ LIVE
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      Coridor: {detailTrailer.routeSummary.join(' → ')} ·{' '}
                      <span className="text-[#64D2FF]">
                        {detailMapTrip.routeDef.totalTechKm.toLocaleString('ro-RO')} km
                      </span>{' '}
                      · Liber remorcă:{' '}
                      <span className="text-[#30D158]">
                        {detailTrailer.freeLdm.toFixed(1)} LDM
                      </span>
                    </div>
                  </div>
                  {knownDetailTrailer && (
                    <div className="text-xs text-white/70 tabular-nums">
                      Z1: <strong>{detailTrailer.zone1Temp}°C</strong> / Z2:{' '}
                      <strong>+{detailTrailer.zone2Temp}°C</strong> · Tahograf șofer:{' '}
                      <strong>{detailTrailer.driver1.remainingDailyDriveHours}h azi</strong>
                    </div>
                  )}
                </div>

                {/* Interactive Leaflet HGV Map for THIS Specific Trip's Complete Route */}
                <EuropeLiveMap
                  trailers={[detailTrailer]}
                  singleTripItem={detailMapTrip}
                  singleTripMode
                  heightClass="h-[260px] sm:h-[310px]"
                />
              </div>

              {/* Footer Actions */}
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
                    {modalDay.label} ({modalDay.date}) · Ora{' '}
                    {quickCreateCell.hourSlot}
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
                      Ora / Rând calendar
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
                            {slot}{' '}
                            {slotPast
                              ? '· oră trecută'
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

              {/* Live Road Distance & Tariff Preview */}
              <div className="px-3 py-2 rounded-full tahoe-card-inner border border-[#0A84FF]/30 flex items-center justify-between text-[11px] tabular-nums">
                <span className="text-white/70 font-semibold">
                  Distanță rutieră calculată:
                </span>
                <span className="font-extrabold text-[#64D2FF]">
                  {buildRoadDistanceWithDetourLabel(qcFrom, qcTo, 0)}
                </span>
              </div>

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
                  + Salvează Cursa ({modalDay.short} {modalDay.dayNum} · {quickCreateCell.hourSlot})
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Printable CMR & Fiscal Invoice Modal */}
      <CmrAndInvoiceModal
        docData={printableDoc}
        onClose={() => setPrintableDoc(null)}
      />
    </div>
  );
};
