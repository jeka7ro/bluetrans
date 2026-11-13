import { Temporal } from 'temporal-polyfill';
import { TrailerUnit } from '../data/mockData';
import type { HourlyPlanningCard } from '../components/Planning7DaysView';
import { lookupLearnedPlaceCoords, normalizePlaceKey } from '../components/GoogleMapsAddressInput';
import {
  getPlanningOrderNumber,
  getPlanningWeekMeta,
  getRomaniaZonedNow,
  ROMANIA_TIME_ZONE,
} from './romaniaTime';
import { computeHgvRouteMetrics } from './googleMapsLinks';

export type AppleWeatherType = 'sun' | 'partly-cloudy' | 'rain' | 'snow' | 'wind';

export type TripLifecycleKind = 'in_transit' | 'planned' | 'past';

export interface RouteCheckpoint {
  city: string;
  country: string;
  coords: [number, number];
  completed: boolean;
  current?: boolean;
  eta: string;
  techKm: string;
  weatherType: AppleWeatherType;
  tempC: number;
  weatherDesc: string;
  freeLdmAfter: number;
}

export interface RouteDefinition {
  trailerId: string;
  tripCode: string;
  highwayCorridor: string;
  color: string;
  glowColor: string;
  totalTechKm: number;
  drivenKm: number;
  estDriveHours: string;
  transitWindow: string;
  coordinates: [number, number][];
  checkpoints: RouteCheckpoint[];
}

export interface MapTripItem {
  mapId: string;
  lifecycle: TripLifecycleKind;
  badgeLabel: string;
  shortTimeBadge: string;
  scheduleFullLabel: string;
  clientLabel?: string;
  routeSummaryText: string;
  trailer: TrailerUnit;
  routeDef: RouteDefinition;
  sourceCardId?: string;
  linkedCardCount?: number;
}

export interface CardLifecycleInfo {
  lifecycle: TripLifecycleKind;
  badgeLabel: 'Activă' | 'Planificată' | 'Trecută';
  shortTimeBadge: string;
  scheduleFullLabel: string;
  isoDate: string;
  isAbsorbedInLiveCorridor: boolean;
  progressRatio: number;
}

export const CORRIDOR_ROUTES: Record<string, RouteDefinition> = {
  'BH 67 STS': {
    trailerId: 'BH 67 STS',
    tripCode: 'TR-4821',
    highwayCorridor: 'M35 → M3 → M0 → M1 → A4 → A1 → A8 → A3 → A67 → A15',
    color: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.35)',
    totalTechKm: 1580,
    drivenKm: 540,
    estDriveHours: '19h 30m',
    transitWindow: '9 Noi 06:00 → 10 Noi 15:00',
    coordinates: [
      [47.0722, 21.9217], // Oradea (RO)
      [47.131, 21.795], // Borș II / A3
      [47.5316, 21.6273], // Debrecen (M35)
      [47.785, 21.12], // Polgár / M3 Junction
      [47.76, 20.35], // Füzesabony (M3)
      [47.65, 19.6], // Hatvan (M3)
      [47.41, 19.15], // Budapesta Sud Ring (M0)
      [47.46, 18.88], // Biatorbágy (M1)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom / Nickelsdorf (M1/A4)
      [48.02, 16.78], // Bruck an der Leitha (A4)
      [48.14, 16.42], // Viena Schwechat / S1
      [48.2082, 16.3738], // Viena (AT)
      [48.195, 15.63], // St. Pölten (A1)
      [48.21, 14.87], // Amstetten (A1)
      [48.26, 14.29], // Linz / Ansfelden (A1)
      [48.17, 13.98], // Wels (A8)
      [48.4064, 13.4314], // Suben / Passau (A8/A3)
      [48.83, 12.96], // Deggendorf (A3)
      [48.88, 12.57], // Straubing (A3)
      [48.99, 12.1], // Regensburg (A3)
      [49.2789, 11.4611], // Neumarkt in der Oberpfalz (A3)
      [49.4521, 11.0767], // Nürnberg (A3)
      [49.58, 10.86], // Erlangen (A3)
      [49.76, 9.95], // Würzburg (A3)
      [49.98, 9.15], // Aschaffenburg (A3)
      [50.05, 8.58], // Frankfurt Airport / Kreuz (A3)
      [50.38, 8.06], // Limburg an der Lahn (A3)
      [50.45, 7.82], // Montabaur (A3)
      [50.75, 7.25], // Siegburg / Bonn (A3)
      [50.9375, 6.9603], // Köln Ring (A3/A4)
      [51.18, 6.44], // Mönchengladbach (A61)
      [51.3704, 6.1724], // Venlo Border (A61/A67)
      [51.41, 5.48], // Eindhoven Ring (A67/A2)
      [51.55, 5.08], // Tilburg (A58)
      [51.58, 4.77], // Breda (A16)
      [51.8, 4.66], // Dordrecht (A16)
      [51.9244, 4.4777], // Rotterdam Port (A15)
    ],
    checkpoints: [
      { city: 'Oradea', country: 'RO', coords: [47.0722, 21.9217], completed: true, eta: 'Plecat 06:00 (M35/M3)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 11, weatherDesc: 'Senin · Uscat', freeLdmAfter: 1.2 },
      { city: 'Budapesta', country: 'HU', coords: [47.41, 19.15], completed: true, eta: 'Trecut 10:15 (M0/M1)', techKm: '295 km (+295 km)', weatherType: 'partly-cloudy', tempC: 10, weatherDesc: 'Parțial noros', freeLdmAfter: 1.2 },
      { city: 'Viena', country: 'AT', coords: [48.2082, 16.3738], completed: false, current: true, eta: 'Azi 14:30 (-4.2 LDM)', techKm: '540 km (+245 km)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Parțial noros', freeLdmAfter: 5.4 },
      { city: 'Köln', country: 'DE', coords: [50.9375, 6.9603], completed: false, eta: 'Mâine 08:30 (-3.0 LDM)', techKm: '1.310 km (+770 km)', weatherType: 'partly-cloudy', tempC: 7, weatherDesc: 'Parțial noros', freeLdmAfter: 8.4 },
      { city: 'Rotterdam', country: 'NL', coords: [51.9244, 4.4777], completed: false, eta: 'Mâine 15:00 (Final)', techKm: '1.580 km (+270 km)', weatherType: 'wind', tempC: 8, weatherDesc: 'Vânt de coastă', freeLdmAfter: 13.6 },
    ],
  },
  'BH 69 STS': {
    trailerId: 'BH 69 STS',
    tripCode: 'TR-4819',
    highwayCorridor: 'M4 → M0 → M1 → A4 → A1 → A8 → A99 → A8 → A5 → A3 → A12 → A27',
    color: '#ea580c',
    glowColor: 'rgba(234, 88, 12, 0.35)',
    totalTechKm: 1420,
    drivenKm: 680,
    estDriveHours: '17h 45m',
    transitWindow: '9 Noi 04:30 → 10 Noi 16:00',
    coordinates: [
      [47.1621, 20.1825], // Szolnok (M4)
      [47.32, 19.55], // Monor (M4)
      [47.41, 19.15], // Budapesta (M0)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom (M1/A4)
      [48.2082, 16.3738], // Viena (A1)
      [48.26, 14.29], // Linz (A1)
      [47.8095, 13.055], // Salzburg (A1/A8)
      [47.85, 12.12], // Rosenheim (A8)
      [48.1351, 11.582], // München (A99/A8)
      [48.3705, 10.8978], // Augsburg (A8)
      [48.4011, 9.9876], // Ulm (A8)
      [48.7758, 9.1829], // Stuttgart (A8/A81)
      [49.0069, 8.4037], // Karlsruhe (A8/A5)
      [49.4875, 8.466], // Mannheim / Walldorf (A5/A6)
      [50.1109, 8.6821], // Frankfurt am Main (A5/A3)
      [50.45, 7.82], // Montabaur (A3)
      [50.9375, 6.9603], // Köln (A3)
      [51.45, 6.75], // Duisburg / Oberhausen (A3)
      [51.83, 6.15], // Emmerich / Arnhem Border (A3/A12)
      [52.0907, 5.1214], // Utrecht (A12/A27)
      [52.3508, 5.2647], // Almere (A27/A6)
    ],
    checkpoints: [
      { city: 'Szolnok', country: 'HU', coords: [47.1621, 20.1825], completed: true, eta: 'Plecat 04:30 (M4/M1)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 10, weatherDesc: 'Senin · Uscat', freeLdmAfter: 0.0 },
      { city: 'München', country: 'DE', coords: [48.1351, 11.582], completed: false, current: true, eta: 'Azi 16:00 (-2.2 LDM)', techKm: '680 km (+680 km)', weatherType: 'partly-cloudy', tempC: 6, weatherDesc: 'Parțial noros', freeLdmAfter: 2.2 },
      { city: 'Frankfurt', country: 'DE', coords: [50.1109, 8.6821], completed: false, eta: 'Mâine 07:00 (-4.4 LDM)', techKm: '1.070 km (+390 km)', weatherType: 'partly-cloudy', tempC: 7, weatherDesc: 'Parțial noros', freeLdmAfter: 6.6 },
      { city: 'Almere', country: 'NL', coords: [52.3508, 5.2647], completed: false, eta: 'Mâine 16:00 (Final)', techKm: '1.420 km (+350 km)', weatherType: 'wind', tempC: 8, weatherDesc: 'Vânt moderat', freeLdmAfter: 13.6 },
    ],
  },
  'BH 75 STS': {
    trailerId: 'BH 75 STS',
    tripCode: 'TR-4825',
    highwayCorridor: 'A12 → A1 → A7 → E45 → E20 (Pod Storebælt & Pod Øresund) → E6 → E4',
    color: '#16a34a',
    glowColor: 'rgba(22, 163, 74, 0.35)',
    totalTechKm: 1460,
    drivenKm: 490,
    estDriveHours: '18h 15m',
    transitWindow: '9 Noi 05:00 → 10 Noi 16:30',
    coordinates: [
      [51.9244, 4.4777], // Rotterdam
      [52.03, 4.7], // Gouda (A12)
      [52.0907, 5.1214], // Utrecht (A12/A28)
      [52.15, 5.38], // Amersfoort (A1)
      [52.21, 5.96], // Apeldoorn (A1)
      [52.26, 6.79], // Hengelo (A1)
      [52.31, 7.04], // Bad Bentheim Border (A1/A30)
      [52.2799, 8.0472], // Osnabrück (A30/A1)
      [53.0793, 8.8017], // Bremen (A1)
      [53.5511, 9.9937], // Hamburg Elbtunnel (A1/A7)
      [54.07, 9.98], // Neumünster (A7)
      [54.3, 9.66], // Rendsburg (A7)
      [54.78, 9.43], // Flensburg / Padborg Border (A7/E45)
      [55.04, 9.38], // Aabenraa (E45)
      [55.4904, 9.4722], // Kolding (E45/E20)
      [55.55, 9.75], // Fredericia / Little Belt Bridge (E20)
      [55.3959, 10.3883], // Odense (E20)
      [55.31, 10.79], // Nyborg — Podul Storebælt Vest (E20)
      [55.34, 11.13], // Korsør — Podul Storebælt Est (E20)
      [55.44, 11.79], // Ringsted (E20)
      [55.49, 12.18], // Køge (E20)
      [55.63, 12.58], // Copenhaga Sud / Kastrup (E20)
      [55.57, 12.89], // Podul Øresund (E20 — Traseu Rutier Camioane)
      [55.605, 13.0038], // Malmö Ring (E20/E6)
      [55.85, 12.86], // Landskrona (E6)
      [56.0465, 12.6945], // Helsingborg (E6/E4)
      [56.67, 13.5], // Ljungby (E4)
      [57.18, 14.04], // Värnamo (E4)
      [57.7826, 14.1618], // Jönköping (E4)
      [58.4108, 15.6214], // Linköping (E4)
      [58.5877, 16.1924], // Norrköping (E4)
      [58.75, 17.0], // Nyköping (E4)
      [59.1955, 17.6253], // Södertälje (E4)
      [59.3293, 18.0686], // Stockholm (E4)
    ],
    checkpoints: [
      { city: 'Rotterdam', country: 'NL', coords: [51.9244, 4.4777], completed: true, eta: 'Plecat 05:00 (A12/A1)', techKm: '0 km (Start)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Parțial noros', freeLdmAfter: 4.4 },
      { city: 'Hamburg', country: 'DE', coords: [53.5511, 9.9937], completed: false, current: true, eta: 'Azi 13:30 (-2.4 LDM)', techKm: '490 km (+490 km)', weatherType: 'partly-cloudy', tempC: 7, weatherDesc: 'Parțial noros', freeLdmAfter: 6.8 },
      { city: 'Malmö (Pod Øresund)', country: 'SE', coords: [55.605, 13.0038], completed: false, eta: 'Mâine 06:30 (-2.8 LDM)', techKm: '880 km (+390 km)', weatherType: 'wind', tempC: 4, weatherDesc: 'Vânt 42 km/h', freeLdmAfter: 9.6 },
      { city: 'Stockholm', country: 'SE', coords: [59.3293, 18.0686], completed: false, eta: 'Mâine 16:30 (E4 Final)', techKm: '1.460 km (+580 km)', weatherType: 'partly-cloudy', tempC: 5, weatherDesc: 'Parțial noros', freeLdmAfter: 13.6 },
    ],
  },
  'BH 74 STS': {
    trailerId: 'BH 74 STS',
    tripCode: 'TR-4818',
    highwayCorridor: 'M35 → M3 → M1 → A4 → A1 → A8 → A99 → A8',
    color: '#7c3aed',
    glowColor: 'rgba(124, 58, 237, 0.38)',
    totalTechKm: 1090,
    drivenKm: 860,
    estDriveHours: '13h 40m',
    transitWindow: '8 Noi 18:00 → 9 Noi 19:30',
    coordinates: [
      [47.0722, 21.9217], // Oradea
      [47.5316, 21.6273], // Debrecen (M35)
      [47.785, 21.12], // Polgár (M3)
      [47.41, 19.15], // Budapesta (M0)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom (M1/A4)
      [48.2082, 16.3738], // Viena (A1)
      [48.26, 14.29], // Linz (A1)
      [48.4064, 13.4314], // Suben / Passau (A8/A3)
      [48.55, 12.15], // Landshut / A92
      [48.1351, 11.582], // München (A99/A8)
      [48.3705, 10.8978], // Augsburg (A8)
      [48.4011, 9.9876], // Ulm (A8)
      [48.7758, 9.1829], // Stuttgart (A8)
    ],
    checkpoints: [
      { city: 'Oradea', country: 'RO', coords: [47.0722, 21.9217], completed: true, eta: 'Plecat Ieri (M35/M3)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 12, weatherDesc: 'Senin · Uscat', freeLdmAfter: 1.2 },
      { city: 'Suben', country: 'AT', coords: [48.4064, 13.4314], completed: true, eta: 'Trecut 09:00 (A8)', techKm: '690 km (+690 km)', weatherType: 'partly-cloudy', tempC: 8, weatherDesc: 'Parțial noros', freeLdmAfter: 1.2 },
      { city: 'München', country: 'DE', coords: [48.1351, 11.582], completed: false, current: true, eta: 'La descărcare (-2.8 LDM)', techKm: '860 km (+170 km)', weatherType: 'partly-cloudy', tempC: 6, weatherDesc: 'Nori trecători', freeLdmAfter: 4.0 },
      { city: 'Stuttgart', country: 'DE', coords: [48.7758, 9.1829], completed: false, eta: 'Azi 19:30 (A8 Final)', techKm: '1.090 km (+230 km)', weatherType: 'partly-cloudy', tempC: 7, weatherDesc: 'Parțial noros', freeLdmAfter: 13.6 },
    ],
  },
  'BH 91 STS': {
    trailerId: 'BH 91 STS',
    tripCode: 'TR-4817',
    highwayCorridor: 'A15 → A67 → A40 → A2 → A1 → A7 → E45 → E20 (Storebælt & Øresund) → E6',
    color: '#0891b2',
    glowColor: 'rgba(8, 145, 178, 0.35)',
    totalTechKm: 1180,
    drivenKm: 165,
    estDriveHours: '14h 50m',
    transitWindow: '9 Noi 07:30 → 10 Noi 14:00',
    coordinates: [
      [51.9244, 4.4777], // Rotterdam
      [51.8, 4.66], // Dordrecht (A16)
      [51.58, 4.77], // Breda (A58)
      [51.41, 5.48], // Eindhoven (A67)
      [51.3704, 6.1724], // Venlo (A67/A40)
      [51.45, 6.75], // Duisburg (A40/A2)
      [51.96, 7.62], // Münster (A1)
      [52.2799, 8.0472], // Osnabrück (A1)
      [53.0793, 8.8017], // Bremen (A1)
      [53.5511, 9.9937], // Hamburg (A7)
      [54.78, 9.43], // Flensburg (A7)
      [55.4904, 9.4722], // Kolding (E45)
      [55.3959, 10.3883], // Odense (E20)
      [55.31, 10.79], // Pod Storebælt Vest
      [55.34, 11.13], // Pod Storebælt Est
      [55.63, 12.58], // Copenhaga (E20)
      [55.57, 12.89], // Pod Øresund (E20)
      [55.605, 13.0038], // Malmö (E6)
      [56.0465, 12.6945], // Helsingborg (E6)
      [56.67, 12.85], // Halmstad (E6)
      [57.1, 12.25], // Varberg (E6)
      [57.7089, 11.9746], // Göteborg (E6)
    ],
    checkpoints: [
      { city: 'Rotterdam', country: 'NL', coords: [51.9244, 4.4777], completed: true, eta: 'Plecat 07:30 (A15/A67)', techKm: '0 km (Start)', weatherType: 'wind', tempC: 9, weatherDesc: 'Vânt moderat', freeLdmAfter: 5.2 },
      { city: 'Venlo', country: 'NL', coords: [51.3704, 6.1724], completed: false, current: true, eta: 'Încărcare grupaj (A67)', techKm: '165 km (+165 km)', weatherType: 'partly-cloudy', tempC: 8, weatherDesc: 'Parțial noros', freeLdmAfter: 5.2 },
      { city: 'Kolding', country: 'DK', coords: [55.4904, 9.4722], completed: false, eta: 'Mâine 05:00 (-3.2 LDM)', techKm: '690 km (+525 km)', weatherType: 'partly-cloudy', tempC: 5, weatherDesc: 'Parțial noros', freeLdmAfter: 8.4 },
      { city: 'Göteborg', country: 'SE', coords: [57.7089, 11.9746], completed: false, eta: 'Mâine 14:00 (E6 Final)', techKm: '1.180 km (+490 km)', weatherType: 'partly-cloudy', tempC: 4, weatherDesc: 'Parțial noros', freeLdmAfter: 13.6 },
    ],
  },
  'BH 23 STS': {
    trailerId: 'BH 23 STS',
    tripCode: 'EXP-104',
    highwayCorridor: 'A3/M35 → M3 → M0 → M1 → A4 (Schmitz S.KO Cool 2025)',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    totalTechKm: 540,
    drivenKm: 410,
    estDriveHours: '6h 15m',
    transitWindow: '9 Noi 07:00 → 9 Noi 13:15',
    coordinates: [
      [47.0722, 21.9217], // Oradea (RO)
      [47.131, 21.795], // Borș II / A3
      [47.5316, 21.6273], // Debrecen (M35)
      [47.785, 21.12], // Polgár / M3 Junction
      [47.76, 20.35], // Füzesabony (M3)
      [47.65, 19.6], // Hatvan (M3)
      [47.41, 19.15], // Budapesta Sud Ring (M0)
      [47.46, 18.88], // Biatorbágy (M1)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom / Nickelsdorf (M1/A4)
      [48.02, 16.78], // Bruck an der Leitha (A4)
      [48.14, 16.42], // Viena Schwechat / S1
      [48.2082, 16.3738], // Viena (AT)
    ],
    checkpoints: [
      { city: 'Oradea', country: 'RO', coords: [47.0722, 21.9217], completed: true, eta: 'Plecat 07:00 (Express)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 11, weatherDesc: 'Senin · Uscat', freeLdmAfter: 0.8 },
      { city: 'Budapesta', country: 'HU', coords: [47.41, 19.15], completed: true, eta: 'Trecut 10:45 (M0)', techKm: '295 km (+295 km)', weatherType: 'partly-cloudy', tempC: 10, weatherDesc: 'Parțial noros', freeLdmAfter: 0.8 },
      { city: 'Viena', country: 'AT', coords: [48.2082, 16.3738], completed: false, current: true, eta: 'Azi 13:15 (Transfer)', techKm: '540 km (+245 km)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Parțial noros', freeLdmAfter: 4.2 },
    ],
  },
  'BH 31 STS': {
    trailerId: 'BH 31 STS',
    tripCode: 'EXP-108',
    highwayCorridor: 'M5 → M0 → M1 → D2 → D1 → A5 (Schmitz S.KO Cool Bi-Temp)',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    totalTechKm: 480,
    drivenKm: 320,
    estDriveHours: '5h 50m',
    transitWindow: '9 Noi 06:30 → 9 Noi 18:00',
    coordinates: [
      [46.253, 20.1414], // Szeged (M5)
      [46.71, 19.84], // Kiskunfélegyháza (M5)
      [46.9, 19.69], // Kecskemét (M5)
      [47.41, 19.15], // Budapesta Ring (M0)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.86, 17.27], // Mosonmagyaróvár (M1/M15)
      [48.01, 17.2], // Rajka / Čunovo (M15/D2)
      [48.1486, 17.1077], // Bratislava (D2)
      [48.43, 17.02], // Malacky (D2)
      [48.72, 16.94], // Kúty / Břeclav (D2)
      [48.94, 16.74], // Hustopeče (D2)
      [49.1951, 16.6068], // Brno (D2/D1)
      [48.75, 16.63], // Mikulov / Poysdorf (B7/A5)
      [48.57, 16.57], // Mistelbach (A5)
      [48.2082, 16.3738], // Viena (A5)
    ],
    checkpoints: [
      { city: 'Szeged', country: 'HU', coords: [46.253, 20.1414], completed: true, eta: 'Plecat 06:30 (M5)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 12, weatherDesc: 'Senin · Uscat', freeLdmAfter: 1.4 },
      { city: 'Bratislava', country: 'SK', coords: [48.1486, 17.1077], completed: false, current: true, eta: 'Azi 14:00 (-2.0 LDM)', techKm: '365 km (+365 km)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Parțial noros', freeLdmAfter: 3.4 },
      { city: 'Viena', country: 'AT', coords: [48.2082, 16.3738], completed: false, eta: 'Azi 18:00 (Final 7.5T)', techKm: '480 km (+115 km)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Senin / Nori', freeLdmAfter: 6.2 },
    ],
  },
};

interface CityGeoEntry {
  coords: [number, number];
  country: string;
  display: string;
}

const CITY_GEO_CATALOG: Record<string, CityGeoEntry> = {
  // România
  oradea: { coords: [47.0722, 21.9217], country: 'RO', display: 'Oradea' },
  bors: { coords: [47.1167, 21.8167], country: 'RO', display: 'Borș' },
  cluj: { coords: [46.7712, 23.6236], country: 'RO', display: 'Cluj-Napoca' },
  'cluj-napoca': { coords: [46.7712, 23.6236], country: 'RO', display: 'Cluj-Napoca' },
  turda: { coords: [46.5667, 23.7833], country: 'RO', display: 'Turda' },
  bistrita: { coords: [47.1333, 24.5], country: 'RO', display: 'Bistrița' },
  'baia mare': { coords: [47.6567, 23.585], country: 'RO', display: 'Baia Mare' },
  'satu mare': { coords: [47.79, 22.8857], country: 'RO', display: 'Satu Mare' },
  carei: { coords: [47.6833, 22.4667], country: 'RO', display: 'Carei' },
  zalau: { coords: [47.1911, 23.0572], country: 'RO', display: 'Zalău' },
  'targu mures': { coords: [46.5425, 24.5575], country: 'RO', display: 'Târgu Mureș' },
  timisoara: { coords: [45.7489, 21.2087], country: 'RO', display: 'Timișoara' },
  arad: { coords: [46.1866, 21.3123], country: 'RO', display: 'Arad' },
  nadlac: { coords: [46.1667, 20.75], country: 'RO', display: 'Nădlac' },
  deva: { coords: [45.8833, 22.9], country: 'RO', display: 'Deva' },
  sebes: { coords: [45.96, 23.57], country: 'RO', display: 'Sebeș' },
  'alba iulia': { coords: [46.0667, 23.5833], country: 'RO', display: 'Alba Iulia' },
  sibiu: { coords: [45.7983, 24.1256], country: 'RO', display: 'Sibiu' },
  brasov: { coords: [45.6427, 25.5887], country: 'RO', display: 'Brașov' },
  ploiesti: { coords: [44.9462, 26.0254], country: 'RO', display: 'Ploiești' },
  pitesti: { coords: [44.8565, 24.8692], country: 'RO', display: 'Pitești' },
  craiova: { coords: [44.3302, 23.7949], country: 'RO', display: 'Craiova' },
  bucuresti: { coords: [44.4268, 26.1025], country: 'RO', display: 'București' },
  constanta: { coords: [44.1598, 28.6348], country: 'RO', display: 'Constanța' },
  giurgiu: { coords: [43.9037, 25.9699], country: 'RO', display: 'Giurgiu' },
  bacau: { coords: [46.567, 26.9146], country: 'RO', display: 'Bacău' },
  iasi: { coords: [47.1585, 27.6014], country: 'RO', display: 'Iași' },
  suceava: { coords: [47.6514, 26.2556], country: 'RO', display: 'Suceava' },
  // Ungaria
  szolnok: { coords: [47.1621, 20.1825], country: 'HU', display: 'Szolnok' },
  szeged: { coords: [46.253, 20.1414], country: 'HU', display: 'Szeged' },
  debrecen: { coords: [47.5316, 21.6273], country: 'HU', display: 'Debrecen' },
  budapesta: { coords: [47.41, 19.15], country: 'HU', display: 'Budapesta' },
  budapest: { coords: [47.41, 19.15], country: 'HU', display: 'Budapesta' },
  gyor: { coords: [47.6875, 17.6504], country: 'HU', display: 'Győr' },
  kecskemet: { coords: [46.8964, 19.6897], country: 'HU', display: 'Kecskemét' },
  tatabanya: { coords: [47.5692, 18.4048], country: 'HU', display: 'Tatabánya' },
  hegyeshalom: { coords: [47.9144, 17.1528], country: 'HU', display: 'Hegyeshalom' },
  // Austria
  viena: { coords: [48.2082, 16.3738], country: 'AT', display: 'Viena' },
  vienna: { coords: [48.2082, 16.3738], country: 'AT', display: 'Viena' },
  wien: { coords: [48.2082, 16.3738], country: 'AT', display: 'Viena' },
  linz: { coords: [48.3069, 14.2858], country: 'AT', display: 'Linz' },
  salzburg: { coords: [47.8095, 13.055], country: 'AT', display: 'Salzburg' },
  graz: { coords: [47.0707, 15.4395], country: 'AT', display: 'Graz' },
  suben: { coords: [48.4064, 13.4314], country: 'AT', display: 'Suben' },
  innsbruck: { coords: [47.2692, 11.4041], country: 'AT', display: 'Innsbruck' },
  // Germania
  munchen: { coords: [48.1351, 11.582], country: 'DE', display: 'München' },
  munich: { coords: [48.1351, 11.582], country: 'DE', display: 'München' },
  frankfurt: { coords: [50.1109, 8.6821], country: 'DE', display: 'Frankfurt' },
  koln: { coords: [50.9375, 6.9603], country: 'DE', display: 'Köln' },
  cologne: { coords: [50.9375, 6.9603], country: 'DE', display: 'Köln' },
  stuttgart: { coords: [48.7758, 9.1829], country: 'DE', display: 'Stuttgart' },
  nurnberg: { coords: [49.4521, 11.0767], country: 'DE', display: 'Nürnberg' },
  nuremberg: { coords: [49.4521, 11.0767], country: 'DE', display: 'Nürnberg' },
  hamburg: { coords: [53.5511, 9.9937], country: 'DE', display: 'Hamburg' },
  bremen: { coords: [53.0793, 8.8017], country: 'DE', display: 'Bremen' },
  hannover: { coords: [52.3759, 9.732], country: 'DE', display: 'Hannover' },
  berlin: { coords: [52.52, 13.405], country: 'DE', display: 'Berlin' },
  dortmund: { coords: [51.5136, 7.4653], country: 'DE', display: 'Dortmund' },
  duisburg: { coords: [51.4344, 6.7623], country: 'DE', display: 'Duisburg' },
  dusseldorf: { coords: [51.2277, 6.7735], country: 'DE', display: 'Düsseldorf' },
  essen: { coords: [51.4556, 7.0116], country: 'DE', display: 'Essen' },
  leipzig: { coords: [51.3397, 12.3731], country: 'DE', display: 'Leipzig' },
  dresda: { coords: [51.0504, 13.7373], country: 'DE', display: 'Dresda' },
  dresden: { coords: [51.0504, 13.7373], country: 'DE', display: 'Dresda' },
  mannheim: { coords: [49.4875, 8.466], country: 'DE', display: 'Mannheim' },
  karlsruhe: { coords: [49.0069, 8.4037], country: 'DE', display: 'Karlsruhe' },
  ulm: { coords: [48.4011, 9.9876], country: 'DE', display: 'Ulm' },
  augsburg: { coords: [48.3705, 10.8978], country: 'DE', display: 'Augsburg' },
  regensburg: { coords: [49.0134, 12.1016], country: 'DE', display: 'Regensburg' },
  wurzburg: { coords: [49.7913, 9.9534], country: 'DE', display: 'Würzburg' },
  kassel: { coords: [51.3127, 9.4797], country: 'DE', display: 'Kassel' },
  osnabruck: { coords: [52.2799, 8.0472], country: 'DE', display: 'Osnabrück' },
  passau: { coords: [48.5665, 13.4319], country: 'DE', display: 'Passau' },
  neumarkt: { coords: [49.2789, 11.4611], country: 'DE', display: 'Neumarkt' },
  // Olanda, Belgia, Luxemburg
  rotterdam: { coords: [51.9244, 4.4777], country: 'NL', display: 'Rotterdam' },
  amsterdam: { coords: [52.3676, 4.9041], country: 'NL', display: 'Amsterdam' },
  venlo: { coords: [51.3704, 6.1724], country: 'NL', display: 'Venlo' },
  almere: { coords: [52.3508, 5.2647], country: 'NL', display: 'Almere' },
  utrecht: { coords: [52.0907, 5.1214], country: 'NL', display: 'Utrecht' },
  eindhoven: { coords: [51.4416, 5.4697], country: 'NL', display: 'Eindhoven' },
  breda: { coords: [51.5719, 4.7683], country: 'NL', display: 'Breda' },
  tilburg: { coords: [51.5555, 5.0913], country: 'NL', display: 'Tilburg' },
  zwolle: { coords: [52.5168, 6.083], country: 'NL', display: 'Zwolle' },
  lemmer: { coords: [52.8458, 5.7097], country: 'NL', display: 'Lemmer' },
  antwerpen: { coords: [51.2194, 4.4025], country: 'BE', display: 'Antwerpen' },
  anvers: { coords: [51.2194, 4.4025], country: 'BE', display: 'Antwerpen' },
  bruxelles: { coords: [50.8503, 4.3517], country: 'BE', display: 'Bruxelles' },
  brussels: { coords: [50.8503, 4.3517], country: 'BE', display: 'Bruxelles' },
  gent: { coords: [51.0543, 3.7174], country: 'BE', display: 'Gent' },
  liege: { coords: [50.6326, 5.5797], country: 'BE', display: 'Liège' },
  luxemburg: { coords: [49.6116, 6.1319], country: 'LU', display: 'Luxemburg' },
  luxembourg: { coords: [49.6116, 6.1319], country: 'LU', display: 'Luxemburg' },
  // Cehia, Slovacia, Polonia
  praga: { coords: [50.0755, 14.4378], country: 'CZ', display: 'Praga' },
  praha: { coords: [50.0755, 14.4378], country: 'CZ', display: 'Praga' },
  brno: { coords: [49.1951, 16.6068], country: 'CZ', display: 'Brno' },
  ostrava: { coords: [49.8209, 18.2625], country: 'CZ', display: 'Ostrava' },
  plzen: { coords: [49.7384, 13.3736], country: 'CZ', display: 'Plzeň' },
  bratislava: { coords: [48.1486, 17.1077], country: 'SK', display: 'Bratislava' },
  varsovia: { coords: [52.2297, 21.0122], country: 'PL', display: 'Varșovia' },
  warszawa: { coords: [52.2297, 21.0122], country: 'PL', display: 'Varșovia' },
  wroclaw: { coords: [51.1079, 17.0385], country: 'PL', display: 'Wrocław' },
  poznan: { coords: [52.4064, 16.9252], country: 'PL', display: 'Poznań' },
  katowice: { coords: [50.2649, 19.0238], country: 'PL', display: 'Katowice' },
  krakow: { coords: [50.0647, 19.945], country: 'PL', display: 'Cracovia' },
  gdansk: { coords: [54.352, 18.6466], country: 'PL', display: 'Gdańsk' },
  // Franța, Italia, Elveția, Spania, UK
  paris: { coords: [48.8566, 2.3522], country: 'FR', display: 'Paris' },
  lille: { coords: [50.6292, 3.0573], country: 'FR', display: 'Lille' },
  strasbourg: { coords: [48.5734, 7.7521], country: 'FR', display: 'Strasbourg' },
  lyon: { coords: [45.764, 4.8357], country: 'FR', display: 'Lyon' },
  marseille: { coords: [43.2965, 5.3698], country: 'FR', display: 'Marsilia' },
  milano: { coords: [45.4642, 9.19], country: 'IT', display: 'Milano' },
  torino: { coords: [45.0703, 7.6869], country: 'IT', display: 'Torino' },
  verona: { coords: [45.4384, 10.9916], country: 'IT', display: 'Verona' },
  padova: { coords: [45.4064, 11.8768], country: 'IT', display: 'Padova' },
  bologna: { coords: [44.4949, 11.3426], country: 'IT', display: 'Bologna' },
  roma: { coords: [41.9028, 12.4964], country: 'IT', display: 'Roma' },
  zurich: { coords: [47.3769, 8.5417], country: 'CH', display: 'Zürich' },
  basel: { coords: [47.5596, 7.5886], country: 'CH', display: 'Basel' },
  madrid: { coords: [40.4168, -3.7038], country: 'ES', display: 'Madrid' },
  barcelona: { coords: [41.3874, 2.1686], country: 'ES', display: 'Barcelona' },
  zaragoza: { coords: [41.6488, -0.8891], country: 'ES', display: 'Zaragoza' },
  valencia: { coords: [39.4699, -0.3763], country: 'ES', display: 'Valencia' },
  londra: { coords: [51.5072, -0.1276], country: 'GB', display: 'Londra' },
  london: { coords: [51.5072, -0.1276], country: 'GB', display: 'Londra' },
  // Danemarca, Suedia, Norvegia & Sud-Est
  padborg: { coords: [54.8258, 9.36], country: 'DK', display: 'Padborg' },
  kolding: { coords: [55.4904, 9.4722], country: 'DK', display: 'Kolding' },
  odense: { coords: [55.4038, 10.4024], country: 'DK', display: 'Odense' },
  aarhus: { coords: [56.1629, 10.2039], country: 'DK', display: 'Aarhus' },
  copenhaga: { coords: [55.6761, 12.5683], country: 'DK', display: 'Copenhaga' },
  kobenhavn: { coords: [55.6761, 12.5683], country: 'DK', display: 'Copenhaga' },
  malmo: { coords: [55.605, 13.0038], country: 'SE', display: 'Malmö' },
  helsingborg: { coords: [56.0465, 12.6945], country: 'SE', display: 'Helsingborg' },
  goteborg: { coords: [57.7089, 11.9746], country: 'SE', display: 'Göteborg' },
  jonkoping: { coords: [57.7826, 14.1618], country: 'SE', display: 'Jönköping' },
  stockholm: { coords: [59.3293, 18.0686], country: 'SE', display: 'Stockholm' },
  oslo: { coords: [59.9139, 10.7522], country: 'NO', display: 'Oslo' },
  ljubljana: { coords: [46.0569, 14.5058], country: 'SI', display: 'Ljubljana' },
  zagreb: { coords: [45.815, 15.9819], country: 'HR', display: 'Zagreb' },
  sofia: { coords: [42.6977, 23.3219], country: 'BG', display: 'Sofia' },
  ruse: { coords: [43.8356, 25.9657], country: 'BG', display: 'Ruse' },
};

const SORTED_CITY_GEO_KEYS = Object.keys(CITY_GEO_CATALOG).sort(
  (a, b) => b.length - a.length
);

const DYNAMIC_TRIP_PALETTE = [
  { color: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.36)' },
  { color: '#10b981', glow: 'rgba(16, 185, 129, 0.36)' },
  { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.36)' },
  { color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.36)' },
  { color: '#ec4899', glow: 'rgba(236, 72, 153, 0.36)' },
  { color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.36)' },
];

export function resolveCityGeo(rawText: string): CityGeoEntry {
  const cleaned = (rawText || '').trim();
  const head = cleaned.split(/[,(→]/)[0]?.trim() || cleaned || 'Oradea';
  const normHead = normalizePlaceKey(head);
  if (normHead && CITY_GEO_CATALOG[normHead]) {
    return CITY_GEO_CATALOG[normHead];
  }
  const normFull = normalizePlaceKey(cleaned);
  for (const key of SORTED_CITY_GEO_KEYS) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(normFull)) {
      return CITY_GEO_CATALOG[key];
    }
  }
  const learned = lookupLearnedPlaceCoords(cleaned);
  if (learned) {
    return {
      coords: learned,
      country: inferCountryFromCoords(learned),
      display: head,
    };
  }
  return {
    coords: [47.0722, 21.9217],
    country: 'RO',
    display: head,
  };
}

function inferCountryFromCoords([lat, lng]: [number, number]): string {
  if (lat >= 55.3 && lng >= 12.6) return 'SE';
  if (lat >= 54.7 && lng >= 8.0 && lng <= 12.8) return 'DK';
  if (lat >= 50.7 && lat <= 53.6 && lng >= 3.3 && lng <= 7.2) return 'NL';
  if (lat >= 43.6 && lat <= 48.3 && lng >= 20.2 && lng <= 29.7) return 'RO';
  if (lat >= 45.7 && lat <= 48.6 && lng >= 16.1 && lng <= 22.9) return 'HU';
  if (lat >= 46.4 && lat <= 49.0 && lng >= 9.5 && lng <= 17.2) return 'AT';
  if (lat >= 47.3 && lat <= 55.0 && lng >= 5.9 && lng <= 15.1) return 'DE';
  return 'EU';
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function parseKmFromLabel(kmLabel: string, fallbackAirKm: number): number {
  const clean = (kmLabel || '').split('·')[0] || '';
  const digits = clean.replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10);
  if (Number.isFinite(parsed) && parsed >= 15) return parsed;
  return Math.max(45, Math.round((fallbackAirKm * 1.24) / 5) * 5);
}

function parseRouteEndpoints(routeLabel: string): { fromRaw: string; toRaw: string } {
  const parts = (routeLabel || '').split('→').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { fromRaw: parts[0], toRaw: parts[parts.length - 1] };
  }
  return { fromRaw: parts[0] || 'Oradea', toRaw: 'Viena' };
}

function isScandinavianPoint(geo: CityGeoEntry): boolean {
  return geo.country === 'SE' || geo.country === 'NO' || geo.coords[0] >= 55.55;
}

/**
 * Builds realistic terrestrial HGV highway corridor stops between two European cities,
 * ensuring routes cross Storebælt & Øresund road bridges (never Baltic ferries) and follow
 * real Romanian/Hungarian/Austrian/German motorway corridors.
 */
function buildTerrestrialCorridorStops(
  fromGeo: CityGeoEntry,
  toGeo: CityGeoEntry
): CityGeoEntry[] {
  const stops: CityGeoEntry[] = [fromGeo];
  const pushUnique = (entry: CityGeoEntry) => {
    const prev = stops[stops.length - 1];
    if (haversineKm(prev.coords, entry.coords) < 45) return;
    if (haversineKm(entry.coords, toGeo.coords) < 45) return;
    stops.push(entry);
  };

  const fromScand = isScandinavianPoint(fromGeo);
  const toScand = isScandinavianPoint(toGeo);

  // Case 1: From Scandinavia (e.g. Stockholm / Göteborg -> Oradea / Central Europe)
  if (fromScand && !toScand) {
    if (fromGeo.coords[0] > 58.0) {
      pushUnique(CITY_GEO_CATALOG.jonkoping);
    }
    pushUnique(CITY_GEO_CATALOG.malmo);
    pushUnique({ coords: [55.57, 12.89], country: 'DK', display: 'Pod Øresund' });
    pushUnique(CITY_GEO_CATALOG.odense);
    pushUnique(CITY_GEO_CATALOG.kolding);
    pushUnique(CITY_GEO_CATALOG.hamburg);
    if (toGeo.coords[1] >= 15.0 && toGeo.coords[0] <= 50.5) {
      pushUnique(CITY_GEO_CATALOG.berlin);
      pushUnique(CITY_GEO_CATALOG.praga);
      pushUnique(CITY_GEO_CATALOG.brno);
      if (toGeo.country === 'RO' || toGeo.country === 'HU' || toGeo.country === 'BG') {
        pushUnique(CITY_GEO_CATALOG.budapesta);
      }
    } else if (toGeo.coords[1] < 8.0) {
      pushUnique(CITY_GEO_CATALOG.bremen);
    }
    stops.push(toGeo);
    return stops;
  }

  // Case 2: To Scandinavia (e.g. Oradea / Rotterdam -> Stockholm / Göteborg)
  if (!fromScand && toScand) {
    if (fromGeo.country === 'RO') {
      if (fromGeo.coords[0] < 46.3 && fromGeo.coords[1] > 23.5) {
        pushUnique(CITY_GEO_CATALOG.sibiu);
        pushUnique(CITY_GEO_CATALOG.arad);
      }
      pushUnique(CITY_GEO_CATALOG.budapesta);
      pushUnique(CITY_GEO_CATALOG.brno);
      pushUnique(CITY_GEO_CATALOG.praga);
      pushUnique(CITY_GEO_CATALOG.berlin);
    }
    pushUnique(CITY_GEO_CATALOG.hamburg);
    pushUnique(CITY_GEO_CATALOG.kolding);
    pushUnique(CITY_GEO_CATALOG.odense);
    pushUnique({ coords: [55.57, 12.89], country: 'DK', display: 'Pod Øresund' });
    pushUnique(CITY_GEO_CATALOG.malmo);
    if (toGeo.coords[0] > 58.0) {
      pushUnique(CITY_GEO_CATALOG.jonkoping);
    }
    stops.push(toGeo);
    return stops;
  }

  // Case 3: Continental Westbound (RO / HU -> AT / DE / NL / BE / FR / IT)
  const goingWest = toGeo.coords[1] < fromGeo.coords[1] - 2.2;
  const goingEast = toGeo.coords[1] > fromGeo.coords[1] + 2.2;

  if (goingWest) {
    if (fromGeo.country === 'RO') {
      // Southern RO (București, Pitești, Ploiești, Constanța, Craiova, Brașov) -> Sibiu -> Arad
      if (fromGeo.coords[0] < 46.25 && fromGeo.coords[1] > 22.5) {
        pushUnique(CITY_GEO_CATALOG.sibiu);
        pushUnique(CITY_GEO_CATALOG.arad);
      } else if (fromGeo.coords[1] > 22.8) {
        pushUnique(CITY_GEO_CATALOG.oradea);
      }
      pushUnique(CITY_GEO_CATALOG.budapesta);
    }
    if (
      (fromGeo.country === 'RO' || fromGeo.country === 'HU') &&
      toGeo.coords[1] < 16.0
    ) {
      if (toGeo.country === 'IT') {
        pushUnique(CITY_GEO_CATALOG.ljubljana);
      } else {
        pushUnique(CITY_GEO_CATALOG.viena);
      }
    }
    if (toGeo.coords[1] < 9.5 && toGeo.coords[0] >= 49.5) {
      pushUnique(CITY_GEO_CATALOG.nurnberg);
      pushUnique(CITY_GEO_CATALOG.frankfurt);
      if (toGeo.country === 'NL' || toGeo.country === 'BE' || toGeo.country === 'GB') {
        pushUnique(CITY_GEO_CATALOG.koln);
      }
    } else if (toGeo.coords[1] < 10.5 && toGeo.coords[0] >= 47.0 && toGeo.country !== 'IT') {
      pushUnique(CITY_GEO_CATALOG.munchen);
    }
  } else if (goingEast) {
    if (fromGeo.country === 'NL' || fromGeo.country === 'BE' || fromGeo.country === 'GB') {
      pushUnique(CITY_GEO_CATALOG.koln);
      pushUnique(CITY_GEO_CATALOG.frankfurt);
    }
    if (fromGeo.coords[1] < 12.5 && toGeo.coords[1] > 16.0) {
      pushUnique(CITY_GEO_CATALOG.nurnberg);
      pushUnique(CITY_GEO_CATALOG.viena);
    }
    if (toGeo.country === 'RO') {
      pushUnique(CITY_GEO_CATALOG.budapesta);
      if (toGeo.coords[0] < 46.25 && toGeo.coords[1] > 22.5) {
        pushUnique(CITY_GEO_CATALOG.arad);
        pushUnique(CITY_GEO_CATALOG.sibiu);
      } else if (toGeo.coords[1] > 22.8) {
        pushUnique(CITY_GEO_CATALOG.oradea);
      }
    }
  }

  stops.push(toGeo);
  return stops;
}

function interpolateDensePolyline(stops: CityGeoEntry[]): [number, number][] {
  if (stops.length < 2) return [stops[0]?.coords || [47.0722, 21.9217]];
  const coords: [number, number][] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i].coords;
    const b = stops[i + 1].coords;
    const segKm = haversineKm(a, b);
    const subSteps = Math.max(2, Math.min(10, Math.round(segKm / 65)));
    for (let s = 0; s < subSteps; s++) {
      const t = s / subSteps;
      coords.push([
        +(a[0] + (b[0] - a[0]) * t).toFixed(4),
        +(a[1] + (b[1] - a[1]) * t).toFixed(4),
      ]);
    }
  }
  coords.push(stops[stops.length - 1].coords);
  return coords;
}

function isCardAbsorbedByLiveCorridor(
  card: HourlyPlanningCard,
  trailers: TrailerUnit[]
): boolean {
  if (card.completed) return false;
  if ((card.weekOffset ?? 0) !== 0) return false;
  const tr = trailers.find((t) => t.id === card.trailerId);
  const baseRoute = CORRIDOR_ROUTES[card.trailerId];
  if (!tr || !baseRoute) return false;

  const { fromRaw, toRaw } = parseRouteEndpoints(card.routeLabel);
  const fromNorm = normalizePlaceKey(fromRaw);
  const toNorm = normalizePlaceKey(toRaw);
  if (!fromNorm || !toNorm) return false;

  const corridorNames = [
    ...baseRoute.checkpoints.map((cp) => normalizePlaceKey(cp.city.split(' (')[0])),
    ...tr.routeSummary.map((c) => normalizePlaceKey(c.split(' (')[0])),
  ];

  // Find earliest match for fromNorm and latest match for toNorm along baseRoute checkpoints
  const cpNorms = baseRoute.checkpoints.map((cp) =>
    normalizePlaceKey(cp.city.split(' (')[0])
  );
  let fromIdx = cpNorms.findIndex((n) => n === fromNorm || n.includes(fromNorm) || fromNorm.includes(n));
  let toIdx = -1;
  for (let i = cpNorms.length - 1; i >= 0; i--) {
    const n = cpNorms[i];
    if (n === toNorm || n.includes(toNorm) || toNorm.includes(n)) {
      toIdx = i;
      break;
    }
  }

  // Also check intermediate highway cities like Hamburg / München / Venlo / Suben / Köln
  if (fromIdx >= 0 && toIdx > fromIdx) {
    return true;
  }

  // Fallback check on routeSummary
  const sumNorms = tr.routeSummary.map((c) => normalizePlaceKey(c.split(' (')[0]));
  const sFrom = sumNorms.findIndex((n) => n === fromNorm);
  const sTo = sumNorms.lastIndexOf(toNorm);
  if (sFrom >= 0 && sTo > sFrom) return true;

  // Unused guard for corridorNames
  void corridorNames;
  return false;
}

function estimateTotalTransitHours(totalKm: number): number {
  const hgvMetrics = computeHgvRouteMetrics(totalKm, { isHgv: true });
  return Math.max(4, Math.ceil(hgvMetrics.totalElapsedHours + 2));
}

export function getPlanningCardLifecycle(
  card: HourlyPlanningCard,
  trailers: TrailerUnit[],
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): CardLifecycleInfo {
  const weekOffset = card.weekOffset ?? 0;
  const weekMeta = getPlanningWeekMeta(weekOffset, zdtNow);
  const dayMeta =
    weekMeta.days[Math.min(6, Math.max(0, card.dayIndex))] || weekMeta.days[0];
  const isoDate = card.isoDate || dayMeta.isoDate;
  const orderNum = getPlanningOrderNumber(card.hourSlot);
  const shortTimeBadge = `${dayMeta.short} · #${orderNum}`;
  const scheduleFullLabel = `${dayMeta.label} (${dayMeta.date}) · Ordinea #${orderNum}`;

  if (card.completed) {
    return {
      lifecycle: 'past',
      badgeLabel: 'Trecută',
      shortTimeBadge,
      scheduleFullLabel,
      isoDate,
      isAbsorbedInLiveCorridor: false,
      progressRatio: 1,
    };
  }

  const todayIso = zdtNow.toPlainDate().toString();
  const dateCmp = Temporal.PlainDate.compare(
    Temporal.PlainDate.from(isoDate),
    Temporal.PlainDate.from(todayIso)
  );
  if (dateCmp > 0) {
    return {
      lifecycle: 'planned',
      badgeLabel: 'Planificată',
      shortTimeBadge,
      scheduleFullLabel,
      isoDate,
      isAbsorbedInLiveCorridor: false,
      progressRatio: 0,
    };
  }

  const absorbed = isCardAbsorbedByLiveCorridor(card, trailers);
  if (absorbed) {
    const baseDef = CORRIDOR_ROUTES[card.trailerId];
    const ratio = baseDef
      ? Math.min(0.95, Math.max(0.1, baseDef.drivenKm / Math.max(1, baseDef.totalTechKm)))
      : 0.5;
    return {
      lifecycle: 'in_transit',
      badgeLabel: 'Activă',
      shortTimeBadge,
      scheduleFullLabel,
      isoDate,
      isAbsorbedInLiveCorridor: true,
      progressRatio: ratio,
    };
  }

  // Any uncompleted order scheduled on TODAY (`AZI`) is active regardless of daily position `#1..#11`
  if (dateCmp === 0) {
    return {
      lifecycle: 'in_transit',
      badgeLabel: 'Activă',
      shortTimeBadge,
      scheduleFullLabel,
      isoDate,
      isAbsorbedInLiveCorridor: false,
      progressRatio: 0.22,
    };
  }

  // Standalone trip whose departure slot is in the past: check if still in transit or finished
  const { fromRaw, toRaw } = parseRouteEndpoints(card.routeLabel);
  const fromGeo = resolveCityGeo(fromRaw);
  const toGeo = resolveCityGeo(toRaw);
  const totalKm = parseKmFromLabel(
    card.kmDist,
    haversineKm(fromGeo.coords, toGeo.coords)
  );
  const transitHours = estimateTotalTransitHours(totalKm);

  const [hhRaw, mmRaw] = (card.hourSlot || '08:00').split(':');
  const hh = parseInt(hhRaw, 10);
  const mm = parseInt(mmRaw, 10);
  const startZdt = Temporal.PlainDate.from(isoDate).toZonedDateTime({
    timeZone: ROMANIA_TIME_ZONE,
    plainTime: new Temporal.PlainTime(
      Number.isFinite(hh) ? hh : 8,
      Number.isFinite(mm) ? mm : 0
    ),
  });
  const elapsedMinutes = startZdt.until(zdtNow, { largestUnit: 'minute' }).minutes;
  const elapsedHours = elapsedMinutes / 60;

  if (elapsedHours <= transitHours) {
    const ratio = Math.min(0.94, Math.max(0.08, elapsedHours / transitHours));
    return {
      lifecycle: 'in_transit',
      badgeLabel: 'Activă',
      shortTimeBadge,
      scheduleFullLabel,
      isoDate,
      isAbsorbedInLiveCorridor: false,
      progressRatio: ratio,
    };
  }

  return {
    lifecycle: 'past',
    badgeLabel: 'Trecută',
    shortTimeBadge,
    scheduleFullLabel,
    isoDate,
    isAbsorbedInLiveCorridor: false,
    progressRatio: 1,
  };
}

function buildDynamicMapTripFromCard(
  card: HourlyPlanningCard,
  trailers: TrailerUnit[],
  lifecycleInfo: CardLifecycleInfo,
  paletteIdx: number
): MapTripItem {
  const { fromRaw, toRaw } = parseRouteEndpoints(card.routeLabel);
  const resolvedFrom = resolveCityGeo(fromRaw);
  const resolvedTo = resolveCityGeo(toRaw);
  const fromGeo: CityGeoEntry = card.fromCoords
    ? {
        coords: card.fromCoords,
        country: inferCountryFromCoords(card.fromCoords),
        display: resolvedFrom.display,
      }
    : resolvedFrom;
  const toGeo: CityGeoEntry = card.toCoords
    ? {
        coords: card.toCoords,
        country: inferCountryFromCoords(card.toCoords),
        display: resolvedTo.display,
      }
    : resolvedTo;
  const corridorStops = buildTerrestrialCorridorStops(fromGeo, toGeo);
  const denseCoordinates = interpolateDensePolyline(corridorStops);
  const airKm = haversineKm(fromGeo.coords, toGeo.coords);
  const totalTechKm = parseKmFromLabel(card.kmDist, airKm);

  const ratio = lifecycleInfo.progressRatio;
  const drivenKm =
    lifecycleInfo.lifecycle === 'past'
      ? totalTechKm
      : lifecycleInfo.lifecycle === 'planned'
        ? 0
        : Math.round(totalTechKm * ratio);

  const knownTrailer = trailers.find((t) => t.id === card.trailerId);
  const remainingKm = Math.max(0, totalTechKm - drivenKm);
  const hgvMetrics = computeHgvRouteMetrics(remainingKm, {
    isHgv: (knownTrailer?.totalLdm ?? 13.6) > 6.2,
    isDoubleCrew: Boolean(knownTrailer?.isDoubleCrew),
  });
  const estDriveHours =
    lifecycleInfo.lifecycle === 'past' ? 'Finalizată' : hgvMetrics.compactDriveLabel;

  const tractorPlate =
    card.tractorPlate ||
    (knownTrailer ? knownTrailer.tractorId.split(' (')[0] : card.trailerId);
  const driverDisplay =
    card.driverName && card.driverName !== '—'
      ? card.driverName
      : knownTrailer?.driver1.name || 'Alocat în calendar';

  // Pick major checkpoints (up to 4: Start, 1-2 key intermediate hubs, Destination)
  const selectedStops: CityGeoEntry[] =
    corridorStops.length <= 4
      ? corridorStops
      : [
          corridorStops[0],
          corridorStops[Math.floor(corridorStops.length / 3)],
          corridorStops[Math.floor((corridorStops.length * 2) / 3)],
          corridorStops[corridorStops.length - 1],
        ];

  const freeAfterStart = Math.max(0, +(13.6 - card.ldm).toFixed(1));
  const checkpoints: RouteCheckpoint[] = selectedStops.map((stop, idx) => {
    const stopRatio =
      selectedStops.length <= 1 ? 1 : idx / (selectedStops.length - 1);
    const cumKm = Math.round(totalTechKm * stopRatio);
    const prevKm =
      idx === 0
        ? 0
        : Math.round(totalTechKm * ((idx - 1) / (selectedStops.length - 1)));
    const deltaKm = Math.max(0, cumKm - prevKm);

    const isCompleted =
      lifecycleInfo.lifecycle === 'past'
        ? true
        : lifecycleInfo.lifecycle === 'planned'
          ? false
          : stopRatio <= ratio;
    const isCurrent =
      lifecycleInfo.lifecycle === 'planned'
        ? idx === 0
        : lifecycleInfo.lifecycle === 'in_transit' &&
          !isCompleted &&
          (idx === 0 ||
            (idx - 1) / Math.max(1, selectedStops.length - 1) <= ratio);

    const etaText =
      lifecycleInfo.lifecycle === 'past'
        ? idx === 0
          ? `Plecat ${lifecycleInfo.shortTimeBadge}`
          : idx === selectedStops.length - 1
            ? 'Livrat ✓'
            : 'Trecut ✓'
        : lifecycleInfo.lifecycle === 'planned'
          ? idx === 0
            ? `Start ${lifecycleInfo.shortTimeBadge}`
            : idx === selectedStops.length - 1
              ? `Destinație (${card.ldm.toFixed(1)} LDM)`
              : 'Tranzit planificat'
          : idx === 0
            ? `Plecat ${lifecycleInfo.shortTimeBadge}`
            : isCompleted
              ? 'Trecut ✓'
              : 'În curs';

    const weatherType: AppleWeatherType = 'partly-cloudy';
    const tempC = 10;

    return {
      city: stop.display,
      country: stop.country,
      coords: stop.coords,
      completed: isCompleted,
      current: isCurrent,
      eta: etaText,
      techKm:
        idx === 0
          ? '0 km (Start)'
          : `${cumKm.toLocaleString('ro-RO')} km (+${deltaKm} km)`,
      weatherType,
      tempC,
      weatherDesc: 'Traseu HGV',
      freeLdmAfter:
        idx === selectedStops.length - 1 ? 13.6 : freeAfterStart,
    };
  });

  // Compute truck pin position
  const coordIndex =
    lifecycleInfo.lifecycle === 'past'
      ? denseCoordinates.length - 1
      : lifecycleInfo.lifecycle === 'planned'
        ? 0
        : Math.min(
            denseCoordinates.length - 1,
            Math.max(0, Math.round((denseCoordinates.length - 1) * ratio))
          );
  const pinCoords = denseCoordinates[coordIndex] || fromGeo.coords;

  const palette =
    lifecycleInfo.lifecycle === 'past'
      ? { color: '#64748b', glow: 'rgba(100, 116, 139, 0.30)' }
      : DYNAMIC_TRIP_PALETTE[paletteIdx % DYNAMIC_TRIP_PALETTE.length];

  const statusText: TrailerUnit['status'] =
    lifecycleInfo.lifecycle === 'past'
      ? 'Disponibil curând'
      : lifecycleInfo.lifecycle === 'planned'
        ? 'Planificat'
        : 'În tranzit';

  const syntheticTrailer: TrailerUnit = {
    ...(knownTrailer || trailers[0]),
    id: card.trailerId,
    tractorId: tractorPlate || card.trailerId,
    driver1: {
      ...(knownTrailer?.driver1 || trailers[0].driver1),
      name: driverDisplay,
    },
    status: statusText,
    corridorCode: `${fromGeo.country} → ${toGeo.country}`,
    routeSummary: selectedStops.map((s) => s.display),
    currentLocation: {
      city:
        lifecycleInfo.lifecycle === 'past'
          ? `${toGeo.display} (${toGeo.country}) · Finalizată`
          : lifecycleInfo.lifecycle === 'planned'
            ? `${fromGeo.display} (${fromGeo.country}) · Start ${lifecycleInfo.shortTimeBadge}`
            : `${selectedStops[Math.min(selectedStops.length - 1, Math.floor(ratio * selectedStops.length))]?.display || fromGeo.display}`,
      country:
        lifecycleInfo.lifecycle === 'past' ? toGeo.country : fromGeo.country,
      lat: pinCoords[0],
      lng: pinCoords[1],
      speedKmh: lifecycleInfo.lifecycle === 'in_transit' ? 82 : 0,
      cargoTrackLastPing:
        lifecycleInfo.lifecycle === 'past'
          ? 'Cursă încheiată'
          : lifecycleInfo.lifecycle === 'planned'
            ? `Programată ${lifecycleInfo.shortTimeBadge}`
            : 'În tranzit',
    },
    totalLdm: knownTrailer?.totalLdm || 13.6,
    occupiedLdm: card.ldm,
    freeLdm: Math.max(0, +((knownTrailer?.totalLdm || 13.6) - card.ldm).toFixed(1)),
    softReservedLdm: 0,
    zone1Temp: card.tempCelsius < 0 ? card.tempCelsius : knownTrailer?.zone1Temp ?? -18,
    zone2Temp: card.tempCelsius >= 0 ? card.tempCelsius : knownTrailer?.zone2Temp ?? 4,
    currentWeightTons: card.weightTons,
  };

  const shortNum = card.id.replace(/[^0-9]/g, '').slice(-4) || '101';
  const tripCode =
    lifecycleInfo.lifecycle === 'past'
      ? `FIN-${shortNum}`
      : lifecycleInfo.lifecycle === 'planned'
        ? `PLN-${shortNum}`
        : `CRS-${shortNum}`;

  const routeDef: RouteDefinition = {
    trailerId: card.trailerId,
    tripCode,
    highwayCorridor: `${card.clientName} · ${corridorStops.map((s) => s.display).join(' → ')}`,
    color: palette.color,
    glowColor: palette.glow,
    totalTechKm,
    drivenKm,
    estDriveHours,
    transitWindow: lifecycleInfo.scheduleFullLabel,
    coordinates: denseCoordinates,
    checkpoints,
  };

  const badgeLabel =
    lifecycleInfo.lifecycle === 'past'
      ? `Trecută · ${lifecycleInfo.shortTimeBadge}`
      : lifecycleInfo.lifecycle === 'planned'
        ? `Planificată · ${lifecycleInfo.shortTimeBadge}`
        : `În tranzit · ${lifecycleInfo.shortTimeBadge}`;

  return {
    mapId: `card:${card.id}`,
    lifecycle: lifecycleInfo.lifecycle,
    badgeLabel,
    shortTimeBadge: lifecycleInfo.shortTimeBadge,
    scheduleFullLabel: lifecycleInfo.scheduleFullLabel,
    clientLabel: card.clientName,
    routeSummaryText: `${fromGeo.display} → ${toGeo.display}`,
    trailer: syntheticTrailer,
    routeDef,
    sourceCardId: card.id,
    linkedCardCount: 1,
  };
}

/**
 * Builds the exact single-card MapTripItem used when inspecting ANY card in Planning7DaysView's detail modal.
 */
export function buildSingleCardMapTrip(
  card: HourlyPlanningCard,
  trailers: TrailerUnit[],
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): MapTripItem {
  const lifecycleInfo = getPlanningCardLifecycle(card, trailers, zdtNow);
  // Even if absorbed in a live corridor, if the card's own endpoints differ from the full corridor
  // (or if it's a custom/future/past route like București -> Rotterdam or Stockholm -> Oradea),
  // render the card's exact route!
  return buildDynamicMapTripFromCard(card, trailers, lifecycleInfo, 0);
}

/**
 * Synchronizes `trailers` + `planningCards` into cleanly separated `activeTrips` and `pastTrips`
 * for Control Center (both Map and List).
 */
export function buildControlCenterMapTrips(
  trailers: TrailerUnit[],
  planningCards: HourlyPlanningCard[],
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): {
  activeTrips: MapTripItem[];
  pastTrips: MapTripItem[];
} {
  const activeTrips: MapTripItem[] = [];
  const pastTrips: MapTripItem[] = [];

  // 1. Evaluate all planning cards first so we know which ones are absorbed into live corridors vs standalone
  const absorbedByTrailer = new Map<string, HourlyPlanningCard[]>();
  const standaloneActiveCards: {
    card: HourlyPlanningCard;
    info: CardLifecycleInfo;
  }[] = [];
  const pastCards: {
    card: HourlyPlanningCard;
    info: CardLifecycleInfo;
  }[] = [];

  for (const card of planningCards) {
    const info = getPlanningCardLifecycle(card, trailers, zdtNow);
    if (info.lifecycle === 'past') {
      pastCards.push({ card, info });
    } else if (info.isAbsorbedInLiveCorridor) {
      const arr = absorbedByTrailer.get(card.trailerId) || [];
      arr.push(card);
      absorbedByTrailer.set(card.trailerId, arr);
    } else {
      standaloneActiveCards.push({ card, info });
    }
  }

  // 2. Add the 7 live base corridors (enriched with their active groupage cards from Planning)
  for (const trailer of trailers) {
    const baseRoute = CORRIDOR_ROUTES[trailer.id];
    if (!baseRoute) continue;
    const linked = absorbedByTrailer.get(trailer.id) || [];
    const clientSummary =
      linked.length > 0
        ? linked.map((c) => c.clientName).join(' · ')
        : undefined;
    const fromCity = trailer.routeSummary[0] || baseRoute.checkpoints[0]?.city || '';
    const toCity =
      trailer.routeSummary[trailer.routeSummary.length - 1] ||
      baseRoute.checkpoints[baseRoute.checkpoints.length - 1]?.city ||
      '';

    activeTrips.push({
      mapId: trailer.id,
      lifecycle: 'in_transit',
      badgeLabel: 'În tranzit',
      shortTimeBadge: 'LIVE',
      scheduleFullLabel: baseRoute.transitWindow,
      clientLabel: clientSummary,
      routeSummaryText: `${fromCity} → ${toCity}`,
      trailer,
      routeDef: baseRoute,
      linkedCardCount: linked.length,
    });
  }

  // 3. Add all standalone active & scheduled upcoming trips from Planning (in chronological order)
  standaloneActiveCards.sort((a, b) => {
    const dCmp = a.info.isoDate.localeCompare(b.info.isoDate);
    if (dCmp !== 0) return dCmp;
    return a.card.hourSlot.localeCompare(b.card.hourSlot);
  });

  standaloneActiveCards.forEach(({ card, info }, idx) => {
    activeTrips.push(buildDynamicMapTripFromCard(card, trailers, info, idx));
  });

  // 4. Add all past / completed trips (most recent first so latest completed trips are on top)
  pastCards.sort((a, b) => {
    const dCmp = b.info.isoDate.localeCompare(a.info.isoDate);
    if (dCmp !== 0) return dCmp;
    return b.card.hourSlot.localeCompare(a.card.hourSlot);
  });

  pastCards.forEach(({ card, info }, idx) => {
    pastTrips.push(buildDynamicMapTripFromCard(card, trailers, info, idx));
  });

  return { activeTrips, pastTrips };
}
