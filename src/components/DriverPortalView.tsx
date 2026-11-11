import React, { useState } from 'react';
import {
  Truck,
  ShieldCheck,
  ThermometerSnowflake,
  Navigation,
  Clock,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Wrench,
  Gauge,
  FileCheck2,
  FileText,
  Repeat,
  AlertTriangle,
  MapPin,
  Lock,
  Send,
  UserCheck,
  Sliders,
} from 'lucide-react';
import {
  TrailerUnit,
  TrailerSwapScenario,
  formatCountryBadge,
} from '../data/mockData';
import { EuropeLiveMap } from './EuropeLiveMap';
import { FLEET_VIN_DATABASE } from './FleetVinAndDossierModal';
import { VehiclePdfViewerModal } from './VehiclePdfViewerModal';
import { getVehiclePdfDocs, useFleetPdfCatalog } from '../data/fleetDocuments';

interface DriverPortalViewProps {
  trailers: TrailerUnit[];
  selectedDriverTrailerId: string;
  onSelectDriverTrailerId: (trailerId: string) => void;
  isStrictDriverRole: boolean;
  swapScenarios: TrailerSwapScenario[];
  onConfirmDriverSwap?: (scenarioId: string, side: 'A' | 'B') => void;
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
}) => {
  const activeTrailer =
    trailers.find((t) => t.id === selectedDriverTrailerId) || trailers[0];
  const adminInfo =
    TRIP_ADMIN_BY_TRAILER[activeTrailer.id] || TRIP_ADMIN_BY_TRAILER['BH 67 STS'];

  // Interactive Driver Check-in & Status State per Segment
  const [completedSegments, setCompletedSegments] = useState<Record<string, boolean>>({});
  const [cmrUploadedSegments, setCmrUploadedSegments] = useState<Record<string, boolean>>({});
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
  const [newMessageText, setNewMessageText] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);
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
        text: newMessageText.trim(),
      },
    ]);
    setNewMessageText('');
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {statusToast && (
        <div className="bg-[#0A84FF] text-white px-4 py-3 rounded-2xl shadow-lg text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
          <span>{statusToast}</span>
          <button
            onClick={() => setStatusToast(null)}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* TOP BANNER: Role Isolation Info + Driver Selector */}
      <div className="tahoe-glass-elevated rounded-[26px] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
              <Lock className="w-3.5 h-3.5" />
              {isStrictDriverRole
                ? 'MODUL ȘOFER AUTENTIFICAT · VIZIBILITATE RESTRICȚIONATĂ LA CURSA PROPRIE'
                : 'SUPERVIZARE CABINĂ ȘOFER & ADMIN CURSĂ'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30">
              Cursa {adminInfo.tripCode} · {activeTrailer.status}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {activeTrailer.driver1.name}
            {activeTrailer.driver2 ? ` + ${activeTrailer.driver2.name}` : ''} — Ansamblul{' '}
            <span className="text-[#64D2FF]">{activeTrailer.tractorId}</span> /{' '}
            <span className="text-[#30D158]">{activeTrailer.id}</span>
          </h1>
        </div>

        {/* Selector Camion / Șofer (pentru testarea fiecărui șofer din flotă) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="text-[11px] font-semibold text-white/60">
            Schimbă cabina șoferului:
          </div>
          <select
            value={activeTrailer.id}
            onChange={(e) => onSelectDriverTrailerId(e.target.value)}
            className="px-4 py-2.5 rounded-full tahoe-card-inner text-white text-xs sm:text-sm font-bold border border-white/20 focus:outline-none focus:border-[#0A84FF] cursor-pointer"
          >
            {trailers.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                {t.id} — {t.driver1.name} ({t.routeSummary[0]} →{' '}
                {t.routeSummary[t.routeSummary.length - 1]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ROW 1: 4 Technical & Operational KPI Cards for the Driver */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Ansamblu & Dimensiuni Tehnice */}
        <div className="tahoe-glass rounded-[22px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60 font-semibold">
            <span>ANSAMBLU ATRIBUIT</span>
            <Truck className="w-4 h-4 text-[#0A84FF]" />
          </div>
          <div className="text-lg font-extrabold text-white tracking-tight">
            {activeTrailer.tractorId} + {activeTrailer.id}
          </div>
          <div className="text-[11px] text-white/70 leading-snug">
            {adminInfo.tractorModel}
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-white/60">Încărcare LDM:</span>
            <span className="font-bold text-[#30D158]">
              {activeTrailer.occupiedLdm.toFixed(1)} / {activeTrailer.totalLdm.toFixed(1)} m
            </span>
          </div>
        </div>

        {/* Card 2: Regim Termic Frigo Bi-Temp & Perete Despărțitor */}
        <div className="tahoe-glass rounded-[22px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60 font-semibold">
            <span>PARAMETRI FRIGO BI-TEMP</span>
            <ThermometerSnowflake className="w-4 h-4 text-[#64D2FF]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 font-extrabold text-sm tabular-nums">
              Z1: {activeTrailer.zone1Temp}°C
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-extrabold text-sm tabular-nums">
              Z2: +{activeTrailer.zone2Temp}°C
            </div>
          </div>
          <div className="text-[11px] text-white/70 truncate">
            {adminInfo.frigoUnit}
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-white/60">Perete Bulkhead:</span>
            <span className="font-bold text-white">
              {(activeTrailer.segments[0]?.zone1MaxLdm ?? 6.8).toFixed(1)}m /{' '}
              {(activeTrailer.segments[0]?.zone2MaxLdm ?? 6.8).toFixed(1)}m
            </span>
          </div>
        </div>

        {/* Card 3: Tonaj, Sarcini pe Axe & Telemetrie Tehnică */}
        <div className="tahoe-glass rounded-[22px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60 font-semibold">
            <span>TONAJ & TELEMETRIE TEHNICĂ</span>
            <Gauge className="w-4 h-4 text-[#FF9F0A]" />
          </div>
          <div className="text-lg font-extrabold text-white tabular-nums">
            {activeTrailer.currentWeightTons.toFixed(1)}t{' '}
            <span className="text-xs font-normal text-white/55">
              / {activeTrailer.maxWeightTons.toFixed(1)}t marfă
            </span>
          </div>
          <div className="text-[11px] text-white/70 tabular-nums">
            Masă totală: <strong>{adminInfo.grossWeightTons}t</strong> · Axă motrică:{' '}
            <strong>{adminInfo.driveAxleTons}t</strong>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-[#30D158] font-bold">
              Motorină: {adminInfo.fuelLevelPct}%
            </span>
            <span className="text-[#64D2FF] font-bold">
              AdBlue: {adminInfo.adBluePct}%
            </span>
          </div>
        </div>

        {/* Card 4: Tahograf Digital & Reg. CE 561/2006 */}
        <div className="tahoe-glass rounded-[22px] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60 font-semibold">
            <span>TAHOGRAF DIGITAL</span>
            <Clock className="w-4 h-4 text-[#30D158]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-extrabold text-[#30D158] tabular-nums">
              {activeTrailer.driver1.remainingDailyDriveHours.toFixed(1)}h rămase azi
            </span>
            <span className="text-[11px] text-white/60 tabular-nums">
              Săpt: {activeTrailer.driver1.remainingWeeklyDriveHours}h
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            {(['Conducere', 'Pauză / Odihnă', 'Altă muncă'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setTachoMode(mode);
                  setStatusToast(
                    `Stare tahograf schimbată în "${mode}" și transmisă automat către Adminul Cursei (${adminInfo.adminName}).`
                  );
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${tachoMode === mode
                    ? 'bg-[#0A84FF] text-white'
                    : 'bg-white/10 text-white/65 hover:text-white'
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-white/60">Următoarea pauză 45m:</span>
            <span className="font-bold text-[#FF9F0A]">
              în {activeTrailer.driver1.nextRestRequiredInHours.toFixed(1)}h
            </span>
          </div>
        </div>
      </div>

      {/* ROW 2: Left (7 cols) = Assigned Route Step-by-Step + Technical Details | Right (5 cols) = Adminul Cursei & Live Chat */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT 7 COLS: RUTA ATRIBUITĂ ȘOFERULUI & OPERAȚIUNI LA RAMPĂ */}
        <div className="xl:col-span-7 space-y-5">
          <div className="tahoe-glass rounded-[26px] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
                  FOAIE DE PARCURS ELECTRONICĂ · CORIDOR AUTORIZAT HGV
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  Ruta atribuită: {activeTrailer.routeSummary.join(' → ')}
                </h2>
                <div className="text-xs text-[#30D158] font-semibold mt-0.5">
                  Autostrăzi permise camion: {adminInfo.highwayCorridor}
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-full tahoe-card-inner text-xs font-bold text-white/85 tabular-nums">
                Sigiliu: {adminInfo.sealNumber}
              </div>
            </div>

            {/* Segments / Stops Assigned to This Driver */}
            <div className="space-y-3.5">
              {activeTrailer.segments.map((seg, idx) => {
                const isDone = !!completedSegments[seg.id];
                const isCmrDone = !!cmrUploadedSegments[seg.id];

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
                          <div className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                            <span>
                              {seg.fromCity} ({formatCountryBadge(seg.fromCountry)}) → {seg.toCity} ({formatCountryBadge(seg.toCountry)})
                            </span>
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
                          setCompletedSegments((prev) => ({
                            ...prev,
                            [seg.id]: !prev[seg.id],
                          }));
                          setStatusToast(
                            `Segmentul ${seg.fromCity} → ${seg.toCity} a fost marcat ca finalizat de șoferul ${activeTrailer.driver1.name}. Adminul cursei (${adminInfo.adminName}) a fost notificat!`
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

                      <button
                        onClick={() => {
                          setCmrUploadedSegments((prev) => ({
                            ...prev,
                            [seg.id]: true,
                          }));
                          setStatusToast(
                            `CMR-ul semnat pentru ${seg.toCity} a fost transmis către Adminul Cursei (${adminInfo.adminName}) și departamentul Facturare!`
                          );
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${isCmrDone
                            ? 'bg-emerald-500/20 text-[#30D158] border border-[#30D158]/40'
                            : 'tahoe-btn-secondary text-white/85'
                          }`}
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>{isCmrDone ? 'CMR Transmis ' : 'Transmite CMR Semnat'}</span>
                      </button>
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
                {activeSwapScenario.description}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-white/70">
                  Locație GPS parcare: <strong>{activeSwapScenario.meetingPoint.highway} ({activeSwapScenario.meetingPoint.coordinates})</strong>
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

        {/* RIGHT 5 COLS: ADMINUL CURSEI (DISPECER COORDONATOR) + FIȘA TEHNICĂ + LIVE CHAT */}
        <div className="xl:col-span-5 space-y-5">
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
                {driverMessages.map((msg, i) => (
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
                <span className="font-bold text-white">
                  {activeTrailer.currentLocation.city} ({formatCountryBadge(activeTrailer.currentLocation.country)}) ·{' '}
                  {activeTrailer.currentLocation.speedKmh} km/h
                </span>
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
      </div>

      {/* ROW 3: Harta Rutieră OSRM dedicată EXCLUSIV camionului atribuit șoferului */}
      <EuropeLiveMap
        trailers={[activeTrailer]}
        heightClass="h-[340px]"
      />

      {driverPdfTarget && (
        <VehiclePdfViewerModal
          plate={driverPdfTarget.plate}
          vin={driverPdfTarget.vin}
          vehicleSubtitle={driverPdfTarget.subtitle}
          onClose={() => setDriverPdfTarget(null)}
        />
      )}
    </div>
  );
};