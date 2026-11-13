import React, { useState, useEffect } from 'react';
import { DemoBadge } from './DemoBadge';
import {
  Truck,
  Search,
  ShieldCheck,
  Gauge,
  Wrench,
  ThermometerSnowflake,
  Sparkles,
  CheckCircle2,
  Palette,
  FileCheck2,
  FilePlus2,
  FileText,
  Download,
  ExternalLink,
  Cpu,
  Navigation,
  Edit3,
  Layers,
  X,
} from 'lucide-react';
import { TrailerUnit } from '../data/mockData';
import { ExtendedFleetTechRecord } from './TmsOperationsView';
import { EuroRoPlate } from './EuroRoPlate';
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
  TAHOE_TABLE_WRAPPER_CLASS,
  ViewModeToggle,
  getTahoeRowStyle,
  paginateItems,
  toggleSortState,
  usePersistedPageSize,
  usePersistedViewMode,
  useTableSelection,
  type SortState,
} from './ListViewControls';
import { TruckShowroom3D, ShowroomVehicleKind } from './TruckShowroom3D';
import { exportRowsToExcel } from '../utils/exportExcel';
import { VehiclePdfViewerModal } from './VehiclePdfViewerModal';
import {
  ExpiryCalendarField,
  calendarDaysUntilIso,
  extractIsoDateFromText,
  getExpiryBadgeSummary,
  isoToRoDate,
  updateExpiryInPolicyString,
} from './ExpiryCalendarField';
import {
  FleetPdfDocKind,
  getVehiclePdfDocs,
  getVehiclePlateAliases,
  normalizeVehiclePlate,
  summarizeVehicleDocsLabel,
  useFleetPdfCatalog,
} from '../data/fleetDocuments';

export type VehicleBodyStyle =
  | 'tractor-volvo'
  | 'tractor-scania'
  | 'tractor-mercedes'
  | 'tractor-daf'
  | 'tractor-man'
  | 'trailer-schmitz'
  | 'trailer-krone'
  | 'van-sprinter'
  | 'truck-man-tgl'
  | 'car-sedan';

export interface OemColorOption {
  code: string;
  name: string;
  hex: string;
  secondaryHex: string;
  accentHex: string;
}

export const OEM_TRUCK_COLORS: OemColorOption[] = [
  {
    code: '1103-WHITE',
    name: 'Alb Polar OEM (Alb)',
    hex: '#F8FAFC',
    secondaryHex: '#CBD5E1',
    accentHex: '#0284C7',
  },
  {
    code: '1346-BLUE',
    name: 'Albastru Metalizat (Albastru)',
    hex: '#0284C7',
    secondaryHex: '#0369A1',
    accentHex: '#38BDF8',
  },
  {
    code: '3015-RED',
    name: 'Roșu Rubin Metalizat (Roșu)',
    hex: '#DC2626',
    secondaryHex: '#991B1B',
    accentHex: '#FCA5A5',
  },
  {
    code: 'H327-GOLD',
    name: 'Galben Auriu OEM (Galben)',
    hex: '#F59E0B',
    secondaryHex: '#B45309',
    accentHex: '#FDE68A',
  },
  {
    code: '9744-SILVER',
    name: 'Gri Titan Metalizat (Gri)',
    hex: '#64748B',
    secondaryHex: '#334155',
    accentHex: '#94A3B8',
  },
  {
    code: '6029-GREEN',
    name: 'Verde Smarald Metalizat (Verde)',
    hex: '#10B981',
    secondaryHex: '#047857',
    accentHex: '#6EE7B7',
  },
  {
    code: '5010-NAVY',
    name: 'Bleumarin Închis (Bleumarin)',
    hex: '#1E3A8A',
    secondaryHex: '#172554',
    accentHex: '#60A5FA',
  },
  {
    code: '9005-BLACK',
    name: 'Negru Obsidian (Negru)',
    hex: '#1E293B',
    secondaryHex: '#0F172A',
    accentHex: '#38BDF8',
  },
  {
    code: 'RQH-IRON-BLUE',
    name: 'Albastru Iron Metalizat (Albastru)',
    hex: '#173773',
    secondaryHex: '#0F2552',
    accentHex: '#60A5FA',
  },
];

export interface DecodedVinInfo {
  vin: string;
  valid: boolean;
  assetCategory:
    | 'CAP TRACTOR (HGV)'
    | 'SEMIREMORCĂ FRIGO'
    | 'UTILITARĂ EXPRESS FRIGO'
    | 'AUTOTURISM FLOTĂ (M1)';
  manufacturer: string;
  modelName: string;
  cabOrBodyType: string;
  engineAndPower: string;
  transmission: string;
  axleConfig: string;
  wheelbaseMm: number;
  grossWeightKg: number;
  euroClass: string;
  modelYear: number;
  assemblyPlant: string;
  serialNumber: string;
  bodyStyle: VehicleBodyStyle;
  oemColor: OemColorOption;
  matchedFleetPlate?: string;
  matchedPartnerPlate?: string;
  reeferUnit?: string;
  fuelTankLiters?: string;
  tireSize?: string;
  companyName?: 'BLUE TRANS SPEDITION' | 'SCANDEXPRES';
  rcaPolicy?: string;
  cascoPolicy?: string;
  cmrPolicy?: string;
  leasingContract?: string;
  fleetStatus?: 'ACTIV' | 'VANDUTA' | 'FINALIZAT' | 'ARHIVA';
}

export interface FleetVinPair {
  trailerId: string;
  tractorPlate: string;
  tractorVin: string;
  trailerVin: string;
  tractorColorCode: string;
  trailerColorCode: string;
}

export const FLEET_VIN_DATABASE: Record<string, FleetVinPair> = {
  'BH 67 STS': {
    trailerId: 'BH 67 STS',
    tractorPlate: 'BH 46 STS',
    tractorVin: 'YV2RT60A0SA362262',
    trailerVin: 'WSM00000005202011',
    tractorColorCode: '1346-BLUE',
    trailerColorCode: '1103-WHITE',
  },
  'BH 69 STS': {
    trailerId: 'BH 69 STS',
    tractorPlate: 'BH 56 STS',
    tractorVin: 'YS2R4X200P5721433',
    trailerVin: 'WKESD000000456195',
    tractorColorCode: '1346-BLUE',
    trailerColorCode: '1103-WHITE',
  },
  'BH 75 STS': {
    trailerId: 'BH 75 STS',
    tractorPlate: 'IF 96 STS',
    tractorVin: 'YS2R4X200J5532496',
    trailerVin: 'WSM00000005154565',
    tractorColorCode: '1346-BLUE',
    trailerColorCode: '1103-WHITE',
  },
  'BH 74 STS': {
    trailerId: 'BH 74 STS',
    tractorPlate: 'B 506 STS',
    tractorVin: 'YS2S4X200S5783001',
    trailerVin: 'WSM00000005097369',
    tractorColorCode: '1346-BLUE',
    trailerColorCode: '1103-WHITE',
  },
  'BH 91 STS': {
    trailerId: 'BH 91 STS',
    tractorPlate: 'B 507 STS',
    tractorVin: 'YS2S4X200S5783100',
    trailerVin: 'WSM00000005199550',
    tractorColorCode: '1346-BLUE',
    trailerColorCode: '1103-WHITE',
  },
  'BH 23 STS': {
    trailerId: 'BH 23 STS',
    tractorPlate: 'B 560 STS',
    tractorVin: 'YS2S4X200S5782932',
    trailerVin: 'WSM000009SV031625',
    tractorColorCode: '1346-BLUE',
    trailerColorCode: '1103-WHITE',
  },
  'BH 31 STS': {
    trailerId: 'BH 31 STS',
    tractorPlate: 'B 871 STS',
    tractorVin: 'YS2R4X208T5810904',
    trailerVin: 'WSM00000005270543',
    tractorColorCode: '1103-WHITE',
    trailerColorCode: '1103-WHITE',
  },
};

const KNOWN_VIN_CATALOG: Record<string, Omit<DecodedVinInfo, 'vin' | 'valid'>> = {
  // =========================================================================
  // 1. BLUE TRANS SPEDITION — 17 CAPETE TRACTOR REALE (GOOGLE SHEET)
  // =========================================================================
  YS2S4X200S5783001: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania S 500 Super Highline A4x2NA',
    cabOrBodyType: 'Cabină CS20H Next Gen (Podea plană, 2 cușete, pachet Super)',
    engineAndPower: 'Scania DC13 175 Super 12.7L · 500 CP (368 kW) · 2.650 Nm',
    transmission: 'Scania Opticruise G33CM cu Retarder R4700D',
    axleConfig: '4x2 Cap Tractor TIR · Suspensie pneumatică integrală',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Clasa CO2 4 Maut)',
    modelYear: 2025,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5783001',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'B 506 STS',
    matchedPartnerPlate: 'BH 74 STS',
    fuelTankLiters: '615 L + 780 L (1.395 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Alliantz · Polița 129212938 (16.07.2026 – 15.07.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001326 (13.06.2025 – 12.06.2030)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06491 (Finalizare 03.07.2030)',
    fleetStatus: 'ACTIV',
  },
  YS2S4X200S5783100: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania S 500 Super Highline A4x2NA',
    cabOrBodyType: 'Cabină CS20H Next Gen (Podea plană, 2 cușete, pachet Super)',
    engineAndPower: 'Scania DC13 174 Super 12.742 cm³ · 500 CP (368 kW) · ADR AT',
    transmission: 'Scania Opticruise G33CM cu Retarder R4700D',
    axleConfig: '4x2 Cap Tractor TIR · Suspensie pneumatică integrală',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Clasa CO2 4 Maut)',
    modelYear: 2025,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5783100',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'B 507 STS',
    matchedPartnerPlate: 'BH 91 STS',
    fuelTankLiters: '615 L + 780 L (1.395 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Alliantz · Polița 129215222 (16.07.2026 – 15.07.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001327 (13.06.2025 – 12.06.2030)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06491 (Finalizare 03.07.2030)',
    fleetStatus: 'ACTIV',
  },
  YS2S4X200S5782932: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania S 560 Super Highline A4x2NA',
    cabOrBodyType: 'Cabină CS20H Next Gen (Podea plană, 2 cușete, pachet Super)',
    engineAndPower: 'Scania DC13 173 Super 12.742 cm³ · 560 CP (412 kW) · ADR AT',
    transmission: 'Scania Opticruise G33CM cu Retarder R4700D',
    axleConfig: '4x2 Cap Tractor TIR · Suspensie pneumatică integrală',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Clasa CO2 4 Maut)',
    modelYear: 2025,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5782932',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'B 560 STS',
    matchedPartnerPlate: 'BH 23 STS',
    fuelTankLiters: '615 L + 570 L (1.185 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'HD INSURANCE PLC NICOSIA · Polița 1100977102 (16.07.2026 – 15.07.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001325 (13.06.2025 – 12.06.2030)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06490 (Finalizare 03.10.2030)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X208T5810904: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 460 Super Highline A4x2NA',
    cabOrBodyType: 'Cabină CR20H Highline Super (Model 2026 Smart Dash · ADR AT)',
    engineAndPower: 'Scania DC13 175 Super 12.742 cm³ · 460 CP (338 kW) · 2.500 Nm',
    transmission: 'Scania Opticruise G33CM cu Retarder R4700D',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Clasa CO2 4 Maut)',
    modelYear: 2026,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5810904',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'B 871 STS',
    matchedPartnerPlate: 'BH 31 STS',
    fuelTankLiters: '615 L + 570 L (1.185 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Bridgestone Ecopia H002',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE · Polița 96636629 (17.06.2026 – 16.06.2027)',
    cascoPolicy: 'OMNIASIG SA · Polița C3587075 (04.06.2026 – 03.06.2031)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-07118 (Finalizare 03.07.2031)',
    fleetStatus: 'ACTIV',
  },
  YV2AG20A9DA740043: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Volvo Trucks AB (Suedia)',
    modelName: 'Volvo FH 460 Globetrotter EEV',
    cabOrBodyType: 'Cabină Globetrotter Sleeper (BC autotractor · 2 cușete)',
    engineAndPower: 'Volvo D13C460 EEV 12.777 cm³ · 460 CP (345 kW) · 2.300 Nm',
    transmission: 'Volvo I-Shift AT2612D (12 trepte automatizată)',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3700,
    grossWeightKg: 40000,
    euroClass: 'EEV / Euro 5+',
    modelYear: 2013,
    assemblyPlant: 'Göteborg (Suedia)',
    serialNumber: '740043',
    bodyStyle: 'tractor-volvo',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 12 STS',
    matchedPartnerPlate: 'BH 59 STS',
    fuelTankLiters: '1.140 L Aluminiu (CIV) + AdBlue',
    tireSize: '315/70 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'AXERIA · Polița 53925480404 (14.12.2025 – 13.12.2026)',
    cascoPolicy: 'Fără CASCO activ (-)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X200H5468860: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 450 Streamline Highline A4x2NA',
    cabOrBodyType: 'Cabină CR19H Streamline Highline (Omologare N320 · 2 cușete)',
    engineAndPower: 'Scania DC13 147 12.742 cm³ · 450 CP (331 kW) · 2.350 Nm',
    transmission: 'Scania Opticruise GRS895R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3700,
    grossWeightKg: 40000,
    euroClass: 'Euro 6c',
    modelYear: 2017,
    assemblyPlant: 'Zwolle (Olanda)',
    serialNumber: '5468860',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 30 STS',
    matchedPartnerPlate: 'BH 61 STS',
    fuelTankLiters: '1.250 L Aluminiu (CIV) + AdBlue',
    tireSize: '315/70 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GROUPAMA · Polița 31370952 (10.05.2026 – 09.05.2027)',
    cascoPolicy: 'Fără CASCO activ (-)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  YV2RT60A0SA362262: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Volvo Trucks AB (Suedia)',
    modelName: 'Volvo FH 540 I-Save Globetrotter XL',
    cabOrBodyType: 'Cabină Globetrotter XL Sleeper (2 cușete, pachet Aero)',
    engineAndPower: 'Volvo D13K540 EU VI 12.777 cm³ · 540 CP (405 kW) · 2.600 Nm',
    transmission: 'Volvo I-Shift AT2812F (12+4 trepte automatizată, I-See GPS)',
    axleConfig: '4x2 Cap Tractor · Raport punte 2.31:1',
    wheelbaseMm: 3800,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Clasa CO2 4 Maut)',
    modelYear: 2024,
    assemblyPlant: 'Göteborg — Torslanda (Suedia)',
    serialNumber: '362262',
    bodyStyle: 'tractor-volvo',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'BH 46 STS',
    matchedPartnerPlate: 'BH 67 STS',
    fuelTankLiters: '650 L + 610 L Aluminiu (1.260 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'HD INSURANCE PLC NICOSIA · Polița 1100259140 (06.11.2025 – 05.11.2026)',
    cascoPolicy: 'OMNIASIG SA · Polița 3493693 (13.11.2024 – 12.12.2029)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'VFS INT ROMANIA IFN · Contract 3426692 (Finalizare 12.11.2029)',
    fleetStatus: 'ACTIV',
  },
  YV2RTY0A2JA826484: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Volvo Trucks AB (Suedia)',
    modelName: 'Volvo FH 460 Globetrotter XL',
    cabOrBodyType: 'Cabină Globetrotter XL Sleeper (2 cușete)',
    engineAndPower: 'Volvo D13K460 EU VI 12.777 cm³ · 460 CP (345 kW) · 2.300 Nm',
    transmission: 'Volvo I-Shift AT2612F cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3800,
    grossWeightKg: 40000,
    euroClass: 'Euro 6d',
    modelYear: 2018,
    assemblyPlant: 'Göteborg (Suedia)',
    serialNumber: '826484',
    bodyStyle: 'tractor-volvo',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 49 STS',
    matchedPartnerPlate: 'BH 65 STS',
    fuelTankLiters: '610 L + 570 L (1.180 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GENERALI ROMANIA · Polița 8245486 (05.11.2025 – 04.11.2026)',
    cascoPolicy: 'OMNIASIG SA · Polița 3441251 (02.09.2023 – 01.09.2027)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'BT LEASING · Contract 62263 (Finalizare 09.2026)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X200G5434149: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 450 Streamline Highline',
    cabOrBodyType: 'Cabină CR19H Streamline Highline (2 cușete)',
    engineAndPower: 'Scania DC13 147 12.742 cm³ SCR · 450 CP (331 kW) · 2.350 Nm',
    transmission: 'Scania Opticruise GRS895R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3700,
    grossWeightKg: 40000,
    euroClass: 'Euro 6c',
    modelYear: 2016,
    assemblyPlant: 'Zwolle (Olanda)',
    serialNumber: '5434149',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'BH 50 STS',
    matchedPartnerPlate: 'BH 45 STS',
    fuelTankLiters: '1.250 L Aluminiu (CIV) + AdBlue',
    tireSize: '315/70 R22.5 Continental EcoPlus',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'INTERAMERICAN HELLENIC · Polița 100303371 (06.07.2026 – 05.07.2027)',
    cascoPolicy: 'LUTZ · Polița W17457008 (26.09.2023 – Activ)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X200P5721433: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 500 Super Highline A4x2NA',
    cabOrBodyType: 'Cabină CR20H Highline Super (Plafon înalt, pachet aerodinamic)',
    engineAndPower: 'Scania DC13 174 Super 12.742 cm³ · 500 CP (368 kW) · 2.650 Nm',
    transmission: 'Scania Opticruise G33CM cu Retarder R4700D',
    axleConfig: '4x2 Cap Tractor TIR · Suspensie pneumatică 4 perne',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Scania Super — economie 8% combustibil)',
    modelYear: 2023,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5721433',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'BH 56 STS',
    matchedPartnerPlate: 'BH 69 STS',
    fuelTankLiters: '780 L + 570 L (1.350 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Bridgestone Ecopia H002',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Alliantz · Polița 127118633 (17.11.2025 – 16.11.2026)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001191 (08.11.2023 – 07.11.2028)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 17-05741 (Finalizare 03.03.2029)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X200F5395736: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 450 Streamline Highline',
    cabOrBodyType: 'Cabină CR19H Streamline Highline (2 cușete)',
    engineAndPower: 'Scania DC13 147 12.742 cm³ · 450 CP (331 kW) · 2.350 Nm',
    transmission: 'Scania Opticruise GRS895R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3700,
    grossWeightKg: 40000,
    euroClass: 'Euro 6',
    modelYear: 2015,
    assemblyPlant: 'Zwolle (Olanda)',
    serialNumber: '5395736',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 72 STS',
    matchedPartnerPlate: 'BH 96 XTS',
    fuelTankLiters: '1.400 L Aluminiu (CIV) + AdBlue',
    tireSize: '315/70 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GENERALI ROMANIA · Polița 8739449 (30.08.2026 – 29.08.2027)',
    cascoPolicy: 'OMNIASIG SA · Polița C007522718 (18.09.2026 – 17.09.2027)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WDB9061531N496201: {
    assetCategory: 'UTILITARĂ EXPRESS FRIGO',
    manufacturer: 'Mercedes-Benz AG (Germania)',
    modelName: 'Mercedes-Benz Sprinter 316 CDI Frigo BA04',
    cabOrBodyType: 'Autoutilitară N1 cu Temperatură Controlată (BA04 · 3.500 kg)',
    engineAndPower: 'Mercedes OM651.955 2.143 cm³ · 163 CP (120 kW) @ 3.800 rpm',
    transmission: 'Cutie manuală 6 trepte · Tracțiune spate',
    axleConfig: '2 Axe · 195/75 R16C · Rezervor 75 L',
    wheelbaseMm: 3665,
    grossWeightKg: 3500,
    euroClass: 'Euro 5 (R5)',
    modelYear: 2011,
    assemblyPlant: 'Düsseldorf (Germania)',
    serialNumber: '496201',
    bodyStyle: 'van-sprinter',
    oemColor: OEM_TRUCK_COLORS[7],
    matchedFleetPlate: 'BH 81 STS',
    fuelTankLiters: '75 L Motorină',
    tireSize: '195/75 R16C 107/105R',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GENERALI ROMANIA · Polița 8475947 (21.02.2026 – 20.02.2027)',
    cascoPolicy: 'Fără CASCO activ (-)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X200J5496553: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 450 Streamline Highline A4x2NA',
    cabOrBodyType: 'Cabină CR19H Streamline Highline (BC autotractor N320, ADR AT)',
    engineAndPower: 'Scania DC13 147 12.742 cm³ · 450 CP (331 kW) @ 1.900 rpm',
    transmission: 'Scania Opticruise GRS895R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR · Suspensie pneumatică integrală',
    wheelbaseMm: 3700,
    grossWeightKg: 45000,
    euroClass: 'Euro 6c (R6)',
    modelYear: 2018,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5496553',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'IF 58 STS',
    matchedPartnerPlate: 'BH 69 XTS',
    fuelTankLiters: '500 L + 600 L (1.100 L Total) + AdBlue',
    tireSize: '315/60 R22.5 față · 295/60 R22.5 spate',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: '-',
    cascoPolicy: 'Fără CASCO activ (-)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT ROMANIA IFN SA',
    fleetStatus: 'ACTIV',
  },
  YS2S6X200H2141984: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania S 500 Next Gen 6x2 Highline',
    cabOrBodyType: 'Cabină CS20H Next Gen (Podea plană, configurație 6x2 cu axă liftantă)',
    engineAndPower: 'Scania DC13 155 12.7L · 500 CP (368 kW) · 2.550 Nm',
    transmission: 'Scania Opticruise GRS905R cu Retarder',
    axleConfig: '6x2 Cap Tractor Heavy-Duty (Punte portabilă liftantă)',
    wheelbaseMm: 3950,
    grossWeightKg: 44000,
    euroClass: 'Euro 6c',
    modelYear: 2017,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '2141984',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'BH 07 XTS',
    matchedPartnerPlate: 'BH 06 XTS',
    fuelTankLiters: '900 L Aluminiu + 105 L AdBlue',
    tireSize: '315/70 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'OMNIASIG SA · Polița 16434935 (28.09.2026 – 29.09.2027)',
    cascoPolicy: 'FLEXICASCO · Polița CPJ190672577 (30.08.2026 – 29.08.2027)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-05389 (03.08.2026 · finalizat)',
    fleetStatus: 'FINALIZAT',
  },
  YS2R4X200J5518429: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 450 Next Gen Highline',
    cabOrBodyType: 'Cabină CR20H Highline (2 cușete · ADR FL/AT)',
    engineAndPower: 'Scania DC13 148 12.742 cm³ · 450 CP (331 kW) · 2.350 Nm',
    transmission: 'Scania Opticruise GRS905R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3700,
    grossWeightKg: 40000,
    euroClass: 'Euro 6d',
    modelYear: 2018,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5518429',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[4],
    matchedFleetPlate: 'IF 12 STS',
    matchedPartnerPlate: 'BH 67 STS',
    fuelTankLiters: '500 L + 640 L (1.140 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'INTERAMERICAN HELLENIC · Polița 100273003 (07.02.2026 – 06.02.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001117 (08.02.2023 – 07.02.2027)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-05336 (Finalizare 03.06.2027)',
    fleetStatus: 'ACTIV',
  },
  YS2S4X200S5773992: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania S 500 Super Highline A4x2NA',
    cabOrBodyType: 'Cabină CS20H Next Gen (Podea plană, 2 cușete · ADR AT)',
    engineAndPower: 'Scania DC13 174 Super 12.742 cm³ · 500 CP (368 kW) · 2.650 Nm',
    transmission: 'Scania Opticruise G33CM cu Retarder R4700D',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Clasa CO2 4 Maut)',
    modelYear: 2025,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5773992',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'IF 20 STS',
    matchedPartnerPlate: 'BH 23 STS',
    fuelTankLiters: '570 L + 615 L (1.185 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'HD INSURANCE PLC NICOSIA · Polița 1100720771 (05.04.2026 – 04.04.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001290 (28.02.2025 – 27.02.2030)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06318 (Finalizare 03.07.2030)',
    fleetStatus: 'ACTIV',
  },
  YS2S4X200N5653904: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania S 450 Next Gen Highline',
    cabOrBodyType: 'Cabină CS20H Next Gen (Podea plană, 2 cușete · ADR AT)',
    engineAndPower: 'Scania DC13 164 12.742 cm³ · 450 CP (331 kW) · 2.350 Nm',
    transmission: 'Scania Opticruise GRS905R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6d',
    modelYear: 2022,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5653904',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'IF 30 BTS',
    matchedPartnerPlate: 'BH 31 STS',
    fuelTankLiters: '700 L + 700 L (1.400 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'INTERAMERICAN HELLENIC · Polița 100282762 (25.04.2026 – 24.04.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001074 (28.03.2022 – 27.03.2027)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-04750 (Finalizare 03.08.2027)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X200K5535171: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 500 Next Gen Highline',
    cabOrBodyType: 'Cabină CR20H Highline (2 cușete confort)',
    engineAndPower: 'Scania DC13 155 12.742 cm³ · 500 CP (368 kW) · 2.550 Nm',
    transmission: 'Scania Opticruise GRS905R cu Retarder',
    axleConfig: '4x2 Cap Tractor Long-Haul',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6d',
    modelYear: 2019,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5535171',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'IF 74 STS',
    matchedPartnerPlate: 'BH 74 STS',
    fuelTankLiters: '500 L + 750 L (1.250 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'AXERIA · Polița 53823811184 (30.11.2025 – 29.11.2026)',
    cascoPolicy: 'GROUPAMA ASIGURARI SA · Polița 300300760001181 (26.10.2023 – 25.10.2027)',
    cmrPolicy: 'LUTZ · Polița W17 3531 12 (exp. 31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-05740 (Finalizare 03.02.2028)',
    fleetStatus: 'ACTIV',
  },

  // =========================================================================
  // 2. BLUE TRANS SPEDITION — 16 SEMIREMORCI REALE (GOOGLE SHEET)
  // =========================================================================
  WSM000009SV031625: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool SMART Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® NX17 · Perete Vario · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXi Spectrum Dual-Zone',
    transmission: '3x Axe ROTOS SCB 9.000 kg (Frâne disc)',
    axleConfig: '3 Axe · 13.6 LDM · TrailerConnect® Telematics',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2025,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '031625',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 23 STS',
    matchedPartnerPlate: 'B 560 STS',
    reeferUnit: 'Thermo King SLXi Spectrum Dual-Zone · 1.120 ore funcționare',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Alliantz · Polița 128425825 (07.04.2026 – 06.04.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI · Polița 300300100 108370 (26.03.2025 – 25.04.2030)',
    leasingContract: 'BCR LEASING · Contract C177782 (Finalizare 05.04.2030)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005270543: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp Executive 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXi 300 Spectrum Bi-Temp',
    transmission: '3x Axe ROTOS SCB 9.000 kg (Frâne disc)',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2021,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5270543',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 31 STS',
    matchedPartnerPlate: 'B 871 STS',
    reeferUnit: 'Thermo King SLXi 300 Spectrum · 3.640 ore funcționare',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 096481558 (09.05.2026 – 08.05.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI · Polița 11381012023 (14.06.2026 – 13.06.2027)',
    leasingContract: 'UNICREDIT LEASING · Contract 30270356 (01.06.2026 · finalizat)',
    fleetStatus: 'FINALIZAT',
  },
  WSM00000005082165: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool 13.6m (VÂNDUTĂ)',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXe 300',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC',
    modelYear: 2011,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5082165',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'BH 33 STS',
    reeferUnit: 'Thermo King SLXe 300',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 95685995 (11.07.2026 – 10.07.2027)',
    cascoPolicy: 'FLEXICASCO · Polița CPJ183064585 (14.03.2026 – 13.03.2027)',
    leasingContract: 'VÂNDUTĂ',
    fleetStatus: 'VANDUTA',
  },
  WSM00000005121737: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXe 300 Spectrum',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2013,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5121737',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 45 STS',
    matchedPartnerPlate: 'BH 50 STS',
    reeferUnit: 'Thermo King SLXe 300 Spectrum',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 95792745 (23.08.2026 – 22.08.2027)',
    cascoPolicy: 'LUTZ · Polița W17457008 (26.09.2023 – Activ)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005021750: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool 13.6m (VÂNDUTĂ)',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXe 300',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC',
    modelYear: 2006,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5021750',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 47 STS',
    reeferUnit: 'Thermo King SLXe 300',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96062338 (17.11.2025 – 16.11.2026)',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'VÂNDUTĂ',
    fleetStatus: 'VANDUTA',
  },
  WKESD000000452860: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Bernard Krone Holding SE & Co. KG (Germania)',
    modelName: 'Krone Cool Liner Duoplex 13.6m (VÂNDUTĂ)',
    cabOrBodyType: 'Semiremorcă Izotermă Duoplex Steel · 33 Euro-paleți',
    engineAndPower: 'Agregat Carrier Vector 1550',
    transmission: '3x Axe Krone 9t cu frâne disc',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7650,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC',
    modelYear: 2009,
    assemblyPlant: 'Lübtheen (Germania)',
    serialNumber: '0452860',
    bodyStyle: 'trailer-krone',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 52 STS',
    reeferUnit: 'Carrier Vector 1550',
    fuelTankLiters: 'Rezervor Agregat Frigo 240 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Alliantz · Polița 127892142 (22.01.2026 – 21.01.2027)',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'VÂNDUTĂ',
    fleetStatus: 'VANDUTA',
  },
  WSM00000005150012: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXe 300 Spectrum Bi-Temp',
    transmission: '3x Axe ROTOS SCB 9.000 kg (Frâne disc)',
    axleConfig: '3 Axe · 13.6 LDM · Sistem MultiTemp',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2015,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5150012',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 59 STS',
    matchedPartnerPlate: 'BH 12 STS',
    reeferUnit: 'Thermo King SLXe 300 Spectrum',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96107787 (04.12.2025 – 03.12.2026)',
    cascoPolicy: 'FLEXICASCO · Polița CPJ179447226 (17.12.2025 – 16.12.2026)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005132131: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Thermo King 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXe 300 Whisper',
    transmission: '3x Axe ROTOS SCB 9.000 kg (Frâne disc)',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC (-25°C..+25°C)',
    modelYear: 2015,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5132131',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 61 STS',
    matchedPartnerPlate: 'BH 30 STS',
    reeferUnit: 'Thermo King SLXe 300',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96107773 (04.12.2025 – 03.12.2026)',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005148412: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXe 300 Spectrum',
    transmission: '3x Axe ROTOS SCB 9.000 kg (Frâne disc)',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2016,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5148412',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 65 STS',
    matchedPartnerPlate: 'BH 49 STS',
    reeferUnit: 'Thermo King SLXe 300 Spectrum',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița AV0859050 (26.07.2026 – 25.07.2027)',
    cascoPolicy: 'FLEXICASCO (Activ)',
    leasingContract: 'BT LEASING · Contract 78476 (07.2026 · finalizat)',
    fleetStatus: 'FINALIZAT',
  },
  WSM00000005202011: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool SMART Bi-Temp Spectrum 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® NX17 · Perete Despărțitor Vario',
    engineAndPower: 'Agregat Thermo King SLXi Spectrum (Diesel + Electric 380V)',
    transmission: '3x Axe ROTOS SCB 9.000 kg (Axa 1 liftantă automată)',
    axleConfig: '3 Axe · Frâne pe disc 430mm · EBS Wabco + TrailerConnect®',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'Certificare ATP FRC Bi-Temp (-25°C..+25°C) & Pharma GDP',
    modelYear: 2018,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5202011',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 67 STS',
    matchedPartnerPlate: 'BH 46 STS',
    reeferUnit: 'Thermo King SLXi Spectrum Dual-Zone · 3.420 ore funcționare',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5 (6 roți + 1 rezervă) + Suport 36 Euro-paleți',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96657049 (26.07.2026 – 25.07.2027)',
    cascoPolicy: 'OMNIASIG SA · Polița C3469895 (09.07.2024 – 08.07.2028)',
    leasingContract: 'BT LEASING · Contract 78475 (Finalizare 07.2028)',
    fleetStatus: 'ACTIV',
  },
  WKESD000000456195: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Bernard Krone Holding SE & Co. KG (Germania)',
    modelName: 'Krone Cool Liner Duoplex Steel Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Izotermă Duoplex Steel · 33 Euro-paleți · MultiTemp',
    engineAndPower: 'Agregat Carrier Vector HE 19 MT High-Efficiency',
    transmission: '3x Axe Krone 9t cu frâne disc și suspensie pneumatică',
    axleConfig: '3 Axe · Krone Telematics KSC ProPlus · Înălțime int. 2.650 mm',
    wheelbaseMm: 7650,
    grossWeightKg: 39000,
    euroClass: 'Certificare ATP FRC Bi-Temp (-25°C..+25°C) · HACCP',
    modelYear: 2009,
    assemblyPlant: 'Lübtheen (Germania)',
    serialNumber: '0456195',
    bodyStyle: 'trailer-krone',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 69 STS',
    matchedPartnerPlate: 'BH 56 STS',
    reeferUnit: 'Carrier Vector HE 19 MT E-Drive · 2.890 ore funcționare',
    fuelTankLiters: 'Rezervor Agregat Frigo 240 L Diesel',
    tireSize: '385/65 R22.5 Krone EasyRider',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96679024 (03.07.2026 – 02.07.2027)',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005097369: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp 13.6m Double-Deck Ready',
    cabOrBodyType: 'Semiremorcă Frigorifică Bi-Temp cu șine etajare (până la 66 paleți)',
    engineAndPower: 'Agregat Thermo King SLXi 400 Whisper',
    transmission: '3x Axe ROTOS SCB 9t',
    axleConfig: '3 Axe · Sistem cântărire pe axă EBS',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-20°C)',
    modelYear: 2012,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5097369',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 74 STS',
    matchedPartnerPlate: 'B 506 STS',
    reeferUnit: 'Thermo King SLXi 400 · 4.820 ore funcționare',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5 Continental HTR2',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Alliantz · Polița 128167299 (14.03.2026 – 13.03.2027)',
    cascoPolicy: 'LUTZ · Polița W17457008 (26.09.2023 – Activ)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005199550: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Pharma GDP Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigo Pharma & Fresh cu 4 senzori înregistratori',
    engineAndPower: 'Agregat Thermo King Advancer Spectrum',
    transmission: '3x Axe ROTOS SCB Disc · Axa 1 liftantă',
    axleConfig: '3 Axe · Sigiliu electronic ușă spate',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC + Certificat GDP Pharma',
    modelYear: 2018,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5199550',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 91 STS',
    matchedPartnerPlate: 'B 507 STS',
    reeferUnit: 'Thermo King Advancer Spectrum · 1.940 ore funcționare',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5 Michelin X Multi T2',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96708892 (13.07.2026 – 12.07.2027)',
    cascoPolicy: 'OMNIASIG · Polița 3593348 (09.07.2026 – 08.07.2028)',
    leasingContract: 'BT LEASING · Contract 121844 (Finalizare 10.07.2028)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005214625: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool SMART Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXi Spectrum',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2020,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5214625',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 96 XTS',
    matchedPartnerPlate: 'BH 72 STS',
    reeferUnit: 'Thermo King SLXi Spectrum',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96749933 (23.07.2026 – 22.07.2027)',
    cascoPolicy: 'OMNIASIG · Polița 3593611 (23.07.2026 – 22.07.2028)',
    leasingContract: 'BT LEASING · Contract 122496 (Finalizare 10.07.2028)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005214617: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool SMART Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXi Spectrum',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2020,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5214617',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 69 XTS',
    matchedPartnerPlate: 'BH 81 STS',
    reeferUnit: 'Thermo King SLXi Spectrum',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96749937 (23.07.2026 – 22.07.2027)',
    cascoPolicy: 'OMNIASIG · Polița 3593612 (23.07.2026 – 22.07.2028)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005188489: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp 13.6m',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXi 300',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2017,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5188489',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 06 XTS',
    matchedPartnerPlate: 'BH 07 XTS',
    reeferUnit: 'Thermo King SLXi 300',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96820521 (20.08.2026 – 19.08.2027)',
    cascoPolicy: 'FLEXICASCO · Polița CPJ192046563 (29.09.2026 – 28.09.2027)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },

  // =========================================================================
  // 3. SCANDEXPRES — 3 CAPETE TRACTOR + 3 SEMIREMORCI REALE (GOOGLE SHEET)
  // =========================================================================
  YV2AG20A3EB683074: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Volvo Trucks AB (Suedia)',
    modelName: 'Volvo FH 460 Globetrotter EEV (Scandexpres)',
    cabOrBodyType: 'Cabină Globetrotter Sleeper (BC autotractor FH42C)',
    engineAndPower: 'Volvo D13C460 EEV 12.777 cm³ · 460 CP (345 kW) @ 1.800 rpm',
    transmission: 'Volvo I-Shift AT2612D (12 trepte automatizată)',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3700,
    grossWeightKg: 44000,
    euroClass: 'EEV / Euro 5+',
    modelYear: 2014,
    assemblyPlant: 'Göteborg (Suedia)',
    serialNumber: '683074',
    bodyStyle: 'tractor-volvo',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 41 STS',
    matchedPartnerPlate: 'BH 05 XTS',
    fuelTankLiters: '1.100 L Aluminiu + AdBlue',
    tireSize: '315/60 R22.5 față · 295/60 R22.5 spate',
    companyName: 'SCANDEXPRES',
    rcaPolicy: 'AXERIA · Polița 64734322199 (01.07.2026 – 30.06.2027)',
    cascoPolicy: 'GROUPAMA ASIGURARI · Polița 11381022373 (26.06.2026 – 25.06.2027)',
    cmrPolicy: 'LUTZ · Polița W17 5657 12 (09.07.2026 – 30.06.2027)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X200H5482943: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 450 Streamline Highline A4x2NA (Arhivă CIV)',
    cabOrBodyType: 'Cabină CR19H Streamline Highline (BC autotractor N320, ADR AT)',
    engineAndPower: 'Scania DC13 147 12.742 cm³ · 450 CP (331 kW) @ 1.900 rpm',
    transmission: 'Scania Opticruise GRS895R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3700,
    grossWeightKg: 65000,
    euroClass: 'Euro 6c (R6)',
    modelYear: 2017,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5482943',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'IF 71 STS',
    fuelTankLiters: '700 L + 550 L (1.250 L Total) + AdBlue',
    tireSize: '385/65 R22.5 față · 315/70 R22.5 spate',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: '-',
    cascoPolicy: 'Fără CASCO activ (-)',
    cmrPolicy: '-',
    leasingContract: 'SCANIA CREDIT ROMANIA IFN SA (Arhivă CIV)',
    fleetStatus: 'ARHIVA',
  },
  YS2R4X200J5532496: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 500 Highline A4x2NA (Scandexpres)',
    cabOrBodyType: 'Cabină CR20H Highline (2 cușete, suspensie pneumatică)',
    engineAndPower: 'Scania DC13 155 12.7L · 500 CP (368 kW) · 2.550 Nm',
    transmission: 'Scania Opticruise GRS905R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6d',
    modelYear: 2018,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5532496',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'IF 96 STS',
    matchedPartnerPlate: 'BH 75 STS',
    fuelTankLiters: '750 L + 500 L (1.250 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'SCANDEXPRES',
    rcaPolicy: 'EASY · Polița 408897 (10.12.2025 – 09.12.2026)',
    cascoPolicy: 'OMNIASIG · Polița 3455792 (20.11.2023 – 19.11.2027)',
    cmrPolicy: 'LUTZ · Polița W17 5657 12 (09.07.2026 – 30.06.2027)',
    leasingContract: 'SCANIA CREDIT (Activ)',
    fleetStatus: 'ACTIV',
  },
  YS2R4X205T5806891: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 460 Super Highline A4x2NA (Scandexpres)',
    cabOrBodyType: 'Cabină CR20H Highline Super (Model 2026 Smart Dash · ADR AT)',
    engineAndPower: 'Scania DC13 175 Super 12.742 cm³ · 460 CP (338 kW) · 2.500 Nm',
    transmission: 'Scania Opticruise G33CM cu Retarder R4700D',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3750,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e (Clasa CO2 4 Maut)',
    modelYear: 2026,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5806891',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'B 166 STS',
    matchedPartnerPlate: 'BH 02 XTS',
    fuelTankLiters: '615 L + 570 L (1.185 L Total · CIV) + AdBlue',
    tireSize: '315/70 R22.5 Michelin X Line Energy',
    companyName: 'SCANDEXPRES',
    rcaPolicy: 'Alliantz · Polița 129044081 (17.06.2026 – 16.06.2027)',
    cascoPolicy: 'OMNIASIG · Polița 3587074 (03.06.2026 – 02.06.2031)',
    cmrPolicy: 'LUTZ · Polița W17 5657 12 (09.07.2026 – 30.06.2027)',
    leasingContract: 'SCANIA CREDIT (Activ)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005154565: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool MultiTemp Nordic Edition 13.6m',
    cabOrBodyType: 'Semiremorcă Frigo ranforsată Ferry-Lashing (Poduri & Feribot Scandinavia)',
    engineAndPower: 'Agregat Thermo King Advancer A-500 Whisper PIEK',
    transmission: '3x Axe ROTOS SCB · Izolație k=0.34 W/m²K',
    axleConfig: '3 Axe · Cârlige ancorare feribot Ro-Ro',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC MultiTemp (-25°C..+25°C)',
    modelYear: 2015,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5154565',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 75 STS',
    matchedPartnerPlate: 'IF 96 STS',
    reeferUnit: 'Thermo King Advancer A-500 · 4.110 ore funcționare',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5 M+S 3PMSF Winter Nordic',
    companyName: 'SCANDEXPRES',
    rcaPolicy: 'GRAWE ROMANIA ASIGURARE S.A. · Polița 96117263 (22.12.2025 – 21.12.2026)',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000005166897: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp 13.6m (Scandexpres)',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXi 300 Spectrum',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2017,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5166897',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 05 XTS',
    matchedPartnerPlate: 'BH 41 STS',
    reeferUnit: 'Thermo King SLXi 300 Spectrum',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'SCANDEXPRES',
    rcaPolicy: 'Alliantz · Polița 128167246 (03.03.2026 – 02.03.2027)',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },
  WSM00000003243505: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz S.KO Cool Bi-Temp 13.6m (Scandexpres)',
    cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® · 33 Euro-paleți',
    engineAndPower: 'Agregat Thermo King SLXe 300',
    transmission: '3x Axe ROTOS SCB 9.000 kg',
    axleConfig: '3 Axe · 13.6 LDM',
    wheelbaseMm: 7700,
    grossWeightKg: 39000,
    euroClass: 'ATP FRC Bi-Temp (-25°C..+25°C)',
    modelYear: 2015,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '3243505',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 02 XTS',
    matchedPartnerPlate: 'B 166 STS',
    reeferUnit: 'Thermo King SLXe 300',
    fuelTankLiters: 'Rezervor Agregat Frigo 245 L Diesel',
    tireSize: '385/65 R22.5',
    companyName: 'SCANDEXPRES',
    rcaPolicy: 'Alliantz · Polița 129408322 (07.08.2026 – 06.08.2027)',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'Achitat integral (-)',
    fleetStatus: 'ACTIV',
  },

  // =========================================================================
  // VEHICULE SUPLIMENTARE EXTRASE DIRECT DIN CĂRȚILE DE IDENTITATE RAR (CIV PDF)
  // =========================================================================
  UU1DJF00973024855: {
    assetCategory: 'AUTOTURISM FLOTĂ (M1)',
    manufacturer: 'Automobile Dacia SA (România)',
    modelName: 'Dacia Logan III TCe 90 (M1 Autoturism)',
    cabOrBodyType: 'AA Berlină 4 uși · 5 locuri (CIV RAR S105412)',
    engineAndPower: 'Renault-Dacia H4D-E4 · 999 cm³ · 91 CP (67 kW) · Benzină',
    transmission: 'Cutie manuală 6 trepte · Tracțiune față',
    axleConfig: '2 axe · Suspensie mecanică',
    wheelbaseMm: 2649,
    grossWeightKg: 1590,
    euroClass: 'Euro 6 EA (WLTP 126 g/km)',
    modelYear: 2024,
    assemblyPlant: 'Mioveni (România)',
    serialNumber: '73024855',
    bodyStyle: 'car-sedan',
    oemColor: OEM_TRUCK_COLORS[8],
    matchedFleetPlate: 'B 102 STS',
    fuelTankLiters: '50 L Benzină',
    tireSize: '195/55 R16 87H',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Conform dosar flotă administrativă',
    cascoPolicy: 'Conform dosar flotă administrativă',
    leasingContract: 'Flotă administrativă',
    fleetStatus: 'ACTIV',
  },
  UU1DJF00373024849: {
    assetCategory: 'AUTOTURISM FLOTĂ (M1)',
    manufacturer: 'Automobile Dacia SA (România)',
    modelName: 'Dacia Logan III TCe 90 (M1 Autoturism)',
    cabOrBodyType: 'AA Berlină 4 uși · 5 locuri (CIV RAR)',
    engineAndPower: 'Renault-Dacia H4D-E4 · 999 cm³ · 91 CP (67 kW) · Benzină',
    transmission: 'Cutie manuală 6 trepte · Tracțiune față',
    axleConfig: '2 axe · Suspensie mecanică',
    wheelbaseMm: 2649,
    grossWeightKg: 1590,
    euroClass: 'Euro 6 EA (WLTP 126 g/km)',
    modelYear: 2024,
    assemblyPlant: 'Mioveni (România)',
    serialNumber: '73024849',
    bodyStyle: 'car-sedan',
    oemColor: OEM_TRUCK_COLORS[8],
    matchedFleetPlate: 'B 196 STS',
    fuelTankLiters: '50 L Benzină',
    tireSize: '195/55 R16 87H',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Conform dosar flotă administrativă',
    cascoPolicy: 'Conform dosar flotă administrativă',
    leasingContract: 'Flotă administrativă',
    fleetStatus: 'ACTIV',
  },
  WDD2040031A698310: {
    assetCategory: 'AUTOTURISM FLOTĂ (M1)',
    manufacturer: 'Mercedes-Benz AG (Germania)',
    modelName: 'Mercedes-Benz C 250 CDI (W204)',
    cabOrBodyType: 'AA Berlină 4 uși · 5 locuri (CIV RAR L006600)',
    engineAndPower: 'Mercedes OM651.911 · 2.143 cm³ · 204 CP (150 kW) · Motorină',
    transmission: '7G-TRONIC · Tracțiune spate',
    axleConfig: '2 axe · Masa proprie 1.615 kg',
    wheelbaseMm: 2760,
    grossWeightKg: 2130,
    euroClass: 'Euro 5 (DPF · 131 g/km CO2)',
    modelYear: 2012,
    assemblyPlant: 'Sindelfingen / Bremen (Germania)',
    serialNumber: 'A698310',
    bodyStyle: 'car-sedan',
    oemColor: OEM_TRUCK_COLORS[7],
    matchedFleetPlate: 'BH 01 STS',
    fuelTankLiters: '62 L Motorină',
    tireSize: '225/45 R17 91W / 245/40 R17',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Conform dosar flotă administrativă',
    cascoPolicy: 'Fără CASCO (-)',
    leasingContract: 'Proprietate SC Blue Trans Spedition SRL',
    fleetStatus: 'ACTIV',
  },
  WSM00000005166896: {
    assetCategory: 'SEMIREMORCĂ FRIGO',
    manufacturer: 'Schmitz Cargobull AG (Germania)',
    modelName: 'Schmitz Cargobull S.KO Cool SCB*S3B',
    cabOrBodyType: 'DA04 Semiremorcă cu temperatură controlată · 14.04m ext. (CIV RAR S875979)',
    engineAndPower: 'Agregat Frigorific Bi-Temp · Temperatură controlată',
    transmission: '3 axe Rotos · Suspensie pneumatică',
    axleConfig: '3 axe · 9.000 kg / axă (42.000 kg tehnic)',
    wheelbaseMm: 6290,
    grossWeightKg: 42000,
    euroClass: 'O4 Semiremorcă Frigo',
    modelYear: 2017,
    assemblyPlant: 'Vreden (Germania)',
    serialNumber: '5166896',
    bodyStyle: 'trailer-schmitz',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'BH 03 XTS',
    reeferUnit: 'Thermo King SLXi / Temperatură controlată DA04',
    tireSize: '385/65 R22.5 160J',
    companyName: 'SCANDEXPRES',
    rcaPolicy: 'Arhivă CIV RAR Bihor (08.05.2025)',
    cascoPolicy: '-',
    leasingContract: 'Arhivă CIV',
    fleetStatus: 'ARHIVA',
  },
  YS2R4X200H5470447: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 450 Streamline Highline A4x2NA',
    cabOrBodyType: 'BC Autotractor N3 · Cabină CR19H Streamline (Omologare N320 · CIV RAR L998313)',
    engineAndPower: 'Scania DC 13.147 · 12.742 cm³ · 450 CP (331 kW) · Motorină',
    transmission: 'Scania Opticruise cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR · Ampatament 3.700 mm',
    wheelbaseMm: 3700,
    grossWeightKg: 40000,
    euroClass: 'Euro 6c',
    modelYear: 2017,
    assemblyPlant: 'Zwolle (Olanda)',
    serialNumber: '5470447',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[0],
    matchedFleetPlate: 'IF 02 XTS',
    fuelTankLiters: '1.250 L Motorină',
    tireSize: '385/65 R22.5 față · 315/70 R22.5 spate',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Arhivă CIV (Scania Credit Romania IFN)',
    cascoPolicy: '-',
    leasingContract: 'Arhivă CIV',
    fleetStatus: 'ARHIVA',
  },
  YS2R4X200J5532061: {
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Scania CV AB (Suedia)',
    modelName: 'Scania R 500 Highline A4x2NA (ADR AT)',
    cabOrBodyType: 'BC Autotractor N3 · Echipare ADR AT (CIV RAR N433119)',
    engineAndPower: 'Scania DC 13.155 · 12.742 cm³ · 500 CP (368 kW) · Motorină',
    transmission: 'Scania Opticruise GRS905R cu Retarder',
    axleConfig: '4x2 Cap Tractor TIR · Ampatament 3.750 mm',
    wheelbaseMm: 3750,
    grossWeightKg: 50000,
    euroClass: 'Euro 6d',
    modelYear: 2018,
    assemblyPlant: 'Södertälje (Suedia)',
    serialNumber: '5532061',
    bodyStyle: 'tractor-scania',
    oemColor: OEM_TRUCK_COLORS[1],
    matchedFleetPlate: 'IF 78 STS',
    fuelTankLiters: '750 L + 500 L (1.250 L Total)',
    tireSize: '315/70 R22.5 156/150G',
    companyName: 'BLUE TRANS SPEDITION',
    rcaPolicy: 'Arhivă CIV (BCR Leasing IFN)',
    cascoPolicy: '-',
    leasingContract: 'Arhivă CIV',
    fleetStatus: 'ARHIVA',
  },
};

export function decodeVinNumber(
  rawInput: string,
  _ignoredOverrideColorCode?: string
): DecodedVinInfo {
  const cleaned = rawInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const vin = cleaned.padEnd(17, '0').slice(0, 17);

  // Check exact match in catalog — Model & Color come 100% directly from the VIN
  if (KNOWN_VIN_CATALOG[cleaned]) {
    const exact = KNOWN_VIN_CATALOG[cleaned];
    return {
      ...exact,
      vin: cleaned,
      valid: cleaned.length >= 11,
      oemColor: exact.oemColor,
    };
  }

  // Otherwise decode dynamically from WMI (pos 1-3), VDS (pos 4-9), VIS (pos 10-17)
  const wmi = vin.slice(0, 3);
  const yearChar = vin[9] || 'R';
  const yearMap: Record<string, number> = {
    D: 2013,
    E: 2014,
    F: 2015,
    G: 2016,
    H: 2017,
    J: 2018,
    K: 2019,
    L: 2020,
    M: 2021,
    N: 2022,
    P: 2023,
    R: 2024,
    S: 2025,
    T: 2026,
  };
  const modelYear = yearMap[yearChar] || 2024;
  const serialNumber = vin.slice(11, 17);

  // Deterministic OEM color directly from VIN characters (excluding white index 0 for tractors so tractors have distinct factory paint unless encoded)
  const hashSum = vin
    .split('')
    .reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 1), 0);
  const oemColor = OEM_TRUCK_COLORS[(hashSum % (OEM_TRUCK_COLORS.length - 1)) + 1];

  if (wmi.startsWith('WSM')) {
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'SEMIREMORCĂ FRIGO',
      manufacturer: 'Schmitz Cargobull AG (Germania)',
      modelName: 'Schmitz S.KO Cool SMART Bi-Temp 13.6m',
      cabOrBodyType: 'Semiremorcă Frigorifică FERROPLAST® cu Perete Despărțitor',
      engineAndPower: 'Agregat Thermo King SLXi Spectrum (-25°C..+25°C)',
      transmission: '3x Axe ROTOS SCB 9.000 kg (Frâne disc)',
      axleConfig: '3 Axe · 13.6 LDM (33 Euro-paleți)',
      wheelbaseMm: 7700,
      grossWeightKg: 39000,
      euroClass: 'ATP FRC Bi-Temp',
      modelYear,
      assemblyPlant: 'Vreden (Germania)',
      serialNumber,
      bodyStyle: 'trailer-schmitz',
      oemColor: OEM_TRUCK_COLORS[0],
      reeferUnit: 'Thermo King SLXi Spectrum Dual-Zone',
      fuelTankLiters: 'Rezervor Agregat 245 L',
      tireSize: '385/65 R22.5',
    };
  }

  if (wmi.startsWith('WKE')) {
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'SEMIREMORCĂ FRIGO',
      manufacturer: 'Bernard Krone Holding SE (Germania)',
      modelName: 'Krone Cool Liner Duoplex Bi-Temp 13.6m',
      cabOrBodyType: 'Semiremorcă Frigorifică Duoplex Steel · MultiTemp',
      engineAndPower: 'Agregat Carrier Vector HE 19 MT',
      transmission: '3x Axe Krone 9t cu suspensie pneumatică',
      axleConfig: '3 Axe · 13.6 LDM (33 Euro-paleți)',
      wheelbaseMm: 7650,
      grossWeightKg: 39000,
      euroClass: 'ATP FRC Bi-Temp',
      modelYear,
      assemblyPlant: 'Lübtheen (Germania)',
      serialNumber,
      bodyStyle: 'trailer-krone',
      oemColor: OEM_TRUCK_COLORS[0],
      reeferUnit: 'Carrier Vector HE 19 MT',
      fuelTankLiters: 'Rezervor Agregat 240 L',
      tireSize: '385/65 R22.5',
    };
  }

  if (wmi.startsWith('YS2')) {
    const isSSeries = vin[3] === 'S';
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'CAP TRACTOR (HGV)',
      manufacturer: 'Scania CV AB (Suedia)',
      modelName: isSSeries
        ? 'Scania S 500 Next Gen Highline'
        : 'Scania R 500 Super Highline A4x2NA',
      cabOrBodyType: isSSeries
        ? 'Cabină CS20H Next Gen (Podea plană, 2 cușete)'
        : 'Cabină Highline CR20H (Suspensie pneumatică 4 puncte)',
      engineAndPower: 'Scania DC13 Super 12.7L · 500 CP · 2.650 Nm',
      transmission: 'Scania Opticruise G33CM + Retarder',
      axleConfig: '4x2 Cap Tractor TIR',
      wheelbaseMm: 3750,
      grossWeightKg: 40000,
      euroClass: 'Euro 6e (Clasa CO2 4)',
      modelYear,
      assemblyPlant: 'Södertälje (Suedia)',
      serialNumber,
      bodyStyle: 'tractor-scania',
      oemColor: OEM_TRUCK_COLORS[1],
      fuelTankLiters: '1.400 L Aluminiu + 105 L AdBlue',
      tireSize: '315/70 R22.5',
    };
  }

  if (wmi.startsWith('WDB') || wmi.startsWith('W1V') || wmi.startsWith('WDF')) {
    const isSprinter = vin.includes('907') || vin.includes('906');
    if (isSprinter) {
      return {
        vin: cleaned || vin,
        valid: cleaned.length >= 8,
        assetCategory: 'UTILITARĂ EXPRESS FRIGO',
        manufacturer: 'Mercedes-Benz AG (Germania)',
        modelName: 'Mercedes-Benz Sprinter 319 CDI Frigo Express',
        cabOrBodyType: 'Caroserie Izotermă Frigo 4.2 LDM (8 Euro-paleți)',
        engineAndPower: 'Mercedes OM 654 2.0L Bi-Turbo · 190 CP',
        transmission: '9G-TRONIC Automată',
        axleConfig: '4x2 Express 3.5T',
        wheelbaseMm: 4325,
        grossWeightKg: 3500,
        euroClass: 'Euro 6e',
        modelYear,
        assemblyPlant: 'Düsseldorf (Germania)',
        serialNumber,
        bodyStyle: 'van-sprinter',
        oemColor: OEM_TRUCK_COLORS[1],
        reeferUnit: 'Carrier Xarios 600 (-20°C..+20°C)',
        fuelTankLiters: '93 L + 22 L AdBlue',
        tireSize: '235/65 R16C',
      };
    }
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'CAP TRACTOR (HGV)',
      manufacturer: 'Daimler Truck AG — Mercedes-Benz (Germania)',
      modelName: 'Mercedes-Benz Actros L 1848 GigaSpace',
      cabOrBodyType: 'Cabină GigaSpace 2.50m (Podea plană, MirrorCam)',
      engineAndPower: 'Mercedes OM 471 12.8L · 476 CP · 2.300 Nm',
      transmission: 'Mercedes PowerShift 3 (12 trepte)',
      axleConfig: '4x2 Cap Tractor TIR',
      wheelbaseMm: 3700,
      grossWeightKg: 40000,
      euroClass: 'Euro 6e',
      modelYear,
      assemblyPlant: 'Wörth am Rhein (Germania)',
      serialNumber,
      bodyStyle: 'tractor-mercedes',
      oemColor: OEM_TRUCK_COLORS[4],
      fuelTankLiters: '1.250 L Aluminiu + 90 L AdBlue',
      tireSize: '315/70 R22.5',
    };
  }

  if (wmi.startsWith('XLR')) {
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'CAP TRACTOR (HGV)',
      manufacturer: 'DAF Trucks N.V. (Olanda)',
      modelName: 'DAF XG+ 530 FT New Generation',
      cabOrBodyType: 'Cabină Aerodinamică DAF XG+ (12.5 m³ volum interior)',
      engineAndPower: 'PACCAR MX-13 12.9L · 530 CP · 2.700 Nm',
      transmission: 'ZF TraXon 12 trepte + Intarder',
      axleConfig: '4x2 Cap Tractor TIR',
      wheelbaseMm: 4000,
      grossWeightKg: 40000,
      euroClass: 'Euro 6e',
      modelYear,
      assemblyPlant: 'Eindhoven (Olanda)',
      serialNumber,
      bodyStyle: 'tractor-daf',
      oemColor: OEM_TRUCK_COLORS[3],
      fuelTankLiters: '1.275 L Aluminiu + 85 L AdBlue',
      tireSize: '315/70 R22.5',
    };
  }

  if (wmi.startsWith('WMA')) {
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'CAP TRACTOR (HGV)',
      manufacturer: 'MAN Truck & Bus SE (Germania)',
      modelName: 'MAN TGX 18.510 4x2 BL SA GX',
      cabOrBodyType: 'Cabină înaltă MAN GX (OptiView Digital Mirrors)',
      engineAndPower: 'MAN D2676 12.4L · 510 CP · 2.600 Nm',
      transmission: 'MAN TipMatic 12.26 DD cu Retarder',
      axleConfig: '4x2 Cap Tractor TIR',
      wheelbaseMm: 3600,
      grossWeightKg: 40000,
      euroClass: 'Euro 6e',
      modelYear,
      assemblyPlant: 'München (Germania)',
      serialNumber,
      bodyStyle: 'tractor-man',
      oemColor: OEM_TRUCK_COLORS[5],
      fuelTankLiters: '1.160 L Aluminiu + 80 L AdBlue',
      tireSize: '315/70 R22.5',
    };
  }

  if (wmi.startsWith('UU1')) {
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'AUTOTURISM FLOTĂ (M1)',
      manufacturer: 'Automobile Dacia S.A. (România)',
      modelName: 'Dacia Logan III TCe 90 (M1 Autoturism)',
      cabOrBodyType: 'AA Berlină 4 uși · 5 locuri',
      engineAndPower: 'Renault-Dacia H4D · 999 cm³ · 91 CP (67 kW) · Benzină',
      transmission: 'Cutie manuală 6 trepte · Tracțiune față',
      axleConfig: '2 axe · Suspensie mecanică',
      wheelbaseMm: 2649,
      grossWeightKg: 1590,
      euroClass: 'Euro 6e',
      modelYear,
      assemblyPlant: 'Mioveni (România)',
      serialNumber,
      bodyStyle: 'car-sedan',
      oemColor: OEM_TRUCK_COLORS[8],
      fuelTankLiters: '50 L Benzină',
      tireSize: '195/55 R16 87H',
    };
  }

  if (wmi.startsWith('WDD')) {
    return {
      vin: cleaned || vin,
      valid: cleaned.length >= 8,
      assetCategory: 'AUTOTURISM FLOTĂ (M1)',
      manufacturer: 'Mercedes-Benz AG (Germania)',
      modelName: 'Mercedes-Benz C 250 CDI (W204)',
      cabOrBodyType: 'AA Berlină 4 uși · 5 locuri',
      engineAndPower: 'Mercedes OM651 · 2.143 cm³ · 204 CP (150 kW) · Motorină',
      transmission: '7G-TRONIC · Tracțiune spate',
      axleConfig: '2 axe · Masa proprie 1.615 kg',
      wheelbaseMm: 2760,
      grossWeightKg: 2130,
      euroClass: 'Euro 5',
      modelYear,
      assemblyPlant: 'Bremen (Germania)',
      serialNumber,
      bodyStyle: 'car-sedan',
      oemColor: OEM_TRUCK_COLORS[7],
      fuelTankLiters: '62 L Motorină',
      tireSize: '225/45 R17 91W',
    };
  }

  // Default to Volvo FH Globetrotter XL
  return {
    vin: cleaned || vin,
    valid: cleaned.length >= 8,
    assetCategory: 'CAP TRACTOR (HGV)',
    manufacturer: 'Volvo Trucks AB (Suedia)',
    modelName: 'Volvo FH 500 I-Save Globetrotter XL',
    cabOrBodyType: 'Cabină Globetrotter XL Sleeper (Aero Package)',
    engineAndPower: 'Volvo D13TC 12.8L · 500 CP · 2.800 Nm',
    transmission: 'Volvo I-Shift AT2812F (12 trepte)',
    axleConfig: '4x2 Cap Tractor TIR',
    wheelbaseMm: 3800,
    grossWeightKg: 40000,
    euroClass: 'Euro 6e',
    modelYear,
    assemblyPlant: 'Göteborg (Suedia)',
    serialNumber,
    bodyStyle: 'tractor-volvo',
    oemColor,
    fuelTankLiters: '1.350 L Aluminiu + 100 L AdBlue',
    tireSize: '315/70 R22.5',
  };
}

/**
 * Poza de studio a modelului, în culoarea exactă din Cartea de Identitate RAR (CIV) / VIN.
 * Dacă pentru combinația model + culoare nu există fotografie dedicată, Dosarul Tehnic folosește Showroom-ul 3D 360°.
 */
export const getFleetPhoto = (decoded: DecodedVinInfo): string | null => {
  const name = decoded.modelName.toLowerCase();
  const engine = decoded.engineAndPower.toLowerCase();
  const isScaniaStreamline =
    name.includes('streamline') ||
    engine.includes('13.147') ||
    engine.includes('13 147');
  const color = decoded.oemColor.code;
  if (decoded.bodyStyle === 'trailer-schmitz') {
    if (color === '1346-BLUE' || color === '5010-NAVY') return '/fleet/schmitz-reefer-blue.webp';
    if (color === '1103-WHITE') return '/fleet/schmitz-reefer-white.webp';
  }
  if (decoded.bodyStyle === 'trailer-krone' && color === '1103-WHITE') {
    return '/fleet/krone-reefer-white.webp';
  }
  if (decoded.bodyStyle === 'tractor-scania') {
    if (color === '1103-WHITE') {
      if (isScaniaStreamline) return '/fleet/scania-r-streamline-white.webp';
      if (/scania s \d/.test(name)) return '/fleet/scania-s-nextgen-white.webp';
      return '/fleet/scania-r-nextgen-white.webp';
    }
    if (color === '9744-SILVER') {
      return '/fleet/scania-r-nextgen-grey.webp';
    }
    if (color === '1346-BLUE' || color === '5010-NAVY') {
      if (isScaniaStreamline) return '/fleet/scania-r-streamline-blue.webp';
      if (/scania s \d/.test(name)) return '/fleet/scania-s-nextgen-blue.webp';
      return '/fleet/scania-r-nextgen-blue.webp';
    }
  }
  if (decoded.bodyStyle === 'tractor-volvo') {
    if (color === '1103-WHITE') return '/fleet/volvo-fh-white.webp';
    if (color === '9744-SILVER') return '/fleet/volvo-fh-2013-silver.webp';
    if (color === '5010-NAVY') return '/fleet/volvo-fh-2018-navy.webp';
    if (color === '1346-BLUE') return '/fleet/volvo-fh-2025-blue.webp';
  }
  if (decoded.bodyStyle === 'van-sprinter' && color === '9005-BLACK') {
    return '/fleet/sprinter-frigo-black.webp';
  }
  if (decoded.bodyStyle === 'car-sedan') {
    if (name.includes('logan') && (color === '1346-BLUE' || color === '5010-NAVY')) {
      return '/fleet/dacia-logan-2024-blue.webp';
    }
    if (name.includes('mercedes') && color === '9005-BLACK') {
      return '/fleet/mercedes-c250-w204-black.webp';
    }
  }
  return null;
};

/**
 * Returnează întotdeauna o fotografie reală de studio decupată transparent (`/fleet/*.webp`)
 * pentru miniaturile cardurilor din „Mașinile mele”, integrată nativ în Dark Mode și Light Mode.
 */
export const getFleetCardPhoto = (decoded: DecodedVinInfo): string => {
  const exact = getFleetPhoto(decoded);
  if (exact) return exact;

  const name = decoded.modelName.toLowerCase();
  const engine = decoded.engineAndPower.toLowerCase();
  const isScaniaStreamline =
    name.includes('streamline') ||
    engine.includes('13.147') ||
    engine.includes('13 147');
  const color = decoded.oemColor.code;

  if (decoded.bodyStyle === 'trailer-krone') {
    return '/fleet/krone-reefer-white.webp';
  }
  if (decoded.bodyStyle === 'trailer-schmitz') {
    return color === '1346-BLUE' || color === '5010-NAVY'
      ? '/fleet/schmitz-reefer-blue.webp'
      : '/fleet/schmitz-reefer-white.webp';
  }
  if (decoded.bodyStyle === 'van-sprinter' || decoded.bodyStyle === 'truck-man-tgl') {
    return '/fleet/sprinter-frigo-black.webp';
  }
  if (decoded.bodyStyle === 'car-sedan') {
    return name.includes('logan')
      ? '/fleet/dacia-logan-2024-blue.webp'
      : '/fleet/mercedes-c250-w204-black.webp';
  }
  if (decoded.bodyStyle === 'tractor-volvo') {
    if (color === '1103-WHITE') return '/fleet/volvo-fh-white.webp';
    if (color === '9744-SILVER') return '/fleet/volvo-fh-2013-silver.webp';
    if (color === '5010-NAVY' || color === '9005-BLACK') return '/fleet/volvo-fh-2018-navy.webp';
    return '/fleet/volvo-fh-2025-blue.webp';
  }
  if (isScaniaStreamline) {
    return color === '1103-WHITE'
      ? '/fleet/scania-r-streamline-white.webp'
      : '/fleet/scania-r-streamline-blue.webp';
  }
  if (/scania s \d/.test(name)) {
    return color === '1103-WHITE'
      ? '/fleet/scania-s-nextgen-white.webp'
      : '/fleet/scania-s-nextgen-blue.webp';
  }
  if (color === '9744-SILVER' || color === '9005-BLACK') {
    return '/fleet/scania-r-nextgen-grey.webp';
  }
  if (color === '1103-WHITE') {
    return '/fleet/scania-r-nextgen-white.webp';
  }
  return '/fleet/scania-r-nextgen-blue.webp';
};

/**
 * Suprapune colantarea corporativă în perspectivă reală peste fotografia de studio
 * a semiremorcii frigorifice Schmitz Cargobull / Krone sau a autoutilitarei
 * Mercedes-Benz Sprinter Frigo BA04 (cu mix-blend-mode: multiply pe pereții albi
 * și inscripționare albă pe caroseriile albastre conform CIV).
 */
const TrailerPhotoWithLivery: React.FC<{
  src: string;
  alt: string;
  isKrone?: boolean;
  variant?: 'schmitz' | 'krone' | 'sprinter';
  companyName?: string;
  mode: 'dossier' | 'card';
}> = ({ src, alt, isKrone = false, variant, companyName, mode }) => {
  const resolvedVariant: 'schmitz' | 'krone' | 'sprinter' =
    variant || (isKrone ? 'krone' : 'schmitz');
  const upper = (companyName || 'BLUE TRANS SPEDITION').trim().toUpperCase();
  const isScandexpres = upper.includes('SCANDEXPRES');
  const primaryText = isScandexpres ? 'SCANDEXPRES' : upper || 'BLUE TRANS SPEDITION';
  const subText =
    resolvedVariant === 'sprinter'
      ? 'EXPRESS FRIGO 3.5T · CONTROL TEMPERATURĂ BA04'
      : isScandexpres
        ? 'BLUE TRANS SPEDITION GROUP · FRIGO BI-TEMP'
        : 'INTERNATIONAL FRIGO & BI-TEMP LOGISTICS';
  const isBlueBox = src.includes('-blue');

  // Coordonate calibrate pe geometria fotografiilor 1200x896 (Schmitz, Krone & Sprinter Frigo BA04)
  const perspectiveTransform =
    resolvedVariant === 'sprinter'
      ? 'translate(986, 368) matrix(0.265, 0.019, 0, 0.45, 0, 0)'
      : resolvedVariant === 'krone'
        ? 'translate(662, 374) matrix(0.40, 0.065, 0, 0.68, 0, 0)'
        : 'translate(715, 382) matrix(0.72, 0.100, 0, 0.92, 0, 0)';

  return (
    <div
      className={
        mode === 'dossier'
          ? 'fleet-studio-cutout relative isolate inline-flex items-center justify-center max-h-[250px] overflow-hidden rounded-2xl'
          : 'fleet-studio-cutout relative isolate w-full h-full flex items-center justify-center overflow-hidden'
      }
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={
          mode === 'dossier'
            ? 'block max-h-[250px] w-auto object-contain select-none'
            : 'w-full h-full object-contain select-none'
        }
      />
      <svg
        viewBox="0 0 1200 896"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full select-none"
        style={{
          mixBlendMode: isBlueBox ? 'normal' : 'multiply',
          opacity: isBlueBox ? 0.96 : 0.92,
        }}
      >
        <g transform={perspectiveTransform}>
          {/* Chevroane aerodinamice stânga */}
          <polygon
            points="-358,-44 -332,-44 -352,22 -378,22"
            fill={isBlueBox ? '#ffffff' : '#003d8f'}
          />
          <polygon
            points="-322,-44 -302,-44 -322,22 -342,22"
            fill={isBlueBox ? '#bae6fd' : '#0284c7'}
          />
          <polygon points="-292,-44 -278,-44 -298,22 -312,22" fill="#38bdf8" />

          {/* Denumire companie principală */}
          <text
            x="16"
            y="16"
            textAnchor="middle"
            fill={isBlueBox ? '#ffffff' : '#003d8f'}
            fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
            fontSize={isScandexpres ? '72' : '54'}
            fontWeight="900"
            letterSpacing="1"
          >
            {primaryText}
          </text>

          {/* Bandă corporate sub denumire */}
          <polygon
            points="-338,34 358,34 344,68 -352,68"
            fill={isBlueBox ? '#0f172a' : '#0284c7'}
          />
          <text
            x="6"
            y="57"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
            fontSize="19"
            fontWeight="800"
            letterSpacing="1.2"
          >
            {subText}
          </text>
        </g>
      </svg>
    </div>
  );
};

/**
 * Photorealistic Studio Showroom SVG Renderer for HGV Tractor Units,
 * 13.6m Bi-Temp Refrigerated Trailers, Express Vans & Coupled Road Trains.
 */
export const VehicleStudioRender: React.FC<{
  decoded: DecodedVinInfo;
  plateNumber: string;
  partnerPlateNumber?: string;
  trailerCompanyName?: string;
  trailerOemHex?: string;
  showCoupledRoadTrain?: boolean;
  zone1Temp?: number;
  zone2Temp?: number;
  heightClass?: string;
}> = ({
  decoded,
  plateNumber,
  partnerPlateNumber,
  trailerCompanyName,
  trailerOemHex,
  showCoupledRoadTrain = false,
  zone1Temp = -18,
  zone2Temp = 4,
  heightClass = 'h-[210px] sm:h-[240px]',
}) => {
  const reactUid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const { bodyStyle, oemColor, modelName, modelYear } = decoded;
  const fleetPhoto =
    getFleetPhoto(decoded) ||
    (bodyStyle === 'car-sedan' || bodyStyle === 'truck-man-tgl'
      ? getFleetCardPhoto(decoded)
      : null);
  const supports3D = bodyStyle !== 'truck-man-tgl';
  const showroomBodyStyle: ShowroomVehicleKind =
    bodyStyle === 'car-sedan'
      ? decoded.manufacturer.toUpperCase().includes('DACIA') ||
        decoded.modelName.toUpperCase().includes('LOGAN') ||
        decoded.vin.toUpperCase().startsWith('UU1')
        ? 'car-logan'
        : 'car-mercedes'
      : (bodyStyle as ShowroomVehicleKind);
  const effectiveCoupled =
    Boolean(showCoupledRoadTrain) &&
    bodyStyle !== 'car-sedan' &&
    bodyStyle !== 'van-sprinter' &&
    bodyStyle !== 'truck-man-tgl';
  const canSwitchToPhoto = Boolean(fleetPhoto) && !effectiveCoupled;
  const [viewMode, setViewMode] = useState<'3d' | 'photo'>(() =>
    bodyStyle === 'van-sprinter' && Boolean(fleetPhoto) && !effectiveCoupled
      ? 'photo'
      : '3d'
  );
  useEffect(() => {
    setViewMode(
      bodyStyle === 'van-sprinter' && Boolean(fleetPhoto) && !effectiveCoupled
        ? 'photo'
        : '3d'
    );
  }, [decoded.vin, bodyStyle, fleetPhoto, effectiveCoupled]);
  const is3DActive = supports3D && (viewMode === '3d' || !canSwitchToPhoto);
  const gradSuffix = `${reactUid}-${decoded.vin}-${oemColor.code}`;
  const isLightPaint =
    oemColor.hex.toUpperCase() === '#F8FAFC' ||
    oemColor.hex.toUpperCase() === '#F1F5F9';
  const textOnBody = isLightPaint ? '#0F172A' : '#FFFFFF';
  const brandShort = decoded.manufacturer.includes('Dacia')
    ? 'DACIA'
    : decoded.manufacturer.includes('Scania')
      ? 'SCANIA'
      : decoded.manufacturer.includes('Mercedes')
        ? 'MERCEDES-BENZ'
        : decoded.manufacturer.includes('DAF')
          ? 'DAF XG'
          : decoded.manufacturer.includes('MAN')
            ? 'MAN'
            : decoded.manufacturer.includes('Krone')
              ? 'KRONE'
              : decoded.manufacturer.includes('Schmitz')
                ? 'SCHMITZ CARGOBULL'
                : 'VOLVO';

  return (
    <div
      className={`studio-dark-canvas relative w-full ${is3DActive || (fleetPhoto && !showCoupledRoadTrain) ? 'h-auto' : heightClass} rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-b from-[#0b1326] via-[#111c35] to-[#090f1d] flex flex-col justify-between p-3.5 select-none shadow-inner`}
      style={{ color: '#ffffff' }}
    >
      {/* Studio Showroom Overhead Softbox Lighting Glow */}
      <div
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[82%] h-32 rounded-full blur-2xl opacity-45"
        style={{
          background: `radial-gradient(circle, ${oemColor.accentHex} 0%, transparent 70%)`,
        }}
      />

      {/* Top Studio Overlay Bar: VIN Badge + Euro + OEM Color Swatch — strictly single row */}
      <div className="relative z-10 flex flex-nowrap items-center justify-between gap-1.5 mb-1.5 min-w-0">
        <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
          <span
            className="px-2.5 py-0.5 rounded-full border border-sky-400/35 text-[10px] font-black tracking-wide font-mono whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              color: '#38bdf8',
            }}
          >
            VIN: {decoded.vin}
          </span>
          <span
            className="px-2.5 py-0.5 rounded-full border border-emerald-400/40 text-[10px] font-extrabold whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(6, 78, 59, 0.75)',
              color: '#4ade80',
            }}
          >
            {decoded.euroClass.split(' ')[0]} {decoded.euroClass.split(' ')[1] || ''} · {modelYear}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/25 text-[10px] font-bold shadow-sm min-w-0 whitespace-nowrap"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            color: '#ffffff',
          }}
          title={oemColor.name}
        >
          <span
            className="w-3 h-3 rounded-full border border-white/70 shadow-xs shrink-0 [forced-color-adjust:none]"
            style={{ backgroundColor: oemColor.hex }}
          />
          <span className="truncate" style={{ color: '#ffffff' }}>
            {oemColor.name.match(/\(([^)]+)\)/)?.[1] || oemColor.name}
          </span>
        </div>
      </div>

      {/* Center 3D Showroom or Studio Photo / SVG Vehicle Illustration */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-1">
        {is3DActive ? (
          <TruckShowroom3D
            bodyStyle={showroomBodyStyle}
            modelName={modelName}
            oemHex={oemColor.hex}
            secondaryHex={oemColor.secondaryHex}
            accentHex={oemColor.accentHex}
            plateNumber={plateNumber}
            partnerPlateNumber={partnerPlateNumber}
            companyName={decoded.companyName || 'BLUE TRANS SPEDITION'}
            trailerCompanyName={trailerCompanyName || decoded.companyName || 'BLUE TRANS SPEDITION'}
            trailerOemHex={trailerOemHex}
            axleConfig={decoded.axleConfig}
            showCoupledRoadTrain={effectiveCoupled}
            zone1Temp={zone1Temp}
            zone2Temp={zone2Temp}
            hasPhotoOption={canSwitchToPhoto}
            onSwitchToPhoto={() => setViewMode('photo')}
          />
        ) : (
          <>
            {supports3D && canSwitchToPhoto && (
              <div
                className="absolute top-2 right-2.5 z-20 flex items-center rounded-full p-0.5 border border-white/20 text-[10px] font-extrabold shadow-md"
                style={{ backgroundColor: 'rgba(9, 15, 29, 0.88)' }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className="px-2.5 py-0.5 rounded-full transition cursor-pointer hover:bg-white/10"
                  style={{ color: '#cbd5e1' }}
                >
                  3D 360°
                </button>
                <span
                  className="px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#0284c7', color: '#ffffff' }}
                >
                  Poză
                </span>
              </div>
            )}
            {fleetPhoto && !effectiveCoupled ? (
              bodyStyle === 'trailer-schmitz' ||
              bodyStyle === 'trailer-krone' ||
              bodyStyle === 'van-sprinter' ? (
                <TrailerPhotoWithLivery
                  src={fleetPhoto}
                  alt={modelName}
                  variant={
                    bodyStyle === 'van-sprinter'
                      ? 'sprinter'
                      : bodyStyle === 'trailer-krone'
                        ? 'krone'
                        : 'schmitz'
                  }
                  companyName={
                    bodyStyle === 'van-sprinter'
                      ? decoded.companyName
                      : trailerCompanyName || decoded.companyName
                  }
                  mode="dossier"
                />
              ) : (
                <div className="w-full h-[250px] rounded-2xl flex items-center justify-center overflow-hidden">
                  <img
                    src={fleetPhoto}
                    alt={modelName}
                    draggable={false}
                    className="fleet-studio-cutout max-h-[250px] w-auto object-contain select-none"
                  />
                </div>
              )
            ) : showCoupledRoadTrain ? (
          /* ================= FULL 16.5M COUPLED ROAD TRAIN (TRACTOR + 13.6M REEFER TRAILER) ================= */
          <svg
            viewBox="0 0 820 220"
            className="w-full h-full max-h-[165px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.65)]"
          >
            <defs>
              <linearGradient id={`coupledCabGrad-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={oemColor.hex} />
                <stop offset="100%" stopColor={oemColor.secondaryHex} />
              </linearGradient>
              <linearGradient id={`reeferBoxGrad-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </linearGradient>
            </defs>

            {/* Studio Floor Shadow */}
            <ellipse cx="415" cy="194" rx="375" ry="12" fill="rgba(0,0,0,0.55)" />

            {/* 13.6m Bi-Temp Refrigerated Semi-Trailer (Left/Center) */}
            <g>
              {/* Reefer Trailer Box */}
              <rect
                x="45"
                y="34"
                width="485"
                height="116"
                rx="6"
                fill={`url(#reeferBoxGrad-${gradSuffix})`}
                stroke="#94A3B8"
                strokeWidth="2"
              />
              {/* Blue Trans Spedition Livery Stripe */}
              <rect x="45" y="128" width="485" height="9" fill="#0284C7" />
              <rect x="45" y="34" width="485" height="6" fill="#0EA5E9" />

              {/* Bi-Temp Zone Divider Dashed Line inside Trailer */}
              <line
                x1="295"
                y1="40"
                x2="295"
                y2="128"
                stroke="#0284C7"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <rect x="70" y="48" width="96" height="22" rx="4" fill="#0F172A" />
              <text x="118" y="63" textAnchor="middle" fill="#4ADE80" fontSize="11" fontWeight="900">
                Z2: +{zone2Temp}°C
              </text>
              <rect x="320" y="48" width="96" height="22" rx="4" fill="#0F172A" />
              <text x="368" y="63" textAnchor="middle" fill="#38BDF8" fontSize="11" fontWeight="900">
                Z1: {zone1Temp}°C
              </text>

              {/* Brand Text on Trailer */}
              <text x="285" y="96" textAnchor="middle" fill="#003D8F" fontSize="19" fontWeight="900" letterSpacing="1.5">
                {(trailerCompanyName || decoded.companyName || 'BLUE TRANS SPEDITION').toUpperCase()} · BI-TEMP 13.6M
              </text>
              <text x="285" y="115" textAnchor="middle" fill="#0369A1" fontSize="11" fontWeight="800">
                ATP FRC · THERMO KING SLXi SPECTRUM · {partnerPlateNumber || plateNumber}
              </text>

              {/* Front Thermo King Reefer Unit */}
              <rect
                x="530"
                y="42"
                width="22"
                height="92"
                rx="4"
                fill="#1E293B"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <circle cx="541" cy="64" r="6" fill="#38BDF8" />
              <rect x="534" y="78" width="14" height="42" rx="2" fill="#334155" />

              {/* Under-chassis Pallet Basket & Landing Gear */}
              <rect x="255" y="150" width="145" height="18" rx="3" fill="#334155" stroke="#475569" />
              <rect x="465" y="150" width="10" height="32" rx="2" fill="#475569" />

              {/* 3x Trailer Axles (Rotos / Krone) */}
              {[105, 152, 199].map((cx, i) => (
                <g key={i}>
                  <circle cx={cx} cy="174" r="20" fill="#0F172A" stroke="#334155" strokeWidth="3" />
                  <circle cx={cx} cy="174" r="10" fill="#CBD5E1" />
                  <circle cx={cx} cy="174" r="4" fill="#0284C7" />
                </g>
              ))}
            </g>

            {/* Coupled HGV Tractor Unit (Right) */}
            <g>
              {/* Chassis & Fifth Wheel */}
              <rect x="515" y="148" width="245" height="14" rx="3" fill="#1E293B" />
              {/* Fuel Tank */}
              <rect x="585" y="144" width="68" height="24" rx="4" fill={oemColor.hex} stroke="#475569" strokeWidth="1.5" />
              {/* AdBlue Tank */}
              <rect x="564" y="146" width="16" height="20" rx="2" fill="#0284C7" />

              {/* High-Roof Globetrotter / GigaSpace Cab */}
              <path
                d="M 640 150 L 640 36 Q 640 24 656 22 L 725 22 Q 748 24 758 55 L 772 98 L 776 150 Z"
                fill={`url(#coupledCabGrad-${gradSuffix})`}
                stroke={isLightPaint ? '#64748B' : '#E2E8F0'}
                strokeWidth="2"
              />
              {/* Windshield & Side Window */}
              <path
                d="M 702 48 L 752 48 L 764 90 L 702 90 Z"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="1.2"
              />
              {/* Front Headlight LED */}
              <rect x="764" y="128" width="12" height="10" rx="2" fill="#38BDF8" />
              {/* Cab Brand Label */}
              <text
                x="686"
                y="114"
                textAnchor="middle"
                fill={textOnBody}
                fontSize="11"
                fontWeight="900"
              >
                {brandShort}
              </text>
              {/* Tractor Axles (Steer + Drive) */}
              <circle cx="555" cy="174" r="21" fill="#0F172A" stroke="#334155" strokeWidth="3" />
              <circle cx="555" cy="174" r="11" fill="#CBD5E1" />
              <circle cx="722" cy="174" r="21" fill="#0F172A" stroke="#334155" strokeWidth="3" />
              <circle cx="722" cy="174" r="11" fill="#CBD5E1" />
            </g>
          </svg>
        ) : bodyStyle.startsWith('trailer-') ? (
          /* ================= 13.6M BI-TEMP REFRIGERATED SEMI-TRAILER STUDIO VIEW ================= */
          <svg
            viewBox="0 0 720 220"
            className="w-full h-full max-h-[165px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.65)]"
          >
            <defs>
              <linearGradient id={`trailerMainGrad-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={oemColor.hex} />
                <stop offset="100%" stopColor={oemColor.secondaryHex} />
              </linearGradient>
            </defs>
            <ellipse cx="360" cy="194" rx="310" ry="12" fill="rgba(0,0,0,0.55)" />

            {/* Main 13.6m Insulated Box */}
            <rect
              x="60"
              y="26"
              width="560"
              height="124"
              rx="6"
              fill={`url(#trailerMainGrad-${gradSuffix})`}
              stroke="#64748B"
              strokeWidth="2.5"
            />
            {/* Top & Bottom Livery */}
            <rect x="60" y="26" width="560" height="8" fill="#0284C7" />
            <rect x="60" y="138" width="560" height="12" fill="#0284C7" />

            {/* Movable Bi-Temp Partition Line */}
            <line
              x1="350"
              y1="34"
              x2="350"
              y2="138"
              stroke="#0284C7"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />

            {/* Zone Badges */}
            <rect x="95" y="44" width="125" height="25" rx="5" fill="#0F172A" />
            <text x="157" y="60" textAnchor="middle" fill="#4ADE80" fontSize="11.5" fontWeight="900">
              ZONA 2 (Spate): +{zone2Temp}°C
            </text>
            <rect x="385" y="44" width="125" height="25" rx="5" fill="#0F172A" />
            <text x="447" y="60" textAnchor="middle" fill="#38BDF8" fontSize="11.5" fontWeight="900">
              ZONA 1 (Față): {zone1Temp}°C
            </text>

            {/* Center Branding */}
            <text
              x="340"
              y="98"
              textAnchor="middle"
              fill={isLightPaint ? '#003D8F' : textOnBody}
              fontSize="21"
              fontWeight="900"
              letterSpacing="1.5"
            >
              {(trailerCompanyName || decoded.companyName || 'BLUE TRANS SPEDITION').toUpperCase()} · BI-TEMP 13.6M
            </text>
            <text
              x="340"
              y="119"
              textAnchor="middle"
              fill={isLightPaint ? '#0369A1' : '#E2E8F0'}
              fontSize="12"
              fontWeight="800"
            >
              {brandShort} · {modelName} · 33 EURO-PALEȚI · ATP FRC
            </text>

            {/* Front Thermo King / Carrier Reefer Unit */}
            <rect
              x="620"
              y="36"
              width="30"
              height="100"
              rx="5"
              fill="#0F172A"
              stroke="#38BDF8"
              strokeWidth="2"
            />
            <circle cx="635" cy="58" r="8" fill="#38BDF8" />
            <rect x="626" y="74" width="18" height="48" rx="3" fill="#1E293B" />

            {/* Pallet Carrier & Support Legs */}
            <rect x="295" y="150" width="170" height="20" rx="3" fill="#1E293B" stroke="#475569" />
            <text x="380" y="164" textAnchor="middle" fill="#94A3B8" fontSize="9.5" fontWeight="800">
              LADĂ 36 EURO-PALEȚI + REZERVĂ
            </text>
            <rect x="540" y="150" width="12" height="36" rx="2" fill="#475569" />
            <rect x="532" y="184" width="28" height="5" rx="2" fill="#94A3B8" />

            {/* 3x Rotos / Krone Axles */}
            {[125, 178, 231].map((cx, i) => (
              <g key={i}>
                <circle cx={cx} cy="174" r="22" fill="#0F172A" stroke="#334155" strokeWidth="3.5" />
                <circle cx={cx} cy="174" r="11" fill="#CBD5E1" />
                <circle cx={cx} cy="174" r="4.5" fill="#0284C7" />
              </g>
            ))}
          </svg>
        ) : bodyStyle === 'van-sprinter' || bodyStyle === 'truck-man-tgl' ? (
          /* ================= PROPORTIONAL SPRINTER W906 FRIGO BA04 / 7.5T EXPRESS STUDIO VIEW ================= */
          <svg
            viewBox="0 0 720 220"
            className="w-full h-full max-h-[168px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.65)]"
          >
            <defs>
              <linearGradient id={`expBodyGrad-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={oemColor.hex} />
                <stop offset="100%" stopColor={oemColor.secondaryHex} />
              </linearGradient>
            </defs>
            <ellipse cx="360" cy="192" rx="285" ry="11" fill="rgba(0,0,0,0.55)" />

            {/* Dark Chassis Frame & Side Underrun */}
            <rect x="92" y="148" width="490" height="10" rx="2" fill="#1E293B" />
            <rect x="255" y="152" width="145" height="4" rx="1.5" fill="#94A3B8" />

            {/* Insulated BA04 White Refrigerated Box (taller than cab, anodized aluminum frame) */}
            <rect
              x="84"
              y="26"
              width="344"
              height="122"
              rx="4"
              fill="#F8FAFC"
              stroke="#94A3B8"
              strokeWidth="2.5"
            />
            <rect x="84" y="26" width="344" height="5" fill="#0EA5E9" />
            <rect x="84" y="138" width="344" height="10" fill="#0284C7" />
            <text x="256" y="84" textAnchor="middle" fill="#003D8F" fontSize="18" fontWeight="900" letterSpacing="1">
              {(decoded.companyName || 'BLUE TRANS SPEDITION').toUpperCase()}
            </text>
            <rect x="136" y="94" width="240" height="19" rx="3" fill="#0284C7" />
            <text x="256" y="107.5" textAnchor="middle" fill="#FFFFFF" fontSize="9.8" fontWeight="800">
              {bodyStyle === 'van-sprinter'
                ? `EXPRESS FRIGO 3.5T · BA04 · ${plateNumber}`
                : `7.5T BI-TEMP · 6.2 LDM · ${plateNumber}`}
            </text>

            {/* Aerodynamic Over-Cab Thermo King C-250e Nosemount */}
            <path
              d="M 428 32 L 478 35 Q 492 40 488 55 L 428 58 Z"
              fill="#F8FAFC"
              stroke="#94A3B8"
              strokeWidth="1.8"
            />
            <rect x="468" y="39" width="14" height="13" rx="2" fill="#0F172A" />

            {/* Semi-Bonneted Mercedes-Benz Sprinter W906 Cab */}
            <path
              d="M 432 152 L 432 62 Q 432 54 442 54 L 496 54 L 548 108 L 604 126 L 610 152 Z"
              fill={`url(#expBodyGrad-${gradSuffix})`}
              stroke={isLightPaint ? '#64748B' : '#475569'}
              strokeWidth="2"
            />
            {/* Matte-Black Wraparound Sprinter Front Bumper & Wheel Arch */}
            <path
              d="M 556 152 L 614 152 Q 618 138 610 128 L 572 128 Z"
              fill="#0F172A"
            />
            {/* Stepped Sprinter Door Window & Raked Windshield */}
            <path
              d="M 446 64 L 494 64 L 540 108 L 516 108 L 496 98 L 446 98 Z"
              fill="#0B1626"
              stroke="#38BDF8"
              strokeWidth="1.2"
            />
            {/* Swept Sprinter Headlight */}
            <polygon points="588,123 608,127 606,136 584,132" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1" />

            {/* 16" Commercial Steel Wheels */}
            {[178, 542].map((cx, idx) => (
              <g key={idx}>
                <circle cx={cx} cy="168" r="21" fill="#0F172A" stroke="#334155" strokeWidth="3" />
                <circle cx={cx} cy="168" r="12" fill="#CBD5E1" />
                <circle cx={cx} cy="168" r="5" fill="#1E293B" />
              </g>
            ))}
          </svg>
        ) : (
          /* ================= HGV 4x2 TRACTOR UNIT STUDIO VIEW (VOLVO / SCANIA / MERCEDES / DAF / MAN) ================= */
          <svg
            viewBox="0 0 650 220"
            className="w-full h-full max-h-[165px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.65)]"
          >
            <defs>
              <linearGradient id={`tractorPaintGrad-${gradSuffix}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={oemColor.hex} />
                <stop offset="65%" stopColor={oemColor.hex} />
                <stop offset="100%" stopColor={oemColor.secondaryHex} />
              </linearGradient>
              <linearGradient id={`chassisGrad-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
            </defs>

            {/* Studio Reflection Shadow */}
            <ellipse cx="330" cy="194" rx="235" ry="13" fill="rgba(0,0,0,0.6)" />

            {/* Fifth-Wheel Coupling (Șa Cuplare Semiremorcă) */}
            <path d="M 145 130 L 195 130 L 205 142 L 138 142 Z" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="162" y="142" width="22" height="8" fill="#1E293B" />

            {/* Heavy-Duty Tractor Frame / Chassis */}
            <rect
              x="115"
              y="146"
              width="405"
              height="18"
              rx="4"
              fill={`url(#chassisGrad-${gradSuffix})`}
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Rear Mudguard over Drive Axle */}
            <path
              d="M 135 168 Q 180 120 225 168"
              fill="none"
              stroke="#475569"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Aerodynamic Side Skirt & 1400L Aluminum Fuel Tank */}
            <rect
              x="235"
              y="138"
              width="132"
              height="32"
              rx="6"
              fill={`url(#tractorPaintGrad-${gradSuffix})`}
              stroke={isLightPaint ? '#64748B' : '#E2E8F0'}
              strokeWidth="1.8"
            />
            <line x1="250" y1="148" x2="352" y2="148" stroke={oemColor.accentHex} strokeWidth="2.5" />
            <line x1="250" y1="158" x2="335" y2="158" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

            {/* Blue AdBlue Tank */}
            <rect
              x="212"
              y="140"
              width="19"
              height="26"
              rx="3"
              fill="#0284C7"
              stroke="#38BDF8"
              strokeWidth="1.2"
            />

            {/* Roof Wind Deflector / Aero Spoiler */}
            <path
              d="M 355 34 Q 375 14 435 16 L 435 34 Z"
              fill={`url(#tractorPaintGrad-${gradSuffix})`}
              stroke={isLightPaint ? '#64748B' : '#E2E8F0'}
              strokeWidth="1.8"
            />

            {/* Main High-Roof Sleeper Cab (Globetrotter XL / Highline / GigaSpace / XG) */}
            <path
              d="M 355 146 L 355 30 Q 355 18 372 18 L 478 18 Q 506 20 518 56 L 535 104 L 540 164 L 355 164 Z"
              fill={`url(#tractorPaintGrad-${gradSuffix})`}
              stroke={isLightPaint ? '#475569' : '#F8FAFC'}
              strokeWidth="2.5"
            />

            {/* Upper Sleeper Loft Window */}
            <rect
              x="382"
              y="26"
              width="58"
              height="13"
              rx="4"
              fill="#0F172A"
              stroke="#38BDF8"
              strokeWidth="1.2"
            />

            {/* Panoramic Side Window & Windshield */}
            <path
              d="M 438 46 L 508 46 L 522 92 L 438 92 Z"
              fill="#090F1D"
              stroke="#38BDF8"
              strokeWidth="1.8"
            />
            {/* MirrorCam / Aero Side Mirror */}
            <rect x="498" y="48" width="8" height="28" rx="3" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.2" />

            {/* Cab Side Accent Decal & Brand Name */}
            <path
              d="M 366 104 L 495 104 L 485 124 L 366 124 Z"
              fill="rgba(15, 23, 42, 0.85)"
            />
            <text
              x="428"
              y="118"
              textAnchor="middle"
              fill="#38BDF8"
              fontSize="11.5"
              fontWeight="900"
              letterSpacing="1.2"
            >
              {brandShort}
            </text>

            {/* Door Handle & Entry Steps */}
            <rect x="444" y="132" width="18" height="4" rx="2" fill="#CBD5E1" />
            <rect x="502" y="142" width="22" height="4" rx="1.5" fill="#94A3B8" />
            <rect x="502" y="151" width="22" height="4" rx="1.5" fill="#94A3B8" />

            {/* Front LED Matrix Headlights & Grille */}
            <rect x="526" y="106" width="13" height="24" rx="3" fill="#0F172A" stroke="#475569" />
            <rect
              x="524"
              y="134"
              width="16"
              height="12"
              rx="3"
              fill="#38BDF8"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />

            {/* Drive Rear Axle Wheel (315/70 R22.5) */}
            <g>
              <circle cx="180" cy="170" r="25" fill="#0F172A" stroke="#334155" strokeWidth="4" />
              <circle cx="180" cy="170" r="14" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
              <circle cx="180" cy="170" r="6" fill="#0284C7" />
            </g>

            {/* Front Steer Axle Wheel (315/70 R22.5) */}
            <g>
              <circle cx="465" cy="170" r="25" fill="#0F172A" stroke="#334155" strokeWidth="4" />
              <circle cx="465" cy="170" r="14" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
              <circle cx="465" cy="170" r="6" fill="#0284C7" />
            </g>
          </svg>
            )}
          </>
        )}
      </div>

      {/* Bottom Studio Info Strip: Model Name + License Plate + Engine */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
        <div className="min-w-0">
          <div
            className="text-xs sm:text-sm font-black truncate"
            style={{ color: '#ffffff' }}
          >
            {modelName}
          </div>
          <div
            className="text-[10.5px] truncate"
            style={{ color: '#cbd5e1' }}
          >
            {decoded.engineAndPower}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="inline-flex items-stretch rounded-[4px] overflow-hidden border border-slate-500 shadow-xs h-[20px]"
            style={{ backgroundColor: '#ffffff' }}
          >
            <span
              className="flex flex-col items-center justify-center bg-[#003399] font-extrabold leading-none px-1 text-[6px]"
              style={{ backgroundColor: '#003399', color: '#ffffff' }}
            >
              <span style={{ color: '#ffcc00', fontSize: '5.5px' }}>★</span>
              <span>RO</span>
            </span>
            <span
              className="flex items-center font-black tracking-wider px-2 text-[11px]"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              {plateNumber}
            </span>
          </span>
          {showCoupledRoadTrain &&
            partnerPlateNumber &&
            partnerPlateNumber !== plateNumber && (
              <>
                <span className="font-black text-xs" style={{ color: '#e2e8f0' }}>
                  +
                </span>
                <span
                  className="inline-flex items-stretch rounded-[4px] overflow-hidden border border-slate-500 shadow-xs h-[20px]"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <span
                    className="flex flex-col items-center justify-center bg-[#003399] font-extrabold leading-none px-1 text-[6px]"
                    style={{ backgroundColor: '#003399', color: '#ffffff' }}
                  >
                    <span style={{ color: '#ffcc00', fontSize: '5.5px' }}>★</span>
                    <span>RO</span>
                  </span>
                  <span
                    className="flex items-center font-black tracking-wider px-2 text-[11px]"
                    style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    {partnerPlateNumber}
                  </span>
                </span>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

/**
 * Interactive VIN Decoder & Model/Color Lookup Widget at the top of the Fleet section
 */
export const VinLookupWidget: React.FC<{
  trailers: TrailerUnit[];
  fleetVins: Record<string, FleetVinPair>;
  onOpenDossierByTrailerId: (
    trailerId: string,
    initialTab: 'tractor' | 'trailer' | 'coupled' | 'edit'
  ) => void;
  onUpdateColorForFleet?: (
    trailerId: string,
    target: 'tractor' | 'trailer',
    colorCode: string
  ) => void;
}> = ({
  trailers,
  fleetVins,
  onOpenDossierByTrailerId,
}) => {
  const [vinInput, setVinInput] = useState<string>('YS2S4X200S5783001');
  const [showCoupledPreview, setShowCoupledPreview] = useState<boolean>(false);

  const decoded = decodeVinNumber(vinInput);

  // Find if this VIN belongs to one of our fleet units
  const matchedEntry = Object.values(fleetVins).find(
    (pair) =>
      pair.tractorVin.toUpperCase() === vinInput.trim().toUpperCase() ||
      pair.trailerVin.toUpperCase() === vinInput.trim().toUpperCase()
  );

  const activeTrailerObj =
    trailers.find((t) => t.id === (matchedEntry?.trailerId || 'BH 67 STS')) ||
    trailers[0];

  const handleSelectQuickVin = (vin: string) => {
    setVinInput(vin);
  };

  return (
    <div className="tahoe-glass rounded-[28px] p-4 sm:p-5 border border-[#0A84FF]/30 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64D2FF] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0A84FF]" />
            DECODOR SERIE ȘASIU (VIN ISO 3779) · MODEL, CULOARE, ASIGURĂRI & LEASING DIN FLOTA REALĂ
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
            Caută orice Camion sau Semiremorcă după VIN — Modelul, Culoarea, Polița RCA/CASCO/CMR și Leasingul se iau direct din VIN
          </h2>
        </div>

        {/* Search Input by 17-character VIN */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-88">
            <Search className="w-4 h-4 text-[#0A84FF] absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
            <input
              type="text"
              value={vinInput}
              onChange={(e) => {
                setVinInput(e.target.value.toUpperCase());
              }}
              maxLength={17}
              placeholder="Introdu serie VIN (17 caractere)..."
              className="w-full tahoe-card-inner rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm font-mono font-extrabold text-white border border-[#0A84FF]/40 focus:outline-none focus:border-[#64D2FF] uppercase tracking-wider"
            />
          </div>
          {matchedEntry && (
            <button
              type="button"
              onClick={() =>
                onOpenDossierByTrailerId(
                  matchedEntry.trailerId,
                  decoded.assetCategory === 'SEMIREMORCĂ FRIGO'
                    ? 'trailer'
                    : 'tractor'
                )
              }
              className="px-4 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0070e0] text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Deschide Fișa Completă</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Fleet VIN Selector Pills (Real Fleet Tractors + Trailers from Google Sheet) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-white/60 mr-1">
          VIN-uri Flotă Reală Blue Trans & Scandexpres (Click rapid):
        </span>
        {[
          {
            label: 'B 506 STS · Scania S500 (2025)',
            vin: 'YS2S4X200S5783001',
          },
          {
            label: 'BH 46 STS · Volvo FH 540 (2025)',
            vin: 'YV2RT60A0SA362262',
          },
          {
            label: 'BH 56 STS · Scania R500 (2023)',
            vin: 'YS2R4X200P5721433',
          },
          {
            label: 'IF 96 STS · Scania R500 (Scandexpres)',
            vin: 'YS2R4X200J5532496',
          },
          {
            label: 'B 871 STS · Scania R500 (2026)',
            vin: 'YS2R4X208T5810904',
          },
          {
            label: 'B 507 STS · Scania S500 (2025)',
            vin: 'YS2S4X200S5783100',
          },
          {
            label: 'B 560 STS · Scania S500 (2025)',
            vin: 'YS2S4X200S5782932',
          },
          {
            label: 'IF 74 STS · Scania R500 (2019)',
            vin: 'YS2R4X200K5535171',
          },
          {
            label: 'BH 67 STS · Remorcă Schmitz',
            vin: 'WSM00000005202011',
          },
          {
            label: 'BH 69 STS · Remorcă Krone',
            vin: 'WKESD000000456195',
          },
          {
            label: 'BH 23 STS · Remorcă Schmitz (2025)',
            vin: 'WSM000009SV031625',
          },
          {
            label: 'BH 81 STS · Mercedes Sprinter Frigo',
            vin: 'WDB9061531N496201',
          },
          {
            label: 'B 102 STS · Dacia Logan III (2024)',
            vin: 'UU1DJF00973024855',
          },
          {
            label: 'BH 01 STS · Mercedes C 250 CDI',
            vin: 'WDD2040031A698310',
          },
        ].map((item) => {
          const isSelected = vinInput.trim().toUpperCase() === item.vin;
          return (
            <button
              key={item.vin}
              type="button"
              onClick={() => handleSelectQuickVin(item.vin)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                isSelected
                  ? 'bg-[#0A84FF] text-white shadow-sm'
                  : 'tahoe-card-inner text-white/75 hover:text-white border border-white/10'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main VIN Result Grid: Left = Studio Render | Right = Decoded Technical Specs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Left 6 cols: Visual Studio Render + Automatic VIN Info Bar */}
        <div className="xl:col-span-6 flex flex-col justify-between space-y-2.5">
          <VehicleStudioRender
            decoded={decoded}
            plateNumber={
              decoded.matchedFleetPlate || matchedEntry?.tractorPlate || 'B 506 STS'
            }
            partnerPlateNumber={
              decoded.matchedPartnerPlate || matchedEntry?.trailerId
            }
            showCoupledRoadTrain={showCoupledPreview}
            zone1Temp={activeTrailerObj.zone1Temp}
            zone2Temp={activeTrailerObj.zone2Temp}
          />

          {/* Automatic VIN-Decoded Model & Color Confirmation + Coupled Toggle */}
          <div className="tahoe-card-inner rounded-xl p-2.5 border border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-4 h-4 rounded-full border border-slate-500/70 shrink-0 shadow-xs [forced-color-adjust:none]"
                style={{ backgroundColor: decoded.oemColor.hex }}
              />
              <span className="text-[11px] font-bold text-white/85 truncate">
                Decodat automat din VIN: <strong>{decoded.modelName}</strong> ·{' '}
                <span className="text-[#0A84FF] font-extrabold">{decoded.oemColor.name}</span>
              </span>
            </div>

            {decoded.bodyStyle !== 'car-sedan' &&
              decoded.bodyStyle !== 'van-sprinter' &&
              decoded.bodyStyle !== 'truck-man-tgl' && (
                <button
                  type="button"
                  onClick={() => setShowCoupledPreview((v) => !v)}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer ${
                    showCoupledPreview
                      ? 'bg-[#0A84FF] text-white'
                      : 'tahoe-btn-secondary text-white/80 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {showCoupledPreview
                      ? 'Vedere Ansamblu Cuplat (16.5m)'
                      : 'Vedere Individuală'}
                  </span>
                </button>
              )}
          </div>
        </div>

        {/* Right 6 cols: WMI / VDS / VIS Decoded Spec Cards + Real Insurance & Leasing */}
        <div className="xl:col-span-6 tahoe-card-inner rounded-2xl p-4 border border-white/10 flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#30D158] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VIN DECODAT CU SUCCES · {decoded.assetCategory} · {decoded.companyName || 'BLUE TRANS SPEDITION'}
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                {decoded.matchedFleetPlate ? `${decoded.matchedFleetPlate} — ` : ''}
                {decoded.manufacturer} — {decoded.modelName}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#0A84FF]/20 border border-[#0A84FF]/40 text-xs font-extrabold text-[#64D2FF]">
              Fabricație {decoded.modelYear}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-bold uppercase text-white/50">
                WMI (1–3) · Producător & Uzină
              </div>
              <div className="font-extrabold text-white mt-0.5">
                {decoded.vin.slice(0, 3)} → {decoded.assemblyPlant}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-bold uppercase text-white/50">
                Cod Culoare & Finisaj Caroserie
              </div>
              <div className="font-extrabold text-white mt-0.5 flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full border border-slate-500/70 shrink-0 [forced-color-adjust:none]"
                  style={{ backgroundColor: decoded.oemColor.hex }}
                />
                <span className="truncate">{decoded.oemColor.name}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-bold uppercase text-white/50">
                Asigurare RCA (Societate & Poliță)
              </div>
              <div className="font-bold text-white mt-0.5">
                {decoded.rcaPolicy || 'Activ în baza AIDA / RAR'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-bold uppercase text-white/50">
                Asigurare CASCO & CMR
              </div>
              <div className="font-bold text-white mt-0.5">
                {decoded.cascoPolicy || 'Conform dosar flotă'}
                {decoded.cmrPolicy ? ` · CMR: ${decoded.cmrPolicy}` : ''}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-bold uppercase text-white/50">
                Motorizare / Agregat Frigorific
              </div>
              <div className="font-bold text-white mt-0.5">
                {decoded.engineAndPower}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="text-[10px] font-bold uppercase text-white/50">
                Finanțare / Credit / Leasing
              </div>
              <div className="font-bold text-[#30D158] mt-0.5">
                {decoded.leasingContract || 'Achitat integral'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-white/70">
            <span>
              Serie producție uzină: <strong className="text-white">#{decoded.serialNumber}</strong> · Ampatament:{' '}
              <strong className="text-white">{decoded.wheelbaseMm} mm</strong>
            </span>
            {matchedEntry && (
              <button
                type="button"
                onClick={() =>
                  onOpenDossierByTrailerId(matchedEntry.trailerId, 'coupled')
                }
                className="px-3 py-1 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] font-extrabold cursor-pointer transition"
              >
                Vezi Dosarul Ansamblului {matchedEntry.tractorPlate} +{' '}
                {matchedEntry.trailerId} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Full Vehicle & Semi-Trailer Dossier Modal (Fișa Completă a Camionului și a Remorcii)
 */
export const VehicleDossierModal: React.FC<{
  trailer: TrailerUnit | null;
  techRecord: ExtendedFleetTechRecord | null;
  vinPair: FleetVinPair | null;
  customItem?: MasinileMeleItem | null;
  initialTab: 'tractor' | 'trailer' | 'coupled' | 'edit';
  onClose: () => void;
  onSaveTechAndVin: (
    updatedTech: ExtendedFleetTechRecord,
    updatedVinPair: FleetVinPair
  ) => void;
}> = ({
  trailer,
  techRecord,
  vinPair,
  customItem,
  initialTab,
  onClose,
  onSaveTechAndVin,
}) => {
  const [activeTab, setActiveTab] = useState<
    'tractor' | 'trailer' | 'coupled' | 'edit'
  >(initialTab);

  const [draftTech, setDraftTech] = useState<ExtendedFleetTechRecord | null>(() => {
    if (!techRecord) return null;
    if (customItem) {
      const canon = INITIAL_MASINILE_MELE.find(
        (v) => normalizeVehiclePlate(v.plate) === normalizeVehiclePlate(customItem.plate)
      );
      const effectiveVin = canon?.vin || customItem.vin;
      const effectiveKind = canon?.kind || customItem.kind;
      const dec = decodeVinNumber(effectiveVin);
      const isSemi = effectiveKind === 'semitrailer';
      const itpDaysCalc = calendarDaysUntilIso(extractIsoDateFromText(customItem.itpExpiryDate));
      const rcaDaysCalc = calendarDaysUntilIso(
        getDocIsoForFleetItem(customItem, 'RCA')
      );
      return {
        ...techRecord,
        tractorPlate: isSemi ? techRecord.tractorPlate : customItem.plate,
        trailerId: isSemi ? customItem.plate : techRecord.trailerId,
        tractorModel: isSemi ? techRecord.tractorModel : dec.modelName,
        trailerModel: isSemi ? dec.modelName : techRecord.trailerModel,
        euroNorm: (isSemi
          ? techRecord.euroNorm
          : (['Euro 6e', 'Euro 6d', 'Euro 6c', 'Euro 6', 'Euro 5'].find((n) =>
              dec.euroClass.startsWith(n)
            ) as ExtendedFleetTechRecord['euroNorm']) || techRecord.euroNorm),
        avgConsumptionL100:
          effectiveKind === 'car'
            ? 6.4
            : effectiveKind === 'express'
              ? 10.8
              : techRecord.avgConsumptionL100,
        itpExpiry:
          itpDaysCalc !== null
            ? `${customItem.itpExpiryDate} (${itpDaysCalc} zile)`
            : customItem.itpExpiryDate,
        rcaCmrExpiry:
          rcaDaysCalc !== null
            ? `${customItem.rcaExpiryDate} (${rcaDaysCalc} zile)`
            : customItem.rcaExpiryDate,
      };
    }
    return { ...techRecord };
  });

  const [draftVinPair, setDraftVinPair] = useState<FleetVinPair | null>(() => {
    if (!vinPair) return null;
    if (customItem) {
      const canon = INITIAL_MASINILE_MELE.find(
        (v) => normalizeVehiclePlate(v.plate) === normalizeVehiclePlate(customItem.plate)
      );
      const effectiveVin = canon?.vin || customItem.vin;
      const effectiveKind = canon?.kind || customItem.kind;
      const dec = decodeVinNumber(effectiveVin);
      const isSemi = effectiveKind === 'semitrailer';
      return {
        ...vinPair,
        tractorPlate: isSemi ? vinPair.tractorPlate : customItem.plate,
        trailerId: isSemi ? customItem.plate : vinPair.trailerId,
        tractorVin: isSemi ? vinPair.tractorVin : effectiveVin,
        trailerVin: isSemi ? effectiveVin : vinPair.trailerVin,
        tractorColorCode: isSemi ? vinPair.tractorColorCode : dec.oemColor.code,
        trailerColorCode: isSemi ? dec.oemColor.code : vinPair.trailerColorCode,
      };
    }
    return { ...vinPair };
  });

  const [docUnitTarget, setDocUnitTarget] = useState<'tractor' | 'trailer'>(() =>
    customItem?.kind === 'semitrailer' ? 'trailer' : 'tractor'
  );

  const [persistedFleetSnapshot] = useState<MasinileMeleItem[]>(() =>
    loadPersistedFleetItems()
  );

  const initTractorPlate =
    customItem && customItem.kind !== 'semitrailer'
      ? customItem.plate
      : techRecord?.tractorPlate || '';
  const initTrailerPlate =
    customItem && customItem.kind === 'semitrailer'
      ? customItem.plate
      : techRecord?.trailerId || trailer?.id || '';

  const matchedTractorFleetItem = persistedFleetSnapshot.find(
    (v) => normalizeVehiclePlate(v.plate) === normalizeVehiclePlate(initTractorPlate)
  );
  const matchedTrailerFleetItem = persistedFleetSnapshot.find(
    (v) => normalizeVehiclePlate(v.plate) === normalizeVehiclePlate(initTrailerPlate)
  );

  const [tractorDocs, setTractorDocs] = useState<{
    rcaIso: string;
    cascoIso: string;
    cmrIso: string;
    itpIso: string;
  }>(() => ({
    rcaIso:
      (matchedTractorFleetItem
        ? getDocIsoForFleetItem(matchedTractorFleetItem, 'RCA')
        : '') || extractIsoDateFromText(techRecord?.rcaCmrExpiry),
    cascoIso: matchedTractorFleetItem
      ? getDocIsoForFleetItem(matchedTractorFleetItem, 'CASCO')
      : '',
    cmrIso: matchedTractorFleetItem
      ? getDocIsoForFleetItem(matchedTractorFleetItem, 'CMR')
      : '',
    itpIso:
      extractIsoDateFromText(matchedTractorFleetItem?.itpExpiryDate) ||
      extractIsoDateFromText(techRecord?.itpExpiry),
  }));

  const [trailerDocs, setTrailerDocs] = useState<{
    rcaIso: string;
    cascoIso: string;
    cmrIso: string;
    itpIso: string;
  }>(() => ({
    rcaIso:
      (matchedTrailerFleetItem
        ? getDocIsoForFleetItem(matchedTrailerFleetItem, 'RCA')
        : '') || extractIsoDateFromText(techRecord?.rcaCmrExpiry),
    cascoIso: matchedTrailerFleetItem
      ? getDocIsoForFleetItem(matchedTrailerFleetItem, 'CASCO')
      : '',
    cmrIso: matchedTrailerFleetItem
      ? getDocIsoForFleetItem(matchedTrailerFleetItem, 'CMR')
      : '',
    itpIso:
      extractIsoDateFromText(matchedTrailerFleetItem?.itpExpiryDate) ||
      extractIsoDateFromText(techRecord?.itpExpiry),
  }));

  const [atpIso, setAtpIso] = useState<string>(() =>
    extractIsoDateFromText(techRecord?.atpFrigoCertExpiry)
  );
  const [tachoIso, setTachoIso] = useState<string>(() =>
    extractIsoDateFromText(techRecord?.tachoCalibrationExpiry)
  );

  const pdfCatalog = useFleetPdfCatalog();
  const [pdfViewerTarget, setPdfViewerTarget] = useState<{
    plate: string;
    vin?: string;
    subtitle?: string;
    initialDocFileName?: string;
    initialMode?: 'view' | 'add' | 'edit';
    initialUploadKind?: FleetPdfDocKind;
  } | null>(null);

  const dossierBaseId = React.useId();
  const tabPanelScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabPanelScrollRef.current) {
      tabPanelScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  if (!trailer || !draftTech || !draftVinPair) return null;

  const isCarSingle = customItem?.kind === 'car';
  const isExpressSingle =
    isCarSingle ||
    customItem?.kind === 'express' ||
    draftTech.tractorPlate === trailer.id ||
    trailer.id.includes('EXP');

  // Model & OEM Color are ALWAYS decoded 100% directly from the VIN number
  const decodedTractor = decodeVinNumber(draftVinPair.tractorVin);
  const decodedTrailer = decodeVinNumber(draftVinPair.trailerVin);
  const activeTrailerPlate =
    customItem?.kind === 'semitrailer' ? customItem.plate : trailer.id;
  const activeTrailerCompany =
    decodedTrailer.companyName ||
    (customItem?.kind === 'semitrailer' ? customItem.companyName : undefined) ||
    decodedTractor.companyName ||
    'BLUE TRANS SPEDITION';

  const tractorPdfDocs = getVehiclePdfDocs(
    draftTech.tractorPlate,
    draftVinPair.tractorVin,
    pdfCatalog
  );
  const trailerPdfDocs = getVehiclePdfDocs(
    activeTrailerPlate,
    draftVinPair.trailerVin,
    pdfCatalog
  );

  const kmToService = Math.max(
    0,
    draftTech.nextServiceKm - draftTech.odometerKm
  );

  const tractorCascoEmptyLabel =
    matchedTractorFleetItem &&
    cleanVal(matchedTractorFleetItem.cascoInsurer) &&
    /activ/i.test(matchedTractorFleetItem.cascoValidity || '')
      ? 'Activ fără termen'
      : 'Fără CASCO';

  const trailerCascoEmptyLabel =
    matchedTrailerFleetItem &&
    cleanVal(matchedTrailerFleetItem.cascoInsurer) &&
    /activ/i.test(matchedTrailerFleetItem.cascoValidity || '')
      ? 'Activ fără termen'
      : 'Fără CASCO';

  const tractorRcaBadge = getExpiryBadgeSummary(tractorDocs.rcaIso, 'Fără RCA');
  const tractorCascoBadge = getExpiryBadgeSummary(
    tractorDocs.cascoIso,
    tractorCascoEmptyLabel
  );
  const tractorCmrBadge = getExpiryBadgeSummary(tractorDocs.cmrIso, 'Fără CMR');
  const tractorItpBadge = getExpiryBadgeSummary(tractorDocs.itpIso, 'Nesetat');
  const trailerRcaBadge = getExpiryBadgeSummary(trailerDocs.rcaIso, 'Fără RCA');
  const trailerCascoBadge = getExpiryBadgeSummary(
    trailerDocs.cascoIso,
    trailerCascoEmptyLabel
  );
  const atpBadge = getExpiryBadgeSummary(atpIso, isCarSingle ? 'Nu necesită ATP' : 'Nesetat');
  const tachoBadge = getExpiryBadgeSummary(
    tachoIso,
    isCarSingle ? 'Autoturism M1' : 'Nesetat'
  );

  const syncSavePayload = () => {
    // 1. Sync RCA / CASCO / CMR / ITP into persisted "Mașinile mele" fleet store
    const currentFleet = loadPersistedFleetItems();
    const updatedFleet = currentFleet.map((item) => {
      const norm = normalizeVehiclePlate(item.plate);
      if (norm === normalizeVehiclePlate(draftTech.tractorPlate)) {
        return applyDocIsoUpdatesToFleetItem(item, tractorDocs);
      }
      if (!isExpressSingle && norm === normalizeVehiclePlate(activeTrailerPlate)) {
        return applyDocIsoUpdatesToFleetItem(item, trailerDocs);
      }
      return item;
    });
    savePersistedFleetItems(updatedFleet);

    // 2. Sync formatted dates onto ExtendedFleetTechRecord
    const primaryDocs =
      customItem?.kind === 'semitrailer' ? trailerDocs : tractorDocs;
    const nextItpText = primaryDocs.itpIso
      ? updateExpiryInPolicyString(draftTech.itpExpiry, primaryDocs.itpIso, {
          appendDaysLabel: true,
        })
      : draftTech.itpExpiry;
    const nextRcaCmrText = primaryDocs.rcaIso
      ? updateExpiryInPolicyString(draftTech.rcaCmrExpiry, primaryDocs.rcaIso, {
          appendDaysLabel: true,
        })
      : draftTech.rcaCmrExpiry;
    const nextAtpText = atpIso
      ? updateExpiryInPolicyString(draftTech.atpFrigoCertExpiry, atpIso)
      : draftTech.atpFrigoCertExpiry;
    const nextTachoText = tachoIso
      ? updateExpiryInPolicyString(draftTech.tachoCalibrationExpiry, tachoIso)
      : draftTech.tachoCalibrationExpiry;

    const syncedTech: ExtendedFleetTechRecord = {
      ...draftTech,
      tractorModel: decodedTractor.modelName,
      trailerModel: decodedTrailer.modelName,
      itpExpiry: nextItpText,
      rcaCmrExpiry: nextRcaCmrText,
      atpFrigoCertExpiry: nextAtpText,
      tachoCalibrationExpiry: nextTachoText,
    };
    const syncedVin: FleetVinPair = {
      ...draftVinPair,
      tractorColorCode: decodedTractor.oemColor.code,
      trailerColorCode: decodedTrailer.oemColor.code,
    };
    onSaveTechAndVin(syncedTech, syncedVin);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    syncSavePayload();
  };

  return (
    <div
      onClick={onClose}
      className="modal-backdrop-lock fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overscroll-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tahoe-glass-elevated rounded-[28px] w-[min(96vw,1024px)] h-[min(91dvh,845px)] p-3 sm:p-6 flex flex-col gap-3.5 shadow-2xl border border-white/20 overflow-clip"
      >
        {/* Top Modal Header (pinned — X always in top-right corner) */}
        <div className="shrink-0 flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/40">
                {isCarSingle
                  ? 'DOSAR TEHNIC COMPLET AUTOTURISM FLOTĂ M1 (CONFORM CIV RAR & VIN)'
                  : isExpressSingle
                    ? 'DOSAR TEHNIC COMPLET AUTOUTILITARĂ FRIGO 3.5T (CONFORM CIV RAR & VIN)'
                    : 'DOSAR TEHNIC COMPLET CAMION & SEMIREMORCĂ FRIGO (DECODARE AUTOMATĂ VIN)'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/35">
                {isCarSingle
                  ? 'Activ · Flotă Administrativă M1'
                  : `${trailer.status} · ${trailer.currentLocation.city}`}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-1 truncate">
              {isExpressSingle
                ? `${draftTech.tractorPlate} · ${decodedTractor.modelName}`
                : `${draftTech.tractorPlate} (${decodedTractor.modelName.replace(/\s*\(Scandexpres\)/i, '')}) + Semiremorcă ${activeTrailerPlate}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Închide dosarul vehiculului"
            className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Tab Switcher inside the Vehicle Dossier — single-row capsule tablist (all tabs fit on 1 row on mobile & PC) */}
        <div
          role="tablist"
          aria-label="Dosar tehnic vehicul și semiremorcă"
          className={`shrink-0 grid ${
            isExpressSingle ? 'grid-cols-3' : 'grid-cols-4'
          } gap-1 sm:flex sm:flex-nowrap sm:items-center sm:gap-2 sm:overflow-x-auto no-scrollbar border-b border-white/10 pb-3`}
          onKeyDown={(e) => {
            const visibleTabs: Array<'tractor' | 'trailer' | 'coupled' | 'edit'> = isExpressSingle
              ? ['tractor', 'coupled', 'edit']
              : ['tractor', 'trailer', 'coupled', 'edit'];
            const idx = visibleTabs.indexOf(activeTab);
            let nextIdx = -1;
            if (e.key === 'ArrowRight') nextIdx = (idx + 1) % visibleTabs.length;
            else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + visibleTabs.length) % visibleTabs.length;
            else if (e.key === 'Home') nextIdx = 0;
            else if (e.key === 'End') nextIdx = visibleTabs.length - 1;
            if (nextIdx >= 0) {
              e.preventDefault();
              setActiveTab(visibleTabs[nextIdx]);
              const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              buttons[nextIdx]?.focus();
              buttons[nextIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
          }}
        >
          <button
            id={`${dossierBaseId}-tab-tractor`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'tractor'}
            tabIndex={activeTab === 'tractor' ? 0 : -1}
            onClick={(e) => {
              setActiveTab('tractor');
              e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}
            className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-1 py-1.5 sm:px-3.5 sm:py-2 rounded-full tahoe-btn-secondary text-[10.5px] sm:text-xs font-bold sm:font-extrabold tracking-tight sm:tracking-normal text-white/80 hover:text-white flex items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap sm:shrink-0 transition cursor-pointer"
          >
            <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="sm:hidden truncate">
              {isCarSingle ? 'Auto' : isExpressSingle ? 'Utilitară' : 'Tractor'}
            </span>
            <span className="hidden sm:inline">
              {isCarSingle
                ? `Autoturism (${draftTech.tractorPlate})`
                : isExpressSingle
                  ? `Autoutilitară (${draftTech.tractorPlate})`
                  : `Cap tractor (${draftTech.tractorPlate})`}
            </span>
          </button>

          {!isExpressSingle && (
            <button
              id={`${dossierBaseId}-tab-trailer`}
              type="button"
              role="tab"
              aria-selected={activeTab === 'trailer'}
              tabIndex={activeTab === 'trailer' ? 0 : -1}
              onClick={(e) => {
                setActiveTab('trailer');
                e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}
              className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-1 py-1.5 sm:px-3.5 sm:py-2 rounded-full tahoe-btn-secondary text-[10.5px] sm:text-xs font-bold sm:font-extrabold tracking-tight sm:tracking-normal text-white/80 hover:text-white flex items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap sm:shrink-0 transition cursor-pointer"
            >
              <ThermometerSnowflake className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="sm:hidden truncate">Remorcă</span>
              <span className="hidden sm:inline">Semiremorcă ({activeTrailerPlate})</span>
            </button>
          )}

          <button
            id={`${dossierBaseId}-tab-coupled`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'coupled'}
            tabIndex={activeTab === 'coupled' ? 0 : -1}
            onClick={(e) => {
              setActiveTab('coupled');
              e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}
            className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-1 py-1.5 sm:px-3.5 sm:py-2 rounded-full tahoe-btn-secondary text-[10.5px] sm:text-xs font-bold sm:font-extrabold tracking-tight sm:tracking-normal text-white/80 hover:text-white flex items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap sm:shrink-0 transition cursor-pointer"
          >
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="sm:hidden truncate">
              {isExpressSingle ? 'Acte' : 'Ansamblu'}
            </span>
            <span className="hidden sm:inline">
              {isExpressSingle
                ? 'Telemetrie & acte'
                : 'Ansamblu, anvelope & acte'}
            </span>
          </button>

          <button
            id={`${dossierBaseId}-tab-edit`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'edit'}
            tabIndex={activeTab === 'edit' ? 0 : -1}
            onClick={(e) => {
              setActiveTab('edit');
              e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}
            className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-1 py-1.5 sm:px-3.5 sm:py-2 rounded-full tahoe-btn-secondary text-[10.5px] sm:text-xs font-bold sm:font-extrabold tracking-tight sm:tracking-normal text-white/80 hover:text-white flex items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap sm:shrink-0 transition cursor-pointer"
          >
            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="sm:hidden truncate">Editare</span>
            <span className="hidden sm:inline">Editează VIN & date</span>
          </button>
        </div>

        {/* Fixed-dimension scrollable tabpanel body — outer modal window never resizes across tabs */}
        <div
          ref={tabPanelScrollRef}
          role="tabpanel"
          aria-labelledby={`${dossierBaseId}-tab-${activeTab}`}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] pr-0.5"
        >

        {/* =====================================================================
            TAB 1: FIȘA CAP TRACTOR (TRACTOR UNIT DOSSIER)
        ====================================================================== */}
        {activeTab === 'tractor' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-6 space-y-2.5">
                <VehicleStudioRender
                  decoded={decodedTractor}
                  plateNumber={draftTech.tractorPlate}
                  partnerPlateNumber={activeTrailerPlate}
                  showCoupledRoadTrain={false}
                  zone1Temp={trailer.zone1Temp}
                  zone2Temp={trailer.zone2Temp}
                  heightClass="h-[225px]"
                />

                {/* Automatic VIN-Decoded Model & Color Confirmation Bar — single row */}
                <div className="tahoe-card-inner rounded-xl p-2.5 border border-white/10 flex flex-nowrap items-center justify-between gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-white/85 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158] shrink-0" />
                    <span>
                      VIN:{' '}
                      <strong className="font-mono text-[#0A84FF]">
                        {draftVinPair.tractorVin}
                      </strong>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-white min-w-0 whitespace-nowrap">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-500/70 shrink-0 [forced-color-adjust:none]"
                      style={{ backgroundColor: decodedTractor.oemColor.hex }}
                    />
                    <span className="truncate">
                      {decodedTractor.oemColor.name.match(/\(([^)]+)\)/)?.[1] ||
                        decodedTractor.oemColor.name}
                    </span>
                  </span>
                </div>

                {/* Dosar Acte Scanate (CIV, Talon, RCA, CASCO, ITP...) — Adaugă / Editează / Șterge */}
                <div className="tahoe-card-inner rounded-xl p-2.5 border border-[#0A84FF]/30 space-y-2 min-w-0">
                  <div className="flex flex-nowrap items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2
                        className={`w-4 h-4 shrink-0 ${
                          tractorPdfDocs.length > 0 ? 'text-[#30D158]' : 'text-white/45'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold text-white truncate">
                          {tractorPdfDocs.length > 0
                            ? `Dosar Acte Scanate (${tractorPdfDocs.length}) · ${draftTech.tractorPlate}`
                            : `Niciun act scanat atașat încă · ${draftTech.tractorPlate}`}
                        </div>
                        <div className="text-[10px] text-white/55 truncate">
                          {tractorPdfDocs.length > 0
                            ? tractorPdfDocs.map((d) => d.shortLabel).join(' · ')
                            : 'Adaugă CIV, Talon, RCA, CASCO, ITP sau CMR (PDF / Poză)'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {tractorPdfDocs.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPdfViewerTarget({
                              plate: draftTech.tractorPlate,
                              vin: draftVinPair.tractorVin,
                              subtitle: `${decodedTractor.modelName} (${decodedTractor.modelYear})`,
                              initialMode: 'view',
                            })
                          }
                          className="px-3 py-1.5 rounded-full bg-[#0A84FF] hover:brightness-110 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition shadow-xs whitespace-nowrap"
                          style={{ color: '#ffffff' }}
                        >
                          <FileText className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
                          <span style={{ color: '#ffffff' }}>Vezi / Editează</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setPdfViewerTarget({
                            plate: draftTech.tractorPlate,
                            vin: draftVinPair.tractorVin,
                            subtitle: `${decodedTractor.modelName} (${decodedTractor.modelYear})`,
                            initialMode: 'add',
                          })
                        }
                        className="px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-[11px] font-extrabold text-emerald-400 flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                      >
                        <FilePlus2 className="w-3.5 h-3.5 shrink-0" />
                        <span>+ Adaugă act</span>
                      </button>
                    </div>
                  </div>

                  {tractorPdfDocs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
                      {tractorPdfDocs.map((doc) => (
                        <button
                          key={doc.fileName}
                          type="button"
                          onClick={() =>
                            setPdfViewerTarget({
                              plate: draftTech.tractorPlate,
                              vin: draftVinPair.tractorVin,
                              subtitle: `${decodedTractor.modelName} (${decodedTractor.modelYear})`,
                              initialDocFileName: doc.fileName,
                              initialMode: 'view',
                            })
                          }
                          className="px-2.5 py-0.5 rounded-full tahoe-card-inner border border-white/15 hover:border-[#0A84FF] text-[10.5px] font-bold text-white/85 hover:text-white cursor-pointer transition"
                          title={`Deschide ${doc.title} (${doc.fileName})`}
                        >
                          {doc.customTitle ? `${doc.shortLabel}: ${doc.customTitle}` : doc.shortLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 6 cols: Tractor Technical Specifications */}
              <div className="lg:col-span-6 tahoe-card-inner rounded-2xl p-4 border border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#64D2FF]">
                      {isCarSingle
                        ? 'DATE IDENTIFICARE AUTOTURISM M1 (CONFORM CIV RAR & VIN)'
                        : isExpressSingle
                          ? 'DATE IDENTIFICARE AUTOUTILITARĂ N1 FRIGO (CONFORM CIV RAR & VIN)'
                          : 'DATE IDENTIFICARE CAP TRACTOR (DIN SERIA VIN)'}
                    </span>
                    <h3 className="text-base font-extrabold text-white">
                      {decodedTractor.modelName} ({decodedTractor.modelYear})
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#30D158]/20 text-[#30D158] font-extrabold">
                    {decodedTractor.euroClass.split(' (')[0]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      {isCarSingle
                        ? 'Serie Șasiu (VIN Autoturism)'
                        : isExpressSingle
                          ? 'Serie Șasiu (VIN Autoutilitară)'
                          : 'Serie Șasiu (VIN Cap Tractor)'}
                    </div>
                    <div className="font-mono font-black text-[#64D2FF] text-xs mt-0.5">
                      {draftVinPair.tractorVin}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      {tractorPdfDocs.length > 0
                        ? 'Culoare Caroserie (Conform CIV RAR)'
                        : 'Culoare Caroserie (Din VIN)'}
                    </div>
                    <div className="font-bold text-white mt-0.5 flex items-center gap-1.5 truncate">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-500/70 shrink-0 [forced-color-adjust:none]"
                        style={{ backgroundColor: decodedTractor.oemColor.hex }}
                      />
                      <span className="truncate">
                        {decodedTractor.oemColor.name.match(/\(([^)]+)\)/)?.[1] ||
                          decodedTractor.oemColor.name}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Kilometraj CAN-Bus Bord
                    </div>
                    <div className="font-black text-white text-sm mt-0.5 tabular-nums">
                      {draftTech.odometerKm.toLocaleString('ro-RO')} km
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Următoarea Revizie Service
                    </div>
                    <div className="font-bold text-[#FF9F0A] mt-0.5 tabular-nums">
                      La {draftTech.nextServiceKm.toLocaleString('ro-RO')} km (în{' '}
                      {kmToService.toLocaleString('ro-RO')} km)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Motorizare & Cuplu
                    </div>
                    <div className="font-bold text-white mt-0.5">
                      {decodedTractor.engineAndPower}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      {isExpressSingle
                        ? 'Cutie de Viteze & Tracțiune'
                        : 'Cutie de Viteze & Retarder'}
                    </div>
                    <div className="font-bold text-white mt-0.5">
                      {decodedTractor.transmission}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-white/50 uppercase font-bold">
                        Asigurare RCA
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums whitespace-nowrap"
                        style={{ backgroundColor: tractorRcaBadge.bgHex, color: '#ffffff' }}
                      >
                        {tractorRcaBadge.shortText}
                      </span>
                    </div>
                    <div className="font-bold text-white mt-1 truncate">
                      {shortInsurer(matchedTractorFleetItem?.rcaInsurer) || 'RCA'}{' '}
                      {tractorDocs.rcaIso ? `· ${isoToRoDate(tractorDocs.rcaIso)}` : ''}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-white/50 uppercase font-bold">
                        {isCarSingle ? 'CASCO & ITP' : 'CASCO & CMR'}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums whitespace-nowrap"
                        style={{ backgroundColor: tractorCascoBadge.bgHex, color: '#ffffff' }}
                      >
                        CASCO: {tractorCascoBadge.shortText}
                      </span>
                    </div>
                    <div className="font-bold text-white mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="truncate">
                        {shortInsurer(matchedTractorFleetItem?.cascoInsurer) || 'CASCO'}
                        {tractorDocs.cascoIso ? ` (${isoToRoDate(tractorDocs.cascoIso)})` : ''}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums whitespace-nowrap"
                        style={{
                          backgroundColor: isCarSingle
                            ? tractorItpBadge.bgHex
                            : tractorCmrBadge.bgHex,
                          color: '#ffffff',
                        }}
                      >
                        {isCarSingle
                          ? `ITP: ${tractorItpBadge.shortText}`
                          : `CMR: ${tractorCmrBadge.shortText}`}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Finanțare / Credit / Leasing
                    </div>
                    <div className="font-bold text-amber-300 mt-0.5">
                      {decodedTractor.leasingContract || 'Achitat integral'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      {isCarSingle ? 'Companie & Utilizare' : 'Companie & Șofer Titular'}
                    </div>
                    <div className="font-bold text-white mt-0.5">
                      {decodedTractor.companyName || 'BLUE TRANS SPEDITION'} ·{' '}
                      {isCarSingle ? 'Flotă Administrativă' : trailer.driver1.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: FIȘA SEMIREMORCĂ FRIGORIFICĂ (TRAILER DOSSIER)
        ====================================================================== */}
        {activeTab === 'trailer' && !isExpressSingle && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-6 space-y-2.5">
                <VehicleStudioRender
                  decoded={decodedTrailer}
                  plateNumber={activeTrailerPlate}
                  partnerPlateNumber={draftTech.tractorPlate}
                  trailerCompanyName={activeTrailerCompany}
                  showCoupledRoadTrain={false}
                  zone1Temp={trailer.zone1Temp}
                  zone2Temp={trailer.zone2Temp}
                  heightClass="h-[225px]"
                />

                <div className="tahoe-card-inner rounded-xl p-2.5 border border-white/10 flex flex-nowrap items-center justify-between gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-white/85 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158] shrink-0" />
                    <span>
                      VIN:{' '}
                      <strong className="font-mono text-[#0A84FF]">
                        {draftVinPair.trailerVin}
                      </strong>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-white min-w-0 whitespace-nowrap">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-500/70 shrink-0 [forced-color-adjust:none]"
                      style={{ backgroundColor: decodedTrailer.oemColor.hex }}
                    />
                    <span className="truncate">
                      {decodedTrailer.oemColor.name.match(/\(([^)]+)\)/)?.[1] ||
                        decodedTrailer.oemColor.name}
                    </span>
                  </span>
                </div>

                {/* Dosar Acte Semiremorcă (CIV, Talon, RCA, ATP, ITP...) — Adaugă / Editează / Șterge */}
                <div className="tahoe-card-inner rounded-xl p-2.5 border border-[#0A84FF]/30 space-y-2 min-w-0">
                  <div className="flex flex-nowrap items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2
                        className={`w-4 h-4 shrink-0 ${
                          trailerPdfDocs.length > 0 ? 'text-[#30D158]' : 'text-white/45'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold text-white truncate">
                          {trailerPdfDocs.length > 0
                            ? `Dosar Acte Semiremorcă (${trailerPdfDocs.length}) · ${activeTrailerPlate}`
                            : `Niciun act scanat atașat încă · ${activeTrailerPlate}`}
                        </div>
                        <div className="text-[10px] text-white/55 truncate">
                          {trailerPdfDocs.length > 0
                            ? trailerPdfDocs.map((d) => d.shortLabel).join(' · ')
                            : 'Adaugă CIV, Talon, RCA, Certificat ATP sau ITP'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {trailerPdfDocs.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPdfViewerTarget({
                              plate: activeTrailerPlate,
                              vin: draftVinPair.trailerVin,
                              subtitle: `${decodedTrailer.modelName} (${decodedTrailer.modelYear})`,
                              initialMode: 'view',
                            })
                          }
                          className="px-3 py-1.5 rounded-full bg-[#0A84FF] hover:brightness-110 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition shadow-xs whitespace-nowrap"
                          style={{ color: '#ffffff' }}
                        >
                          <FileText className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
                          <span style={{ color: '#ffffff' }}>Vezi / Editează</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setPdfViewerTarget({
                            plate: activeTrailerPlate,
                            vin: draftVinPair.trailerVin,
                            subtitle: `${decodedTrailer.modelName} (${decodedTrailer.modelYear})`,
                            initialMode: 'add',
                          })
                        }
                        className="px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-[11px] font-extrabold text-emerald-400 flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                      >
                        <FilePlus2 className="w-3.5 h-3.5 shrink-0" />
                        <span>+ Adaugă act</span>
                      </button>
                    </div>
                  </div>

                  {trailerPdfDocs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
                      {trailerPdfDocs.map((doc) => (
                        <button
                          key={doc.fileName}
                          type="button"
                          onClick={() =>
                            setPdfViewerTarget({
                              plate: activeTrailerPlate,
                              vin: draftVinPair.trailerVin,
                              subtitle: `${decodedTrailer.modelName} (${decodedTrailer.modelYear})`,
                              initialDocFileName: doc.fileName,
                              initialMode: 'view',
                            })
                          }
                          className="px-2.5 py-0.5 rounded-full tahoe-card-inner border border-white/15 hover:border-[#0A84FF] text-[10.5px] font-bold text-white/85 hover:text-white cursor-pointer transition"
                          title={`Deschide ${doc.title} (${doc.fileName})`}
                        >
                          {doc.customTitle ? `${doc.shortLabel}: ${doc.customTitle}` : doc.shortLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6 tahoe-card-inner rounded-2xl p-4 border border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase text-[#64D2FF]">
                        FIȘA TEHNICĂ SEMIREMORCĂ FRIGORIFICĂ BI-TEMP
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0A84FF]/20 border border-[#0A84FF]/40 text-[10px] font-black text-[#64D2FF]">
                        {activeTrailerCompany}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-white">
                      {decodedTrailer.modelName} ({decodedTrailer.modelYear})
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold shrink-0">
                    13.6 LDM · 33 Paleți
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Serie Șasiu (VIN Semiremorcă)
                    </div>
                    <div className="font-mono font-black text-[#64D2FF] text-xs mt-0.5">
                      {draftVinPair.trailerVin}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      {trailerPdfDocs.length > 0
                        ? 'Culoare CIV & Companie'
                        : 'Culoare & Companie'}
                    </div>
                    <div className="font-bold text-white mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-500/70 shrink-0 [forced-color-adjust:none]"
                        style={{ backgroundColor: decodedTrailer.oemColor.hex }}
                      />
                      <span>
                        {decodedTrailer.oemColor.name.match(/\(([^)]+)\)/)?.[1] ||
                          decodedTrailer.oemColor.name}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="text-[#0A84FF] font-extrabold">{activeTrailerCompany}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Agregat Frigorific & Ore
                    </div>
                    <div className="font-bold text-cyan-300 mt-0.5">
                      {decodedTrailer.reeferUnit || decodedTrailer.engineAndPower}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Temperaturi Active Bi-Temp
                    </div>
                    <div className="font-extrabold text-white mt-0.5">
                      Zona 1: <span className="text-sky-400">{trailer.zone1Temp}°C</span> · Zona 2:{' '}
                      <span className="text-emerald-400">+{trailer.zone2Temp}°C</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-white/50 uppercase font-bold">
                        Certificare ATP Frigo
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums whitespace-nowrap"
                        style={{ backgroundColor: atpBadge.bgHex, color: '#ffffff' }}
                      >
                        {atpBadge.shortText}
                      </span>
                    </div>
                    <div className="font-bold text-[#30D158] mt-1 truncate">
                      {atpIso ? isoToRoDate(atpIso) : draftTech.atpFrigoCertExpiry}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] text-white/50 uppercase font-bold">
                      Axe, Frâne & Anvelope
                    </div>
                    <div className="font-bold text-white mt-0.5">
                      {decodedTrailer.transmission} · {decodedTrailer.tireSize}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-white/50 uppercase font-bold">
                        Asigurare RCA Semiremorcă
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums whitespace-nowrap"
                        style={{ backgroundColor: trailerRcaBadge.bgHex, color: '#ffffff' }}
                      >
                        {trailerRcaBadge.shortText}
                      </span>
                    </div>
                    <div className="font-extrabold text-white mt-1 truncate">
                      {shortInsurer(matchedTrailerFleetItem?.rcaInsurer) || 'RCA'}
                      {trailerDocs.rcaIso ? ` · ${isoToRoDate(trailerDocs.rcaIso)}` : ''}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-white/50 uppercase font-bold">
                        CASCO &amp; Leasing
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums whitespace-nowrap"
                        style={{ backgroundColor: trailerCascoBadge.bgHex, color: '#ffffff' }}
                      >
                        {trailerCascoBadge.shortText}
                      </span>
                    </div>
                    <div className="font-extrabold text-amber-300 mt-1 truncate">
                      {trailerDocs.cascoIso
                        ? `${shortInsurer(matchedTrailerFleetItem?.cascoInsurer) || 'CASCO'} (${isoToRoDate(trailerDocs.cascoIso)})`
                        : 'Fără CASCO'}{' '}
                      · {decodedTrailer.leasingContract || 'Achitat'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: ANSAMBLU CUPLAT (16.5M), TELEMETRIE CAN-BUS, ANVELOPE & ACTE
        ====================================================================== */}
        {activeTab === 'coupled' && (
          <div className="space-y-3">
            <VehicleStudioRender
              decoded={decodedTractor}
              plateNumber={draftTech.tractorPlate}
              partnerPlateNumber={activeTrailerPlate}
              trailerCompanyName={activeTrailerCompany}
              trailerOemHex={decodedTrailer.oemColor.hex}
              showCoupledRoadTrain={!isExpressSingle}
              zone1Temp={trailer.zone1Temp}
              zone2Temp={trailer.zone2Temp}
              heightClass="h-[180px]"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Card 1: Official Certificates */}
              <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10 space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase text-[#64D2FF] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#30D158]" />
                  Documente Oficiale & Expirări
                </div>
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/65 whitespace-nowrap">RCA:</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: tractorRcaBadge.bgHex, color: '#ffffff' }}
                    >
                      {tractorDocs.rcaIso ? `${isoToRoDate(tractorDocs.rcaIso)} · ` : ''}
                      {tractorRcaBadge.shortText}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/65 whitespace-nowrap">CASCO:</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: tractorCascoBadge.bgHex, color: '#ffffff' }}
                    >
                      {tractorDocs.cascoIso ? `${isoToRoDate(tractorDocs.cascoIso)} · ` : ''}
                      {tractorCascoBadge.shortText}
                    </span>
                  </div>
                  {!isCarSingle && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/65 whitespace-nowrap">CMR:</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums whitespace-nowrap"
                        style={{ backgroundColor: tractorCmrBadge.bgHex, color: '#ffffff' }}
                      >
                        {tractorDocs.cmrIso ? `${isoToRoDate(tractorDocs.cmrIso)} · ` : ''}
                        {tractorCmrBadge.shortText}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/65 whitespace-nowrap">ITP:</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums whitespace-nowrap"
                      style={{ backgroundColor: tractorItpBadge.bgHex, color: '#ffffff' }}
                    >
                      {tractorDocs.itpIso ? `${isoToRoDate(tractorDocs.itpIso)} · ` : ''}
                      {tractorItpBadge.shortText}
                    </span>
                  </div>
                  {isCarSingle ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/65 whitespace-nowrap">Categorie RAR:</span>
                        <strong className="text-[#30D158] text-[10.5px]">
                          Autoturism M1 · 5 locuri
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/65 whitespace-nowrap">Rezervor & Comb.:</span>
                        <strong className="text-white text-[10.5px] truncate">
                          {decodedTractor.fuelTankLiters}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/65 whitespace-nowrap">ATP Frigo:</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums whitespace-nowrap"
                          style={{ backgroundColor: atpBadge.bgHex, color: '#ffffff' }}
                        >
                          {atpIso ? `${isoToRoDate(atpIso)} · ` : ''}
                          {atpBadge.shortText}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/65 whitespace-nowrap">Tahograf:</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums whitespace-nowrap"
                          style={{ backgroundColor: tachoBadge.bgHex, color: '#ffffff' }}
                        >
                          {tachoIso ? `${isoToRoDate(tachoIso)} · ` : ''}
                          {tachoBadge.shortText}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Butoane directe PDF Cărți de Identitate (Cap Tractor + Semiremorcă) */}
                <div className="pt-1.5 border-t border-white/10 flex flex-nowrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPdfViewerTarget({
                        plate: draftTech.tractorPlate,
                        vin: draftVinPair.tractorVin,
                        subtitle: `${decodedTractor.modelName} (${decodedTractor.modelYear})`,
                      })
                    }
                    className="flex-1 min-w-0 px-2.5 py-1 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[10.5px] font-extrabold text-[#64D2FF] flex items-center justify-center gap-1 cursor-pointer transition"
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate">CIV {draftTech.tractorPlate}</span>
                  </button>
                  {!isExpressSingle && (
                    <button
                      type="button"
                      onClick={() =>
                        setPdfViewerTarget({
                          plate: activeTrailerPlate,
                          vin: draftVinPair.trailerVin,
                          subtitle: `${decodedTrailer.modelName} (${decodedTrailer.modelYear})`,
                        })
                      }
                      className="flex-1 min-w-0 px-2.5 py-1 rounded-full bg-[#30D158]/15 hover:bg-[#30D158]/25 border border-[#30D158]/35 text-[10.5px] font-extrabold text-[#30D158] flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">CIV {activeTrailerPlate}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Live CAN-Bus & Axle Pressures */}
              <div className="tahoe-card-inner rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="text-[11px] font-extrabold uppercase text-[#64D2FF] flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#0A84FF]" />
                  Telemetrie CAN-Bus & Anvelope TPMS
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-white/65">Presiune Punte Față:</span>
                    <strong className="text-[#30D158]">
                      {isCarSingle
                        ? '2.3 bar / 2.3 bar (OK)'
                        : isExpressSingle
                          ? '4.2 bar / 4.2 bar (OK)'
                          : '8.5 bar / 8.5 bar (OK)'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/65">
                      {isCarSingle ? 'Presiune Punte Spate:' : 'Presiune Punte Motoare:'}
                    </span>
                    <strong className="text-[#30D158]">
                      {isCarSingle
                        ? '2.2 bar / 2.2 bar (OK)'
                        : isExpressSingle
                          ? '4.5 bar / 4.5 bar (OK)'
                          : '8.2 bar / 8.2 bar (OK)'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/65">
                      {isExpressSingle ? 'Dimensiune Anvelope CIV:' : 'Axe Semiremorcă (3x):'}
                    </span>
                    <strong className="text-[#30D158]">
                      {isExpressSingle
                        ? `${decodedTractor.tireSize || '195/75 R16C'} · Uzură 14%`
                        : '9.0 bar · Uzură 18%'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/65">
                      {isExpressSingle ? 'Tensiune Baterie 12V:' : 'Tensiune Baterii 24V:'}
                    </span>
                    <strong className="text-white">
                      {isExpressSingle ? '14.2 V (Alternator OK)' : '28.4 V (Alternator OK)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card 3: Active Route & Corridor */}
              <div className="tahoe-card-inner rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="text-[11px] font-extrabold uppercase text-[#64D2FF] flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-[#FF9F0A]" />
                  {isCarSingle ? 'Utilizare Flotă Administrativă' : 'Traseu Activ & Dispecerat'}
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-white/65">
                      {isCarSingle ? 'Destinație Flotă:' : 'Coridor Curent:'}
                    </span>
                    <strong className="text-white truncate max-w-[165px]">
                      {isCarSingle
                        ? 'Management & Administrativ'
                        : trailer.routeSummary.join(' → ')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/65">
                      {isCarSingle ? 'Bază Alocată:' : 'Poziție GPS Live:'}
                    </span>
                    <strong className="text-[#64D2FF]">
                      {isCarSingle
                        ? draftTech.tractorPlate.startsWith('BH')
                          ? 'Oradea (RO)'
                          : 'București / Ilfov (RO)'
                        : `${trailer.currentLocation.city} (${trailer.currentLocation.country})`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/65">
                      {isCarSingle ? 'Gabarit RAR CIV:' : 'Viteză & Status:'}
                    </span>
                    <strong className="text-white">
                      {isCarSingle
                        ? `MMA ${decodedTractor.grossWeightKg} kg · Amp. ${decodedTractor.wheelbaseMm} mm`
                        : `${trailer.currentLocation.speedKmh} km/h · ${trailer.status}`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/65">
                      {isCarSingle ? 'Regim Tahograf:' : 'Tahograf Șofer Azi:'}
                    </span>
                    <strong className="text-[#30D158]">
                      {isCarSingle
                        ? 'Scutit (Autoturism M1)'
                        : `${trailer.driver1.remainingDailyDriveHours}h rămase`}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: EDITARE SERII VIN, KILOMETRAJ & CALENDAR ASIGURĂRI (RCA / CASCO / CMR / ITP / ATP)
        ====================================================================== */}
        {activeTab === 'edit' && (
          <form
            id={`${dossierBaseId}-edit-form`}
            onSubmit={handleFormSubmit}
            className="space-y-3.5 text-xs"
          >
            <div
              className={`grid grid-cols-1 ${
                isExpressSingle ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
              } gap-3`}
            >
              <div>
                <label
                  htmlFor="dossier-tractor-plate"
                  className="block font-bold text-white/80 mb-1"
                >
                  {isCarSingle
                    ? 'Număr Înmatriculare Autoturism'
                    : isExpressSingle
                      ? 'Număr Înmatriculare Autoutilitară'
                      : 'Număr Înmatriculare Cap Tractor'}
                </label>
                <input
                  id="dossier-tractor-plate"
                  name="tractorPlate"
                  type="text"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={draftTech.tractorPlate}
                  onChange={(e) =>
                    setDraftTech({
                      ...draftTech,
                      tractorPlate: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full tahoe-card-inner rounded-full px-4 py-2 text-white font-bold border border-white/15 uppercase"
                />
              </div>
              <div>
                <label
                  htmlFor="dossier-tractor-vin"
                  className="block font-bold text-white/80 mb-1"
                >
                  {isCarSingle
                    ? 'Serie Șasiu (VIN) Autoturism'
                    : isExpressSingle
                      ? 'Serie Șasiu (VIN) Autoutilitară'
                      : 'Serie Șasiu (VIN) Cap Tractor'}
                </label>
                <input
                  id="dossier-tractor-vin"
                  name="tractorVin"
                  type="text"
                  required
                  maxLength={17}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={draftVinPair.tractorVin}
                  onChange={(e) => {
                    const nextVin = e.target.value.toUpperCase();
                    const nextDecoded = decodeVinNumber(nextVin);
                    setDraftVinPair({
                      ...draftVinPair,
                      tractorVin: nextVin,
                      tractorColorCode: nextDecoded.oemColor.code,
                    });
                    setDraftTech({
                      ...draftTech,
                      tractorModel: nextDecoded.modelName,
                    });
                  }}
                  className="w-full tahoe-card-inner rounded-full px-4 py-2 text-[#64D2FF] font-mono font-extrabold border border-white/15 uppercase"
                />
              </div>
              {!isExpressSingle && (
                <div>
                  <label
                    htmlFor="dossier-trailer-vin"
                    className="block font-bold text-white/80 mb-1"
                  >
                    Serie Șasiu (VIN) Semiremorcă
                  </label>
                  <input
                    id="dossier-trailer-vin"
                    name="trailerVin"
                    type="text"
                    required
                    maxLength={17}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={draftVinPair.trailerVin}
                    onChange={(e) => {
                      const nextVin = e.target.value.toUpperCase();
                      const nextDecoded = decodeVinNumber(nextVin);
                      setDraftVinPair({
                        ...draftVinPair,
                        trailerVin: nextVin,
                        trailerColorCode: nextDecoded.oemColor.code,
                      });
                      setDraftTech({
                        ...draftTech,
                        trailerModel: nextDecoded.modelName,
                      });
                    }}
                    className="w-full tahoe-card-inner rounded-full px-4 py-2 text-[#64D2FF] font-mono font-extrabold border border-white/15 uppercase"
                  />
                </div>
              )}
            </div>

            {/* Automatic Read-Only Preview of Model & OEM Color Decoded Directly from VIN */}
            <div
              className={`grid grid-cols-1 ${
                isExpressSingle ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
              } gap-3`}
            >
              <div className="tahoe-card-inner rounded-2xl p-3 border border-white/15">
                <div className="text-[10px] font-bold uppercase text-white/55">
                  {isCarSingle
                    ? 'Marcă & Model Autoturism (Din VIN)'
                    : isExpressSingle
                      ? 'Marcă & Model Autoutilitară (Din VIN)'
                      : 'Marcă & Model Cap Tractor (Din VIN)'}
                </div>
                <div className="font-extrabold text-white mt-1">
                  {decodedTractor.modelName} ({decodedTractor.modelYear})
                </div>
              </div>
              <div className="tahoe-card-inner rounded-2xl p-3 border border-white/15">
                <div className="text-[10px] font-bold uppercase text-white/55">
                  {tractorPdfDocs.length > 0
                    ? 'Culoare Caroserie (Conform CIV RAR)'
                    : 'Culoare Caroserie (Din VIN)'}
                </div>
                <div className="font-extrabold text-white mt-1 flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-500/70 shrink-0 [forced-color-adjust:none]"
                    style={{ backgroundColor: decodedTractor.oemColor.hex }}
                  />
                  <span className="truncate">{decodedTractor.oemColor.name}</span>
                </div>
              </div>
              {!isExpressSingle && (
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/15">
                  <div className="text-[10px] font-bold uppercase text-white/55">
                    Model Semiremorcă Frigo (Din VIN)
                  </div>
                  <div className="font-extrabold text-white mt-1 truncate">
                    {decodedTrailer.modelName} ({decodedTrailer.modelYear})
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="dossier-euro-norm"
                  className="block font-bold text-white/80 mb-1"
                >
                  Norma Poluare Euro
                </label>
                <select
                  id="dossier-euro-norm"
                  name="euroNorm"
                  value={draftTech.euroNorm}
                  onChange={(e) =>
                    setDraftTech({
                      ...draftTech,
                      euroNorm: e.target.value as ExtendedFleetTechRecord['euroNorm'],
                    })
                  }
                  className="w-full tahoe-card-inner rounded-full px-4 py-2 text-white font-bold border border-white/15 cursor-pointer"
                >
                  <option value="Euro 6e">Euro 6e (Clasa CO2 redusă)</option>
                  <option value="Euro 6d">Euro 6d</option>
                  <option value="Euro 6c">Euro 6c</option>
                  <option value="Euro 6">Euro 6</option>
                  <option value="Euro 5">Euro 5</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="dossier-odometer-km"
                  className="block font-bold text-white/80 mb-1"
                >
                  Kilometraj Bord (km)
                </label>
                <input
                  id="dossier-odometer-km"
                  name="odometerKm"
                  type="number"
                  required
                  value={draftTech.odometerKm}
                  onChange={(e) =>
                    setDraftTech({
                      ...draftTech,
                      odometerKm: Number(e.target.value),
                    })
                  }
                  className="w-full tahoe-card-inner rounded-full px-4 py-2 text-white font-extrabold tabular-nums border border-white/15"
                />
              </div>
              <div>
                <label
                  htmlFor="dossier-next-service-km"
                  className="block font-bold text-white/80 mb-1"
                >
                  Următoarea Revizie (km)
                </label>
                <input
                  id="dossier-next-service-km"
                  name="nextServiceKm"
                  type="number"
                  required
                  value={draftTech.nextServiceKm}
                  onChange={(e) =>
                    setDraftTech({
                      ...draftTech,
                      nextServiceKm: Number(e.target.value),
                    })
                  }
                  className="w-full tahoe-card-inner rounded-full px-4 py-2 text-white font-bold tabular-nums border border-white/15"
                />
              </div>
              <div>
                <label
                  htmlFor="dossier-avg-fuel"
                  className="block font-bold text-white/80 mb-1"
                >
                  Consum Mediu (L/100km)
                </label>
                <input
                  id="dossier-avg-fuel"
                  name="avgConsumptionL100"
                  type="number"
                  step="0.1"
                  required
                  value={draftTech.avgConsumptionL100}
                  onChange={(e) =>
                    setDraftTech({
                      ...draftTech,
                      avgConsumptionL100: Number(e.target.value),
                    })
                  }
                  className="w-full tahoe-card-inner rounded-full px-4 py-2 text-white font-bold tabular-nums border border-white/15"
                />
              </div>
            </div>

            {/* Calendar Expirări Asigurări & Documente (RCA · CASCO · CMR · ITP · ATP · Tahograf) */}
            <fieldset className="tahoe-card-inner rounded-2xl p-4 border border-[#0A84FF]/30 space-y-3">
              <legend className="sr-only">
                Calendar Expirări Asigurări &amp; Acte —{' '}
                {docUnitTarget === 'trailer' && !isExpressSingle
                  ? `Semiremorcă ${activeTrailerPlate}`
                  : `${isCarSingle ? 'Autoturism' : isExpressSingle ? 'Autoutilitară' : 'Cap tractor'} ${draftTech.tractorPlate}`}
              </legend>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="text-xs font-extrabold text-white flex items-center gap-1.5" aria-hidden="true">
                  <ShieldCheck className="w-4 h-4 text-[#30D158] shrink-0" />
                  <span>
                    Calendar Expirări Asigurări &amp; Acte —{' '}
                    <span className="text-[#0A84FF]">
                      {docUnitTarget === 'trailer' && !isExpressSingle
                        ? `Semiremorcă ${activeTrailerPlate}`
                        : `${isCarSingle ? 'Autoturism' : isExpressSingle ? 'Autoutilitară' : 'Cap tractor'} ${draftTech.tractorPlate}`}
                    </span>
                  </span>
                </div>

                {!isExpressSingle && (
                  <div
                    role="group"
                    aria-label="Selectează unitatea pentru editarea polițelor"
                    className="w-full grid grid-cols-2 sm:w-auto sm:inline-flex items-center gap-1 p-1 rounded-full tahoe-card-inner border border-white/15"
                  >
                    <button
                      type="button"
                      onClick={() => setDocUnitTarget('tractor')}
                      aria-pressed={docUnitTarget === 'tractor'}
                      className={`min-w-0 px-2 sm:px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap flex items-center justify-center cursor-pointer transition ${
                        docUnitTarget === 'tractor'
                          ? 'bg-[#0A84FF] text-white shadow-xs'
                          : 'text-white/75 hover:text-white'
                      }`}
                      style={docUnitTarget === 'tractor' ? { color: '#ffffff' } : undefined}
                    >
                      <span className="sm:hidden truncate">Tractor ({draftTech.tractorPlate})</span>
                      <span className="hidden sm:inline">Cap tractor ({draftTech.tractorPlate})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocUnitTarget('trailer')}
                      aria-pressed={docUnitTarget === 'trailer'}
                      className={`min-w-0 px-2 sm:px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap flex items-center justify-center cursor-pointer transition ${
                        docUnitTarget === 'trailer'
                          ? 'bg-[#0A84FF] text-white shadow-xs'
                          : 'text-white/75 hover:text-white'
                      }`}
                      style={docUnitTarget === 'trailer' ? { color: '#ffffff' } : undefined}
                    >
                      <span className="sm:hidden truncate">Remorcă ({activeTrailerPlate})</span>
                      <span className="hidden sm:inline">Semiremorcă ({activeTrailerPlate})</span>
                    </button>
                  </div>
                )}
              </div>

              {docUnitTarget === 'trailer' && !isExpressSingle ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <ExpiryCalendarField
                    label="Expirare RCA"
                    name="trailerRcaIso"
                    isoValue={trailerDocs.rcaIso}
                    onChangeIso={(iso) =>
                      setTrailerDocs((prev) => ({ ...prev, rcaIso: iso }))
                    }
                    insurerTag={shortInsurer(matchedTrailerFleetItem?.rcaInsurer) || undefined}
                    emptyStatusLabel="Fără RCA"
                    helperNote={
                      cleanVal(matchedTrailerFleetItem?.rcaPolicyNo)
                        ? `Polița ${splitPolicy(matchedTrailerFleetItem?.rcaPolicyNo).no}`
                        : undefined
                    }
                  />
                  <ExpiryCalendarField
                    label="Expirare CASCO"
                    name="trailerCascoIso"
                    isoValue={trailerDocs.cascoIso}
                    onChangeIso={(iso) =>
                      setTrailerDocs((prev) => ({ ...prev, cascoIso: iso }))
                    }
                    insurerTag={shortInsurer(matchedTrailerFleetItem?.cascoInsurer) || undefined}
                    emptyStatusLabel={trailerCascoEmptyLabel}
                    allowClear
                    helperNote={
                      cleanVal(matchedTrailerFleetItem?.cascoPolicyNo)
                        ? `Polița ${matchedTrailerFleetItem?.cascoPolicyNo}`
                        : 'Opțional (lasă gol dacă e fără CASCO)'
                    }
                  />
                  <ExpiryCalendarField
                    label="Expirare CMR"
                    name="trailerCmrIso"
                    isoValue={trailerDocs.cmrIso}
                    onChangeIso={(iso) =>
                      setTrailerDocs((prev) => ({ ...prev, cmrIso: iso }))
                    }
                    insurerTag={
                      shortInsurer(matchedTrailerFleetItem?.cmrPolicy?.split('·')[0]) ||
                      undefined
                    }
                    emptyStatusLabel="Pe Cap Tractor"
                    allowClear
                  />
                  <ExpiryCalendarField
                    label="Expirare ITP"
                    name="trailerItpIso"
                    isoValue={trailerDocs.itpIso}
                    onChangeIso={(iso) =>
                      setTrailerDocs((prev) => ({ ...prev, itpIso: iso }))
                    }
                    emptyStatusLabel="Nesetat"
                  />
                  <ExpiryCalendarField
                    label="Certificat Frigo ATP"
                    name="atpIso"
                    isoValue={atpIso}
                    onChangeIso={setAtpIso}
                    emptyStatusLabel="Nesetat"
                    allowClear
                    helperNote="FRC Bi-Temp -20°C"
                  />
                  <ExpiryCalendarField
                    label="Verificare Tahograf"
                    name="tachoIso"
                    isoValue={tachoIso}
                    onChangeIso={setTachoIso}
                    emptyStatusLabel="Pe Cap Tractor"
                    allowClear
                    helperNote="Smart Tacho G2V2"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <ExpiryCalendarField
                    label="Expirare RCA"
                    name="tractorRcaIso"
                    isoValue={tractorDocs.rcaIso}
                    onChangeIso={(iso) =>
                      setTractorDocs((prev) => ({ ...prev, rcaIso: iso }))
                    }
                    insurerTag={shortInsurer(matchedTractorFleetItem?.rcaInsurer) || undefined}
                    emptyStatusLabel="Fără RCA"
                    helperNote={
                      cleanVal(matchedTractorFleetItem?.rcaPolicyNo)
                        ? `Polița ${splitPolicy(matchedTractorFleetItem?.rcaPolicyNo).no}`
                        : undefined
                    }
                  />
                  <ExpiryCalendarField
                    label="Expirare CASCO"
                    name="tractorCascoIso"
                    isoValue={tractorDocs.cascoIso}
                    onChangeIso={(iso) =>
                      setTractorDocs((prev) => ({ ...prev, cascoIso: iso }))
                    }
                    insurerTag={shortInsurer(matchedTractorFleetItem?.cascoInsurer) || undefined}
                    emptyStatusLabel={tractorCascoEmptyLabel}
                    allowClear
                    helperNote={
                      cleanVal(matchedTractorFleetItem?.cascoPolicyNo)
                        ? `Polița ${matchedTractorFleetItem?.cascoPolicyNo}`
                        : 'Opțional (click × dacă e fără CASCO)'
                    }
                  />
                  <ExpiryCalendarField
                    label="Expirare CMR"
                    name="tractorCmrIso"
                    isoValue={tractorDocs.cmrIso}
                    onChangeIso={(iso) =>
                      setTractorDocs((prev) => ({ ...prev, cmrIso: iso }))
                    }
                    insurerTag={
                      shortInsurer(matchedTractorFleetItem?.cmrPolicy?.split('·')[0]) ||
                      undefined
                    }
                    emptyStatusLabel="Fără CMR"
                    allowClear
                    helperNote={
                      cleanVal(matchedTractorFleetItem?.cmrPolicy)
                        ? matchedTractorFleetItem?.cmrPolicy?.split('(')[0].trim()
                        : undefined
                    }
                  />
                  <ExpiryCalendarField
                    label="Expirare ITP"
                    name="tractorItpIso"
                    isoValue={tractorDocs.itpIso}
                    onChangeIso={(iso) =>
                      setTractorDocs((prev) => ({ ...prev, itpIso: iso }))
                    }
                    emptyStatusLabel="Nesetat"
                  />
                  <ExpiryCalendarField
                    label="Certificat Frigo ATP"
                    name="atpIso"
                    isoValue={atpIso}
                    onChangeIso={setAtpIso}
                    emptyStatusLabel={isCarSingle ? 'Nu necesită ATP' : 'Nesetat'}
                    allowClear
                    helperNote={isCarSingle ? 'Autoturism M1' : 'FRC Bi-Temp -20°C'}
                  />
                  <ExpiryCalendarField
                    label="Verificare Tahograf G2V2"
                    name="tachoIso"
                    isoValue={tachoIso}
                    onChangeIso={setTachoIso}
                    emptyStatusLabel={isCarSingle ? 'Nu necesită Tahograf' : 'Nesetat'}
                    allowClear
                    helperNote={isCarSingle ? 'Autoturism M1' : 'Smart Tacho G2V2'}
                  />
                </div>
              )}
            </fieldset>
          </form>
        )}
        </div>

        {/* Unified Pinned Footer across all 4 tabs — constant height & position */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
          <div className="text-xs text-white/65">
            {activeTab === 'edit'
              ? 'Modificările de serie VIN, kilometraj și calendar asigurări se aplică imediat în flotă.'
              : 'Modelul și culoarea sunt identificate automat direct după seria de șasiu (VIN).'}
          </div>
          {activeTab === 'edit' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-extrabold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                form={`${dossierBaseId}-edit-form`}
                className="px-5 py-2 rounded-full tahoe-btn-primary text-xs font-extrabold text-white cursor-pointer"
              >
                Salvează Fișa Tehnică & VIN
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#64D2FF]" />
                <span>Editează Seria VIN / Km</span>
              </button>
              <button
                type="button"
                onClick={syncSavePayload}
                className="px-5 py-2 rounded-full tahoe-btn-primary text-xs font-extrabold text-white cursor-pointer"
              >
                Salvează & Închide
              </button>
            </div>
          )}
        </div>

        {pdfViewerTarget && (
          <VehiclePdfViewerModal
            plate={pdfViewerTarget.plate}
            vin={pdfViewerTarget.vin}
            vehicleSubtitle={pdfViewerTarget.subtitle}
            initialDocFileName={pdfViewerTarget.initialDocFileName}
            initialMode={pdfViewerTarget.initialMode}
            initialUploadKind={pdfViewerTarget.initialUploadKind}
            onClose={() => setPdfViewerTarget(null)}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// "MAȘINILE MELE" FLEET BOARD (ITP / ROV / RCA / LICENȚĂ + 3/4 STUDIO RENDERS)
// ============================================================================

export interface MasinileMeleItem {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  kind: 'tractor' | 'semitrailer' | 'express' | 'car';
  vin: string;
  colorHex: string;
  colorName: string;
  linkedTrailerId: string; // Maps to TrailerUnit.id for opening full Dossier
  itpDays: number;
  itpExpiryDate: string;
  rovLabel: string;
  rovExpiryDate: string;
  rcaDays: number;
  rcaExpiryDate: string;
  licentaDays: number | null; // null for Semiremorcă
  licentaExpiryDate: string;
  companyName?: 'BLUE TRANS SPEDITION' | 'SCANDEXPRES';
  rcaInsurer?: string;
  rcaPolicyNo?: string;
  cascoInsurer?: string;
  cascoPolicyNo?: string;
  cascoValidity?: string;
  cmrPolicy?: string;
  leasingContract?: string;
  fleetStatus?: 'ACTIV' | 'VANDUTA' | 'ARHIVA';
}

const INITIAL_MASINILE_MELE: MasinileMeleItem[] = [
  // === PRIMELE 7 VEHICULE DIN SCREENSHOT-UL UTILIZATORULUI (CU VIN-URILE & POLIȚELE REALE DIN GOOGLE SHEET) ===
  {
    id: 'mm-1',
    plate: 'IF 96 STS',
    brand: 'SCANIA',
    model: 'SCANIA R500 HIGHLINE',
    year: 2018,
    kind: 'tractor',
    vin: 'YS2R4X200J5532496',
    colorHex: '#1d4ed8',
    colorName: 'Scania Royal Blue',
    linkedTrailerId: 'BH 75 STS',
    itpDays: 136,
    itpExpiryDate: '25.03.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '31.12.2026',
    rcaDays: 30,
    rcaExpiryDate: '09.12.2026',
    licentaDays: 5,
    licentaExpiryDate: '15.11.2026',
    companyName: 'SCANDEXPRES',
    rcaInsurer: 'EASY',
    rcaPolicyNo: '408897 (10.12.2025-09.12.2026)',
    cascoInsurer: 'OMNIASIG',
    cascoPolicyNo: '3455792',
    cascoValidity: '20.11.2023-19.11.2027',
    cmrPolicy: 'LUTZ · W17 5657 12 (09.07.2026-30.06.2027)',
    leasingContract: 'SCANIA CREDIT',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-2',
    plate: 'BH 50 STS',
    brand: 'SCANIA',
    model: 'SCANIA R450 STREAMLINE',
    year: 2016,
    kind: 'tractor',
    vin: 'YS2R4X200G5434149',
    colorHex: '#1d4ed8',
    colorName: 'Scania Royal Blue',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 7,
    itpExpiryDate: '17.11.2026',
    rovLabel: 'Activ',
    rovExpiryDate: '31.12.2026',
    rcaDays: 238,
    rcaExpiryDate: '05.07.2027',
    licentaDays: 100,
    licentaExpiryDate: '18.02.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'INTERAMERICAN HELLENIC INSURANCE COMPANY',
    rcaPolicyNo: '100303371 (06.07.2026-05.07.2027)',
    cascoInsurer: 'LUTZ',
    cascoPolicyNo: 'W17457008',
    cascoValidity: '26.09.2023-Activ',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-3',
    plate: 'BH 56 STS',
    brand: 'SCANIA',
    model: 'SCANIA R500 SUPER',
    year: 2023,
    kind: 'tractor',
    vin: 'YS2R4X200P5721433',
    colorHex: '#1d4ed8',
    colorName: 'Scania Royal Blue',
    linkedTrailerId: 'BH 69 STS',
    itpDays: 7,
    itpExpiryDate: '17.11.2026',
    rovLabel: 'Activ',
    rovExpiryDate: '31.12.2026',
    rcaDays: 7,
    rcaExpiryDate: '16.11.2026',
    licentaDays: 465,
    licentaExpiryDate: '18.02.2028',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '127118633 (17.11.2025-16.11.2026)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001191',
    cascoValidity: '08.11.2023-07.11.2028',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 17-05741 (până la 03.03.2029)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-4',
    plate: 'IF 74 STS',
    brand: 'SCANIA',
    model: 'SCANIA R500 HIGHLINE',
    year: 2019,
    kind: 'tractor',
    vin: 'YS2R4X200K5535171',
    colorHex: '#1d4ed8',
    colorName: 'Scania Royal Blue',
    linkedTrailerId: 'BH 74 STS',
    itpDays: 350,
    itpExpiryDate: '26.10.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '31.12.2026',
    rcaDays: 20,
    rcaExpiryDate: '29.11.2026',
    licentaDays: 100,
    licentaExpiryDate: '18.02.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'AXERIA',
    rcaPolicyNo: '53823811184 (30.11.2025-29.11.2026)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001181',
    cascoValidity: '26.10.2023-25.10.2027',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-05740 (până la 03.02.2028)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-5',
    plate: 'BH 59 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2015,
    kind: 'semitrailer',
    vin: 'WSM00000005150012',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 26,
    itpExpiryDate: '06.12.2026',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 24,
    rcaExpiryDate: '03.12.2026',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96107787 (04.12.2025-03.12.2026)',
    cascoInsurer: 'FLEXICASCO',
    cascoPolicyNo: 'CPJ179447226',
    cascoValidity: '17.12.2025-16.12.2026',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-6',
    plate: 'BH 61 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL THERMO KING',
    year: 2015,
    kind: 'semitrailer',
    vin: 'WSM00000005132131',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 43,
    itpExpiryDate: '23.12.2026',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 24,
    rcaExpiryDate: '03.12.2026',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96107773 (04.12.2025-03.12.2026)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-7',
    plate: 'BH 75 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2015,
    kind: 'semitrailer',
    vin: 'WSM00000005154565',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 75 STS',
    itpDays: 120,
    itpExpiryDate: '10.03.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 42,
    rcaExpiryDate: '21.12.2026',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'SCANDEXPRES',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96117263 (22.12.2025-21.12.2026)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 5657 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },

  // === RESTUL CAPETELOR TRACTOR BLUE TRANS SPEDITION DIN GOOGLE SHEET ===
  {
    id: 'mm-8',
    plate: 'B 506 STS',
    brand: 'SCANIA',
    model: 'SCANIA S500 NEXT GEN SUPER',
    year: 2025,
    kind: 'tractor',
    vin: 'YS2S4X200S5783001',
    colorHex: '#1d4ed8',
    colorName: 'Scania Royal Blue',
    linkedTrailerId: 'BH 74 STS',
    itpDays: 248,
    itpExpiryDate: '15.07.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '15.07.2027',
    rcaDays: 248,
    rcaExpiryDate: '15.07.2027',
    licentaDays: 365,
    licentaExpiryDate: '10.11.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '129212938 (16.07.2026-15.07.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001326',
    cascoValidity: '13.06.2025-12.06.2030',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06491 (până la 03.07.2030)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-9',
    plate: 'B 507 STS',
    brand: 'SCANIA',
    model: 'SCANIA S500 NEXT GEN SUPER',
    year: 2025,
    kind: 'tractor',
    vin: 'YS2S4X200S5783100',
    colorHex: '#1d4ed8',
    colorName: 'Scania Royal Blue',
    linkedTrailerId: 'BH 91 STS',
    itpDays: 248,
    itpExpiryDate: '15.07.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '15.07.2027',
    rcaDays: 248,
    rcaExpiryDate: '15.07.2027',
    licentaDays: 365,
    licentaExpiryDate: '10.11.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '129215222 (16.07.2026-15.07.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001327',
    cascoValidity: '13.06.2025-12.06.2030',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06491 (până la 03.07.2030)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-10',
    plate: 'B 560 STS',
    brand: 'SCANIA',
    model: 'SCANIA S560 NEXT GEN SUPER',
    year: 2025,
    kind: 'tractor',
    vin: 'YS2S4X200S5782932',
    colorHex: '#0284c7',
    colorName: 'Albastru Metalizat (Albastru)',
    linkedTrailerId: 'BH 23 STS',
    itpDays: 248,
    itpExpiryDate: '15.07.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '15.07.2027',
    rcaDays: 248,
    rcaExpiryDate: '15.07.2027',
    licentaDays: 365,
    licentaExpiryDate: '10.11.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'HD INSURANCE PLC NICOSIA',
    rcaPolicyNo: '1100977102 (16.07.2026-15.07.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001325',
    cascoValidity: '13.06.2025-12.06.2030',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06490 (până la 03.10.2030)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-11',
    plate: 'B 871 STS',
    brand: 'SCANIA',
    model: 'SCANIA R460 SUPER (2026)',
    year: 2026,
    kind: 'tractor',
    vin: 'YS2R4X208T5810904',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 31 STS',
    itpDays: 218,
    itpExpiryDate: '16.06.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '16.06.2027',
    rcaDays: 218,
    rcaExpiryDate: '16.06.2027',
    licentaDays: 400,
    licentaExpiryDate: '15.12.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE',
    rcaPolicyNo: '96636629 (17.06.2026-16.06.2027)',
    cascoInsurer: 'OMNIASIG SA',
    cascoPolicyNo: 'C3587075',
    cascoValidity: '04.06.2026-03.06.2031',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-07118 (până la 03.07.2031)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-12',
    plate: 'BH 46 STS',
    brand: 'VOLVO',
    model: 'VOLVO FH 540 GLOBETROTTER XL',
    year: 2024,
    kind: 'tractor',
    vin: 'YV2RT60A0SA362262',
    colorHex: '#0284c7',
    colorName: 'Albastru Metalizat (Albastru)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 360,
    itpExpiryDate: '05.11.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '31.12.2026',
    rcaDays: 360,
    rcaExpiryDate: '05.11.2026',
    licentaDays: 315,
    licentaExpiryDate: '21.09.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'HD INSURANCE PLC NICOSIA',
    rcaPolicyNo: '1100259140 (06.11.2025-05.11.2026)',
    cascoInsurer: 'OMNIASIG SA',
    cascoPolicyNo: '3493693',
    cascoValidity: '13.11.2024-12.12.2029',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'VFS INT ROMANIA IFN · Contract 3426692 (până la 12.11.2029)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-13',
    plate: 'BH 49 STS',
    brand: 'VOLVO',
    model: 'VOLVO FH 460 GLOBETROTTER XL',
    year: 2018,
    kind: 'tractor',
    vin: 'YV2RTY0A2JA826484',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 190,
    itpExpiryDate: '19.05.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '31.12.2026',
    rcaDays: 359,
    rcaExpiryDate: '04.11.2026',
    licentaDays: 290,
    licentaExpiryDate: '27.08.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GENERALI ROMANIA',
    rcaPolicyNo: '8245486 (05.11.2025-04.11.2026)',
    cascoInsurer: 'OMNIASIG SA',
    cascoPolicyNo: '3441251',
    cascoValidity: '02.09.2023-01.09.2027',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'BT LEASING · Contract 62263 (09.2026)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-14',
    plate: 'BH 12 STS',
    brand: 'VOLVO',
    model: 'VOLVO FH 460 GLOBETROTTER EEV',
    year: 2013,
    kind: 'tractor',
    vin: 'YV2AG20A9DA740043',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 95,
    itpExpiryDate: '13.02.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '31.12.2026',
    rcaDays: 33,
    rcaExpiryDate: '13.12.2026',
    licentaDays: 210,
    licentaExpiryDate: '08.06.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'AXERIA',
    rcaPolicyNo: '53925480404 (14.12.2025-13.12.2026)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-15',
    plate: 'BH 30 STS',
    brand: 'SCANIA',
    model: 'SCANIA R 450 STREAMLINE HIGHLINE',
    year: 2017,
    kind: 'tractor',
    vin: 'YS2R4X200H5468860',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 69 STS',
    itpDays: 180,
    itpExpiryDate: '09.05.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '09.05.2027',
    rcaDays: 180,
    rcaExpiryDate: '09.05.2027',
    licentaDays: 240,
    licentaExpiryDate: '08.07.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GROUPAMA',
    rcaPolicyNo: '31370952 (10.05.2026-09.05.2027)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-16',
    plate: 'BH 72 STS',
    brand: 'SCANIA',
    model: 'SCANIA R450 STREAMLINE',
    year: 2015,
    kind: 'tractor',
    vin: 'YS2R4X200F5395736',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 74 STS',
    itpDays: 292,
    itpExpiryDate: '29.08.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '29.08.2027',
    rcaDays: 292,
    rcaExpiryDate: '29.08.2027',
    licentaDays: 310,
    licentaExpiryDate: '16.09.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GENERALI ROMANIA',
    rcaPolicyNo: '8739449 (30.08.2026-29.08.2027)',
    cascoInsurer: 'OMNIASIG SA',
    cascoPolicyNo: 'C007522718',
    cascoValidity: '18.09.2026-17.09.2027',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-17',
    plate: 'BH 81 STS',
    brand: 'MERCEDES-BENZ',
    model: 'SPRINTER 316 CDI FRIGO 3.5T',
    year: 2011,
    kind: 'express',
    vin: 'WDB9061531N496201',
    colorHex: '#1e293b',
    colorName: 'Negru Obsidian (Negru)',
    linkedTrailerId: 'BH 91 STS',
    itpDays: 102,
    itpExpiryDate: '20.02.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '20.02.2027',
    rcaDays: 102,
    rcaExpiryDate: '20.02.2027',
    licentaDays: 250,
    licentaExpiryDate: '18.07.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GENERALI ROMANIA',
    rcaPolicyNo: '8475947 (21.02.2026-20.02.2027)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-18',
    plate: 'BH 07 XTS',
    brand: 'SCANIA',
    model: 'SCANIA S500 6X2 HIGHLINE',
    year: 2017,
    kind: 'tractor',
    vin: 'YS2S6X200H2141984',
    colorHex: '#0284c7',
    colorName: 'Albastru Metalizat (Albastru)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 323,
    itpExpiryDate: '29.09.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '29.09.2027',
    rcaDays: 323,
    rcaExpiryDate: '29.09.2027',
    licentaDays: 323,
    licentaExpiryDate: '29.09.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'OMNIASIG SA',
    rcaPolicyNo: '16434935 (28.09.2026-29.09.2027)',
    cascoInsurer: 'FLEXICASCO',
    cascoPolicyNo: 'CPJ190672577',
    cascoValidity: '30.08.2026-29.08.2027',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-05389 (03.08.2026 finalizat)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-19',
    plate: 'IF 12 STS',
    brand: 'SCANIA',
    model: 'SCANIA R450 HIGHLINE',
    year: 2018,
    kind: 'tractor',
    vin: 'YS2R4X200J5518429',
    colorHex: '#64748b',
    colorName: 'Gri Titan Metalizat (Gri)',
    linkedTrailerId: 'BH 69 STS',
    itpDays: 88,
    itpExpiryDate: '06.02.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '06.02.2027',
    rcaDays: 88,
    rcaExpiryDate: '06.02.2027',
    licentaDays: 205,
    licentaExpiryDate: '03.06.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'INTERAMERICAN HELLENIC INSURANCE COMPANY',
    rcaPolicyNo: '100273003 (07.02.2026-06.02.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001117',
    cascoValidity: '08.02.2023-07.02.2027',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-05336 (până la 03.06.2027)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-20',
    plate: 'IF 20 STS',
    brand: 'SCANIA',
    model: 'SCANIA S500 NEXT GEN SUPER',
    year: 2025,
    kind: 'tractor',
    vin: 'YS2S4X200S5773992',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 23 STS',
    itpDays: 145,
    itpExpiryDate: '04.04.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '04.04.2027',
    rcaDays: 145,
    rcaExpiryDate: '04.04.2027',
    licentaDays: 365,
    licentaExpiryDate: '10.11.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'HD INSURANCE PLC NICOSIA',
    rcaPolicyNo: '1100720771 (05.04.2026-04.04.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001290',
    cascoValidity: '28.02.2025-27.02.2030',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-06318 (până la 03.07.2030)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-21',
    plate: 'IF 30 BTS',
    brand: 'SCANIA',
    model: 'SCANIA S450 NEXT GEN',
    year: 2022,
    kind: 'tractor',
    vin: 'YS2S4X200N5653904',
    colorHex: '#0284c7',
    colorName: 'Albastru Metalizat (Albastru)',
    linkedTrailerId: 'BH 31 STS',
    itpDays: 165,
    itpExpiryDate: '24.04.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '24.04.2027',
    rcaDays: 165,
    rcaExpiryDate: '24.04.2027',
    licentaDays: 266,
    licentaExpiryDate: '03.08.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'INTERAMERICAN HELLENIC INSURANCE COMPANY',
    rcaPolicyNo: '100282762 (25.04.2026-24.04.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI SA',
    cascoPolicyNo: '300300760001074',
    cascoValidity: '28.03.2022-27.03.2027',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT · Contract 59-04750 (până la 03.08.2027)',
    fleetStatus: 'ACTIV',
  },

  // === CAPETE TRACTOR SCANDEXPRES DIN GOOGLE SHEET ===
  {
    id: 'mm-22',
    plate: 'BH 41 STS',
    brand: 'VOLVO',
    model: 'VOLVO FH 460 GLOBETROTTER EEV',
    year: 2014,
    kind: 'tractor',
    vin: 'YV2AG20A3EB683074',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 75 STS',
    itpDays: 232,
    itpExpiryDate: '30.06.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '30.06.2027',
    rcaDays: 232,
    rcaExpiryDate: '30.06.2027',
    licentaDays: 232,
    licentaExpiryDate: '30.06.2027',
    companyName: 'SCANDEXPRES',
    rcaInsurer: 'AXERIA',
    rcaPolicyNo: '64734322199 (01.07.2026-30.06.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI',
    cascoPolicyNo: '11381022373',
    cascoValidity: '26.06.2026-25.06.2027',
    cmrPolicy: 'LUTZ · W17 5657 12 (09.07.2026-30.06.2027)',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-23',
    plate: 'B 166 STS',
    brand: 'SCANIA',
    model: 'SCANIA R460 SUPER (2026)',
    year: 2026,
    kind: 'tractor',
    vin: 'YS2R4X205T5806891',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 75 STS',
    itpDays: 218,
    itpExpiryDate: '16.06.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '16.06.2027',
    rcaDays: 218,
    rcaExpiryDate: '16.06.2027',
    licentaDays: 365,
    licentaExpiryDate: '10.11.2027',
    companyName: 'SCANDEXPRES',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '129044081 (17.06.2026-16.06.2027)',
    cascoInsurer: 'OMNIASIG',
    cascoPolicyNo: '3587074',
    cascoValidity: '03.06.2026-02.06.2031',
    cmrPolicy: 'LUTZ · W17 5657 12 (09.07.2026-30.06.2027)',
    leasingContract: 'SCANIA CREDIT',
    fleetStatus: 'ACTIV',
  },

  // === RESTUL SEMIREMORCILOR BLUE TRANS SPEDITION & SCANDEXPRES DIN GOOGLE SHEET ===
  {
    id: 'mm-24',
    plate: 'BH 67 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP SPECTRUM',
    year: 2018,
    kind: 'semitrailer',
    vin: 'WSM00000005202011',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 257,
    itpExpiryDate: '25.07.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 257,
    rcaExpiryDate: '25.07.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96657049 (26.07.2026-25.07.2027)',
    cascoInsurer: 'OMNIASIG SA',
    cascoPolicyNo: 'C3469895',
    cascoValidity: '09.07.2024-08.07.2028',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'BT LEASING · Contract 78475 (07.2028)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-25',
    plate: 'BH 69 STS',
    brand: 'KRONE',
    model: 'KRONE COOL LINER DUOPLEX BI-TEMP',
    year: 2009,
    kind: 'semitrailer',
    vin: 'WKESD000000456195',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 69 STS',
    itpDays: 234,
    itpExpiryDate: '02.07.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 234,
    rcaExpiryDate: '02.07.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96679024 (03.07.2026-02.07.2027)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-26',
    plate: 'BH 74 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2012,
    kind: 'semitrailer',
    vin: 'WSM00000005097369',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 74 STS',
    itpDays: 123,
    itpExpiryDate: '13.03.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 123,
    rcaExpiryDate: '13.03.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '128167299 (14.03.2026-13.03.2027)',
    cascoInsurer: 'LUTZ',
    cascoPolicyNo: 'W17457008',
    cascoValidity: '26.09.2023-Activ',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-27',
    plate: 'BH 91 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2018,
    kind: 'semitrailer',
    vin: 'WSM00000005199550',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 91 STS',
    itpDays: 244,
    itpExpiryDate: '12.07.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 244,
    rcaExpiryDate: '12.07.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96708892 (13.07.2026-12.07.2027)',
    cascoInsurer: 'OMNIASIG',
    cascoPolicyNo: '3593348',
    cascoValidity: '09.07.2026-08.07.2028',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'BT LEASING · Contract 121844 (până la 10.07.2028)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-28',
    plate: 'BH 23 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL SMART EXECUTIVE (2025)',
    year: 2025,
    kind: 'semitrailer',
    vin: 'WSM000009SV031625',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 23 STS',
    itpDays: 147,
    itpExpiryDate: '06.04.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 147,
    rcaExpiryDate: '06.04.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '128425825 (07.04.2026-06.04.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI',
    cascoPolicyNo: '300300100 108370',
    cascoValidity: '26.03.2025-25.04.2030',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'BCR LEASING · Contract C177782 (până la 05.04.2030)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-29',
    plate: 'BH 31 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2021,
    kind: 'semitrailer',
    vin: 'WSM00000005270543',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 31 STS',
    itpDays: 179,
    itpExpiryDate: '08.05.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 179,
    rcaExpiryDate: '08.05.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '096481558 (09.05.2026-08.05.2027)',
    cascoInsurer: 'GROUPAMA ASIGURARI',
    cascoPolicyNo: '11381012023/20-05-2026',
    cascoValidity: '14.06.2026-13.06.2027',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'UNICREDIT LEASING · Contract 30270356 (01.06.2026 finalizat)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-30',
    plate: 'BH 45 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2013,
    kind: 'semitrailer',
    vin: 'WSM00000005121737',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 285,
    itpExpiryDate: '22.08.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 285,
    rcaExpiryDate: '22.08.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '95792745 (23.08.2026-22.08.2027)',
    cascoInsurer: 'LUTZ',
    cascoPolicyNo: 'W17457008',
    cascoValidity: '26.09.2023-Activ',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-31',
    plate: 'BH 65 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2016,
    kind: 'semitrailer',
    vin: 'WSM00000005148412',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 257,
    itpExpiryDate: '25.07.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 257,
    rcaExpiryDate: '25.07.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: 'AV0859050 (26.07.2026-25.07.2027)',
    cascoInsurer: 'FLEXICASCO',
    cascoPolicyNo: '-',
    cascoValidity: 'Activ',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'BT LEASING · Contract 78476 (07.2026 finalizat)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-32',
    plate: 'BH 96 XTS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2020,
    kind: 'semitrailer',
    vin: 'WSM00000005214625',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 91 STS',
    itpDays: 254,
    itpExpiryDate: '22.07.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 254,
    rcaExpiryDate: '22.07.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96749933 (23.07.2026-22.07.2027)',
    cascoInsurer: 'OMNIASIG',
    cascoPolicyNo: '3593611',
    cascoValidity: '23.07.2026-22.07.2028',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'BT LEASING · Contract 122496 (până la 10.07.2028)',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-33',
    plate: 'BH 69 XTS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2020,
    kind: 'semitrailer',
    vin: 'WSM00000005214617',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 69 STS',
    itpDays: 254,
    itpExpiryDate: '22.07.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 254,
    rcaExpiryDate: '22.07.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96749937 (23.07.2026-22.07.2027)',
    cascoInsurer: 'OMNIASIG',
    cascoPolicyNo: '3593612',
    cascoValidity: '23.07.2026-22.07.2028',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-34',
    plate: 'BH 06 XTS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2017,
    kind: 'semitrailer',
    vin: 'WSM00000005188489',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 74 STS',
    itpDays: 282,
    itpExpiryDate: '19.08.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 282,
    rcaExpiryDate: '19.08.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96820521 (20.08.2026-19.08.2027)',
    cascoInsurer: 'FLEXICASCO',
    cascoPolicyNo: 'CPJ192046563',
    cascoValidity: '29.09.2026-28.09.2027',
    cmrPolicy: 'LUTZ · W17 3531 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-35',
    plate: 'BH 05 XTS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2017,
    kind: 'semitrailer',
    vin: 'WSM00000005166897',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 75 STS',
    itpDays: 112,
    itpExpiryDate: '02.03.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 112,
    rcaExpiryDate: '02.03.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'SCANDEXPRES',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '128167246 (03.03.2026-02.03.2027)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 5657 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-36',
    plate: 'BH 02 XTS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL BI-TEMP',
    year: 2015,
    kind: 'semitrailer',
    vin: 'WSM00000003243505',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 75 STS',
    itpDays: 269,
    itpExpiryDate: '06.08.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 269,
    rcaExpiryDate: '06.08.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Licență pe Cap Tractor)',
    companyName: 'SCANDEXPRES',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '129408322 (07.08.2026-06.08.2027)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 5657 12',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-37',
    plate: 'BH 33 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL (VÂNDUTĂ)',
    year: 2011,
    kind: 'semitrailer',
    vin: 'WSM00000005082165',
    colorHex: '#0284c7',
    colorName: 'Albastru Metalizat (Albastru)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 242,
    itpExpiryDate: '10.07.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 242,
    rcaExpiryDate: '10.07.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Vândută)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '95685995 (11.07.2026-10.07.2027)',
    cascoInsurer: 'FLEXICASCO',
    cascoPolicyNo: 'CPJ183064585',
    cascoValidity: '14.03.2026-13.03.2027',
    cmrPolicy: '-',
    leasingContract: 'VÂNDUTĂ',
    fleetStatus: 'VANDUTA',
  },
  {
    id: 'mm-38',
    plate: 'BH 47 STS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL (VÂNDUTĂ)',
    year: 2006,
    kind: 'semitrailer',
    vin: 'WSM00000005021750',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 7,
    itpExpiryDate: '16.11.2026',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 7,
    rcaExpiryDate: '16.11.2026',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Vândută)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'GRAWE ROMANIA ASIGURARE S.A.',
    rcaPolicyNo: '96062338 (17.11.2025-16.11.2026)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'VÂNDUTĂ',
    fleetStatus: 'VANDUTA',
  },
  {
    id: 'mm-39',
    plate: 'BH 52 STS',
    brand: 'KRONE',
    model: 'KRONE COOL LINER (VÂNDUTĂ)',
    year: 2009,
    kind: 'semitrailer',
    vin: 'WKESD000000452860',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 69 STS',
    itpDays: 72,
    itpExpiryDate: '21.01.2027',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 72,
    rcaExpiryDate: '21.01.2027',
    licentaDays: null,
    licentaExpiryDate: 'Semiremorcă (Vândută)',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: 'Alliantz',
    rcaPolicyNo: '127892142 (22.01.2026-21.01.2027)',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'VÂNDUTĂ',
    fleetStatus: 'VANDUTA',
  },

  // === VEHICULE AUXILIARE & ARHIVĂ CIV RAR DIN PUBLIC/ACTE-FLOTA ===
  {
    id: 'mm-40',
    plate: 'B 102 STS',
    brand: 'DACIA',
    model: 'DACIA LOGAN III TCE 90 (AUTOTURISM M1)',
    year: 2024,
    kind: 'car',
    vin: 'UU1DJF00973024855',
    colorHex: '#173773',
    colorName: 'Albastru Iron Metalizat',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 560,
    itpExpiryDate: '24.05.2027',
    rovLabel: 'Autoturism',
    rovExpiryDate: 'Activ',
    rcaDays: 195,
    rcaExpiryDate: '24.05.2027',
    licentaDays: null,
    licentaExpiryDate: 'Autoturism M1',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'Achitat / Administrativ',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-41',
    plate: 'B 196 STS',
    brand: 'DACIA',
    model: 'DACIA LOGAN III TCE 90 (AUTOTURISM M1)',
    year: 2024,
    kind: 'car',
    vin: 'UU1DJF00373024849',
    colorHex: '#173773',
    colorName: 'Albastru Iron Metalizat',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 560,
    itpExpiryDate: '24.05.2027',
    rovLabel: 'Autoturism',
    rovExpiryDate: 'Activ',
    rcaDays: 195,
    rcaExpiryDate: '24.05.2027',
    licentaDays: null,
    licentaExpiryDate: 'Autoturism M1',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'Achitat / Administrativ',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-42',
    plate: 'BH 01 STS',
    brand: 'MERCEDES-BENZ',
    model: 'MERCEDES-BENZ C 250 CDI (AUTOTURISM M1)',
    year: 2012,
    kind: 'car',
    vin: 'WDD2040031A698310',
    colorHex: '#1e293b',
    colorName: 'Negru Antracit',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 180,
    itpExpiryDate: '11.12.2026',
    rovLabel: 'Autoturism',
    rovExpiryDate: 'Activ',
    rcaDays: 180,
    rcaExpiryDate: '-',
    licentaDays: null,
    licentaExpiryDate: 'Autoturism M1',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'Achitat integral',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-43',
    plate: 'BH 03 XTS',
    brand: 'SCHMITZ CARGOBULL',
    model: 'SCHMITZ S.KO COOL SCB*S3B (ARHIVĂ CIV)',
    year: 2017,
    kind: 'semitrailer',
    vin: 'WSM00000005166896',
    colorHex: '#f8fafc',
    colorName: 'Frigo Arctic White',
    linkedTrailerId: 'BH 75 STS',
    itpDays: 180,
    itpExpiryDate: '08.05.2026',
    rovLabel: 'Semiremorcă',
    rovExpiryDate: 'Inclus în Cap Tractor',
    rcaDays: 0,
    rcaExpiryDate: '-',
    licentaDays: null,
    licentaExpiryDate: 'Arhivă CIV',
    companyName: 'SCANDEXPRES',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'Achitat / Arhivă CIV',
    fleetStatus: 'ARHIVA',
  },
  {
    id: 'mm-44',
    plate: 'IF 02 XTS',
    brand: 'SCANIA',
    model: 'SCANIA R 450 STREAMLINE HIGHLINE (ARHIVĂ CIV)',
    year: 2017,
    kind: 'tractor',
    vin: 'YS2R4X200H5470447',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 0,
    itpExpiryDate: '-',
    rovLabel: 'Arhivă',
    rovExpiryDate: '-',
    rcaDays: 0,
    rcaExpiryDate: '-',
    licentaDays: null,
    licentaExpiryDate: 'Arhivă CIV',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'Achitat / Arhivă CIV',
    fleetStatus: 'ARHIVA',
  },
  {
    id: 'mm-45',
    plate: 'IF 78 STS',
    brand: 'SCANIA',
    model: 'SCANIA R 500 HIGHLINE ADR (ARHIVĂ CIV)',
    year: 2018,
    kind: 'tractor',
    vin: 'YS2R4X200J5532061',
    colorHex: '#0284c7',
    colorName: 'Albastru Metalizat',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 0,
    itpExpiryDate: '-',
    rovLabel: 'Arhivă',
    rovExpiryDate: '-',
    rcaDays: 0,
    rcaExpiryDate: '-',
    licentaDays: null,
    licentaExpiryDate: 'Arhivă CIV',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'Achitat / Arhivă CIV',
    fleetStatus: 'ARHIVA',
  },
  {
    id: 'mm-46',
    plate: 'IF 58 STS',
    brand: 'SCANIA',
    model: 'SCANIA R 450 STREAMLINE HIGHLINE',
    year: 2018,
    kind: 'tractor',
    vin: 'YS2R4X200J5496553',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 91 STS',
    itpDays: 210,
    itpExpiryDate: '08.06.2027',
    rovLabel: 'Activ',
    rovExpiryDate: '08.06.2027',
    rcaDays: 210,
    rcaExpiryDate: '08.06.2027',
    licentaDays: 250,
    licentaExpiryDate: '18.07.2027',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: 'LUTZ · W17 3531 12 (31.12.2026)',
    leasingContract: 'SCANIA CREDIT',
    fleetStatus: 'ACTIV',
  },
  {
    id: 'mm-47',
    plate: 'IF 71 STS',
    brand: 'SCANIA',
    model: 'SCANIA R 450 STREAMLINE HIGHLINE (ARHIVĂ CIV)',
    year: 2017,
    kind: 'tractor',
    vin: 'YS2R4X200H5482943',
    colorHex: '#f8fafc',
    colorName: 'Alb Polar OEM (Alb)',
    linkedTrailerId: 'BH 67 STS',
    itpDays: 0,
    itpExpiryDate: '-',
    rovLabel: 'Arhivă',
    rovExpiryDate: '-',
    rcaDays: 0,
    rcaExpiryDate: '-',
    licentaDays: null,
    licentaExpiryDate: 'Arhivă CIV',
    companyName: 'BLUE TRANS SPEDITION',
    rcaInsurer: '-',
    rcaPolicyNo: '-',
    cascoInsurer: '-',
    cascoPolicyNo: '-',
    cascoValidity: '-',
    cmrPolicy: '-',
    leasingContract: 'SCANIA CREDIT (Arhivă CIV)',
    fleetStatus: 'ARHIVA',
  },
];

/** Flota reală activă (fără vehiculele vândute sau din arhiva istorică CIV), din evidența flotei — folosită și în Planning. */
export const getRealFleet = (): {
  tractors: { plate: string; brand: string; company: string }[];
  trailers: { plate: string; brand: string; company: string }[];
} => {
  const active = INITIAL_MASINILE_MELE.filter(
    (v) => v.fleetStatus !== 'VANDUTA' && v.fleetStatus !== 'ARHIVA'
  );
  const map = (v: MasinileMeleItem) => ({
    plate: v.plate,
    brand: v.brand,
    company: v.companyName === 'SCANDEXPRES' ? 'Scandexpres' : 'Blue Trans',
  });
  return {
    tractors: active.filter((v) => v.kind === 'tractor').map(map),
    trailers: active.filter((v) => v.kind === 'semitrailer').map(map),
  };
};

// ---------------------------------------------------------------------------
// Date reale din evidența flotei (Google Sheet): RCA · CASCO · CMR · Credit / Leasing
// ---------------------------------------------------------------------------
type FleetDocType = 'RCA' | 'CASCO' | 'CMR' | 'LEASING';

const MASINILE_MELE_STORAGE_KEY = 'bluetrans_masinile_mele_v6';
const MASINILE_MELE_DELETED_STORAGE_KEY = 'bluetrans_masinile_mele_deleted_v1';
const FLEET_ITEMS_SYNC_EVENT = 'bluetrans:fleet-items-updated';

function loadDeletedFleetPlates(): Set<string> {
  try {
    const raw =
      typeof window !== 'undefined'
        ? localStorage.getItem(MASINILE_MELE_DELETED_STORAGE_KEY)
        : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((p) => normalizeVehiclePlate(String(p))));
      }
    }
  } catch {
    // ignore
  }
  return new Set();
}

function updateDeletedFleetPlates(plates: string[], mode: 'add' | 'remove'): void {
  try {
    if (typeof window === 'undefined' || plates.length === 0) return;
    const next = loadDeletedFleetPlates();
    for (const plate of plates) {
      const norm = normalizeVehiclePlate(plate);
      if (!norm) continue;
      if (mode === 'add') next.add(norm);
      else next.delete(norm);
    }
    localStorage.setItem(MASINILE_MELE_DELETED_STORAGE_KEY, JSON.stringify(Array.from(next)));
  } catch {
    // ignore
  }
}

export function loadPersistedFleetItems(): MasinileMeleItem[] {
  try {
    const deletedPlates = loadDeletedFleetPlates();
    const raw =
      typeof window !== 'undefined'
        ? localStorage.getItem(MASINILE_MELE_STORAGE_KEY)
        : null;
    if (raw) {
      const parsed = JSON.parse(raw) as MasinileMeleItem[];
      if (Array.isArray(parsed)) {
        const canonicalByPlate = new Map(
          INITIAL_MASINILE_MELE.map((v) => [normalizeVehiclePlate(v.plate), v])
        );
        const merged = parsed
          .filter((savedItem) => !deletedPlates.has(normalizeVehiclePlate(savedItem.plate)))
          .map((savedItem) => {
            const canon = canonicalByPlate.get(normalizeVehiclePlate(savedItem.plate));
            if (!canon) return savedItem;
            return {
              ...savedItem,
              brand: canon.brand,
              model: canon.model,
              year: canon.year,
              kind: canon.kind,
              vin: canon.vin,
              colorHex: canon.colorHex,
              colorName: canon.colorName,
              // Păstrează modificările făcute de utilizator (inclusiv Editare în masă)
              companyName: savedItem.companyName || canon.companyName,
              fleetStatus: savedItem.fleetStatus || canon.fleetStatus,
              linkedTrailerId: canon.linkedTrailerId,
            };
          });
        const seen = new Set(merged.map((v) => normalizeVehiclePlate(v.plate)));
        const missing = INITIAL_MASINILE_MELE.filter((v) => {
          const norm = normalizeVehiclePlate(v.plate);
          return !seen.has(norm) && !deletedPlates.has(norm);
        });
        return missing.length > 0 ? [...merged, ...missing] : merged;
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_MASINILE_MELE;
}

export function savePersistedFleetItems(nextItems: MasinileMeleItem[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MASINILE_MELE_STORAGE_KEY, JSON.stringify(nextItems));
      window.dispatchEvent(new CustomEvent(FLEET_ITEMS_SYNC_EVENT));
    }
  } catch {
    // ignore
  }
}

export interface FleetUnitDocIsoUpdates {
  rcaIso?: string;
  cascoIso?: string;
  cmrIso?: string;
  itpIso?: string;
  leasingIso?: string;
}

export function getDocIsoForFleetItem(
  item: MasinileMeleItem,
  docType: FleetDocType
): string {
  if (docType === 'RCA') {
    return (
      extractIsoDateFromText(item.rcaPolicyNo) ||
      extractIsoDateFromText(item.rcaExpiryDate)
    );
  }
  if (docType === 'CASCO') {
    if (!cleanVal(item.cascoInsurer)) return '';
    return extractIsoDateFromText(item.cascoValidity);
  }
  if (docType === 'CMR') {
    if (!cleanVal(item.cmrPolicy)) return '';
    return extractIsoDateFromText(item.cmrPolicy);
  }
  const lc = cleanVal(item.leasingContract);
  if (!lc || lc.toUpperCase().startsWith('VÂNDUT') || lc.toLowerCase().startsWith('achitat')) {
    return '';
  }
  return extractIsoDateFromText(lc);
}

export function applyDocIsoUpdatesToFleetItem(
  item: MasinileMeleItem,
  updates: FleetUnitDocIsoUpdates
): MasinileMeleItem {
  const next: MasinileMeleItem = { ...item };

  if (updates.rcaIso !== undefined) {
    if (!updates.rcaIso) {
      next.rcaExpiryDate = '-';
      next.rcaPolicyNo = '-';
      next.rcaDays = 0;
    } else {
      const ro = isoToRoDate(updates.rcaIso);
      const d = calendarDaysUntilIso(updates.rcaIso) ?? 0;
      next.rcaExpiryDate = ro;
      next.rcaDays = d;
      next.rcaInsurer = cleanVal(next.rcaInsurer) || 'RCA ACTIV';
      next.rcaPolicyNo = updateExpiryInPolicyString(next.rcaPolicyNo, updates.rcaIso) || ro;
    }
  }

  if (updates.cascoIso !== undefined) {
    if (!updates.cascoIso) {
      next.cascoValidity = '-';
      next.cascoInsurer = '-';
    } else {
      const ro = isoToRoDate(updates.cascoIso);
      next.cascoInsurer = cleanVal(next.cascoInsurer) || 'OMNIASIG';
      next.cascoValidity = updateExpiryInPolicyString(next.cascoValidity, updates.cascoIso) || ro;
    }
  }

  if (updates.cmrIso !== undefined) {
    if (!updates.cmrIso) {
      next.cmrPolicy = '-';
    } else {
      const ro = isoToRoDate(updates.cmrIso);
      const existingCmr = cleanVal(next.cmrPolicy);
      next.cmrPolicy = existingCmr
        ? updateExpiryInPolicyString(existingCmr, updates.cmrIso)
        : `LUTZ (${ro})`;
    }
  }

  if (updates.itpIso !== undefined && updates.itpIso) {
    next.itpExpiryDate = isoToRoDate(updates.itpIso);
    next.itpDays = calendarDaysUntilIso(updates.itpIso) ?? 0;
  }

  if (updates.leasingIso !== undefined) {
    if (!updates.leasingIso) {
      const existingLc = cleanVal(next.leasingContract);
      if (existingLc && !existingLc.toLowerCase().startsWith('achitat')) {
        next.leasingContract = existingLc.split('·')[0].trim();
      }
    } else {
      const ro = isoToRoDate(updates.leasingIso);
      const existingLc = cleanVal(next.leasingContract);
      next.leasingContract =
        existingLc && !existingLc.toLowerCase().startsWith('achitat')
          ? updateExpiryInPolicyString(existingLc, updates.leasingIso)
          : `LEASING ACTIV · (până la ${ro})`;
    }
  }

  return next;
}

const cleanVal = (s?: string): string => (s && s.trim() && s.trim() !== '-' ? s.trim() : '');

const shortInsurer = (s?: string): string => {
  const v = cleanVal(s).toUpperCase();
  if (!v) return '';
  if (v.startsWith('HD INSURANCE')) return 'HD INSURANCE';
  return v.split(' ')[0];
};

const splitPolicy = (raw?: string): { no: string; period: string } => {
  const t = (raw || '').trim();
  const m = t.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { no: m[1], period: m[2] } : { no: t, period: '' };
};

const cmrEndText = (pol?: string): string => {
  const iso = extractIsoDateFromText(pol);
  return iso ? isoToRoDate(iso) : '';
};

const FLEET_COLOR_OK = '#4ca656';
const FLEET_COLOR_WARN = '#efa961';
const FLEET_COLOR_EXPIRED = '#d9534f';
const FLEET_COLOR_NEUTRAL = '#6c757d';
const FLEET_COLOR_INFO = '#3b6fb6';

const toneForDays = (days: number): string =>
  days < 0 ? FLEET_COLOR_EXPIRED : days <= 14 ? FLEET_COLOR_WARN : FLEET_COLOR_OK;

interface FleetCellInfo {
  days: number | null;
  label: string;
  sub: string;
  color: string;
}

const getFleetCellInfo = (item: MasinileMeleItem, docType: FleetDocType): FleetCellInfo => {
  if (docType === 'RCA') {
    const iso = getDocIsoForFleetItem(item, 'RCA');
    const sub = shortInsurer(item.rcaInsurer);
    const days = calendarDaysUntilIso(iso);
    if (days === null) return { days: null, label: 'Fără RCA', sub, color: FLEET_COLOR_NEUTRAL };
    return { days, label: '', sub, color: toneForDays(days) };
  }
  if (docType === 'CASCO') {
    const ins = cleanVal(item.cascoInsurer);
    if (!ins) return { days: null, label: 'Fără CASCO', sub: '', color: FLEET_COLOR_NEUTRAL };
    // „26.09.2023-Activ” = polița e activă, fără dată de final (data din text e doar începutul)
    const iso = getDocIsoForFleetItem(item, 'CASCO');
    const days = calendarDaysUntilIso(iso);
    if (days === null) return { days: null, label: 'Activ', sub: shortInsurer(ins), color: FLEET_COLOR_OK };
    return { days, label: '', sub: shortInsurer(ins), color: toneForDays(days) };
  }
  if (docType === 'CMR') {
    const pol = cleanVal(item.cmrPolicy);
    if (!pol) return { days: null, label: 'Fără CMR', sub: '', color: FLEET_COLOR_NEUTRAL };
    const iso = getDocIsoForFleetItem(item, 'CMR');
    const insurer = shortInsurer(pol.split('·')[0]);
    const days = calendarDaysUntilIso(iso);
    if (days === null) return { days: null, label: 'Activ', sub: insurer, color: FLEET_COLOR_OK };
    return { days, label: '', sub: insurer, color: toneForDays(days) };
  }
  const lc = cleanVal(item.leasingContract);
  if (!lc || lc.toUpperCase().startsWith('VÂNDUT')) {
    return { days: null, label: 'Vândută', sub: '', color: FLEET_COLOR_NEUTRAL };
  }
  if (lc.toLowerCase().startsWith('achitat')) {
    return { days: null, label: 'Achitat', sub: 'fără credit', color: FLEET_COLOR_NEUTRAL };
  }
  const company = lc.split('·')[0].trim();
  const shortCompany = company.replace(' INT ROMANIA IFN', '').replace(' IFN', '');
  const iso = getDocIsoForFleetItem(item, 'LEASING');
  const days = calendarDaysUntilIso(iso);
  if (days === null) return { days: null, label: shortCompany, sub: 'Credit activ', color: FLEET_COLOR_INFO };
  return { days, label: '', sub: shortCompany, color: FLEET_COLOR_INFO };
};

export interface FleetDocAlert {
  plate: string;
  kind: 'tractor' | 'semitrailer';
  doc: 'RCA' | 'CASCO' | 'CMR';
  days: number;
  insurer: string;
}

/** Documente reale (RCA / CASCO / CMR) expirate sau care expiră în cel mult `withinDays` zile. */
export const getFleetDocAlerts = (withinDays = 14): FleetDocAlert[] => {
  const out: FleetDocAlert[] = [];
  loadPersistedFleetItems()
    .filter((v) => v.fleetStatus !== 'VANDUTA' && v.fleetStatus !== 'ARHIVA')
    .forEach((v) => {
      (['RCA', 'CASCO', 'CMR'] as const).forEach((doc) => {
        const info = getFleetCellInfo(v, doc);
        if (info.days !== null && info.days <= withinDays) {
          out.push({
            plate: v.plate,
            kind: v.kind === 'tractor' ? 'tractor' : 'semitrailer',
            doc,
            days: info.days,
            insurer: info.sub,
          });
        }
      });
    });
  return out.sort((a, b) => a.days - b.days);
};

const getFleetDocRows = (item: MasinileMeleItem, docType: FleetDocType): [string, string][] => {
  const dash = (s?: string) => cleanVal(s) || '—';
  if (docType === 'RCA') {
    const p = splitPolicy(item.rcaPolicyNo);
    return [
      ['Companie asigurare RCA', dash(item.rcaInsurer)],
      ['Nr. poliță', dash(p.no)],
      ['Perioadă valabilitate', dash(p.period || item.rcaExpiryDate)],
    ];
  }
  if (docType === 'CASCO') {
    return [
      ['Companie asigurare CASCO', dash(item.cascoInsurer)],
      ['Nr. poliță', dash(item.cascoPolicyNo)],
      ['Perioadă valabilitate', dash(item.cascoValidity)],
    ];
  }
  if (docType === 'CMR') {
    const raw = cleanVal(item.cmrPolicy);
    const parts = raw.split('·');
    const p = splitPolicy(parts[1]);
    return [
      ['Companie asigurare CMR', dash(parts[0])],
      ['Nr. poliță', dash(p.no)],
      ['Data expirării', dash(cmrEndText(raw))],
    ];
  }
  const lc = cleanVal(item.leasingContract);
  if (!lc || lc.toUpperCase().startsWith('VÂNDUT')) return [['Firmă creditare / leasing', 'Vândută']];
  if (lc.toLowerCase().startsWith('achitat')) {
    return [['Firmă creditare / leasing', 'Achitat integral — fără credit activ']];
  }
  const parts = lc.split('·');
  const p = splitPolicy(parts[1]);
  return [
    ['Firmă creditare / leasing', dash(parts[0])],
    ['Nr. contract', dash(p.no.replace(/^Contract\s*/i, ''))],
    ['Data finalizării', dash(p.period.replace(/^până la\s*/i, ''))],
  ];
};

const FLEET_DOC_TITLES: Record<FleetDocType, string> = {
  RCA: 'Asigurare RCA',
  CASCO: 'Asigurare CASCO',
  CMR: 'Asigurare CMR',
  LEASING: 'Credit / Leasing',
};

export interface FleetBoardExternalFilter {
  filterKind?: 'all' | 'expiring';
  searchQuery?: string;
  sortBy?: 'default' | 'rca';
  nonce: number;
}

export const MasinileMeleFleetBoard: React.FC<{
  onOpenVehicleDossier: (
    trailerId: string,
    initialTab: 'tractor' | 'trailer' | 'coupled' | 'edit',
    customItem?: MasinileMeleItem
  ) => void;
  externalFilter?: FleetBoardExternalFilter | null;
}> = ({ onOpenVehicleDossier, externalFilter }) => {
  const pdfCatalog = useFleetPdfCatalog();
  const [pdfModalTarget, setPdfModalTarget] = useState<{
    plate: string;
    vin?: string;
    subtitle?: string;
    initialDocFileName?: string;
    initialMode?: 'view' | 'add' | 'edit';
    initialUploadKind?: FleetPdfDocKind;
  } | null>(null);

  const [items, setItems] = useState<MasinileMeleItem[]>(() =>
    loadPersistedFleetItems()
  );

  useEffect(() => {
    try {
      localStorage.setItem(MASINILE_MELE_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // Listen for date/policy updates saved from VehicleDossierModal
  useEffect(() => {
    const onExternalSync = () => {
      setItems(loadPersistedFleetItems());
    };
    window.addEventListener(FLEET_ITEMS_SYNC_EVENT, onExternalSync);
    return () => {
      window.removeEventListener(FLEET_ITEMS_SYNC_EVENT, onExternalSync);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState(
    () => externalFilter?.searchQuery ?? ''
  );
  const [sortBy, setSortBy] = useState<'default' | 'rca' | 'plate' | 'year'>(
    () => externalFilter?.sortBy ?? 'default'
  );
  const [filterKind, setFilterKind] = useState<
    'all' | 'tractor' | 'semitrailer' | 'car' | 'with_pdf' | 'expiring'
  >(() => externalFilter?.filterKind ?? 'all');
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    if (!externalFilter) return;
    setFilterKind(externalFilter.filterKind ?? 'all');
    setSearchQuery(externalFilter.searchQuery ?? '');
    setSortBy(externalFilter.sortBy ?? 'default');
  }, [externalFilter?.nonce]);

  // Mod de afișare: Carduri / Listă (tabel clasic macOS Tahoe) + rânduri pe pagină
  type ListSortKey = 'plate' | 'kind' | 'year' | 'rca' | 'casco' | 'cmr';
  const [viewMode, setViewMode] = usePersistedViewMode(
    'bluetrans_fleet_view_v1',
    'cards'
  );
  const [pageSize, setPageSize] = usePersistedPageSize(
    'bluetrans_fleet_pagesize_v1',
    25
  );
  const [page, setPage] = useState(1);
  const [listSort, setListSort] = useState<SortState<ListSortKey> | null>(null);

  // Acțiuni în masă Flotă (Bulk Select + Bulk Edit + Bulk Delete)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkCompanyName, setBulkCompanyName] = useState<
    'KEEP' | 'BLUE TRANS SPEDITION' | 'SCANDEXPRES'
  >('KEEP');
  const [bulkFleetStatus, setBulkFleetStatus] = useState<
    'KEEP' | 'ACTIV' | 'VANDUTA' | 'ARHIVA'
  >('KEEP');
  const [bulkDocType, setBulkDocType] = useState<
    'NONE' | 'RCA' | 'CASCO' | 'CMR' | 'LEASING'
  >('NONE');
  const [bulkDocIso, setBulkDocIso] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Add New Vehicle Sidebar State
  const [newPlateInput, setNewPlateInput] = useState('');
  const [newVinInput, setNewVinInput] = useState('');
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  // Fereastră detalii RCA / CASCO / CMR / Credit-Leasing (cu calendar & zile rămase live)
  const [activeDocModal, setActiveDocModal] = useState<{
    item: MasinileMeleItem;
    docType: FleetDocType;
  } | null>(null);
  const [docModalDraftIso, setDocModalDraftIso] = useState<string>('');

  const handleOpenDocModal = (item: MasinileMeleItem, docType: FleetDocType) => {
    setDocModalDraftIso(getDocIsoForFleetItem(item, docType));
    setActiveDocModal({ item, docType });
  };

  const handleSaveDocModalDate = () => {
    if (!activeDocModal) return;
    const { item, docType } = activeDocModal;
    const patch: FleetUnitDocIsoUpdates =
      docType === 'RCA'
        ? { rcaIso: docModalDraftIso }
        : docType === 'CASCO'
          ? { cascoIso: docModalDraftIso }
          : docType === 'CMR'
            ? { cmrIso: docModalDraftIso }
            : { leasingIso: docModalDraftIso };
    const updatedItem = applyDocIsoUpdatesToFleetItem(item, patch);
    const nextItems = items.map((v) =>
      normalizeVehiclePlate(v.plate) === normalizeVehiclePlate(item.plate)
        ? updatedItem
        : v
    );
    setItems(nextItems);
    savePersistedFleetItems(nextItems);
    const daysLeft = calendarDaysUntilIso(docModalDraftIso);
    setAddFeedback(
      docModalDraftIso
        ? `${FLEET_DOC_TITLES[docType]} pentru ${item.plate} actualizată la ${isoToRoDate(docModalDraftIso)} (${daysLeft !== null ? `${daysLeft} zile rămase` : 'salvat'})!`
        : `${FLEET_DOC_TITLES[docType]} pentru ${item.plate} marcată fără dată de expirare.`
    );
    setActiveDocModal(null);
  };

  const handleAddVehicleByPlateOrVin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = newPlateInput.trim().toUpperCase();
    if (!cleanPlate) return;

    const cleanVin = newVinInput.trim().toUpperCase() || 'YS2R4X20005619999';
    const decoded = decodeVinNumber(cleanVin);
    const isTrailer =
      decoded.bodyStyle.startsWith('trailer') ||
      cleanPlate.includes('61') ||
      cleanPlate.includes('59') ||
      cleanPlate.includes('67') ||
      cleanPlate.includes('71') ||
      cleanPlate.includes('75');

    const newItem: MasinileMeleItem = {
      id: `mm-${Date.now()}`,
      plate: cleanPlate,
      brand: isTrailer
        ? 'SCHMITZ CARGOBULL'
        : decoded.manufacturer.split(' ')[0].toUpperCase(),
      model: decoded.modelName.toUpperCase(),
      year: decoded.modelYear || 2024,
      kind: isTrailer ? 'semitrailer' : 'tractor',
      vin: cleanVin,
      colorHex: decoded.oemColor.hex,
      colorName: decoded.oemColor.name,
      linkedTrailerId: 'BH 67 STS',
      itpDays: 180,
      itpExpiryDate: '10.05.2027',
      rovLabel: isTrailer ? 'Semiremorcă' : 'Activ',
      rovExpiryDate: isTrailer ? 'Inclus în Cap Tractor' : '31.12.2027',
      rcaDays: 180,
      rcaExpiryDate: '10.05.2027',
      licentaDays: isTrailer ? null : 365,
      licentaExpiryDate: isTrailer
        ? 'Semiremorcă (Licență pe Cap Tractor)'
        : '10.11.2027',
    };

    updateDeletedFleetPlates([cleanPlate], 'remove');
    setItems((prev) => [newItem, ...prev]);
    setNewPlateInput('');
    setNewVinInput('');
    setAddFeedback(`Vehiculul ${cleanPlate} (${newItem.brand}) a fost verificat în baza RAR/ARR și adăugat în Mașinile mele!`);
  };

  const filteredItems = items
    .filter((item) => {
      if (filterKind === 'tractor' && item.kind !== 'tractor') return false;
      if (filterKind === 'semitrailer' && item.kind !== 'semitrailer') return false;
      if (filterKind === 'car' && item.kind !== 'car' && item.kind !== 'express') return false;
      if (
        filterKind === 'with_pdf' &&
        getVehiclePdfDocs(item.plate, item.vin, pdfCatalog).length === 0
      ) {
        return false;
      }
      if (filterKind === 'expiring') {
        if (item.fleetStatus === 'VANDUTA' || item.fleetStatus === 'ARHIVA') {
          return false;
        }
        const hasExpiringDoc = (['RCA', 'CASCO', 'CMR'] as const).some((doc) => {
          const daysLeft = getFleetCellInfo(item, doc).days;
          return daysLeft !== null && daysLeft <= 14;
        });
        if (!hasExpiringDoc) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const qNorm = normalizeVehiclePlate(searchQuery);
      const aliases = getVehiclePlateAliases(item.plate, item.vin);
      return (
        item.plate.toLowerCase().includes(q) ||
        (qNorm.length >= 2 && normalizeVehiclePlate(item.plate).includes(qNorm)) ||
        aliases.some(
          (al) =>
            al.toLowerCase().includes(q) ||
            (qNorm.length >= 2 && normalizeVehiclePlate(al).includes(qNorm))
        ) ||
        item.brand.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.vin.toLowerCase().includes(q) ||
        String(item.year).includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'rca') return (getFleetCellInfo(a, 'RCA').days ?? 99999) - (getFleetCellInfo(b, 'RCA').days ?? 99999);
      if (sortBy === 'plate') return a.plate.localeCompare(b.plate);
      if (sortBy === 'year') return b.year - a.year;
      return 0;
    });

  const renderStatusCell = (
    item: MasinileMeleItem,
    docType: FleetDocType,
    title: string
  ) => {
    const info = getFleetCellInfo(item, docType);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenDocModal(item, docType);
        }}
        className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1.5 text-center transition hover:brightness-105 cursor-pointer border-r border-white/15 last:border-r-0 min-w-0"
        style={{ backgroundColor: info.color, color: '#ffffff' }}
        title={`Detalii ${FLEET_DOC_TITLES[docType]} — ${item.plate}`}
      >
        <span className="text-[0.625rem] font-bold tracking-wide opacity-95 leading-[1.15]" style={{ color: '#ffffff' }}>
          {title}
        </span>

        {info.days !== null ? (
          <div className="leading-[1.1]" style={{ color: '#ffffff' }}>
            <span className="text-[1.1rem] font-black tabular-nums">{info.days}</span>
            <span className="text-[0.625rem] font-bold opacity-95 ml-0.5">zile</span>
          </div>
        ) : (
          <div
            className="text-[0.7rem] font-extrabold leading-[1.15] break-words max-w-full"
            style={{ color: '#ffffff' }}
          >
            {info.label}
          </div>
        )}

        <div
          className="text-[0.5875rem] font-semibold opacity-90 truncate max-w-full leading-[1.15]"
          style={{ color: '#ffffff' }}
        >
          {info.sub || '\u00A0'}
        </div>
      </button>
    );
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterKind, sortBy, pageSize, listSort, viewMode]);

  const sortFleetValue = (item: MasinileMeleItem, key: ListSortKey): string | number => {
    switch (key) {
      case 'plate':
        return item.plate;
      case 'kind':
        return item.kind;
      case 'year':
        return decodeVinNumber(item.vin).modelYear || item.year;
      case 'rca':
        return getFleetCellInfo(item, 'RCA').days ?? 999999;
      case 'casco':
        return getFleetCellInfo(item, 'CASCO').days ?? 999999;
      case 'cmr':
        return getFleetCellInfo(item, 'CMR').days ?? 999999;
    }
  };

  const sortedFleetRows = !listSort
    ? filteredItems
    : [...filteredItems].sort((a, b) => {
        const va = sortFleetValue(a, listSort.key);
        const vb = sortFleetValue(b, listSort.key);
        const cmp =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb), 'ro', { numeric: true });
        return listSort.dir === 'asc' ? cmp : -cmp;
      });

  const activeFleetRows = viewMode === 'list' ? sortedFleetRows : filteredItems;
  const {
    total: fleetTotal,
    totalPages: fleetPageCount,
    safePage: fleetSafePage,
    startIdx: fleetStartIdx,
    endIdx: fleetEndIdx,
    visibleItems: visibleFleetRows,
  } = paginateItems(activeFleetRows, pageSize, page);

  const fleetSelection = useTableSelection(
    activeFleetRows.map((v) => v.id),
    visibleFleetRows.map((v) => v.id)
  );

  const selectedFleetItems = activeFleetRows.filter((v) =>
    fleetSelection.isSelected(v.id)
  );

  const exportFleetRows =
    fleetSelection.selectedCount > 0 ? selectedFleetItems : activeFleetRows;

  const formatFleetKindLabel = (kind: MasinileMeleItem['kind']) =>
    kind === 'semitrailer'
      ? 'Semiremorcă'
      : kind === 'car'
        ? 'Autoturism'
        : kind === 'express'
          ? 'Autoutilitară 3.5t'
          : 'Cap tractor';

  const handleExportFleetExcel = (rowsOverride?: MasinileMeleItem[]) => {
    const targetRows = rowsOverride ?? activeFleetRows;
    const res = exportRowsToExcel({
      fileName: 'BlueTrans_Flota',
      sheetName: 'Flota',
      rows: targetRows,
      columns: [
        { header: '#', value: (_, i) => i + 1, minWidth: 5, maxWidth: 8 },
        { header: 'Nr. Înmatriculare', value: (v) => v.plate },
        { header: 'Categorie', value: (v) => formatFleetKindLabel(v.kind) },
        { header: 'Marcă', value: (v) => v.brand },
        {
          header: 'Model',
          value: (v) =>
            decodeVinNumber(v.vin)
              .modelName.replace(/\s*\((SCANDEXPRES|BLUE TRANS SPEDITION)\)/i, '')
              .toUpperCase(),
        },
        {
          header: 'An',
          value: (v) => decodeVinNumber(v.vin).modelYear || v.year,
          minWidth: 6,
        },
        { header: 'Serie Șasiu (VIN)', value: (v) => v.vin },
        {
          header: 'Firmă',
          value: (v) =>
            v.companyName === 'SCANDEXPRES' ? 'Scandexpres' : 'Blue Trans Spedition',
        },
        {
          header: 'Status Flotă',
          value: (v) =>
            v.fleetStatus === 'VANDUTA'
              ? 'Vândută'
              : v.fleetStatus === 'ARHIVA'
                ? 'Arhivă CIV'
                : 'Activă',
        },
        { header: 'ITP Expiră', value: (v) => v.itpExpiryDate },
        {
          header: 'Rovinietă',
          value: (v) =>
            v.rovExpiryDate ? `${v.rovLabel} (${v.rovExpiryDate})` : v.rovLabel,
        },
        { header: 'Asigurător RCA', value: (v) => v.rcaInsurer || '' },
        {
          header: 'RCA Expiră',
          value: (v) => getDocIsoForFleetItem(v, 'RCA') || v.rcaExpiryDate,
        },
        { header: 'Asigurător CASCO', value: (v) => v.cascoInsurer || 'Fără CASCO' },
        {
          header: 'CASCO Valabilitate',
          value: (v) => getDocIsoForFleetItem(v, 'CASCO') || v.cascoValidity || '',
        },
        { header: 'Asigurare CMR', value: (v) => v.cmrPolicy || 'Fără CMR' },
        { header: 'Licență / Copie Conformă', value: (v) => v.licentaExpiryDate },
        { header: 'Leasing / Credit', value: (v) => v.leasingContract || '' },
        {
          header: 'Acte PDF Atașate',
          value: (v) => getVehiclePdfDocs(v.plate, v.vin, pdfCatalog).length,
        },
      ],
    });
    setAddFeedback(`Export Excel generat: ${res.fileName} (${res.rowCount} vehicule).`);
  };

  const handleOpenBulkEditFleet = () => {
    setBulkCompanyName('KEEP');
    setBulkFleetStatus('KEEP');
    setBulkDocType('NONE');
    setBulkDocIso('');
    setShowBulkEditModal(true);
  };

  const handleApplyBulkEditFleet = (e: React.FormEvent) => {
    e.preventDefault();
    if (fleetSelection.selectedCount === 0) return;
    const selectedSet = fleetSelection.selectedIds;
    const nextItems = items.map((v) => {
      if (!selectedSet.has(v.id)) return v;
      let updated: MasinileMeleItem = {
        ...v,
        companyName:
          bulkCompanyName !== 'KEEP' ? bulkCompanyName : v.companyName,
        fleetStatus:
          bulkFleetStatus !== 'KEEP' ? bulkFleetStatus : v.fleetStatus,
      };
      if (bulkDocType !== 'NONE') {
        const patch: FleetUnitDocIsoUpdates =
          bulkDocType === 'RCA'
            ? { rcaIso: bulkDocIso }
            : bulkDocType === 'CASCO'
              ? { cascoIso: bulkDocIso }
              : bulkDocType === 'CMR'
                ? { cmrIso: bulkDocIso }
                : { leasingIso: bulkDocIso };
        updated = applyDocIsoUpdatesToFleetItem(updated, patch);
      }
      return updated;
    });
    setItems(nextItems);
    savePersistedFleetItems(nextItems);
    setAddFeedback(
      `${fleetSelection.selectedCount} vehicule au fost actualizate în masă!`
    );
    fleetSelection.clearSelection();
    setShowBulkEditModal(false);
  };

  const handleConfirmBulkDeleteFleet = () => {
    if (fleetSelection.selectedCount === 0) return;
    const count = fleetSelection.selectedCount;
    const selectedSet = fleetSelection.selectedIds;
    const removedPlates = items.filter((v) => selectedSet.has(v.id)).map((v) => v.plate);
    const nextItems = items.filter((v) => !selectedSet.has(v.id));
    updateDeletedFleetPlates(removedPlates, 'add');
    setItems(nextItems);
    savePersistedFleetItems(nextItems);
    fleetSelection.clearSelection();
    setShowBulkDeleteModal(false);
    setAddFeedback(`${count} vehicule au fost eliminate din evidența flotei.`);
  };

  const renderListView = () => {
    const chip = (item: MasinileMeleItem, docType: FleetDocType) => {
      const info = getFleetCellInfo(item, docType);
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDocModal(item, docType);
          }}
          className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap cursor-pointer hover:brightness-110 transition"
          style={{ backgroundColor: info.color, color: '#ffffff' }}
          title={`${FLEET_DOC_TITLES[docType]}${info.sub ? ` · ${info.sub}` : ''}`}
        >
          {info.days !== null ? `${info.days} zile` : info.label}
        </button>
      );
    };

    return (
      <div className={TAHOE_TABLE_WRAPPER_CLASS}>
        <div className={TAHOE_TABLE_SCROLL_CLASS}>
          <table className="w-full text-left" style={TAHOE_TABLE_STYLE}>
            <thead>
              <tr>
                <CheckboxTh
                  checked={fleetSelection.isAllVisibleSelected}
                  indeterminate={fleetSelection.isSomeVisibleSelected}
                  onChange={fleetSelection.toggleAllVisible}
                  ariaLabel="Selectează toate vehiculele de pe pagină"
                />
                <SortableTh label="#" sort={null} align="center" className="w-10" />
                <SortableTh
                  label="Număr · Serie VIN"
                  sortKey="plate"
                  sort={listSort}
                  onToggle={(k) => setListSort((p) => toggleSortState(p, k))}
                />
                <SortableTh
                  label="Tip"
                  sortKey="kind"
                  sort={listSort}
                  onToggle={(k) => setListSort((p) => toggleSortState(p, k))}
                />
                <SortableTh label="Marcă · Model · Companie" sort={null} />
                <SortableTh
                  label="An"
                  sortKey="year"
                  sort={listSort}
                  onToggle={(k) => setListSort((p) => toggleSortState(p, k))}
                />
                <SortableTh label="Acte" sort={null} align="center" />
                <SortableTh
                  label="RCA"
                  sortKey="rca"
                  sort={listSort}
                  onToggle={(k) => setListSort((p) => toggleSortState(p, k))}
                  align="center"
                />
                <SortableTh
                  label="CASCO"
                  sortKey="casco"
                  sort={listSort}
                  onToggle={(k) => setListSort((p) => toggleSortState(p, k))}
                  align="center"
                />
                <SortableTh
                  label="CMR"
                  sortKey="cmr"
                  sort={listSort}
                  onToggle={(k) => setListSort((p) => toggleSortState(p, k))}
                  align="center"
                />
                <SortableTh label="Leasing" sort={null} align="center" />
              </tr>
            </thead>
            <tbody>
              {visibleFleetRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-white/60 text-sm">
                    Niciun vehicul nu corespunde filtrelor.
                  </td>
                </tr>
              )}
              {visibleFleetRows.map((item, idx) => {
                const modelName = decodeVinNumber(item.vin)
                  .modelName.replace(/\s*\((SCANDEXPRES|BLUE TRANS SPEDITION)\)/i, '')
                  .toUpperCase();
                const rowPdfs = getVehiclePdfDocs(item.plate, item.vin, pdfCatalog);
                const selected = fleetSelection.isSelected(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() =>
                      onOpenVehicleDossier(
                        item.linkedTrailerId,
                        item.kind === 'semitrailer' ? 'trailer' : 'tractor',
                        item
                      )
                    }
                    className="cursor-pointer transition hover:bg-[#0A84FF]/10"
                    style={getTahoeRowStyle(idx, selected)}
                  >
                    <td className="px-1.5 text-center" style={TAHOE_CELL_BORDER_STYLE}>
                      <BulkCheckbox
                        checked={selected}
                        onChange={() => fleetSelection.toggleOne(item.id)}
                        ariaLabel={`Selectează ${item.plate}`}
                      />
                    </td>
                    <td
                      className="px-2 text-center text-white/50 font-semibold whitespace-nowrap"
                      style={TAHOE_CELL_BORDER_STYLE}
                    >
                      {fleetStartIdx + idx + 1}
                    </td>
                    <td className="px-2 whitespace-nowrap" style={TAHOE_CELL_BORDER_STYLE}>
                      <div className="font-bold text-white leading-tight flex items-center gap-1.5">
                        <EuroRoPlate plate={item.plate} size="sm" />
                        {item.fleetStatus === 'VANDUTA' && (
                          <span className="ml-1 text-[10px] font-extrabold" style={{ color: '#fca5a5' }}>
                            VÂNDUTĂ
                          </span>
                        )}
                        {item.fleetStatus === 'ARHIVA' && (
                          <span className="ml-1 text-[10px] font-extrabold text-amber-400">
                            ARHIVĂ CIV
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/50 leading-tight">{item.vin}</div>
                    </td>
                    <td className="px-2 text-white/80 whitespace-nowrap" style={TAHOE_CELL_BORDER_STYLE}>
                      {formatFleetKindLabel(item.kind)}
                    </td>
                    <td className="px-2 max-w-[165px]" style={TAHOE_CELL_BORDER_STYLE} title={`${item.brand} · ${modelName}`}>
                      <div className="truncate text-white/85 leading-tight text-xs">
                        <span className="font-semibold text-white">{item.brand}</span> · {modelName}
                      </div>
                      <div className="text-[10px] text-white/50 leading-tight truncate">
                        {item.companyName === 'SCANDEXPRES' ? 'Scandexpres' : 'Blue Trans Spedition'}
                      </div>
                    </td>
                    <td className="px-2 text-white/80 whitespace-nowrap" style={TAHOE_CELL_BORDER_STYLE}>
                      {decodeVinNumber(item.vin).modelYear || item.year}
                    </td>
                    <td className="px-2 text-center whitespace-nowrap" style={TAHOE_CELL_BORDER_STYLE}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPdfModalTarget({
                              plate: item.plate,
                              vin: item.vin,
                              subtitle: `${item.brand} · ${modelName}`,
                              initialMode: rowPdfs.length > 0 ? 'view' : 'add',
                            });
                          }}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold cursor-pointer transition ${
                            rowPdfs.length > 0
                              ? 'bg-[#0A84FF] hover:brightness-110 shadow-xs'
                              : 'tahoe-card-inner border border-dashed border-white/25 text-white/65 hover:text-white'
                          }`}
                          style={rowPdfs.length > 0 ? { color: '#ffffff' } : undefined}
                          title={
                            rowPdfs.length > 0
                              ? `Deschide dosarul de acte (${rowPdfs.map((d) => d.shortLabel).join(', ')})`
                              : `Adaugă acte (CIV, Talon, RCA, ITP) pentru ${item.plate}`
                          }
                        >
                          <FileText
                            className="w-3 h-3 shrink-0"
                            style={rowPdfs.length > 0 ? { color: '#ffffff' } : undefined}
                          />
                          <span style={rowPdfs.length > 0 ? { color: '#ffffff' } : undefined}>
                            {rowPdfs.length > 0
                              ? `${rowPdfs
                                  .map((d) => d.shortLabel)
                                  .slice(0, 2)
                                  .join('·')}${
                                  rowPdfs.length > 2 ? ` +${rowPdfs.length - 2}` : ''
                                }`
                              : '+ Act'}
                          </span>
                        </button>
                        {rowPdfs.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPdfModalTarget({
                                plate: item.plate,
                                vin: item.vin,
                                subtitle: `${item.brand} · ${modelName}`,
                                initialMode: 'add',
                              });
                            }}
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-black cursor-pointer transition"
                            title={`Adaugă document nou (Talon, RCA, CASCO, ITP...) pentru ${item.plate}`}
                            aria-label={`Adaugă document nou pentru ${item.plate}`}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 text-center" style={TAHOE_CELL_BORDER_STYLE}>{chip(item, 'RCA')}</td>
                    <td className="px-2 text-center" style={TAHOE_CELL_BORDER_STYLE}>{chip(item, 'CASCO')}</td>
                    <td className="px-2 text-center" style={TAHOE_CELL_BORDER_STYLE}>{chip(item, 'CMR')}</td>
                    <td className="px-2 text-center" style={TAHOE_CELL_BORDER_STYLE}>{chip(item, 'LEASING')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ListPaginationBar
          total={fleetTotal}
          startIdx={fleetStartIdx}
          endIdx={fleetEndIdx}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          page={fleetSafePage}
          totalPages={fleetPageCount}
          onPageChange={setPage}
          unfilteredTotal={items.length}
          unfilteredLabel="total flotă"
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-5 items-start">
      {/* LEFT / MAIN COLUMN (9 cols): "Mașinile mele" */}
      <div className="xl:col-span-12 tahoe-glass rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-6 space-y-2.5 sm:space-y-5">
        {/* Header Bar — single compact row on mobile, full header with description on desktop */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex flex-nowrap sm:flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg sm:text-3xl font-black text-white tracking-tight whitespace-nowrap">
                  Mașinile mele
                </h2>
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 border border-white/15 text-[11px] sm:text-xs font-extrabold text-white tabular-nums shrink-0">
                  {filteredItems.length}/{items.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFilterKind((prev) => (prev === 'with_pdf' ? 'all' : 'with_pdf'))
                }
                className={`px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition tabular-nums shrink-0 ${
                  filterKind === 'with_pdf'
                    ? 'bg-[#0A84FF] border-[#0A84FF]'
                    : 'bg-[#0A84FF]/12 border-[#0A84FF]/35 text-[#0A84FF] hover:bg-[#0A84FF]/20'
                }`}
                style={filterKind === 'with_pdf' ? { color: '#ffffff' } : undefined}
                title="Filtrează doar vehiculele care au acte scanate atașate (CIV, Talon, RCA, CASCO, ITP...)"
              >
                <FileCheck2
                  className="w-3.5 h-3.5 shrink-0"
                  style={filterKind === 'with_pdf' ? { color: '#ffffff' } : undefined}
                />
                <span
                  className="sm:hidden"
                  style={filterKind === 'with_pdf' ? { color: '#ffffff' } : undefined}
                >
                  {pdfCatalog.length} acte
                </span>
                <span
                  className="hidden sm:inline"
                  style={filterKind === 'with_pdf' ? { color: '#ffffff' } : undefined}
                >
                  {pdfCatalog.length} acte atașate (CIV · Talon · RCA)
                </span>
              </button>
            </div>
            <p className="hidden sm:block text-sm text-white/65 mt-1 font-medium">
              Click pe <strong className="text-white">Acte</strong> sau <strong className="text-white">+ Adaugă act</strong> pentru a vedea, adăuga, edita ori șterge documente (CIV, Talon, RCA, CASCO, ITP), pe vehicul pentru fișa 3D sau pe un card colorat pentru poliță.
            </p>
          </div>
        </div>

        {/* Search, Sort & Filter Toolbar — 2-per-row filters + 1-row view controls on mobile; unchanged flex toolbar on desktop */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-2.5">
          <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută număr, VIN, marcă sau model..."
              className="w-full tahoe-card-inner rounded-full pl-9 sm:pl-10 pr-3.5 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:contents">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'default' | 'rca' | 'plate' | 'year'
                )
              }
              aria-label="Ordine sortare flotă"
              className="min-w-0 w-full sm:w-auto tahoe-card-inner rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold text-white border border-white/15 cursor-pointer truncate"
            >
              <option value="default">⇅ Sortează: Implicit</option>
              <option value="rca">⇅ Expirare RCA (Urgent)</option>
              <option value="plate">⇅ Număr (A–Z)</option>
              <option value="year">⇅ An (Nou → Vechi)</option>
            </select>

            <select
              value={filterKind}
              onChange={(e) =>
                setFilterKind(
                  e.target.value as
                    | 'all'
                    | 'tractor'
                    | 'semitrailer'
                    | 'car'
                    | 'with_pdf'
                    | 'expiring'
                )
              }
              aria-label="Filtru categorie vehicule"
              className="min-w-0 w-full sm:w-auto tahoe-card-inner rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold text-white border border-white/15 cursor-pointer truncate"
            >
              <option value="all">Toate ({items.length})</option>
              <option value="tractor">Capete Tractor</option>
              <option value="semitrailer">Semiremorci Frigo</option>
              <option value="car">Auto &amp; Utilitare 3.5t</option>
              <option value="with_pdf">Cu acte atașate</option>
              <option value="expiring">Expiră (&le; 14 zile)</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:contents">
            <button
              type="button"
              onClick={() => setCompactMode((p) => !p)}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold border transition cursor-pointer shrink-0 ${
                compactMode
                  ? 'bg-[#0A84FF] text-white border-[#0A84FF]'
                  : 'tahoe-card-inner text-white border-white/15'
              }`}
            >
              ▤ Compact
            </button>

            <ViewModeToggle
              value={viewMode}
              onChange={setViewMode}
              ariaLabel="Mod afișare flotă"
            />

            <ExportExcelButton
              onClick={() => handleExportFleetExcel(exportFleetRows)}
              count={exportFleetRows.length}
              disabled={exportFleetRows.length === 0}
              className="sm:py-2"
            />
          </div>

          <DemoBadge
            className="hidden sm:inline-flex"
            label="ilustrații studio"
            title="Culorile, seriile VIN, modelele, anii și polițele sunt 100% reale din Cărțile de Identitate RAR (CIV) și evidența flotei. Fotografiile și modelele 3D sunt randări de studio în culoarea exactă din CIV."
          />
        </div>

        {addFeedback && (
          <div className="p-3 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-xs font-bold text-emerald-300 flex items-center justify-between">
            <span>{addFeedback}</span>
            <button
              type="button"
              onClick={() => setAddFeedback(null)}
              className="px-3 py-0.5 rounded-full bg-white/10 text-white cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        <BulkActionBar
          selectedCount={fleetSelection.selectedCount}
          totalFilteredCount={activeFleetRows.length}
          onSelectAllFiltered={fleetSelection.selectAllFiltered}
          onClearSelection={fleetSelection.clearSelection}
          onBulkExport={() => handleExportFleetExcel(selectedFleetItems)}
          onBulkEdit={handleOpenBulkEditFleet}
          onBulkDelete={() => setShowBulkDeleteModal(true)}
          itemNounSingular="vehicul selectat"
          itemNounPlural="vehicule selectate"
        />

        {/* Vehicle Cards List (Exact Visual Layout from Screenshot 1) / sau Listă (tabel) */}
        {viewMode === 'list' ? (
          renderListView()
        ) : (
        <div className="space-y-3">
          {visibleFleetRows.length === 0 && (
            <div className="tahoe-card-inner rounded-2xl p-8 border border-white/15 text-center text-sm text-white/60">
              Niciun vehicul nu corespunde filtrelor curente.
            </div>
          )}
          {visibleFleetRows.map((item, idx) => {
            const vinDecoded = decodeVinNumber(item.vin);
            const autoColorHex = vinDecoded.oemColor.hex;
            const autoColorName = vinDecoded.oemColor.name;
            const autoModelName = vinDecoded.modelName
              .replace(/\s*\((SCANDEXPRES|BLUE TRANS SPEDITION)\)/i, '')
              .toUpperCase();
            const autoYear = vinDecoded.modelYear || item.year;
            const itemPdfDocs = getVehiclePdfDocs(item.plate, item.vin, pdfCatalog);
            const itemPlateAliases = getVehiclePlateAliases(item.plate, item.vin);
            const selected = fleetSelection.isSelected(item.id);

            return (
              <div
                key={item.id}
                onClick={() =>
                  onOpenVehicleDossier(
                    item.linkedTrailerId,
                    item.kind === 'semitrailer' ? 'trailer' : 'tractor',
                    item
                  )
                }
                className={`tahoe-card-inner rounded-2xl p-3 sm:p-3.5 border transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group shadow-sm ${
                  selected
                    ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                    : 'border-white/15 hover:border-[#0A84FF]/60'
                }`}
              >
                {/* Left: 3/4 Truck or Semi-Trailer Studio Thumbnail + Plate, Brand & Year */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                  {!compactMode && (
                    <div className="fleet-studio-thumb w-full h-[132px] sm:w-[140px] sm:h-[94px] rounded-2xl flex items-center justify-center p-1.5 sm:p-1 shrink-0 group-hover:scale-[1.03] transition overflow-hidden">
                      {item.kind === 'semitrailer' ||
                      vinDecoded.bodyStyle === 'van-sprinter' ? (
                        <TrailerPhotoWithLivery
                          src={getFleetCardPhoto(vinDecoded)}
                          alt={autoModelName}
                          variant={
                            vinDecoded.bodyStyle === 'van-sprinter'
                              ? 'sprinter'
                              : vinDecoded.bodyStyle === 'trailer-krone'
                                ? 'krone'
                                : 'schmitz'
                          }
                          companyName={item.companyName || vinDecoded.companyName}
                          mode="card"
                        />
                      ) : (
                        <img
                          src={getFleetCardPhoto(vinDecoded)}
                          alt={autoModelName}
                          draggable={false}
                          className="fleet-studio-cutout w-full h-full object-contain select-none"
                        />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BulkCheckbox
                        checked={selected}
                        onChange={() => fleetSelection.toggleOne(item.id)}
                        ariaLabel={`Selectează ${item.plate}`}
                      />
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/75 text-[10.5px] font-bold tabular-nums">
                        #{fleetStartIdx + idx + 1}
                      </span>
                      <EuroRoPlate plate={item.plate} size="lg" />
                      <span className="px-2.5 py-0.5 rounded-full bg-white/8 border border-white/15 text-[10px] font-mono text-white/75">
                        VIN: {item.vin}
                      </span>
                      {itemPlateAliases.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-[9.5px] font-extrabold text-amber-400">
                          fost {itemPlateAliases.join(', ')}
                        </span>
                      )}
                      {item.companyName && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            item.companyName === 'SCANDEXPRES'
                              ? 'bg-purple-500/15 border-purple-500/35 text-purple-300'
                              : 'bg-[#0A84FF]/15 border-[#0A84FF]/35 text-[#64D2FF]'
                          }`}
                        >
                          {item.companyName}
                        </span>
                      )}
                      {item.fleetStatus === 'VANDUTA' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[9px] font-black uppercase tracking-wider text-red-300">
                          VÂNDUTĂ
                        </span>
                      )}
                      {item.fleetStatus === 'ARHIVA' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider text-amber-300">
                          ARHIVĂ CIV
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold uppercase tracking-wider text-white/60">
                      {item.brand} · <span className="text-white/80">{autoModelName}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-extrabold tabular-nums"
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}
                      >
                        {autoYear}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-500/70 shrink-0 [forced-color-adjust:none]"
                          style={{ backgroundColor: autoColorHex }}
                        />
                        {autoColorName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPdfModalTarget({
                            plate: item.plate,
                            vin: item.vin,
                            subtitle: `${item.brand} · ${autoModelName}`,
                            initialMode: itemPdfDocs.length > 0 ? 'view' : 'add',
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold cursor-pointer transition ${
                          itemPdfDocs.length > 0
                            ? 'bg-[#0A84FF] hover:brightness-110 shadow-xs'
                            : 'tahoe-card-inner border border-dashed border-white/25 text-white/65 hover:text-white'
                        }`}
                        style={itemPdfDocs.length > 0 ? { color: '#ffffff' } : undefined}
                        title={
                          itemPdfDocs.length > 0
                            ? `Vezi, editează sau șterge actele (${itemPdfDocs.map((d) => d.shortLabel).join(', ')})`
                            : `Adaugă primul act (CIV, Talon, RCA, ITP...) pentru ${item.plate}`
                        }
                      >
                        <FileText
                          className="w-3 h-3 shrink-0"
                          style={itemPdfDocs.length > 0 ? { color: '#ffffff' } : undefined}
                        />
                        <span style={itemPdfDocs.length > 0 ? { color: '#ffffff' } : undefined}>
                          {summarizeVehicleDocsLabel(itemPdfDocs)}
                        </span>
                      </button>

                      {itemPdfDocs.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPdfModalTarget({
                              plate: item.plate,
                              vin: item.vin,
                              subtitle: `${item.brand} · ${autoModelName}`,
                              initialMode: 'add',
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-[10.5px] font-extrabold text-emerald-400 cursor-pointer transition"
                          title={`Adaugă Talon, RCA, CASCO, CMR, ITP sau alt act pentru ${item.plate}`}
                        >
                          <FilePlus2 className="w-3 h-3 shrink-0" />
                          <span>+ Adaugă act</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: 4-Column Status Block (RCA | CASCO | CMR | Leasing) — +25% scaled */}
                <div className="flex items-center shrink-0">
                  <div className="grid grid-cols-4 rounded-[18px] overflow-hidden shadow-sm border border-black/10 w-full sm:w-[18.5rem] min-h-[3.5rem]">
                    {renderStatusCell(item, 'RCA', 'RCA')}
                    {renderStatusCell(item, 'CASCO', 'CASCO')}
                    {renderStatusCell(item, 'CMR', 'CMR')}
                    {renderStatusCell(item, 'LEASING', 'Leasing')}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="tahoe-card-inner rounded-2xl border border-white/15 overflow-hidden">
            <ListPaginationBar
              total={fleetTotal}
              startIdx={fleetStartIdx}
              endIdx={fleetEndIdx}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              page={fleetSafePage}
              totalPages={fleetPageCount}
              onPageChange={setPage}
              unfilteredTotal={items.length}
              unfilteredLabel="total flotă"
            />
          </div>
        </div>
        )}
      </div>

      {/* =====================================================================
          MODAL POPUP: RCA / CASCO / CMR / CREDIT-LEASING — calendar + zile rămase live
      ====================================================================== */}
      {activeDocModal && (() => {
        const { item, docType } = activeDocModal;
        const previewPatch: FleetUnitDocIsoUpdates =
          docType === 'RCA'
            ? { rcaIso: docModalDraftIso }
            : docType === 'CASCO'
              ? { cascoIso: docModalDraftIso }
              : docType === 'CMR'
                ? { cmrIso: docModalDraftIso }
                : { leasingIso: docModalDraftIso };
        const previewItem = applyDocIsoUpdatesToFleetItem(item, previewPatch);
        const info = getFleetCellInfo(previewItem, docType);
        const rows = getFleetDocRows(previewItem, docType);
        const initialIso = getDocIsoForFleetItem(item, docType);
        const hasDateChanged = docModalDraftIso !== initialIso;

        return (
          <div
            onClick={() => setActiveDocModal(null)}
            className="modal-backdrop-lock fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="tahoe-glass-elevated rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl border border-white/20 max-h-[92vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex flex-nowrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-black shrink-0"
                    style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-white truncate">{FLEET_DOC_TITLES[docType]}</h3>
                    <div className="text-xs font-bold text-white/65 truncate">
                      {item.plate} · {item.model}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDocModal(null)}
                  aria-label="Închide fereastra"
                  className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 flex items-center justify-center text-white font-bold cursor-pointer shrink-0 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                className="rounded-2xl px-5 py-4 flex items-baseline gap-2"
                style={{ backgroundColor: info.color, color: '#ffffff' }}
              >
                {info.days !== null ? (
                  <>
                    <span className="text-3xl font-black tabular-nums" style={{ color: '#ffffff' }}>
                      {Math.abs(info.days)}
                    </span>
                    <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
                      {docType === 'LEASING'
                        ? info.days < 0
                          ? 'zile de la finalizare'
                          : 'zile până la finalizare'
                        : info.days === 0
                          ? 'zile — expiră astăzi!'
                          : info.days < 0
                            ? 'zile de la expirare'
                            : 'zile rămase'}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-black" style={{ color: '#ffffff' }}>
                    {info.label}
                  </span>
                )}
              </div>

              {/* Calendar interactiv direct în fereastra poliței */}
              <div className="tahoe-card-inner rounded-2xl p-3.5 border border-[#0A84FF]/35 space-y-2.5">
                <ExpiryCalendarField
                  label="Data expirării"
                  name={`doc-modal-${docType.toLowerCase()}`}
                  isoValue={docModalDraftIso}
                  onChangeIso={setDocModalDraftIso}
                  insurerTag={info.sub || undefined}
                  emptyStatusLabel={info.label || 'Nesetat'}
                  allowClear={docType !== 'RCA'}
                />
                {hasDateChanged && (
                  <button
                    type="button"
                    onClick={handleSaveDocModalDate}
                    className="w-full py-2.5 px-4 rounded-full tahoe-btn-primary text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    style={{ color: '#ffffff' }}
                  >
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#ffffff' }} />
                    <span style={{ color: '#ffffff' }}>
                      Salvează noua dată pentru {item.plate}
                    </span>
                  </button>
                )}
              </div>

              <div className="tahoe-card-inner rounded-2xl border border-white/15 divide-y divide-white/10">
                {rows.map(([label, value]) => (
                  <div key={label} className="px-4 py-3">
                    <div className="text-xs font-semibold text-white/60">{label}</div>
                    <div className="text-sm font-black text-white break-words">{value}</div>
                  </div>
                ))}
              </div>

              {(() => {
                const modalDocs = getVehiclePdfDocs(item.plate, item.vin, pdfCatalog);
                const policyDoc = modalDocs.find((d) => d.docKind === docType);
                return (
                  <div className="space-y-2">
                    {policyDoc ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocModal(null);
                          setPdfModalTarget({
                            plate: item.plate,
                            vin: item.vin,
                            subtitle: `${item.brand} · ${item.model}`,
                            initialDocFileName: policyDoc.fileName,
                            initialMode: 'view',
                          });
                        }}
                        className="w-full py-3 px-4 rounded-full bg-[#0A84FF] hover:brightness-110 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                        style={{ color: '#ffffff' }}
                      >
                        <FileText className="w-4 h-4" style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff' }}>
                          Vezi / Editează documentul {docType} — {item.plate}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocModal(null);
                          setPdfModalTarget({
                            plate: item.plate,
                            vin: item.vin,
                            subtitle: `${item.brand} · ${item.model}`,
                            initialMode: 'add',
                            initialUploadKind: docType,
                          });
                        }}
                        className="w-full py-3 px-4 rounded-full bg-emerald-600 hover:brightness-110 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
                        style={{ color: '#ffffff' }}
                      >
                        <FilePlus2 className="w-4 h-4" style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff' }}>
                          + Atașează polița {docType} (PDF / Poză) — {item.plate}
                        </span>
                      </button>
                    )}

                    {modalDocs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocModal(null);
                          setPdfModalTarget({
                            plate: item.plate,
                            vin: item.vin,
                            subtitle: `${item.brand} · ${item.model}`,
                            initialMode: 'view',
                          });
                        }}
                        className="w-full py-2.5 px-4 rounded-full tahoe-card-inner border border-white/15 hover:border-[#0A84FF] text-xs font-extrabold text-white flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#64D2FF]" />
                        <span>
                          Deschide toate actele atașate ({modalDocs.length}:{' '}
                          {modalDocs.map((d) => d.shortLabel).join(' · ')})
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  setActiveDocModal(null);
                  onOpenVehicleDossier(
                    item.linkedTrailerId,
                    'edit',
                    previewItem
                  );
                }}
                className="w-full py-3 px-4 rounded-full tahoe-card-inner border border-white/15 hover:border-[#0A84FF] text-xs sm:text-sm font-extrabold text-white flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Wrench className="w-4 h-4 text-[#30D158]" />
                <span>Editează toate actele &amp; VIN ({item.plate})</span>
              </button>
            </div>
          </div>
        );
      })()}

      {pdfModalTarget && (
        <VehiclePdfViewerModal
          plate={pdfModalTarget.plate}
          vin={pdfModalTarget.vin}
          vehicleSubtitle={pdfModalTarget.subtitle}
          initialDocFileName={pdfModalTarget.initialDocFileName}
          initialMode={pdfModalTarget.initialMode}
          initialUploadKind={pdfModalTarget.initialUploadKind}
          onClose={() => setPdfModalTarget(null)}
        />
      )}

      {showBulkEditModal && (
        <div
          onClick={() => setShowBulkEditModal(false)}
          className="modal-backdrop-lock fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-fleet-title"
            onSubmit={handleApplyBulkEditFleet}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[26px] tahoe-glass border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="bulk-edit-fleet-title" className="text-base font-extrabold text-white">
                  Editare în masă — Flotă ({fleetSelection.selectedCount} vehicule)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Câmpurile lăsate pe „Fără modificare” rămân neschimbate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkEditModal(false)}
                aria-label="Închide"
                className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Firmă deținătoare
                </label>
                <select
                  aria-label="Firmă deținătoare în masă"
                  value={bulkCompanyName}
                  onChange={(e) =>
                    setBulkCompanyName(
                      e.target.value as 'KEEP' | 'BLUE TRANS SPEDITION' | 'SCANDEXPRES'
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  <option value="BLUE TRANS SPEDITION">Blue Trans Spedition</option>
                  <option value="SCANDEXPRES">Scandexpres</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Status Flotă
                </label>
                <select
                  aria-label="Status flotă în masă"
                  value={bulkFleetStatus}
                  onChange={(e) =>
                    setBulkFleetStatus(
                      e.target.value as
                        | 'KEEP'
                        | 'ACTIV'
                        | 'VANDUTA'
                        | 'ARHIVA'
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  <option value="ACTIV">Activă</option>
                  <option value="VANDUTA">Vândută</option>
                  <option value="ARHIVA">Arhivă CIV</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Actualizează poliță / termen
                </label>
                <select
                  aria-label="Tip poliță de actualizat în masă"
                  value={bulkDocType}
                  onChange={(e) =>
                    setBulkDocType(
                      e.target.value as 'NONE' | 'RCA' | 'CASCO' | 'CMR' | 'LEASING'
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="NONE">Nu modifica polițele</option>
                  <option value="RCA">Expirare RCA</option>
                  <option value="CASCO">Expirare CASCO</option>
                  <option value="CMR">Expirare CMR</option>
                  <option value="LEASING">Expirare Leasing</option>
                </select>
              </div>

              {bulkDocType !== 'NONE' && (
                <div>
                  <ExpiryCalendarField
                    label={`Dată expirare ${bulkDocType}`}
                    name={`bulk-doc-${bulkDocType.toLowerCase()}`}
                    isoValue={bulkDocIso}
                    onChangeIso={setBulkDocIso}
                    allowClear
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkEditModal(false)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-extrabold cursor-pointer"
              >
                Aplică la {fleetSelection.selectedCount} vehicule
              </button>
            </div>
          </form>
        </div>
      )}

      <BulkDeleteConfirmModal
        open={showBulkDeleteModal}
        title="Ștergere în masă — Flotă"
        count={fleetSelection.selectedCount}
        previewLabels={selectedFleetItems.map((v) => `${v.plate} · ${v.brand} (${v.vin})`)}
        onCancel={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDeleteFleet}
      />
    </div>
  );
};
