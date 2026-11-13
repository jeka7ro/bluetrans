import React, { useState } from 'react';
import {
  ShieldCheck,
  Navigation,
  Clock,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Wrench,
  FileCheck2,
  FileText,
  Repeat,
  AlertTriangle,
  MapPin,
  Send,
  UserCheck,
  Copy,
  Check,
  Upload,
  ExternalLink,
  Download,
  Plus,
  Receipt,
} from 'lucide-react';
import {
  TrailerUnit,
  TrailerSwapScenario,
  formatCountryBadge,
} from '../data/mockData';
import { EuropeLiveMap } from './EuropeLiveMap';
import { FLEET_VIN_DATABASE, getRealFleet } from './FleetVinAndDossierModal';
import { VehiclePdfViewerModal } from './VehiclePdfViewerModal';
import { getVehiclePdfDocs, useFleetPdfCatalog } from '../data/fleetDocuments';
import { buildDriverPortalUrl } from '../data/authClient';
import {
  apiUploadDriverPod,
  type DriverExpenseRecord,
  type PodFileRecord,
  type SubmitDriverExpenseInput,
} from '../data/tmsSyncClient';
import {
  Planning7DaysView,
  type HourlyPlanningCard,
} from './Planning7DaysView';
import type { ActiveLoadItem } from './OrdersAndTripsView';
import { DriverExpensesPanel } from './DriverExpensesPanel';
import {
  buildSingleCardMapTrip,
  CORRIDOR_ROUTES,
  getPlanningCardLifecycle,
} from '../utils/planningRouteSync';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  computeHgvRouteMetrics,
  downloadTruckCorridorGpx,
  resolveHgvVehicleProfile,
} from '../utils/googleMapsLinks';
import {
  getPlanningWeekMeta,
  getRomaniaZonedNow,
} from '../utils/romaniaTime';

function normalizePlateKey(raw = ''): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function stripCommercialEuroFromDriverText(text = ''): string {
  return String(text || '').replace(/\s*\(\+?\d[\d.,]*\s*€\)/g, '');
}

interface DriverPortalViewProps {
  trailers: TrailerUnit[];
  selectedDriverTrailerId: string;
  onSelectDriverTrailerId: (trailerId: string) => void;
  isStrictDriverRole: boolean;
  swapScenarios: TrailerSwapScenario[];
  onConfirmDriverSwap?: (scenarioId: string, side: 'A' | 'B') => void;
  authToken?: string;
  tenantId?: string;
  podFiles?: PodFileRecord[];
  planningCards?: HourlyPlanningCard[];
  activeLoads?: ActiveLoadItem[];
  driverExpenses?: DriverExpenseRecord[];
  serverCheckins?: Record<string, boolean>;
  serverMessages?: Record<
    string,
    Array<{ id: string; from: 'driver' | 'admin'; text: string; time: string }>
  >;
  onDriverRampCheckin?: (trailerId: string, segmentId: string, checked: boolean) => void;
  onDriverTachoUpdate?: (trailerId: string, tachoStatus: string) => void;
  onDriverChatSend?: (trailerId: string, text: string) => void;
  onPodUploaded?: (pod: PodFileRecord) => void;
  onSubmitDriverExpense?: (
    payload: SubmitDriverExpenseInput,
    localPreview?: { dataUrl?: string; mimeType?: string; sizeBytes?: number }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteDriverExpense?: (id: string) => Promise<void>;
  onUpdateDriverExpenseStatus?: (
    id: string,
    status: 'Înregistrat' | 'Validat Admin'
  ) => Promise<void>;
  showMobileBottomDock?: boolean;
}

interface TripAdminInfo {
  adminName: string;
  adminRole: string;
  phone: string;
  radioChannel: string;
  tripCode: string;
  tractorModel: string;
  trailerModel: string;
  frigoUnit: string;
  sealNumber: string;
  fuelLevelPct: number;
  adBluePct: number;
  driveAxleTons: number;
  grossWeightTons: number;
  highwayCorridor: string;
  adminInstructions: string[];
}

const TRIP_ADMIN_BY_TRAILER: Record<string, TripAdminInfo> = {
  'BH 67 STS': {
    adminName: 'Elena Munteanu',
    adminRole: 'Admin Cursă · Dispecer Coordonator Coridor Vest (AT / DE / NL)',
    phone: '+40 744 812 390',
    radioChannel: 'Canal Dispecerat Vest #01 · GPS Cargo Track Activ',
    tripCode: 'TR-4821',
    tractorModel: 'Volvo FH 500 I-Save Euro 6 (2025)',
    trailerModel: 'Schmitz Cargobull S.KO Cool Dual-Zone (13.6m Bi-Temp)',
    frigoUnit: 'Thermo King SLXi Spectrum Whisper Pro (Bi-Temp)',
    sealNumber: 'RO-SEAL-88412 (Intact)',
    fuelLevelPct: 82,
    adBluePct: 88,
    driveAxleTons: 9.6,
    grossWeightTons: 34.4,
    highwayCorridor: 'M35 → M3 → M0 → M1 → A4 → A1 → A8 → A3 → A61 → A67 → A15',
    adminInstructions: [
      'Viena (Agrana Fruit, Rampa 14): Descarci 4.2 LDM din Zona 2 (+4°C). Păstrează Zona 1 închisă la -18°C pentru Unilever Rotterdam.',
      'După descărcarea din Viena, verifică blocarea peretelui despărțitor (Bulkhead) la 6.8m și transmite fotografia CMR-ului semnat.',
      'Traseu obligatoriu aprobat: A1 Linz → A8 Passau/Suben → A3 Regensburg/Nürnberg/Köln → A67 Venlo → A15 Rotterdam.',
    ],
  },
  'BH 69 STS': {
    adminName: 'Elena Munteanu',
    adminRole: 'Admin Cursă · Dispecer Coordonator Coridor Vest (AT / DE / NL)',
    phone: '+40 744 812 390',
    radioChannel: 'Canal Dispecerat Vest #01 · GPS Cargo Track Activ',
    tripCode: 'TR-4819',
    tractorModel: 'Scania R 500 Super Euro 6 (2023)',
    trailerModel: 'Krone Cool Liner Duoplex (13.6m Bi-Temp)',
    frigoUnit: 'Carrier Vector HE 19 MT (Multi-Temp)',
    sealNumber: 'HU-SEAL-55109 (Intact)',
    fuelLevelPct: 74,
    adBluePct: 79,
    driveAxleTons: 10.1,
    grossWeightTons: 35.6,
    highwayCorridor: 'M4 → M0 → M1 → A4 → A1 → A8 → A99 → A8 → A5 → A3 → A12 → A27',
    adminInstructions: [
      'München (Bayernland, Poarta 6): Descarci 2.2 LDM la +4°C. Atenție la fereastra de rampă 16:00–16:45.',
      'La Autohof Neumarkt (A3) este pregătit scenariul de Releu Echipaj dacă timpul de condus scade sub 2h.',
    ],
  },
  'BH 75 STS': {
    adminName: 'Radu Cristea',
    adminRole: 'Admin Cursă · Dispecer Coordonator Scandinavia & Nord (DE / DK / SE)',
    phone: '+40 745 219 640',
    radioChannel: 'Canal Dispecerat Nord #02 · Poduri Storebælt & Øresund',
    tripCode: 'TR-4825',
    tractorModel: 'Scania R 500 Highline (SCANDEXPRES · IF 96 STS)',
    trailerModel: 'Schmitz Cargobull S.KO Cool (13.6m Frigo)',
    frigoUnit: 'Thermo King Advancer A-500 (Mod Continuu +4°C)',
    sealNumber: 'NL-SEAL-99204 (Intact)',
    fuelLevelPct: 89,
    adBluePct: 91,
    driveAxleTons: 8.9,
    grossWeightTons: 31.2,
    highwayCorridor: 'A12 → A1 → A7 → E45 → E20 (Pod Storebælt & Pod Øresund) → E6 → E4',
    adminInstructions: [
      'Hamburg (Dr. Oetker Logistics, Rampa 3): Descarci 2.4 LDM (+4°C).',
      'Traseu 100% terestru aprobat spre Suedia: A7 Flensburg → E45 Kolding → E20 Pod Storebælt → E20 Pod Øresund (bilet BroBizz activ pe parbriz) → E6 Malmö → E4 Stockholm.',
    ],
  },
  'BH 74 STS': {
    adminName: 'Elena Munteanu',
    adminRole: 'Admin Cursă · Dispecer Coordonator Coridor Sud-Germania (AT / DE)',
    phone: '+40 744 812 390',
    radioChannel: 'Canal Dispecerat Vest #01 · GPS Cargo Track Activ',
    tripCode: 'TR-4818',
    tractorModel: 'Scania S 500 Next Gen Super (2025 · B 506 STS)',
    trailerModel: 'Schmitz Cargobull S.KO Cool Dual-Zone (13.6m Bi-Temp)',
    frigoUnit: 'Thermo King SLXi Spectrum (Bi-Temp -18°C / +4°C)',
    sealNumber: 'RO-SEAL-77310 (Intact)',
    fuelLevelPct: 68,
    adBluePct: 82,
    driveAxleTons: 9.8,
    grossWeightTons: 35.8,
    highwayCorridor: 'M35 → M3 → M1 → A4 → A1 → A8 → A99 → A8',
    adminInstructions: [
      'München (Hochland Süd): După descărcarea celor 2.8 LDM rămân 4.0 LDM liberi până la Stuttgart.',
      'Menține Zona 1 la -18°C și Zona 2 la +4°C până la descărcarea finală din Stuttgart (19:30).',
    ],
  },
  'BH 91 STS': {
    adminName: 'Radu Cristea',
    adminRole: 'Admin Cursă · Dispecer Coordonator Scandinavia & Benelux (NL / DK / SE)',
    phone: '+40 745 219 640',
    radioChannel: 'Canal Dispecerat Nord #02 · Echipaj 2 Șoferi',
    tripCode: 'TR-4817',
    tractorModel: 'Scania S 500 Next Gen Super (2x Șoferi · B 507 STS)',
    trailerModel: 'Schmitz Cargobull S.KO Cool Multi-Temp (13.6m Bi-Temp)',
    frigoUnit: 'Carrier Vector HE 19 MT (+2°C / +6°C)',
    sealNumber: 'NL-SEAL-41028 (Intact)',
    fuelLevelPct: 92,
    adBluePct: 95,
    driveAxleTons: 8.7,
    grossWeightTons: 30.8,
    highwayCorridor: 'A15 → A67 → A40 → A2 → A1 → A7 → E45 → E20 (Storebælt & Øresund) → E6',
    adminInstructions: [
      'Greenport Venlo (A67): Încărcare grupaj 3.2 LDM pentru Kolding (DK).',
      'Regim Echipaj 2 Șoferi: Schimb la volan la fiecare 4h30m fără oprire de odihnă pe A1 Bremen → A7 Hamburg → E20 Poduri Danemarca → E6 Göteborg.',
    ],
  },
  'BH 23 STS': {
    adminName: 'Radu Cristea',
    adminRole: 'Admin Cursă · Coordonator Divizia Express & Schmitz Smart',
    phone: '+40 745 219 640',
    radioChannel: 'Canal Express #03 · Livrare Rapidă Dedicată',
    tripCode: 'EXP-104',
    tractorModel: 'Scania S 500 Next Gen Super (2025 · B 560 STS)',
    trailerModel: 'Schmitz S.KO Cool Smart Executive (2025)',
    frigoUnit: 'Thermo King Advancer A-500 (+4°C)',
    sealNumber: 'EXP-SEAL-104 (Intact)',
    fuelLevelPct: 86,
    adBluePct: 90,
    driveAxleTons: 8.8,
    grossWeightTons: 28.4,
    highwayCorridor: 'A3/M35 → M3 → M0 → M1 → A4 (Oradea → Viena)',
    adminInstructions: [
      'Livrare Express la Viena (13:15): Descarci cei 3.4 LDM la hub-ul logistic Schwechat.',
      'După descărcare, disponibil pentru preluare marfă urgentă Viena → Oradea.',
    ],
  },
  'BH 31 STS': {
    adminName: 'Radu Cristea',
    adminRole: 'Admin Cursă · Coordonator Divizia Express & Schmitz Bi-Temp',
    phone: '+40 745 219 640',
    radioChannel: 'Canal Express #03 · Bi-Temp',
    tripCode: 'EXP-108',
    tractorModel: 'Scania R 500 Super (2026 · B 871 STS)',
    trailerModel: 'Schmitz S.KO Cool Bi-Temp (-18°C / +4°C)',
    frigoUnit: 'Thermo King SLXi Spectrum Bi-Temp',
    sealNumber: 'EXP-SEAL-108 (Intact)',
    fuelLevelPct: 79,
    adBluePct: 85,
    driveAxleTons: 8.9,
    grossWeightTons: 29.2,
    highwayCorridor: 'M5 → M0 → M1 → D2 → D1 → A5 (Szeged → Bratislava → Viena)',
    adminInstructions: [
      'Bratislava (D2 Logistics Park): Descarci 2.0 LDM refrigerate (+4°C) la ora 14:00.',
      'Continuare pe D2/A5 spre Viena pentru descărcarea finală la ora 18:00.',
    ],
  },
};

export const DriverPortalView: React.FC<DriverPortalViewProps> = ({
  trailers,
  selectedDriverTrailerId,
  onSelectDriverTrailerId,
  isStrictDriverRole,
  swapScenarios,
  onConfirmDriverSwap,
  authToken = '',
  tenantId = 'blue-trans',
  podFiles = [],
  planningCards = [],
  activeLoads = [],
  driverExpenses = [],
  serverCheckins,
  serverMessages,
  onDriverRampCheckin,
  onDriverTachoUpdate,
  onDriverChatSend,
  onPodUploaded,
  onSubmitDriverExpense,
  onDeleteDriverExpense,
  onUpdateDriverExpenseStatus,
  showMobileBottomDock = false,
}) => {
  const realFleet = React.useMemo(() => getRealFleet(), []);
  const selectedNorm = normalizePlateKey(selectedDriverTrailerId);

  const activeTrailer: TrailerUnit = React.useMemo(() => {
    const direct = trailers.find(
      (t) =>
        normalizePlateKey(t.id) === selectedNorm ||
        normalizePlateKey(t.tractorId.split(' (')[0]) === selectedNorm
    );
    if (direct) return direct;
    const fleetTrailer = realFleet.trailers.find(
      (v) => normalizePlateKey(v.plate) === selectedNorm
    );
    const fleetTractor = realFleet.tractors.find(
      (v) => normalizePlateKey(v.plate) === selectedNorm
    );
    const fleetMatch = fleetTrailer || fleetTractor;
    if (fleetMatch) {
      return {
        ...trailers[0],
        id: fleetMatch.plate,
        tractorId: fleetTractor ? fleetTractor.plate : fleetMatch.plate,
        trailerType: trailers[0].trailerType,
        driver1: {
          ...trailers[0].driver1,
          name: trailers[0].driver1.name,
        },
        segments: trailers[0].segments,
      };
    }
    return trailers[0];
  }, [trailers, realFleet, selectedNorm]);

  const activeTractorPlate = activeTrailer.tractorId.split(' (')[0];
  const adminInfo =
    TRIP_ADMIN_BY_TRAILER[activeTrailer.id] || TRIP_ADMIN_BY_TRAILER['BH 67 STS'];

  const [mapFocusCardId, setMapFocusCardId] = useState<string>('CORRIDOR');
  const [prefilledExpenseTripRef, setPrefilledExpenseTripRef] = useState<string>('');
  const [driverSectionTab, setDriverSectionTab] = useState<
    'PLANNING' | 'ROUTE' | 'EXPENSES' | 'ADMIN'
  >('PLANNING');

  const assignedPlanningCards = React.useMemo(() => {
    const trKey = normalizePlateKey(activeTrailer.id);
    const tractorKey = normalizePlateKey(activeTractorPlate);
    const matchedCards: HourlyPlanningCard[] = planningCards
      .filter((c) => {
        const cTr = normalizePlateKey(c.trailerId);
        const cTractor = c.tractorPlate ? normalizePlateKey(c.tractorPlate) : '';
        return (
          cTr === trKey ||
          (tractorKey && (cTractor === tractorKey || cTr === tractorKey))
        );
      })
      .map((c) => {
        const { revenueEur: _hidden, ...safeCard } = c;
        return safeCard;
      });

    const linkedIds = new Set(
      matchedCards.map((c) => c.linkedLoadId).filter(Boolean) as string[]
    );
    const roNow = getRomaniaZonedNow();
    const roWeek = getPlanningWeekMeta(0, roNow);
    const todayIso = roNow.toPlainDate().toString();

    const normRoute = (raw: string) =>
      raw
        .replace(/\s*\([^)]*\)/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
    const clientFirstWord = (raw: string) =>
      raw
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .trim()
        .split(/\s+/)[0] || '';

    for (const load of activeLoads) {
      if (normalizePlateKey(load.trailerId) !== trKey) continue;
      if (linkedIds.has(load.id)) continue;
      const loadRouteKey = normRoute(load.route);
      const loadToken = clientFirstWord(load.client);
      const alreadyMatched = matchedCards.some(
        (c) =>
          normRoute(c.routeLabel) === loadRouteKey &&
          loadToken.length >= 4 &&
          clientFirstWord(c.clientName) === loadToken
      );
      if (alreadyMatched) continue;
      const tempMatch = String(load.temp || '+4').match(/-?\d+(?:\.\d+)?/);
      const tempNum = tempMatch ? parseFloat(tempMatch[0]) : 4;
      matchedCards.push({
        id: `load-${load.id}`,
        weekOffset: 0,
        isoDate: todayIso,
        dayIndex: Math.max(0, roWeek.days.findIndex((d) => d.isoDate === todayIso)),
        hourSlot: '08:00',
        clientName: load.client,
        ldm: load.ldm,
        weightTons: load.weightTons,
        cargoSpec: load.cargoDesc,
        routeLabel: load.route.replace(/\s*\([^)]*\)/g, ''),
        kmDist: 'Coridor Activ',
        tempCelsius: Number.isFinite(tempNum) ? tempNum : 4,
        trailerId: load.trailerId,
        driverName: activeTrailer.driver1.name,
        tractorPlate: activeTractorPlate,
        colorTheme: 'blue',
        completed: load.status === 'Finalizată',
        linkedLoadId: load.id,
      });
    }

    return matchedCards.sort((a, b) => {
      const la = getPlanningCardLifecycle(a, trailers, roNow);
      const lb = getPlanningCardLifecycle(b, trailers, roNow);
      const order = (lc: string) => (lc === 'in_transit' ? 0 : lc === 'planned' ? 1 : 2);
      const oa = order(la.lifecycle);
      const ob = order(lb.lifecycle);
      if (oa !== ob) return oa - ob;
      const dateCmp = la.isoDate.localeCompare(lb.isoDate);
      if (dateCmp !== 0) return dateCmp;
      return a.hourSlot.localeCompare(b.hourSlot);
    });
  }, [planningCards, activeLoads, activeTrailer, activeTractorPlate, trailers]);

  const activeLoadById = React.useMemo(() => {
    const m = new Map<string, ActiveLoadItem>();
    for (const l of activeLoads) {
      m.set(l.id, l);
    }
    return m;
  }, [activeLoads]);

  const focusedMapTrip = React.useMemo(() => {
    if (mapFocusCardId === 'CORRIDOR') return undefined;
    const card = assignedPlanningCards.find((c) => c.id === mapFocusCardId);
    if (!card) return undefined;
    return buildSingleCardMapTrip(card, trailers, getRomaniaZonedNow());
  }, [mapFocusCardId, assignedPlanningCards, trailers]);

  React.useEffect(() => {
    setMapFocusCardId('CORRIDOR');
  }, [activeTrailer.id]);

  // Interactive Driver Check-in & Status State per Segment
  const [completedSegments, setCompletedSegments] = useState<Record<string, boolean>>({});
  const [cmrUploadedSegments, setCmrUploadedSegments] = useState<Record<string, boolean>>({});
  const [uploadingSegId, setUploadingSegId] = useState<string | null>(null);
  const [tachoMode, setTachoMode] = useState<string>(activeTrailer.driver1.tachoStatus);
  const [driverMessages, setDriverMessages] = useState<
    { sender: 'ADMIN' | 'DRIVER'; author: string; time: string; text: string }[]
  >([
    {
      sender: 'ADMIN',
      author: `${adminInfo.adminName} (Admin Cursă)`,
      time: '08:15',
      text: adminInfo.adminInstructions[0],
    },
    {
      sender: 'DRIVER',
      author: `${activeTrailer.driver1.name} (${activeTrailer.id})`,
      time: '08:19',
      text: `Recepționat! Temperaturile sunt stabile (${activeTrailer.zone1Temp}°C / +${activeTrailer.zone2Temp}°C), sigiliul ${adminInfo.sealNumber} verificat în parcare.`,
    },
  ]);

  React.useEffect(() => {
    setTachoMode(activeTrailer.driver1.tachoStatus);
    setDriverMessages([
      {
        sender: 'ADMIN',
        author: `${adminInfo.adminName} (Admin Cursă)`,
        time: '08:15',
        text: adminInfo.adminInstructions[0],
      },
      {
        sender: 'DRIVER',
        author: `${activeTrailer.driver1.name} (${activeTrailer.id})`,
        time: '08:19',
        text: `Recepționat! Temperaturile sunt stabile (${activeTrailer.zone1Temp}°C / +${activeTrailer.zone2Temp}°C), sigiliul ${adminInfo.sealNumber} verificat în parcare.`,
      },
    ]);
  }, [activeTrailer.id]);

  const effectiveMessages = React.useMemo(() => {
    const srvList = serverMessages?.[activeTrailer.id] || [];
    if (srvList.length === 0) return driverMessages;
    return [
      ...driverMessages,
      ...srvList.map((m) => ({
        sender: (m.from === 'driver' ? 'DRIVER' : 'ADMIN') as 'ADMIN' | 'DRIVER',
        author:
          m.from === 'driver'
            ? `${activeTrailer.driver1.name} (${activeTrailer.id})`
            : `${adminInfo.adminName} (Admin Cursă)`,
        time: m.time,
        text: m.text,
      })),
    ];
  }, [driverMessages, serverMessages, activeTrailer, adminInfo.adminName]);

  const handlePodFileSelected = async (
    seg: { id: string; fromCity: string; toCity: string },
    file: File | undefined
  ) => {
    if (!file) return;
    setUploadingSegId(seg.id);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Citirea fișierului a eșuat.'));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      if (authToken) {
        const resp = await apiUploadDriverPod(authToken, tenantId, {
          trailerId: activeTrailer.id,
          segmentId: seg.id,
          segmentLabel: `${seg.fromCity} → ${seg.toCity}`,
          fileName: file.name,
          base64,
        });
        if (!resp.ok) {
          setStatusToast(resp.error || 'Eroare la încărcarea documentului CMR.');
          return;
        }
        if (resp.pod) onPodUploaded?.(resp.pod);
      }
      setCmrUploadedSegments((prev) => ({ ...prev, [seg.id]: true }));
      setStatusToast(
        `CMR-ul "${file.name}" pentru ${seg.toCity} a fost încărcat și transmis către Dispecerat!`
      );
    } catch (err) {
      setStatusToast(
        err instanceof Error ? err.message : 'Nu am putut citi fișierul selectat.'
      );
    } finally {
      setUploadingSegId(null);
    }
  };
  const [newMessageText, setNewMessageText] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [copiedDriverLink, setCopiedDriverLink] = useState(false);
  const [driverPdfTarget, setDriverPdfTarget] = useState<{
    plate: string;
    vin?: string;
    subtitle?: string;
  } | null>(null);
  const activeVinPair =
    FLEET_VIN_DATABASE[activeTrailer.id] || FLEET_VIN_DATABASE['BH 67 STS'];
  const pdfCatalog = useFleetPdfCatalog();
  const tractorDocsCount = getVehiclePdfDocs(
    activeVinPair.tractorPlate,
    activeVinPair.tractorVin,
    pdfCatalog
  ).length;
  const trailerDocsCount = getVehiclePdfDocs(
    activeTrailer.id,
    activeVinPair.trailerVin,
    pdfCatalog
  ).length;

  // Find if this driver's tractor/trailer is part of an active Trailer Swap Scenario
  const activeSwapScenario = swapScenarios.find(
    (s) =>
      s.tractorA.currentTrailerId === activeTrailer.id ||
      s.tractorB.currentTrailerId === activeTrailer.id
  );
  const swapSide: 'A' | 'B' | null = activeSwapScenario
    ? activeSwapScenario.tractorA.currentTrailerId === activeTrailer.id
      ? 'A'
      : 'B'
    : null;

  const handleSendDriverMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    const trimmed = newMessageText.trim();
    if (onDriverChatSend) {
      onDriverChatSend(activeTrailer.id, trimmed);
    } else {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      setDriverMessages((prev) => [
        ...prev,
        {
          sender: isStrictDriverRole ? 'DRIVER' : 'ADMIN',
          author: isStrictDriverRole
            ? `${activeTrailer.driver1.name} (Șofer ${activeTrailer.id})`
            : `${adminInfo.adminName} (Admin Cursă)`,
          time: timeStr,
          text: trimmed,
        },
      ]);
    }
    setNewMessageText('');
  };

  const driverExpensesCount = driverExpenses.filter(
    (e) => normalizePlateKey(e.trailerId) === normalizePlateKey(activeTrailer.id)
  ).length;

  const driverTabs: Array<{
    id: 'PLANNING' | 'EXPENSES' | 'ROUTE' | 'ADMIN';
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
    badge?: string;
  }> = [
    {
      id: 'PLANNING',
      label: `Hartă & Planning (${assignedPlanningCards.length})`,
      mobileLabel: 'Hartă',
      icon: Navigation,
      badge: assignedPlanningCards.length > 0 ? String(assignedPlanningCards.length) : undefined,
    },
    {
      id: 'EXPENSES',
      label: `Bonuri & Facturi (${driverExpensesCount})`,
      mobileLabel: 'Bonuri',
      icon: Receipt,
      badge: driverExpensesCount > 0 ? String(driverExpensesCount) : '+',
    },
    {
      id: 'ROUTE',
      label: `Rampe & Google Maps (${activeTrailer.segments.length})`,
      mobileLabel: 'Rampe',
      icon: MapPin,
      badge: activeTrailer.segments.length > 0 ? String(activeTrailer.segments.length) : undefined,
    },
    {
      id: 'ADMIN',
      label: 'Acte & Admin',
      mobileLabel: 'Acte',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Toast Notification */}
      {statusToast && (
        <div className="bg-[#0A84FF] text-white px-4 py-2.5 rounded-2xl shadow-lg text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
          <span>{statusToast}</span>
          <button
            onClick={() => setStatusToast(null)}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* ULTRA-CLEAN SINGLE CAB BAR */}
      <div className="tahoe-glass-elevated rounded-[18px] px-3.5 py-2.5 flex items-center justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[15px] sm:text-lg font-bold text-white tracking-tight truncate">
              {activeTrailer.driver1.name}
              {activeTrailer.driver2 ? ` + ${activeTrailer.driver2.name}` : ''}
            </h1>
            <span className="sm:hidden text-[10.5px] font-bold text-[#64D2FF] tabular-nums whitespace-nowrap shrink-0">
              {activeTrailer.id}
            </span>
            <span className="hidden sm:inline-block text-[11px] font-bold text-[#64D2FF] tabular-nums whitespace-nowrap shrink-0">
              {activeTrailer.tractorId.split(' (')[0]} · {activeTrailer.id}
            </span>
          </div>
          <div className="text-[10.5px] sm:text-[11px] font-medium text-white/65 tabular-nums truncate mt-0.5">
            {activeTrailer.zone1Temp}°/+{activeTrailer.zone2Temp}°C ·{' '}
            {activeTrailer.occupiedLdm.toFixed(1)}/{activeTrailer.totalLdm.toFixed(1)} LDM ·{' '}
            {activeTrailer.currentWeightTons.toFixed(1)}t
            <span className="hidden sm:inline">
              {' '}
              · {activeTrailer.driver1.remainingDailyDriveHours.toFixed(1)}h azi
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setDriverSectionTab('EXPENSES');
              window.setTimeout(() => {
                document
                  .getElementById('driver-expenses-panel')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 60);
            }}
            className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition whitespace-nowrap"
            style={{ color: '#ffffff' }}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffffff' }} />
            <Receipt className="w-3.5 h-3.5 shrink-0 hidden sm:block" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Bon / Factură</span>
          </button>

          {!isStrictDriverRole && (
            <>
              <select
                id="driver-portal-truck-select"
                aria-label="Selectează cabina șoferului"
                name="driverCabSelect"
                value={activeTrailer.id}
                onChange={(e) => onSelectDriverTrailerId(e.target.value)}
                className="max-w-[105px] sm:max-w-[175px] px-2.5 py-1.5 rounded-full tahoe-card-inner text-white text-[11px] sm:text-xs font-bold border border-white/20 focus:outline-none focus:border-[#0A84FF] cursor-pointer truncate"
              >
                {trailers.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.id} — {t.driver1.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      buildDriverPortalUrl(activeTrailer.id)
                    );
                    setCopiedDriverLink(true);
                    setTimeout(() => setCopiedDriverLink(false), 2200);
                  } catch {
                    // ignore clipboard error
                  }
                }}
                title={`Copiază linkul direct pentru șoferul ${activeTrailer.id}`}
                aria-label={`Copiază linkul direct pentru șoferul ${activeTrailer.id}`}
                className="hidden sm:inline-flex w-8 h-8 rounded-full tahoe-btn-secondary items-center justify-center cursor-pointer shrink-0"
              >
                {copiedDriverLink ? (
                  <Check className="w-3.5 h-3.5 text-[#30D158]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#64D2FF]" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Slim Single-Row Segmented Section Bar (Desktop + Admin preview; mobile SOFER uses bottom dock) */}
      <div
        className={`${
          showMobileBottomDock ? 'hidden lg:inline-flex' : 'inline-flex'
        } max-w-full overflow-x-auto no-scrollbar items-center gap-1 p-1 rounded-full tahoe-card-inner border border-white/10`}
      >
        {driverTabs.map((tab) => {
          const isAct = driverSectionTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDriverSectionTab(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                isAct
                  ? 'bg-[#0A84FF] text-white shadow-xs'
                  : 'text-white/75 hover:text-white'
              }`}
              style={isAct ? { color: '#ffffff' } : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* HARTA SUS: Unified Glass Map Card with Corridor Switcher & HGV 40T Google Maps + GPX */}
      {(driverSectionTab === 'PLANNING' || driverSectionTab === 'ROUTE') && (() => {
        const hgvProfile = resolveHgvVehicleProfile(activeTrailer.totalLdm);
        const activeMapRouteDef = focusedMapTrip?.routeDef || CORRIDOR_ROUTES[activeTrailer.id];
        const rawStops = activeMapRouteDef
          ? activeMapRouteDef.checkpoints.map((cp) => `${cp.city}, ${cp.country}`)
          : activeTrailer.routeSummary;
        const firstStop = rawStops[0] || 'Oradea';
        const lastStop = rawStops[rawStops.length - 1] || 'Rotterdam';
        const mapsHref = buildGoogleMapsDirectionsUrl(
          firstStop,
          lastStop,
          rawStops.slice(1, -1),
          { hgv: hgvProfile.isHgv }
        );
        const remainingKmForCalc = activeMapRouteDef
          ? Math.max(0, activeMapRouteDef.totalTechKm - activeMapRouteDef.drivenKm)
          : 950;
        const hgvCalc = computeHgvRouteMetrics(remainingKmForCalc, {
          isHgv: hgvProfile.isHgv,
          isDoubleCrew: activeTrailer.isDoubleCrew,
        });

        return (
        <div className="tahoe-glass rounded-[22px] overflow-hidden border border-white/15">
          <div className="px-2.5 sm:px-3.5 py-2 flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <Navigation className="w-3.5 h-3.5 text-[#64D2FF] shrink-0" />
              <select
                aria-label="Selectează traseul pe hartă"
                value={mapFocusCardId}
                onChange={(e) => setMapFocusCardId(e.target.value)}
                className="min-w-0 max-w-full sm:max-w-[380px] tahoe-card-inner rounded-full px-2.5 py-1 text-xs font-bold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF] cursor-pointer truncate"
              >
                <option value="CORRIDOR" className="bg-slate-900 text-white">
                  Coridor · {activeTrailer.routeSummary.join(' → ')}
                </option>
                {assignedPlanningCards.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.clientName}: {c.routeLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeMapRouteDef && activeMapRouteDef.coordinates.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    downloadTruckCorridorGpx(
                      `${activeTrailer.id}-${activeMapRouteDef.tripCode}`,
                      `${activeTrailer.id} · ${activeMapRouteDef.highwayCorridor}`,
                      activeMapRouteDef.coordinates,
                      activeMapRouteDef.checkpoints.map((cp) => ({
                        city: cp.city,
                        country: cp.country,
                        coords: cp.coords,
                      }))
                    );
                    setStatusToast(
                      `Fișierul GPX (${hgvProfile.shortBadge}) a fost descărcat — deschide-l în Sygic Truck / TomTom GO Expert / Garmin dēzl.`
                    );
                  }}
                  title="Descarcă ruta exactă de autostradă HGV 40T (.gpx) pentru GPS dedicat de camion (Garmin dēzl, TomTom GO Expert, Sygic Truck, OsmAnd)"
                  className="px-2 py-1 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] text-[10.5px] font-extrabold inline-flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3 h-3 shrink-0" />
                  <span>GPX 40T</span>
                </button>
              )}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                title={hgvProfile.googleMapsWarningRo}
                className="px-2.5 py-1 rounded-full bg-[#30D158]/20 hover:bg-[#30D158]/30 border border-[#30D158]/40 text-[#30D158] text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="sm:hidden">Maps · 40T</span>
                <span className="hidden sm:inline">Navighează în Google Maps (Coridor 40T)</span>
              </a>
            </div>
          </div>

          <div
            className="px-2.5 sm:px-3.5 py-1.5 border-b border-white/10 bg-amber-500/[0.06] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10.5px]"
            title={hgvProfile.googleMapsWarningRo}
          >
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/35 text-amber-300 font-extrabold shrink-0">
                {hgvProfile.shortBadge} · L 16.5m
              </span>
              <span className="text-white/80 font-semibold tabular-nums truncate">
                {hgvCalc.tachoBreakdownRo}
              </span>
            </div>
            <span className="text-white/55 text-[10px] hidden sm:inline truncate">
              Puncte obligatorii A3/M0/A4/A8/A67 injectate · Google Maps are doar profil auto (verifică &gt;7.5t / H 4.0m)
            </span>
          </div>

          <EuropeLiveMap
            trailers={[focusedMapTrip?.trailer || activeTrailer]}
            singleTripItem={focusedMapTrip}
            singleTripMode={Boolean(focusedMapTrip)}
            heightClass="h-[210px] sm:h-[260px]"
            hideRouteDetailsBelow
            embeddedInCard
            cleanCompactHud
          />
        </div>
        );
      })()}

      {/* SECTION A: CALENDAR PLANNING IDENTIC CU ADMIN (FILTRAT STRICT PE CAMIONUL ȘOFERULUI, READ-ONLY, FĂRĂ FACTURI) */}
      {driverSectionTab === 'PLANNING' && (
        <Planning7DaysView
          trailers={trailers}
          cards={assignedPlanningCards}
          driverScopeTrailerId={activeTrailer.id}
          driverTractorPlate={activeTractorPlate}
          cmrStatusLookup={(card) =>
            (card.linkedLoadId
              ? activeLoadById.get(card.linkedLoadId)?.cmrStatus
              : undefined) || 'CMR Activ'
          }
          onAttachExpenseForTrip={(tripRef) => {
            setPrefilledExpenseTripRef(tripRef);
            setDriverSectionTab('EXPENSES');
            window.setTimeout(() => {
              document
                .getElementById('driver-expenses-panel')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
          }}
        />
      )}

      {/* ROW 2: Route Operations OR Admin & Technical Docs */}
      {(driverSectionTab === 'ROUTE' || driverSectionTab === 'ADMIN') && (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {driverSectionTab === 'ROUTE' && (
        <div className="xl:col-span-12 space-y-5">
          <div className="tahoe-glass rounded-[26px] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                  FOAIE DE PARCURS ELECTRONICĂ · CORIDOR AUTORIZAT HGV
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-0.5">
                  <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-1.5">
                    <span>Ruta:</span>
                    {activeTrailer.routeSummary.map((stop, idx) => (
                      <React.Fragment key={`${stop}-${idx}`}>
                        {idx > 0 && <span className="text-white/40">→</span>}
                        <a
                          href={buildGoogleMapsPlaceUrl(stop)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Deschide ${stop} în Google Maps`}
                          className="inline-flex items-center gap-0.5 hover:text-[#64D2FF] underline decoration-white/25 hover:decoration-[#64D2FF] underline-offset-2 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#64D2FF]/80 shrink-0" />
                          <span>{stop}</span>
                        </a>
                      </React.Fragment>
                    ))}
                  </h2>
                  {activeTrailer.routeSummary.length >= 2 && (
                    <a
                      href={buildGoogleMapsDirectionsUrl(
                        activeTrailer.routeSummary[0],
                        activeTrailer.routeSummary[activeTrailer.routeSummary.length - 1],
                        activeTrailer.routeSummary.slice(1, -1),
                        { hgv: resolveHgvVehicleProfile(activeTrailer.totalLdm).isHgv }
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={resolveHgvVehicleProfile(activeTrailer.totalLdm).googleMapsWarningRo}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0A84FF]/15 hover:bg-[#0A84FF]/30 text-[#64D2FF] border border-[#0A84FF]/30 inline-flex items-center gap-1 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Navighează Coridor 40T</span>
                    </a>
                  )}
                </div>
                <div className="text-xs text-[#30D158] font-semibold mt-0.5">
                  Autostrăzi permise camion: {adminInfo.highwayCorridor}
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-full tahoe-card-inner text-xs font-bold text-white/85 tabular-nums">
                Sigiliu: {adminInfo.sealNumber}
              </div>
            </div>

            {/* Compact Tahograf Switcher inside Rampe & HGV */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl tahoe-card-inner border border-white/10">
              <span className="text-[11px] font-bold text-white/75 inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#30D158]" />
                Tahograf cabină ({activeTrailer.driver1.remainingDailyDriveHours.toFixed(1)}h disponibile)
              </span>
              <div className="flex items-center gap-1">
                {(['Conducere', 'Pauză / Odihnă', 'Altă muncă'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setTachoMode(mode);
                      onDriverTachoUpdate?.(activeTrailer.id, mode);
                      setStatusToast(
                        `Tahograf: "${mode}" (${adminInfo.adminName}).`
                      );
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                      tachoMode === mode
                        ? 'bg-[#0A84FF] text-white'
                        : 'bg-white/10 text-white/70 hover:text-white'
                    }`}
                    style={tachoMode === mode ? { color: '#ffffff' } : undefined}
                  >
                    {mode === 'Pauză / Odihnă' ? 'Pauză' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Segments / Stops Assigned to This Driver */}
            <div className="space-y-3.5">
              {activeTrailer.segments.map((seg, idx) => {
                const segPods = podFiles.filter(
                  (p) => p.trailerId === activeTrailer.id && p.segmentId === seg.id
                );
                const isDone = Boolean(
                  serverCheckins?.[`${activeTrailer.id}:${seg.id}`] ?? completedSegments[seg.id]
                );
                const isCmrDone = Boolean(cmrUploadedSegments[seg.id]) || segPods.length > 0;

                return (
                  <div
                    key={seg.id}
                    className={`tahoe-card-inner rounded-[22px] p-4 space-y-3 border transition ${isDone
                        ? 'border-[#30D158]/40 bg-[#30D158]/5'
                        : 'border-white/10'
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-[#0A84FF]/20 border border-[#0A84FF]/40 text-[#64D2FF] text-xs font-extrabold flex items-center justify-center tabular-nums">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-1.5">
                            <a
                              href={buildGoogleMapsPlaceUrl(`${seg.fromCity}, ${formatCountryBadge(seg.fromCountry)}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Deschide ${seg.fromCity} în Google Maps`}
                              className="inline-flex items-center gap-1 hover:text-[#64D2FF] underline decoration-white/25 hover:decoration-[#64D2FF] underline-offset-2 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#64D2FF]/80 shrink-0" />
                              <span>{seg.fromCity} ({formatCountryBadge(seg.fromCountry)})</span>
                            </a>
                            <span className="text-white/40">→</span>
                            <a
                              href={buildGoogleMapsPlaceUrl(`${seg.toCity}, ${formatCountryBadge(seg.toCountry)}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Deschide ${seg.toCity} în Google Maps`}
                              className="inline-flex items-center gap-1 hover:text-[#64D2FF] underline decoration-white/25 hover:decoration-[#64D2FF] underline-offset-2 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#64D2FF]/80 shrink-0" />
                              <span>{seg.toCity} ({formatCountryBadge(seg.toCountry)})</span>
                            </a>
                            <a
                              href={buildGoogleMapsDirectionsUrl(
                                `${seg.fromCity}, ${formatCountryBadge(seg.fromCountry)}`,
                                `${seg.toCity}, ${formatCountryBadge(seg.toCountry)}`,
                                [],
                                { hgv: resolveHgvVehicleProfile(activeTrailer.totalLdm).isHgv }
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Coridor HGV 40T ${seg.fromCity} → ${seg.toCity} (cu puncte autostradă; Google Maps folosește profil auto, verifică >7.5t)`}
                              className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A84FF]/15 hover:bg-[#0A84FF]/30 text-[#64D2FF] border border-[#0A84FF]/25 inline-flex items-center gap-1 transition-colors"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              <span>Maps 40T</span>
                            </a>
                            {isDone && (
                              <CheckCircle2 className="w-4 h-4 text-[#30D158]" />
                            )}
                          </div>
                          <div className="text-[11px] text-white/60 tabular-nums">
                            Distanță: <strong>{seg.distanceKm} km</strong> · Fereastră ETA:{' '}
                            <strong>
                              {seg.etaStart} → {seg.etaEnd}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 tabular-nums text-xs font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-[#0A84FF]/15 text-[#64D2FF]">
                          Ocupat: {seg.occupiedLdm.toFixed(1)} / {seg.totalLdm.toFixed(1)} LDM
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white">
                          {seg.payloadTons.toFixed(1)}t
                        </span>
                      </div>
                    </div>

                    {/* Technical Temperature & Compartment Breakdown on this Segment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-between">
                        <span className="text-sky-200 font-semibold">
                          Zona 1 Față ({seg.zone1Temp}°C):
                        </span>
                        <span className="font-bold text-white tabular-nums">
                          {seg.zone1OccupiedLdm.toFixed(1)} / {seg.zone1MaxLdm.toFixed(1)} LDM
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-between">
                        <span className="text-emerald-200 font-semibold">
                          Zona 2 Spate (+{seg.zone2Temp}°C):
                        </span>
                        <span className="font-bold text-white tabular-nums">
                          {seg.zone2OccupiedLdm.toFixed(1)} / {seg.zone2MaxLdm.toFixed(1)} LDM
                        </span>
                      </div>
                    </div>

                    {/* Loading & Unloading Operations for Driver */}
                    <div className="space-y-1.5 text-xs">
                      {seg.loadingOrders.map((ord, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-emerald-300 font-medium"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] font-bold">
                            ÎNCĂRCARE
                          </span>
                          <span>{ord}</span>
                        </div>
                      ))}
                      {seg.unloadingOrders.map((ord, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-amber-300 font-medium"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold">
                            DESCĂRCARE LA RAMPĂ
                          </span>
                          <span>{ord}</span>
                        </div>
                      ))}
                    </div>

                    {/* Driver Quick Action Buttons from Cab */}
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const nextVal = !isDone;
                          setCompletedSegments((prev) => ({
                            ...prev,
                            [seg.id]: nextVal,
                          }));
                          onDriverRampCheckin?.(activeTrailer.id, seg.id, nextVal);
                          setStatusToast(
                            `Segmentul ${seg.fromCity} → ${seg.toCity} a fost ${nextVal ? 'marcat ca finalizat' : 'redeschis'} de șoferul ${activeTrailer.driver1.name}.`
                          );
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${isDone
                            ? 'bg-[#30D158] text-slate-950'
                            : 'tahoe-btn-primary text-white'
                          }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isDone
                            ? 'Rampă & Descărcare Confirmată'
                            : 'Confirmă Sosire & Operare Rampă'}
                        </span>
                      </button>

                      <label
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${isCmrDone
                            ? 'bg-emerald-500/20 text-[#30D158] border border-[#30D158]/40'
                            : 'tahoe-btn-secondary text-white/85'
                          }`}
                      >
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.currentTarget.value = '';
                            void handlePodFileSelected(seg, f);
                          }}
                        />
                        {uploadingSegId === seg.id ? (
                          <span>Se încarcă CMR...</span>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {isCmrDone
                                ? `CMR Încărcat (${segPods.length || 1}) · Adaugă`
                                : 'Încarcă Foto / PDF CMR'}
                            </span>
                          </>
                        )}
                      </label>

                      {segPods.map((pod) => (
                        <a
                          key={pod.id}
                          href={
                            authToken
                              ? `/api/tms/driver/pod/${encodeURIComponent(pod.fileName)}?tenantId=${encodeURIComponent(tenantId)}&token=${encodeURIComponent(authToken)}`
                              : '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-[#64D2FF] flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="max-w-[140px] truncate">{pod.displayName}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Trailer Swap Alert for This Driver (if applicable) */}
          {activeSwapScenario && swapSide && (
            <div className="tahoe-glass rounded-[26px] p-5 border border-[#FF9F0A]/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-[#FF9F0A]" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9F0A]">
                      INSTRUCȚIUNE SMART TRAILER SWAP PE TRASEUL TĂU ({activeSwapScenario.code})
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {activeSwapScenario.title} — Punct întâlnire: {activeSwapScenario.meetingPoint.name}
                    </h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FF9F0A]/20 text-[#FF9F0A] text-xs font-bold">
                  Sync: {activeSwapScenario.meetingPoint.waitWindowMinutes} min
                </span>
              </div>

              <p className="text-xs text-white/80 leading-relaxed">
                {stripCommercialEuroFromDriverText(activeSwapScenario.description)}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-white/70 flex flex-wrap items-center gap-1.5">
                  <span>Locație GPS parcare:</span>
                  <a
                    href={buildGoogleMapsPlaceUrl(
                      activeSwapScenario.meetingPoint.coordinates ||
                        activeSwapScenario.meetingPoint.name
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Deschide parcarea în Google Maps"
                    className="font-bold text-[#64D2FF] hover:underline inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {activeSwapScenario.meetingPoint.highway} ({activeSwapScenario.meetingPoint.coordinates})
                    </span>
                  </a>
                </div>

                <button
                  onClick={() => {
                    if (onConfirmDriverSwap) {
                      onConfirmDriverSwap(activeSwapScenario.id, swapSide);
                    }
                    setStatusToast(
                      `Acordul tău pentru ${activeSwapScenario.code} la ${activeSwapScenario.meetingPoint.name} a fost înregistrat și trimis către Adminul Cursei (${adminInfo.adminName})!`
                    );
                  }}
                  className="px-4 py-2 rounded-full bg-[#FF9F0A] hover:bg-[#f59e0b] text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirmă Acordul Șoferului pt. Schimb Remorcă</span>
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* ADMINUL CURSEI (DISPECER COORDONATOR) + FIȘA TEHNICĂ + LIVE CHAT */}
        {driverSectionTab === 'ADMIN' && (
        <div className="xl:col-span-12 space-y-5">
          {/* Card 1: Adminul Cursei (Dispecerul Responsabil al Cursei) */}
          <div className="tahoe-glass-elevated rounded-[26px] p-5 space-y-4 border border-[#0A84FF]/35">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                  ADMINUL ACELEI CURSE · COORDONATOR DIRECT
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {adminInfo.adminName}
                </h3>
                <div className="text-xs text-white/65">{adminInfo.adminRole}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
                Online Tură
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="tahoe-card-inner rounded-xl p-3 flex items-center gap-2.5">
                <PhoneCall className="w-4 h-4 text-[#30D158] shrink-0" />
                <div>
                  <div className="text-[10px] text-white/50">Telefon Dispecer Cursă</div>
                  <div className="font-bold text-white tabular-nums">{adminInfo.phone}</div>
                </div>
              </div>
              <div className="tahoe-card-inner rounded-xl p-3 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#64D2FF] shrink-0" />
                <div>
                  <div className="text-[10px] text-white/50">Canal / Tură Activă</div>
                  <div className="font-bold text-white truncate">{adminInfo.radioChannel}</div>
                </div>
              </div>
            </div>

            {/* Instrucțiuni Tehnice & Operaționale de la Adminul Cursei */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white/85 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#FF9F0A]" />
                <span>Instrucțiuni obligatorii pentru cursa {adminInfo.tripCode}:</span>
              </div>
              <div className="space-y-2">
                {adminInfo.adminInstructions.map((inst, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl tahoe-card-inner text-xs text-white/85 leading-relaxed border-l-2 border-l-[#0A84FF]"
                  >
                    {inst}
                  </div>
                ))}
              </div>
            </div>

            {/* Mesagerie Directă Șofer <-> Adminul Cursei */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#64D2FF]" />
                  <span>Comunicare Directă Cabină ↔ Admin Cursă</span>
                </span>
                <span className="text-[10px] text-white/50">Timp real</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {effectiveMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl text-xs space-y-1 ${msg.sender === 'DRIVER'
                        ? 'bg-[#0A84FF]/20 border border-[#0A84FF]/35 ml-4'
                        : 'tahoe-card-inner mr-4'
                      }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span
                        className={
                          msg.sender === 'DRIVER' ? 'text-[#64D2FF]' : 'text-[#30D158]'
                        }
                      >
                        {msg.author}
                      </span>
                      <span className="text-white/45 tabular-nums">{msg.time}</span>
                    </div>
                    <div className="text-white/90 leading-snug">{msg.text}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendDriverMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={
                    isStrictDriverRole
                      ? 'Scrie raport către Adminul Cursei (rampă, sigiliu, temperatură)...'
                      : 'Trimite instrucțiune nouă către șofer...'
                  }
                  className="flex-1 tahoe-card-inner rounded-full px-4 py-2 text-xs text-white placeholder-white/45 border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full tahoe-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Trimite</span>
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Fișa Tehnică Detaliată a Camionului & Semiremorcii */}
          <div className="tahoe-glass rounded-[26px] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64D2FF]">
                FIȘA TEHNICĂ VEHICUL & REMORCĂ
              </span>
              <span className="text-xs font-bold text-[#30D158]">ITP & Tahograf OK</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Cap Tractor / Vehicul:</span>
                <span className="font-bold text-white">{adminInfo.tractorModel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Semiremorcă / Caroserie:</span>
                <span className="font-bold text-white">{adminInfo.trailerModel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Agregat Frigorific:</span>
                <span className="font-bold text-[#64D2FF]">{adminInfo.frigoUnit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Poziție Curentă GPS:</span>
                <a
                  href={buildGoogleMapsPlaceUrl(
                    `${activeTrailer.currentLocation.city}, ${formatCountryBadge(activeTrailer.currentLocation.country)}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Deschide locația curentă în Google Maps"
                  className="font-bold text-[#64D2FF] hover:underline inline-flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {activeTrailer.currentLocation.city} ({formatCountryBadge(activeTrailer.currentLocation.country)}) ·{' '}
                    {activeTrailer.currentLocation.speedKmh} km/h
                  </span>
                </a>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/60">Șofer Titular / Telefon:</span>
                <span className="font-bold text-white tabular-nums">
                  {activeTrailer.driver1.name} · {activeTrailer.driver1.phone}
                </span>
              </div>
            </div>

            {/* Acte Oficiale Scanate (CIV, Talon, RCA, CMR, ATP — Cap Tractor + Semiremorcă) */}
            <div className="pt-2.5 border-t border-white/10 space-y-2">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-white/65 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#30D158]" />
                <span>Dosar Acte Oficiale Vehicul (CIV · Talon · RCA · CMR · ATP)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDriverPdfTarget({
                      plate: activeVinPair.tractorPlate,
                      vin: activeVinPair.tractorVin,
                      subtitle: adminInfo.tractorModel,
                    })
                  }
                  className="px-3.5 py-2 rounded-full bg-[#0A84FF] hover:brightness-110 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                  style={{ color: '#ffffff' }}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>
                    Acte Cap Tractor ({activeVinPair.tractorPlate}) · {tractorDocsCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDriverPdfTarget({
                      plate: activeTrailer.id,
                      vin: activeVinPair.trailerVin,
                      subtitle: adminInfo.trailerModel,
                    })
                  }
                  className="px-3.5 py-2 rounded-full tahoe-card-inner border border-white/15 hover:border-[#0A84FF] text-xs font-extrabold text-white flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-[#30D158]" />
                  <span>
                    Acte Semiremorcă ({activeTrailer.id}) · {trailerDocsCount}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {/* ROW 2B: BONURI BENZINĂ / MOTORINĂ & FACTURI CHELTUIELI CURSĂ (ATAȘARE POZĂ / DOCUMENT PDF) */}
      {driverSectionTab === 'EXPENSES' && (
        <div id="driver-expenses-panel">
          <DriverExpensesPanel
            trailerId={activeTrailer.id}
            driverName={activeTrailer.driver1.name}
            tripOptions={[
              {
                ref: adminInfo.tripCode,
                label: `${adminInfo.tripCode} · Coridor ${activeTrailer.routeSummary.join(' → ')}`,
              },
              ...assignedPlanningCards.map((c) => ({
                ref: c.linkedLoadId || c.id,
                label: `${c.clientName} — ${c.routeLabel} (${c.hourSlot})`,
              })),
            ]}
            expenses={driverExpenses}
            authToken={authToken}
            tenantId={tenantId}
            canValidate={!isStrictDriverRole}
            prefilledTripRef={prefilledExpenseTripRef}
            onSubmitExpense={async (payload, localPreview) => {
              if (!onSubmitDriverExpense) {
                return { ok: false, error: 'Handler cheltuieli indisponibil.' };
              }
              const res = await onSubmitDriverExpense(payload, localPreview);
              if (res.ok) {
                setStatusToast(
                  `Bonul "${payload.vendorName}" (${payload.amount} ${payload.currency}) a fost înregistrat cu succes!`
                );
              }
              return res;
            }}
            onDeleteExpense={onDeleteDriverExpense}
            onUpdateExpenseStatus={onUpdateDriverExpenseStatus}
          />
        </div>
      )}

      {driverPdfTarget && (
        <VehiclePdfViewerModal
          plate={driverPdfTarget.plate}
          vin={driverPdfTarget.vin}
          vehicleSubtitle={driverPdfTarget.subtitle}
          onClose={() => setDriverPdfTarget(null)}
        />
      )}

      {/* Docked Sticky Bottom Toolbar on Mobile/Tablet for Driver One-Thumb Cab Ergonomics */}
      {showMobileBottomDock && (
        <nav
          aria-label="Meniu șofer mobil"
          className="tps-mobile-dock lg:hidden fixed inset-x-0 bottom-0 z-[45] flex items-center justify-between gap-0.5"
        >
          {driverTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = driverSectionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setDriverSectionTab(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`tps-nav-tab-btn tps-mobile-tab-item flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl border cursor-pointer ${
                  isActive
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-sm shadow-[#007AFF]/35'
                    : 'border-transparent text-white/70 hover:text-white'
                }`}
              >
                <span className="relative inline-flex items-center justify-center">
                  <Icon className="w-[17px] h-[17px] shrink-0" aria-hidden="true" />
                  {tab.badge && (
                    <span
                      aria-hidden="true"
                      className={`tps-mobile-tab-badge absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] px-1 rounded-full text-[8.5px] font-extrabold tabular-nums leading-none flex items-center justify-center ${
                        isActive
                          ? 'bg-white text-[#007AFF]'
                          : 'bg-[#FF9F0A] text-[#080d1a]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>
                <span className="text-[9.5px] sm:text-[10.5px] font-semibold mt-0.5 leading-tight tracking-[-0.015em] whitespace-nowrap max-w-full">
                  {tab.mobileLabel}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};