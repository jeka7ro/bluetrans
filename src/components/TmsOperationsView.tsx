import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  BarChart3,
  Radio,
  ShieldCheck,
  Receipt,
  ThermometerSnowflake,
  Plus,
  Edit3,
  Trash2,
  Printer,
  FileCheck2,
  Building2,
  Gauge,
  Wrench,
  IdCard,
  Search,
  X,
} from 'lucide-react';
import { DemoBadge } from './DemoBadge';
import { TrailerUnit, formatCountryBadge } from '../data/mockData';
import {
  SavedClientRecord,
  loadSavedClients,
  saveAllClientsToDb,
} from './ClientDropdownSelect';
import {
  CmrAndInvoiceModal,
  PrintableTripDocData,
} from './CmrAndInvoiceModal';
import { GoogleMapsAddressInput } from './GoogleMapsAddressInput';
import {
  FLEET_VIN_DATABASE,
  FleetBoardExternalFilter,
  FleetVinPair,
  MasinileMeleItem,
  decodeVinNumber,
  VinLookupWidget,
  VehicleDossierModal,
  MasinileMeleFleetBoard,
} from './FleetVinAndDossierModal';
import {
  ExpiryCalendarField,
  extractIsoDateFromText,
  updateExpiryInPolicyString,
} from './ExpiryCalendarField';

interface TmsOperationsViewProps {
  trailers: TrailerUnit[];
  subTab: string;
  fleetJumpFilter?: FleetBoardExternalFilter | null;
}

export interface ExtendedFleetTechRecord {
  trailerId: string;
  tractorPlate: string;
  tractorModel: string;
  trailerModel: string;
  euroNorm: 'Euro 6e' | 'Euro 6d' | 'Euro 6c' | 'Euro 6' | 'Euro 5';
  co2MautClass: string;
  odometerKm: number;
  nextServiceKm: number;
  avgConsumptionL100: number;
  adBlueLevelPct: number;
  itpExpiry: string;
  rcaCmrExpiry: string;
  atpFrigoCertExpiry: string;
  tachoCalibrationExpiry: string;
}

const FLEET_TECH_STORAGE_KEY = 'bluetrans_tms_fleet_tech_v3';

const DEFAULT_FLEET_TECH: Record<string, ExtendedFleetTechRecord> = {
  'BH 67 STS': {
    trailerId: 'BH 67 STS',
    tractorPlate: 'BH 46 STS',
    tractorModel: 'Volvo FH 540 Globetrotter XL (2025)',
    trailerModel: 'Schmitz S.KO Cool Bi-Temp · Thermo King SLXi Spectrum',
    euroNorm: 'Euro 6e',
    co2MautClass: 'CO2 Clasa 4 · DE/AT Maut',
    odometerKm: 112810,
    nextServiceKm: 150000,
    avgConsumptionL100: 27.1,
    adBlueLevelPct: 86,
    itpExpiry: '25.07.2027',
    rcaCmrExpiry: '05.11.2026 (HD Insurance · CMR LUTZ W17 3531 12)',
    atpFrigoCertExpiry: '08.07.2028 (FRC Bi-Temp -20°C · CASCO Omniasig)',
    tachoCalibrationExpiry: '05.09.2027 (Smart Tacho G2V2)',
  },
  'BH 69 STS': {
    trailerId: 'BH 69 STS',
    tractorPlate: 'BH 56 STS',
    tractorModel: 'Scania R500 Super (2023)',
    trailerModel: 'Krone Cool Liner Duoplex · Carrier Vector HE 19 MT',
    euroNorm: 'Euro 6e',
    co2MautClass: 'CO2 Clasa 4 · DE/AT Maut',
    odometerKm: 249450,
    nextServiceKm: 300000,
    avgConsumptionL100: 26.8,
    adBlueLevelPct: 78,
    itpExpiry: '17.11.2026',
    rcaCmrExpiry: '16.11.2026 (Alliantz 127118633 · CMR LUTZ W17 3531 12)',
    atpFrigoCertExpiry: '07.11.2028 (FRC Bi-Temp -20°C · CASCO Groupama)',
    tachoCalibrationExpiry: '14.11.2027 (Smart Tacho G2V2)',
  },
  'BH 75 STS': {
    trailerId: 'BH 75 STS',
    tractorPlate: 'IF 96 STS',
    tractorModel: 'Scania R500 Highline (SCANDEXPRES)',
    trailerModel: 'Schmitz S.KO Cool Bi-Temp · Thermo King SLXi 400',
    euroNorm: 'Euro 6d',
    co2MautClass: 'CO2 Clasa 4 · Nordic + DE',
    odometerKm: 418920,
    nextServiceKm: 450000,
    avgConsumptionL100: 27.6,
    adBlueLevelPct: 91,
    itpExpiry: '25.03.2027',
    rcaCmrExpiry: '09.12.2026 (EASY 408897 · CMR LUTZ W17 5657 12)',
    atpFrigoCertExpiry: '19.11.2027 (FRC Bi-Temp -20°C · CASCO Omniasig)',
    tachoCalibrationExpiry: '18.08.2027 (Smart Tacho G2V2)',
  },
  'BH 74 STS': {
    trailerId: 'BH 74 STS',
    tractorPlate: 'B 506 STS',
    tractorModel: 'Scania S500 Next Gen Super (2025)',
    trailerModel: 'Schmitz S.KO Cool Bi-Temp · Thermo King SLXi 400',
    euroNorm: 'Euro 6e',
    co2MautClass: 'CO2 Clasa 4 · DE/AT Maut',
    odometerKm: 95190,
    nextServiceKm: 120000,
    avgConsumptionL100: 26.2,
    adBlueLevelPct: 84,
    itpExpiry: '15.07.2027',
    rcaCmrExpiry: '15.07.2027 (Alliantz 129212938 · CMR LUTZ W17 3531 12)',
    atpFrigoCertExpiry: '12.06.2030 (FRC Bi-Temp -20°C · CASCO Groupama)',
    tachoCalibrationExpiry: '29.07.2027 (Smart Tacho G2V2)',
  },
  'BH 91 STS': {
    trailerId: 'BH 91 STS',
    tractorPlate: 'B 507 STS',
    tractorModel: 'Scania S500 Next Gen Super (2x Șoferi)',
    trailerModel: 'Schmitz S.KO Cool Bi-Temp · Thermo King Advancer Spectrum',
    euroNorm: 'Euro 6e',
    co2MautClass: 'CO2 Clasa 4 · Express 2x',
    odometerKm: 98600,
    nextServiceKm: 120000,
    avgConsumptionL100: 26.4,
    adBlueLevelPct: 94,
    itpExpiry: '15.07.2027',
    rcaCmrExpiry: '15.07.2027 (Alliantz 129215222 · CMR LUTZ W17 3531 12)',
    atpFrigoCertExpiry: '12.06.2030 (FRC Bi-Temp -20°C · CASCO Groupama)',
    tachoCalibrationExpiry: '12.01.2028 (Smart Tacho G2V2)',
  },
  'BH 23 STS': {
    trailerId: 'BH 23 STS',
    tractorPlate: 'B 560 STS',
    tractorModel: 'Scania S500 Next Gen Super (2025)',
    trailerModel: 'Schmitz S.KO Cool Smart Executive (2025)',
    euroNorm: 'Euro 6e',
    co2MautClass: 'CO2 Clasa 4 · DE/AT Maut',
    odometerKm: 88400,
    nextServiceKm: 120000,
    avgConsumptionL100: 26.1,
    adBlueLevelPct: 88,
    itpExpiry: '15.07.2027',
    rcaCmrExpiry: '15.07.2027 (HD Insurance 1100977102 · CMR LUTZ W17 3531 12)',
    atpFrigoCertExpiry: '25.04.2030 (FRC Bi-Temp -20°C · CASCO Groupama)',
    tachoCalibrationExpiry: '20.11.2027 (Smart Tacho G2V2)',
  },
  'BH 31 STS': {
    trailerId: 'BH 31 STS',
    tractorPlate: 'B 871 STS',
    tractorModel: 'Scania R500 Super (2026)',
    trailerModel: 'Schmitz S.KO Cool Bi-Temp · Thermo King SLXi Spectrum',
    euroNorm: 'Euro 6e',
    co2MautClass: 'CO2 Clasa 4 · DE/AT Maut',
    odometerKm: 44300,
    nextServiceKm: 90000,
    avgConsumptionL100: 25.9,
    adBlueLevelPct: 92,
    itpExpiry: '16.06.2027',
    rcaCmrExpiry: '16.06.2027 (GRAWE 96636629 · CMR LUTZ W17 3531 12)',
    atpFrigoCertExpiry: '03.06.2031 (FRC Bi-Temp -20°C · CASCO Omniasig)',
    tachoCalibrationExpiry: '04.10.2028 (Smart Tacho G2V2)',
  },
};

export interface DriverDocumentRecord {
  id: string;
  name: string;
  phone: string;
  assignedAssembly: string;
  licenseCategories: string;
  licenseExpiry: string;
  cpiCpcCertExpiry: string;
  tachoCardExpiry: string;
  medicalPsychExpiry: string;
  availabilityStatus: 'În cursă activă' | 'Pauză 45m / Odihnă' | 'Disponibil Bază Oradea';
  remainingDailyHours: number;
  remainingWeeklyHours: number;
}

const DRIVERS_DOCS_STORAGE_KEY = 'bluetrans_tms_drivers_docs_v3';

interface InvoiceRecord {
  invoiceNo: string;
  client: string;
  tripRef: string;
  trailerId: string;
  route: string;
  revenueEur: number;
  directCostsEur: number;
  groupageBonusEur: number;
  netProfitEur: number;
  marginPct: number;
  status: 'Achitată' | 'Emisă (Scadentă 30 zile)' | 'Gata de facturare (CMR Semnat)';
}

const INITIAL_INVOICES: InvoiceRecord[] = [
  {
    invoiceNo: 'BTS-2026-4418',
    client: 'Unilever + Agrana Fruit (Grupaj Bi-Temp)',
    tripRef: 'TR-4821',
    trailerId: 'BH 67 STS',
    route: 'Oradea → Viena → Köln → Rotterdam',
    revenueEur: 3680,
    directCostsEur: 2290,
    groupageBonusEur: 370,
    netProfitEur: 1390,
    marginPct: 37.8,
    status: 'Emisă (Scadentă 30 zile)',
  },
  {
    invoiceNo: 'BTS-2026-4419',
    client: 'Royal FloraHolland + Nordic Seafood',
    tripRef: 'TR-4819',
    trailerId: 'BH 75 STS',
    route: 'Rotterdam → Hamburg → Malmö → Stockholm',
    revenueEur: 3570,
    directCostsEur: 2180,
    groupageBonusEur: 875,
    netProfitEur: 1390,
    marginPct: 38.9,
    status: 'Gata de facturare (CMR Semnat)',
  },
  {
    invoiceNo: 'BTS-2026-4420',
    client: 'Transilvania Lactate + Bayernland',
    tripRef: 'TR-4818',
    trailerId: 'BH 74 STS',
    route: 'Oradea → Suben → München → Stuttgart',
    revenueEur: 2870,
    directCostsEur: 1840,
    groupageBonusEur: 370,
    netProfitEur: 1030,
    marginPct: 35.9,
    status: 'Gata de facturare (CMR Semnat)',
  },
  {
    invoiceNo: 'BTS-2026-4415',
    client: 'Nature’s Pride Holland BV',
    tripRef: 'TR-4817',
    trailerId: 'BH 91 STS',
    route: 'Rotterdam → Venlo → Kolding → Göteborg',
    revenueEur: 3290,
    directCostsEur: 2110,
    groupageBonusEur: 650,
    netProfitEur: 1180,
    marginPct: 35.8,
    status: 'Achitată',
  },
];

export const TmsOperationsView: React.FC<TmsOperationsViewProps> = ({
  trailers,
  subTab,
  fleetJumpFilter,
}) => {
  const [section, setSection] = useState<
    'fleet' | 'tacho' | 'clients' | 'invoicing'
  >(() => {
    if (subTab === 'clients') return 'clients';
    if (fleetJumpFilter) return 'fleet';
    try {
      const saved = localStorage.getItem('bluetrans_tms_section_v1');
      if (saved === 'tacho' || saved === 'invoicing' || saved === 'fleet') return saved;
    } catch {
      // ignore
    }
    return 'fleet';
  });

  // La refresh rămânem pe aceeași secțiune (Flotă / Tahograf / Facturare)
  useEffect(() => {
    try {
      localStorage.setItem('bluetrans_tms_section_v1', section);
    } catch {
      // ignore
    }
  }, [section]);

  useEffect(() => {
    if (subTab === 'clients') {
      setSection('clients');
    } else if (subTab === 'fleet' && section === 'clients') {
      setSection('fleet');
    }
  }, [subTab]);

  useEffect(() => {
    if (fleetJumpFilter) {
      setSection('fleet');
    }
  }, [fleetJumpFilter?.nonce]);

  // 1. Fleet Technical Specs State (persisted in localStorage)
  const [fleetTechMap, setFleetTechMap] = useState<
    Record<string, ExtendedFleetTechRecord>
  >(() => {
    try {
      const saved = localStorage.getItem(FLEET_TECH_STORAGE_KEY);
      if (saved) return { ...DEFAULT_FLEET_TECH, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_FLEET_TECH;
  });

  // 1b. Fleet VIN & OEM Color State (persisted in localStorage)
  const [fleetVinsMap, setFleetVinsMap] = useState<
    Record<string, FleetVinPair>
  >(() => {
    try {
      const saved = localStorage.getItem('bluetrans_tms_fleet_vins_v3');
      if (saved) return { ...FLEET_VIN_DATABASE, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return FLEET_VIN_DATABASE;
  });

  const [selectedDossier, setSelectedDossier] = useState<{
    trailerId: string;
    initialTab: 'tractor' | 'trailer' | 'coupled' | 'edit';
    customItem?: MasinileMeleItem | null;
  } | null>(null);

  const [editingTechRecord, setEditingTechRecord] =
    useState<ExtendedFleetTechRecord | null>(null);

  // 2. Drivers & Documents State (persisted in localStorage)
  const buildDefaultDrivers = (): DriverDocumentRecord[] =>
    trailers.map((t, idx) => {
      const trPlate = t.tractorId.split(' (')[0];
      const pair = trPlate !== t.id ? `${trPlate} + ${t.id}` : t.id;
      return {
        id: `drv-${t.id}`,
        name: t.driver2 ? `${t.driver1.name} + ${t.driver2.name}` : t.driver1.name,
        phone: t.driver1.phone,
        assignedAssembly: pair,
        licenseCategories: t.id.includes('EXP') ? 'Cat. B, C, C+E' : 'Cat. B, C, C+E (TIR)',
        licenseExpiry: `1${(idx % 8) + 1}.05.2029`,
        cpiCpcCertExpiry: `2${(idx % 7) + 1}.11.2028 (CPI/CPC Marfă)`,
        tachoCardExpiry: `1${(idx % 6) + 2}.08.2028 (Card G2V2)`,
        medicalPsychExpiry: `0${(idx % 8) + 1}.04.2027 (Apt Medical/Psiho)`,
        availabilityStatus:
          t.driver1.tachoStatus === 'Pauză / Odihnă'
            ? 'Pauză 45m / Odihnă'
            : 'În cursă activă',
        remainingDailyHours: t.driver1.remainingDailyDriveHours,
        remainingWeeklyHours: t.driver1.remainingWeeklyDriveHours,
      };
    });

  const [driversList, setDriversList] = useState<DriverDocumentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(DRIVERS_DOCS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return buildDefaultDrivers();
  });

  const [editingDriver, setEditingDriver] =
    useState<DriverDocumentRecord | null>(null);

  // 3. Clients & Contracts CRUD State (shared with ClientDropdownSelect)
  const [clientsList, setClientsList] = useState<SavedClientRecord[]>(() =>
    loadSavedClients()
  );
  const [clientSearch, setClientSearch] = useState('');
  const [editingClient, setEditingClient] =
    useState<SavedClientRecord | null>(null);

  // 4. Invoices & Printable CMR/Invoice Modal State
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [printableDoc, setPrintableDoc] =
    useState<PrintableTripDocData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Lock background scroll whenever any modal is open
  useEffect(() => {
    const anyModal = Boolean(
      selectedDossier ||
        editingTechRecord ||
        editingDriver ||
        editingClient ||
        printableDoc
    );
    if (anyModal) {
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
  }, [
    selectedDossier,
    editingTechRecord,
    editingDriver,
    editingClient,
    printableDoc,
  ]);

  const handleUpdateColorForFleet = (
    trailerId: string,
    target: 'tractor' | 'trailer',
    colorCode: string
  ) => {
    const currentPair =
      fleetVinsMap[trailerId] || FLEET_VIN_DATABASE['BH 67 STS'];
    const updatedPair: FleetVinPair =
      target === 'trailer'
        ? { ...currentPair, trailerColorCode: colorCode }
        : { ...currentPair, tractorColorCode: colorCode };
    const nextMap = { ...fleetVinsMap, [trailerId]: updatedPair };
    setFleetVinsMap(nextMap);
    try {
      localStorage.setItem(
        'bluetrans_tms_fleet_vins_v3',
        JSON.stringify(nextMap)
      );
    } catch {
      // ignore
    }
  };

  const handleSaveDossierTechAndVin = (
    updatedTech: ExtendedFleetTechRecord,
    updatedVinPair: FleetVinPair
  ) => {
    const nextTechMap = {
      ...fleetTechMap,
      [updatedTech.trailerId]: updatedTech,
    };
    const nextVinMap = {
      ...fleetVinsMap,
      [updatedTech.trailerId]: updatedVinPair,
    };
    setFleetTechMap(nextTechMap);
    setFleetVinsMap(nextVinMap);
    try {
      localStorage.setItem(FLEET_TECH_STORAGE_KEY, JSON.stringify(nextTechMap));
      localStorage.setItem(
        'bluetrans_tms_fleet_vins_v3',
        JSON.stringify(nextVinMap)
      );
    } catch {
      // ignore
    }
    setFeedback(
      `Dosarul tehnic, VIN-ul (${updatedVinPair.tractorVin}) și culoarea pentru ${updatedTech.tractorPlate} + ${updatedTech.trailerId} au fost salvate!`
    );
    setSelectedDossier(null);
  };

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

  const handleSaveTechRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTechRecord) return;
    const updated = {
      ...fleetTechMap,
      [editingTechRecord.trailerId]: editingTechRecord,
    };
    setFleetTechMap(updated);
    try {
      localStorage.setItem(FLEET_TECH_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setFeedback(
      `Fișa tehnică pentru ansamblul ${editingTechRecord.tractorPlate} + ${editingTechRecord.trailerId} (${editingTechRecord.euroNorm}, ${editingTechRecord.odometerKm.toLocaleString('ro-RO')} km) a fost salvată!`
    );
    setEditingTechRecord(null);
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    const exists = driversList.some((d) => d.id === editingDriver.id);
    const updated = exists
      ? driversList.map((d) => (d.id === editingDriver.id ? editingDriver : d))
      : [editingDriver, ...driversList];
    setDriversList(updated);
    try {
      localStorage.setItem(DRIVERS_DOCS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setFeedback(
      `Datele și documentele șoferului ${editingDriver.name} (Permis, Atestat CPI/CPC, Card Tahograf) au fost actualizate!`
    );
    setEditingDriver(null);
  };

  const handleSaveClientRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    const exists = clientsList.some((c) => c.id === editingClient.id);
    const updated = exists
      ? clientsList.map((c) => (c.id === editingClient.id ? editingClient : c))
      : [editingClient, ...clientsList];
    setClientsList(updated);
    saveAllClientsToDb(updated);
    setFeedback(
      `Clientul "${editingClient.name}" (${editingClient.vatCode}) a fost salvat în baza de date și este disponibil imediat în toate listele drop-down!`
    );
    setEditingClient(null);
  };

  const handleDeleteClient = (clientId: string, clientName: string) => {
    const updated = clientsList.filter((c) => c.id !== clientId);
    setClientsList(updated);
    saveAllClientsToDb(updated);
    setFeedback(`Clientul "${clientName}" a fost eliminat din baza de clienți.`);
  };

  const handleIssueInvoice = (invoiceNo: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.invoiceNo === invoiceNo
          ? { ...inv, status: 'Emisă (Scadentă 30 zile)' }
          : inv
      )
    );
    setFeedback(
      `Factura ${invoiceNo} (cu anexă CMR și raport temperatură Bi-Temp) a fost generată și trimisă automat către client!`
    );
  };

  const filteredClients = clientsList.filter(
    (c) =>
      !clientSearch.trim() ||
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.vatCode.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.countryCode.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.defaultFromCity.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.defaultToCity.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & 4-Tab Selector — single-row capsule tablist */}
      <div className="tahoe-glass rounded-full p-2 sm:p-2.5">
        <div
          role="tablist"
          aria-label="Secțiuni operațiuni flotă și administrare"
          className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar"
          onKeyDown={(e) => {
            const ids: Array<'fleet' | 'tacho' | 'clients' | 'invoicing'> = [
              'fleet',
              'tacho',
              'clients',
              'invoicing',
            ];
            const idx = ids.indexOf(section);
            let nextIdx = -1;
            if (e.key === 'ArrowRight') nextIdx = (idx + 1) % ids.length;
            else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + ids.length) % ids.length;
            else if (e.key === 'Home') nextIdx = 0;
            else if (e.key === 'End') nextIdx = ids.length - 1;
            if (nextIdx >= 0) {
              e.preventDefault();
              setSection(ids[nextIdx]);
              const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              buttons[nextIdx]?.focus();
              buttons[nextIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
          }}
        >
          {[
            {
              id: 'fleet',
              label: 'Flotă',
              icon: Truck,
            },
            {
              id: 'tacho',
              label: 'Șoferi & Tahograf',
              icon: IdCard,
              demo: true,
            },
            {
              id: 'clients',
              label: `Clienți (${clientsList.length})`,
              icon: Building2,
              demo: true,
            },
            {
              id: 'invoicing',
              label: 'Facturare',
              icon: Receipt,
              demo: true,
            },
          ].map((tab: { id: string; label: string; icon: React.ElementType; demo?: boolean }) => {
            const Icon = tab.icon;
            const isSelected = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={(e) => {
                  setSection(
                    tab.id as 'fleet' | 'tacho' | 'clients' | 'invoicing'
                  );
                  e.currentTarget.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                  });
                }}
                className="tps-nav-tab-btn h-9 px-4 rounded-full tahoe-btn-secondary text-xs font-bold text-white/80 hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.demo && <DemoBadge />}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className="bg-[#0A84FF] text-white px-4 py-2.5 rounded-full shadow-lg text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="px-3 py-1 rounded-full text-xs font-extrabold cursor-pointer shrink-0 shadow-xs"
            style={{ backgroundColor: '#ffffff', color: '#0369a1' }}
          >
            OK
          </button>
        </div>
      )}

      {/* =====================================================================
          SECTION 1: "MAȘINILE MELE" (ITP / ROV / RCA / LICENȚĂ) + VIN DECODER
      ====================================================================== */}
      {section === 'fleet' && (
        <div className="space-y-5">
          {/* "Mașinile mele" Fleet Board (Exact visual layout with 3/4 Truck & Schmitz Trailer renders + ITP/ROV/RCA/Licență blocks & popup modal) */}
          <MasinileMeleFleetBoard
            externalFilter={fleetJumpFilter}
            onOpenVehicleDossier={(trailerId, initialTab, customItem) =>
              setSelectedDossier({ trailerId, initialTab, customItem })
            }
          />

        </div>
      )}

      {/* =====================================================================
          SECTION 2: DRIVERS MANAGEMENT, DOCUMENTS (PERMIS, ATESTAT, CARD) & TACHOGRAPH
      ====================================================================== */}
      {section === 'tacho' && (
        <div className="space-y-4">
          <div className="tahoe-glass rounded-[28px] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-[#0A84FF]" />
                  Gestiune Șoferi, Valabilitate Documente (Permis C+E, Atestat CPI/CPC, Card Tahograf) & Timpi CE 561/2006
                </h2>
                <p className="text-xs text-white/65 mt-0.5">
                  Evidența completă a șoferilor, expirărilor documentelor obligatorii și a orelor de conducere rămase azi / săptămânal.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingDriver({
                    id: `drv-${Date.now()}`,
                    name: 'Popescu Andrei',
                    phone: '+40 744 812 900',
                    assignedAssembly: 'BH 46 STS + BH 67 STS (Rezervă)',
                    licenseCategories: 'Cat. B, C, C+E (TIR)',
                    licenseExpiry: '15.08.2030',
                    cpiCpcCertExpiry: '20.10.2029 (CPI/CPC Marfă)',
                    tachoCardExpiry: '12.09.2029 (Card G2V2)',
                    medicalPsychExpiry: '01.06.2027 (Apt Medical/Psiho)',
                    availabilityStatus: 'Disponibil Bază Oradea',
                    remainingDailyHours: 9.0,
                    remainingWeeklyHours: 56.0,
                  })
                }
                className="px-4 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Adaugă Șofer Nou</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 text-white/65 uppercase border-b border-white/10 text-[10.5px]">
                    <th className="py-3 px-4">Șofer / Echipaj & Telefon</th>
                    <th className="py-3 px-4">Ansamblu Alocat</th>
                    <th className="py-3 px-4">Permis Conducere</th>
                    <th className="py-3 px-4">Atestat CPI/CPC & Card Tahograf</th>
                    <th className="py-3 px-4">Aviz Medical / Psiho</th>
                    <th className="py-3 px-4">Tahograf Digital (Azi / Săpt.)</th>
                    <th className="py-3 px-4">Status & Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {driversList.map((drv) => (
                    <tr key={drv.id} className="hover:bg-[#161f33]">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-white text-sm">
                          {drv.name}
                        </div>
                        <div className="text-[11px] text-white/65 tabular-nums">
                          {drv.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#64D2FF] tabular-nums">
                        {drv.assignedAssembly}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="font-bold text-white">
                          {drv.licenseCategories}
                        </div>
                        <div className="text-[11px] text-[#30D158]">
                          Exp: {drv.licenseExpiry}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="font-semibold text-white">
                          Atestat: {drv.cpiCpcCertExpiry}
                        </div>
                        <div className="text-[11px] text-white/70">
                          Tahograf: {drv.tachoCardExpiry}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-[11px] text-[#30D158] font-semibold">
                        {drv.medicalPsychExpiry}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <div className="font-extrabold text-white">
                          Azi rămas: <span className="text-[#FF9F0A]">{drv.remainingDailyHours}h</span> / 9h
                        </div>
                        <div className="text-[11px] text-white/70">
                          Săptămânal: <strong>{drv.remainingWeeklyHours}h</strong> / 56h
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 font-bold text-[10.5px]">
                            {drv.availabilityStatus}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingDriver({ ...drv })}
                            className="px-3 py-1 rounded-full tahoe-btn-secondary text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-[#64D2FF]" />
                            <span>Editează</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: CLIENTS & COMMERCIAL CONTRACTS DATABASE (FULL CRUD)
      ====================================================================== */}
      {section === 'clients' && (
        <div className="tahoe-glass rounded-[28px] overflow-hidden">
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0A84FF]" />
                Clienți & contracte
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-60">
                <Search className="w-3.5 h-3.5 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Caută client, CUI/VAT, rută..."
                  className="w-full tahoe-card-inner rounded-full pl-8 pr-3.5 py-1.5 text-xs text-white border border-white/15"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingClient({
                    id: `cli-${Date.now()}`,
                    name: '',
                    countryCode: 'RO',
                    vatCode: 'RO',
                    defaultFromCity: 'Oradea',
                    defaultToCity: 'Rotterdam',
                    defaultTemp: 4,
                    defaultLdm: 4.2,
                    defaultWeightTons: 6.0,
                    cargoCategory: 'Marfă Frigo Controlată (+4°C)',
                    contactPerson: 'Responsabil Logistică',
                    email: 'logistica@client.ro',
                    phone: '+40 722 000 000',
                    rateEurPerKm: 1.45,
                    rateEurPerLdm: 195,
                    paymentTermDays: 30,
                  })
                }
                className="px-4 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Adaugă Client & Contract</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 text-white/65 uppercase border-b border-white/10 text-[10.5px]">
                  <th className="py-3 px-4">Companie Client & Categorie Marfă</th>
                  <th className="py-3 px-4">Țară & Cod CUI / VAT</th>
                  <th className="py-3 px-4">Coridor Implicit</th>
                  <th className="py-3 px-4">Parametri Standard (LDM / T / °C)</th>
                  <th className="py-3 px-4">Tarif Contractual & Scadență</th>
                  <th className="py-3 px-4">Acțiuni CRUD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredClients.map((cli) => (
                  <tr key={cli.id} className="hover:bg-[#161f33]">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-white text-sm">
                        {cli.name}
                      </div>
                      <div className="text-[11px] text-white/65">
                        {cli.cargoCategory}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <span className="px-2 py-0.5 rounded bg-[#0A84FF]/15 text-[#64D2FF] font-extrabold text-[11px]">
                        {formatCountryBadge(cli.countryCode)}
                      </span>{' '}
                      <span className="font-bold text-white ml-1">
                        {cli.vatCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {cli.defaultFromCity} → {cli.defaultToCity}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <span className="font-extrabold text-[#64D2FF]">
                        {cli.defaultLdm.toFixed(1)} LDM
                      </span>{' '}
                      · <span className="font-bold text-[#FF9F0A]">{cli.defaultWeightTons}T</span> ·{' '}
                      <span className="font-bold text-[#30D158]">
                        {cli.defaultTemp > 0 ? `+${cli.defaultTemp}` : cli.defaultTemp}°C
                      </span>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="font-extrabold text-[#30D158]">
                        {(cli.rateEurPerKm ?? 1.42).toFixed(2)} €/km · {cli.rateEurPerLdm ?? 195} €/LDM
                      </div>
                      <div className="text-[11px] text-white/65">
                        Termen plată: {cli.paymentTermDays ?? 30} zile
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingClient({ ...cli })}
                          className="px-3 py-1 rounded-full tahoe-btn-secondary text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-[#64D2FF]" />
                          <span>Editează</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(cli.id, cli.name)}
                          className="px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Șterge client"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 4: INVOICING, PROFITABILITY & PRINTABLE CMR / INVOICE
      ====================================================================== */}
      {section === 'invoicing' && (
        <div className="tahoe-glass rounded-[28px] overflow-hidden">
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Facturare Curse, Venit Suplimentar din Grupaj, Marjă Netă & Generare CMR / Factură PDF
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 text-white/60 uppercase border-b border-white/10">
                  <th className="py-3 px-4">Factură / Cursă</th>
                  <th className="py-3 px-4">Clienți (FTL + Grupaj)</th>
                  <th className="py-3 px-4">Ansamblu & Rută</th>
                  <th className="py-3 px-4">Venit Total</th>
                  <th className="py-3 px-4">Din care Grupaj</th>
                  <th className="py-3 px-4">Cost Direct</th>
                  <th className="py-3 px-4">Profit Net (%)</th>
                  <th className="py-3 px-4">Documente & Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {invoices.map((inv) => {
                  const trObj =
                    trailers.find((t) => t.id === inv.trailerId) || trailers[0];
                  const trPlate = trObj.tractorId.split(' (')[0];
                  return (
                    <tr key={inv.invoiceNo} className="hover:bg-[#161f33]">
                      <td className="py-3.5 px-4 tabular-nums font-bold text-white">
                        {inv.invoiceNo}
                        <div className="text-[10px] text-blue-400">{inv.tripRef}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {inv.client}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="tabular-nums font-bold text-white">
                          {trPlate} + {inv.trailerId}
                        </span>
                        <div className="text-[11px] text-slate-400">{inv.route}</div>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-bold text-white">
                        {inv.revenueEur} €
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-bold text-emerald-400">
                        +{inv.groupageBonusEur} €
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-slate-300">
                        -{inv.directCostsEur} €
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-extrabold text-emerald-400">
                          +{inv.netProfitEur} €
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">
                          ({inv.marginPct}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const parts = inv.route.split(' → ');
                              setPrintableDoc({
                                docType: 'CMR',
                                referenceNo: inv.tripRef,
                                clientName: inv.client,
                                fromCity: parts[0] || 'Oradea',
                                toCity: parts[parts.length - 1] || 'Rotterdam',
                                cargoDesc: 'Partidă Frigo Bi-Temp (FTL + Grupaj)',
                                ldm: trObj.occupiedLdm,
                                weightTons: trObj.currentWeightTons,
                                tempRegime: `Z1: ${trObj.zone1Temp}°C / Z2: +${trObj.zone2Temp}°C`,
                                tractorPlate: trPlate,
                                trailerPlate: trObj.id,
                                driverName: trObj.driver1.name,
                                revenueEur: inv.revenueEur,
                              });
                            }}
                            className="px-2.5 py-1 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>CMR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const parts = inv.route.split(' → ');
                              setPrintableDoc({
                                docType: 'INVOICE',
                                referenceNo: inv.invoiceNo.replace('BTS-2026-', ''),
                                clientName: inv.client,
                                fromCity: parts[0] || 'Oradea',
                                toCity: parts[parts.length - 1] || 'Rotterdam',
                                cargoDesc: 'Transport internațional marfă + Grupaj',
                                ldm: trObj.occupiedLdm,
                                weightTons: trObj.currentWeightTons,
                                tempRegime: `Z1: ${trObj.zone1Temp}°C / Z2: +${trObj.zone2Temp}°C`,
                                tractorPlate: trPlate,
                                trailerPlate: trObj.id,
                                driverName: trObj.driver1.name,
                                revenueEur: inv.revenueEur,
                              });
                            }}
                            className="px-2.5 py-1 rounded-full bg-[#30D158]/15 hover:bg-[#30D158]/25 border border-[#30D158]/35 text-[#30D158] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print Factură</span>
                          </button>

                          {inv.status === 'Gata de facturare (CMR Semnat)' && (
                            <button
                              type="button"
                              onClick={() => handleIssueInvoice(inv.invoiceNo)}
                              className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Emite Factura
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tahoe-glass rounded-[24px] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase">
            <Users className="w-4 h-4" />
            Clienți Salvați în Bază & Conectați la Oferte Automate
          </div>
          <div className="text-2xl font-extrabold text-white">
            {clientsList.length} Companii Active
          </div>
          <p className="text-xs text-slate-400">
            Disponibili instant prin drop-list la introducerea comenzilor și conectați la generatorul de oferte comerciale pentru spațiul liber.
          </p>
        </div>

        <div className="tahoe-glass rounded-[24px] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
            <BarChart3 className="w-4 h-4" />
            Creștere Medie Venit / Cursă prin Grupaj Dinamic
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">+410 € / cursă</div>
          <p className="text-xs text-slate-400">
            Valorificarea segmentelor eliberate după descărcările intermediare (ex. Viena → Rotterdam sau München → Almere) crește marja netă cu 14–18%.
          </p>
        </div>

        <div className="tahoe-glass rounded-[24px] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase">
            <ShieldCheck className="w-4 h-4" />
            Integrări Tehnice Active
          </div>
          <div className="text-sm font-bold text-white">
            Cargo Track API + Tahograf G2V2 + Google Maps + Facturare CMR
          </div>
          <p className="text-xs text-slate-400">
            Monitorizează în timp real norma Euro, kilometrajul din CAN-Bus, expirările ITP/RCA/ATP și documentele șoferilor.
          </p>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: EDIT FLEET TECHNICAL RECORD (EURO NORM, ODOMETER KM, ITP/RCA/ATP)
      ====================================================================== */}
      {editingTechRecord && (
        <div
          onClick={() => setEditingTechRecord(null)}
          className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="tahoe-glass-elevated rounded-[26px] max-w-xl w-full p-6 space-y-4 shadow-2xl border border-white/20 max-h-[92vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64D2FF]">
                  FIȘA TEHNICĂ VEHICUL & SEMIRIMORCĂ FRIGO
                </span>
                <h3 className="text-lg font-extrabold text-white truncate">
                  Ansamblu {editingTechRecord.tractorPlate} + {editingTechRecord.trailerId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTechRecord(null)}
                aria-label="Închide fereastra"
                className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTechRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Număr Cap Tractor
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTechRecord.tractorPlate}
                    onChange={(e) =>
                      setEditingTechRecord({
                        ...editingTechRecord,
                        tractorPlate: e.target.value,
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Norma Poluare Euro
                  </label>
                  <select
                    value={editingTechRecord.euroNorm}
                    onChange={(e) =>
                      setEditingTechRecord({
                        ...editingTechRecord,
                        euroNorm: e.target.value as
                          | 'Euro 6e'
                          | 'Euro 6d'
                          | 'Euro 6c',
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  >
                    <option value="Euro 6e">Euro 6e (Clasa CO2 redusă)</option>
                    <option value="Euro 6d">Euro 6d</option>
                    <option value="Euro 6c">Euro 6c</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Marcă & Model Cap Tractor
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTechRecord.tractorModel}
                    onChange={(e) =>
                      setEditingTechRecord({
                        ...editingTechRecord,
                        tractorModel: e.target.value,
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Model Semiremorcă & Agregat Frigo
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTechRecord.trailerModel}
                    onChange={(e) =>
                      setEditingTechRecord({
                        ...editingTechRecord,
                        trailerModel: e.target.value,
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Kilometraj Bord (km)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingTechRecord.odometerKm}
                    onChange={(e) =>
                      setEditingTechRecord({
                        ...editingTechRecord,
                        odometerKm: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-extrabold tabular-nums border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Următoarea Revizie (km)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingTechRecord.nextServiceKm}
                    onChange={(e) =>
                      setEditingTechRecord({
                        ...editingTechRecord,
                        nextServiceKm: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold tabular-nums border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Consum Mediu (L/100km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingTechRecord.avgConsumptionL100}
                    onChange={(e) =>
                      setEditingTechRecord({
                        ...editingTechRecord,
                        avgConsumptionL100: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold tabular-nums border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ExpiryCalendarField
                  label="Expirare ITP"
                  name="tech-itp-expiry"
                  isoValue={extractIsoDateFromText(editingTechRecord.itpExpiry)}
                  onChangeIso={(iso) =>
                    setEditingTechRecord({
                      ...editingTechRecord,
                      itpExpiry: iso
                        ? updateExpiryInPolicyString(editingTechRecord.itpExpiry, iso)
                        : '',
                    })
                  }
                  required
                />
                <ExpiryCalendarField
                  label="Expirare RCA & CMR"
                  name="tech-rca-expiry"
                  isoValue={extractIsoDateFromText(editingTechRecord.rcaCmrExpiry)}
                  onChangeIso={(iso) =>
                    setEditingTechRecord({
                      ...editingTechRecord,
                      rcaCmrExpiry: iso
                        ? updateExpiryInPolicyString(editingTechRecord.rcaCmrExpiry, iso)
                        : '',
                    })
                  }
                  required
                />
                <ExpiryCalendarField
                  label="Certificat Frigo ATP"
                  name="tech-atp-expiry"
                  isoValue={extractIsoDateFromText(editingTechRecord.atpFrigoCertExpiry)}
                  onChangeIso={(iso) =>
                    setEditingTechRecord({
                      ...editingTechRecord,
                      atpFrigoCertExpiry: iso
                        ? updateExpiryInPolicyString(editingTechRecord.atpFrigoCertExpiry, iso)
                        : '',
                    })
                  }
                  allowClear
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTechRecord(null)}
                  className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-bold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full tahoe-btn-primary text-white font-bold cursor-pointer"
                >
                  Salvează Fișa Tehnică
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADD / EDIT DRIVER & PROFESSIONAL DOCUMENTS
      ====================================================================== */}
      {editingDriver && (
        <div
          onClick={() => setEditingDriver(null)}
          className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="tahoe-glass-elevated rounded-[26px] max-w-lg w-full p-6 space-y-4 shadow-2xl border border-white/20 max-h-[92vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64D2FF]">
                  GESTIUNE ȘOFER & DOCUMENTE PROFESIONALE
                </span>
                <h3 className="text-lg font-extrabold text-white truncate">
                  {editingDriver.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                aria-label="Închide fereastra"
                className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Nume & Prenume Șofer
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDriver.name}
                    onChange={(e) =>
                      setEditingDriver({ ...editingDriver, name: e.target.value })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Telefon Cabină / Contact
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDriver.phone}
                    onChange={(e) =>
                      setEditingDriver({ ...editingDriver, phone: e.target.value })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Ansamblu Alocat (Tractor + Remorcă)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDriver.assignedAssembly}
                    onChange={(e) =>
                      setEditingDriver({
                        ...editingDriver,
                        assignedAssembly: e.target.value,
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Status Disponibilitate
                  </label>
                  <select
                    value={editingDriver.availabilityStatus}
                    onChange={(e) =>
                      setEditingDriver({
                        ...editingDriver,
                        availabilityStatus: e.target
                          .value as DriverDocumentRecord['availabilityStatus'],
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  >
                    <option value="În cursă activă">În cursă activă</option>
                    <option value="Pauză 45m / Odihnă">Pauză 45m / Odihnă</option>
                    <option value="Disponibil Bază Oradea">Disponibil Bază Oradea</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ExpiryCalendarField
                  label="Expirare Permis (Cat. C+E)"
                  name="driver-license-expiry"
                  isoValue={extractIsoDateFromText(editingDriver.licenseExpiry)}
                  onChangeIso={(iso) =>
                    setEditingDriver({
                      ...editingDriver,
                      licenseExpiry: iso
                        ? updateExpiryInPolicyString(editingDriver.licenseExpiry, iso)
                        : '',
                    })
                  }
                  required
                />
                <ExpiryCalendarField
                  label="Expirare Atestat CPI/CPC Marfă"
                  name="driver-cpi-expiry"
                  isoValue={extractIsoDateFromText(editingDriver.cpiCpcCertExpiry)}
                  onChangeIso={(iso) =>
                    setEditingDriver({
                      ...editingDriver,
                      cpiCpcCertExpiry: iso
                        ? updateExpiryInPolicyString(editingDriver.cpiCpcCertExpiry, iso)
                        : '',
                    })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ExpiryCalendarField
                  label="Expirare Card Tahograf G2V2"
                  name="driver-tacho-expiry"
                  isoValue={extractIsoDateFromText(editingDriver.tachoCardExpiry)}
                  onChangeIso={(iso) =>
                    setEditingDriver({
                      ...editingDriver,
                      tachoCardExpiry: iso
                        ? updateExpiryInPolicyString(editingDriver.tachoCardExpiry, iso)
                        : '',
                    })
                  }
                  required
                />
                <ExpiryCalendarField
                  label="Aviz Medical & Psihologic"
                  name="driver-med-expiry"
                  isoValue={extractIsoDateFromText(editingDriver.medicalPsychExpiry)}
                  onChangeIso={(iso) =>
                    setEditingDriver({
                      ...editingDriver,
                      medicalPsychExpiry: iso
                        ? updateExpiryInPolicyString(editingDriver.medicalPsychExpiry, iso)
                        : '',
                    })
                  }
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-bold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full tahoe-btn-primary text-white font-bold cursor-pointer"
                >
                  Salvează Șofer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ADD / EDIT CLIENT & COMMERCIAL CONTRACT
      ====================================================================== */}
      {editingClient && (
        <div
          onClick={() => setEditingClient(null)}
          className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="tahoe-glass-elevated rounded-[26px] max-w-lg w-full p-6 space-y-4 shadow-2xl border border-white/20 max-h-[92vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64D2FF]">
                  BAZĂ CLIENȚI & CONTRACTE COMERCIALE
                </span>
                <h3 className="text-lg font-extrabold text-white truncate">
                  {editingClient.name || 'Adaugă Client Nou în Bază'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                aria-label="Închide fereastra"
                className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClientRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-white/80 mb-1">
                    Denumire Companie Client
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClient.name}
                    onChange={(e) =>
                      setEditingClient({ ...editingClient, name: e.target.value })
                    }
                    placeholder="Ex: Agrana Fruit Central"
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Cod CUI / VAT
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClient.vatCode}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        vatCode: e.target.value,
                        countryCode:
                          e.target.value.slice(0, 2).toUpperCase() ||
                          editingClient.countryCode,
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GoogleMapsAddressInput
                  label="Oraș / Hub Implicit Încărcare"
                  required
                  value={editingClient.defaultFromCity}
                  onChange={(val) =>
                    setEditingClient({
                      ...editingClient,
                      defaultFromCity: val.split(',')[0].trim(),
                    })
                  }
                />
                <GoogleMapsAddressInput
                  label="Oraș / Hub Implicit Descărcare"
                  required
                  value={editingClient.defaultToCity}
                  onChange={(val) =>
                    setEditingClient({
                      ...editingClient,
                      defaultToCity: val.split(',')[0].trim(),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    LDM Implicit
                  </label>
                  <input
                    type="number"
                    step="0.2"
                    min="0.4"
                    max="13.6"
                    required
                    value={editingClient.defaultLdm}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        defaultLdm: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold tabular-nums border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Tonaj (T)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingClient.defaultWeightTons}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        defaultWeightTons: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold tabular-nums border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Temp (°C)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingClient.defaultTemp}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        defaultTemp: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold tabular-nums border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Tarif Contract (€/km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingClient.rateEurPerKm ?? 1.42}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        rateEurPerKm: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-[#30D158] font-bold tabular-nums border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Tarif Grupaj (€/LDM)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingClient.rateEurPerLdm ?? 195}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        rateEurPerLdm: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-[#30D158] font-bold tabular-nums border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Termen Plată (zile)
                  </label>
                  <input
                    type="number"
                    required
                    value={editingClient.paymentTermDays ?? 30}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        paymentTermDays: Number(e.target.value),
                      })
                    }
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold tabular-nums border border-white/15"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-bold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full tahoe-btn-primary text-white font-bold cursor-pointer"
                >
                  Salvează Client în Bază
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Vehicle & Semi-Trailer Dossier Modal (with 3D Studio Render, VIN Decoder & OEM Color) */}
      {selectedDossier && (
        <VehicleDossierModal
          key={`${selectedDossier.trailerId}-${selectedDossier.initialTab}-${selectedDossier.customItem?.id || 'fleet'}`}
          trailer={
            trailers.find((t) => t.id === selectedDossier.trailerId) ||
            trailers[0]
          }
          techRecord={
            fleetTechMap[selectedDossier.trailerId] ||
            DEFAULT_FLEET_TECH['BH 67 STS']
          }
          vinPair={
            fleetVinsMap[selectedDossier.trailerId] ||
            FLEET_VIN_DATABASE['BH 67 STS']
          }
          initialTab={selectedDossier.initialTab}
          customItem={selectedDossier.customItem}
          onClose={() => setSelectedDossier(null)}
          onSaveTechAndVin={handleSaveDossierTechAndVin}
        />
      )}

      {/* Printable CMR & Fiscal Invoice Modal */}
      <CmrAndInvoiceModal
        docData={printableDoc}
        onClose={() => setPrintableDoc(null)}
      />
    </div>
  );
};
