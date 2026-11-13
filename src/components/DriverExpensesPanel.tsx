import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Droplets,
  Eye,
  FileText,
  Fuel,
  Paperclip,
  Plus,
  Receipt,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import {
  buildDriverExpenseFileUrl,
  type DriverExpenseCategory,
  type DriverExpenseCurrency,
  type DriverExpenseRecord,
  type SubmitDriverExpenseInput,
} from '../data/tmsSyncClient';
import type { HourlyPlanningCard } from './Planning7DaysView';

export const EXPENSE_CATEGORY_META: Record<
  DriverExpenseCategory,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  FUEL: {
    label: 'Motorină / Benzină',
    shortLabel: 'Carburant',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/35',
  },
  ADBLUE: {
    label: 'AdBlue',
    shortLabel: 'AdBlue',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/35',
  },
  TOLL: {
    label: 'Taxe drum / Vignete / Pod',
    shortLabel: 'Taxe drum',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/35',
  },
  PARKING: {
    label: 'Parcare / Spălătorie',
    shortLabel: 'Parcare',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35',
  },
  SERVICE: {
    label: 'Vulcanizare / Service',
    shortLabel: 'Service',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-400/35',
  },
  OTHER: {
    label: 'Alte bonuri / Facturi',
    shortLabel: 'Altele',
    badgeClass: 'bg-white/10 text-white/85 border-white/20',
  },
};

const CURRENCIES: DriverExpenseCurrency[] = ['EUR', 'RON', 'HUF', 'PLN', 'SEK', 'CZK'];

interface DriverExpensesPanelProps {
  trailerId: string;
  driverName: string;
  tripOptions: Array<{ ref: string; label: string }>;
  expenses: DriverExpenseRecord[];
  authToken?: string;
  tenantId?: string;
  canValidate?: boolean;
  defaultFormOpen?: boolean;
  hideForm?: boolean;
  prefilledTripRef?: string;
  onSubmitExpense?: (
    payload: SubmitDriverExpenseInput,
    localPreview?: { dataUrl?: string; mimeType?: string; sizeBytes?: number }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteExpense?: (id: string) => Promise<void>;
  onUpdateExpenseStatus?: (id: string, status: 'Înregistrat' | 'Validat Admin') => Promise<void>;
  assignedCards?: HourlyPlanningCard[];
  showAllTrailers?: boolean;
}

function getCategoryIcon(cat: DriverExpenseCategory) {
  switch (cat) {
    case 'FUEL':
      return <Fuel className="w-3.5 h-3.5 shrink-0" />;
    case 'ADBLUE':
      return <Droplets className="w-3.5 h-3.5 shrink-0" />;
    case 'TOLL':
      return <Route className="w-3.5 h-3.5 shrink-0" />;
    case 'SERVICE':
      return <Wrench className="w-3.5 h-3.5 shrink-0" />;
    case 'PARKING':
      return <ShieldCheck className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Receipt className="w-3.5 h-3.5 shrink-0" />;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DriverExpensesPanel: React.FC<DriverExpensesPanelProps> = ({
  trailerId,
  driverName,
  tripOptions,
  expenses,
  authToken = '',
  tenantId = 'blue-trans',
  canValidate = false,
  defaultFormOpen = true,
  hideForm = false,
  prefilledTripRef = '',
  onSubmitExpense,
  onDeleteExpense,
  onUpdateExpenseStatus,
  showAllTrailers = false,
}) => {
  const [formOpen, setFormOpen] = useState(hideForm ? false : defaultFormOpen);
  const [category, setCategory] = useState<DriverExpenseCategory>('FUEL');
  const [tripRef, setTripRef] = useState<string>(prefilledTripRef || tripOptions[0]?.ref || '');
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState<DriverExpenseCurrency>('EUR');
  const [litersStr, setLitersStr] = useState('');
  const [odometerStr, setOdometerStr] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<{
    fileName: string;
    base64: string;
    dataUrl: string;
    mimeType: string;
    sizeBytes: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [filterCat, setFilterCat] = useState<DriverExpenseCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewExpense, setPreviewExpense] = useState<DriverExpenseRecord | null>(null);

  React.useEffect(() => {
    if (prefilledTripRef) {
      setTripRef(prefilledTripRef);
      setFormOpen(true);
    }
  }, [prefilledTripRef]);

  const scopedExpenses = useMemo(() => {
    const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return expenses.filter((exp) => {
      if (!showAllTrailers && norm(exp.trailerId) !== norm(trailerId)) {
        return false;
      }
      if (filterCat !== 'ALL' && exp.category !== filterCat) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = `${exp.vendorName} ${exp.tripLabel || ''} ${exp.tripRef || ''} ${exp.notes || ''} ${exp.displayName || ''} ${exp.trailerId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, showAllTrailers, trailerId, filterCat, searchTerm]);

  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of scopedExpenses) {
      map.set(exp.currency, +(Number(map.get(exp.currency) || 0) + Number(exp.amount || 0)).toFixed(2));
    }
    return Array.from(map.entries());
  }, [scopedExpenses]);

  const handleFilePick = async (file?: File) => {
    setFormError(null);
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setFormError('Acceptăm doar poze (JPG, PNG, WEBP) sau documente PDF.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFormError('Fișierul depășește limita maximă de 12 MB.');
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Nu am putut citi fișierul selectat.'));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setAttachment({
        fileName: file.name,
        base64,
        dataUrl,
        mimeType: file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        sizeBytes: file.size,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Eroare la citirea fișierului.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const parsedAmount = Number(String(amountStr).replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Introdu o sumă validă mai mare decât 0 (ex: 420.50).');
      return;
    }
    if (!vendorName.trim()) {
      setFormError('Introdu stația sau furnizorul de pe bon/factură (ex: OMV Oradea, Shell, ASFINAG).');
      return;
    }

    const selectedTrip = tripOptions.find((t) => t.ref === tripRef);
    const parsedLiters = Number(String(litersStr).replace(',', '.'));
    const parsedKm = Number(String(odometerStr).replace(/[^0-9]/g, ''));

    if (!onSubmitExpense) return;
    setSubmitting(true);
    try {
      const res = await onSubmitExpense(
        {
          trailerId,
          driverName,
          tripRef: tripRef || undefined,
          tripLabel: selectedTrip?.label || undefined,
          category,
          amount: +parsedAmount.toFixed(2),
          currency,
          liters: Number.isFinite(parsedLiters) && parsedLiters > 0 ? +parsedLiters.toFixed(1) : undefined,
          odometerKm: Number.isFinite(parsedKm) && parsedKm > 0 ? Math.round(parsedKm) : undefined,
          vendorName: vendorName.trim(),
          expenseDate,
          notes: notes.trim() || undefined,
          fileName: attachment?.fileName,
          base64: attachment?.base64,
        },
        attachment
          ? {
              dataUrl: attachment.dataUrl,
              mimeType: attachment.mimeType,
              sizeBytes: attachment.sizeBytes,
            }
          : undefined
      );
      if (!res.ok) {
        setFormError(res.error || 'Nu am putut salva bonul.');
        return;
      }
      setFormSuccess(
        `Bonul ${EXPENSE_CATEGORY_META[category].shortLabel} (${parsedAmount.toFixed(2)} ${currency} · ${vendorName.trim()}) a fost înregistrat${attachment ? ` cu atașamentul "${attachment.fileName}"` : ''}.`
      );
      setAmountStr('');
      setLitersStr('');
      setOdometerStr('');
      setVendorName('');
      setNotes('');
      setAttachment(null);
    } finally {
      setSubmitting(false);
    }
  };

  const previewUrl = previewExpense
    ? buildDriverExpenseFileUrl(
        previewExpense.fileName,
        tenantId,
        authToken,
        previewExpense.localDataUrl
      )
    : '';
  const isPreviewPdf = Boolean(
    previewExpense &&
      (previewExpense.mimeType === 'application/pdf' ||
        previewExpense.displayName?.toLowerCase().endsWith('.pdf') ||
        previewExpense.fileName?.toLowerCase().endsWith('.pdf'))
  );

  return (
    <section
      id="driver-expenses-panel"
      className="tahoe-glass rounded-[26px] p-4 sm:p-5 space-y-4 border border-white/10"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#FF9F0A] flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span>BONURI CARBURANT, TAXE DRUM &amp; FACTURI CHELTUIELI</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            {hideForm
              ? `Bonuri & Cheltuieli Cabină Șoferi (${scopedExpenses.length})`
              : `Încărcare Bonuri & Documente Cheltuieli (${scopedExpenses.length})`}
          </h2>
          {totalsByCurrency.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-white/75 tabular-nums">
              <span>Total înregistrat:</span>
              {totalsByCurrency.map(([cur, total]) => (
                <span
                  key={cur}
                  className="px-2 py-0.5 rounded-full bg-white/10 font-bold text-white"
                >
                  {total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cur}
                </span>
              ))}
            </div>
          )}
        </div>

        {!hideForm && (
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="px-3.5 py-2 rounded-full bg-[#0A84FF] hover:brightness-110 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            style={{ color: '#ffffff' }}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>
              {formOpen ? 'Ascunde Formular Bon' : 'Adaugă Bon / Factură'}
            </span>
          </button>
        )}
      </div>

      {/* Add Expense & Receipt Upload Form */}
      {formOpen && !hideForm && (
        <form
          onSubmit={handleSubmit}
          className="tahoe-card-inner rounded-[22px] p-4 space-y-3.5 border border-white/10"
        >
          {/* Category Pills */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              Tip Bon / Cheltuială
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EXPENSE_CATEGORY_META) as DriverExpenseCategory[]).map((catKey) => {
                const active = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                      active
                        ? 'bg-[#0A84FF] text-white border-[#0A84FF] shadow-xs'
                        : 'bg-white/5 text-white/75 border-white/15 hover:bg-white/10'
                    }`}
                    style={active ? { color: '#ffffff' } : undefined}
                  >
                    {getCategoryIcon(catKey)}
                    <span>{EXPENSE_CATEGORY_META[catKey].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Numeric + Vendor Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label
                htmlFor="driver-exp-vendor"
                className="block font-semibold text-white/75 mb-1"
              >
                Stație / Furnizor *
              </label>
              <input
                id="driver-exp-vendor"
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="ex: OMV Oradea / Shell / ASFINAG"
                className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-semibold border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                required
              />
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <div className="col-span-3">
                <label
                  htmlFor="driver-exp-amount"
                  className="block font-semibold text-white/75 mb-1"
                >
                  Sumă *
                </label>
                <input
                  id="driver-exp-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="ex: 485.50"
                  className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-bold tabular-nums border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                  required
                />
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="driver-exp-currency"
                  className="block font-semibold text-white/75 mb-1"
                >
                  Monedă
                </label>
                <select
                  id="driver-exp-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as DriverExpenseCurrency)}
                  className="w-full tahoe-glass rounded-xl px-2 py-2 text-white font-bold border border-white/15 cursor-pointer"
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur} value={cur} className="bg-slate-900 text-white">
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="driver-exp-trip"
                className="block font-semibold text-white/75 mb-1"
              >
                Cursă asociată
              </label>
              <select
                id="driver-exp-trip"
                value={tripRef}
                onChange={(e) => setTripRef(e.target.value)}
                className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-semibold border border-white/15 cursor-pointer"
              >
                {tripOptions.map((opt) => (
                  <option key={opt.ref || 'general'} value={opt.ref} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
                <option value="" className="bg-slate-900 text-white">
                  Cheltuială generală camion ({trailerId})
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="driver-exp-date"
                className="block font-semibold text-white/75 mb-1"
              >
                Data bonului
              </label>
              <input
                id="driver-exp-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-semibold tabular-nums border border-white/15 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>
          </div>

          {/* Optional Liters, Odometer & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {(category === 'FUEL' || category === 'ADBLUE') && (
              <div>
                <label
                  htmlFor="driver-exp-liters"
                  className="block font-semibold text-white/75 mb-1"
                >
                  Cantitate (Litri, opțional)
                </label>
                <input
                  id="driver-exp-liters"
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  value={litersStr}
                  onChange={(e) => setLitersStr(e.target.value)}
                  placeholder="ex: 320"
                  className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-semibold tabular-nums border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="driver-exp-km"
                className="block font-semibold text-white/75 mb-1"
              >
                Km bord (opțional)
              </label>
              <input
                id="driver-exp-km"
                type="number"
                min="0"
                inputMode="numeric"
                value={odometerStr}
                onChange={(e) => setOdometerStr(e.target.value)}
                placeholder="ex: 412890"
                className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-semibold tabular-nums border border-white/15 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            <div className={category === 'FUEL' || category === 'ADBLUE' ? '' : 'sm:col-span-2'}>
              <label
                htmlFor="driver-exp-notes"
                className="block font-semibold text-white/75 mb-1"
              >
                Observații / Nr. bon sau factură
              </label>
              <input
                id="driver-exp-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: Alimentare 320L cu card DKV / Bon nr. 8812"
                className="w-full tahoe-glass rounded-xl px-3 py-2 text-white font-medium border border-white/15 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>
          </div>

          {/* Attachment Picker (Photo / Camera / PDF) + Preview */}
          <div className="rounded-2xl border border-dashed border-white/25 bg-white/[0.03] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="px-3.5 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = '';
                    void handleFilePick(f);
                  }}
                />
                <Paperclip className="w-3.5 h-3.5 text-[#64D2FF]" />
                <span>Atașează Poză / Document PDF</span>
              </label>

              <label className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = '';
                    void handleFilePick(f);
                  }}
                />
                <Camera className="w-3.5 h-3.5 text-[#30D158]" />
                <span>Foto Cameră</span>
              </label>

              {!attachment && (
                <span className="text-[11px] text-white/55">
                  Formate: JPG, PNG, WEBP, PDF (max 12 MB)
                </span>
              )}
            </div>

            {attachment && (
              <div className="flex items-center gap-2.5 bg-emerald-500/15 border border-[#30D158]/35 rounded-xl px-3 py-1.5">
                {attachment.mimeType.startsWith('image/') ? (
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.fileName}
                    className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <FileText className="w-6 h-6 text-[#64D2FF] shrink-0" />
                )}
                <div className="min-w-0 text-[11px]">
                  <div className="font-bold text-white truncate max-w-[180px]">
                    {attachment.fileName}
                  </div>
                  <div className="text-[#30D158] font-semibold">
                    Atașat · {formatFileSize(attachment.sizeBytes)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  aria-label="Elimină fișierul atașat"
                  className="p-1 rounded-full hover:bg-white/15 text-white/75 hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {formError && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="px-3.5 py-2 rounded-xl bg-[#30D158]/20 border border-[#30D158]/40 text-[#30D158] text-xs font-semibold flex items-center justify-between gap-2">
              <span>{formSuccess}</span>
              <button
                type="button"
                onClick={() => setFormSuccess(null)}
                className="text-xs font-bold underline cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-full bg-[#30D158] hover:brightness-105 disabled:opacity-60 text-slate-950 text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer transition shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>{submitting ? 'Se încarcă bonul...' : 'Trimite Bon / Factură Cheltuială'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter */}
      {expenses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-white/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Caută stație, cursă, fișier..."
              className="w-full tahoe-card-inner rounded-full pl-8 pr-3.5 py-1.5 text-xs text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterCat('ALL')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                filterCat === 'ALL'
                  ? 'bg-[#0A84FF] text-white border-[#0A84FF]'
                  : 'bg-white/5 text-white/70 border-white/15'
              }`}
              style={filterCat === 'ALL' ? { color: '#ffffff' } : undefined}
            >
              Toate ({expenses.filter((e) => showAllTrailers || e.trailerId === trailerId).length})
            </button>
            {(Object.keys(EXPENSE_CATEGORY_META) as DriverExpenseCategory[]).map((catKey) => (
              <button
                key={catKey}
                type="button"
                onClick={() => setFilterCat(catKey)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                  filterCat === catKey
                    ? 'bg-[#0A84FF] text-white border-[#0A84FF]'
                    : 'bg-white/5 text-white/70 border-white/15'
                }`}
                style={filterCat === catKey ? { color: '#ffffff' } : undefined}
              >
                {EXPENSE_CATEGORY_META[catKey].shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List of Submitted Fuel Receipts & Expenses */}
      {scopedExpenses.length === 0 ? (
        <div className="tahoe-card-inner rounded-2xl p-6 text-center text-xs text-white/60 border border-white/10">
          Niciun bon sau document de cheltuială înregistrat momentan{showAllTrailers ? '' : ` pentru ${trailerId}`}. Folosește formularul de mai sus pentru a atașa poze cu bonuri de carburant, taxe drum sau facturi de service.
        </div>
      ) : (
        <div className="space-y-2.5">
          {scopedExpenses.map((exp) => {
            const meta = EXPENSE_CATEGORY_META[exp.category] || EXPENSE_CATEGORY_META.OTHER;
            const fileUrl = buildDriverExpenseFileUrl(
              exp.fileName,
              tenantId,
              authToken,
              exp.localDataUrl
            );
            const isImage = Boolean(
              exp.mimeType?.startsWith('image/') ||
                /\.(jpg|jpeg|png|webp)$/i.test(exp.displayName || exp.fileName || '')
            );
            const canDeleteThis =
              Boolean(onDeleteExpense) && (canValidate || exp.status !== 'Validat Admin');

            return (
              <div
                key={exp.id}
                className="tahoe-card-inner rounded-2xl p-3.5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {fileUrl && isImage ? (
                    <button
                      type="button"
                      onClick={() => setPreviewExpense(exp)}
                      className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 shrink-0 cursor-pointer hover:opacity-90 transition"
                      title="Mărește poza bonului"
                    >
                      <img
                        src={fileUrl}
                        alt={exp.displayName || exp.vendorName}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#FF9F0A] shrink-0">
                      {getCategoryIcon(exp.category)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border inline-flex items-center gap-1 ${meta.badgeClass}`}
                      >
                        {getCategoryIcon(exp.category)}
                        <span>{meta.label}</span>
                      </span>

                      {showAllTrailers && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30">
                          {exp.trailerId}
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          exp.status === 'Validat Admin'
                            ? 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/35'
                            : 'bg-white/10 text-white/75 border-white/15'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white flex flex-wrap items-baseline gap-2">
                      <span>{exp.vendorName}</span>
                      <span className="text-[#FF9F0A] font-extrabold tabular-nums">
                        {Number(exp.amount).toLocaleString('ro-RO', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {exp.currency}
                      </span>
                      {exp.liters && (
                        <span className="text-xs font-semibold text-[#64D2FF] tabular-nums">
                          ({exp.liters} L)
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-white/65 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="tabular-nums">Dată: {exp.expenseDate}</span>
                      {exp.tripLabel && <span>Cursă: {exp.tripLabel}</span>}
                      {exp.odometerKm && (
                        <span className="tabular-nums">Km: {exp.odometerKm.toLocaleString('ro-RO')}</span>
                      )}
                      <span>Șofer: {exp.driverName}</span>
                    </div>

                    {exp.notes && (
                      <div className="text-[11px] text-white/75 italic">{exp.notes}</div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {fileUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewExpense(exp)}
                      className="px-3 py-1.5 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="max-w-[120px] truncate">
                        {exp.displayName || 'Vezi document'}
                      </span>
                    </button>
                  )}

                  {canValidate && onUpdateExpenseStatus && (
                    <button
                      type="button"
                      onClick={() =>
                        void onUpdateExpenseStatus(
                          exp.id,
                          exp.status === 'Validat Admin' ? 'Înregistrat' : 'Validat Admin'
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 border cursor-pointer transition ${
                        exp.status === 'Validat Admin'
                          ? 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/40'
                          : 'tahoe-btn-secondary text-white border-white/15'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {exp.status === 'Validat Admin' ? 'Validat' : 'Validează'}
                      </span>
                    </button>
                  )}

                  {canDeleteThis && onDeleteExpense && (
                    confirmDeleteId === exp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteExpense(exp.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Confirmă ștergerea
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 rounded-full tahoe-btn-secondary text-[11px] font-bold text-white cursor-pointer"
                        >
                          Anulează
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(exp.id)}
                        title="Șterge bonul"
                        aria-label={`Șterge bonul ${exp.vendorName}`}
                        className="p-2 rounded-full tahoe-btn-secondary text-white/75 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attachment Lightbox / PDF Preview Modal */}
      {previewExpense && (
        <div
          onClick={() => setPreviewExpense(null)}
          className="modal-backdrop-lock fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Document atașat ${previewExpense.vendorName}`}
            className="tahoe-glass-elevated rounded-[26px] max-w-3xl w-full p-4 sm:p-5 space-y-4 border border-white/20 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-[#FF9F0A]">
                  {EXPENSE_CATEGORY_META[previewExpense.category]?.label} · {previewExpense.trailerId}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                  {previewExpense.vendorName} — {previewExpense.amount} {previewExpense.currency}
                </h3>
                <div className="text-xs text-white/65">
                  {previewExpense.displayName || 'Document atașat'} · {previewExpense.expenseDate}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewExpense(null)}
                aria-label="Închide previzualizarea documentului"
                className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/15 flex items-center justify-center min-h-[260px] max-h-[70vh]">
              {!previewUrl ? (
                <div className="p-8 text-xs text-white/65 text-center">
                  Previzualizarea fișierului necesită sesiune activă pe server.
                </div>
              ) : isPreviewPdf ? (
                <iframe
                  title={previewExpense.displayName || 'Document PDF'}
                  src={previewUrl}
                  className="w-full h-[65vh] bg-white"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={previewExpense.displayName || previewExpense.vendorName}
                  className="max-w-full max-h-[68vh] object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-[#64D2FF] inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Deschide în fereastră nouă</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setPreviewExpense(null)}
                className="ms-auto px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
