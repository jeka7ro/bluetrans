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
  Download,
  PlugZap,
  Globe2,
  KeyRound,
  RefreshCw,
  Mail,
  Phone,
  User,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { DemoBadge } from './DemoBadge';
import {
  BulkActionBar,
  BulkCheckbox,
  BulkDeleteConfirmModal,
  CheckboxTh,
  ExportExcelButton,
  ListPaginationBar,
  SortableTh,
  TAHOE_CELL_BORDER_STYLE,
  TAHOE_TABLE_SCROLL_CLASS,
  TAHOE_TABLE_STYLE,
  ViewModeToggle,
  getTahoeRowStyle,
  paginateItems,
  toggleSortState,
  usePersistedPageSize,
  usePersistedViewMode,
  useTableSelection,
  type SortState,
} from './ListViewControls';
import { TrailerUnit, formatCountryBadge } from '../data/mockData';
import { downloadRoEFacturaXml } from '../utils/eFacturaXml';
import { exportRowsToExcel } from '../utils/exportExcel';
import { estimateHgvRoadKm } from '../utils/smartLogisticsEngine';
import {
  apiCreateTenant,
  apiSaveIntegrationConfig,
  buildDriverExpenseFileUrl,
  type DriverExpenseRecord,
  type IntegrationStatusPayload,
  type OutboxEntry,
  type PodFileRecord,
  type TenantInfo,
} from '../data/tmsSyncClient';
import { DriverExpensesPanel, EXPENSE_CATEGORY_META } from './DriverExpensesPanel';
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
  userRole?: 'ADMIN' | 'DISPECER' | 'SOFER' | 'FINANCIAR';
  authToken?: string;
  activeTenant?: TenantInfo;
  tenants?: TenantInfo[];
  integrationStatus?: IntegrationStatusPayload;
  podFiles?: PodFileRecord[];
  driverExpenses?: DriverExpenseRecord[];
  outbox?: OutboxEntry[];
  onSwitchTenant?: (tenantId: string) => void;
  onTenantsUpdated?: (tenants: TenantInfo[]) => void;
  onIntegrationUpdated?: (status: IntegrationStatusPayload) => void;
  onSyncCargoTrack?: () => void;
  onScanExchanges?: () => void;
  onUpdateDriverExpenseStatus?: (
    id: string,
    status: 'Înregistrat' | 'Validat Admin'
  ) => Promise<void>;
  onDeleteDriverExpense?: (id: string) => Promise<void>;
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
  userRole = 'ADMIN',
  authToken = '',
  activeTenant,
  tenants = [],
  integrationStatus,
  podFiles = [],
  driverExpenses = [],
  outbox = [],
  onSwitchTenant,
  onTenantsUpdated,
  onIntegrationUpdated,
  onSyncCargoTrack,
  onScanExchanges,
  onUpdateDriverExpenseStatus,
  onDeleteDriverExpense,
}) => {
  const [fleetSubSection, setFleetSubSection] = useState<'fleet' | 'integrations'>(() => {
    if (fleetJumpFilter) return 'fleet';
    try {
      const saved = localStorage.getItem('bluetrans_tms_section_v1');
      if (saved === 'integrations' && userRole === 'ADMIN') {
        return 'integrations';
      }
    } catch {
      // ignore
    }
    return 'fleet';
  });

  const [uitCodes, setUitCodes] = useState<Record<string, string>>({
    'BTS-2026-4418': 'UIT-261109-4821A',
    'BTS-2026-4420': 'UIT-261110-4818B',
  });
  const [apiCfgForm, setApiCfgForm] = useState({
    cargoTrackUrl: '',
    cargoTrackToken: '',
    tachoUrl: '',
    tachoToken: '',
    timoComKey: '',
    transEuKey: '',
    resendApiKey: '',
    senderEmail: '',
    whatsappToken: '',
    whatsappPhoneId: '',
    anafCompanyCif: '',
    anafCompanyName: '',
  });
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    vatCode: '',
    city: 'Oradea',
    plan: 'Enterprise SaaS',
    maxTrucks: 25,
  });
  const [isSavingCfg, setIsSavingCfg] = useState(false);

  // La refresh pe Flotă păstrăm sub-secțiunea (Flotă / Integrări SaaS)
  useEffect(() => {
    if (subTab !== 'fleet') return;
    try {
      localStorage.setItem('bluetrans_tms_section_v1', fleetSubSection);
    } catch {
      // ignore
    }
  }, [fleetSubSection, subTab]);

  useEffect(() => {
    if (fleetJumpFilter) {
      setFleetSubSection('fleet');
    }
  }, [fleetJumpFilter?.nonce]);

  const section: 'fleet' | 'tacho' | 'clients' | 'invoicing' | 'integrations' =
    subTab === 'clients'
      ? 'clients'
      : subTab === 'tacho'
        ? 'tacho'
        : subTab === 'invoicing'
          ? 'invoicing'
          : userRole === 'ADMIN'
            ? fleetSubSection
            : 'fleet';

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
  const [viewingDriver, setViewingDriver] =
    useState<DriverDocumentRecord | null>(null);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState<string>('ALL');
  const [driversViewMode, setDriversViewMode] = usePersistedViewMode(
    'bluetrans_drivers_view_v1',
    'list'
  );
  const [driversPageSize, setDriversPageSize] = usePersistedPageSize(
    'bluetrans_drivers_pagesize_v1',
    10
  );
  const [driversPage, setDriversPage] = useState(1);
  const [driverSort, setDriverSort] = useState<
    SortState<'name' | 'assembly' | 'license' | 'tacho' | 'status'> | null
  >(null);

  useEffect(() => {
    setDriversPage(1);
  }, [driverSearch, driverStatusFilter, driversPageSize, driverSort]);

  // 3. Clients & Contracts CRUD State (shared with ClientDropdownSelect)
  const [clientsList, setClientsList] = useState<SavedClientRecord[]>(() =>
    loadSavedClients()
  );
  const [clientSearch, setClientSearch] = useState('');
  const [clientsCountryFilter, setClientsCountryFilter] = useState<string>('ALL');
  const [clientsViewMode, setClientsViewMode] = usePersistedViewMode(
    'bluetrans_clients_view_v1',
    'list'
  );
  const [clientsPageSize, setClientsPageSize] = usePersistedPageSize(
    'bluetrans_clients_pagesize_v1',
    10
  );
  const [clientsPage, setClientsPage] = useState(1);
  const [clientSort, setClientSort] = useState<
    SortState<'name' | 'vat' | 'corridor' | 'ldm' | 'rate'> | null
  >(null);
  const [viewingClient, setViewingClient] =
    useState<SavedClientRecord | null>(null);
  const [editingClient, setEditingClient] =
    useState<SavedClientRecord | null>(null);

  useEffect(() => {
    setClientsPage(1);
  }, [clientSearch, clientsCountryFilter, clientsPageSize, clientSort]);

  // 4. Invoices & Printable CMR/Invoice Modal State
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [invoicesViewMode, setInvoicesViewMode] = usePersistedViewMode(
    'bluetrans_invoicing_view_v1',
    'list'
  );
  const [invoicesPageSize, setInvoicesPageSize] = usePersistedPageSize(
    'bluetrans_invoicing_pagesize_v1',
    10
  );
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoiceSort, setInvoiceSort] = useState<
    SortState<'invoiceNo' | 'client' | 'route' | 'revenue' | 'groupage' | 'costs' | 'profit'> | null
  >(null);
  const [viewingInvoice, setViewingInvoice] =
    useState<InvoiceRecord | null>(null);
  const [printableDoc, setPrintableDoc] =
    useState<PrintableTripDocData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Acțiuni în masă (Bulk Select + Bulk Edit + Bulk Delete) — Șoferi, Clienți, Facturare
  const [showBulkEditDrivers, setShowBulkEditDrivers] = useState(false);
  const [bulkDriverStatus, setBulkDriverStatus] = useState<
    'KEEP' | DriverDocumentRecord['availabilityStatus']
  >('KEEP');
  const [bulkDriverAssembly, setBulkDriverAssembly] = useState('');
  const [bulkDriverLicenseExpiry, setBulkDriverLicenseExpiry] = useState('');
  const [bulkDriverTachoExpiry, setBulkDriverTachoExpiry] = useState('');
  const [showBulkDeleteDrivers, setShowBulkDeleteDrivers] = useState(false);

  const [showBulkEditClients, setShowBulkEditClients] = useState(false);
  const [bulkClientCountry, setBulkClientCountry] = useState('');
  const [bulkClientRateKm, setBulkClientRateKm] = useState('');
  const [bulkClientRateLdm, setBulkClientRateLdm] = useState('');
  const [bulkClientPayTerm, setBulkClientPayTerm] = useState('');
  const [bulkClientTemp, setBulkClientTemp] = useState('');
  const [showBulkDeleteClients, setShowBulkDeleteClients] = useState(false);

  const [showBulkEditInvoices, setShowBulkEditInvoices] = useState(false);
  const [bulkInvoiceStatus, setBulkInvoiceStatus] = useState<
    'KEEP' | InvoiceRecord['status']
  >('KEEP');
  const [bulkInvoiceTrailerId, setBulkInvoiceTrailerId] = useState('');
  const [showBulkDeleteInvoices, setShowBulkDeleteInvoices] = useState(false);

  useEffect(() => {
    setInvoicesPage(1);
  }, [invoiceSearch, invoiceStatusFilter, invoicesPageSize, invoiceSort]);

  // Lock background scroll whenever any modal is open
  useEffect(() => {
    const anyModal = Boolean(
      selectedDossier ||
        editingTechRecord ||
        editingDriver ||
        viewingDriver ||
        viewingClient ||
        editingClient ||
        viewingInvoice ||
        printableDoc ||
        showBulkEditDrivers ||
        showBulkDeleteDrivers ||
        showBulkEditClients ||
        showBulkDeleteClients ||
        showBulkEditInvoices ||
        showBulkDeleteInvoices
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
    viewingDriver,
    viewingClient,
    editingClient,
    viewingInvoice,
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
    const nextStatus = 'Emisă (Scadentă 30 zile)' as const;
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.invoiceNo === invoiceNo ? { ...inv, status: nextStatus } : inv
      )
    );
    setViewingInvoice((prev) =>
      prev && prev.invoiceNo === invoiceNo ? { ...prev, status: nextStatus } : prev
    );
    setFeedback(
      `Factura ${invoiceNo} (cu anexă CMR și raport temperatură Bi-Temp) a fost generată și trimisă automat către client!`
    );
  };

  const filteredDrivers = driversList.filter((drv) => {
    if (driverStatusFilter !== 'ALL' && drv.availabilityStatus !== driverStatusFilter) {
      return false;
    }
    const q = driverSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      drv.name.toLowerCase().includes(q) ||
      drv.phone.toLowerCase().includes(q) ||
      drv.assignedAssembly.toLowerCase().includes(q) ||
      drv.availabilityStatus.toLowerCase().includes(q)
    );
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    if (!driverSort) return 0;
    let cmp = 0;
    switch (driverSort.key) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'ro');
        break;
      case 'assembly':
        cmp = a.assignedAssembly.localeCompare(b.assignedAssembly, 'ro');
        break;
      case 'license':
        cmp = a.licenseExpiry.localeCompare(b.licenseExpiry, 'ro');
        break;
      case 'tacho':
        cmp = a.remainingDailyHours - b.remainingDailyHours;
        break;
      case 'status':
        cmp = a.availabilityStatus.localeCompare(b.availabilityStatus, 'ro');
        break;
    }
    return driverSort.dir === 'asc' ? cmp : -cmp;
  });

  const {
    total: driversTotal,
    totalPages: driversPageCount,
    safePage: driversSafePage,
    startIdx: driversStartIdx,
    endIdx: driversEndIdx,
    visibleItems: visibleDrivers,
  } = paginateItems(sortedDrivers, driversPageSize, driversPage);

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter !== 'ALL') {
      const isReady = inv.status.toLowerCase().includes('gata');
      if (invoiceStatusFilter === 'READY' && !isReady) return false;
      if (invoiceStatusFilter === 'ISSUED' && isReady) return false;
    }
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.tripRef.toLowerCase().includes(q) ||
      inv.client.toLowerCase().includes(q) ||
      inv.route.toLowerCase().includes(q) ||
      inv.trailerId.toLowerCase().includes(q)
    );
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (!invoiceSort) return 0;
    let cmp = 0;
    switch (invoiceSort.key) {
      case 'invoiceNo':
        cmp = a.invoiceNo.localeCompare(b.invoiceNo, 'ro');
        break;
      case 'client':
        cmp = a.client.localeCompare(b.client, 'ro');
        break;
      case 'route':
        cmp = a.route.localeCompare(b.route, 'ro');
        break;
      case 'revenue':
        cmp = a.revenueEur - b.revenueEur;
        break;
      case 'groupage':
        cmp = a.groupageBonusEur - b.groupageBonusEur;
        break;
      case 'costs':
        cmp = a.directCostsEur - b.directCostsEur;
        break;
      case 'profit':
        cmp = a.netProfitEur - b.netProfitEur;
        break;
    }
    return invoiceSort.dir === 'asc' ? cmp : -cmp;
  });

  const {
    total: invoicesTotal,
    totalPages: invoicesPageCount,
    safePage: invoicesSafePage,
    startIdx: invoicesStartIdx,
    endIdx: invoicesEndIdx,
    visibleItems: visibleInvoices,
  } = paginateItems(sortedInvoices, invoicesPageSize, invoicesPage);

  const clientCountries = Array.from(
    new Set(clientsList.map((c) => c.countryCode.toUpperCase()).filter(Boolean))
  ).sort();

  const filteredClients = clientsList.filter((c) => {
    if (
      clientsCountryFilter !== 'ALL' &&
      c.countryCode.toUpperCase() !== clientsCountryFilter
    ) {
      return false;
    }
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.vatCode.toLowerCase().includes(q) ||
      c.countryCode.toLowerCase().includes(q) ||
      c.defaultFromCity.toLowerCase().includes(q) ||
      c.defaultToCity.toLowerCase().includes(q) ||
      c.cargoCategory.toLowerCase().includes(q)
    );
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!clientSort) return 0;
    let cmp = 0;
    switch (clientSort.key) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'ro');
        break;
      case 'vat':
        cmp = `${a.countryCode}-${a.vatCode}`.localeCompare(
          `${b.countryCode}-${b.vatCode}`,
          'ro'
        );
        break;
      case 'corridor':
        cmp = `${a.defaultFromCity} -> ${a.defaultToCity}`.localeCompare(
          `${b.defaultFromCity} -> ${b.defaultToCity}`,
          'ro'
        );
        break;
      case 'ldm':
        cmp = a.defaultLdm - b.defaultLdm;
        break;
      case 'rate':
        cmp = (a.rateEurPerKm ?? 1.42) - (b.rateEurPerKm ?? 1.42);
        break;
    }
    return clientSort.dir === 'asc' ? cmp : -cmp;
  });

  const {
    total: clientsTotal,
    totalPages: clientsPageCount,
    safePage: clientsSafePage,
    startIdx: clientsStartIdx,
    endIdx: clientsEndIdx,
    visibleItems: visibleClients,
  } = paginateItems(sortedClients, clientsPageSize, clientsPage);

  const driversSelection = useTableSelection(
    sortedDrivers.map((d) => d.id),
    visibleDrivers.map((d) => d.id)
  );
  const selectedDriverItems = sortedDrivers.filter((d) =>
    driversSelection.isSelected(d.id)
  );

  const clientsSelection = useTableSelection(
    sortedClients.map((c) => c.id),
    visibleClients.map((c) => c.id)
  );
  const selectedClientItems = sortedClients.filter((c) =>
    clientsSelection.isSelected(c.id)
  );

  const invoicesSelection = useTableSelection(
    sortedInvoices.map((inv) => inv.invoiceNo),
    visibleInvoices.map((inv) => inv.invoiceNo)
  );
  const selectedInvoiceItems = sortedInvoices.filter((inv) =>
    invoicesSelection.isSelected(inv.invoiceNo)
  );

  const handleApplyBulkEditDrivers = (e: React.FormEvent) => {
    e.preventDefault();
    if (driversSelection.selectedCount === 0) return;
    const selectedSet = driversSelection.selectedIds;
    const updated = driversList.map((d) => {
      if (!selectedSet.has(d.id)) return d;
      return {
        ...d,
        availabilityStatus:
          bulkDriverStatus !== 'KEEP' ? bulkDriverStatus : d.availabilityStatus,
        assignedAssembly:
          bulkDriverAssembly.trim() ? bulkDriverAssembly.trim() : d.assignedAssembly,
        licenseExpiry:
          bulkDriverLicenseExpiry.trim()
            ? bulkDriverLicenseExpiry.trim()
            : d.licenseExpiry,
        tachoCardExpiry:
          bulkDriverTachoExpiry.trim()
            ? bulkDriverTachoExpiry.trim()
            : d.tachoCardExpiry,
      };
    });
    setDriversList(updated);
    try {
      localStorage.setItem(DRIVERS_DOCS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setFeedback(`${driversSelection.selectedCount} șoferi au fost actualizați în masă!`);
    driversSelection.clearSelection();
    setShowBulkEditDrivers(false);
  };

  const handleConfirmBulkDeleteDrivers = () => {
    if (driversSelection.selectedCount === 0) return;
    const count = driversSelection.selectedCount;
    const selectedSet = driversSelection.selectedIds;
    const updated = driversList.filter((d) => !selectedSet.has(d.id));
    setDriversList(updated);
    try {
      localStorage.setItem(DRIVERS_DOCS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    driversSelection.clearSelection();
    setShowBulkDeleteDrivers(false);
    setFeedback(`${count} șoferi au fost eliminați din evidență.`);
  };

  const handleApplyBulkEditClients = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientsSelection.selectedCount === 0) return;
    const selectedSet = clientsSelection.selectedIds;
    const parsedRateKm = Number(bulkClientRateKm);
    const parsedRateLdm = Number(bulkClientRateLdm);
    const parsedPayTerm = Number(bulkClientPayTerm);
    const parsedTemp = Number(bulkClientTemp);
    const updated = clientsList.map((c) => {
      if (!selectedSet.has(c.id)) return c;
      return {
        ...c,
        countryCode: bulkClientCountry.trim()
          ? bulkClientCountry.trim().toUpperCase()
          : c.countryCode,
        rateEurPerKm:
          bulkClientRateKm.trim() && Number.isFinite(parsedRateKm)
            ? parsedRateKm
            : c.rateEurPerKm,
        rateEurPerLdm:
          bulkClientRateLdm.trim() && Number.isFinite(parsedRateLdm)
            ? parsedRateLdm
            : c.rateEurPerLdm,
        paymentTermDays:
          bulkClientPayTerm.trim() && Number.isFinite(parsedPayTerm)
            ? parsedPayTerm
            : c.paymentTermDays,
        defaultTemp:
          bulkClientTemp.trim() && Number.isFinite(parsedTemp)
            ? parsedTemp
            : c.defaultTemp,
      };
    });
    setClientsList(updated);
    saveAllClientsToDb(updated);
    setFeedback(`${clientsSelection.selectedCount} clienți au fost actualizați în masă!`);
    clientsSelection.clearSelection();
    setShowBulkEditClients(false);
  };

  const handleConfirmBulkDeleteClients = () => {
    if (clientsSelection.selectedCount === 0) return;
    const count = clientsSelection.selectedCount;
    const selectedSet = clientsSelection.selectedIds;
    const updated = clientsList.filter((c) => !selectedSet.has(c.id));
    setClientsList(updated);
    saveAllClientsToDb(updated);
    clientsSelection.clearSelection();
    setShowBulkDeleteClients(false);
    setFeedback(`${count} clienți au fost eliminați din baza de date.`);
  };

  const handleApplyBulkEditInvoices = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoicesSelection.selectedCount === 0) return;
    const selectedSet = invoicesSelection.selectedIds;
    setInvoices((prev) =>
      prev.map((inv) => {
        if (!selectedSet.has(inv.invoiceNo)) return inv;
        return {
          ...inv,
          status: bulkInvoiceStatus !== 'KEEP' ? bulkInvoiceStatus : inv.status,
          trailerId: bulkInvoiceTrailerId || inv.trailerId,
        };
      })
    );
    setFeedback(`${invoicesSelection.selectedCount} facturi au fost actualizate în masă!`);
    invoicesSelection.clearSelection();
    setShowBulkEditInvoices(false);
  };

  const handleConfirmBulkDeleteInvoices = () => {
    if (invoicesSelection.selectedCount === 0) return;
    const count = invoicesSelection.selectedCount;
    const selectedSet = invoicesSelection.selectedIds;
    setInvoices((prev) => prev.filter((inv) => !selectedSet.has(inv.invoiceNo)));
    invoicesSelection.clearSelection();
    setShowBulkDeleteInvoices(false);
    setFeedback(`${count} facturi au fost eliminate din evidență.`);
  };

  const handleExportDriversExcel = (rowsOverride?: DriverDocumentRecord[]) => {
    const targetRows = Array.isArray(rowsOverride) ? rowsOverride : sortedDrivers;
    const res = exportRowsToExcel({
      fileName: 'BlueTrans_Soferi',
      sheetName: 'Soferi',
      rows: targetRows,
      columns: [
        { header: '#', value: (_, i) => i + 1, minWidth: 5, maxWidth: 8 },
        { header: 'Nume Șofer', value: (d) => d.name },
        { header: 'Telefon', value: (d) => d.phone },
        { header: 'Status Disponibilitate', value: (d) => d.availabilityStatus },
        { header: 'Ansamblu Alocat', value: (d) => d.assignedAssembly },
        { header: 'Categorii Permis', value: (d) => d.licenseCategories },
        { header: 'Expirare Permis', value: (d) => d.licenseExpiry },
        { header: 'Atestat CPI / CPC', value: (d) => d.cpiCpcCertExpiry },
        { header: 'Card Tahograf', value: (d) => d.tachoCardExpiry },
        { header: 'Aviz Medical / Psiho', value: (d) => d.medicalPsychExpiry },
        { header: 'Ore Rămase Azi (CE 561)', value: (d) => d.remainingDailyHours },
        { header: 'Ore Rămase Săptămână', value: (d) => d.remainingWeeklyHours },
      ],
    });
    setFeedback(`Export Excel generat: ${res.fileName} (${res.rowCount} șoferi).`);
  };

  const handleExportClientsExcel = (rowsOverride?: SavedClientRecord[]) => {
    const targetRows = Array.isArray(rowsOverride) ? rowsOverride : sortedClients;
    const res = exportRowsToExcel({
      fileName: 'BlueTrans_Clienti',
      sheetName: 'Clienti',
      rows: targetRows,
      columns: [
        { header: '#', value: (_, i) => i + 1, minWidth: 5, maxWidth: 8 },
        { header: 'Companie Client', value: (c) => c.name },
        { header: 'Categorie Marfă', value: (c) => c.cargoCategory },
        { header: 'Țară', value: (c) => c.countryCode },
        { header: 'CUI / VAT', value: (c) => c.vatCode },
        { header: 'Oraș Încărcare Implicit', value: (c) => c.defaultFromCity },
        { header: 'Oraș Descărcare Implicit', value: (c) => c.defaultToCity },
        { header: 'LDM Standard', value: (c) => c.defaultLdm },
        { header: 'Tonaj Standard (t)', value: (c) => c.defaultWeightTons },
        { header: 'Temperatură (°C)', value: (c) => c.defaultTemp },
        { header: 'Tarif EUR/km', value: (c) => c.rateEurPerKm ?? 1.42 },
        { header: 'Tarif EUR/LDM', value: (c) => c.rateEurPerLdm ?? 195 },
        { header: 'Scadență (zile)', value: (c) => c.paymentTermDays ?? 30 },
        { header: 'Persoană Contact', value: (c) => c.contactPerson || '' },
        { header: 'Telefon', value: (c) => c.phone || '' },
        { header: 'Email', value: (c) => c.email || '' },
      ],
    });
    setFeedback(`Export Excel generat: ${res.fileName} (${res.rowCount} clienți).`);
  };

  const handleExportInvoicesExcel = (rowsOverride?: InvoiceRecord[]) => {
    const targetRows = Array.isArray(rowsOverride) ? rowsOverride : sortedInvoices;
    const res = exportRowsToExcel({
      fileName: 'BlueTrans_Facturare',
      sheetName: 'Facturare',
      rows: targetRows,
      columns: [
        { header: '#', value: (_, i) => i + 1, minWidth: 5, maxWidth: 8 },
        { header: 'Nr. Factură', value: (inv) => inv.invoiceNo },
        { header: 'Cursă', value: (inv) => inv.tripRef },
        { header: 'Clienți', value: (inv) => inv.client },
        {
          header: 'Cap Tractor',
          value: (inv) => {
            const tr = trailers.find((t) => t.id === inv.trailerId);
            return tr ? tr.tractorId.split(' (')[0] : '';
          },
        },
        { header: 'Semiremorcă', value: (inv) => inv.trailerId },
        { header: 'Rută', value: (inv) => inv.route },
        { header: 'Venit Total (EUR)', value: (inv) => inv.revenueEur },
        { header: 'Bonus Grupaj (EUR)', value: (inv) => inv.groupageBonusEur },
        { header: 'Cost Direct (EUR)', value: (inv) => inv.directCostsEur },
        { header: 'Profit Net (EUR)', value: (inv) => inv.netProfitEur },
        { header: 'Marjă (%)', value: (inv) => inv.marginPct },
        { header: 'Cod UIT e-Transport', value: (inv) => uitCodes[inv.invoiceNo] || '' },
        { header: 'Status Facturare', value: (inv) => inv.status },
      ],
    });
    setFeedback(`Export Excel generat: ${res.fileName} (${res.rowCount} facturi).`);
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Admin-only sub-toggle inside Flotă (Flotă | Integrări & SaaS); Clienți, Șoferi & Facturare sunt direct în Sidebar */}
      {subTab === 'fleet' && userRole === 'ADMIN' && (
        <div className="tahoe-glass rounded-full p-1.5 sm:p-2.5 w-full sm:w-fit">
          <div
            role="tablist"
            aria-label="Secțiuni flotă și integrări"
            className="tps-subtab-scroller grid grid-cols-2 gap-1 sm:flex sm:flex-nowrap sm:items-center sm:gap-2"
            onKeyDown={(e) => {
              const ids: Array<'fleet' | 'integrations'> = ['fleet', 'integrations'];
              const idx = ids.indexOf(fleetSubSection);
              let nextIdx = -1;
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') nextIdx = (idx + 1) % 2;
              else if (e.key === 'Home') nextIdx = 0;
              else if (e.key === 'End') nextIdx = 1;
              if (nextIdx >= 0) {
                e.preventDefault();
                setFleetSubSection(ids[nextIdx]);
                const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                buttons[nextIdx]?.focus();
              }
            }}
          >
            {[
              { id: 'fleet' as const, label: 'Flotă', icon: Truck },
              { id: 'integrations' as const, label: 'Integrări & SaaS', icon: PlugZap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = section === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setFleetSubSection(tab.id)}
                  className="tps-nav-tab-btn min-w-0 w-full sm:w-auto min-h-[36px] sm:min-h-0 sm:h-9 px-3 sm:px-4 rounded-full tahoe-btn-secondary text-[11px] sm:text-xs font-bold text-white/80 hover:text-white flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
        <div className="space-y-3 sm:space-y-4">
          <div className="tahoe-glass rounded-[24px] sm:rounded-[28px] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-white/10 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center justify-between gap-2 w-full sm:w-auto min-w-0">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <IdCard className="w-4 h-4 text-[#0A84FF] shrink-0" />
                      <span className="sm:hidden truncate">Șoferi &amp; Tahograf ({driversTotal})</span>
                      <span className="hidden sm:inline">
                        Gestiune Șoferi ({driversTotal}) · Documente (Permis C+E, CPI/CPC, Card Tahograf) &amp; CE 561/2006
                      </span>
                    </h2>
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
                    className="sm:hidden px-3 py-1.5 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Șofer nou</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 min-w-[175px] sm:w-52 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                      placeholder="Caută șofer, telefon, camion..."
                      className="w-full tahoe-card-inner rounded-full pl-8 pr-3.5 py-1.5 text-xs text-white border border-white/15"
                    />
                  </div>

                  <select
                    aria-label="Filtrează șoferii după status"
                    value={driverStatusFilter}
                    onChange={(e) => setDriverStatusFilter(e.target.value)}
                    className="tahoe-card-inner rounded-full px-3 py-1.5 text-xs font-bold text-white border border-white/15 cursor-pointer"
                  >
                    <option value="ALL">Toți ({driversList.length})</option>
                    <option value="În cursă activă">În cursă activă</option>
                    <option value="Disponibil Bază Oradea">Disponibil Bază Oradea</option>
                    <option value="Pauză / Repaus 45h CE">Pauză / Repaus 45h CE</option>
                  </select>

                  <ViewModeToggle
                    value={driversViewMode}
                    onChange={setDriversViewMode}
                    ariaLabel="Mod afișare șoferi"
                  />

                  <ExportExcelButton
                    onClick={() => handleExportDriversExcel(sortedDrivers)}
                    count={sortedDrivers.length}
                    disabled={sortedDrivers.length === 0}
                  />

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
                    className="hidden sm:flex px-4 py-1.5 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-xs font-extrabold items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adaugă Șofer Nou</span>
                  </button>
                </div>
              </div>
            </div>

            {driversSelection.selectedCount > 0 && (
              <div className="px-3 sm:px-4 pt-3">
                <BulkActionBar
                  selectedCount={driversSelection.selectedCount}
                  totalFilteredCount={sortedDrivers.length}
                  onSelectAllFiltered={driversSelection.selectAllFiltered}
                  onClearSelection={driversSelection.clearSelection}
                  onBulkExport={() => handleExportDriversExcel(selectedDriverItems)}
                  onBulkEdit={() => {
                    setBulkDriverStatus('KEEP');
                    setBulkDriverAssembly('');
                    setBulkDriverLicenseExpiry('');
                    setBulkDriverTachoExpiry('');
                    setShowBulkEditDrivers(true);
                  }}
                  onBulkDelete={() => setShowBulkDeleteDrivers(true)}
                  itemNounSingular="șofer selectat"
                  itemNounPlural="șoferi selectați"
                />
              </div>
            )}

            {driversViewMode === 'cards' ? (
              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleDrivers.length === 0 && (
                  <div className="col-span-full py-10 text-center text-sm text-white/60">
                    Niciun șofer nu corespunde filtrelor curente.
                  </div>
                )}
                {visibleDrivers.map((drv, idx) => {
                  const selected = driversSelection.isSelected(drv.id);
                  return (
                  <div
                    key={drv.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewingDriver(drv)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewingDriver(drv);
                      }
                    }}
                    className={`tahoe-card-inner rounded-[20px] p-4 border transition cursor-pointer flex flex-col justify-between gap-3 text-left ${
                      selected
                        ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                        : 'border-white/12 hover:border-[#0A84FF]/55 hover:bg-[#0A84FF]/5'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <BulkCheckbox
                            checked={selected}
                            onChange={() => driversSelection.toggleOne(drv.id)}
                            ariaLabel={`Selectează ${drv.name}`}
                          />
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/75 text-[10.5px] font-bold tabular-nums">
                            #{driversStartIdx + idx + 1}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 font-bold text-[10.5px]">
                            {drv.availabilityStatus}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDriver({ ...drv });
                          }}
                          className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white cursor-pointer shrink-0 transition"
                          title="Editează șofer"
                          aria-label={`Editează ${drv.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-white text-sm">{drv.name}</div>
                        <a
                          href={`tel:${drv.phone.replace(/\s+/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] text-[#30D158] hover:underline tabular-nums mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{drv.phone}</span>
                        </a>
                      </div>

                      <div className="rounded-xl bg-white/5 px-3 py-2 border border-white/10 text-xs flex items-center justify-between gap-2">
                        <span className="text-white/60">Ansamblu:</span>
                        <span className="font-bold text-[#64D2FF] tabular-nums truncate">
                          {drv.assignedAssembly}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                        <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                          <div className="text-white/55 text-[10px]">Permis {drv.licenseCategories}</div>
                          <div className="font-bold text-[#30D158]">Exp: {drv.licenseExpiry}</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                          <div className="text-white/55 text-[10px]">Medical / Psiho</div>
                          <div className="font-bold text-[#30D158] truncate">{drv.medicalPsychExpiry}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] tabular-nums">
                      <span>
                        Azi: <strong className="text-[#FF9F0A]">{drv.remainingDailyHours}h</strong> / 9h
                      </span>
                      <span>
                        Săpt.: <strong className="text-white">{drv.remainingWeeklyHours}h</strong> / 56h
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className={TAHOE_TABLE_SCROLL_CLASS}>
                <table className="w-full text-left" style={TAHOE_TABLE_STYLE}>
                  <thead>
                    <tr>
                      <CheckboxTh
                        checked={driversSelection.isAllVisibleSelected}
                        indeterminate={driversSelection.isSomeVisibleSelected}
                        onChange={driversSelection.toggleAllVisible}
                        ariaLabel="Selectează toți șoferii de pe pagină"
                      />
                      <SortableTh label="#" sort={null} align="center" className="w-8" />
                      <SortableTh
                        label="Șofer"
                        sortKey="name"
                        sort={driverSort}
                        onToggle={(k) => setDriverSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Ansamblu"
                        sortKey="assembly"
                        sort={driverSort}
                        onToggle={(k) => setDriverSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Permis"
                        sortKey="license"
                        sort={driverSort}
                        onToggle={(k) => setDriverSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh label="Atestat & Taho" sort={null} />
                      <SortableTh label="Medical" sort={null} />
                      <SortableTh
                        label="CE 561"
                        sortKey="tacho"
                        sort={driverSort}
                        onToggle={(k) => setDriverSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Status & Acțiuni"
                        sortKey="status"
                        sort={driverSort}
                        onToggle={(k) => setDriverSort((p) => toggleSortState(p, k))}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDrivers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-white/60">
                          Niciun șofer nu corespunde filtrelor curente.
                        </td>
                      </tr>
                    )}
                    {visibleDrivers.map((drv, idx) => {
                      const selected = driversSelection.isSelected(drv.id);
                      const shortLicense = drv.licenseCategories.replace(/^Cat\.\s*/i, '');
                      const shortCpi = drv.cpiCpcCertExpiry.replace(/\s*\(CPI\/CPC Marfă\)/i, '');
                      const shortTacho = drv.tachoCardExpiry.replace(/\s*\(Card G2V2\)/i, '');
                      const shortMed = drv.medicalPsychExpiry.replace(/\s*\(Apt Medical\/Psiho\)/i, '');
                      const shortStatus =
                        drv.availabilityStatus === 'În cursă activă'
                          ? 'În cursă'
                          : drv.availabilityStatus === 'Pauză 45m / Odihnă'
                            ? 'Pauză 45m'
                            : 'Disponibil';
                      return (
                      <tr
                        key={drv.id}
                        onClick={() => setViewingDriver(drv)}
                        className="cursor-pointer transition hover:bg-[#0A84FF]/10"
                        style={getTahoeRowStyle(idx, selected)}
                      >
                        <td className="px-1.5 text-center" style={TAHOE_CELL_BORDER_STYLE}>
                          <BulkCheckbox
                            checked={selected}
                            onChange={() => driversSelection.toggleOne(drv.id)}
                            ariaLabel={`Selectează ${drv.name}`}
                          />
                        </td>
                        <td
                          className="px-2 text-center text-white/50 font-semibold tabular-nums"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          {driversStartIdx + idx + 1}
                        </td>
                        <td className="px-2 max-w-[165px]" style={TAHOE_CELL_BORDER_STYLE} title={`${drv.name} · ${drv.phone}`}>
                          <div className="font-bold text-white text-[12.5px] leading-tight truncate">
                            {drv.name}
                          </div>
                          <div className="text-[10px] text-white/65 tabular-nums leading-tight">
                            {drv.phone}
                          </div>
                        </td>
                        <td
                          className="px-2 font-bold text-[#64D2FF] tabular-nums whitespace-nowrap text-xs"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          {drv.assignedAssembly}
                        </td>
                        <td
                          className="px-2 tabular-nums whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="font-semibold text-white text-xs leading-tight">
                            {shortLicense}
                          </div>
                          <div className="text-[10px] text-[#30D158] leading-tight">
                            Exp: {drv.licenseExpiry}
                          </div>
                        </td>
                        <td
                          className="px-2 tabular-nums whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="font-semibold text-white text-xs leading-tight">
                            CPI: {shortCpi}
                          </div>
                          <div className="text-[10px] text-white/70 leading-tight">
                            Taho: {shortTacho}
                          </div>
                        </td>
                        <td
                          className="px-2 tabular-nums whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                          title={drv.medicalPsychExpiry}
                        >
                          <div className="text-[11px] text-[#30D158] font-semibold leading-tight">
                            {shortMed}
                          </div>
                          <div className="text-[10px] text-white/55 leading-tight">Apt Med/Psiho</div>
                        </td>
                        <td
                          className="px-2 tabular-nums whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="font-bold text-white text-xs leading-tight">
                            Azi: <span className="text-[#FF9F0A]">{drv.remainingDailyHours}h</span>/9h
                          </div>
                          <div className="text-[10px] text-white/70 leading-tight">
                            Săpt: <strong>{drv.remainingWeeklyHours}h</strong>/56h
                          </div>
                        </td>
                        <td className="px-2 whitespace-nowrap" style={TAHOE_CELL_BORDER_STYLE}>
                          <div className="inline-flex items-center gap-1">
                            <span
                              title={drv.availabilityStatus}
                              className="px-2 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 font-bold text-[10.5px]"
                            >
                              {shortStatus}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDriver(drv);
                              }}
                              className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                              title="Vezi detalii șofer"
                              aria-label={`Detalii ${drv.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDriver({ ...drv });
                              }}
                              className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                              title="Editează șofer"
                              aria-label={`Editează ${drv.name}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <ListPaginationBar
              total={driversTotal}
              startIdx={driversStartIdx}
              endIdx={driversEndIdx}
              pageSize={driversPageSize}
              onPageSizeChange={setDriversPageSize}
              page={driversSafePage}
              totalPages={driversPageCount}
              onPageChange={setDriversPage}
              unfilteredTotal={driversList.length}
              unfilteredLabel="total șoferi"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: CLIENTS & COMMERCIAL CONTRACTS DATABASE (FULL CRUD)
      ====================================================================== */}
      {section === 'clients' && (
        <div className="tahoe-glass rounded-[24px] sm:rounded-[28px] overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-white/10 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2">
                  <Building2 className="w-4 h-4 text-[#0A84FF] shrink-0" />
                  <span>Clienți &amp; contracte ({clientsTotal})</span>
                </h2>

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
                  className="sm:hidden px-3 py-1.5 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Client nou</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 min-w-[180px] sm:w-56 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Caută client, CUI/VAT, rută..."
                    className="w-full tahoe-card-inner rounded-full pl-8 pr-3.5 py-1.5 text-xs text-white border border-white/15"
                  />
                </div>

                <select
                  aria-label="Filtrează după țară"
                  value={clientsCountryFilter}
                  onChange={(e) => setClientsCountryFilter(e.target.value)}
                  className="tahoe-card-inner rounded-full px-3 py-1.5 text-xs font-bold text-white border border-white/15 cursor-pointer"
                >
                  <option value="ALL">Toate țările ({clientsList.length})</option>
                  {clientCountries.map((cc) => (
                    <option key={cc} value={cc}>
                      {formatCountryBadge(cc)} · {cc}
                    </option>
                  ))}
                </select>

                {/* Comutator: Carduri / Listă (identic cu Flotă) */}
                <ViewModeToggle
                  value={clientsViewMode}
                  onChange={setClientsViewMode}
                  ariaLabel="Mod afișare clienți"
                />

                <ExportExcelButton
                  onClick={() => handleExportClientsExcel(sortedClients)}
                  count={sortedClients.length}
                  disabled={sortedClients.length === 0}
                />

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
                  className="hidden sm:flex px-4 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-xs font-extrabold items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adaugă Client &amp; Contract</span>
                </button>
              </div>
            </div>
          </div>

          {clientsSelection.selectedCount > 0 && (
            <div className="px-3 sm:px-4 pt-3">
              <BulkActionBar
                selectedCount={clientsSelection.selectedCount}
                totalFilteredCount={sortedClients.length}
                onSelectAllFiltered={clientsSelection.selectAllFiltered}
                onClearSelection={clientsSelection.clearSelection}
                onBulkExport={() => handleExportClientsExcel(selectedClientItems)}
                onBulkEdit={() => {
                  setBulkClientCountry('');
                  setBulkClientRateKm('');
                  setBulkClientRateLdm('');
                  setBulkClientPayTerm('');
                  setBulkClientTemp('');
                  setShowBulkEditClients(true);
                }}
                onBulkDelete={() => setShowBulkDeleteClients(true)}
                itemNounSingular="client selectat"
                itemNounPlural="clienți selectați"
              />
            </div>
          )}

          {clientsViewMode === 'cards' ? (
            <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleClients.length === 0 && (
                <div className="col-span-full py-10 text-center text-sm text-white/60">
                  Niciun client nu corespunde filtrelor curente.
                </div>
              )}
              {visibleClients.map((cli, idx) => {
                const roadKm = estimateHgvRoadKm(cli.defaultFromCity, cli.defaultToCity);
                const selected = clientsSelection.isSelected(cli.id);
                return (
                  <div
                    key={cli.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewingClient(cli)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewingClient(cli);
                      }
                    }}
                    className={`tahoe-card-inner rounded-[20px] p-4 border transition cursor-pointer flex flex-col justify-between gap-3 text-left ${
                      selected
                        ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                        : 'border-white/12 hover:border-[#0A84FF]/55 hover:bg-[#0A84FF]/5'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <BulkCheckbox
                            checked={selected}
                            onChange={() => clientsSelection.toggleOne(cli.id)}
                            ariaLabel={`Selectează ${cli.name}`}
                          />
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/75 text-[10.5px] font-bold tabular-nums">
                            #{clientsStartIdx + idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#0A84FF]/15 text-[#64D2FF] font-extrabold text-[11px]">
                            {formatCountryBadge(cli.countryCode)}
                          </span>
                          <span className="font-bold text-white/85 text-[11px] tabular-nums">
                            {cli.vatCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClient({ ...cli });
                            }}
                            className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white cursor-pointer transition"
                            title="Editează client"
                            aria-label={`Editează ${cli.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClient(cli.id, cli.name);
                            }}
                            className="p-1.5 rounded-full tahoe-btn-secondary text-white/75 hover:text-rose-400 cursor-pointer transition"
                            title="Șterge client"
                            aria-label={`Șterge ${cli.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="font-extrabold text-white text-sm leading-snug">
                          {cli.name}
                        </div>
                        <div className="text-[11px] text-white/60 mt-0.5 line-clamp-1">
                          {cli.cargoCategory}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/5 px-3 py-2 border border-white/10 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">
                            {cli.defaultFromCity} → {cli.defaultToCity}
                          </span>
                          {roadKm > 0 && (
                            <span className="text-[10.5px] text-white/55 tabular-nums shrink-0">
                              ~{roadKm} km
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                          <span>
                            <strong className="text-[#64D2FF]">{cli.defaultLdm.toFixed(1)} LDM</strong> ·{' '}
                            <strong className="text-[#FF9F0A]">{cli.defaultWeightTons}T</strong> ·{' '}
                            <strong className="text-[#30D158]">
                              {cli.defaultTemp > 0 ? `+${cli.defaultTemp}` : cli.defaultTemp}°C
                            </strong>
                          </span>
                          <span className="font-bold text-[#30D158] whitespace-nowrap shrink-0">
                            {(cli.rateEurPerKm ?? 1.42).toFixed(2)}&#160;€/km
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px] text-white/65">
                      <span className="truncate">
                        {cli.contactPerson || 'Responsabil Logistică'} · Scadență {cli.paymentTermDays ?? 30} zile
                      </span>
                      <span className="text-[#64D2FF] font-bold inline-flex items-center gap-1 shrink-0">
                        <Eye className="w-3 h-3" />
                        Detalii
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={TAHOE_TABLE_SCROLL_CLASS}>
              <table className="w-full text-left" style={TAHOE_TABLE_STYLE}>
                <thead>
                  <tr>
                    <CheckboxTh
                      checked={clientsSelection.isAllVisibleSelected}
                      indeterminate={clientsSelection.isSomeVisibleSelected}
                      onChange={clientsSelection.toggleAllVisible}
                      ariaLabel="Selectează toți clienții de pe pagină"
                    />
                    <SortableTh label="#" sort={null} align="center" className="w-10" />
                    <SortableTh
                      label="Companie Client"
                      sortKey="name"
                      sort={clientSort}
                      onToggle={(k) => setClientSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh
                      label="Țară & CUI / VAT"
                      sortKey="vat"
                      sort={clientSort}
                      onToggle={(k) => setClientSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh
                      label="Coridor Implicit"
                      sortKey="corridor"
                      sort={clientSort}
                      onToggle={(k) => setClientSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh
                      label="Parametri Standard"
                      sortKey="ldm"
                      sort={clientSort}
                      onToggle={(k) => setClientSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh
                      label="Tarif & Scadență"
                      sortKey="rate"
                      sort={clientSort}
                      onToggle={(k) => setClientSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh label="Acțiuni" sort={null} align="center" />
                  </tr>
                </thead>
                <tbody>
                  {visibleClients.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-white/60 text-sm">
                        Niciun client nu corespunde filtrelor curente.
                      </td>
                    </tr>
                  )}
                  {visibleClients.map((cli, idx) => {
                    const selected = clientsSelection.isSelected(cli.id);
                    return (
                    <tr
                      key={cli.id}
                      onClick={() => setViewingClient(cli)}
                      className="cursor-pointer transition hover:bg-[#0A84FF]/10"
                      style={getTahoeRowStyle(idx, selected)}
                      title="Click pentru detalii complete client & contract"
                    >
                      <td className="px-2 text-center" style={TAHOE_CELL_BORDER_STYLE}>
                        <BulkCheckbox
                          checked={selected}
                          onChange={() => clientsSelection.toggleOne(cli.id)}
                          ariaLabel={`Selectează ${cli.name}`}
                        />
                      </td>
                      <td
                        className="px-2.5 text-center text-white/50 font-semibold whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        {clientsStartIdx + idx + 1}
                      </td>
                      <td
                        className="px-2 sm:px-2.5 max-w-[230px]"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <div className="font-bold text-white text-[12.5px] leading-tight truncate">
                          {cli.name}
                        </div>
                        <div className="text-[10.5px] text-white/60 leading-tight truncate">
                          {cli.cargoCategory}
                        </div>
                      </td>
                      <td
                        className="px-2 sm:px-2.5 whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-[#0A84FF]/15 text-[#64D2FF] font-extrabold text-[11px]">
                          {formatCountryBadge(cli.countryCode)}
                        </span>{' '}
                        <span className="font-bold text-white ml-1">{cli.vatCode}</span>
                      </td>
                      <td
                        className="px-2 sm:px-2.5 font-bold text-white whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        {cli.defaultFromCity} → {cli.defaultToCity}
                      </td>
                      <td
                        className="px-2 sm:px-2.5 whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <span className="font-extrabold text-[#64D2FF]">
                          {cli.defaultLdm.toFixed(1)} LDM
                        </span>{' '}
                        · <span className="font-bold text-[#FF9F0A]">{cli.defaultWeightTons}T</span> ·{' '}
                        <span className="font-bold text-[#30D158]">
                          {cli.defaultTemp > 0 ? `+${cli.defaultTemp}` : cli.defaultTemp}°C
                        </span>
                      </td>
                      <td
                        className="px-2 sm:px-2.5 whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <div className="font-bold text-[#30D158] text-xs leading-tight">
                          {(cli.rateEurPerKm ?? 1.42).toFixed(2)}&#160;€/km · {cli.rateEurPerLdm ?? 195}&#160;€/LDM
                        </div>
                        <div className="text-[10.5px] text-white/60 leading-tight">
                          Scadență: {cli.paymentTermDays ?? 30} zile
                        </div>
                      </td>
                      <td
                        className="px-2 sm:px-2.5 whitespace-nowrap text-center"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingClient(cli);
                            }}
                            className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                            title="Vezi detalii client"
                            aria-label={`Detalii ${cli.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClient({ ...cli });
                            }}
                            className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                            title="Editează client"
                            aria-label={`Editează ${cli.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClient(cli.id, cli.name);
                            }}
                            className="p-1.5 rounded-full tahoe-btn-secondary text-white/75 hover:text-rose-400 inline-flex items-center justify-center cursor-pointer transition"
                            title="Șterge client"
                            aria-label={`Șterge ${cli.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <ListPaginationBar
            total={clientsTotal}
            startIdx={clientsStartIdx}
            endIdx={clientsEndIdx}
            pageSize={clientsPageSize}
            onPageSizeChange={setClientsPageSize}
            page={clientsSafePage}
            totalPages={clientsPageCount}
            onPageChange={setClientsPage}
            unfilteredTotal={clientsList.length}
            unfilteredLabel="total clienți"
          />
        </div>
      )}

      {/* =====================================================================
          SECTION 4: INVOICING, PROFITABILITY & PRINTABLE CMR / INVOICE
      ====================================================================== */}
      {section === 'invoicing' && (
        <div className="tahoe-glass rounded-[24px] sm:rounded-[28px] overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-white/10 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2">
                <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="sm:hidden">Facturare &amp; CMR ({invoicesTotal})</span>
                <span className="hidden sm:inline">
                  Facturare Curse ({invoicesTotal}) · Venit Grupaj, Marjă Netă &amp; CMR / Factură PDF
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 min-w-[175px] sm:w-52 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Caută factură, client, rută..."
                    className="w-full tahoe-card-inner rounded-full pl-8 pr-3.5 py-1.5 text-xs text-white border border-white/15"
                  />
                </div>

                <select
                  aria-label="Filtrează facturile după status"
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="tahoe-card-inner rounded-full px-3 py-1.5 text-xs font-bold text-white border border-white/15 cursor-pointer"
                >
                  <option value="ALL">Toate ({invoices.length})</option>
                  <option value="ISSUED">Emise</option>
                  <option value="READY">Gata de facturare</option>
                </select>

                <ViewModeToggle
                  value={invoicesViewMode}
                  onChange={setInvoicesViewMode}
                  ariaLabel="Mod afișare facturi"
                />

                <ExportExcelButton
                  onClick={() => handleExportInvoicesExcel(sortedInvoices)}
                  count={sortedInvoices.length}
                  disabled={sortedInvoices.length === 0}
                />
              </div>
            </div>
          </div>

          {invoicesSelection.selectedCount > 0 && (
            <div className="px-3 sm:px-4 pt-3">
              <BulkActionBar
                selectedCount={invoicesSelection.selectedCount}
                totalFilteredCount={sortedInvoices.length}
                onSelectAllFiltered={invoicesSelection.selectAllFiltered}
                onClearSelection={invoicesSelection.clearSelection}
                onBulkExport={() => handleExportInvoicesExcel(selectedInvoiceItems)}
                onBulkEdit={() => {
                  setBulkInvoiceStatus('KEEP');
                  setBulkInvoiceTrailerId('');
                  setShowBulkEditInvoices(true);
                }}
                onBulkDelete={() => setShowBulkDeleteInvoices(true)}
                itemNounSingular="factură selectată"
                itemNounPlural="facturi selectate"
              />
            </div>
          )}

          {invoicesViewMode === 'cards' ? (
            <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleInvoices.length === 0 && (
                <div className="col-span-full py-10 text-center text-sm text-white/60">
                  Nicio factură nu corespunde filtrelor curente.
                </div>
              )}
              {visibleInvoices.map((inv, idx) => {
                const trObj =
                  trailers.find((t) => t.id === inv.trailerId) || trailers[0];
                const trPlate = trObj.tractorId.split(' (')[0];
                const isReady = inv.status === 'Gata de facturare (CMR Semnat)';
                const selected = invoicesSelection.isSelected(inv.invoiceNo);
                return (
                  <div
                    key={inv.invoiceNo}
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewingInvoice(inv)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewingInvoice(inv);
                      }
                    }}
                    className={`tahoe-card-inner rounded-[20px] p-4 border transition cursor-pointer flex flex-col justify-between gap-3 text-left ${
                      selected
                        ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                        : 'border-white/12 hover:border-[#0A84FF]/55 hover:bg-[#0A84FF]/5'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <BulkCheckbox
                            checked={selected}
                            onChange={() => invoicesSelection.toggleOne(inv.invoiceNo)}
                            ariaLabel={`Selectează factura ${inv.invoiceNo}`}
                          />
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/75 text-[10.5px] font-bold tabular-nums">
                            #{invoicesStartIdx + idx + 1}
                          </span>
                          <span className="font-extrabold text-white text-xs tabular-nums">
                            {inv.invoiceNo}
                          </span>
                          <span className="text-[10.5px] font-bold text-[#64D2FF]">
                            {inv.tripRef}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            isReady
                              ? 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30'
                              : 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30'
                          }`}
                        >
                          {isReady ? 'Gata facturare' : 'Emisă'}
                        </span>
                      </div>

                      <div>
                        <div className="font-extrabold text-white text-sm leading-snug">
                          {inv.client}
                        </div>
                        <div className="text-[11px] text-white/70 mt-0.5">
                          <span className="font-bold text-white/90">{trPlate} + {inv.trailerId}</span> · {inv.route}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px] tabular-nums">
                        <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                          <div className="text-[10px] text-white/55">Venit</div>
                          <div className="font-extrabold text-white whitespace-nowrap">{inv.revenueEur}&#160;€</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                          <div className="text-[10px] text-white/55">Grupaj</div>
                          <div className="font-extrabold text-[#30D158] whitespace-nowrap">+{inv.groupageBonusEur}&#160;€</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-2 border border-white/10">
                          <div className="text-[10px] text-white/55">Profit Net</div>
                          <div className="font-extrabold text-[#30D158] whitespace-nowrap">
                            +{inv.netProfitEur}&#160;€ <span className="text-[10px] font-bold">({inv.marginPct}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5"
                    >
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
                        title="Deschide CMR"
                        className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-white/85 hover:text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
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
                        title="Printează"
                        aria-label={`Printează ${inv.invoiceNo}`}
                        className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-white/85 hover:text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewingInvoice(inv)}
                        title={
                          uitCodes[inv.invoiceNo]?.trim()
                            ? `Cod UIT RO e-Transport: ${uitCodes[inv.invoiceNo]}`
                            : 'Detalii, Emitere, XML & Cod UIT'
                        }
                        className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-white/80 hover:text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <span>{uitCodes[inv.invoiceNo]?.trim() ? 'UIT ✓' : '+ UIT'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={TAHOE_TABLE_SCROLL_CLASS}>
              <table className="w-full text-left" style={TAHOE_TABLE_STYLE}>
                <thead>
                  <tr>
                    <CheckboxTh
                      checked={invoicesSelection.isAllVisibleSelected}
                      indeterminate={invoicesSelection.isSomeVisibleSelected}
                      onChange={invoicesSelection.toggleAllVisible}
                      ariaLabel="Selectează toate facturile de pe pagină"
                    />
                    <SortableTh label="#" sort={null} align="center" className="w-8" />
                    <SortableTh
                      label="Factură"
                      sortKey="invoiceNo"
                      sort={invoiceSort}
                      onToggle={(k) => setInvoiceSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh
                      label="Client"
                      sortKey="client"
                      sort={invoiceSort}
                      onToggle={(k) => setInvoiceSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh
                      label="Ansamblu & Rută"
                      sortKey="route"
                      sort={invoiceSort}
                      onToggle={(k) => setInvoiceSort((p) => toggleSortState(p, k))}
                    />
                    <SortableTh
                      label="Venit (Grupaj)"
                      sortKey="revenue"
                      sort={invoiceSort}
                      onToggle={(k) => setInvoiceSort((p) => toggleSortState(p, k))}
                      align="right"
                    />
                    <SortableTh
                      label="Cost"
                      sortKey="costs"
                      sort={invoiceSort}
                      onToggle={(k) => setInvoiceSort((p) => toggleSortState(p, k))}
                      align="right"
                    />
                    <SortableTh
                      label="Profit Net"
                      sortKey="profit"
                      sort={invoiceSort}
                      onToggle={(k) => setInvoiceSort((p) => toggleSortState(p, k))}
                      align="right"
                    />
                    <SortableTh label="Documente & Acțiuni" sort={null} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {visibleInvoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-white/60">
                        Nicio factură nu corespunde filtrelor curente.
                      </td>
                    </tr>
                  )}
                  {visibleInvoices.map((inv, idx) => {
                    const trObj =
                      trailers.find((t) => t.id === inv.trailerId) || trailers[0];
                    const trPlate = trObj.tractorId.split(' (')[0];
                    const selected = invoicesSelection.isSelected(inv.invoiceNo);
                    const hasUit = Boolean(uitCodes[inv.invoiceNo]?.trim());
                    return (
                      <tr
                        key={inv.invoiceNo}
                        onClick={() => setViewingInvoice(inv)}
                        className="cursor-pointer transition hover:bg-[#0A84FF]/10"
                        style={getTahoeRowStyle(idx, selected)}
                      >
                        <td className="px-1.5 text-center" style={TAHOE_CELL_BORDER_STYLE}>
                          <BulkCheckbox
                            checked={selected}
                            onChange={() => invoicesSelection.toggleOne(inv.invoiceNo)}
                            ariaLabel={`Selectează factura ${inv.invoiceNo}`}
                          />
                        </td>
                        <td
                          className="px-2 text-center text-white/50 font-semibold tabular-nums"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          {invoicesStartIdx + idx + 1}
                        </td>
                        <td
                          className="px-2 tabular-nums font-bold text-white whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="leading-tight text-xs">{inv.invoiceNo}</div>
                          <div className="text-[10px] text-blue-400 leading-tight">{inv.tripRef}</div>
                        </td>
                        <td
                          className="px-2 font-medium text-slate-200 max-w-[165px] whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="truncate text-xs" title={inv.client}>
                            {inv.client}
                          </div>
                        </td>
                        <td
                          className="px-2 whitespace-nowrap max-w-[160px]"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="tabular-nums font-bold text-white text-xs leading-tight whitespace-nowrap">
                            {trPlate} + {inv.trailerId}
                          </div>
                          <div
                            className="text-[10px] text-slate-400 leading-tight truncate"
                            title={inv.route}
                          >
                            {inv.route}
                          </div>
                        </td>
                        <td
                          className="px-2 tabular-nums text-right whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="font-bold text-white text-xs leading-tight">
                            {inv.revenueEur}&#160;€
                          </div>
                          <div className="text-[10px] font-semibold text-emerald-400 leading-tight">
                            +{inv.groupageBonusEur}&#160;€ grupaj
                          </div>
                        </td>
                        <td
                          className="px-2 tabular-nums text-slate-300 text-right whitespace-nowrap text-xs"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          -{inv.directCostsEur}&#160;€
                        </td>
                        <td
                          className="px-2 tabular-nums text-right whitespace-nowrap"
                          style={TAHOE_CELL_BORDER_STYLE}
                        >
                          <div className="font-extrabold text-emerald-400 text-xs leading-tight whitespace-nowrap">
                            +{inv.netProfitEur}&#160;€
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            ({inv.marginPct}%)
                          </div>
                        </td>
                        <td
                          className="px-2 whitespace-nowrap text-right"
                          style={TAHOE_CELL_BORDER_STYLE}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(inv)}
                              className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer shrink-0 transition"
                              title="Detalii, Emitere, XML & Cod UIT"
                              aria-label={`Detalii ${inv.invoiceNo}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
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
                              title="Deschide CMR"
                              className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-white/85 hover:text-white font-semibold text-[10.5px] inline-flex items-center gap-1 cursor-pointer shrink-0 transition"
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
                              title="Printează"
                              aria-label={`Printează ${inv.invoiceNo}`}
                              className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer shrink-0 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setViewingInvoice(inv)}
                              title={
                                hasUit
                                  ? `Cod UIT RO e-Transport: ${uitCodes[inv.invoiceNo]} (click pentru editare)`
                                  : 'Adaugă cod UIT RO e-Transport'
                              }
                              className={`px-2.5 py-1 rounded-full tahoe-btn-secondary text-[10.5px] cursor-pointer shrink-0 transition ${
                                hasUit
                                  ? 'font-bold text-white'
                                  : 'font-medium text-white/70 hover:text-white'
                              }`}
                            >
                              {hasUit ? 'UIT ✓' : '+ UIT'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <ListPaginationBar
            total={invoicesTotal}
            startIdx={invoicesStartIdx}
            endIdx={invoicesEndIdx}
            pageSize={invoicesPageSize}
            onPageSizeChange={setInvoicesPageSize}
            page={invoicesSafePage}
            totalPages={invoicesPageCount}
            onPageChange={setInvoicesPage}
            unfilteredTotal={invoices.length}
            unfilteredLabel="total facturi"
          />
        </div>
      )}

      {section === 'invoicing' && (
        <DriverExpensesPanel
          trailerId={trailers[0]?.id || 'BH 67 STS'}
          driverName="Admin Supervizare"
          tripOptions={[]}
          expenses={driverExpenses}
          authToken={authToken}
          tenantId={activeTenant?.id || 'blue-trans'}
          canValidate={userRole !== 'SOFER'}
          hideForm
          showAllTrailers
          onDeleteExpense={onDeleteDriverExpense}
          onUpdateExpenseStatus={onUpdateDriverExpenseStatus}
        />
      )}

      {/* =====================================================================
          SECTION 5 (ADMIN): MULTI-TENANT SaaS & REAL API INTEGRATIONS
      ====================================================================== */}
      {section === 'integrations' && userRole === 'ADMIN' && (
        <div className="space-y-5">
          {/* Multi-Tenant SaaS Switcher & Onboarding */}
          <div className="tahoe-glass rounded-[26px] p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF] flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5" />
                  Arhitectură SaaS Multi-Companie (Spații Izolate pe Server)
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  Companii active ({tenants.length || 1}) · Companie curentă: {activeTenant?.name || 'Blue Trans Spedition'}
                </h2>
              </div>
            </div>

            {tenants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tenants.map((ten) => {
                  const isCurrent = ten.id === (activeTenant?.id || 'blue-trans');
                  return (
                    <div
                      key={ten.id}
                      className={`tahoe-card-inner rounded-2xl p-4 border space-y-2 ${
                        isCurrent ? 'border-[#0A84FF] ring-1 ring-[#0A84FF]/40' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-white truncate">
                          {ten.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCurrent ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {isCurrent ? 'ACTIV' : ten.plan}
                        </span>
                      </div>
                      <div className="text-xs text-white/65">
                        CUI: <strong className="text-white">{ten.vatCode}</strong> · {ten.city} · max {ten.maxTrucks} camioane
                      </div>
                      {!isCurrent && onSwitchTenant && (
                        <button
                          type="button"
                          onClick={() => onSwitchTenant(ten.id)}
                          className="w-full py-1.5 rounded-full tahoe-btn-secondary text-xs font-bold text-[#64D2FF] cursor-pointer"
                        >
                          Comută pe {ten.name} →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!authToken || !newTenantForm.name.trim()) return;
                const resp = await apiCreateTenant(authToken, {
                  name: newTenantForm.name.trim(),
                  vatCode: newTenantForm.vatCode.trim() || 'RO00000000',
                  city: newTenantForm.city.trim() || 'Oradea',
                  plan: newTenantForm.plan,
                  maxTrucks: Number(newTenantForm.maxTrucks) || 25,
                });
                if (resp.ok && resp.tenants) {
                  onTenantsUpdated?.(resp.tenants);
                  setNewTenantForm({ name: '', vatCode: '', city: 'Oradea', plan: 'Enterprise SaaS', maxTrucks: 25 });
                  setFeedback(`Compania SaaS "${resp.tenant?.name}" a fost creată cu spațiu izolat pe server!`);
                } else {
                  setFeedback(resp.error || 'Nu s-a putut crea compania.');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2 border-t border-white/10 text-xs"
            >
              <input
                type="text"
                required
                placeholder="Nume companie nouă..."
                value={newTenantForm.name}
                onChange={(e) => setNewTenantForm((p) => ({ ...p, name: e.target.value }))}
                className="sm:col-span-2 bg-black/40 border border-white/15 rounded-full px-3.5 py-2 text-white"
              />
              <input
                type="text"
                placeholder="CUI / VAT (ex: RO123456)"
                value={newTenantForm.vatCode}
                onChange={(e) => setNewTenantForm((p) => ({ ...p, vatCode: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-full px-3.5 py-2 text-white"
              />
              <input
                type="text"
                placeholder="Oraș sediu"
                value={newTenantForm.city}
                onChange={(e) => setNewTenantForm((p) => ({ ...p, city: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-full px-3.5 py-2 text-white"
              />
              <button
                type="submit"
                className="tahoe-btn-primary rounded-full px-4 py-2 font-bold cursor-pointer"
              >
                + Creează Tenant SaaS
              </button>
            </form>
          </div>

          {/* API Connectors Configuration (Server-Side Masked Vault) */}
          <div className="tahoe-glass rounded-[26px] p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#30D158] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Conectori API Reali (Stocați Exclusiv Server-Side)
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  Cargo Track GPS · Tahograf G2V2 · TimoCom / Trans.eu · Resend E-mail · WhatsApp · ANAF
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {onSyncCargoTrack && (
                  <button
                    type="button"
                    onClick={onSyncCargoTrack}
                    className="px-3 py-1.5 rounded-full bg-[#0A84FF]/20 border border-[#0A84FF]/40 text-[#64D2FF] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync GPS Cargo Track</span>
                  </button>
                )}
                {onScanExchanges && (
                  <button
                    type="button"
                    onClick={onScanExchanges}
                    className="px-3 py-1.5 rounded-full bg-[#30D158]/20 border border-[#30D158]/40 text-[#30D158] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scanează Burse</span>
                  </button>
                )}
              </div>
            </div>

            {integrationStatus && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="tahoe-card-inner rounded-2xl p-3 space-y-1">
                  <div className="font-bold text-white">Cargo Track GPS</div>
                  <div className={integrationStatus.cargoTrack.configured ? 'text-[#30D158]' : 'text-[#64D2FF]'}>
                    {integrationStatus.cargoTrack.configured ? `Conectat (${integrationStatus.cargoTrack.maskedToken})` : 'Mod Simulator Realistic'}
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 space-y-1">
                  <div className="font-bold text-white">Burse Marfă</div>
                  <div className="text-[#64D2FF]">
                    TimoCom: {integrationStatus.burse.timoComConfigured ? 'Live API' : 'Feed Demo'} · Trans.eu: {integrationStatus.burse.transEuConfigured ? 'Live API' : 'Feed Demo'}
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 space-y-1">
                  <div className="font-bold text-white">Notificări Outbound</div>
                  <div className="text-[#FF9F0A]">
                    Resend: {integrationStatus.notificari.emailConfigured ? 'Activ' : 'Outbox Preview'} · WhatsApp: {integrationStatus.notificari.whatsappConfigured ? 'Activ' : 'Link wa.me'}
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 space-y-1">
                  <div className="font-bold text-white">ANAF e-Factura UBL 2.1</div>
                  <div className="text-[#30D158]">
                    {integrationStatus.eFactura.companyCif} · {integrationStatus.eFactura.ublVersion}
                  </div>
                </div>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!authToken) return;
                setIsSavingCfg(true);
                try {
                  const nonEmpty: Record<string, string> = {};
                  for (const [k, v] of Object.entries(apiCfgForm)) {
                    if (v.trim()) nonEmpty[k] = v.trim();
                  }
                  const resp = await apiSaveIntegrationConfig(
                    authToken,
                    activeTenant?.id || 'blue-trans',
                    nonEmpty
                  );
                  if (resp.ok && resp.integrationStatus) {
                    onIntegrationUpdated?.(resp.integrationStatus);
                    setApiCfgForm({
                      cargoTrackUrl: '',
                      cargoTrackToken: '',
                      tachoUrl: '',
                      tachoToken: '',
                      timoComKey: '',
                      transEuKey: '',
                      resendApiKey: '',
                      senderEmail: '',
                      whatsappToken: '',
                      whatsappPhoneId: '',
                      anafCompanyCif: '',
                      anafCompanyName: '',
                    });
                    setFeedback('Cheile API au fost criptate/stocate pe server (mascate în interfață).');
                  } else {
                    setFeedback(resp.error || 'Eroare la salvarea configurației API.');
                  }
                } finally {
                  setIsSavingCfg(false);
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-2"
            >
              <input
                type="url"
                placeholder="Cargo Track Webhook / REST URL"
                value={apiCfgForm.cargoTrackUrl}
                onChange={(e) => setApiCfgForm((p) => ({ ...p, cargoTrackUrl: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="password"
                placeholder="Cargo Track Bearer Token"
                value={apiCfgForm.cargoTrackToken}
                onChange={(e) => setApiCfgForm((p) => ({ ...p, cargoTrackToken: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="password"
                placeholder="TimoCom / Trans.eu API Key"
                value={apiCfgForm.timoComKey}
                onChange={(e) => setApiCfgForm((p) => ({ ...p, timoComKey: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="password"
                placeholder="Resend API Key (E-mail automat)"
                value={apiCfgForm.resendApiKey}
                onChange={(e) => setApiCfgForm((p) => ({ ...p, resendApiKey: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="email"
                placeholder="Adresa E-mail Expeditor (dispatch@...)"
                value={apiCfgForm.senderEmail}
                onChange={(e) => setApiCfgForm((p) => ({ ...p, senderEmail: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="text"
                placeholder="ANAF CIF Firmă (ex: RO31894510)"
                value={apiCfgForm.anafCompanyCif}
                onChange={(e) => setApiCfgForm((p) => ({ ...p, anafCompanyCif: e.target.value }))}
                className="bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingCfg}
                  className="tahoe-btn-primary px-5 py-2 rounded-full font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingCfg ? 'Se salvează...' : 'Salvează Configurație API pe Server'}
                </button>
              </div>
            </form>

            {outbox.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-xs font-bold text-white">
                  Jurnal Notificări Outbound ({outbox.length})
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                  {outbox.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="tahoe-card-inner rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="font-bold text-[#64D2FF] uppercase">{entry.channel}</span>
                      <span className="text-white">{entry.to}</span>
                      <span className="text-white/60 truncate max-w-[260px]">{entry.subject}</span>
                      <span className="text-[#30D158] font-semibold">{entry.deliveryMode}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Summary Cards — 2-per-row compact KPIs without long helper prose on mobile; unchanged 3-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="tahoe-glass rounded-[20px] sm:rounded-[24px] p-3 sm:p-4 space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-xs font-bold text-blue-400 uppercase">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden truncate">Clienți Activi</span>
            <span className="hidden sm:inline">Clienți Salvați în Bază &amp; Conectați la Oferte Automate</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-white">
            {clientsList.length} Companii
          </div>
          <p className="hidden sm:block text-xs text-slate-400">
            Disponibili instant prin drop-list la introducerea comenzilor și conectați la generatorul de oferte comerciale pentru spațiul liber.
          </p>
        </div>

        <div className="tahoe-glass rounded-[20px] sm:rounded-[24px] p-3 sm:p-4 space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-xs font-bold text-emerald-400 uppercase">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden truncate">Câștig Grupaj</span>
            <span className="hidden sm:inline">Creștere Medie Venit / Cursă prin Grupaj Dinamic</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-emerald-400">+410 € / cursă</div>
          <p className="hidden sm:block text-xs text-slate-400">
            Valorificarea segmentelor eliberate după descărcările intermediare (ex. Viena → Rotterdam sau München → Almere) crește marja netă cu 14–18%.
          </p>
        </div>

        <div className="col-span-2 md:col-span-1 tahoe-glass rounded-[20px] sm:rounded-[24px] p-3 sm:p-4 space-y-1 sm:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-xs font-bold text-amber-400 uppercase">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Integrări Tehnice Active</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-white">
            Cargo Track API + Tahograf G2V2 + Google Maps + Facturare CMR
          </div>
          <p className="hidden sm:block text-xs text-slate-400">
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
          MODAL 2A: VIEW DRIVER FULL DETAILS & DOCUMENTS DOSSIER
      ====================================================================== */}
      {viewingDriver && (
        <div
          onClick={() => setViewingDriver(null)}
          className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-[28px] tahoe-glass-elevated border border-white/15 p-5 sm:p-6 space-y-4 my-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 font-bold text-[11px]">
                    {viewingDriver.availabilityStatus}
                  </span>
                  <span className="text-xs font-bold text-[#64D2FF] tabular-nums">
                    {viewingDriver.assignedAssembly}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1.5">
                  {viewingDriver.name}
                </h3>
                <a
                  href={`tel:${viewingDriver.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#30D158] hover:underline tabular-nums mt-0.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{viewingDriver.phone}</span>
                </a>
              </div>
              <button
                type="button"
                onClick={() => setViewingDriver(null)}
                aria-label="Închide detalii șofer"
                className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center text-white/80 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs tabular-nums">
              <div className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 space-y-1">
                <div className="text-[10.5px] font-bold uppercase text-white/55">
                  Permis Conducere
                </div>
                <div className="font-extrabold text-white text-sm">
                  {viewingDriver.licenseCategories}
                </div>
                <div className="text-[#30D158] font-bold">
                  Expiră: {viewingDriver.licenseExpiry}
                </div>
              </div>
              <div className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 space-y-1">
                <div className="text-[10.5px] font-bold uppercase text-white/55">
                  Atestat CPI / CPC Marfă
                </div>
                <div className="font-extrabold text-white text-sm">
                  {viewingDriver.cpiCpcCertExpiry}
                </div>
              </div>
              <div className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 space-y-1">
                <div className="text-[10.5px] font-bold uppercase text-white/55">
                  Card Tahograf Digital
                </div>
                <div className="font-extrabold text-white text-sm">
                  {viewingDriver.tachoCardExpiry}
                </div>
              </div>
              <div className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 space-y-1">
                <div className="text-[10.5px] font-bold uppercase text-white/55">
                  Aviz Medical &amp; Psihologic
                </div>
                <div className="font-extrabold text-[#30D158] text-sm">
                  {viewingDriver.medicalPsychExpiry}
                </div>
              </div>
            </div>

            <div className="tahoe-card-inner rounded-2xl p-4 border border-white/10 grid grid-cols-2 gap-4 text-xs tabular-nums">
              <div>
                <div className="text-white/60 text-[11px]">Conducere rămasă azi (CE 561)</div>
                <div className="text-lg font-extrabold text-[#FF9F0A] mt-0.5">
                  {viewingDriver.remainingDailyHours}h <span className="text-xs font-normal text-white/60">/ 9h</span>
                </div>
              </div>
              <div>
                <div className="text-white/60 text-[11px]">Conducere săptămânală rămasă</div>
                <div className="text-lg font-extrabold text-[#30D158] mt-0.5">
                  {viewingDriver.remainingWeeklyHours}h <span className="text-xs font-normal text-white/60">/ 56h</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/15">
              <button
                type="button"
                onClick={() => setViewingDriver(null)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-bold text-xs cursor-pointer"
              >
                Închide
              </button>
              <button
                type="button"
                onClick={() => {
                  const copy = { ...viewingDriver };
                  setViewingDriver(null);
                  setEditingDriver(copy);
                }}
                className="px-4 py-2 rounded-full tahoe-btn-primary text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editează Șofer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2B-INV: VIEW INVOICE & TRIP PROFITABILITY DETAILS
      ====================================================================== */}
      {viewingInvoice && (() => {
        const trObj =
          trailers.find((t) => t.id === viewingInvoice.trailerId) || trailers[0];
        const trPlate = trObj.tractorId.split(' (')[0];
        const isReady = viewingInvoice.status === 'Gata de facturare (CMR Semnat)';
        return (
          <div
            onClick={() => setViewingInvoice(null)}
            className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-[28px] tahoe-glass-elevated border border-white/15 p-5 sm:p-6 space-y-4 my-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-white text-xs tabular-nums">
                      {viewingInvoice.invoiceNo}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#0A84FF]/15 text-[#64D2FF] text-[11px] font-bold">
                      {viewingInvoice.tripRef}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        isReady
                          ? 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/30'
                          : 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30'
                      }`}
                    >
                      {viewingInvoice.status}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1.5">
                    {viewingInvoice.client}
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5">
                    {trPlate} + {viewingInvoice.trailerId} · <strong className="text-white">{viewingInvoice.route}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  aria-label="Închide detalii factură"
                  className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center text-white/80 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Venit Total</div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    {viewingInvoice.revenueEur} €
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Bonus Grupaj</div>
                  <div className="text-base font-extrabold text-[#30D158] mt-0.5">
                    +{viewingInvoice.groupageBonusEur} €
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Cost Direct</div>
                  <div className="text-base font-extrabold text-white/85 mt-0.5">
                    -{viewingInvoice.directCostsEur} €
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Profit Net</div>
                  <div className="text-base font-extrabold text-[#30D158] mt-0.5">
                    +{viewingInvoice.netProfitEur} € ({viewingInvoice.marginPct}%)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-white/55 mb-1">
                    Cod UIT RO e-Transport
                  </label>
                  <input
                    type="text"
                    value={uitCodes[viewingInvoice.invoiceNo] || ''}
                    onChange={(e) =>
                      setUitCodes((prev) => ({
                        ...prev,
                        [viewingInvoice.invoiceNo]: e.target.value,
                      }))
                    }
                    placeholder="ex: UIT-261109-4821A"
                    className="w-full bg-black/35 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold"
                  />
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-white/55 mb-1.5">
                    Documente POD Cabina Șofer
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {podFiles.filter((p) => p.trailerId === viewingInvoice.trailerId).length === 0 ? (
                      <span className="text-[11px] text-white/45">Niciun POD încărcat pentru {viewingInvoice.trailerId}</span>
                    ) : (
                      podFiles
                        .filter((p) => p.trailerId === viewingInvoice.trailerId)
                        .map((pod) => (
                          <a
                            key={pod.id}
                            href={
                              authToken
                                ? `/api/tms/driver/pod/${encodeURIComponent(pod.fileName)}?tenantId=${encodeURIComponent(activeTenant?.id || 'blue-trans')}&token=${encodeURIComponent(authToken)}`
                                : '#'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-[#64D2FF] hover:bg-white/20"
                          >
                            POD: {pod.displayName}
                          </a>
                        ))
                    )}
                  </div>

                  {driverExpenses.filter((e) => e.trailerId === viewingInvoice.trailerId).length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF9F0A]">
                        Bonuri &amp; Cheltuieli Cabină ({viewingInvoice.trailerId})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {driverExpenses
                          .filter((e) => e.trailerId === viewingInvoice.trailerId)
                          .map((exp) => {
                            const url = buildDriverExpenseFileUrl(
                              exp.fileName,
                              activeTenant?.id || 'blue-trans',
                              authToken,
                              exp.localDataUrl
                            );
                            const catLabel = EXPENSE_CATEGORY_META[exp.category]?.shortLabel || 'Bon';
                            return url ? (
                              <a
                                key={exp.id}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-full bg-[#FF9F0A]/15 border border-[#FF9F0A]/30 text-[11px] font-semibold text-[#FF9F0A] hover:bg-[#FF9F0A]/25"
                              >
                                {catLabel}: {exp.amount} {exp.currency} ({exp.vendorName})
                              </a>
                            ) : (
                              <span
                                key={exp.id}
                                className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/80"
                              >
                                {catLabel}: {exp.amount} {exp.currency} ({exp.vendorName})
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-white/15">
                {isReady && (
                  <button
                    type="button"
                    onClick={() => handleIssueInvoice(viewingInvoice.invoiceNo)}
                    className="px-3.5 py-2 rounded-full tahoe-btn-primary text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    Emite Document
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    downloadRoEFacturaXml({
                      invoiceNo: viewingInvoice.invoiceNo,
                      supplierName: activeTenant?.name,
                      supplierVat: activeTenant?.vatCode,
                      supplierCity: activeTenant?.city,
                      customerName: viewingInvoice.client,
                      tripRef: viewingInvoice.tripRef,
                      route: viewingInvoice.route,
                      trailerId: viewingInvoice.trailerId,
                      uitCode: uitCodes[viewingInvoice.invoiceNo] || undefined,
                      revenueEur: viewingInvoice.revenueEur,
                      groupageBonusEur: viewingInvoice.groupageBonusEur,
                    });
                    setFeedback(
                      `Fișierul ANAF e-Factura (UBL 2.1 XML) pentru ${viewingInvoice.invoiceNo} a fost descărcat.`
                    );
                  }}
                  className="px-3.5 py-2 rounded-full tahoe-btn-secondary text-white/90 hover:text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>e-Factura XML</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parts = viewingInvoice.route.split(' → ');
                    const inv = viewingInvoice;
                    setViewingInvoice(null);
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
                  className="px-3.5 py-2 rounded-full tahoe-btn-secondary text-white/90 hover:text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Printează</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-bold text-xs cursor-pointer"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL 2B: VIEW COMPLETE CLIENT DETAILS & COMMERCIAL DOSSIER
      ====================================================================== */}
      {viewingClient && (() => {
        const keyword = viewingClient.name.split(/\s+/)[0]?.toLowerCase() || '';
        const matchingInvoices = keyword
          ? invoices.filter((inv) =>
              inv.client.toLowerCase().includes(keyword)
            )
          : [];
        const matchingSegments = keyword
          ? trailers.flatMap((tr) =>
              tr.segments
                .filter((seg) =>
                  seg.loadingOrders.some((lo) => lo.toLowerCase().includes(keyword))
                )
                .map((seg) => ({
                  trailerId: tr.id,
                  tractorId: tr.tractorId,
                  route: `${seg.fromCity} → ${seg.toCity}`,
                  orders: seg.loadingOrders.filter((lo) =>
                    lo.toLowerCase().includes(keyword)
                  ),
                }))
            )
          : [];
        const estKm = estimateHgvRoadKm(
          viewingClient.defaultFromCity,
          viewingClient.defaultToCity
        );
        const estLdmValue = Math.round(
          viewingClient.defaultLdm * (viewingClient.rateEurPerLdm ?? 195)
        );
        const estFtlValue =
          estKm > 0
            ? Math.round(estKm * (viewingClient.rateEurPerKm ?? 1.42))
            : null;
        return (
          <div
            onClick={() => setViewingClient(null)}
            className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="tahoe-glass-elevated rounded-[26px] max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-white/20 max-h-[92vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#0A84FF]/20 text-[#64D2FF] font-extrabold text-[11px]">
                      {formatCountryBadge(viewingClient.countryCode)}
                    </span>
                    <span className="text-[11px] font-bold text-white/80 tabular-nums">
                      CUI/VAT: {viewingClient.vatCode}
                    </span>
                    <span className="text-[11px] font-bold text-[#30D158] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Contract Activ
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                    {viewingClient.name}
                  </h3>
                  <p className="text-xs text-white/65">{viewingClient.cargoCategory}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingClient(null)}
                  aria-label="Închide fereastra"
                  className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10 space-y-1">
                  <div className="text-[10.5px] font-bold uppercase text-white/55">
                    Coridor Implicit
                  </div>
                  <div className="font-extrabold text-white flex items-center gap-1 flex-wrap">
                    <span>{viewingClient.defaultFromCity}</span>
                    <ArrowRight className="w-3 h-3 text-[#64D2FF]" />
                    <span>{viewingClient.defaultToCity}</span>
                  </div>
                  <div className="text-[11px] text-white/60 tabular-nums">
                    {estKm > 0 ? `Distanță HGV: ~${estKm} km` : 'Coridor european activ'}
                  </div>
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10 space-y-1">
                  <div className="text-[10.5px] font-bold uppercase text-white/55">
                    Încărcare Standard
                  </div>
                  <div className="font-extrabold text-[#64D2FF] text-sm tabular-nums">
                    {viewingClient.defaultLdm.toFixed(1)} LDM · {viewingClient.defaultWeightTons}T
                  </div>
                  <div className="text-[11px] text-white/60 tabular-nums">
                    ~{Math.max(1, Math.round(viewingClient.defaultLdm * 2.4))} Euro-paleți
                  </div>
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10 space-y-1">
                  <div className="text-[10.5px] font-bold uppercase text-white/55">
                    Regim Termic Frigo
                  </div>
                  <div className="font-extrabold text-[#30D158] text-sm tabular-nums flex items-center gap-1">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-[#64D2FF]" />
                    {viewingClient.defaultTemp > 0
                      ? `+${viewingClient.defaultTemp}`
                      : viewingClient.defaultTemp}
                    °C
                  </div>
                  <div className="text-[11px] text-white/60">
                    {viewingClient.defaultTemp <= -15
                      ? 'Congelare ATP (Zona 1)'
                      : 'Refrigerat controlat (Bi-Temp)'}
                  </div>
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10 space-y-1">
                  <div className="text-[10.5px] font-bold uppercase text-white/55">
                    Tarif &amp; Scadență
                  </div>
                  <div className="font-extrabold text-[#30D158] tabular-nums">
                    {(viewingClient.rateEurPerKm ?? 1.42).toFixed(2)} €/km ·{' '}
                    {viewingClient.rateEurPerLdm ?? 195} €/LDM
                  </div>
                  <div className="text-[11px] text-white/60 tabular-nums">
                    Lot grupaj ~{estLdmValue} €{estFtlValue ? ` · FTL ~${estFtlValue} €` : ''} ·{' '}
                    {viewingClient.paymentTermDays ?? 30} zile
                  </div>
                </div>
              </div>

              <div className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 space-y-2 text-xs">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#64D2FF]">
                  Persoană de Contact &amp; Comunicare Directă
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex items-center gap-2 text-white">
                    <User className="w-3.5 h-3.5 text-[#64D2FF] shrink-0" />
                    <span className="font-bold truncate">
                      {viewingClient.contactPerson || 'Responsabil Logistică'}
                    </span>
                  </div>
                  <a
                    href={`mailto:${viewingClient.email || 'logistica@client.eu'}`}
                    className="flex items-center gap-2 text-[#64D2FF] hover:underline truncate"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {viewingClient.email || 'logistica@client.eu'}
                    </span>
                  </a>
                  <a
                    href={`tel:${(viewingClient.phone || '+40722000000').replace(/\s+/g, '')}`}
                    className="flex items-center gap-2 text-[#30D158] hover:underline tabular-nums truncate"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {viewingClient.phone || '+40 722 000 000'}
                    </span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/65">
                    Curse Active &amp; Segmente Alocate ({matchingSegments.length})
                  </div>
                  {matchingSegments.length === 0 ? (
                    <div className="text-white/55 text-[11px]">
                      Nicio comandă activă alocată pe segmentele de azi. Clientul este gata de alocare din Planning 7 Zile.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {matchingSegments.map((ms, i) => (
                        <div
                          key={`${ms.trailerId}-${i}`}
                          className="rounded-xl bg-white/5 px-2.5 py-2 border border-white/10 space-y-0.5"
                        >
                          <div className="font-bold text-white flex items-center justify-between gap-2">
                            <span>{ms.trailerId} ({ms.tractorId})</span>
                            <span className="text-[#64D2FF] text-[10.5px]">{ms.route}</span>
                          </div>
                          {ms.orders.map((ord, j) => (
                            <div key={j} className="text-[10.5px] text-white/65 truncate">
                              • {ord}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/65">
                    Facturi &amp; Istoric Financiar ({matchingInvoices.length})
                  </div>
                  {matchingInvoices.length === 0 ? (
                    <div className="text-white/55 text-[11px]">
                      Nicio factură emisă încă în lotul curent pentru {viewingClient.name}.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {matchingInvoices.map((inv) => (
                        <div
                          key={inv.invoiceNo}
                          className="rounded-xl bg-white/5 px-2.5 py-2 border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">
                              {inv.invoiceNo} · {inv.tripRef}
                            </div>
                            <div className="text-[10.5px] text-white/60 truncate">
                              {inv.route}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-extrabold text-[#30D158] tabular-nums whitespace-nowrap">
                              {inv.revenueEur}&#160;€
                            </div>
                            <div className="text-[10px] text-white/55">{inv.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    const id = viewingClient.id;
                    const name = viewingClient.name;
                    setViewingClient(null);
                    handleDeleteClient(id, name);
                  }}
                  className="px-3.5 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Șterge Client</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingClient(null)}
                    className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-bold text-xs cursor-pointer"
                  >
                    Închide
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = { ...viewingClient };
                      setViewingClient(null);
                      setEditingClient(copy);
                    }}
                    className="px-4 py-2 rounded-full tahoe-btn-primary text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editează Client &amp; Contract</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Categorie Marfă
                  </label>
                  <input
                    type="text"
                    value={editingClient.cargoCategory}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        cargoCategory: e.target.value,
                      })
                    }
                    placeholder="Ex: Lactate & Proaspete (+4°C)"
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Persoană de Contact
                  </label>
                  <input
                    type="text"
                    value={editingClient.contactPerson ?? ''}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        contactPerson: e.target.value,
                      })
                    }
                    placeholder="Responsabil Logistică"
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    E-mail Client
                  </label>
                  <input
                    type="email"
                    value={editingClient.email ?? ''}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        email: e.target.value,
                      })
                    }
                    placeholder="logistica@client.eu"
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Telefon Contact
                  </label>
                  <input
                    type="text"
                    value={editingClient.phone ?? ''}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        phone: e.target.value,
                      })
                    }
                    placeholder="+40 722 000 000"
                    className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-bold border border-white/15"
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

      {/* Bulk Edit Șoferi */}
      {showBulkEditDrivers && (
        <div
          onClick={() => setShowBulkEditDrivers(false)}
          className="modal-backdrop-lock fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-drivers-title"
            onSubmit={handleApplyBulkEditDrivers}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[26px] tahoe-glass border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="bulk-edit-drivers-title" className="text-base font-extrabold text-white">
                  Editare în masă — Șoferi ({driversSelection.selectedCount} selectați)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Lasă necompletate câmpurile pe care nu dorești să le modifici.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkEditDrivers(false)}
                aria-label="Închide"
                className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Status Disponibilitate
                </label>
                <select
                  aria-label="Status disponibilitate șoferi în masă"
                  value={bulkDriverStatus}
                  onChange={(e) =>
                    setBulkDriverStatus(
                      e.target.value as 'KEEP' | DriverDocumentRecord['availabilityStatus']
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  <option value="În cursă activă">În cursă activă</option>
                  <option value="Pauză 45m / Odihnă">Pauză 45m / Odihnă</option>
                  <option value="Disponibil Bază Oradea">Disponibil Bază Oradea</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Ansamblu Alocat
                </label>
                <input
                  type="text"
                  value={bulkDriverAssembly}
                  onChange={(e) => setBulkDriverAssembly(e.target.value)}
                  placeholder="ex: BH 46 STS + BH 67 STS"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Expirare Permis
                </label>
                <input
                  type="text"
                  value={bulkDriverLicenseExpiry}
                  onChange={(e) => setBulkDriverLicenseExpiry(e.target.value)}
                  placeholder="ex: 15.08.2030"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Card Tahograf
                </label>
                <input
                  type="text"
                  value={bulkDriverTachoExpiry}
                  onChange={(e) => setBulkDriverTachoExpiry(e.target.value)}
                  placeholder="ex: 12.09.2029"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkEditDrivers(false)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-extrabold cursor-pointer"
              >
                Aplică la {driversSelection.selectedCount} șoferi
              </button>
            </div>
          </form>
        </div>
      )}

      <BulkDeleteConfirmModal
        open={showBulkDeleteDrivers}
        title="Ștergere în masă — Șoferi"
        count={driversSelection.selectedCount}
        previewLabels={selectedDriverItems.map((d) => `${d.name} (${d.assignedAssembly})`)}
        onCancel={() => setShowBulkDeleteDrivers(false)}
        onConfirm={handleConfirmBulkDeleteDrivers}
      />

      {/* Bulk Edit Clienți */}
      {showBulkEditClients && (
        <div
          onClick={() => setShowBulkEditClients(false)}
          className="modal-backdrop-lock fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-clients-title"
            onSubmit={handleApplyBulkEditClients}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[26px] tahoe-glass border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="bulk-edit-clients-title" className="text-base font-extrabold text-white">
                  Editare în masă — Clienți ({clientsSelection.selectedCount} selectați)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Lasă necompletate câmpurile pe care nu dorești să le modifici.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkEditClients(false)}
                aria-label="Închide"
                className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Cod Țară (ISO)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={bulkClientCountry}
                  onChange={(e) => setBulkClientCountry(e.target.value)}
                  placeholder="ex: DE, NL, RO"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15 uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Temperatură (°C)
                </label>
                <input
                  type="number"
                  step="1"
                  value={bulkClientTemp}
                  onChange={(e) => setBulkClientTemp(e.target.value)}
                  placeholder="ex: 4 sau -18"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Tarif (€/km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bulkClientRateKm}
                  onChange={(e) => setBulkClientRateKm(e.target.value)}
                  placeholder="ex: 1.50"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Tarif (€/LDM)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={bulkClientRateLdm}
                  onChange={(e) => setBulkClientRateLdm(e.target.value)}
                  placeholder="ex: 210"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Scadență Plată (zile)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={bulkClientPayTerm}
                  onChange={(e) => setBulkClientPayTerm(e.target.value)}
                  placeholder="ex: 45"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkEditClients(false)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-extrabold cursor-pointer"
              >
                Aplică la {clientsSelection.selectedCount} clienți
              </button>
            </div>
          </form>
        </div>
      )}

      <BulkDeleteConfirmModal
        open={showBulkDeleteClients}
        title="Ștergere în masă — Clienți"
        count={clientsSelection.selectedCount}
        previewLabels={selectedClientItems.map((c) => `${c.name} (${c.vatCode})`)}
        onCancel={() => setShowBulkDeleteClients(false)}
        onConfirm={handleConfirmBulkDeleteClients}
      />

      {/* Bulk Edit Facturare */}
      {showBulkEditInvoices && (
        <div
          onClick={() => setShowBulkEditInvoices(false)}
          className="modal-backdrop-lock fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-invoices-title"
            onSubmit={handleApplyBulkEditInvoices}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[26px] tahoe-glass border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="bulk-edit-invoices-title" className="text-base font-extrabold text-white">
                  Editare în masă — Facturi ({invoicesSelection.selectedCount} selectate)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Actualizează statusul sau semiremorca pentru toate facturile bifate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkEditInvoices(false)}
                aria-label="Închide"
                className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Status Facturare
                </label>
                <select
                  aria-label="Status facturare în masă"
                  value={bulkInvoiceStatus}
                  onChange={(e) =>
                    setBulkInvoiceStatus(
                      e.target.value as 'KEEP' | InvoiceRecord['status']
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  <option value="Gata de facturare (CMR Semnat)">
                    Gata de facturare (CMR Semnat)
                  </option>
                  <option value="Emisă (Scadentă 30 zile)">
                    Emisă (Scadentă 30 zile)
                  </option>
                  <option value="Achitată">Achitată</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Semiremorcă asociată
                </label>
                <select
                  aria-label="Semiremorcă asociată în masă"
                  value={bulkInvoiceTrailerId}
                  onChange={(e) => setBulkInvoiceTrailerId(e.target.value)}
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="">Fără modificare</option>
                  {trailers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} ({t.tractorId.split(' (')[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkEditInvoices(false)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-extrabold cursor-pointer"
              >
                Aplică la {invoicesSelection.selectedCount} facturi
              </button>
            </div>
          </form>
        </div>
      )}

      <BulkDeleteConfirmModal
        open={showBulkDeleteInvoices}
        title="Ștergere în masă — Facturare"
        count={invoicesSelection.selectedCount}
        previewLabels={selectedInvoiceItems.map((inv) => `${inv.invoiceNo} · ${inv.client}`)}
        onCancel={() => setShowBulkDeleteInvoices(false)}
        onConfirm={handleConfirmBulkDeleteInvoices}
      />
    </div>
  );
};
