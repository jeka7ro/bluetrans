export const COUNTRY_FLAGS: Record<string, string> = {
  RO: '🇷🇴',
  HU: '🇭🇺',
  AT: '🇦🇹',
  DE: '🇩🇪',
  NL: '🇳🇱',
  SE: '🇸🇪',
  DK: '🇩🇰',
  SK: '🇸🇰',
  CZ: '🇨🇿',
  BE: '🇧🇪',
  FR: '🇫🇷',
  IT: '🇮🇹',
  PL: '🇵🇱',
  ES: '🇪🇸',
  CH: '🇨🇭',
  GB: '🇬🇧',
  UK: '🇬🇧',
  EU: '🇪🇺',
};

export function getCountryFlag(countryCode: string): string {
  const clean = (countryCode || '').trim().toUpperCase();
  if (clean.includes('/')) {
    return clean
      .split('/')
      .map((c) => `${COUNTRY_FLAGS[c.trim()] || '🇪🇺'} ${c.trim()}`)
      .join(' / ');
  }
  return COUNTRY_FLAGS[clean] || '🇪🇺';
}

export function formatCountryBadge(countryCode: string): string {
  const clean = (countryCode || '').trim().toUpperCase();
  if (clean.includes('/')) {
    return clean
      .split('/')
      .map((c) => `${COUNTRY_FLAGS[c.trim()] || '🇪🇺'} ${c.trim()}`)
      .join(' / ');
  }
  const flag = COUNTRY_FLAGS[clean] || '🇪🇺';
  return `${flag} ${clean}`;
}

export interface RouteSegment {
  id: string;
  fromCity: string;
  fromCountry: string;
  toCity: string;
  toCountry: string;
  distanceKm: number;
  etaStart: string;
  etaEnd: string;
  occupiedLdm: number;
  totalLdm: number;
  zone1Temp: number; // °C (ex: -18 sau +4)
  zone1OccupiedLdm: number;
  zone1MaxLdm: number;
  zone2Temp: number; // °C (ex: +4 sau +2)
  zone2OccupiedLdm: number;
  zone2MaxLdm: number;
  payloadTons: number;
  maxPayloadTons: number;
  loadingOrders: string[];
  unloadingOrders: string[];
  softReservedLdm?: number; // Pentru regula obligatorie: ofertă în așteptare (ex. 3.0 LDM din 4.2) fără blocare definitivă
}

export interface CargoOrder {
  id: string;
  client: string;
  fromCity: string;
  fromCountry: string;
  toCity: string;
  toCountry: string;
  ldm: number;
  weightTons: number;
  pallets: number;
  tempReq: number; // °C
  tempZone: 'Zona 1 (Față)' | 'Zona 2 (Spate)' | 'Flexibil';
  revenueEur: number;
  status: 'În tranzit' | 'Încărcat' | 'Planificat' | 'Nealocat' | 'Descărcat';
  loadingWindow: string;
  deliveryDeadline: string;
  stackable: boolean;
  palletExchange: boolean;
  assignedTrailerId?: string;
}

export interface TrailerUnit {
  id: string; // ex: BH 67 STS
  tractorId: string; // ex: BH 46 STS
  driver1: {
    name: string;
    phone: string;
    remainingDailyDriveHours: number; // din 9h/10h
    remainingWeeklyDriveHours: number; // din 56h
    nextRestRequiredInHours: number;
    tachoStatus: 'Conducere' | 'Pauză / Odihnă' | 'Altă muncă' | 'Disponibil';
  };
  driver2?: {
    name: string;
    phone: string;
    remainingDailyDriveHours: number;
    tachoStatus: 'Disponibil (Echipaj)' | 'Conducere';
  };
  isDoubleCrew: boolean;
  trailerType:
    | 'Frigo Bi-Temp (Schmitz Dual-Zone)'
    | 'Frigo Mono-Temp (Krone Cool Liner)'
    | 'Camionetă Express 3.5T (Frigo Sprint)'
    | 'Camionetă Express 7.5T (Bi-Temp Distribution)';
  vehicleCategory?:
    | 'Cap Tractor + Semiremorcă 13.6m'
    | 'Camionetă Express 3.5T'
    | 'Camionetă Express 7.5T';
  status: 'În tranzit' | 'La descărcare' | 'Încărcare' | 'Planificat' | 'Disponibil curând';
  corridorCode: string; // ex: HU → NL
  routeSummary: string[]; // ex: ['Oradea', 'Budapesta', 'Viena', 'Köln', 'Rotterdam']
  currentLocation: {
    city: string;
    country: string;
    lat: number;
    lng: number;
    speedKmh: number;
    cargoTrackLastPing: string;
  };
  totalLdm: number; // 13.6
  occupiedLdm: number;
  freeLdm: number;
  softReservedLdm: number;
  zone1Temp: number;
  zone2Temp: number;
  currentWeightTons: number;
  maxWeightTons: number;
  segments: RouteSegment[];
  schedule7Days: {
    dayIndex: number; // 0 = Luni ... 6 = Duminică
    dayLabel: string;
    activity: string;
    city: string;
    type: 'drive' | 'load' | 'unload' | 'swap' | 'free' | 'rest';
    freeLdmOnDay: number;
  }[];
}

export interface SmartGroupageMatch {
  id: string;
  targetTrailerId: string;
  targetSegmentLabel: string;
  sourceType: 'Comandă Internă' | 'Client Recurent' | 'Bursă (TimoCom / Trans.eu)';
  clientName: string;
  pickupCity: string;
  pickupCountry: string;
  deliveryCity: string;
  deliveryCountry: string;
  ldmRequired: number;
  weightTons: number;
  tempRequired: number;
  detourKm: number;
  extraTimeMinutes: number;
  estimatedRateEur: number;
  incrementalCostEur: number; // km suplimentari + taxe drum + timp
  netContributionEur: number;
  matchScore: number; // 0-100
  loadingWindow: string;
  compatibleWithBulkhead: boolean;
}

export interface ClientShipmentProposal {
  id: string;
  trailerId: string;
  segmentLabel: string;
  clientName: string;
  clientContact: string;
  routeFrom: string;
  routeTo: string;
  ldmRequested: number;
  availableLdmOnSegment: number;
  weightTons: number;
  tempRequired: number;
  offeredPriceEur: number;
  incrementalCostEur: number; // km suplimentari, taxe, timp
  estimatedContributionEur: number;
  detourKm: number;
  loadingWindow: string;
  latestDelivery: string;
  status: 'Pending review' | 'Accepted' | 'Counteroffer sent' | 'Declined';
  counterOfferEur?: number;
  submittedAt: string;
  hasConflictWarning?: boolean;
  conflictDetails?: string;
}

export type PostSwapAction =
  | 'ORADEA_BASE' // 1. Revenire la baza din Oradea
  | 'RETURN_ORIGIN_DIR' // 2. Revenire pe direcția din care a venit
  | 'NEW_DESTINATION_EMPTY_OR_LOAD' // 3. Deplasare către altă destinație, inclusiv cu remorcă goală
  | 'CONTINUE_NEW_TRAILER_ROUTE'; // 4. Continuarea traseului și descărcarea remorcii nou primite, conform instrucțiunilor TMS

export interface TrailerSwapScenario {
  id: string;
  code: string;
  title: string;
  scenarioType:
    | 'RECIPROCAL_SWAP' // Scenariul 1: Două tractoare schimbă reciproc remorcile
    | 'UNILATERAL_TAKEOVER' // Scenariul 2: Un tractor preia o remorcă de la alt tractor
    | 'DOUBLE_CREW_RELAY' // Scenariul 3: Echipaj de 2 șoferi preia o remorcă pentru continuare rapidă legală
    | 'EARLY_TRAILER_RELEASE'; // Scenariul 4: O remorcă este eliberată mai devreme pentru un client sau încărcare viitoare
  scenarioBadge: string;
  description: string;
  tractorA: {
    tractorId: string;
    currentTrailerId: string;
    driverNames: string;
    isDoubleCrew: boolean;
    currentPosition: string;
    originDirection: string;
    destinationBeforeSwap: string;
    etaAtMeetingPoint: string;
    distanceToMeetingKm: number;
    remainingDriveHours: string;
    tachoLegalAfterSwap: boolean;
    driverConfirmed: boolean;
    defaultPostAction: PostSwapAction;
    customDestinationHint: string;
  };
  tractorB: {
    tractorId: string;
    currentTrailerId: string; // poate fi 'Fără remorcă (Solo)' sau o remorcă
    driverNames: string;
    isDoubleCrew: boolean;
    currentPosition: string;
    originDirection: string;
    destinationBeforeSwap: string;
    etaAtMeetingPoint: string;
    distanceToMeetingKm: number;
    remainingDriveHours: string;
    tachoLegalAfterSwap: boolean;
    driverConfirmed: boolean;
    defaultPostAction: PostSwapAction;
    customDestinationHint: string;
  };
  meetingPoint: {
    name: string;
    highway: string;
    country: string;
    coordinates: string;
    waitWindowMinutes: number; // diferența ETA dintre A și B
    parkingSecurity: string;
    alternativePoints: { name: string; diffKm: number; waitMin: number }[];
  };
  compatibilityChecks: {
    fifthWheelHeightOk: boolean; // Cuplă standard / mega
    frigoPowerCableOk: boolean; // Priză frigo / EBS / ISO
    tachoHoursLegalOk: boolean; // Reg. CE 561/2006
    deliverySlaSaved: boolean;
    cargoTrackLiveSync: boolean;
  };
  financialImpact: {
    savedHours: number;
    emptyKmDelta: number; // negativ = economie km goi
    slaPenaltyAvoidedEur: number;
    netBenefitEur: number;
  };
  approvalStatus: 'Așteaptă confirmare șoferi' | 'Gata de aprobare dispecer' | 'Aprobat & Activ în Planning';
}

export interface FutureAvailabilitySlot {
  id: string;
  trailerId: string;
  tractorId: string;
  driverName: string;
  availableDate: string;
  availableTime: string;
  city: string;
  country: string;
  regionCorridor: string;
  freeLdm: number;
  totalLdm: number;
  tempCapabilities: string;
  preferredReturnCorridor: string;
  suggestedClientsCount: number;
  status: '100% Liberă (După descărcare)' | 'Grupaj Parțial Disponibil' | 'Eliberată anticipat (Swap)';
}

export const INITIAL_TRAILERS: TrailerUnit[] = [
  {
    id: 'BH 67 STS',
    tractorId: 'BH 46 STS',
    driver1: {
      name: 'Popa Ioan',
      phone: '+40 744 218 901',
      remainingDailyDriveHours: 4.5,
      remainingWeeklyDriveHours: 28.0,
      nextRestRequiredInHours: 3.5,
      tachoStatus: 'Conducere',
    },
    isDoubleCrew: false,
    trailerType: 'Frigo Bi-Temp (Schmitz Dual-Zone)',
    status: 'În tranzit',
    corridorCode: 'HU → NL',
    routeSummary: ['Oradea', 'Budapesta', 'Viena', 'Köln', 'Rotterdam'],
    currentLocation: {
      city: 'Győr (M1 -> Viena)',
      country: 'HU',
      lat: 47.6875,
      lng: 17.6504,
      speedKmh: 86,
      cargoTrackLastPing: 'Acum 18 sec',
    },
    totalLdm: 13.6,
    occupiedLdm: 8.2,
    freeLdm: 5.4,
    softReservedLdm: 3.0, // Ofertă client în analiză Viena -> Rotterdam (3 LDM)
    zone1Temp: -18,
    zone2Temp: 4,
    currentWeightTons: 14.2,
    maxWeightTons: 22.0,
    segments: [
      {
        id: 'seg-67-1',
        fromCity: 'Oradea',
        fromCountry: 'RO',
        toCity: 'Budapesta',
        toCountry: 'HU',
        distanceKm: 260,
        etaStart: 'Luni 06:00',
        etaEnd: 'Luni 10:30',
        occupiedLdm: 12.4,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 5.2,
        zone1MaxLdm: 5.2,
        zone2Temp: 4,
        zone2OccupiedLdm: 7.2,
        zone2MaxLdm: 8.4,
        payloadTons: 19.8,
        maxPayloadTons: 22.0,
        loadingOrders: ['CMD-901 (Oradea -> Rotterdam, 5.2 LDM, -18°C)', 'CMD-902 (Oradea -> Viena, 4.2 LDM, +4°C)', 'CMD-903 (Oradea -> Köln, 3.0 LDM, +4°C)'],
        unloadingOrders: [],
      },
      {
        id: 'seg-67-2',
        fromCity: 'Budapesta',
        fromCountry: 'HU',
        toCity: 'Viena',
        toCountry: 'AT',
        distanceKm: 245,
        etaStart: 'Luni 11:00',
        etaEnd: 'Luni 15:00',
        occupiedLdm: 12.4,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 5.2,
        zone1MaxLdm: 5.2,
        zone2Temp: 4,
        zone2OccupiedLdm: 7.2,
        zone2MaxLdm: 8.4,
        payloadTons: 19.8,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-902 Descarcă la Viena: -4.2 LDM (+4°C, 5.6t)'],
      },
      {
        id: 'seg-67-3',
        fromCity: 'Viena',
        fromCountry: 'AT',
        toCity: 'Köln',
        toCountry: 'DE',
        distanceKm: 885,
        etaStart: 'Luni 16:30',
        etaEnd: 'Marți 09:00',
        occupiedLdm: 8.2,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 5.2,
        zone1MaxLdm: 5.2,
        zone2Temp: 4,
        zone2OccupiedLdm: 3.0,
        zone2MaxLdm: 8.4,
        payloadTons: 14.2,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-903 Descarcă la Köln: -3.0 LDM (+4°C, 4.4t)'],
        softReservedLdm: 3.0,
      },
      {
        id: 'seg-67-4',
        fromCity: 'Köln',
        fromCountry: 'DE',
        toCity: 'Rotterdam',
        toCountry: 'NL',
        distanceKm: 265,
        etaStart: 'Marți 11:00',
        etaEnd: 'Marți 15:30',
        occupiedLdm: 5.2,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 5.2,
        zone1MaxLdm: 5.2,
        zone2Temp: 4,
        zone2OccupiedLdm: 0.0,
        zone2MaxLdm: 8.4,
        payloadTons: 9.8,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-901 Descarcă la Rotterdam: -5.2 LDM (-18°C, 9.8t)'],
        softReservedLdm: 3.0,
      },
    ],
    schedule7Days: [
      { dayIndex: 0, dayLabel: 'Luni', activity: 'Oradea → Viena (Descarcă 4.2 LDM)', city: 'Viena (🇦🇹 AT)', type: 'unload', freeLdmOnDay: 5.4 },
      { dayIndex: 1, dayLabel: 'Marți', activity: 'Viena → Köln → Rotterdam', city: 'Rotterdam (🇳🇱 NL)', type: 'unload', freeLdmOnDay: 5.4 },
      { dayIndex: 2, dayLabel: 'Miercuri', activity: 'Liberă în Rotterdam (13.6 LDM)', city: 'Rotterdam (🇳🇱 NL)', type: 'free', freeLdmOnDay: 13.6 },
      { dayIndex: 3, dayLabel: 'Joi', activity: 'Retur Venlo → Frankfurt (Grupaj)', city: 'Frankfurt (🇩🇪 DE)', type: 'load', freeLdmOnDay: 4.8 },
      { dayIndex: 4, dayLabel: 'Vineri', activity: 'Tranzit DE → AT → HU', city: 'Linz (🇦🇹 AT)', type: 'drive', freeLdmOnDay: 4.8 },
      { dayIndex: 5, dayLabel: 'Sâmbătă', activity: 'Descărcare Oradea & Bază', city: 'Oradea (🇷🇴 RO)', type: 'unload', freeLdmOnDay: 13.6 },
      { dayIndex: 6, dayLabel: 'Duminică', activity: 'Repaus săptămânal bază', city: 'Oradea (🇷🇴 RO)', type: 'rest', freeLdmOnDay: 13.6 },
    ],
  },
  {
    id: 'BH 69 STS',
    tractorId: 'BH 56 STS',
    driver1: {
      name: 'Mureșan Dan',
      phone: '+40 745 811 220',
      remainingDailyDriveHours: 2.1,
      remainingWeeklyDriveHours: 19.5,
      nextRestRequiredInHours: 2.1,
      tachoStatus: 'Conducere',
    },
    isDoubleCrew: false,
    trailerType: 'Frigo Mono-Temp (Krone Cool Liner)',
    status: 'În tranzit',
    corridorCode: 'HU → NL',
    routeSummary: ['Szolnok', 'München', 'Frankfurt', 'Almere'],
    currentLocation: {
      city: 'Rosenheim (A8 -> München)',
      country: 'DE',
      lat: 47.8542,
      lng: 12.1265,
      speedKmh: 84,
      cargoTrackLastPing: 'Acum 12 sec',
    },
    totalLdm: 13.6,
    occupiedLdm: 11.4,
    freeLdm: 2.2,
    softReservedLdm: 0,
    zone1Temp: -20,
    zone2Temp: 2,
    currentWeightTons: 18.6,
    maxWeightTons: 22.0,
    segments: [
      {
        id: 'seg-69-1',
        fromCity: 'Szolnok',
        fromCountry: 'HU',
        toCity: 'München',
        toCountry: 'DE',
        distanceKm: 740,
        etaStart: 'Luni 04:00',
        etaEnd: 'Luni 14:30',
        occupiedLdm: 11.4,
        totalLdm: 13.6,
        zone1Temp: -20,
        zone1OccupiedLdm: 6.0,
        zone1MaxLdm: 6.0,
        zone2Temp: 2,
        zone2OccupiedLdm: 5.4,
        zone2MaxLdm: 7.6,
        payloadTons: 18.6,
        maxPayloadTons: 22.0,
        loadingOrders: ['CMD-910 (Szolnok -> Almere, 6.0 LDM, -20°C)', 'CMD-911 (Szolnok -> München, 3.2 LDM, +2°C)', 'CMD-912 (Budapesta -> Frankfurt, 2.2 LDM, +2°C)'],
        unloadingOrders: ['CMD-911 Descarcă la München: -3.2 LDM (+2°C)'],
      },
      {
        id: 'seg-69-2',
        fromCity: 'München',
        fromCountry: 'DE',
        toCity: 'Frankfurt',
        toCountry: 'DE',
        distanceKm: 392,
        etaStart: 'Luni 16:00',
        etaEnd: 'Luni 21:30',
        occupiedLdm: 8.2,
        totalLdm: 13.6,
        zone1Temp: -20,
        zone1OccupiedLdm: 6.0,
        zone1MaxLdm: 6.0,
        zone2Temp: 2,
        zone2OccupiedLdm: 2.2,
        zone2MaxLdm: 7.6,
        payloadTons: 13.4,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-912 Descarcă la Frankfurt: -2.2 LDM (+2°C)'],
      },
      {
        id: 'seg-69-3',
        fromCity: 'Frankfurt',
        fromCountry: 'DE',
        toCity: 'Almere',
        toCountry: 'NL',
        distanceKm: 440,
        etaStart: 'Marți 07:00',
        etaEnd: 'Marți 13:00',
        occupiedLdm: 6.0,
        totalLdm: 13.6,
        zone1Temp: -20,
        zone1OccupiedLdm: 6.0,
        zone1MaxLdm: 6.0,
        zone2Temp: 2,
        zone2OccupiedLdm: 0.0,
        zone2MaxLdm: 7.6,
        payloadTons: 10.2,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-910 Descarcă la Almere: -6.0 LDM (-20°C)'],
      },
    ],
    schedule7Days: [
      { dayIndex: 0, dayLabel: 'Luni', activity: 'Szolnok → München → Frankfurt', city: 'Frankfurt (🇩🇪 DE)', type: 'unload', freeLdmOnDay: 2.2 },
      { dayIndex: 1, dayLabel: 'Marți', activity: 'Frankfurt → Almere (Descarcă tot)', city: 'Almere (🇳🇱 NL)', type: 'unload', freeLdmOnDay: 7.6 },
      { dayIndex: 2, dayLabel: 'Miercuri', activity: 'Încărcare Amsterdam → Viena', city: 'Amsterdam (🇳🇱 NL)', type: 'load', freeLdmOnDay: 3.2 },
      { dayIndex: 3, dayLabel: 'Joi', activity: 'Tranzit NL → DE → AT', city: 'Nürnberg (🇩🇪 DE)', type: 'drive', freeLdmOnDay: 3.2 },
      { dayIndex: 4, dayLabel: 'Vineri', activity: 'Descărcare Viena & Budapesta', city: 'Viena (🇦🇹 AT)', type: 'unload', freeLdmOnDay: 13.6 },
      { dayIndex: 5, dayLabel: 'Sâmbătă', activity: 'Sosire bază Oradea', city: 'Oradea (🇷🇴 RO)', type: 'drive', freeLdmOnDay: 13.6 },
      { dayIndex: 6, dayLabel: 'Duminică', activity: 'Repaus bază Oradea', city: 'Oradea (🇷🇴 RO)', type: 'rest', freeLdmOnDay: 13.6 },
    ],
  },
  {
    id: 'BH 75 STS',
    tractorId: 'IF 96 STS',
    driver1: {
      name: 'Kovács Attila',
      phone: '+40 740 992 104',
      remainingDailyDriveHours: 6.8,
      remainingWeeklyDriveHours: 34.0,
      nextRestRequiredInHours: 4.0,
      tachoStatus: 'Conducere',
    },
    isDoubleCrew: false,
    trailerType: 'Frigo Bi-Temp (Schmitz Dual-Zone)',
    status: 'În tranzit',
    corridorCode: 'NL → SE',
    routeSummary: ['Rotterdam', 'Hamburg', 'Malmö', 'Stockholm'],
    currentLocation: {
      city: 'Bremen (A1 -> Hamburg)',
      country: 'DE',
      lat: 53.0793,
      lng: 8.8017,
      speedKmh: 88,
      cargoTrackLastPing: 'Acum 9 sec',
    },
    totalLdm: 13.6,
    occupiedLdm: 6.8,
    freeLdm: 6.8,
    softReservedLdm: 0,
    zone1Temp: 4,
    zone2Temp: 4,
    currentWeightTons: 9.4,
    maxWeightTons: 22.0,
    segments: [
      {
        id: 'seg-75-1',
        fromCity: 'Rotterdam',
        fromCountry: 'NL',
        toCity: 'Hamburg',
        toCountry: 'DE',
        distanceKm: 500,
        etaStart: 'Luni 08:00',
        etaEnd: 'Luni 15:00',
        occupiedLdm: 6.8,
        totalLdm: 13.6,
        zone1Temp: 4,
        zone1OccupiedLdm: 6.8,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 0.0,
        zone2MaxLdm: 6.8,
        payloadTons: 9.4,
        maxPayloadTons: 22.0,
        loadingOrders: ['CMD-920 (Rotterdam -> Stockholm, Flori & Legume +4°C, 6.8 LDM)'],
        unloadingOrders: [],
      },
      {
        id: 'seg-75-2',
        fromCity: 'Hamburg',
        fromCountry: 'DE',
        toCity: 'Malmö',
        toCountry: 'SE',
        distanceKm: 430,
        etaStart: 'Luni 16:00',
        etaEnd: 'Marți 06:00',
        occupiedLdm: 6.8,
        totalLdm: 13.6,
        zone1Temp: 4,
        zone1OccupiedLdm: 6.8,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 0.0,
        zone2MaxLdm: 6.8,
        payloadTons: 9.4,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: [],
      },
      {
        id: 'seg-75-3',
        fromCity: 'Malmö',
        fromCountry: 'SE',
        toCity: 'Stockholm',
        toCountry: 'SE',
        distanceKm: 612,
        etaStart: 'Marți 07:00',
        etaEnd: 'Marți 15:30',
        occupiedLdm: 6.8,
        totalLdm: 13.6,
        zone1Temp: 4,
        zone1OccupiedLdm: 6.8,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 0.0,
        zone2MaxLdm: 6.8,
        payloadTons: 9.4,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-920 Descarcă la Stockholm: -6.8 LDM (+4°C)'],
      },
    ],
    schedule7Days: [
      { dayIndex: 0, dayLabel: 'Luni', activity: 'Rotterdam → Hamburg (6.8 LDM liberi)', city: 'Hamburg (🇩🇪 DE)', type: 'drive', freeLdmOnDay: 6.8 },
      { dayIndex: 1, dayLabel: 'Marți', activity: 'Malmö → Stockholm (Descărcare)', city: 'Stockholm (🇸🇪 SE)', type: 'unload', freeLdmOnDay: 6.8 },
      { dayIndex: 2, dayLabel: 'Miercuri', activity: 'Liberă în Stockholm (13.6 LDM)', city: 'Stockholm (🇸🇪 SE)', type: 'free', freeLdmOnDay: 13.6 },
      { dayIndex: 3, dayLabel: 'Joi', activity: 'Retur Helsingborg → Hamburg', city: 'Hamburg (🇩🇪 DE)', type: 'load', freeLdmOnDay: 2.4 },
      { dayIndex: 4, dayLabel: 'Vineri', activity: 'Descărcare Hamburg → Venlo', city: 'Venlo (🇳🇱 NL)', type: 'unload', freeLdmOnDay: 13.6 },
      { dayIndex: 5, dayLabel: 'Sâmbătă', activity: 'Încărcare Venlo → RO', city: 'Venlo (🇳🇱 NL)', type: 'load', freeLdmOnDay: 1.6 },
      { dayIndex: 6, dayLabel: 'Duminică', activity: 'Repaus Germania (A3)', city: 'Würzburg (🇩🇪 DE)', type: 'rest', freeLdmOnDay: 1.6 },
    ],
  },
  {
    id: 'BH 74 STS',
    tractorId: 'B 506 STS',
    driver1: {
      name: 'Rus Vasile',
      phone: '+40 742 510 339',
      remainingDailyDriveHours: 1.2,
      remainingWeeklyDriveHours: 14.0,
      nextRestRequiredInHours: 1.2,
      tachoStatus: 'Altă muncă',
    },
    isDoubleCrew: false,
    trailerType: 'Frigo Bi-Temp (Schmitz Dual-Zone)',
    status: 'La descărcare',
    corridorCode: 'RO → DE',
    routeSummary: ['Oradea', 'Suben', 'München', 'Stuttgart'],
    currentLocation: {
      city: 'München (Rampa 4 Logistikpark)',
      country: 'DE',
      lat: 48.1351,
      lng: 11.582,
      speedKmh: 0,
      cargoTrackLastPing: 'Acum 5 sec',
    },
    totalLdm: 13.6,
    occupiedLdm: 9.6,
    freeLdm: 4.0,
    softReservedLdm: 0,
    zone1Temp: -18,
    zone2Temp: 4,
    currentWeightTons: 15.8,
    maxWeightTons: 22.0,
    segments: [
      {
        id: 'seg-74-1',
        fromCity: 'Oradea',
        fromCountry: 'RO',
        toCity: 'München',
        toCountry: 'DE',
        distanceKm: 920,
        etaStart: 'Duminică 22:00',
        etaEnd: 'Luni 12:00',
        occupiedLdm: 13.6,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 6.8,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 6.8,
        zone2MaxLdm: 6.8,
        payloadTons: 21.2,
        maxPayloadTons: 22.0,
        loadingOrders: ['CMD-930 (Oradea -> München, 4.0 LDM, +4°C)', 'CMD-931 (Cluj -> Stuttgart, 9.6 LDM, -18°C / +4°C)'],
        unloadingOrders: ['CMD-930 Descarcă acum la München: -4.0 LDM'],
      },
      {
        id: 'seg-74-2',
        fromCity: 'München',
        fromCountry: 'DE',
        toCity: 'Stuttgart',
        toCountry: 'DE',
        distanceKm: 230,
        etaStart: 'Luni 14:00',
        etaEnd: 'Luni 17:30',
        occupiedLdm: 9.6,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 6.8,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 2.8,
        zone2MaxLdm: 6.8,
        payloadTons: 15.8,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-931 Descarcă la Stuttgart: -9.6 LDM'],
      },
    ],
    schedule7Days: [
      { dayIndex: 0, dayLabel: 'Luni', activity: 'Descarcă München → Stuttgart', city: 'Stuttgart (🇩🇪 DE)', type: 'unload', freeLdmOnDay: 4.0 },
      { dayIndex: 1, dayLabel: 'Marți', activity: 'Liberă în Stuttgart (08:00, 13.6 LDM)', city: 'Stuttgart (🇩🇪 DE)', type: 'free', freeLdmOnDay: 13.6 },
      { dayIndex: 2, dayLabel: 'Miercuri', activity: 'Swap propus în Suben / Retur RO', city: 'Suben (🇦🇹 AT)', type: 'swap', freeLdmOnDay: 3.2 },
      { dayIndex: 3, dayLabel: 'Joi', activity: 'Descărcare Oradea', city: 'Oradea (🇷🇴 RO)', type: 'unload', freeLdmOnDay: 13.6 },
      { dayIndex: 4, dayLabel: 'Vineri', activity: 'Încărcare Oradea → Milano', city: 'Oradea (🇷🇴 RO)', type: 'load', freeLdmOnDay: 2.0 },
      { dayIndex: 5, dayLabel: 'Sâmbătă', activity: 'Tranzit HU → SI → IT', city: 'Ljubljana (SI)', type: 'drive', freeLdmOnDay: 2.0 },
      { dayIndex: 6, dayLabel: 'Duminică', activity: 'Repaus Verona (IT)', city: 'Verona (IT)', type: 'rest', freeLdmOnDay: 2.0 },
    ],
  },
  {
    id: 'BH 91 STS',
    tractorId: 'B 507 STS',
    driver1: {
      name: 'Nemeș Florin',
      phone: '+40 741 309 882',
      remainingDailyDriveHours: 8.5,
      remainingWeeklyDriveHours: 42.0,
      nextRestRequiredInHours: 4.5,
      tachoStatus: 'Disponibil',
    },
    driver2: {
      name: 'Crișan Mihai',
      phone: '+40 741 309 883',
      remainingDailyDriveHours: 9.0,
      tachoStatus: 'Disponibil (Echipaj)',
    },
    isDoubleCrew: true,
    trailerType: 'Frigo Bi-Temp (Schmitz Dual-Zone)',
    status: 'Planificat',
    corridorCode: 'NL → SE',
    routeSummary: ['Rotterdam', 'Venlo', 'Kolding', 'Göteborg'],
    currentLocation: {
      city: 'Venlo (Fresh Park)',
      country: 'NL',
      lat: 51.3704,
      lng: 6.1724,
      speedKmh: 0,
      cargoTrackLastPing: 'Acum 22 sec',
    },
    totalLdm: 13.6,
    occupiedLdm: 10.0,
    freeLdm: 3.6,
    softReservedLdm: 0,
    zone1Temp: 4,
    zone2Temp: 4,
    currentWeightTons: 14.5,
    maxWeightTons: 22.0,
    segments: [
      {
        id: 'seg-91-1',
        fromCity: 'Rotterdam',
        fromCountry: 'NL',
        toCity: 'Venlo',
        toCountry: 'NL',
        distanceKm: 165,
        etaStart: 'Luni 13:00',
        etaEnd: 'Luni 15:30',
        occupiedLdm: 10.0,
        totalLdm: 13.6,
        zone1Temp: 4,
        zone1OccupiedLdm: 10.0,
        zone1MaxLdm: 13.6,
        zone2Temp: 4,
        zone2OccupiedLdm: 0,
        zone2MaxLdm: 0,
        payloadTons: 14.5,
        maxPayloadTons: 22.0,
        loadingOrders: ['CMD-940 (Rotterdam -> Göteborg, 10.0 LDM, +4°C)'],
        unloadingOrders: [],
      },
      {
        id: 'seg-91-2',
        fromCity: 'Venlo',
        fromCountry: 'NL',
        toCity: 'Göteborg',
        toCountry: 'SE',
        distanceKm: 980,
        etaStart: 'Luni 17:00',
        etaEnd: 'Marți 08:00',
        occupiedLdm: 10.0,
        totalLdm: 13.6,
        zone1Temp: 4,
        zone1OccupiedLdm: 10.0,
        zone1MaxLdm: 13.6,
        zone2Temp: 4,
        zone2OccupiedLdm: 0,
        zone2MaxLdm: 0,
        payloadTons: 14.5,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-940 Descarcă la Göteborg: -10.0 LDM'],
      },
    ],
    schedule7Days: [
      { dayIndex: 0, dayLabel: 'Luni', activity: 'Plecare Rotterdam → Venlo (3.6 LDM liberi)', city: 'Venlo (🇳🇱 NL)', type: 'load', freeLdmOnDay: 3.6 },
      { dayIndex: 1, dayLabel: 'Marți', activity: 'Echipaj 2x: Sosire Göteborg (Descarcă)', city: 'Göteborg (🇸🇪 SE)', type: 'unload', freeLdmOnDay: 13.6 },
      { dayIndex: 2, dayLabel: 'Miercuri', activity: 'Încărcare Pharma SE → DE', city: 'Göteborg (🇸🇪 SE)', type: 'load', freeLdmOnDay: 0.0 },
      { dayIndex: 3, dayLabel: 'Joi', activity: 'Descărcare Frankfurt', city: 'Frankfurt (🇩🇪 DE)', type: 'unload', freeLdmOnDay: 13.6 },
      { dayIndex: 4, dayLabel: 'Vineri', activity: 'Swap Echipaj la Hegyeshalom → RO', city: 'Hegyeshalom (🇭🇺 HU)', type: 'swap', freeLdmOnDay: 0.0 },
      { dayIndex: 5, dayLabel: 'Sâmbătă', activity: 'Bază Oradea', city: 'Oradea (🇷🇴 RO)', type: 'free', freeLdmOnDay: 13.6 },
      { dayIndex: 6, dayLabel: 'Duminică', activity: 'Repaus bază', city: 'Oradea (🇷🇴 RO)', type: 'rest', freeLdmOnDay: 13.6 },
    ],
  },
  {
    id: 'BH 23 STS',
    tractorId: 'B 560 STS',
    driver1: {
      name: 'Moldovan Radu',
      phone: '+40 740 551 210',
      remainingDailyDriveHours: 7.0,
      remainingWeeklyDriveHours: 36.0,
      nextRestRequiredInHours: 4.5,
      tachoStatus: 'Conducere',
    },
    isDoubleCrew: false,
    trailerType: 'Frigo Bi-Temp (Schmitz Dual-Zone)',
    vehicleCategory: 'Cap Tractor + Semiremorcă 13.6m',
    status: 'În tranzit',
    corridorCode: 'RO → AT',
    routeSummary: ['Oradea', 'Budapesta', 'Győr', 'Viena'],
    currentLocation: {
      city: 'Tatabánya (M1 -> Viena)',
      country: 'HU',
      lat: 47.5692,
      lng: 18.4048,
      speedKmh: 89,
      cargoTrackLastPing: 'Acum 14 sec',
    },
    totalLdm: 13.6,
    occupiedLdm: 8.8,
    freeLdm: 4.8,
    softReservedLdm: 0,
    zone1Temp: 2,
    zone2Temp: 4,
    currentWeightTons: 14.8,
    maxWeightTons: 22.0,
    segments: [
      {
        id: 'seg-23-1',
        fromCity: 'Oradea',
        fromCountry: 'RO',
        toCity: 'Budapesta',
        toCountry: 'HU',
        distanceKm: 260,
        etaStart: 'Luni 07:00',
        etaEnd: 'Luni 10:15',
        occupiedLdm: 8.8,
        totalLdm: 13.6,
        zone1Temp: 2,
        zone1OccupiedLdm: 4.8,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 4.0,
        zone2MaxLdm: 6.8,
        payloadTons: 14.8,
        maxPayloadTons: 22.0,
        loadingOrders: ['CMD-961 (Oradea -> Viena Pharma & Fresh, 8.8 LDM, +2°C / +4°C)'],
        unloadingOrders: [],
      },
      {
        id: 'seg-23-2',
        fromCity: 'Budapesta',
        fromCountry: 'HU',
        toCity: 'Viena',
        toCountry: 'AT',
        distanceKm: 245,
        etaStart: 'Luni 10:45',
        etaEnd: 'Luni 13:15',
        occupiedLdm: 8.8,
        totalLdm: 13.6,
        zone1Temp: 2,
        zone1OccupiedLdm: 4.8,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 4.0,
        zone2MaxLdm: 6.8,
        payloadTons: 14.8,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-961 Descarcă la Viena Hub: -8.8 LDM'],
      },
    ],
    schedule7Days: [
      { dayIndex: 0, dayLabel: 'Luni', activity: 'Transport Frigo Oradea → Viena', city: 'Viena (🇦🇹 AT)', type: 'unload', freeLdmOnDay: 4.8 },
      { dayIndex: 1, dayLabel: 'Marți', activity: 'Retur Viena → Budapesta → Oradea', city: 'Oradea (🇷🇴 RO)', type: 'load', freeLdmOnDay: 13.6 },
      { dayIndex: 2, dayLabel: 'Miercuri', activity: 'Colectare Bihor & Arad → HU', city: 'Oradea (🇷🇴 RO)', type: 'load', freeLdmOnDay: 5.2 },
      { dayIndex: 3, dayLabel: 'Joi', activity: 'Consolidare marfă cu BH 67 STS (M1)', city: 'Győr (🇭🇺 HU)', type: 'swap', freeLdmOnDay: 13.6 },
      { dayIndex: 4, dayLabel: 'Vineri', activity: 'Timișoara → Budapesta → Viena', city: 'Budapesta (🇭🇺 HU)', type: 'drive', freeLdmOnDay: 4.2 },
      { dayIndex: 5, dayLabel: 'Sâmbătă', activity: 'Bază Oradea mentenanță', city: 'Oradea (🇷🇴 RO)', type: 'free', freeLdmOnDay: 13.6 },
      { dayIndex: 6, dayLabel: 'Duminică', activity: 'Repaus bază', city: 'Oradea (🇷🇴 RO)', type: 'rest', freeLdmOnDay: 13.6 },
    ],
  },
  {
    id: 'BH 31 STS',
    tractorId: 'B 871 STS',
    driver1: {
      name: 'Pop Lucian',
      phone: '+40 740 882 341',
      remainingDailyDriveHours: 5.8,
      remainingWeeklyDriveHours: 32.0,
      nextRestRequiredInHours: 3.2,
      tachoStatus: 'Conducere',
    },
    isDoubleCrew: false,
    trailerType: 'Frigo Bi-Temp (Schmitz Dual-Zone)',
    vehicleCategory: 'Cap Tractor + Semiremorcă 13.6m',
    status: 'În tranzit',
    corridorCode: 'HU → CZ → AT',
    routeSummary: ['Szeged', 'Budapesta', 'Bratislava', 'Brno', 'Viena'],
    currentLocation: {
      city: 'Bratislava (D2)',
      country: 'SK',
      lat: 48.1486,
      lng: 17.1077,
      speedKmh: 87,
      cargoTrackLastPing: 'Acum 20 sec',
    },
    totalLdm: 13.6,
    occupiedLdm: 9.2,
    freeLdm: 4.4,
    softReservedLdm: 0,
    zone1Temp: -18,
    zone2Temp: 4,
    currentWeightTons: 15.4,
    maxWeightTons: 22.0,
    segments: [
      {
        id: 'seg-31-1',
        fromCity: 'Szeged',
        fromCountry: 'HU',
        toCity: 'Bratislava',
        toCountry: 'SK',
        distanceKm: 370,
        etaStart: 'Luni 06:30',
        etaEnd: 'Luni 11:30',
        occupiedLdm: 9.2,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 5.2,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 4.0,
        zone2MaxLdm: 6.8,
        payloadTons: 15.4,
        maxPayloadTons: 22.0,
        loadingOrders: ['CMD-962 (Szeged -> Bratislava, 4.0 LDM, +4°C)', 'CMD-963 (Szeged -> Brno, 5.2 LDM, -18°C)'],
        unloadingOrders: ['CMD-962 Descarcă la Bratislava: -4.0 LDM (+4°C)'],
      },
      {
        id: 'seg-31-2',
        fromCity: 'Bratislava',
        fromCountry: 'SK',
        toCity: 'Brno',
        toCountry: 'CZ',
        distanceKm: 130,
        etaStart: 'Luni 12:30',
        etaEnd: 'Luni 14:30',
        occupiedLdm: 5.2,
        totalLdm: 13.6,
        zone1Temp: -18,
        zone1OccupiedLdm: 5.2,
        zone1MaxLdm: 6.8,
        zone2Temp: 4,
        zone2OccupiedLdm: 0,
        zone2MaxLdm: 6.8,
        payloadTons: 9.2,
        maxPayloadTons: 22.0,
        loadingOrders: [],
        unloadingOrders: ['CMD-963 Descarcă la Brno: -5.2 LDM (-18°C)'],
      },
    ],
    schedule7Days: [
      { dayIndex: 0, dayLabel: 'Luni', activity: 'Bi-Temp Szeged → Bratislava → Brno', city: 'Brno (CZ)', type: 'unload', freeLdmOnDay: 4.4 },
      { dayIndex: 1, dayLabel: 'Marți', activity: 'Colectare Brno → Viena Hub Transfer', city: 'Viena (🇦🇹 AT)', type: 'load', freeLdmOnDay: 6.4 },
      { dayIndex: 2, dayLabel: 'Miercuri', activity: 'Consolidare cu remorca BH 74 STS în Suben', city: 'Suben (🇦🇹 AT)', type: 'swap', freeLdmOnDay: 13.6 },
      { dayIndex: 3, dayLabel: 'Joi', activity: 'Distribuție Viena & Linz', city: 'Linz (🇦🇹 AT)', type: 'drive', freeLdmOnDay: 4.8 },
      { dayIndex: 4, dayLabel: 'Vineri', activity: 'Retur Győr → Budapesta → Oradea', city: 'Oradea (🇷🇴 RO)', type: 'load', freeLdmOnDay: 13.6 },
      { dayIndex: 5, dayLabel: 'Sâmbătă', activity: 'Bază Oradea', city: 'Oradea (🇷🇴 RO)', type: 'free', freeLdmOnDay: 13.6 },
      { dayIndex: 6, dayLabel: 'Duminică', activity: 'Repaus săptămânal', city: 'Oradea (🇷🇴 RO)', type: 'rest', freeLdmOnDay: 13.6 },
    ],
  },
];

export const UNASSIGNED_ORDERS: CargoOrder[] = [
  {
    id: 'CMD-950',
    client: 'Agrana Fruit Austria GmbH',
    fromCity: 'Viena',
    fromCountry: 'AT',
    toCity: 'Köln',
    toCountry: 'DE',
    ldm: 3.0,
    weightTons: 4.2,
    pallets: 7,
    tempReq: 4,
    tempZone: 'Zona 2 (Spate)',
    revenueEur: 420,
    status: 'Nealocat',
    loadingWindow: 'Luni 15:30 - 17:00',
    deliveryDeadline: 'Marți 16:00',
    stackable: false,
    palletExchange: false,
  },
  {
    id: 'CMD-951',
    client: 'Agrana Fruit Austria GmbH',
    fromCity: 'Viena',
    fromCountry: 'AT',
    toCity: 'Rotterdam',
    toCountry: 'NL',
    ldm: 3.0,
    weightTons: 4.2,
    pallets: 7,
    tempReq: 4,
    tempZone: 'Zona 2 (Spate)',
    revenueEur: 550,
    status: 'Nealocat',
    loadingWindow: 'Luni 15:30 - 17:00',
    deliveryDeadline: 'Marți 16:00',
    stackable: false,
    palletExchange: true,
  },
  {
    id: 'CMD-952',
    client: 'FrieslandCampina Export',
    fromCity: 'Köln',
    fromCountry: 'DE',
    toCity: 'Rotterdam',
    toCountry: 'NL',
    ldm: 2.4,
    weightTons: 3.1,
    pallets: 6,
    tempReq: 4,
    tempZone: 'Zona 2 (Spate)',
    revenueEur: 340,
    status: 'Nealocat',
    loadingWindow: 'Marți 09:30 - 11:00',
    deliveryDeadline: 'Marți 16:00',
    stackable: false,
    palletExchange: false,
  },
  {
    id: 'CMD-953',
    client: 'Nordic Seafood Hamburg',
    fromCity: 'Hamburg',
    fromCountry: 'DE',
    toCity: 'Stockholm',
    toCountry: 'SE',
    ldm: 5.6,
    weightTons: 7.8,
    pallets: 14,
    tempReq: 4,
    tempZone: 'Zona 2 (Spate)',
    revenueEur: 1120,
    status: 'Nealocat',
    loadingWindow: 'Luni 15:00 - 16:30',
    deliveryDeadline: 'Marți 16:00',
    stackable: false,
    palletExchange: true,
  },
  {
    id: 'CMD-954',
    client: 'Bayernland Molkerei',
    fromCity: 'München',
    fromCountry: 'DE',
    toCity: 'Almere',
    toCountry: 'NL',
    ldm: 2.0,
    weightTons: 2.5,
    pallets: 5,
    tempReq: 2,
    tempZone: 'Zona 2 (Spate)',
    revenueEur: 480,
    status: 'Nealocat',
    loadingWindow: 'Luni 15:00 - 16:00',
    deliveryDeadline: 'Marți 13:00',
    stackable: false,
    palletExchange: false,
  },
];

export const SMART_GROUPAGE_MATCHES: SmartGroupageMatch[] = [
  {
    id: 'match-1',
    targetTrailerId: 'BH 67 STS',
    targetSegmentLabel: 'Viena (🇦🇹 AT) → Köln (🇩🇪 DE) → Rotterdam (🇳🇱 NL)',
    sourceType: 'Client Recurent',
    clientName: 'Agrana Fruit Austria GmbH',
    pickupCity: 'Viena (Inzersdorf)',
    pickupCountry: 'AT',
    deliveryCity: 'Rotterdam (Waalhaven)',
    deliveryCountry: 'NL',
    ldmRequired: 3.0,
    weightTons: 4.2,
    tempRequired: 4,
    detourKm: 14,
    extraTimeMinutes: 35,
    estimatedRateEur: 550,
    incrementalCostEur: 180,
    netContributionEur: 370,
    matchScore: 98,
    loadingWindow: 'Azi, 15:30 - 17:00',
    compatibleWithBulkhead: true,
  },
  {
    id: 'match-2',
    targetTrailerId: 'BH 75 STS',
    targetSegmentLabel: 'Hamburg (🇩🇪 DE) → Malmö (🇸🇪 SE) → Stockholm (🇸🇪 SE)',
    sourceType: 'Comandă Internă',
    clientName: 'Nordic Seafood Hamburg',
    pickupCity: 'Hamburg (Altona)',
    pickupCountry: 'DE',
    deliveryCity: 'Stockholm (Årsta)',
    deliveryCountry: 'SE',
    ldmRequired: 5.6,
    weightTons: 7.8,
    tempRequired: 4,
    detourKm: 18,
    extraTimeMinutes: 45,
    estimatedRateEur: 1120,
    incrementalCostEur: 245,
    netContributionEur: 875,
    matchScore: 95,
    loadingWindow: 'Azi, 15:00 - 16:30',
    compatibleWithBulkhead: true,
  },
  {
    id: 'match-3',
    targetTrailerId: 'BH 69 STS',
    targetSegmentLabel: 'München (🇩🇪 DE) → Frankfurt (🇩🇪 DE) → Almere (🇳🇱 NL)',
    sourceType: 'Bursă (TimoCom / Trans.eu)',
    clientName: 'Bayernland Dairy Logistics',
    pickupCity: 'München (Ost)',
    pickupCountry: 'DE',
    deliveryCity: 'Almere (Haven)',
    deliveryCountry: 'NL',
    ldmRequired: 2.0,
    weightTons: 2.5,
    tempRequired: 2,
    detourKm: 9,
    extraTimeMinutes: 25,
    estimatedRateEur: 480,
    incrementalCostEur: 110,
    netContributionEur: 370,
    matchScore: 92,
    loadingWindow: 'Azi, 15:00 - 16:00',
    compatibleWithBulkhead: true,
  },
  {
    id: 'match-4',
    targetTrailerId: 'BH 91 STS',
    targetSegmentLabel: 'Venlo (🇳🇱 NL) → Kolding (🇩🇰 DK) → Göteborg (🇸🇪 SE)',
    sourceType: 'Client Recurent',
    clientName: 'Nature’s Pride Holland BV',
    pickupCity: 'Venlo (Fresh Park)',
    pickupCountry: 'NL',
    deliveryCity: 'Göteborg (Partihallarna)',
    deliveryCountry: 'SE',
    ldmRequired: 3.2,
    weightTons: 3.8,
    tempRequired: 4,
    detourKm: 4,
    extraTimeMinutes: 20,
    estimatedRateEur: 790,
    incrementalCostEur: 140,
    netContributionEur: 650,
    matchScore: 96,
    loadingWindow: 'Azi, 15:45 - 16:45',
    compatibleWithBulkhead: true,
  },
];

export const INITIAL_PROPOSALS: ClientShipmentProposal[] = [
  {
    id: 'prop-101',
    trailerId: 'BH 67 STS',
    segmentLabel: 'Viena → Köln → Rotterdam (Disponibil comercial: 4.2 LDM @ +4°C)',
    clientName: 'Agrana Fruit Austria GmbH',
    clientContact: 'lukas.weber@agrana.at',
    routeFrom: 'Viena',
    routeTo: 'Rotterdam',
    ldmRequested: 3.0,
    availableLdmOnSegment: 4.2,
    weightTons: 4.2,
    tempRequired: 4,
    offeredPriceEur: 550,
    incrementalCostEur: 180,
    estimatedContributionEur: 370,
    detourKm: 14,
    loadingWindow: '10 Nov, 15:30 - 17:00',
    latestDelivery: '11 Nov, 16:00',
    status: 'Pending review',
    submittedAt: 'Acum 6 minute',
    hasConflictWarning: true,
    conflictDetails:
      'ATENȚIE REGULĂ SOFT-LOCK: Această propunere solicită 3.0 LDM din cei 4.2 LDM disponibili (rămân 1.2 LDM). Spațiul NU este blocat definitiv până la acceptare, însă clientul "AlpenMilch Salzburg" tocmai a deschis formularul pentru o ofertă concurentă de 2.4 LDM (incompatibilă simultan: 3.0 + 2.4 = 5.4 > 4.2 LDM).',
  },
  {
    id: 'prop-102',
    trailerId: 'BH 67 STS',
    segmentLabel: 'Viena → Köln → Rotterdam (Disponibil comercial: 4.2 LDM @ +4°C)',
    clientName: 'AlpenMilch Salzburg GmbH',
    clientContact: 'dispo@alpenmilch.at',
    routeFrom: 'St. Pölten (pe traseul Viena -> Linz)',
    routeTo: 'Rotterdam',
    ldmRequested: 2.4,
    availableLdmOnSegment: 4.2,
    weightTons: 3.6,
    tempRequired: 4,
    offeredPriceEur: 490,
    incrementalCostEur: 165,
    estimatedContributionEur: 325,
    detourKm: 11,
    loadingWindow: '10 Nov, 17:30 - 18:30',
    latestDelivery: '11 Nov, 15:30',
    status: 'Pending review',
    submittedAt: 'Acum 2 minute',
    hasConflictWarning: true,
    conflictDetails:
      'CONFLICT CAPACITATE: Solicită 2.4 LDM din 4.2 LDM. Incompatibilă simultan cu propunerea Agrana Fruit (3.0 LDM, Contribuție +370 € vs +325 €). Dacă accepți Agrana Fruit, rămân doar 1.2 LDM liberi.',
  },
  {
    id: 'prop-103',
    trailerId: 'BH 75 STS',
    segmentLabel: 'Rotterdam → Hamburg → Malmö → Stockholm (Disponibil: 6.8 LDM @ +4°C)',
    clientName: 'Royal FloraHolland Logistics',
    clientContact: 'transport@floraholland.nl',
    routeFrom: 'Hamburg',
    routeTo: 'Stockholm',
    ldmRequested: 4.0,
    availableLdmOnSegment: 6.8,
    weightTons: 4.8,
    tempRequired: 4,
    offeredPriceEur: 820,
    incrementalCostEur: 210,
    estimatedContributionEur: 610,
    detourKm: 16,
    loadingWindow: '10 Nov, 15:30 - 17:00',
    latestDelivery: '11 Nov, 15:00',
    status: 'Pending review',
    submittedAt: 'Acum 19 minute',
    hasConflictWarning: false,
  },
];

export const TRAILER_SWAP_SCENARIOS: TrailerSwapScenario[] = [
  {
    id: 'swap-1',
    code: 'SWAP-RO-DE-01',
    title: 'Schimb Reciproc pe A1/M1 (Hegyeshalom HU/AT) — Optimizare Tahograf & Retur Bază Oradea',
    scenarioType: 'RECIPROCAL_SWAP',
    scenarioBadge: 'Scenariul 1 · Schimb Reciproc (A ↔ B)',
    description:
      'Tractorul BH 46 STS (plecat din Oradea cu remorca BH 67 STS spre Rotterdam) schimbă remorca la Hegyeshalom cu tractorul BH 50 STS (care vine dinspre Germania cu remorca BH 45 STS destinată descărcării în Oradea). Șoferul din Oradea se întoarce diseară acasă la bază, iar șoferul odihnit continuă spre Viena/Rotterdam fără pauză de 11h pe traseu.',
    tractorA: {
      tractorId: 'BH 46 STS',
      currentTrailerId: 'BH 67 STS (Export HU → AT → DE → NL)',
      driverNames: 'Popa Ioan (1 șofer)',
      isDoubleCrew: false,
      currentPosition: 'Győr (🇭🇺 HU) — M1 km 119',
      originDirection: 'Oradea (🇷🇴 RO) → Vest',
      destinationBeforeSwap: 'Rotterdam (🇳🇱 NL)',
      etaAtMeetingPoint: '13:45 (peste 38 min)',
      distanceToMeetingKm: 48,
      remainingDriveHours: '4h 30m azi (necesită repaus 11h după Viena)',
      tachoLegalAfterSwap: true,
      driverConfirmed: true,
      defaultPostAction: 'ORADEA_BASE',
      customDestinationHint: 'Descarcă remorca preluată BH 45 STS mâine la 07:00 în Oradea',
    },
    tractorB: {
      tractorId: 'BH 50 STS',
      currentTrailerId: 'BH 45 STS (Retur DE → Oradea, 13.6 LDM)',
      driverNames: 'Bălan Cristian (1 șofer)',
      isDoubleCrew: false,
      currentPosition: 'Parndorf (🇦🇹 AT) — A4 km 42',
      originDirection: 'Viena / München → Est',
      destinationBeforeSwap: 'Oradea (🇷🇴 RO)',
      etaAtMeetingPoint: '13:52 (peste 45 min)',
      distanceToMeetingKm: 29,
      remainingDriveHours: '8h 40m azi (tocmai a finalizat repausul de 11h în AT)',
      tachoLegalAfterSwap: true,
      driverConfirmed: true,
      defaultPostAction: 'CONTINUE_NEW_TRAILER_ROUTE',
      customDestinationHint: 'Preia BH 67 STS și livrează Viena (15:30) -> Köln -> Rotterdam la timp',
    },
    meetingPoint: {
      name: 'Autohof Hegyeshalom / Nickelsdorf (Granița HU/AT, M1/A4)',
      highway: 'M1 / E60 Exit 171',
      country: 'HU / AT',
      coordinates: '47.9214° N, 17.1368° E',
      waitWindowMinutes: 7,
      parkingSecurity: 'Parcare păzită TAPA Nivel 2 · Iluminată · Camere CCTV',
      alternativePoints: [
        { name: 'OMV Mosonmagyaróvár (M1 km 162)', diffKm: -9, waitMin: 14 },
        { name: 'ASFINAG Raststation Göttlesbrunn (A4)', diffKm: 24, waitMin: 19 },
      ],
    },
    compatibilityChecks: {
      fifthWheelHeightOk: true,
      frigoPowerCableOk: true,
      tachoHoursLegalOk: true,
      deliverySlaSaved: true,
      cargoTrackLiveSync: true,
    },
    financialImpact: {
      savedHours: 11.0,
      emptyKmDelta: -85,
      slaPenaltyAvoidedEur: 450,
      netBenefitEur: 620,
    },
    approvalStatus: 'Gata de aprobare dispecer',
  },
  {
    id: 'swap-2',
    code: 'SWAP-UNI-02',
    title: 'Preluare Unilaterală în München (A8/A99) — Preluare Semiremorcă de Tractor Solo',
    scenarioType: 'UNILATERAL_TAKEOVER',
    scenarioBadge: 'Scenariul 2 · Preluare Unilaterală (Tractor Solo preia Remorca)',
    description:
      'Tractorul B 506 STS a ajuns la limita zilnică de condus (1h 12m rămas) la München. Tractorul solo IF 74 STS (cu 9h de condus disponibile) preia unilateral semiremorca BH 74 STS pentru a asigura descărcarea la Stuttgart, în timp ce primul tractor intră în repaus legal.',
    tractorA: {
      tractorId: 'B 506 STS',
      currentTrailerId: 'BH 74 STS (la descărcare în München/Stuttgart)',
      driverNames: 'Rus Vasile (1 șofer)',
      isDoubleCrew: false,
      currentPosition: 'München Logistikpark (🇩🇪 DE)',
      originDirection: 'Oradea → Germania Sud',
      destinationBeforeSwap: 'Stuttgart (🇩🇪 DE)',
      etaAtMeetingPoint: '13:30 (La locație)',
      distanceToMeetingKm: 0,
      remainingDriveHours: '1h 12m azi (necesită repaus zilnic)',
      tachoLegalAfterSwap: true,
      driverConfirmed: true,
      defaultPostAction: 'NEW_DESTINATION_EMPTY_OR_LOAD',
      customDestinationHint: 'Rămâne la odihnă în München, mâine 06:00 preia remorca frigorifică din depozit',
    },
    tractorB: {
      tractorId: 'IF 74 STS (Tractor Solo)',
      currentTrailerId: 'Fără remorcă (Cap tractor disponibil în Ulm/Augsburg)',
      driverNames: 'Stan Gabriel (1 șofer — 9h 00m disponibile)',
      isDoubleCrew: false,
      currentPosition: 'Augsburg (🇩🇪 DE) — A8',
      originDirection: 'Stuttgart → München',
      destinationBeforeSwap: 'Disponibil alocare',
      etaAtMeetingPoint: '14:05 (peste 35 min)',
      distanceToMeetingKm: 54,
      remainingDriveHours: '9h 00m disponibili azi',
      tachoLegalAfterSwap: true,
      driverConfirmed: true,
      defaultPostAction: 'CONTINUE_NEW_TRAILER_ROUTE',
      customDestinationHint: 'Preia BH 74 STS, descarcă Stuttgart la 16:30 și continuă conform instrucțiunilor TMS',
    },
    meetingPoint: {
      name: 'GVZ Logistikpark München-Ost / A99 Haar',
      highway: 'A99 / A8 Exit München-Ost',
      country: 'DE',
      coordinates: '48.1372° N, 11.7511° E',
      waitWindowMinutes: 35,
      parkingSecurity: 'Terminal Logistic Securizat cu Poartă',
      alternativePoints: [
        { name: 'Autohof Dasing (A8 km 48)', diffKm: -32, waitMin: 12 },
      ],
    },
    compatibilityChecks: {
      fifthWheelHeightOk: true,
      frigoPowerCableOk: true,
      tachoHoursLegalOk: true,
      deliverySlaSaved: true,
      cargoTrackLiveSync: true,
    },
    financialImpact: {
      savedHours: 6.5,
      emptyKmDelta: 54,
      slaPenaltyAvoidedEur: 600,
      netBenefitEur: 510,
    },
    approvalStatus: 'Gata de aprobare dispecer',
  },
  {
    id: 'swap-3',
    code: 'SWAP-TEAM-03',
    title: 'Preluare cu Echipaj de 2 Șoferi în Suben (AT/DE) — Cursă Expres Pharma/Fresh spre Benelux',
    scenarioType: 'DOUBLE_CREW_RELAY',
    scenarioBadge: 'Scenariul 3 · Preluare Echipaj 2 Șoferi (Relay Rapid)',
    description:
      'Tractorul BH 56 STS (1 șofer, Mureșan Dan, care trage remorca BH 69 STS spre Frankfurt/Almere) mai are doar 2h 05m de condus legal și riscă să întârzie descărcarea din Frankfurt (SLA 21:30). Tractorul B 507 STS cu echipaj de 2 șoferi (Nemeș + Crișan, program de 20h condus/echipaj) preia remorca în Suben/Regensburg și garantează livrarea la timp.',
    tractorA: {
      tractorId: 'BH 56 STS',
      currentTrailerId: 'BH 69 STS (Szolnok → München → Frankfurt → Almere)',
      driverNames: 'Mureșan Dan (1 șofer — limită tahograf în 2h)',
      isDoubleCrew: false,
      currentPosition: 'Regensburg (🇩🇪 DE) — A3',
      originDirection: 'Passau / Suben → Nord-Vest',
      destinationBeforeSwap: 'Almere (🇳🇱 NL)',
      etaAtMeetingPoint: '14:10 (în parcare)',
      distanceToMeetingKm: 12,
      remainingDriveHours: '2h 05m (intră obligatoriu în repaus 9h/11h)',
      tachoLegalAfterSwap: true,
      driverConfirmed: true,
      defaultPostAction: 'RETURN_ORIGIN_DIR',
      customDestinationHint: 'Intră în pauză legală 9h în Autohof, apoi preia încărcare München -> Oradea',
    },
    tractorB: {
      tractorId: 'B 507 STS (Echipaj 2x)',
      currentTrailerId: 'BH 91 STS (sau disponibil pentru releu)',
      driverNames: 'Nemeș Florin + Crișan Mihai (Echipaj 2 șoferi)',
      isDoubleCrew: true,
      currentPosition: 'Nürnberg Sud (🇩🇪 DE) — A3',
      originDirection: 'Germania Centrală',
      destinationBeforeSwap: 'Frankfurt / Benelux',
      etaAtMeetingPoint: '14:25 (peste 15 min)',
      distanceToMeetingKm: 22,
      remainingDriveHours: '17h 30m disponibili în regim de echipaj (Reg. 561/2006)',
      tachoLegalAfterSwap: true,
      driverConfirmed: false,
      defaultPostAction: 'CONTINUE_NEW_TRAILER_ROUTE',
      customDestinationHint: 'Continuă fără oprire: München -> Frankfurt (21:00) -> Almere (06:30)',
    },
    meetingPoint: {
      name: 'Autohof Neumarkt / Parsberg (A3 între Regensburg și Nürnberg)',
      highway: 'Autobahn A3 Exit 94',
      country: 'DE',
      coordinates: '49.1802° N, 11.7215° E',
      waitWindowMinutes: 15,
      parkingSecurity: 'Autohof 24/7 · Cântar axă disponibil · Spațiu manevră decuplare',
      alternativePoints: [
        { name: 'Raststätte Jura West (A3)', diffKm: 8, waitMin: 10 },
      ],
    },
    compatibilityChecks: {
      fifthWheelHeightOk: true,
      frigoPowerCableOk: true,
      tachoHoursLegalOk: true,
      deliverySlaSaved: true,
      cargoTrackLiveSync: true,
    },
    financialImpact: {
      savedHours: 9.5,
      emptyKmDelta: -40,
      slaPenaltyAvoidedEur: 800,
      netBenefitEur: 890,
    },
    approvalStatus: 'Așteaptă confirmare șoferi',
  },
  {
    id: 'swap-4',
    code: 'SWAP-DROP-04',
    title: 'Eliberare Anticipată Remorcă în Venlo (🇳🇱 NL) pentru Încărcare Urgentă Client Unilever',
    scenarioType: 'EARLY_TRAILER_RELEASE',
    scenarioBadge: 'Scenariul 4 · Eliberare Anticipată Remorcă (Drop & Hook)',
    description:
      'Remorca BH 91 STS este descărcată rapid și eliberată anticipat la Greenport Venlo pentru a fi poziționată cu 6 ore mai devreme la rampa clientului Unilever, în timp ce tractorul IF 96 STS preia o altă încărcare de retur spre Viena.',
    tractorA: {
      tractorId: 'IF 96 STS',
      currentTrailerId: 'BH 91 STS (la descărcare în Venlo)',
      driverNames: 'Dobre Mihai (1 șofer)',
      isDoubleCrew: false,
      currentPosition: 'Venlo Trade Port (🇳🇱 NL) — A67',
      originDirection: 'Rotterdam → Venlo',
      destinationBeforeSwap: 'Venlo (🇳🇱 NL)',
      etaAtMeetingPoint: '14:30 (La locație)',
      distanceToMeetingKm: 0,
      remainingDriveHours: '5h 30m azi',
      tachoLegalAfterSwap: true,
      driverConfirmed: true,
      defaultPostAction: 'RETURN_ORIGIN_DIR',
      customDestinationHint: 'Preia marfă retur Venlo -> Viena / Oradea conform instrucțiunilor TMS',
    },
    tractorB: {
      tractorId: 'IF 20 STS (Tractor Bază Venlo)',
      currentTrailerId: 'Fără remorcă (Disponibil terminal)',
      driverNames: 'Kramer Jan (1 șofer)',
      isDoubleCrew: false,
      currentPosition: 'Greenport Venlo (🇳🇱 NL)',
      originDirection: 'Venlo Local',
      destinationBeforeSwap: 'Terminal Unilever',
      etaAtMeetingPoint: '14:40 (peste 10 min)',
      distanceToMeetingKm: 4,
      remainingDriveHours: '8h 00m disponibili',
      tachoLegalAfterSwap: true,
      driverConfirmed: true,
      defaultPostAction: 'CONTINUE_NEW_TRAILER_ROUTE',
      customDestinationHint: 'Poziționează remorca la rampa Unilever și finalizează încărcarea',
    },
    meetingPoint: {
      name: 'Greenport Venlo Logistics Campus (A67 / A73)',
      highway: 'A67 Exit 39 Venlo',
      country: 'NL',
      coordinates: '51.3850° N, 6.1450° E',
      waitWindowMinutes: 10,
      parkingSecurity: 'Parcare securizată terminal · Acces rampă',
      alternativePoints: [
        { name: 'Autohof Nettetal (A61 km 3)', diffKm: 12, waitMin: 14 },
      ],
    },
    compatibilityChecks: {
      fifthWheelHeightOk: true,
      frigoPowerCableOk: true,
      tachoHoursLegalOk: true,
      deliverySlaSaved: true,
      cargoTrackLiveSync: true,
    },
    financialImpact: {
      savedHours: 6.0,
      emptyKmDelta: -65,
      slaPenaltyAvoidedEur: 500,
      netBenefitEur: 720,
    },
    approvalStatus: 'Gata de aprobare dispecer',
  },
];

export const FUTURE_AVAILABILITY_SLOTS: FutureAvailabilitySlot[] = [
  {
    id: 'avail-1',
    trailerId: 'BH 74 STS',
    tractorId: 'IF 74 STS',
    driverName: 'Stan Gabriel',
    availableDate: 'Marți, 10 Nov (Mâine)',
    availableTime: '08:00',
    city: 'Stuttgart',
    country: 'DE',
    regionCorridor: 'Germania Sud (Baden-Württemberg / Bavaria)',
    freeLdm: 13.6,
    totalLdm: 13.6,
    tempCapabilities: 'Bi-Temp (-25°C la +25°C) · Perete despărțitor',
    preferredReturnCorridor: 'Stuttgart / München → Viena → Oradea (🇷🇴 RO)',
    suggestedClientsCount: 6,
    status: 'Eliberată anticipat (Swap)',
  },
  {
    id: 'avail-2',
    trailerId: 'BH 69 STS',
    tractorId: 'B 507 STS',
    driverName: 'Nemeș Florin (Echipaj)',
    availableDate: 'Marți, 10 Nov (Mâine)',
    availableTime: '13:30',
    city: 'Almere / Amsterdam',
    country: 'NL',
    regionCorridor: 'Benelux (Olanda / Belgia)',
    freeLdm: 13.6,
    totalLdm: 13.6,
    tempCapabilities: 'Bi-Temp (-25°C la +25°C) · 33 EWP',
    preferredReturnCorridor: 'Benelux → Ruhr (🇩🇪 DE) → HU → Oradea (🇷🇴 RO)',
    suggestedClientsCount: 9,
    status: '100% Liberă (După descărcare)',
  },
  {
    id: 'avail-3',
    trailerId: 'BH 67 STS',
    tractorId: 'BH 50 STS',
    driverName: 'Bălan Cristian',
    availableDate: 'Marți, 10 Nov (Mâine)',
    availableTime: '16:00',
    city: 'Rotterdam',
    country: 'NL',
    regionCorridor: 'Benelux (Port Rotterdam / Venlo)',
    freeLdm: 13.6,
    totalLdm: 13.6,
    tempCapabilities: 'Bi-Temp (-25°C la +25°C) · Certificat Pharma GDP',
    preferredReturnCorridor: 'Rotterdam / Venlo → Frankfurt → Viena → RO',
    suggestedClientsCount: 11,
    status: '100% Liberă (După descărcare)',
  },
  {
    id: 'avail-4',
    trailerId: 'BH 75 STS',
    tractorId: 'IF 96 STS',
    driverName: 'Kovács Attila',
    availableDate: 'Miercuri, 11 Nov',
    availableTime: '07:30',
    city: 'Stockholm',
    country: 'SE',
    regionCorridor: 'Scandinavia (Suedia Sud / Malmö / Göteborg)',
    freeLdm: 13.6,
    totalLdm: 13.6,
    tempCapabilities: 'Bi-Temp (-25°C la +25°C) · Ferry-ready',
    preferredReturnCorridor: 'Stockholm / Malmö → Hamburg → NL / RO',
    suggestedClientsCount: 4,
    status: '100% Liberă (După descărcare)',
  },
];

// ============================================================================
// SMART GROUPAGE — CELE 8 CRITERII OBLIGATORII & COMPARATOR MULTI-VARIANTĂ
// + OPORTUNITĂȚI DE TRANSFER DE MARFĂ ÎNTRE REMORCI (CROSS-DOCK / TRANSSHIPMENT)
// ============================================================================

export interface GroupageCandidateVariant {
  id: string;
  orderId: string;
  variantRank: 'Varianta 1 (Recomandată AI)' | 'Varianta 2 (Alternativă Directă)' | 'Varianta 3 (Cu Transfer Marfă în Hub)';
  trailerId: string;
  tractorId: string;
  driverName: string;
  // Cele 8 criterii obligatorii cerute de Blue Trans Spedition:
  criterion1_existingRoute: string; // 1. Traseu existent
  criterion2_segmentLdmAvailable: number; // 2. Capacitate LDM pe segmente
  criterion2_segmentLabel: string;
  criterion3_tempCompatibility: string; // 3. Temperatura solicitată
  criterion4_timeWindowsFit: string; // 4. Ore de încărcare și descărcare
  criterion5_extraKm: number; // 5. Kilometri suplimentari
  criterion6_extraTimeMin: number; // 6. Timp suplimentar (minute)
  criterion7_incrementalCostEur: number; // 7. Cost incremental (€)
  criterion8_revenueEur: number; // 8. Venit (€)
  criterion8_estimatedProfitEur: number; // 8. Profit estimat (€) = Venit - Cost incremental
  involvesCargoTransfer: boolean;
  transferNote?: string;
  aiScore: number;
}

export interface CargoTransferOpportunity {
  id: string;
  code: string;
  title: string;
  donorTrailerId: string; // Remorca din care se transferă marfa
  receiverTrailerId: string; // Remorca în care se încarcă marfa
  cargoDescription: string;
  ldmTransferred: number;
  palletsCount: number;
  weightTons: number;
  tempReq: number;
  transferHubName: string;
  transferHubCity: string;
  transferWindow: string;
  // Condiții obligatorii: unde transferul este permis și fezabil
  permittedChecks: {
    noCustomsOrClientSealLock: boolean; // Fără sigiliu vamal/client interzis la rupere
    clientContractAllowsCrossDock: boolean; // Contractul permite transbordare în hub autorizat
    controlledTempRampAvailable: boolean; // Rampă cu temperatură controlată (+4°C)
    handlingEquipmentReady: boolean; // Transpaletă electrică / stivuitor disponibil
    etaSyncFeasible: boolean; // Sincronizare ETA între cele două remorci
  };
  operationalBenefit: string;
  kmSaved: number;
  transferCostEur: number; // Cost manipulare hub / rampă
  netGainEur: number; // Economie netă generată
  status: 'Fezabil & Permis — Gata de Aprobare' | 'Aprobat în Planning';
}

export const MULTI_VARIANT_GROUPAGE_ANALYSES: Record<string, GroupageCandidateVariant[]> = {
  'CMD-951': [
    {
      id: 'var-951-a',
      orderId: 'CMD-951',
      variantRank: 'Varianta 1 (Recomandată AI)',
      trailerId: 'BH 67 STS',
      tractorId: 'BH 46 STS',
      driverName: 'Popa Ioan',
      criterion1_existingRoute: 'Oradea → Budapesta → Viena → Köln → Rotterdam',
      criterion2_segmentLdmAvailable: 5.4,
      criterion2_segmentLabel: 'Seg 3–4 (Viena → Köln → Rotterdam): 5.4 LDM liberi (4.2 LDM în Zona 2)',
      criterion3_tempCompatibility: 'Compatibil 100%: Zona 2 setată la +4°C (cerut: +4°C)',
      criterion4_timeWindowsFit: 'Încadrare perfectă: ETA Viena 15:00 (fereastră 15:30–17:00) · ETA Rotterdam Marți 15:30',
      criterion5_extraKm: 14,
      criterion6_extraTimeMin: 35,
      criterion7_incrementalCostEur: 180,
      criterion8_revenueEur: 550,
      criterion8_estimatedProfitEur: 370,
      involvesCargoTransfer: false,
      aiScore: 98,
    },
    {
      id: 'var-951-b',
      orderId: 'CMD-951',
      variantRank: 'Varianta 2 (Alternativă Directă)',
      trailerId: 'BH 69 STS',
      tractorId: 'BH 56 STS',
      driverName: 'Mureșan Dan',
      criterion1_existingRoute: 'Szolnok → München → Frankfurt → Almere',
      criterion2_segmentLdmAvailable: 5.4,
      criterion2_segmentLabel: 'După descărcarea din München (3.2 LDM) + 2.2 LDM existenți = 5.4 LDM liberi',
      criterion3_tempCompatibility: 'Compatibil (+2°C în Zona 2, acceptat în toleranța +2..+4°C)',
      criterion4_timeWindowsFit: 'Necesită abatere prin Viena (+65 min față de ruta directă M1 → A8)',
      criterion5_extraKm: 68,
      criterion6_extraTimeMin: 80,
      criterion7_incrementalCostEur: 265,
      criterion8_revenueEur: 550,
      criterion8_estimatedProfitEur: 285,
      involvesCargoTransfer: false,
      aiScore: 84,
    },
    {
      id: 'var-951-c',
      orderId: 'CMD-951',
      variantRank: 'Varianta 3 (Cu Transfer Marfă în Hub)',
      trailerId: 'BH 74 STS → BH 67 STS',
      tractorId: 'B 506 STS / BH 46 STS',
      driverName: 'Rus Vasile → Popa Ioan',
      criterion1_existingRoute: 'Preluare locală Viena + Consolidare prin Cross-Dock în Hub Viena/Suben',
      criterion2_segmentLdmAvailable: 4.0,
      criterion2_segmentLabel: '4.0 LDM în BH 74 STS până în Hub, apoi consolidare pe BH 67 STS',
      criterion3_tempCompatibility: 'Compatibil +4°C (rampă refrigerată certificată la transfer)',
      criterion4_timeWindowsFit: 'Adaugă 40 min manipulare transpaletă la rampa de cross-dock',
      criterion5_extraKm: 28,
      criterion6_extraTimeMin: 60,
      criterion7_incrementalCostEur: 230,
      criterion8_revenueEur: 550,
      criterion8_estimatedProfitEur: 320,
      involvesCargoTransfer: true,
      transferNote: 'Permis fără sigiliu vamal · Necesită 20 min transbordare 7 paleți în Hub',
      aiScore: 88,
    },
  ],
  'CMD-954': [
    {
      id: 'var-954-a',
      orderId: 'CMD-954',
      variantRank: 'Varianta 1 (Recomandată AI)',
      trailerId: 'BH 69 STS',
      tractorId: 'BH 56 STS',
      driverName: 'Mureșan Dan',
      criterion1_existingRoute: 'Szolnok → München → Frankfurt → Almere',
      criterion2_segmentLdmAvailable: 5.4,
      criterion2_segmentLabel: 'Seg 2–3 (München → Frankfurt → Almere): 5.4 LDM liberi după descărcarea din München',
      criterion3_tempCompatibility: 'Compatibil 100%: Zona 2 setată exact la +2°C (cerut: +2°C)',
      criterion4_timeWindowsFit: 'Camionul descarcă în München la 14:30 și încarcă Bayernland la 15:00 (0 așteptare)',
      criterion5_extraKm: 9,
      criterion6_extraTimeMin: 25,
      criterion7_incrementalCostEur: 110,
      criterion8_revenueEur: 480,
      criterion8_estimatedProfitEur: 370,
      involvesCargoTransfer: false,
      aiScore: 97,
    },
    {
      id: 'var-954-b',
      orderId: 'CMD-954',
      variantRank: 'Varianta 2 (Alternativă Directă)',
      trailerId: 'BH 67 STS',
      tractorId: 'BH 46 STS',
      driverName: 'Popa Ioan',
      criterion1_existingRoute: 'Oradea → Viena → Köln → Rotterdam (cu deviere München & Almere)',
      criterion2_segmentLdmAvailable: 5.4,
      criterion2_segmentLabel: 'Seg 3–4: 5.4 LDM liberi',
      criterion3_tempCompatibility: 'Necesită ajustare setpoint Zona 2 de la +4°C la +2°C (permis)',
      criterion4_timeWindowsFit: 'Deviere mare spre Almere după Rotterdam (+110 km)',
      criterion5_extraKm: 115,
      criterion6_extraTimeMin: 105,
      criterion7_incrementalCostEur: 270,
      criterion8_revenueEur: 480,
      criterion8_estimatedProfitEur: 210,
      involvesCargoTransfer: false,
      aiScore: 76,
    },
  ],
};

export const CARGO_TRANSFER_OPPORTUNITIES: CargoTransferOpportunity[] = [
  {
    id: 'xfer-1',
    code: 'XFER-DE-NL-01',
    title: 'Transfer 2.2 LDM (5 Paleți) din BH 69 STS în BH 67 STS la Hub-ul Frigo Frankfurt/Köln',
    donorTrailerId: 'BH 69 STS',
    receiverTrailerId: 'BH 67 STS',
    cargoDescription: 'CMD-912 · 5 Euro-paleți Lactate (+2..+4°C) cu descărcare în zona Ruhr/Benelux',
    ldmTransferred: 2.2,
    palletsCount: 5,
    weightTons: 3.2,
    tempReq: 4,
    transferHubName: 'Nagel-Group Cross-Dock Frigo Terminal Frankfurt-Süd',
    transferHubCity: 'Frankfurt (🇩🇪 DE)',
    transferWindow: 'Luni 21:30 – 22:00 (25 min manipulare)',
    permittedChecks: {
      noCustomsOrClientSealLock: true,
      clientContractAllowsCrossDock: true,
      controlledTempRampAvailable: true,
      handlingEquipmentReady: true,
      etaSyncFeasible: true,
    },
    operationalBenefit:
      'Eliberează complet Zona 2 din BH 69 STS încă din Frankfurt, permițându-i să preia o partidă nouă de 7.6 LDM Frankfurt → Amsterdam (+920 €), în timp ce BH 67 STS consolidează livrările pe direcția Köln → Rotterdam.',
    kmSaved: 145,
    transferCostEur: 65,
    netGainEur: 485,
    status: 'Fezabil & Permis — Gata de Aprobare',
  },
  {
    id: 'xfer-2',
    code: 'XFER-AT-DE-02',
    title: 'Transfer 3.0 LDM (7 Paleți) în Hub-ul Blue Trans Oradea înainte de ieșirea pe Nădlac/Borș II',
    donorTrailerId: 'BH 74 STS',
    receiverTrailerId: 'BH 67 STS',
    cargoDescription: 'CMD-903 · 7 Euro-paleți Refrigerate (+4°C) Oradea → Köln',
    ldmTransferred: 3.0,
    palletsCount: 7,
    weightTons: 4.4,
    tempReq: 4,
    transferHubName: 'Baza Logistică Frigo Blue Trans Spedition Oradea (Rampa 1–2)',
    transferHubCity: 'Oradea (🇷🇴 RO)',
    transferWindow: 'La plecarea din bază (Cross-dock intern 15 min)',
    permittedChecks: {
      noCustomsOrClientSealLock: true,
      clientContractAllowsCrossDock: true,
      controlledTempRampAvailable: true,
      handlingEquipmentReady: true,
      etaSyncFeasible: true,
    },
    operationalBenefit:
      'Scutește remorca BH 74 STS (care are destinație finală Stuttgart în Germania de Sud) de un ocol de 360 km spre Köln, mutând partida de Köln pe BH 67 STS care trece direct pe A3 prin Köln spre Rotterdam.',
    kmSaved: 360,
    transferCostEur: 0,
    netGainEur: 540,
    status: 'Fezabil & Permis — Gata de Aprobare',
  },
];


