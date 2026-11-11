import React, { useEffect, useId, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { EuroRoPlate } from './EuroRoPlate';
import {
  ExpiryCalendarField,
  getExpiryBadgeSummary,
  isoToRoDate,
} from './ExpiryCalendarField';
import {
  FLEET_DOC_KIND_OPTIONS,
  FleetPdfDocKind,
  FleetPdfDocument,
  deleteVehiclePdfDocument,
  formatPdfSize,
  getVehiclePdfDocs,
  isSupportedFleetDocumentFile,
  updateVehiclePdfDocument,
  uploadVehiclePdfDocument,
  useFleetPdfCatalog,
} from '../data/fleetDocuments';

export interface VehiclePdfViewerModalProps {
  plate: string;
  vin?: string;
  vehicleSubtitle?: string;
  initialDocFileName?: string;
  initialMode?: 'view' | 'add' | 'edit';
  initialUploadKind?: FleetPdfDocKind;
  onClose: () => void;
}

function pickSmartDefaultAddKind(
  docs: FleetPdfDocument[],
  preferred?: FleetPdfDocKind
): FleetPdfDocKind {
  if (preferred) return preferred;
  const existingKinds = new Set(docs.map((d) => d.docKind));
  const priority: FleetPdfDocKind[] = [
    'CIV',
    'TALON',
    'RCA',
    'ITP',
    'CASCO',
    'CMR',
    'ROVINIETA',
    'ATP',
    'LICENTA',
    'LEASING',
    'ACT',
  ];
  for (const k of priority) {
    if (!existingKinds.has(k)) return k;
  }
  return 'ACT';
}

export const VehiclePdfViewerModal: React.FC<VehiclePdfViewerModalProps> = ({
  plate,
  vin,
  vehicleSubtitle,
  initialDocFileName,
  initialMode = 'view',
  initialUploadKind,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const formFileInputRef = useRef<HTMLInputElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const baseId = useId();
  const titleId = `${baseId}-title`;

  const catalog = useFleetPdfCatalog();
  const docs = getVehiclePdfDocs(plate, vin, catalog);

  const [selectedFileName, setSelectedFileName] = useState<string>(() => {
    if (initialDocFileName) return initialDocFileName;
    if (initialUploadKind) {
      const byKind = docs.find((d) => d.docKind === initialUploadKind);
      if (byKind) return byKind.fileName;
    }
    return docs[0]?.fileName || '';
  });

  const activeDoc: FleetPdfDocument | undefined =
    docs.find((d) => d.fileName === selectedFileName) || docs[0];

  const [panelMode, setPanelMode] = useState<'view' | 'add' | 'edit'>(() => {
    if (initialMode === 'add') return 'add';
    if (initialMode === 'edit' && activeDoc) return 'edit';
    return 'view';
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form state (folosit atât pentru Adăugare, cât și pentru Editare)
  const [draftKind, setDraftKind] = useState<FleetPdfDocKind>(() =>
    initialMode === 'edit' && activeDoc
      ? activeDoc.docKind
      : pickSmartDefaultAddKind(docs, initialUploadKind)
  );
  const [draftCustomTitle, setDraftCustomTitle] = useState<string>(() =>
    initialMode === 'edit' && activeDoc ? activeDoc.customTitle || '' : ''
  );
  const [draftExpiryIso, setDraftExpiryIso] = useState<string>(() =>
    initialMode === 'edit' && activeDoc ? activeDoc.expiryDate || '' : ''
  );
  const [draftNote, setDraftNote] = useState<string>(() =>
    initialMode === 'edit' && activeDoc ? activeDoc.note || '' : ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    const handleNativeClose = () => {
      if (!dialog.open) {
        onCloseRef.current();
      }
    };
    dialog.addEventListener('close', handleNativeClose);

    let cleanupBackdropClick: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pointerDownOutside = false;
      const isOutsideDialog = (event: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          event.clientY < rect.top ||
          event.clientY > rect.bottom ||
          event.clientX < rect.left ||
          event.clientX > rect.right
        );
      };
      const handlePointerDown = (event: PointerEvent) => {
        pointerDownOutside = event.target === dialog && isOutsideDialog(event);
      };
      const handlePointerUp = (event: PointerEvent) => {
        if (pointerDownOutside && event.target === dialog && isOutsideDialog(event)) {
          dialog.close();
        }
        pointerDownOutside = false;
      };
      dialog.addEventListener('pointerdown', handlePointerDown);
      dialog.addEventListener('pointerup', handlePointerUp);
      cleanupBackdropClick = () => {
        dialog.removeEventListener('pointerdown', handlePointerDown);
        dialog.removeEventListener('pointerup', handlePointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      if (cleanupBackdropClick) cleanupBackdropClick();
    };
  }, []);

  useEffect(() => {
    if (docs.length > 0 && !docs.some((d) => d.fileName === selectedFileName)) {
      setSelectedFileName(docs[0].fileName);
    } else if (docs.length === 0 && selectedFileName !== '') {
      setSelectedFileName('');
    }
  }, [docs, selectedFileName]);

  const openAddPanel = (preferredKind?: FleetPdfDocKind) => {
    setConfirmDelete(false);
    setFeedback(null);
    setDraftKind(pickSmartDefaultAddKind(docs, preferredKind));
    setDraftCustomTitle('');
    setDraftExpiryIso('');
    setDraftNote('');
    setSelectedFile(null);
    setPanelMode('add');
  };

  const openEditPanel = (doc: FleetPdfDocument) => {
    setConfirmDelete(false);
    setFeedback(null);
    setDraftKind(doc.docKind);
    setDraftCustomTitle(doc.customTitle || '');
    setDraftExpiryIso(doc.expiryDate || '');
    setDraftNote(doc.note || '');
    setSelectedFile(null);
    setPanelMode('edit');
  };

  const closeFormPanel = () => {
    setPanelMode('view');
    setSelectedFile(null);
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isSupportedFleetDocumentFile(file)) {
      setFeedback({
        type: 'err',
        text: 'Format neacceptat. Alege un PDF (.pdf) sau o imagine (.jpg, .png, .webp).',
      });
      return;
    }
    setFeedback(null);
    setSelectedFile(file);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (panelMode === 'add') {
      if (!selectedFile) {
        setFeedback({
          type: 'err',
          text: 'Alege mai întâi fișierul documentului (PDF sau poză .jpg/.png).',
        });
        formFileInputRef.current?.click();
        return;
      }

      setBusy(true);
      setFeedback(null);
      try {
        const created = await uploadVehiclePdfDocument({
          plate,
          docKind: draftKind,
          file: selectedFile,
          customTitle: draftCustomTitle,
          expiryDate: draftExpiryIso,
          note: draftNote,
        });
        setSelectedFileName(created.fileName);
        setSelectedFile(null);
        setPanelMode('view');
        setFeedback({
          type: 'ok',
          text: `Documentul „${created.title}” (${created.fileName}) a fost adăugat pentru ${plate}.`,
        });
      } catch (err) {
        setFeedback({
          type: 'err',
          text:
            err instanceof Error
              ? err.message
              : 'Eroare la adăugarea documentului.',
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (panelMode === 'edit' && activeDoc) {
      setBusy(true);
      setFeedback(null);
      try {
        const updated = await updateVehiclePdfDocument({
          fileName: activeDoc.fileName,
          plate,
          docKind: draftKind,
          customTitle: draftCustomTitle,
          expiryDate: draftExpiryIso,
          note: draftNote,
          replacementFile: selectedFile,
        });
        setSelectedFileName(updated.fileName);
        setSelectedFile(null);
        setPanelMode('view');
        setFeedback({
          type: 'ok',
          text: `Documentul „${updated.title}” a fost actualizat cu succes.`,
        });
      } catch (err) {
        setFeedback({
          type: 'err',
          text:
            err instanceof Error
              ? err.message
              : 'Eroare la salvarea modificărilor documentului.',
        });
      } finally {
        setBusy(false);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeDoc || busy) return;
    const deletedTitle = activeDoc.title;
    const deletedFile = activeDoc.fileName;
    const remaining = docs.filter((d) => d.fileName !== deletedFile);

    setBusy(true);
    setFeedback(null);
    try {
      await deleteVehiclePdfDocument(deletedFile);
      setConfirmDelete(false);
      setPanelMode('view');
      setSelectedFileName(remaining[0]?.fileName || '');
      setFeedback({
        type: 'ok',
        text: `Documentul „${deletedTitle}” (${deletedFile}) a fost șters definitiv.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error
            ? err.message
            : 'Eroare la ștergerea documentului.',
      });
    } finally {
      setBusy(false);
    }
  };

  const activeExpiryBadge = activeDoc?.expiryDate
    ? getExpiryBadgeSummary(activeDoc.expiryDate)
    : null;

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      onClick={(e) => e.stopPropagation()}
      className="fleet-pdf-dialog m-auto w-[min(96vw,1120px)] h-[min(91vh,920px)] max-w-none max-h-none p-0 bg-transparent border-0 outline-none overflow-visible"
    >
      <div className="tahoe-glass-elevated rounded-[26px] w-full h-full p-4 sm:p-5 flex flex-col gap-3 shadow-2xl border border-white/20 overflow-hidden">
        {/* Rândul 1 (Titlebar fereastră): plăcuță RO + titlu document în stânga, buton X fixat strict în colțul dreapta-sus */}
        <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <EuroRoPlate plate={plate} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id={titleId} className="text-sm sm:text-base font-black text-white truncate">
                  {activeDoc
                    ? activeDoc.title
                    : `Dosar Acte Vehicul (${docs.length} documente)`}
                </h2>
                {activeDoc && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-extrabold text-emerald-400 tabular-nums shrink-0">
                    {activeDoc.mediaType === 'image' ? 'Imagine' : 'PDF'}
                    {activeDoc.sizeBytes ? ` · ${formatPdfSize(activeDoc.sizeBytes)}` : ''}
                  </span>
                )}
                {activeDoc?.expiryDate && activeExpiryBadge && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums shrink-0"
                    style={{ backgroundColor: activeExpiryBadge.bgHex, color: '#ffffff' }}
                    title={activeExpiryBadge.longTooltip}
                  >
                    Expiră {isoToRoDate(activeDoc.expiryDate)} · {activeExpiryBadge.shortText}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-white/65 truncate">
                {vehicleSubtitle ? `${vehicleSubtitle}` : 'Dosar digital acte flotă'}
                {vin ? ` · VIN: ${vin}` : ''}
                {activeDoc?.note ? ` · ${activeDoc.note}` : ''}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Închide fereastra documente"
            className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer shrink-0 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rândul 2 (Toolbar documente + Adaugă / Editează / Șterge / Descarcă — toate rounded-full) */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {docs.map((doc) => {
              const isSelected = doc.fileName === activeDoc?.fileName && panelMode !== 'add';
              const docBadge = doc.expiryDate
                ? getExpiryBadgeSummary(doc.expiryDate)
                : null;
              const pillLabel = doc.customTitle
                ? `${doc.shortLabel}: ${doc.customTitle}`
                : doc.shortLabel;

              return (
                <button
                  key={doc.fileName}
                  type="button"
                  onClick={() => {
                    setSelectedFileName(doc.fileName);
                    setConfirmDelete(false);
                    if (panelMode !== 'view') setPanelMode('view');
                  }}
                  title={`${doc.title} (${doc.fileName})`}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition border ${
                    isSelected
                      ? 'bg-[#0A84FF] border-[#0A84FF] shadow-sm'
                      : 'tahoe-card-inner border-white/15 text-white/85 hover:text-white hover:border-[#0A84FF]/60'
                  }`}
                  style={isSelected ? { color: '#ffffff' } : undefined}
                >
                  {doc.mediaType === 'image' ? (
                    <ImageIcon
                      className="w-3.5 h-3.5 shrink-0"
                      style={isSelected ? { color: '#ffffff' } : undefined}
                    />
                  ) : (
                    <FileCheck2
                      className="w-3.5 h-3.5 shrink-0"
                      style={isSelected ? { color: '#ffffff' } : undefined}
                    />
                  )}
                  <span
                    className="max-w-[180px] truncate"
                    style={isSelected ? { color: '#ffffff' } : undefined}
                  >
                    {pillLabel}
                  </span>
                  {docBadge && docBadge.days !== null && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black tabular-nums"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(0,0,0,0.28)'
                          : docBadge.bgHex,
                        color: '#ffffff',
                      }}
                    >
                      {docBadge.days < 0
                        ? `exp.`
                        : `${docBadge.days}z`}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() =>
                panelMode === 'add' ? closeFormPanel() : openAddPanel()
              }
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition border ${
                panelMode === 'add'
                  ? 'bg-emerald-600 border-emerald-500 shadow-sm'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
              }`}
              style={panelMode === 'add' ? { color: '#ffffff' } : undefined}
            >
              <FilePlus2
                className="w-3.5 h-3.5 shrink-0"
                style={panelMode === 'add' ? { color: '#ffffff' } : undefined}
              />
              <span style={panelMode === 'add' ? { color: '#ffffff' } : undefined}>
                + Adaugă document
              </span>
            </button>
          </div>

          {activeDoc && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  panelMode === 'edit' ? closeFormPanel() : openEditPanel(activeDoc)
                }
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition border ${
                  panelMode === 'edit'
                    ? 'bg-[#0A84FF] border-[#0A84FF]'
                    : 'tahoe-card-inner border-white/15 hover:border-[#0A84FF] text-white'
                }`}
                style={panelMode === 'edit' ? { color: '#ffffff' } : undefined}
              >
                <Pencil
                  className="w-3.5 h-3.5 shrink-0"
                  style={panelMode === 'edit' ? { color: '#ffffff' } : undefined}
                />
                <span style={panelMode === 'edit' ? { color: '#ffffff' } : undefined}>
                  Editează
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPanelMode('view');
                  setConfirmDelete((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition border ${
                  confirmDelete
                    ? 'bg-red-600 border-red-500'
                    : 'bg-red-500/12 border-red-500/35 text-red-400 hover:bg-red-500/20'
                }`}
                style={confirmDelete ? { color: '#ffffff' } : undefined}
              >
                <Trash2
                  className="w-3.5 h-3.5 shrink-0"
                  style={confirmDelete ? { color: '#ffffff' } : undefined}
                />
                <span style={confirmDelete ? { color: '#ffffff' } : undefined}>
                  Șterge
                </span>
              </button>

              <a
                href={activeDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-full tahoe-card-inner border border-white/15 hover:border-[#0A84FF] text-xs font-extrabold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#64D2FF] shrink-0" />
                <span>Filă nouă</span>
              </a>

              <a
                href={activeDoc.url}
                download={activeDoc.fileName}
                className="px-3.5 py-1.5 rounded-full bg-[#0A84FF] hover:brightness-110 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition shadow-sm"
                style={{ color: '#ffffff' }}
              >
                <Download className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>Descarcă</span>
              </a>
            </div>
          )}
        </div>

        {/* Confirmare inline la ștergere (fără window.confirm nativ) */}
        {confirmDelete && activeDoc && (
          <div className="px-4 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs font-bold text-red-300">
              Sigur vrei să ștergi definitiv documentul{' '}
              <strong className="text-white">„{activeDoc.title}”</strong> ({activeDoc.fileName})?
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
                className="px-3.5 py-1.5 rounded-full tahoe-card-inner border border-white/15 text-xs font-extrabold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-xs font-extrabold cursor-pointer transition disabled:opacity-50"
                style={{ color: '#ffffff' }}
              >
                <span style={{ color: '#ffffff' }}>
                  {busy ? 'Se șterge...' : 'Da, șterge definitiv'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Panou inline pentru ADĂUGARE sau EDITARE document (CIV, Talon, RCA, CASCO, CMR, ITP, Rovinietă, ATP, Licență, Leasing) */}
        {panelMode !== 'view' && (
          <form
            onSubmit={handleSubmitForm}
            className="tahoe-card-inner rounded-2xl p-3.5 sm:p-4 border border-[#0A84FF]/45 space-y-3 shrink-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                {panelMode === 'add' ? (
                  <>
                    <FilePlus2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Adaugă document nou pentru {plate} (Talon, RCA, CASCO, ITP, CMR, CIV...)
                    </span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4 text-[#64D2FF] shrink-0" />
                    <span>
                      Editează documentul: {activeDoc?.fileName}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={closeFormPanel}
                className="px-3 py-1 rounded-full tahoe-card-inner border border-white/15 text-[11px] font-bold text-white/80 hover:text-white cursor-pointer"
              >
                Închide formularul
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              <div className="space-y-1">
                <label
                  htmlFor={`${baseId}-doc-kind`}
                  className="block text-[11px] font-extrabold text-white/75"
                >
                  Tip document
                </label>
                <select
                  id={`${baseId}-doc-kind`}
                  name="docKind"
                  value={draftKind}
                  onChange={(e) => setDraftKind(e.target.value as FleetPdfDocKind)}
                  className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-xs font-bold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF] cursor-pointer"
                >
                  {FLEET_DOC_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${baseId}-doc-title`}
                  className="block text-[11px] font-extrabold text-white/75"
                >
                  Denumire / Etichetă (opțional)
                </label>
                <input
                  id={`${baseId}-doc-title`}
                  name="customTitle"
                  type="text"
                  value={draftCustomTitle}
                  onChange={(e) => setDraftCustomTitle(e.target.value)}
                  placeholder="ex: Talon față-verso / Poliță RCA 2026"
                  className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
              </div>

              <div>
                <ExpiryCalendarField
                  label="Data expirării (opțional)"
                  name="docExpiryIso"
                  isoValue={draftExpiryIso}
                  onChangeIso={setDraftExpiryIso}
                  emptyStatusLabel="Fără expirare"
                  allowClear
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${baseId}-doc-note`}
                  className="block text-[11px] font-extrabold text-white/75"
                >
                  Nr. poliță / Observații (opțional)
                </label>
                <input
                  id={`${baseId}-doc-note`}
                  name="docNote"
                  type="text"
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="ex: Omniasig #408897 / Anexă..."
                  className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={formFileInputRef}
                  id={`${baseId}-doc-file`}
                  name="fleetDocumentFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handlePickFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => formFileInputRef.current?.click()}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition border ${
                    selectedFile
                      ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-400'
                      : 'tahoe-card-inner border-white/20 hover:border-[#0A84FF] text-white'
                  }`}
                >
                  {panelMode === 'edit' ? (
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>
                    {selectedFile
                      ? `${selectedFile.name} (${formatPdfSize(selectedFile.size)})`
                      : panelMode === 'add'
                        ? 'Alege fișier PDF sau Poză (.pdf, .jpg, .png)'
                        : 'Înlocuiește fișierul (opțional — PDF / Poză)'}
                  </span>
                </button>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="px-2.5 py-1 rounded-full tahoe-card-inner border border-white/15 text-[11px] font-bold text-white/70 hover:text-white cursor-pointer"
                  >
                    Elimină fișierul ales
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeFormPanel}
                  className="px-4 py-2 rounded-full tahoe-card-inner border border-white/15 text-xs font-extrabold text-white cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 rounded-full bg-[#0A84FF] hover:brightness-110 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-sm disabled:opacity-50"
                  style={{ color: '#ffffff' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>
                    {busy
                      ? 'Se salvează...'
                      : panelMode === 'add'
                        ? 'Salvează documentul'
                        : 'Salvează modificările'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {feedback && (
          <div
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center justify-between gap-2 shrink-0 border ${
              feedback.type === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                : 'bg-red-500/15 border-red-500/35 text-red-400'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="px-2.5 py-0.5 rounded-full bg-white/10 text-white cursor-pointer text-[11px]"
            >
              OK
            </button>
          </div>
        )}

        {/* Zona centrală: previzualizare PDF sau Imagine în pagină, ori ecran de adăugare dacă vehiculul nu are încă acte */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/15 bg-slate-900/90 flex flex-col">
          {activeDoc ? (
            activeDoc.mediaType === 'image' ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-slate-950/85">
                <img
                  key={activeDoc.url}
                  src={activeDoc.url}
                  alt={`${activeDoc.title} — ${plate}`}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                />
              </div>
            ) : (
              <iframe
                key={activeDoc.url}
                src={`${activeDoc.url}#view=FitH`}
                title={`${activeDoc.title} — ${plate}`}
                className="w-full h-full border-0 bg-white"
              />
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3 tahoe-card-inner">
              <div className="w-14 h-14 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/35 flex items-center justify-center text-[#0A84FF]">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-black text-white">
                  Niciun document atașat încă pentru {plate}
                </h3>
                <p className="text-xs text-white/65 leading-relaxed">
                  Poți încărca acum <strong className="text-white">CIV, Talon, Poliță RCA, CASCO, CMR, ITP, Rovinietă sau Licență ARR</strong> (PDF sau poză scanată) folosind butonul de mai jos.
                </p>
              </div>
              {panelMode !== 'add' && (
                <button
                  type="button"
                  onClick={() => openAddPanel()}
                  className="mt-1 px-5 py-2.5 rounded-full bg-[#0A84FF] hover:brightness-110 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                  style={{ color: '#ffffff' }}
                >
                  <FilePlus2 className="w-4 h-4" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>
                    + Adaugă primul document pentru {plate}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};
