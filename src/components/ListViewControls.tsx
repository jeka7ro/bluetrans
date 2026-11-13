import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileSpreadsheet,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  X,
} from 'lucide-react';

export type ViewModeType = 'cards' | 'list';
export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  dir: SortDirection;
}

export const TAHOE_TABLE_WRAPPER_CLASS =
  'tahoe-card-inner rounded-2xl border border-white/15 overflow-hidden';

export const TAHOE_TABLE_SCROLL_CLASS =
  'overflow-x-auto max-h-[70vh] overflow-y-auto';

export const TAHOE_TABLE_STYLE: React.CSSProperties = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 13,
  fontVariantNumeric: 'tabular-nums',
};

export const TAHOE_CELL_BORDER_STYLE: React.CSSProperties = {
  borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
};

export const TAHOE_HEADER_STICKY_STYLE: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backdropFilter: 'blur(18px) saturate(180%)',
  borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
};

export function getTahoeRowStyle(
  idx: number,
  isSelected = false
): React.CSSProperties {
  return {
    height: 48,
    backgroundColor: isSelected
      ? 'rgba(10, 132, 255, 0.16)'
      : idx % 2 === 1
        ? 'rgba(148, 163, 184, 0.05)'
        : 'transparent',
  };
}

export function usePersistedViewMode(
  storageKey: string,
  defaultMode: ViewModeType = 'list'
): [ViewModeType, (mode: ViewModeType) => void] {
  const [viewMode, setViewModeState] = useState<ViewModeType>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'cards' || saved === 'list') return saved;
    } catch {
      // ignore storage errors
    }
    return defaultMode;
  });

  const setViewMode = (next: ViewModeType) => {
    setViewModeState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // ignore storage errors
    }
  };

  return [viewMode, setViewMode];
}

export function usePersistedPageSize(
  storageKey: string,
  defaultSize = 10
): [number, (size: number) => void] {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw !== null ? Number(raw) : NaN;
      if ([0, 5, 10, 25, 50].includes(parsed)) return parsed;
    } catch {
      // ignore storage errors
    }
    return defaultSize;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(pageSize));
    } catch {
      // ignore storage errors
    }
  }, [storageKey, pageSize]);

  return [pageSize, setPageSizeState];
}

export function toggleSortState<K extends string>(
  prev: SortState<K> | null,
  key: K
): SortState<K> {
  if (prev?.key === key) {
    return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key, dir: 'asc' };
}

export function paginateItems<T>(items: T[], pageSize: number, page: number) {
  const total = items.length;
  const effectiveSize = pageSize === 0 ? Math.max(total, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / effectiveSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = pageSize === 0 ? 0 : (safePage - 1) * pageSize;
  const endIdx = pageSize === 0 ? total : Math.min(total, startIdx + pageSize);
  return {
    total,
    totalPages,
    safePage,
    startIdx,
    endIdx,
    visibleItems: items.slice(startIdx, endIdx),
  };
}

/** Hook reutilizabil pentru Bulk Select sigur (curăță automat ID-urile filtrate/șterse). */
export function useTableSelection(
  filteredIds: readonly string[],
  visibleIds: readonly string[]
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const filteredSignature = filteredIds.join('\u0000');

  useEffect(() => {
    const valid = new Set(filteredIds);
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSignature]);

  const isSelected = (id: string) => selectedIds.has(id);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { isAllVisibleSelected, isSomeVisibleSelected } = useMemo(() => {
    if (visibleIds.length === 0) {
      return { isAllVisibleSelected: false, isSomeVisibleSelected: false };
    }
    let checkedCount = 0;
    for (const id of visibleIds) {
      if (selectedIds.has(id)) checkedCount += 1;
    }
    return {
      isAllVisibleSelected: checkedCount === visibleIds.length,
      isSomeVisibleSelected: checkedCount > 0 && checkedCount < visibleIds.length,
    };
  }, [visibleIds, selectedIds]);

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      if (visibleIds.length === 0) return prev;
      const allOnPageSelected = visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOnPageSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggleOne,
    toggleAllVisible,
    selectAllFiltered,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
  };
}

interface BulkCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
  className?: string;
}

/** Checkbox accesibil pentru rânduri/carduri — oprește propagarea click-ului spre modal. */
export const BulkCheckbox: React.FC<BulkCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center p-1 rounded cursor-pointer select-none ${className}`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        aria-label={ariaLabel}
        className="w-4 h-4 rounded accent-[#0A84FF] cursor-pointer"
      />
    </label>
  );
};

interface CheckboxThProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

/** Antet coloană selecție în masă, aliniat și sticky cu `.fleet-list-th`. */
export const CheckboxTh: React.FC<CheckboxThProps> = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel = 'Selectează toate rândurile de pe pagină',
}) => (
  <th
    scope="col"
    className="fleet-list-th px-1.5 py-2.5 text-center w-9 select-none"
    style={TAHOE_HEADER_STICKY_STYLE}
  >
    <BulkCheckbox
      checked={checked}
      indeterminate={indeterminate}
      onChange={onChange}
      ariaLabel={ariaLabel}
    />
  </th>
);

interface ViewModeToggleProps {
  value: ViewModeType;
  onChange: (mode: ViewModeType) => void;
  ariaLabel?: string;
}

/** Comutator capsulă Carduri / Listă — unificat peste toate modulele TMS. */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  value,
  onChange,
  ariaLabel = 'Mod afișare',
}) => (
  <div
    className="inline-flex items-center rounded-full tahoe-card-inner p-0.5 border border-white/15 shrink-0"
    role="group"
    aria-label={ariaLabel}
  >
    {(
      [
        { id: 'cards' as const, label: 'Carduri', Icon: LayoutGrid },
        { id: 'list' as const, label: 'Listă', Icon: ListIcon },
      ]
    ).map(({ id, label, Icon }) => {
      const active = value === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
            active
              ? 'bg-[#0A84FF] text-white shadow-sm shadow-[#0A84FF]/35'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </button>
      );
    })}
  </div>
);

interface SortableThProps<K extends string> {
  label: string;
  sortKey?: K;
  sort?: SortState<K> | null;
  onToggle?: (key: K) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

/** Antet sortabil sticky cu blur `.fleet-list-th` (Finder / macOS Tahoe, ambele teme). */
export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'left',
  className = '',
}: SortableThProps<K>) {
  const alignClass =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';
  const isActive = Boolean(sortKey && sort?.key === sortKey);

  return (
    <th
      scope="col"
      className={`fleet-list-th px-2 py-2.5 text-[10.5px] font-bold uppercase tracking-wider whitespace-nowrap select-none ${alignClass} ${className}`}
      style={TAHOE_HEADER_STICKY_STYLE}
    >
      {sortKey && onToggle ? (
        <button
          type="button"
          onClick={() => onToggle(sortKey)}
          data-active={isActive ? 'true' : 'false'}
          className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 -mx-1.5 hover:bg-white/10 transition cursor-pointer ${
            align === 'right'
              ? 'justify-end w-full'
              : align === 'center'
                ? 'justify-center'
                : ''
          }`}
        >
          <span>{label}</span>
          <span className="text-[9px]" style={{ opacity: isActive ? 1 : 0.35 }}>
            {isActive ? (sort?.dir === 'asc' ? '▲' : '▼') : '▲▼'}
          </span>
        </button>
      ) : (
        label
      )}
    </th>
  );
}

interface BulkActionBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onBulkEdit?: () => void;
  bulkEditLabel?: string;
  onBulkDelete?: () => void;
  bulkDeleteLabel?: string;
  onBulkExport?: () => void;
  extraActions?: React.ReactNode;
  itemNounSingular?: string;
  itemNounPlural?: string;
}

/** Bară de acțiuni în masă afișată automat când există rânduri/carduri bifate. */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalFilteredCount,
  onSelectAllFiltered,
  onClearSelection,
  onBulkEdit,
  bulkEditLabel = 'Editează în masă',
  onBulkDelete,
  bulkDeleteLabel = 'Șterge selecția',
  onBulkExport,
  extraActions,
  itemNounSingular = 'element selectat',
  itemNounPlural = 'elemente selectate',
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      role="region"
      aria-label="Acțiuni pentru selecția multiplă"
      className="tahoe-bulk-bar rounded-2xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A84FF] text-white font-extrabold tabular-nums">
          <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {selectedCount} {selectedCount === 1 ? itemNounSingular : itemNounPlural}
          </span>
        </span>

        {selectedCount < totalFilteredCount && (
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[11px] font-bold text-[#64D2FF] cursor-pointer"
          >
            Selectează toate ({totalFilteredCount})
          </button>
        )}

        <button
          type="button"
          onClick={onClearSelection}
          className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[11px] font-bold text-white/75 hover:text-white cursor-pointer"
        >
          Deselectează
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {extraActions}

        {onBulkExport && (
          <ExportExcelButton
            onClick={onBulkExport}
            count={selectedCount}
            label={`Excel (${selectedCount})`}
            mobileLabel={`Excel (${selectedCount})`}
            title={`Exportă cele ${selectedCount} înregistrări selectate în Excel (.xlsx)`}
          />
        )}

        {onBulkEdit && (
          <button
            type="button"
            onClick={onBulkEdit}
            className="px-3 py-1.5 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-[#0A84FF]/30 transition"
          >
            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {bulkEditLabel} ({selectedCount})
            </span>
          </button>
        )}

        {onBulkDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {bulkDeleteLabel} ({selectedCount})
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

interface BulkDeleteConfirmModalProps {
  open: boolean;
  title: string;
  count: number;
  previewLabels: string[];
  warningNote?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Modal in-app de confirmare ștergere în masă (fără `window.confirm`). */
export const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
  open,
  title,
  count,
  previewLabels,
  warningNote,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const visiblePreview = previewLabels.slice(0, 5);
  const remainingCount = Math.max(0, previewLabels.length - visiblePreview.length);

  return (
    <div
      className="fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm modal-backdrop-lock flex items-center justify-center p-4"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[24px] tahoe-glass border border-white/15 p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/35 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <h3 id="bulk-delete-modal-title" className="text-base font-extrabold text-white">
                {title}
              </h3>
              <p className="text-xs text-white/65">
                {count} {count === 1 ? 'înregistrare selectată' : 'înregistrări selectate'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            aria-label="Închide fereastra"
            className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {visiblePreview.length > 0 && (
          <div className="rounded-2xl tahoe-card-inner border border-white/10 p-3 space-y-1.5 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/55">
              Vor fi șterse definitiv:
            </div>
            <ul className="space-y-1 text-white/90 font-semibold">
              {visiblePreview.map((lbl, idx) => (
                <li key={idx} className="truncate">
                  • {lbl}
                </li>
              ))}
            </ul>
            {remainingCount > 0 && (
              <div className="text-[11px] text-white/55 font-semibold pt-0.5">
                + încă {remainingCount} {remainingCount === 1 ? 'element' : 'elemente'}
              </div>
            )}
          </div>
        )}

        {warningNote && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-200">
            {warningNote}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
          >
            Anulează
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 transition"
          >
            {loading ? 'Se șterge...' : `Confirmă ștergerea (${count})`}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ListPaginationBarProps {
  total: number;
  startIdx: number;
  endIdx: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  pageSizeOptions?: number[];
  unfilteredTotal?: number;
  unfilteredLabel?: string;
}

/** Subsol comun pentru selectorul „Rânduri pe pagină” și navigare pagini. */
export const ListPaginationBar: React.FC<ListPaginationBarProps> = ({
  total,
  startIdx,
  endIdx,
  pageSize,
  onPageSizeChange,
  page,
  totalPages,
  onPageChange,
  pageSizeOptions = [5, 10, 25, 50, 0],
  unfilteredTotal,
  unfilteredLabel = 'total',
}) => {
  if (total === 0) return null;
  return (
    <div className="px-3.5 sm:px-4 py-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-[11px] text-white/75">
      <div className="flex items-center gap-2">
        <span>Rânduri pe pagină</span>
        <select
          aria-label="Rânduri pe pagină"
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="tahoe-card-inner rounded-full px-2.5 py-1 text-[11px] font-bold text-white border border-white/15 cursor-pointer"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'Toate' : n}
            </option>
          ))}
        </select>
      </div>

      <span className="font-bold text-white tabular-nums">
        {startIdx + 1}–{endIdx} din {total}
        {typeof unfilteredTotal === 'number' && unfilteredTotal !== total && (
          <span className="text-white/55 font-normal">
            {' '}
            ({unfilteredLabel}: {unfilteredTotal})
          </span>
        )}
      </span>

      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1 || pageSize === 0}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Pagina anterioară"
          className="w-7 h-7 rounded-full tahoe-btn-secondary flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-default"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-bold tabular-nums px-1">
          Pagina {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || pageSize === 0}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Pagina următoare"
          className="w-7 h-7 rounded-full tahoe-btn-secondary flex items-center justify-center disabled:opacity-35 cursor-pointer disabled:cursor-default"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface ExportExcelButtonProps {
  onClick: () => void;
  disabled?: boolean;
  count?: number;
  label?: string;
  mobileLabel?: string;
  title?: string;
  className?: string;
}

/** Buton comun de export nativ Excel (.xlsx) compatibil cu Dark & Light Mode. */
export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  onClick,
  disabled = false,
  count,
  label = 'Export Excel',
  mobileLabel = 'Excel',
  title,
  className = '',
}) => {
  const computedTitle =
    title ??
    (typeof count === 'number'
      ? `Exportă ${count} ${count === 1 ? 'înregistrare' : 'înregistrări'} în Excel (.xlsx)`
      : 'Exportă lista curentă în Excel (.xlsx)');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={computedTitle}
      aria-label={computedTitle}
      className={`tahoe-btn-secondary px-3 py-1.5 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition ${className}`}
    >
      <FileSpreadsheet
        className="w-3.5 h-3.5 text-emerald-400 shrink-0"
        aria-hidden="true"
      />
      <span className="sm:hidden">{mobileLabel}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
