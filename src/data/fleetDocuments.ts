import { useEffect, useState } from 'react';

export type FleetPdfDocKind =
  | 'CIV'
  | 'TALON'
  | 'RCA'
  | 'CASCO'
  | 'CMR'
  | 'ITP'
  | 'ROVINIETA'
  | 'ATP'
  | 'LICENTA'
  | 'LEASING'
  | 'ACT';

export interface FleetDocKindOption {
  value: FleetPdfDocKind;
  shortLabel: string;
  label: string;
  title: string;
}

export const FLEET_DOC_KIND_OPTIONS: FleetDocKindOption[] = [
  {
    value: 'CIV',
    shortLabel: 'CIV',
    label: 'CIV (Carte de Identitate)',
    title: 'Carte de Identitate a Vehiculului (CIV)',
  },
  {
    value: 'TALON',
    shortLabel: 'Talon',
    label: 'Talon (Certificat înmatriculare)',
    title: 'Certificat de Înmatriculare (Talon)',
  },
  {
    value: 'RCA',
    shortLabel: 'RCA',
    label: 'Poliță Asigurare RCA',
    title: 'Poliță Asigurare Obligatorie RCA',
  },
  {
    value: 'CASCO',
    shortLabel: 'CASCO',
    label: 'Poliță Asigurare CASCO',
    title: 'Poliță Asigurare Facultativă CASCO',
  },
  {
    value: 'CMR',
    shortLabel: 'CMR',
    label: 'Asigurare Marfă CMR',
    title: 'Poliță Asigurare Răspundere Transportator (CMR)',
  },
  {
    value: 'ITP',
    shortLabel: 'ITP',
    label: 'Certificat ITP',
    title: 'Certificat Inspecție Tehnică Periodică (ITP)',
  },
  {
    value: 'ROVINIETA',
    shortLabel: 'Rovinietă',
    label: 'Rovinietă / Taxă drum',
    title: 'Rovinietă / Taxă Utilizare Drumuri',
  },
  {
    value: 'ATP',
    shortLabel: 'ATP',
    label: 'Certificat ATP Frigo',
    title: 'Certificat Agreare Frigorifică Internațională (ATP)',
  },
  {
    value: 'LICENTA',
    shortLabel: 'Licență',
    label: 'Copie Conformă Licență ARR',
    title: 'Copie Conformă Licență Comunitară ARR',
  },
  {
    value: 'LEASING',
    shortLabel: 'Leasing',
    label: 'Contract Leasing / Credit',
    title: 'Contract Finanțare / Leasing Vehicul',
  },
  {
    value: 'ACT',
    shortLabel: 'Alt act',
    label: 'Alt document vehicul',
    title: 'Document Oficial Vehicul',
  },
];

const DOC_KIND_META: Record<FleetPdfDocKind, { shortLabel: string; title: string }> =
  FLEET_DOC_KIND_OPTIONS.reduce(
    (acc, item) => {
      acc[item.value] = { shortLabel: item.shortLabel, title: item.title };
      return acc;
    },
    {} as Record<FleetPdfDocKind, { shortLabel: string; title: string }>
  );

const VALID_DOC_KINDS = new Set<string>(FLEET_DOC_KIND_OPTIONS.map((o) => o.value));

export interface FleetPdfDocument {
  id: string;
  fileName: string;
  url: string;
  mediaType: 'pdf' | 'image';
  sizeBytes?: number;
  plateNormalized: string;
  displayPlate: string;
  docKind: FleetPdfDocKind;
  shortLabel: string;
  title: string;
  customTitle?: string;
  expiryDate?: string;
  note?: string;
  updatedAt?: string;
}

interface RawActeFileEntry {
  fileName: string;
  sizeBytes?: number;
  blobUrl?: string;
}

export interface RawActeDocMeta {
  docKind?: string;
  customTitle?: string;
  expiryDate?: string;
  note?: string;
  plate?: string;
  updatedAt?: string;
}

interface LocalFleetDocsFallbackState {
  deletedFiles: string[];
  metaOverrides: Record<string, RawActeDocMeta>;
  customDocs: Array<{
    fileName: string;
    sizeBytes?: number;
    dataUrl?: string;
    meta: RawActeDocMeta;
  }>;
}

const LOCAL_DOCS_STORAGE_KEY = 'bluetrans_fleet_docs_local_v1';

function loadLocalDocsState(): LocalFleetDocsFallbackState {
  if (typeof window === 'undefined') {
    return { deletedFiles: [], metaOverrides: {}, customDocs: [] };
  }
  try {
    const raw = localStorage.getItem(LOCAL_DOCS_STORAGE_KEY);
    if (!raw) return { deletedFiles: [], metaOverrides: {}, customDocs: [] };
    const parsed = JSON.parse(raw) as Partial<LocalFleetDocsFallbackState>;
    return {
      deletedFiles: Array.isArray(parsed.deletedFiles) ? parsed.deletedFiles : [],
      metaOverrides:
        parsed.metaOverrides && typeof parsed.metaOverrides === 'object'
          ? parsed.metaOverrides
          : {},
      customDocs: Array.isArray(parsed.customDocs) ? parsed.customDocs : [],
    };
  } catch {
    return { deletedFiles: [], metaOverrides: {}, customDocs: [] };
  }
}

function saveLocalDocsState(state: LocalFleetDocsFallbackState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_DOCS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors on large files
  }
}

/**
 * Inventarul inițial al celor 43 de cărți de identitate (CIV RAR) puse în `public/acte-flota/`.
 * Odată ce `/acte-flota/index.json` răspunde de pe server, lista reală de pe disc are prioritate 100%
 * (astfel încât orice adăugare, redenumire sau ștergere se reflectă imediat).
 */
const BUILTIN_ACTE_FLOTA_FILES: RawActeFileEntry[] = [
  { fileName: 'CIV - B 102 STS.pdf', sizeBytes: 575043 },
  { fileName: 'CIV - B 196 STS.pdf', sizeBytes: 587505 },
  { fileName: 'CIV - B 506  STS.pdf', sizeBytes: 1246806 },
  { fileName: 'CIV - B 507  STS.pdf', sizeBytes: 1318966 },
  { fileName: 'CIV - B 560  STS.pdf', sizeBytes: 991717 },
  { fileName: 'CIV - BH 01 STS.pdf', sizeBytes: 1558524 },
  { fileName: 'CIV - BH 03 XTS.pdf', sizeBytes: 1325735 },
  { fileName: 'CIV - BH 05 XTS.pdf', sizeBytes: 691148 },
  { fileName: 'CIV - BH 06 XTS.pdf', sizeBytes: 2911670 },
  { fileName: 'CIV - BH 12 STS.pdf', sizeBytes: 1390438 },
  { fileName: 'CIV - BH 23 STS.pdf', sizeBytes: 1260188 },
  { fileName: 'CIV - BH 30 STS.pdf', sizeBytes: 133378 },
  { fileName: 'CIV - BH 31 STS.pdf', sizeBytes: 813623 },
  { fileName: 'CIV - BH 33 STS.pdf', sizeBytes: 1075738 },
  { fileName: 'CIV - BH 41 STS.pdf', sizeBytes: 1081741 },
  { fileName: 'CIV - BH 45 STS.pdf', sizeBytes: 2736307 },
  { fileName: 'CIV - BH 46 STS.pdf', sizeBytes: 345427 },
  { fileName: 'CIV - BH 47 STS.pdf', sizeBytes: 1053582 },
  { fileName: 'CIV - BH 49 STS.pdf', sizeBytes: 2356437 },
  { fileName: 'CIV - BH 50 STS.pdf', sizeBytes: 1125091 },
  { fileName: 'CIV - BH 52 STS.pdf', sizeBytes: 4288366 },
  { fileName: 'CIV - BH 56 STS.pdf', sizeBytes: 1579092 },
  { fileName: 'CIV - BH 59 STS.pdf', sizeBytes: 4309466 },
  { fileName: 'CIV - BH 61 STS.pdf', sizeBytes: 1464826 },
  { fileName: 'CIV - BH 65 STS.pdf', sizeBytes: 1039477 },
  { fileName: 'CIV - BH 67 STS.pdf', sizeBytes: 1094439 },
  { fileName: 'CIV - BH 69 STS.pdf', sizeBytes: 3126640 },
  { fileName: 'CIV - BH 72 STS.pdf', sizeBytes: 1543644 },
  { fileName: 'CIV - BH 74 STS.pdf', sizeBytes: 3031106 },
  { fileName: 'CIV - BH 75 STS.pdf', sizeBytes: 3037954 },
  { fileName: 'CIV - BH 81 STS.pdf', sizeBytes: 3317289 },
  { fileName: 'CIV - BH 91 STS.pdf', sizeBytes: 1686900 },
  { fileName: 'CIV - IF 02 XTS.pdf', sizeBytes: 941025 },
  { fileName: 'CIV - IF 12 STS.pdf', sizeBytes: 1132624 },
  { fileName: 'CIV - IF 20 STS.pdf', sizeBytes: 1450730 },
  { fileName: 'CIV - IF 30 BTS.pdf', sizeBytes: 1037993 },
  { fileName: 'CIV - IF 58 STS.pdf', sizeBytes: 1221561 },
  { fileName: 'CIV - IF 71 STS.pdf', sizeBytes: 423862 },
  { fileName: 'CIV - IF 74 STS.pdf', sizeBytes: 368239 },
  { fileName: 'CIV - IF 78 STS.pdf', sizeBytes: 382367 },
  { fileName: 'CIV - IF 96 STS.pdf', sizeBytes: 372167 },
  { fileName: 'CIV-B166STS.pdf', sizeBytes: 1554898 },
  { fileName: 'CIV-B871STS.pdf', sizeBytes: 1639990 },
];

const VIN_HISTORICAL_PLATE_ALIASES: Record<string, string[]> = {};

export function normalizeVehiclePlate(plate: string): string {
  return (plate || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function formatRoPlateNormalized(rawOrNormalized: string): string {
  const clean = normalizeVehiclePlate(rawOrNormalized);
  const mBuc = clean.match(/^(B)(\d{2,3})([A-Z]{3})$/);
  if (mBuc) return `${mBuc[1]} ${mBuc[2]} ${mBuc[3]}`;
  const mJud = clean.match(/^([A-Z]{2})(\d{2,3})([A-Z]{3})$/);
  if (mJud) return `${mJud[1]} ${mJud[2]} ${mJud[3]}`;
  return rawOrNormalized.trim().replace(/\s+/g, ' ').toUpperCase();
}

function getFileExtensionLower(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx < 0) return '';
  return fileName.slice(idx).toLowerCase();
}

export function isSupportedFleetDocumentFile(file: File): boolean {
  const ext = getFileExtensionLower(file.name);
  if (['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return true;
  return (
    file.type === 'application/pdf' ||
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'image/webp'
  );
}

function resolveDocumentExtension(file: File): string {
  const ext = getFileExtensionLower(file.name);
  if (['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  if (file.type === 'image/jpeg') return '.jpg';
  if (file.type === 'image/png') return '.png';
  if (file.type === 'image/webp') return '.webp';
  return '.pdf';
}

function detectDocKindFromStem(stemUpper: string): FleetPdfDocKind {
  if (/\bCIV\b|^CIV[-_\s]|[-_\s]CIV$/.test(stemUpper)) return 'CIV';
  if (/\bTALON\b|\bCERTIFICAT\b/.test(stemUpper)) return 'TALON';
  if (/\bRCA\b|^RCA[-_\s]|[-_\s]RCA$/.test(stemUpper)) return 'RCA';
  if (/\bCASCO\b/.test(stemUpper)) return 'CASCO';
  if (/\bCMR\b/.test(stemUpper)) return 'CMR';
  if (/\bITP\b|^ITP[-_\s]|[-_\s]ITP$/.test(stemUpper)) return 'ITP';
  if (/\bROVINIETA\b|\bROVINIET\b|\bROV\b/.test(stemUpper)) return 'ROVINIETA';
  if (/\bATP\b/.test(stemUpper)) return 'ATP';
  if (/\bLICENTA\b|\bCOPIE\s*CONFORMA\b/.test(stemUpper)) return 'LICENTA';
  if (/\bLEASING\b|\bCREDIT\b/.test(stemUpper)) return 'LEASING';
  return 'ACT';
}

export function parseFleetPdfFileEntry(
  entry: RawActeFileEntry,
  docMeta?: RawActeDocMeta
): FleetPdfDocument | null {
  const fileName = entry.fileName.trim();
  const ext = getFileExtensionLower(fileName);
  if (!['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return null;

  const mediaType: 'pdf' | 'image' = ext === '.pdf' ? 'pdf' : 'image';
  const stem = fileName.slice(0, fileName.length - ext.length).trim();
  const stemUpper = stem.toUpperCase();

  const metaKind =
    docMeta?.docKind && VALID_DOC_KINDS.has(docMeta.docKind.toUpperCase())
      ? (docMeta.docKind.toUpperCase() as FleetPdfDocKind)
      : undefined;
  const docKind: FleetPdfDocKind = metaKind || detectDocKindFromStem(stemUpper);

  let plateNormalized = docMeta?.plate ? normalizeVehiclePlate(docMeta.plate) : '';

  if (!plateNormalized) {
    // Eliminăm eventualul contor "(2)", "(3)" și prefixul tipului de act
    const withoutCounter = stemUpper.replace(/\s*\(\d+\)\s*$/, '').trim();
    const stripped = withoutCounter
      .replace(
        /^(CIV|TALON|RCA|CASCO|CMR|ITP|ROVINIETA|ROV|ATP|LICENTA|LEASING|ACT)\s*[-_:]?\s*/i,
        ''
      )
      .replace(
        /\s*[-_:]?\s*(CIV|TALON|RCA|CASCO|CMR|ITP|ROVINIETA|ROV|ATP|LICENTA|LEASING|ACT)$/i,
        ''
      )
      .trim();

    const compact = normalizeVehiclePlate(stripped);
    const plateMatch =
      compact.match(/^(B\d{2,3}[A-Z]{3})$/) ||
      compact.match(/^([A-Z]{2}\d{2,3}[A-Z]{3})$/) ||
      withoutCounter
        .replace(/[^A-Z0-9]/g, '')
        .match(/(B\d{2,3}[A-Z]{3}|[A-Z]{2}\d{2,3}[A-Z]{3})/);

    plateNormalized = plateMatch ? plateMatch[1] : compact;
  }

  if (!plateNormalized) return null;

  const displayPlate = formatRoPlateNormalized(plateNormalized);
  const kindInfo = DOC_KIND_META[docKind];
  const customTitle = docMeta?.customTitle?.trim() || undefined;
  const expiryDate = docMeta?.expiryDate?.trim() || undefined;
  const note = docMeta?.note?.trim() || undefined;
  const updatedAt = docMeta?.updatedAt?.trim() || undefined;

  const baseStaticUrl = `/acte-flota/${encodeURIComponent(fileName)}`;
  const versionedUrl =
    entry.blobUrl ||
    (updatedAt ? `${baseStaticUrl}?v=${encodeURIComponent(updatedAt)}` : baseStaticUrl);

  return {
    id: `doc-${fileName}`,
    fileName,
    url: versionedUrl,
    mediaType,
    sizeBytes: entry.sizeBytes,
    plateNormalized,
    displayPlate,
    docKind,
    shortLabel: kindInfo.shortLabel,
    title: customTitle || kindInfo.title,
    customTitle,
    expiryDate,
    note,
    updatedAt,
  };
}

const sessionBlobUrls = new Map<string, string>();

function buildCatalog(
  entries: RawActeFileEntry[],
  serverMeta: Record<string, RawActeDocMeta>,
  useAuthoritativeEntries: boolean
): FleetPdfDocument[] {
  const local = loadLocalDocsState();
  const deletedSet = new Set(local.deletedFiles);

  const byFile = new Map<string, RawActeFileEntry>();

  if (!useAuthoritativeEntries) {
    for (const item of BUILTIN_ACTE_FLOTA_FILES) {
      if (!deletedSet.has(item.fileName)) {
        byFile.set(item.fileName, item);
      }
    }
  }

  for (const item of entries) {
    if (!useAuthoritativeEntries && deletedSet.has(item.fileName)) continue;
    byFile.set(item.fileName, item);
  }

  // Adăugăm documentele salvate doar în browser (când aplicația rulează ca build static fără backend)
  for (const custom of local.customDocs) {
    if (!byFile.has(custom.fileName) && !deletedSet.has(custom.fileName)) {
      const memBlob = sessionBlobUrls.get(custom.fileName);
      if (custom.dataUrl || memBlob) {
        byFile.set(custom.fileName, {
          fileName: custom.fileName,
          sizeBytes: custom.sizeBytes,
          blobUrl: memBlob || custom.dataUrl,
        });
      }
    }
  }

  const out: FleetPdfDocument[] = [];
  for (const item of byFile.values()) {
    const combinedMeta: RawActeDocMeta = {
      ...(local.metaOverrides[item.fileName] || {}),
      ...(serverMeta[item.fileName] || {}),
    };
    const parsed = parseFleetPdfFileEntry(item, combinedMeta);
    if (parsed) out.push(parsed);
  }

  out.sort((a, b) => a.fileName.localeCompare(b.fileName, 'ro', { numeric: true }));
  return out;
}

let serverSynced = false;
let lastServerFiles: RawActeFileEntry[] = [];
let lastServerMeta: Record<string, RawActeDocMeta> = {};

let cachedCatalog: FleetPdfDocument[] = buildCatalog([], {}, false);
const listeners = new Set<(docs: FleetPdfDocument[]) => void>();
let initialFetchStarted = false;

function notifyCatalogListeners(next: FleetPdfDocument[]) {
  cachedCatalog = next;
  listeners.forEach((fn) => fn(next));
}

function applyServerPayload(
  files: RawActeFileEntry[],
  meta?: Record<string, RawActeDocMeta>
): FleetPdfDocument[] {
  serverSynced = true;
  lastServerFiles = files;
  lastServerMeta = meta && typeof meta === 'object' ? meta : {};

  // Curățăm din localStorage eventualele intrări temporare care sunt acum sincronizate pe disc
  const local = loadLocalDocsState();
  const diskSet = new Set(files.map((f) => f.fileName));
  const nextCustom = local.customDocs.filter((c) => !diskSet.has(c.fileName));
  if (nextCustom.length !== local.customDocs.length) {
    saveLocalDocsState({ ...local, customDocs: nextCustom });
  }

  const merged = buildCatalog(lastServerFiles, lastServerMeta, true);
  notifyCatalogListeners(merged);
  return merged;
}

export async function refreshFleetPdfCatalog(): Promise<FleetPdfDocument[]> {
  try {
    const res = await fetch('/acte-flota/index.json', { cache: 'no-store' });
    if (!res.ok) return cachedCatalog;
    const data = (await res.json()) as {
      files?: RawActeFileEntry[];
      meta?: Record<string, RawActeDocMeta>;
    };
    if (Array.isArray(data.files)) {
      return applyServerPayload(data.files, data.meta);
    }
  } catch {
    // fallback pe lista locală
  }
  return cachedCatalog;
}

export function getFleetPdfCatalogSnapshot(): FleetPdfDocument[] {
  return cachedCatalog;
}

export function useFleetPdfCatalog(): FleetPdfDocument[] {
  const [docs, setDocs] = useState<FleetPdfDocument[]>(() => cachedCatalog);

  useEffect(() => {
    const listener = (next: FleetPdfDocument[]) => setDocs(next);
    listeners.add(listener);
    if (!initialFetchStarted) {
      initialFetchStarted = true;
      void refreshFleetPdfCatalog();
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return docs;
}

export function getVehiclePlateAliases(plate: string, vin?: string): string[] {
  const cleanVin = (vin || '').trim().toUpperCase();
  const aliases = VIN_HISTORICAL_PLATE_ALIASES[cleanVin] || [];
  const normSelf = normalizeVehiclePlate(plate);
  return aliases.filter((p) => normalizeVehiclePlate(p) !== normSelf);
}

const DOC_ORDER_RANK: Record<FleetPdfDocKind, number> = {
  CIV: 1,
  TALON: 2,
  RCA: 3,
  CASCO: 4,
  CMR: 5,
  ITP: 6,
  ROVINIETA: 7,
  ATP: 8,
  LICENTA: 9,
  LEASING: 10,
  ACT: 11,
};

export function getVehiclePdfDocs(
  plate: string,
  vin?: string,
  catalog: FleetPdfDocument[] = cachedCatalog
): FleetPdfDocument[] {
  const primaryNorm = normalizeVehiclePlate(plate);
  if (!primaryNorm) return [];

  const aliasPlates = getVehiclePlateAliases(plate, vin);
  const aliasNormSet = new Set(aliasPlates.map((p) => normalizeVehiclePlate(p)));

  const primaryDocs: FleetPdfDocument[] = [];
  const historicalDocs: FleetPdfDocument[] = [];

  for (const doc of catalog) {
    if (doc.plateNormalized === primaryNorm) {
      primaryDocs.push(doc);
    } else if (aliasNormSet.has(doc.plateNormalized)) {
      historicalDocs.push({
        ...doc,
        shortLabel: `${doc.shortLabel} (${doc.displayPlate})`,
        note:
          doc.note ||
          `Număr anterior pe aceeași serie VIN (${(vin || '').toUpperCase()})`,
      });
    }
  }

  primaryDocs.sort(
    (a, b) =>
      DOC_ORDER_RANK[a.docKind] - DOC_ORDER_RANK[b.docKind] ||
      a.fileName.localeCompare(b.fileName, 'ro', { numeric: true })
  );
  historicalDocs.sort(
    (a, b) =>
      DOC_ORDER_RANK[a.docKind] - DOC_ORDER_RANK[b.docKind] ||
      a.fileName.localeCompare(b.fileName, 'ro', { numeric: true })
  );

  return [...primaryDocs, ...historicalDocs];
}

/**
 * Etichetă scurtă, clară, cu tipurile reale de acte atașate vehiculului
 * (ex: `Acte: CIV`, `Acte (3): CIV · Talon · RCA`).
 */
export function summarizeVehicleDocsLabel(docs: FleetPdfDocument[]): string {
  if (docs.length === 0) return '+ Adaugă act';
  const uniqueLabels: string[] = [];
  for (const d of docs) {
    const base = DOC_KIND_META[d.docKind]?.shortLabel || d.shortLabel;
    if (!uniqueLabels.includes(base)) {
      uniqueLabels.push(base);
    }
  }
  const shown = uniqueLabels.slice(0, 3).join(' · ');
  const extra = uniqueLabels.length > 3 ? ` +${uniqueLabels.length - 3}` : '';
  if (docs.length === 1) {
    return `Acte: ${shown}`;
  }
  return `Acte (${docs.length}): ${shown}${extra}`;
}

export function formatPdfSize(sizeBytes?: number): string {
  if (!sizeBytes || sizeBytes <= 0) return '';
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nu s-a putut citi fișierul selectat.'));
    reader.readAsDataURL(file);
  });
}

export interface UploadVehicleDocOptions {
  plate: string;
  docKind: FleetPdfDocKind;
  file: File;
  customTitle?: string;
  expiryDate?: string;
  note?: string;
  replaceFileName?: string;
}

export async function uploadVehiclePdfDocument(
  optionsOrPlate: UploadVehicleDocOptions | string,
  legacyDocKind?: FleetPdfDocKind,
  legacyFile?: File
): Promise<FleetPdfDocument> {
  const opts: UploadVehicleDocOptions =
    typeof optionsOrPlate === 'string'
      ? {
          plate: optionsOrPlate,
          docKind: legacyDocKind || 'ACT',
          file: legacyFile as File,
        }
      : optionsOrPlate;

  if (!opts.file || !isSupportedFleetDocumentFile(opts.file)) {
    throw new Error('Selectează un fișier PDF sau o imagine (.pdf, .jpg, .png, .webp).');
  }

  const formattedPlate = formatRoPlateNormalized(opts.plate);
  const ext = resolveDocumentExtension(opts.file);
  const desiredFileName = `${opts.docKind} - ${formattedPlate}${ext}`;
  const dataUrl = await fileToDataUrl(opts.file);

  try {
    const res = await fetch('/api/acte-flota/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: desiredFileName,
        replaceFileName: opts.replaceFileName,
        base64: dataUrl,
        plate: formattedPlate,
        docKind: opts.docKind,
        customTitle: opts.customTitle ?? '',
        expiryDate: opts.expiryDate ?? '',
        note: opts.note ?? '',
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        ok?: boolean;
        fileName?: string;
        files?: RawActeFileEntry[];
        meta?: Record<string, RawActeDocMeta>;
        error?: string;
      };
      if (data.ok && Array.isArray(data.files)) {
        const merged = applyServerPayload(data.files, data.meta);
        const saved = merged.find(
          (d) => d.fileName === (data.fileName || desiredFileName)
        );
        if (saved) return saved;
      }
    } else {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      if (errBody.error) {
        throw new Error(errBody.error);
      }
    }
  } catch (err) {
    if (err instanceof Error && /Fișierul|permise|validă/i.test(err.message)) {
      throw err;
    }
    // Fallback static local (fără server Vite activ)
  }

  const local = loadLocalDocsState();
  const existingNames = new Set(cachedCatalog.map((d) => d.fileName));
  if (opts.replaceFileName) {
    existingNames.delete(opts.replaceFileName);
  }
  let finalLocalName = desiredFileName;
  let counter = 2;
  const stem = desiredFileName.slice(0, desiredFileName.length - ext.length);
  while (existingNames.has(finalLocalName)) {
    finalLocalName = `${stem} (${counter})${ext}`;
    counter += 1;
  }

  const nowIso = new Date().toISOString();
  const docMeta: RawActeDocMeta = {
    plate: formattedPlate,
    docKind: opts.docKind,
    customTitle: opts.customTitle?.trim() || undefined,
    expiryDate: opts.expiryDate?.trim() || undefined,
    note: opts.note?.trim() || undefined,
    updatedAt: nowIso,
  };

  const blobUrl = URL.createObjectURL(opts.file);
  sessionBlobUrls.set(finalLocalName, blobUrl);

  const filteredCustom = local.customDocs.filter(
    (c) => c.fileName !== finalLocalName && c.fileName !== opts.replaceFileName
  );
  const nextDeleted = opts.replaceFileName
    ? Array.from(new Set([...local.deletedFiles, opts.replaceFileName])).filter(
        (n) => n !== finalLocalName
      )
    : local.deletedFiles.filter((n) => n !== finalLocalName);

  const nextMetaOverrides = { ...local.metaOverrides, [finalLocalName]: docMeta };
  if (opts.replaceFileName && opts.replaceFileName !== finalLocalName) {
    delete nextMetaOverrides[opts.replaceFileName];
  }

  saveLocalDocsState({
    deletedFiles: nextDeleted,
    metaOverrides: nextMetaOverrides,
    customDocs: [
      ...filteredCustom,
      {
        fileName: finalLocalName,
        sizeBytes: opts.file.size,
        dataUrl: opts.file.size <= 3.5 * 1024 * 1024 ? dataUrl : undefined,
        meta: docMeta,
      },
    ],
  });

  const nextCatalog = buildCatalog(lastServerFiles, lastServerMeta, serverSynced);
  notifyCatalogListeners(nextCatalog);
  const created = nextCatalog.find((d) => d.fileName === finalLocalName);
  if (!created) {
    throw new Error('Documentul nu a putut fi asociat vehiculului.');
  }
  return created;
}

export interface UpdateVehicleDocOptions {
  fileName: string;
  plate: string;
  docKind: FleetPdfDocKind;
  customTitle?: string;
  expiryDate?: string;
  note?: string;
  replacementFile?: File | null;
}

export async function updateVehiclePdfDocument(
  opts: UpdateVehicleDocOptions
): Promise<FleetPdfDocument> {
  // Dacă utilizatorul a selectat și un fișier nou (înlocuire PDF / imagine), folosim fluxul de replace
  if (opts.replacementFile) {
    return uploadVehiclePdfDocument({
      plate: opts.plate,
      docKind: opts.docKind,
      file: opts.replacementFile,
      customTitle: opts.customTitle,
      expiryDate: opts.expiryDate,
      note: opts.note,
      replaceFileName: opts.fileName,
    });
  }

  const formattedPlate = formatRoPlateNormalized(opts.plate);
  const ext = getFileExtensionLower(opts.fileName) || '.pdf';
  const currentDoc = cachedCatalog.find((d) => d.fileName === opts.fileName);
  const kindChanged = currentDoc && currentDoc.docKind !== opts.docKind;
  const desiredNewFileName = kindChanged
    ? `${opts.docKind} - ${formattedPlate}${ext}`
    : undefined;

  try {
    const res = await fetch('/api/acte-flota/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: opts.fileName,
        newFileName: desiredNewFileName,
        plate: formattedPlate,
        docKind: opts.docKind,
        customTitle: opts.customTitle ?? '',
        expiryDate: opts.expiryDate ?? '',
        note: opts.note ?? '',
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        ok?: boolean;
        fileName?: string;
        files?: RawActeFileEntry[];
        meta?: Record<string, RawActeDocMeta>;
      };
      if (data.ok && Array.isArray(data.files)) {
        const merged = applyServerPayload(data.files, data.meta);
        const target = data.fileName || opts.fileName;
        const updated = merged.find((d) => d.fileName === target);
        if (updated) return updated;
      }
    }
  } catch {
    // fallback static local
  }

  const local = loadLocalDocsState();
  const nextMeta: RawActeDocMeta = {
    ...(local.metaOverrides[opts.fileName] || {}),
    plate: formattedPlate,
    docKind: opts.docKind,
    customTitle: opts.customTitle?.trim() || '',
    expiryDate: opts.expiryDate?.trim() || '',
    note: opts.note?.trim() || '',
    updatedAt: new Date().toISOString(),
  };

  saveLocalDocsState({
    ...local,
    metaOverrides: {
      ...local.metaOverrides,
      [opts.fileName]: nextMeta,
    },
    customDocs: local.customDocs.map((c) =>
      c.fileName === opts.fileName ? { ...c, meta: nextMeta } : c
    ),
  });

  const nextCatalog = buildCatalog(lastServerFiles, lastServerMeta, serverSynced);
  notifyCatalogListeners(nextCatalog);
  const found = nextCatalog.find((d) => d.fileName === opts.fileName);
  if (!found) {
    throw new Error('Documentul editat nu a fost găsit.');
  }
  return found;
}

export async function deleteVehiclePdfDocument(fileName: string): Promise<void> {
  try {
    const res = await fetch('/api/acte-flota/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        ok?: boolean;
        files?: RawActeFileEntry[];
        meta?: Record<string, RawActeDocMeta>;
      };
      if (data.ok && Array.isArray(data.files)) {
        sessionBlobUrls.delete(fileName);
        applyServerPayload(data.files, data.meta);
        return;
      }
    }
  } catch {
    // fallback static local
  }

  sessionBlobUrls.delete(fileName);
  const local = loadLocalDocsState();
  const nextOverrides = { ...local.metaOverrides };
  delete nextOverrides[fileName];
  saveLocalDocsState({
    deletedFiles: Array.from(new Set([...local.deletedFiles, fileName])),
    metaOverrides: nextOverrides,
    customDocs: local.customDocs.filter((c) => c.fileName !== fileName),
  });

  const nextCatalog = buildCatalog(lastServerFiles, lastServerMeta, serverSynced);
  notifyCatalogListeners(nextCatalog);
}
