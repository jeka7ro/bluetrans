import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import {
  CheckCircle2,
  CircleDot,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  Repeat,
  ThermometerSnowflake,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { TrailerUnit, formatCountryBadge } from '../data/mockData';
import { REAL_TRUCK_HIGHWAY_GEOMETRIES } from '../data/highwayGeometries';

interface EuropeLiveMapProps {
  trailers: TrailerUnit[];
  onSelectTrailer?: (trailerId: string) => void;
  onNavigateSwap?: () => void;
  heightClass?: string;
  singleTripMode?: boolean;
}

type AppleWeatherType = 'sun' | 'partly-cloudy' | 'rain' | 'snow' | 'wind';

interface RouteDefinition {
  trailerId: string;
  tripCode: string;
  highwayCorridor: string;
  color: string;
  glowColor: string;
  totalTechKm: number;
  drivenKm: number;
  estDriveHours: string;
  transitWindow: string;
  // Dense real European HGV motorway waypoints (M35/M3/M1/A4/A1/A8/A3/A61/A67/A15 & Storebælt/Øresund Bridges)
  coordinates: [number, number][];
  checkpoints: {
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
  }[];
}

const CORRIDOR_ROUTES: Record<string, RouteDefinition> = {
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
      [47.1310, 21.7950], // Borș II / A3
      [47.5316, 21.6273], // Debrecen (M35)
      [47.7850, 21.1200], // Polgár / M3 Junction
      [47.7600, 20.3500], // Füzesabony (M3)
      [47.6500, 19.6000], // Hatvan (M3)
      [47.4100, 19.1500], // Budapesta Sud Ring (M0)
      [47.4600, 18.8800], // Biatorbágy (M1)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom / Nickelsdorf (M1/A4)
      [48.0200, 16.7800], // Bruck an der Leitha (A4)
      [48.1400, 16.4200], // Viena Schwechat / S1
      [48.2082, 16.3738], // Viena (AT)
      [48.1950, 15.6300], // St. Pölten (A1)
      [48.2100, 14.8700], // Amstetten (A1)
      [48.2600, 14.2900], // Linz / Ansfelden (A1)
      [48.1700, 13.9800], // Wels (A8)
      [48.4064, 13.4314], // Suben / Passau (A8/A3)
      [48.8300, 12.9600], // Deggendorf (A3)
      [48.8800, 12.5700], // Straubing (A3)
      [48.9900, 12.1000], // Regensburg (A3)
      [49.2789, 11.4611], // Neumarkt in der Oberpfalz (A3)
      [49.4521, 11.0767], // Nürnberg (A3)
      [49.5800, 10.8600], // Erlangen (A3)
      [49.7600, 9.9500],  // Würzburg (A3)
      [49.9800, 9.1500],  // Aschaffenburg (A3)
      [50.0500, 8.5800],  // Frankfurt Airport / Kreuz (A3)
      [50.3800, 8.0600],  // Limburg an der Lahn (A3)
      [50.4500, 7.8200],  // Montabaur (A3)
      [50.7500, 7.2500],  // Siegburg / Bonn (A3)
      [50.9375, 6.9603],  // Köln Ring (A3/A4)
      [51.1800, 6.4400],  // Mönchengladbach (A61)
      [51.3704, 6.1724],  // Venlo Border (A61/A67)
      [51.4100, 5.4800],  // Eindhoven Ring (A67/A2)
      [51.5500, 5.0800],  // Tilburg (A58)
      [51.5800, 4.7700],  // Breda (A16)
      [51.8000, 4.6600],  // Dordrecht (A16)
      [51.9244, 4.4777],  // Rotterdam Port (A15)
    ],
    checkpoints: [
      { city: 'Oradea', country: 'RO', coords: [47.0722, 21.9217], completed: true, eta: 'Plecat 06:00 (M35/M3)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 11, weatherDesc: 'Senin · Uscat', freeLdmAfter: 1.2 },
      { city: 'Budapesta', country: 'HU', coords: [47.4100, 19.1500], completed: true, eta: 'Trecut 10:15 (M0/M1)', techKm: '295 km (+295 km)', weatherType: 'partly-cloudy', tempC: 10, weatherDesc: 'Parțial noros', freeLdmAfter: 1.2 },
      { city: 'Viena', country: 'AT', coords: [48.2082, 16.3738], completed: false, current: true, eta: 'Azi 14:30 (-4.2 LDM)', techKm: '540 km (+245 km)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Parțial noros', freeLdmAfter: 5.4 },
      { city: 'Köln', country: 'DE', coords: [50.9375, 6.9603], completed: false, eta: 'Mâine 08:30 (-3.0 LDM)', techKm: '1.310 km (+770 km)', weatherType: 'rain', tempC: 7, weatherDesc: 'Ploaie ușoară', freeLdmAfter: 8.4 },
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
      [47.3200, 19.5500], // Monor (M4)
      [47.4100, 19.1500], // Budapesta (M0)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom (M1/A4)
      [48.2082, 16.3738], // Viena (A1)
      [48.2600, 14.2900], // Linz (A1)
      [47.8095, 13.0550], // Salzburg (A1/A8)
      [47.8500, 12.1200], // Rosenheim (A8)
      [48.1351, 11.5820], // München (A99/A8)
      [48.3705, 10.8978], // Augsburg (A8)
      [48.4011, 9.9876],  // Ulm (A8)
      [48.7758, 9.1829],  // Stuttgart (A8/A81)
      [49.0069, 8.4037],  // Karlsruhe (A8/A5)
      [49.4875, 8.4660],  // Mannheim / Walldorf (A5/A6)
      [50.1109, 8.6821],  // Frankfurt am Main (A5/A3)
      [50.4500, 7.8200],  // Montabaur (A3)
      [50.9375, 6.9603],  // Köln (A3)
      [51.4500, 6.7500],  // Duisburg / Oberhausen (A3)
      [51.8300, 6.1500],  // Emmerich / Arnhem Border (A3/A12)
      [52.0907, 5.1214],  // Utrecht (A12/A27)
      [52.3508, 5.2647],  // Almere (A27/A6)
    ],
    checkpoints: [
      { city: 'Szolnok', country: 'HU', coords: [47.1621, 20.1825], completed: true, eta: 'Plecat 04:30 (M4/M1)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 10, weatherDesc: 'Senin · Uscat', freeLdmAfter: 0.0 },
      { city: 'München', country: 'DE', coords: [48.1351, 11.5820], completed: false, current: true, eta: 'Azi 16:00 (-2.2 LDM)', techKm: '680 km (+680 km)', weatherType: 'partly-cloudy', tempC: 6, weatherDesc: 'Parțial noros', freeLdmAfter: 2.2 },
      { city: 'Frankfurt', country: 'DE', coords: [50.1109, 8.6821], completed: false, eta: 'Mâine 07:00 (-4.4 LDM)', techKm: '1.070 km (+390 km)', weatherType: 'rain', tempC: 7, weatherDesc: 'Averse A3/A5', freeLdmAfter: 6.6 },
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
      [51.9244, 4.4777],  // Rotterdam
      [52.0300, 4.7000],  // Gouda (A12)
      [52.0907, 5.1214],  // Utrecht (A12/A28)
      [52.1500, 5.3800],  // Amersfoort (A1)
      [52.2100, 5.9600],  // Apeldoorn (A1)
      [52.2600, 6.7900],  // Hengelo (A1)
      [52.3100, 7.0400],  // Bad Bentheim Border (A1/A30)
      [52.2799, 8.0472],  // Osnabrück (A30/A1)
      [53.0793, 8.8017],  // Bremen (A1)
      [53.5511, 9.9937],  // Hamburg Elbtunnel (A1/A7)
      [54.0700, 9.9800],  // Neumünster (A7)
      [54.3000, 9.6600],  // Rendsburg (A7)
      [54.7800, 9.4300],  // Flensburg / Padborg Border (A7/E45)
      [55.0400, 9.3800],  // Aabenraa (E45)
      [55.4904, 9.4722],  // Kolding (E45/E20)
      [55.5500, 9.7500],  // Fredericia / Little Belt Bridge (E20)
      [55.3959, 10.3883], // Odense (E20)
      [55.3100, 10.7900], // Nyborg — Podul Storebælt Vest (E20)
      [55.3400, 11.1300], // Korsør — Podul Storebælt Est (E20)
      [55.4400, 11.7900], // Ringsted (E20)
      [55.4900, 12.1800], // Køge (E20)
      [55.6300, 12.5800], // Copenhaga Sud / Kastrup (E20)
      [55.5700, 12.8900], // Podul Øresund (E20 — Traseu Rutier Camioane)
      [55.6050, 13.0038], // Malmö Ring (E20/E6)
      [55.8500, 12.8600], // Landskrona (E6)
      [56.0465, 12.6945], // Helsingborg (E6/E4)
      [56.6700, 13.5000], // Ljungby (E4)
      [57.1800, 14.0400], // Värnamo (E4)
      [57.7826, 14.1618], // Jönköping (E4)
      [58.4108, 15.6214], // Linköping (E4)
      [58.5877, 16.1924], // Norrköping (E4)
      [58.7500, 17.0000], // Nyköping (E4)
      [59.1955, 17.6253], // Södertälje (E4)
      [59.3293, 18.0686], // Stockholm (E4)
    ],
    checkpoints: [
      { city: 'Rotterdam', country: 'NL', coords: [51.9244, 4.4777], completed: true, eta: 'Plecat 05:00 (A12/A1)', techKm: '0 km (Start)', weatherType: 'rain', tempC: 9, weatherDesc: 'Ploaie ușoară', freeLdmAfter: 4.4 },
      { city: 'Hamburg', country: 'DE', coords: [53.5511, 9.9937], completed: false, current: true, eta: 'Azi 13:30 (-2.4 LDM)', techKm: '490 km (+490 km)', weatherType: 'partly-cloudy', tempC: 7, weatherDesc: 'Parțial noros', freeLdmAfter: 6.8 },
      { city: 'Malmö (Pod Øresund)', country: 'SE', coords: [55.6050, 13.0038], completed: false, eta: 'Mâine 06:30 (-2.8 LDM)', techKm: '880 km (+390 km)', weatherType: 'wind', tempC: 4, weatherDesc: 'Vânt 42 km/h', freeLdmAfter: 9.6 },
      { city: 'Stockholm', country: 'SE', coords: [59.3293, 18.0686], completed: false, eta: 'Mâine 16:30 (E4 Final)', techKm: '1.460 km (+580 km)', weatherType: 'snow', tempC: 1, weatherDesc: 'Lapoviță · E4', freeLdmAfter: 13.6 },
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
      [47.7850, 21.1200], // Polgár (M3)
      [47.4100, 19.1500], // Budapesta (M0)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom (M1/A4)
      [48.2082, 16.3738], // Viena (A1)
      [48.2600, 14.2900], // Linz (A1)
      [48.4064, 13.4314], // Suben / Passau (A8/A3)
      [48.5500, 12.1500], // Landshut / A92
      [48.1351, 11.5820], // München (A99/A8)
      [48.3705, 10.8978], // Augsburg (A8)
      [48.4011, 9.9876],  // Ulm (A8)
      [48.7758, 9.1829],  // Stuttgart (A8)
    ],
    checkpoints: [
      { city: 'Oradea', country: 'RO', coords: [47.0722, 21.9217], completed: true, eta: 'Plecat Ieri (M35/M3)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 12, weatherDesc: 'Senin · Uscat', freeLdmAfter: 1.2 },
      { city: 'Suben', country: 'AT', coords: [48.4064, 13.4314], completed: true, eta: 'Trecut 09:00 (A8)', techKm: '690 km (+690 km)', weatherType: 'partly-cloudy', tempC: 8, weatherDesc: 'Parțial noros', freeLdmAfter: 1.2 },
      { city: 'München', country: 'DE', coords: [48.1351, 11.5820], completed: false, current: true, eta: 'La descărcare (-2.8 LDM)', techKm: '860 km (+170 km)', weatherType: 'partly-cloudy', tempC: 6, weatherDesc: 'Nori trecători', freeLdmAfter: 4.0 },
      { city: 'Stuttgart', country: 'DE', coords: [48.7758, 9.1829], completed: false, eta: 'Azi 19:30 (A8 Final)', techKm: '1.090 km (+230 km)', weatherType: 'rain', tempC: 7, weatherDesc: 'Burniță A8', freeLdmAfter: 13.6 },
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
      [51.9244, 4.4777],  // Rotterdam
      [51.8000, 4.6600],  // Dordrecht (A16)
      [51.5800, 4.7700],  // Breda (A58)
      [51.4100, 5.4800],  // Eindhoven (A67)
      [51.3704, 6.1724],  // Venlo (A67/A40)
      [51.4500, 6.7500],  // Duisburg (A40/A2)
      [51.9600, 7.6200],  // Münster (A1)
      [52.2799, 8.0472],  // Osnabrück (A1)
      [53.0793, 8.8017],  // Bremen (A1)
      [53.5511, 9.9937],  // Hamburg (A7)
      [54.7800, 9.4300],  // Flensburg (A7)
      [55.4904, 9.4722],  // Kolding (E45)
      [55.3959, 10.3883], // Odense (E20)
      [55.3100, 10.7900], // Pod Storebælt Vest
      [55.3400, 11.1300], // Pod Storebælt Est
      [55.6300, 12.5800], // Copenhaga (E20)
      [55.5700, 12.8900], // Pod Øresund (E20)
      [55.6050, 13.0038], // Malmö (E6)
      [56.0465, 12.6945], // Helsingborg (E6)
      [56.6700, 12.8500], // Halmstad (E6)
      [57.1000, 12.2500], // Varberg (E6)
      [57.7089, 11.9746], // Göteborg (E6)
    ],
    checkpoints: [
      { city: 'Rotterdam', country: 'NL', coords: [51.9244, 4.4777], completed: true, eta: 'Plecat 07:30 (A15/A67)', techKm: '0 km (Start)', weatherType: 'wind', tempC: 9, weatherDesc: 'Vânt moderat', freeLdmAfter: 5.2 },
      { city: 'Venlo', country: 'NL', coords: [51.3704, 6.1724], completed: false, current: true, eta: 'Încărcare grupaj (A67)', techKm: '165 km (+165 km)', weatherType: 'partly-cloudy', tempC: 8, weatherDesc: 'Parțial noros', freeLdmAfter: 5.2 },
      { city: 'Kolding', country: 'DK', coords: [55.4904, 9.4722], completed: false, eta: 'Mâine 05:00 (-3.2 LDM)', techKm: '690 km (+525 km)', weatherType: 'rain', tempC: 5, weatherDesc: 'Ploaie E45', freeLdmAfter: 8.4 },
      { city: 'Göteborg', country: 'SE', coords: [57.7089, 11.9746], completed: false, eta: 'Mâine 14:00 (E6 Final)', techKm: '1.180 km (+490 km)', weatherType: 'snow', tempC: 2, weatherDesc: 'Lapoviță ușoară', freeLdmAfter: 13.6 },
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
      [47.1310, 21.7950], // Borș II / A3
      [47.5316, 21.6273], // Debrecen (M35)
      [47.7850, 21.1200], // Polgár / M3 Junction
      [47.7600, 20.3500], // Füzesabony (M3)
      [47.6500, 19.6000], // Hatvan (M3)
      [47.4100, 19.1500], // Budapesta Sud Ring (M0)
      [47.4600, 18.8800], // Biatorbágy (M1)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.9144, 17.1528], // Hegyeshalom / Nickelsdorf (M1/A4)
      [48.0200, 16.7800], // Bruck an der Leitha (A4)
      [48.1400, 16.4200], // Viena Schwechat / S1
      [48.2082, 16.3738], // Viena (AT)
    ],
    checkpoints: [
      { city: 'Oradea', country: 'RO', coords: [47.0722, 21.9217], completed: true, eta: 'Plecat 07:00 (Express)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 11, weatherDesc: 'Senin · Uscat', freeLdmAfter: 0.8 },
      { city: 'Budapesta', country: 'HU', coords: [47.4100, 19.1500], completed: true, eta: 'Trecut 10:45 (M0)', techKm: '295 km (+295 km)', weatherType: 'partly-cloudy', tempC: 10, weatherDesc: 'Parțial noros', freeLdmAfter: 0.8 },
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
      [46.2530, 20.1414], // Szeged (M5)
      [46.7100, 19.8400], // Kiskunfélegyháza (M5)
      [46.9000, 19.6900], // Kecskemét (M5)
      [47.4100, 19.1500], // Budapesta Ring (M0)
      [47.5692, 18.4048], // Tatabánya (M1)
      [47.6875, 17.6504], // Győr (M1)
      [47.8600, 17.2700], // Mosonmagyaróvár (M1/M15)
      [48.0100, 17.2000], // Rajka / Čunovo (M15/D2)
      [48.1486, 17.1077], // Bratislava (D2)
      [48.4300, 17.0200], // Malacky (D2)
      [48.7200, 16.9400], // Kúty / Břeclav (D2)
      [48.9400, 16.7400], // Hustopeče (D2)
      [49.1951, 16.6068], // Brno (D2/D1)
      [48.7500, 16.6300], // Mikulov / Poysdorf (B7/A5)
      [48.5700, 16.5700], // Mistelbach (A5)
      [48.2082, 16.3738], // Viena (A5)
    ],
    checkpoints: [
      { city: 'Szeged', country: 'HU', coords: [46.2530, 20.1414], completed: true, eta: 'Plecat 06:30 (M5)', techKm: '0 km (Start)', weatherType: 'sun', tempC: 12, weatherDesc: 'Senin · Uscat', freeLdmAfter: 1.4 },
      { city: 'Bratislava', country: 'SK', coords: [48.1486, 17.1077], completed: false, current: true, eta: 'Azi 14:00 (-2.0 LDM)', techKm: '365 km (+365 km)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Parțial noros', freeLdmAfter: 3.4 },
      { city: 'Viena', country: 'AT', coords: [48.2082, 16.3738], completed: false, eta: 'Azi 18:00 (Final 7.5T)', techKm: '480 km (+115 km)', weatherType: 'partly-cloudy', tempC: 9, weatherDesc: 'Senin / Nori', freeLdmAfter: 6.2 },
    ],
  },
};

// Restul capetelor tractor reale din evidența flotei (Google Sheet).
// ATENȚIE: pozițiile sunt de TEST (mock) — se înlocuiesc cu GPS real când e conectat furnizorul.
const MOCK_FLEET_POSITIONS: { plate: string; place: string; coords: [number, number] }[] = [
  { plate: 'BH 50 STS', place: 'Oradea (bază)', coords: [47.075, 21.93] },
  { plate: 'IF 74 STS', place: 'Szolnok (HU)', coords: [47.1621, 20.1825] },
  { plate: 'BH 49 STS', place: 'Budapesta M0 (HU)', coords: [47.42, 19.15] },
  { plate: 'BH 12 STS', place: 'Arad (RO)', coords: [46.1866, 21.3123] },
  { plate: 'BH 30 STS', place: 'Győr (HU)', coords: [47.6875, 17.6504] },
  { plate: 'BH 72 STS', place: 'Salzburg (AT)', coords: [47.8095, 13.055] },
  { plate: 'BH 81 STS', place: 'München (DE)', coords: [48.1351, 11.582] },
  { plate: 'BH 07 XTS', place: 'Stuttgart (DE)', coords: [48.7758, 9.1829] },
  { plate: 'IF 12 STS', place: 'Frankfurt (DE)', coords: [50.1109, 8.6821] },
  { plate: 'IF 20 STS', place: 'Venlo (NL)', coords: [51.3704, 6.1724] },
  { plate: 'IF 30 BTS', place: 'Hamburg (DE)', coords: [53.5511, 9.9937] },
  { plate: 'BH 41 STS', place: 'Cluj-Napoca (RO)', coords: [46.7712, 23.6236] },
  { plate: 'B 166 STS', place: 'București (RO)', coords: [44.4268, 26.1025] },
];

const SWAP_HUBS = [
  {
    id: 'swap-1',
    name: 'Autohof Hegyeshalom (M1/A4)',
    coords: [47.9144, 17.1528] as [number, number],
    desc: 'SWAP-01: BH 46 STS ↔ B 506 STS (Sync 7 min)',
  },
  {
    id: 'swap-2',
    name: 'Autohof Neumarkt (A3 DE)',
    coords: [49.2789, 11.4611] as [number, number],
    desc: 'SWAP-02: Releu Echipaj 2 Șoferi pt. BH 69 STS',
  },
  {
    id: 'swap-3',
    name: 'Greenport Venlo (A67 NL/DE)',
    coords: [51.385, 6.145] as [number, number],
    desc: 'SWAP-03: Drop & Hook eliberare anticipată BH 91 STS',
  },
];

// Pre-loaded 560-point OSRM highway geometries for 100% terrestrial HGV truck routes (zero aerial lines)
const osrmRoadGeometryCache: Record<string, [number, number][]> = {
  ...REAL_TRUCK_HIGHWAY_GEOMETRIES,
};

export const EuropeLiveMap: React.FC<EuropeLiveMapProps> = ({
  trailers,
  onSelectTrailer,
  onNavigateSwap,
  heightClass = 'h-[360px] sm:h-[420px]',
  singleTripMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const isSingle = singleTripMode || trailers.length === 1;
  const firstTrailerId = trailers[0]?.id || 'BH 67 STS';

  const [focusedTrailerId, setFocusedTrailerId] = useState<string>(
    isSingle ? firstTrailerId : 'ALL'
  );
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>(
    isSingle ? firstTrailerId : 'BH 67 STS'
  );
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showWeatherRadar, setShowWeatherRadar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bluetrans_map_weather_on_v1') === '1';
    } catch {
      return false;
    }
  });

  // Dacă ai pornit vremea (ON), rămâne ON și după refresh / schimbarea paginii
  useEffect(() => {
    try {
      localStorage.setItem('bluetrans_map_weather_on_v1', showWeatherRadar ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showWeatherRadar]);
  const [isScrollZoomActive, setIsScrollZoomActive] = useState<boolean>(false);
  const [roadGeometries, setRoadGeometries] = useState<
    Record<string, [number, number][]>
  >(osrmRoadGeometryCache);

  const toggleScrollZoom = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (isScrollZoomActive) {
      map.scrollWheelZoom.disable();
      setIsScrollZoomActive(false);
    } else {
      map.scrollWheelZoom.enable();
      setIsScrollZoomActive(true);
    }
  };

  useEffect(() => {
    if (isSingle && trailers[0]?.id) {
      const targetId = trailers[0].id;
      setFocusedTrailerId(targetId);
      setSelectedTrackerId(targetId);
      const map = mapInstanceRef.current;
      const route = CORRIDOR_ROUTES[targetId];
      if (map && route) {
        const roadPath = roadGeometries[targetId] || route.coordinates;
        const bounds = L.latLngBounds(roadPath);
        map.fitBounds(bounds, { padding: [28, 28] });
        setTimeout(() => map.invalidateSize(), 100);
      }
    }
  }, [isSingle, firstTrailerId, roadGeometries]);

  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('modal-scroll-locked');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
      setIsScrollZoomActive(false);
    }
    const timer1 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 60);
    const timer2 = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 240);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn(1);
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut(1);
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  const activeRouteDef =
    CORRIDOR_ROUTES[selectedTrackerId] || CORRIDOR_ROUTES['BH 67 STS'];
  const activeTrailerObj =
    trailers.find((t) => t.id === selectedTrackerId) || trailers[0];

  // Fetch exact road geometry from OSRM driving router so routes follow 100% real highway curves (no ferry/aerial shortcuts)
  useEffect(() => {
    let isMounted = true;

    const loadRealRoadGeometries = async () => {
      const updated: Record<string, [number, number][]> = {
        ...osrmRoadGeometryCache,
      };
      let changed = false;

      for (const [trailerId, def] of Object.entries(CORRIDOR_ROUTES)) {
        if (updated[trailerId]) continue;

        try {
          // Sample key motorway anchors (including Storebælt & Øresund bridges for SE routes) so OSRM stays strictly on road bridges
          const step = Math.max(1, Math.floor(def.coordinates.length / 10));
          const anchors = def.coordinates.filter(
            (_, idx) => idx === 0 || idx === def.coordinates.length - 1 || idx % step === 0
          );
          const coordString = anchors
            .map(([lat, lng]) => `${lng},${lat}`)
            .join(';');

          const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const coords = data?.routes?.[0]?.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length > 20) {
            const latLngs: [number, number][] = coords.map(
              (pair: [number, number]) => [pair[1], pair[0]]
            );
            updated[trailerId] = latLngs;
            osrmRoadGeometryCache[trailerId] = latLngs;
            changed = true;
          }
        } catch {
          // Fallback is the dense 35-point motorway waypoint array in CORRIDOR_ROUTES
        }
      }

      if (isMounted && changed) {
        setRoadGeometries({ ...updated });
      }
    };

    loadRealRoadGeometries();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Leaflet Map (re-mounts cleanly when switching between inline and Full Screen portal)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [50.2, 12.8],
      zoom: 5,
      minZoom: 4,
      maxZoom: 15,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap · Rutare Autostrăzi HGV',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    const weatherGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;
    weatherLayerGroupRef.current = weatherGroup;

    const targetId = isSingle
      ? firstTrailerId
      : focusedTrailerId !== 'ALL'
        ? focusedTrailerId
        : undefined;
    const singleRoute = targetId ? CORRIDOR_ROUTES[targetId] : undefined;

    if (singleRoute && targetId) {
      const roadPath = roadGeometries[targetId] || singleRoute.coordinates;
      const singleBounds = L.latLngBounds(roadPath);
      map.fitBounds(singleBounds, { padding: isFullScreen ? [56, 56] : [28, 28] });
    } else {
      const mainBounds = L.latLngBounds([
        [46.8, 4.2],
        [56.2, 22.2],
      ]);
      map.fitBounds(mainBounds, { padding: isFullScreen ? [48, 48] : [24, 24] });
    }

    setTimeout(() => {
      map.invalidateSize();
      if (singleRoute && targetId) {
        const roadPath = roadGeometries[targetId] || singleRoute.coordinates;
        map.fitBounds(L.latLngBounds(roadPath), {
          padding: isFullScreen ? [56, 56] : [28, 28],
        });
      }
    }, 120);

    const resizeObs = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObs.observe(mapContainerRef.current);
    }

    return () => {
      resizeObs.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
      weatherLayerGroupRef.current = null;
    };
  }, [isFullScreen]);

  // AccuWeather-Style Weather Radar Overlay (Rain Fronts, Snow Zones & Animated Wind Streamlines — Clean Apple Icons, Zero Text Clutter)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const weatherGroup = weatherLayerGroupRef.current;
    if (!map || !weatherGroup) return;

    weatherGroup.clearLayers();
    if (!showWeatherRadar) return;

    const getSvgWeatherPin = (kind: 'rain' | 'wind' | 'snow' | 'sun') => {
      if (kind === 'sun') {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5.5" fill="#FBBF24"/><g stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="17.3" y2="6.7"/><line x1="6.7" y1="17.3" x2="4.9" y2="19.1"/></g></svg>`;
      }
      if (kind === 'snow') {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8.5 15H17.2C19.3 15 21 13.4 21 11.3C21 9.4 19.6 7.8 17.8 7.6C17.1 5.2 14.9 3.5 12.3 3.5C9.3 3.5 6.9 5.7 6.6 8.6C5 9 3.8 10.4 3.8 12.1C3.8 13.7 5.1 15 6.8 15H8.5Z" fill="#38BDF8"/><circle cx="8.5" cy="18.5" r="1.4" fill="#E0F2FE"/><circle cx="12.5" cy="19.8" r="1.4" fill="#E0F2FE"/><circle cx="16.5" cy="18.5" r="1.4" fill="#E0F2FE"/></svg>`;
      }
      if (kind === 'wind') {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 9.5H16.5C18.2 9.5 19.5 8.2 19.5 6.5C19.5 4.8 18.2 3.5 16.5 3.5C15 3.5 13.8 4.6 13.6 6" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/><path d="M3 14H18.5C20.2 14 21.5 15.3 21.5 17C21.5 18.7 20.2 20 18.5 20C17 20 15.8 18.9 15.6 17.5" stroke="#0EA5E9" stroke-width="2.2" stroke-linecap="round"/></svg>`;
      }
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8.5 15.5H17.2C19.3 15.5 21 13.9 21 11.8C21 9.9 19.6 8.3 17.8 8.1C17.1 5.7 14.9 4 12.3 4C9.3 4 6.9 6.2 6.6 9.1C5 9.5 3.8 10.9 3.8 12.6C3.8 14.2 5.1 15.5 6.8 15.5H8.5Z" fill="#3B82F6"/><g stroke="#38BDF8" stroke-width="2" stroke-linecap="round"><line x1="8.5" y1="17.5" x2="7.5" y2="20.5"/><line x1="12.5" y1="17.5" x2="11.5" y2="20.5"/><line x1="16.5" y1="17.5" x2="15.5" y2="20.5"/></g></svg>`;
    };

    const radarFronts: {
      center: [number, number];
      outerRadiusM: number;
      innerRadiusM: number;
      outerColor: string;
      innerColor: string;
      kind: 'rain' | 'wind' | 'snow' | 'sun';
      temp: string;
    }[] = [
      {
        center: [50.45, 7.85], // Rhine-Main A3/A61 (Frankfurt -> Köln)
        outerRadiusM: 175000,
        innerRadiusM: 90000,
        outerColor: '#22c55e',
        innerColor: '#0284c7',
        kind: 'rain',
        temp: '+7°C',
      },
      {
        center: [52.65, 6.85], // Rotterdam -> Bremen -> Hamburg (A12/A1)
        outerRadiusM: 195000,
        innerRadiusM: 100000,
        outerColor: '#06b6d4',
        innerColor: '#2563eb',
        kind: 'rain',
        temp: '+8°C',
      },
      {
        center: [55.45, 10.65], // Kolding -> Storebælt -> Øresund (E45/E20)
        outerRadiusM: 155000,
        innerRadiusM: 80000,
        outerColor: '#38bdf8',
        innerColor: '#0284c7',
        kind: 'wind',
        temp: '+4°C · 42 km/h',
      },
      {
        center: [58.35, 15.65], // Jönköping -> Linköping -> Stockholm (E4)
        outerRadiusM: 210000,
        innerRadiusM: 105000,
        outerColor: '#38bdf8',
        innerColor: '#6366f1',
        kind: 'snow',
        temp: '+1°C',
      },
      {
        center: [47.35, 20.15], // Oradea -> Debrecen -> Budapesta (M35/M3)
        outerRadiusM: 165000,
        innerRadiusM: 80000,
        outerColor: '#f59e0b',
        innerColor: '#eab308',
        kind: 'sun',
        temp: '+11°C',
      },
    ];

    radarFronts.forEach((front) => {
      L.circle(front.center, {
        radius: front.outerRadiusM,
        color: front.outerColor,
        weight: 1,
        opacity: 0.35,
        fillColor: front.outerColor,
        fillOpacity: 0.16,
        className: 'accuweather-radar-cell',
      }).addTo(weatherGroup);

      L.circle(front.center, {
        radius: front.innerRadiusM,
        color: front.innerColor,
        weight: 1.5,
        opacity: 0.5,
        fillColor: front.innerColor,
        fillOpacity: 0.24,
        className: 'accuweather-radar-cell',
      }).addTo(weatherGroup);

      const frontBadge = L.divIcon({
        className: 'accuweather-front-badge',
        html: `
          <div style="
            transform:translate(-50%, -50%);
            display:inline-flex;
            align-items:center;
            gap:5px;
            width:max-content;
            background:rgba(15, 23, 42, 0.94);
            border:1.5px solid ${front.outerColor};
            border-radius:9999px;
            padding:3px 9px;
            color:#ffffff;
            font-size:10.5px;
            font-weight:800;
            white-space:nowrap;
            box-shadow:0 4px 12px rgba(0,0,0,0.45);
            pointer-events:none;
          ">
            ${getSvgWeatherPin(front.kind)}
            <span style="color:#ffffff;">${front.temp}</span>
          </div>
        `,
        iconSize: [0, 0],
      });
      L.marker(front.center, { icon: frontBadge, interactive: false }).addTo(
        weatherGroup
      );
    });
  }, [showWeatherRadar, isFullScreen]);

  // Render Real Road Corridors, Checkpoints, Swap Hubs, and Truck Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const visibleTrailers =
      focusedTrailerId === 'ALL'
        ? trailers
        : trailers.filter((t) => t.id === focusedTrailerId);

    visibleTrailers.forEach((trailer) => {
      const route = CORRIDOR_ROUTES[trailer.id];
      if (!route) return;

      const isHighlighted =
        focusedTrailerId === trailer.id || selectedTrackerId === trailer.id;

      // Use OSRM full road geometry if loaded, otherwise dense motorway waypoints
      const roadPath = roadGeometries[trailer.id] || route.coordinates;

      // 1. Road Casing / Culoar Autostradă (Solid Road Border, ZERO dashed aerial lines!)
      L.polyline(roadPath, {
        color: '#0f172a',
        weight: isHighlighted ? 7.5 : 4.5,
        opacity: isHighlighted ? 0.55 : 0.25,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // 2. Inner Crisp Highway Route Line
      L.polyline(roadPath, {
        color: route.color,
        weight: isHighlighted ? 4.5 : 2.5,
        opacity: isHighlighted ? 0.98 : 0.65,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // 3. Checkpoint City Dots along the active route
      if (isHighlighted) {
        route.checkpoints.forEach((cp) => {
          const dotIcon = L.divIcon({
            className: 'custom-cp-dot',
            html: `
              <div style="
                display:flex;
                flex-direction:column;
                align-items:center;
                transform:translate(-50%, -50%);
              ">
                <div style="
                  width:10px;
                  height:10px;
                  border-radius:9999px;
                  background:${cp.completed ? '#16a34a' : '#ffffff'};
                  border:2.5px solid ${cp.completed ? '#16a34a' : route.color};
                  box-shadow:0 2px 6px rgba(0,0,0,0.45);
                "></div>
                <span style="
                  margin-top:2px;
                  padding:1px 6px;
                  border-radius:5px;
                  background:rgba(15,23,42,0.92);
                  color:#ffffff;
                  font-size:9px;
                  font-weight:700;
                  white-space:nowrap;
                  box-shadow:0 2px 6px rgba(0,0,0,0.35);
                ">${cp.city}</span>
              </div>
            `,
            iconSize: [0, 0],
          });

          L.marker(cp.coords, { icon: dotIcon }).addTo(group);
        });
      }

      // 4. Live GPS Truck Marker
      const truckCoords: [number, number] = [
        trailer.currentLocation.lat,
        trailer.currentLocation.lng,
      ];
      const trPlate = trailer.tractorId.split(' (')[0];
      const plateDisplay =
        trPlate && trPlate !== trailer.id
          ? `${trPlate} + ${trailer.id}`
          : trailer.id;

      const truckIcon = L.divIcon({
        className: 'custom-truck-marker',
        html: isHighlighted
          ? `
          <div style="
            display:flex;
            align-items:center;
            gap:6px;
            transform:translate(-16px, -16px);
            cursor:pointer;
            z-index:900;
          ">
            <div style="
              width:32px;
              height:32px;
              border-radius:9999px;
              background:${route.color};
              border:2.5px solid #ffffff;
              box-shadow:0 4px 14px rgba(0,0,0,0.55);
              display:flex;
              align-items:center;
              justify-content:center;
              color:#ffffff;
              flex-shrink:0;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>
            </div>
            <div style="
              background:rgba(15, 23, 42, 0.96);
              border:1.5px solid ${route.color};
              border-radius:9999px;
              padding:3px 8px;
              box-shadow:0 4px 12px rgba(0,0,0,0.45);
              white-space:nowrap;
              display:flex;
              align-items:center;
              gap:5px;
            ">
              <span style="
                display:inline-flex;
                align-items:stretch;
                border-radius:3px;
                overflow:hidden;
                border:1px solid #64748b;
                background:#ffffff;
                height:15px;
              ">
                <span style="
                  background:#003399;
                  color:#ffffff;
                  font-weight:900;
                  font-size:6px;
                  padding:0 3px;
                  display:flex;
                  flex-direction:column;
                  align-items:center;
                  justify-content:center;
                  line-height:1;
                "><span style="color:#ffcc00;font-size:5px;">★</span>RO</span>
                <span style="
                  background:#ffffff;
                  color:#0f172a;
                  font-weight:900;
                  font-size:9.5px;
                  padding:0 5px;
                  display:flex;
                  align-items:center;
                ">${plateDisplay}</span>
              </span>
              <span style="color:#4ade80;font-weight:800;font-size:10px;">
                ${trailer.freeLdm.toFixed(1)} LDM
              </span>
            </div>
          </div>
        `
          : `
          <div style="
            transform:translate(-13px, -13px);
            width:26px;
            height:26px;
            border-radius:9999px;
            background:${route.color};
            border:2px solid #ffffff;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
            display:flex;
            align-items:center;
            justify-content:center;
            color:#ffffff;
            cursor:pointer;
          " title="${plateDisplay} (${trailer.freeLdm.toFixed(1)} LDM liberi)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker(truckCoords, {
        icon: truckIcon,
        zIndexOffset: isHighlighted ? 1000 : 100,
      }).addTo(group);

      marker.on('click', () => {
        setSelectedTrackerId(trailer.id);
        const bounds = L.latLngBounds(roadPath);
        map.flyToBounds(bounds, { padding: [36, 36], duration: 0.8 });
      });
    });

    // 5. Smart Trailer Swap Hubs (Autohof Parking Markers)
    SWAP_HUBS.forEach((hub) => {
      const swapIcon = L.divIcon({
        className: 'custom-swap-marker',
        html: `
          <div style="
            transform:translate(-12px, -12px);
            width:24px;
            height:24px;
            border-radius:9999px;
            background:#0f172a;
            border:2px solid #f59e0b;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
            display:flex;
            align-items:center;
            justify-content:center;
            color:#f59e0b;
            font-size:11px;
            font-weight:800;
            cursor:pointer;
          " title="${hub.name} — ${hub.desc}">
            ⇄
          </div>
        `,
        iconSize: [0, 0],
      });

      const swapMarker = L.marker(hub.coords, { icon: swapIcon }).addTo(group);
      swapMarker.on('click', () => {
        if (onNavigateSwap) onNavigateSwap();
      });
    });

    // 6. Restul flotei reale (capete tractor din evidența flotei) — POZIȚII DE TEST până se conectează GPS-ul real
    if (!isSingle && focusedTrailerId === 'ALL') {
      MOCK_FLEET_POSITIONS.forEach((v) => {
        const fleetIcon = L.divIcon({
          className: 'custom-fleet-marker',
          html: `
            <div style="
              transform:translate(-50%, -50%);
              display:inline-flex;
              align-items:center;
              gap:4px;
              width:max-content;
              background:rgba(15,23,42,0.92);
              border:1.5px solid #64748b;
              border-radius:9999px;
              padding:2px 8px 2px 4px;
              color:#ffffff;
              font-size:10px;
              font-weight:800;
              white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.45);
              cursor:pointer;
            " title="${v.plate} — ${v.place} (poziție de test, GPS neconectat)">
              <span style="width:9px;height:9px;border-radius:9999px;background:#94a3b8;display:inline-block;"></span>
              <span style="color:#ffffff;">${v.plate}</span>
            </div>
          `,
          iconSize: [0, 0],
        });
        L.marker(v.coords, { icon: fleetIcon, zIndexOffset: 50 }).addTo(group);
      });
    }
  }, [trailers, focusedTrailerId, selectedTrackerId, roadGeometries, onNavigateSwap, isFullScreen]);

  const handleFocusCorridor = (id: string) => {
    setFocusedTrailerId(id);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (id === 'ALL') {
      const mainBounds = L.latLngBounds([
        [46.8, 4.2],
        [56.2, 22.2],
      ]);
      map.flyToBounds(mainBounds, { padding: [24, 24], duration: 0.8 });
    } else {
      setSelectedTrackerId(id);
      const route = CORRIDOR_ROUTES[id];
      if (route) {
        const roadPath = roadGeometries[id] || route.coordinates;
        const bounds = L.latLngBounds(roadPath);
        map.flyToBounds(bounds, { padding: [36, 36], duration: 0.8 });
      }
    }
  };

  const renderAppleWeatherIcon = (type: AppleWeatherType) => {
    switch (type) {
      case 'sun':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="12" cy="12" r="5.5" fill="#F59E0B" />
            <circle cx="12" cy="12" r="4.2" fill="#FBBF24" />
            <g stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round">
              <line x1="12" y1="2.5" x2="12" y2="4.5" />
              <line x1="12" y1="19.5" x2="12" y2="21.5" />
              <line x1="2.5" y1="12" x2="4.5" y2="12" />
              <line x1="19.5" y1="12" x2="21.5" y2="12" />
              <line x1="5.3" y1="5.3" x2="6.7" y2="6.7" />
              <line x1="17.3" y1="17.3" x2="18.7" y2="18.7" />
              <line x1="18.7" y1="5.3" x2="17.3" y2="6.7" />
              <line x1="6.7" y1="17.3" x2="5.3" y2="18.7" />
            </g>
          </svg>
        );
      case 'partly-cloudy':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="9" cy="9" r="4" fill="#F59E0B" />
            <g stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
              <line x1="9" y1="2.5" x2="9" y2="3.8" />
              <line x1="2.5" y1="9" x2="3.8" y2="9" />
              <line x1="4.4" y1="4.4" x2="5.4" y2="5.4" />
              <line x1="13.6" y1="4.4" x2="12.6" y2="5.4" />
            </g>
            <path
              d="M9.5 18.5H17.5C19.7 18.5 21.5 16.8 21.5 14.6C21.5 12.6 20 11 18.1 10.8C17.4 8.3 15.1 6.5 12.4 6.5C9.3 6.5 6.8 8.8 6.5 11.8C4.8 12.2 3.5 13.7 3.5 15.5C3.5 17.2 4.9 18.5 6.6 18.5H9.5Z"
              fill="#60A5FA"
              fillOpacity="0.92"
              stroke="#3B82F6"
              strokeWidth="1"
            />
          </svg>
        );
      case 'rain':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M8.5 15.5H17.2C19.3 15.5 21 13.9 21 11.8C21 9.9 19.6 8.3 17.8 8.1C17.1 5.7 14.9 4 12.3 4C9.3 4 6.9 6.2 6.6 9.1C5 9.5 3.8 10.9 3.8 12.6C3.8 14.2 5.1 15.5 6.8 15.5H8.5Z"
              fill="#3B82F6"
              fillOpacity="0.9"
            />
            <g stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round">
              <line x1="8.5" y1="17.5" x2="7.5" y2="20.5" />
              <line x1="12.5" y1="17.5" x2="11.5" y2="20.5" />
              <line x1="16.5" y1="17.5" x2="15.5" y2="20.5" />
            </g>
          </svg>
        );
      case 'snow':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M8.5 15H17.2C19.3 15 21 13.4 21 11.3C21 9.4 19.6 7.8 17.8 7.6C17.1 5.2 14.9 3.5 12.3 3.5C9.3 3.5 6.9 5.7 6.6 8.6C5 9 3.8 10.4 3.8 12.1C3.8 13.7 5.1 15 6.8 15H8.5Z"
              fill="#38BDF8"
              fillOpacity="0.9"
            />
            <g fill="#0284C7">
              <circle cx="8.5" cy="18.2" r="1.3" />
              <circle cx="12.5" cy="19.5" r="1.3" />
              <circle cx="16.5" cy="18.2" r="1.3" />
            </g>
          </svg>
        );
      case 'wind':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M3 9.5H16.5C18.2 9.5 19.5 8.2 19.5 6.5C19.5 4.8 18.2 3.5 16.5 3.5C15 3.5 13.8 4.6 13.6 6"
              stroke="#0EA5E9"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M3 13.5H18.5C20.2 13.5 21.5 14.8 21.5 16.5C21.5 18.2 20.2 19.5 18.5 19.5C17 19.5 15.8 18.4 15.6 17"
              stroke="#0284C7"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M5 17H11.5"
              stroke="#38BDF8"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        );
    }
  };

  const renderEuroRoPlate = (plate: string) => (
    <span
      className="inline-flex items-stretch rounded-[4px] overflow-hidden border border-slate-500/85 shadow-2xs shrink-0 whitespace-nowrap select-none h-[17px]"
      style={{ backgroundColor: '#ffffff' }}
    >
      <span
        className="flex flex-col items-center justify-center bg-[#003399] font-extrabold leading-none px-[3px] text-[5.5px]"
        style={{ backgroundColor: '#003399', color: '#ffffff' }}
      >
        <span
          className="euro-ro-plate-star"
          style={{ color: '#ffcc00', fontSize: '5px', lineHeight: 1 }}
        >
          ★
        </span>
        <span style={{ color: '#ffffff', lineHeight: 1, marginTop: '0.5px' }}>RO</span>
      </span>
      <span
        className="euro-ro-plate-num flex items-center font-black tracking-[0.02em] tabular-nums leading-none whitespace-nowrap px-1.5 text-[9.5px]"
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {plate}
      </span>
    </span>
  );

  const renderMapControlsBar = () => (
    <div className="absolute top-3 right-3 z-[450] flex items-center gap-1.5">
      {/* Apple Weather Icons + iOS Toggle Switch (Zero Text Clutter) */}
      <button
        type="button"
        onClick={() => setShowWeatherRadar((prev) => !prev)}
        className="px-3 py-1.5 rounded-full backdrop-blur-md border border-white/25 flex items-center gap-2 shadow-lg cursor-pointer transition"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
        }}
        title="Comută Radar Vreme (Ploaie, Ninsoare & Vânt) pe Hartă"
      >
        <span className="inline-flex items-center gap-1">
          {renderAppleWeatherIcon('rain')}
          {renderAppleWeatherIcon('wind')}
        </span>
        <span
          className="relative inline-flex items-center w-8 h-4 rounded-full transition-colors duration-200 p-0.5"
          style={{
            backgroundColor: showWeatherRadar ? '#30D158' : 'rgba(100, 116, 139, 0.75)',
          }}
        >
          <span
            className="w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
            style={{
              transform: showWeatherRadar ? 'translateX(16px)' : 'translateX(0px)',
            }}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={handleZoomIn}
        className="px-3 py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold flex items-center gap-1 shadow-lg cursor-pointer"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
        }}
        title="Zoom In (+)"
      >
        <ZoomIn className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />
        <span style={{ color: '#ffffff' }}>+</span>
      </button>

      <button
        type="button"
        onClick={handleZoomOut}
        className="px-3 py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold flex items-center gap-1 shadow-lg cursor-pointer"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
        }}
        title="Zoom Out (-)"
      >
        <ZoomOut className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} />
        <span style={{ color: '#ffffff' }}>−</span>
      </button>

      <button
        type="button"
        onClick={handleToggleFullScreen}
        className="px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/25 text-xs font-extrabold flex items-center gap-1.5 shadow-lg cursor-pointer"
        style={{
          backgroundColor: isFullScreen
            ? 'rgba(239, 68, 68, 0.95)'
            : 'rgba(15, 23, 42, 0.92)',
          color: '#ffffff',
        }}
        title={isFullScreen ? 'Închide Full Screen' : 'Full Screen'}
      >
        {isFullScreen ? (
          <>
            <Minimize2 className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Închide</span>
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} />
            <span style={{ color: '#ffffff' }}>Full Screen</span>
          </>
        )}
      </button>
    </div>
  );

  // Full Screen Portal: 100% True Viewport Map Showing ONLY the Route (No Sidebars, No Clutter)
  if (isFullScreen && typeof document !== 'undefined') {
    return (
      <>
        <div className={`${heightClass} w-full rounded-[22px] bg-slate-900/40 border border-white/10`} />
        {createPortal(
          <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#070b14] flex flex-col overflow-hidden">
            {/* Compact Full Screen Top Bar — X pinned in top-right corner */}
            <div
              className="px-4 py-2.5 border-b border-white/15 flex flex-nowrap items-center justify-between gap-3 shrink-0"
              style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
            >
              <div className="min-w-0 flex-1 flex flex-nowrap items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                <div className="flex flex-nowrap items-center gap-2.5 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#4ade80] whitespace-nowrap">
                    <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
                    {activeRouteDef.tripCode}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[320px] sm:max-w-none">
                    Coridor: {activeRouteDef.highwayCorridor}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[11px] font-extrabold text-sky-300 tabular-nums whitespace-nowrap shrink-0">
                    {activeRouteDef.totalTechKm.toLocaleString('ro-RO')} km tehnici
                  </span>
                </div>

                {!singleTripMode && trailers.length > 1 && (
                  <div className="flex flex-nowrap items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleFocusCorridor('ALL')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer whitespace-nowrap transition ${
                        focusedTrailerId === 'ALL'
                          ? 'bg-[#0A84FF] text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Toate ({trailers.length})
                    </button>
                    {trailers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleFocusCorridor(t.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer whitespace-nowrap transition ${
                          focusedTrailerId === t.id
                            ? 'bg-[#0A84FF] text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {t.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                aria-label="Închide harta pe tot ecranul"
                title="Închide ecran complet (Esc)"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 100% Full-Bleed Map Container */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
              <div ref={mapContainerRef} className="w-full h-full z-0" />
              {renderMapControlsBar()}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div
      className={
        singleTripMode
          ? 'space-y-3'
          : 'tahoe-glass rounded-[28px] p-4 sm:p-5 space-y-4'
      }
    >
      {/* Layout: Side-by-Side in Control Center (!singleTripMode), Stacked Dedesubt (flex-col) in Detalii Cursă (singleTripMode) */}
      <div
        className={
          singleTripMode
            ? 'flex flex-col gap-3.5'
            : 'flex flex-col xl:flex-row gap-3.5 items-stretch flex-1'
        }
      >
        {/* Interactive Leaflet Map Container (Accidental scroll/trackpad zoom strictly locked) */}
        <div
          className={`w-full shrink-0 min-w-0 relative rounded-[22px] overflow-hidden border border-white/15 shadow-2xl transition ${
            singleTripMode
              ? 'h-[320px] sm:h-[340px]'
              : 'xl:flex-1 h-[380px] sm:h-[480px] xl:h-[480px]'
          }`}
          style={{
            height: singleTripMode ? '320px' : '480px',
            minHeight: singleTripMode ? '320px' : '380px',
          }}
        >
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0"
            style={{
              height: '100%',
              minHeight: singleTripMode ? '320px' : '380px',
            }}
          />

          {renderMapControlsBar()}

          {/* Compact Bottom-Left Highway Corridor Pill */}
          <div
            className="absolute bottom-3 left-3 z-[400] px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 flex flex-wrap items-center gap-2.5 text-[11px] shadow-lg"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              color: '#ffffff',
            }}
          >
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#ffffff' }}>
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
              Traseu Rutier Camioane (OSRM HGV)
            </span>
            <span className="flex items-center gap-1 font-semibold" style={{ color: '#fbbf24' }}>
              Autohof Swap
            </span>
            <button
              type="button"
              onClick={toggleScrollZoom}
              className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
              style={{
                color: isScrollZoomActive ? '#4ade80' : '#cbd5e1',
              }}
              title="Deblochează / Blochează zoom din rotița mouse-ului"
            >
              {isScrollZoomActive ? '🔓 Zoom Scroll: ACTIV' : '🔒 Zoom Scroll: OPRIT'}
            </button>
          </div>
        </div>

        {/* Active Trips Selector (Shown ONLY in Control Center when !singleTripMode, zero overlapping text) */}
        {!singleTripMode && (
          <div className="w-full xl:w-[275px] xl:h-[480px] shrink-0 tahoe-card-inner rounded-[22px] p-3 flex flex-col justify-between gap-2">
            <button
              onClick={() => handleFocusCorridor('ALL')}
              className={`w-full px-3.5 py-2 rounded-full text-xs font-extrabold transition flex items-center justify-between cursor-pointer ${
                focusedTrailerId === 'ALL'
                  ? 'bg-[#0A84FF] text-white shadow-md'
                  : 'bg-white/[0.06] text-white/75 hover:text-white border border-white/10'
              }`}
            >
              <span>Toate Cursele ({trailers.length})</span>
              <span className="text-[10px] font-bold opacity-85">Toată Flota</span>
            </button>

            <div className="flex flex-col gap-1.5 flex-1 justify-between">
              {trailers.map((t) => {
                const isSelected =
                  focusedTrailerId === t.id ||
                  (focusedTrailerId === 'ALL' && selectedTrackerId === t.id);
                const trPlate = t.tractorId.split(' (')[0];
                const isTwoPlates = Boolean(trPlate && trPlate !== t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleFocusCorridor(t.id)}
                    className={`w-full px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center justify-between gap-1.5 cursor-pointer ${
                      focusedTrailerId === t.id
                        ? 'bg-[#0A84FF] text-white shadow-md'
                        : isSelected
                          ? 'bg-white/[0.14] text-white border border-white/25'
                          : 'bg-white/[0.05] text-white/75 hover:text-white border border-white/10'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 min-w-0">
                      {isTwoPlates && (
                        <>
                          {renderEuroRoPlate(trPlate)}
                          <span className="font-black text-[10px]">+</span>
                        </>
                      )}
                      {renderEuroRoPlate(t.id)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold tabular-nums px-2 py-0.5 rounded-full shrink-0 ${
                        focusedTrailerId === t.id
                          ? 'bg-white/20 text-white'
                          : 'bg-[#30D158]/15 text-[#30D158]'
                      }`}
                    >
                      {t.freeLdm.toFixed(1)} LDM
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Checkpoint Tracker Card + Technical KM + Compact Apple Weather Icons (Underneath map in singleTripMode) */}
        <div
          className={`w-full ${
            singleTripMode ? '' : 'xl:w-[340px] xl:h-[480px]'
          } shrink-0 tahoe-card-inner rounded-[22px] p-4 flex flex-col justify-between space-y-3`}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base font-bold text-white tabular-nums mr-1">
                    {activeRouteDef.tripCode}
                  </span>
                  {(() => {
                    const trPlate = activeTrailerObj.tractorId.split(' (')[0];
                    const isTwo = Boolean(trPlate && trPlate !== activeTrailerObj.id);
                    return (
                      <span className="inline-flex items-center gap-1">
                        {isTwo && (
                          <>
                            {renderEuroRoPlate(trPlate)}
                            <span className="font-black text-white/75 text-xs">+</span>
                          </>
                        )}
                        {renderEuroRoPlate(activeTrailerObj.id)}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-[11px] text-white/65 mt-1 font-medium truncate">
                  {activeTrailerObj.tractorId.split(' (')[1]?.replace(')', '') || activeTrailerObj.tractorId} · Șofer: <strong className="text-white">{activeTrailerObj.driver1.name}</strong>
                </div>
                <div className="text-[10px] tabular-nums text-[#30D158] mt-0.5 font-semibold truncate">
                  {activeRouteDef.highwayCorridor}
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 shrink-0">
                {activeTrailerObj.status}
              </span>
            </div>

            {/* Technical Distance (KM) & Transit Period Summary Box (Non-Wrapping, Clean) */}
            <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums whitespace-nowrap">
                <span className="font-bold text-white">
                  Total: <span className="text-[#0A84FF] font-extrabold">{activeRouteDef.totalTechKm.toLocaleString('ro-RO')} km</span>
                </span>
                <span className="text-white/75 font-semibold">
                  Rămas: <strong className="text-white">{(activeRouteDef.totalTechKm - activeRouteDef.drivenKm).toLocaleString('ro-RO')} km</strong> ({activeRouteDef.estDriveHours})
                </span>
              </div>
              <div className="text-[10px] text-white/60 tabular-nums flex items-center justify-between gap-2 whitespace-nowrap">
                <span>Tranzit: <strong>{activeRouteDef.transitWindow}</strong></span>
                <span className="text-[#30D158] font-bold">Parcurs: {activeRouteDef.drivenKm} km</span>
              </div>
            </div>

            {/* Route Checkpoints with Compact Apple Weather Icon + Temp (Zero Text Truncation) */}
            <div
              className={
                singleTripMode
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5'
                  : 'space-y-2 relative pl-0.5'
              }
            >
              {activeRouteDef.checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-2 text-xs ${
                    singleTripMode
                      ? 'p-2 rounded-xl bg-white/[0.03] border border-white/10'
                      : 'py-0.5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {cp.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                    ) : cp.current ? (
                      <CircleDot className="w-4 h-4 text-[#0A84FF] animate-pulse shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/25 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div
                        className={`font-semibold text-[11.5px] truncate ${
                          cp.completed || cp.current ? 'text-white' : 'text-white/70'
                        }`}
                      >
                        {cp.city} ({formatCountryBadge(cp.country)})
                      </div>
                      <div className="text-[10px] text-white/60 tabular-nums whitespace-nowrap">
                        {cp.eta.split(' (')[0]} ·{' '}
                        <strong className="text-[#0A84FF]">
                          {cp.techKm.replace(/\(\+(\d+)\s*km\)/, '(etapă $1 km)')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Compact Apple Weather Icon + Temp + Free LDM (No Long Text) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/[0.06] border border-white/10"
                      title={`Vreme la tranzit: ${cp.tempC}°C (${cp.weatherDesc})`}
                    >
                      {renderAppleWeatherIcon(cp.weatherType)}
                      <span className="text-[10.5px] font-extrabold text-white tabular-nums">
                        {cp.tempC > 0 ? `+${cp.tempC}` : cp.tempC}°
                      </span>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded-md tabular-nums text-[10px] font-bold shrink-0 ${
                        cp.freeLdmAfter >= 4
                          ? 'bg-[#30D158]/15 text-[#30D158]'
                          : 'bg-white/[0.06] text-white/65'
                      }`}
                    >
                      {cp.freeLdmAfter.toFixed(1)} LDM
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry Footer */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/55 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-[#0A84FF]" />
                {activeTrailerObj.currentLocation.speedKmh} km/h
              </span>
              <span className="text-[#64D2FF] tabular-nums text-xs flex items-center gap-1">
                <ThermometerSnowflake className="w-3.5 h-3.5" />
                {activeTrailerObj.zone1Temp}°C / +{activeTrailerObj.zone2Temp}°C
              </span>
            </div>

            {(onSelectTrailer || onNavigateSwap) && (
              <div className="grid grid-cols-2 gap-2">
                {onSelectTrailer && (
                  <button
                    onClick={() => onSelectTrailer(activeTrailerObj.id)}
                    className="py-2 px-3 rounded-full tahoe-btn-primary text-[11px] font-semibold cursor-pointer"
                  >
                    Detalii Bi-Temp →
                  </button>
                )}
                {onNavigateSwap && (
                  <button
                    onClick={onNavigateSwap}
                    className="py-2 px-3 rounded-full tahoe-btn-secondary text-[11px] font-semibold text-[#FF9F0A] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Repeat className="w-3 h-3" />
                    <span>3 Puncte Swap</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
