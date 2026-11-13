import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import { Temporal as TemporalPolyfill } from 'temporal-polyfill';

// Ensure Temporal is available in browsers without native Temporal (e.g. Safari)
const listeners = new Set<() => void>();

export function ensureTemporalPolyfill(): void {
  if (typeof (globalThis as Record<string, unknown>).Temporal !== 'undefined') {
    return;
  }
  (globalThis as Record<string, unknown>).Temporal = TemporalPolyfill;
  listeners.forEach((fn) => fn());
}

interface PlainYmd {
  year: number;
  month: number;
  day: number;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/** Pure Gregorian Rata Die day index (zero Date/timestamp/timezone offset math). */
function toRataDie(ymd: PlainYmd): number {
  const y = ymd.month <= 2 ? ymd.year - 1 : ymd.year;
  const m = ymd.month <= 2 ? ymd.month + 12 : ymd.month;
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    ymd.day +
    b -
    1524
  );
}

/** Parse ISO `YYYY-MM-DD` using Temporal.PlainDate when available, or strict Gregorian bounds. */
export function parseIsoPlainDate(iso?: string): PlainYmd | null {
  if (!iso) return null;
  const trimmed = iso.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) return null;

  const T = (globalThis as Record<string, any>).Temporal;
  if (T?.PlainDate) {
    try {
      const pd = T.PlainDate.from(trimmed);
      return { year: pd.year, month: pd.month, day: pd.day };
    } catch {
      return null;
    }
  }

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Extract `YYYY-MM-DD` from Romanian policy/expiry strings (`DD.MM.YYYY`, ranges, CMR codes, or ISO). */
export function extractIsoDateFromText(raw?: string): string {
  if (!raw) return '';
  const text = raw.trim();
  if (!text || text === '-' || text === '—') return '';

  // Already ISO YYYY-MM-DD
  const isoMatch = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (isoMatch) {
    const candidate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    if (parseIsoPlainDate(candidate)) return candidate;
  }

  // Open-ended policy such as "26.09.2023-Activ" has only a start date, no fixed expiry date
  const roMatches = [...text.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)];
  if (/-\s*activ\b/i.test(text) && roMatches.length <= 1) {
    return '';
  }

  if (roMatches.length > 0) {
    const last = roMatches[roMatches.length - 1];
    const candidate = `${last[3]}-${last[2]}-${last[1]}`;
    if (parseIsoPlainDate(candidate)) return candidate;
  }

  // Known fleet CMR master policy codes
  if (text.includes('3531')) return '2026-12-31';
  if (text.includes('5657')) return '2027-06-30';

  return '';
}

/** Convert ISO `YYYY-MM-DD` to Romanian `DD.MM.YYYY` without Date timezone conversion. */
export function isoToRoDate(iso?: string): string {
  const parsed = parseIsoPlainDate(iso);
  if (!parsed) return '';
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  return `${dd}.${mm}.${parsed.year}`;
}

/** Compute exact calendar days remaining from today to `iso` (`YYYY-MM-DD`) using Temporal.PlainDate. */
export function calendarDaysUntilIso(iso?: string): number | null {
  const target = parseIsoPlainDate(iso);
  if (!target) return null;

  const T = (globalThis as Record<string, any>).Temporal;
  if (T?.Now?.plainDateISO && T?.PlainDate) {
    try {
      const today = T.Now.plainDateISO();
      const end = T.PlainDate.from(iso!.trim());
      const diff = today.until(end, { largestUnit: 'day' });
      return typeof diff.days === 'number' ? diff.days : null;
    } catch {
      // fall through to Rata Die
    }
  }

  const now = new Date();
  const todayYmd: PlainYmd = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  return toRataDie(target) - toRataDie(todayYmd);
}

/** Localized human duration tooltip via Intl.DurationFormat / Temporal.Duration.toLocaleString. */
export function formatLocalizedDurationRo(iso?: string, days?: number | null): string {
  if (days === null || days === undefined) return '';
  const absDays = Math.abs(days);

  const T = (globalThis as Record<string, any>).Temporal;
  if (iso && T?.Now?.plainDateISO && T?.PlainDate) {
    try {
      const today = T.Now.plainDateISO();
      const end = T.PlainDate.from(iso.trim());
      const span =
        days >= 0
          ? today.until(end, { largestUnit: 'year', smallestUnit: 'day' })
          : end.until(today, { largestUnit: 'year', smallestUnit: 'day' });
      if (typeof span.toLocaleString === 'function') {
        return span.toLocaleString('ro-RO', { style: 'long' });
      }
    } catch {
      // fall through
    }
  }

  const DurationFormatCtor = (Intl as Record<string, any>).DurationFormat;
  if (typeof DurationFormatCtor === 'function') {
    try {
      return new DurationFormatCtor('ro-RO', { style: 'long' }).format({
        days: absDays,
      });
    } catch {
      // fall through
    }
  }

  return `${absDays} ${absDays === 1 ? 'zi' : 'zile'}`;
}

export interface ExpiryBadgeSummary {
  days: number | null;
  shortText: string;
  longTooltip: string;
  bgHex: string;
  tone: 'ok' | 'warn' | 'expired' | 'neutral';
}

export function getExpiryBadgeSummary(
  iso?: string,
  emptyStatusLabel = 'Nesetat'
): ExpiryBadgeSummary {
  const days = calendarDaysUntilIso(iso);
  if (days === null) {
    const isActiveOpen = /^activ/i.test(emptyStatusLabel.trim());
    return {
      days: null,
      shortText: emptyStatusLabel,
      longTooltip: emptyStatusLabel,
      bgHex: isActiveOpen ? '#4ca656' : '#64748b',
      tone: isActiveOpen ? 'ok' : 'neutral',
    };
  }

  const localizedSpan = formatLocalizedDurationRo(iso, days);
  const roDate = isoToRoDate(iso);

  if (days < 0) {
    const abs = Math.abs(days);
    return {
      days,
      shortText: `Expirat (${abs} ${abs === 1 ? 'zi' : 'zile'})`,
      longTooltip: `Expirat acum ${localizedSpan} (${roDate})`,
      bgHex: '#d9534f',
      tone: 'expired',
    };
  }

  if (days === 0) {
    return {
      days: 0,
      shortText: 'Expiră azi!',
      longTooltip: `Expiră astăzi (${roDate})`,
      bgHex: '#d9534f',
      tone: 'expired',
    };
  }

  if (days <= 14) {
    return {
      days,
      shortText: `${days} ${days === 1 ? 'zi rămasă' : 'zile rămase'}`,
      longTooltip: `Expiră în ${localizedSpan} (${roDate})`,
      bgHex: '#d97706',
      tone: 'warn',
    };
  }

  return {
    days,
    shortText: `${days} zile rămase`,
    longTooltip: `Valabil încă ${localizedSpan} (până la ${roDate})`,
    bgHex: '#4ca656',
    tone: 'ok',
  };
}

/**
 * Update the expiry date inside an existing policy/tech string while preserving policy numbers/notes.
 * Example: `"408897 (10.12.2025-09.12.2026)"` + `"2027-12-09"` -> `"408897 (10.12.2025-09.12.2027)"`
 */
export function updateExpiryInPolicyString(
  existing: string | undefined,
  nextIso: string,
  options?: { appendDaysLabel?: boolean; keepNoteSuffix?: boolean }
): string {
  const nextRo = isoToRoDate(nextIso);
  const days = calendarDaysUntilIso(nextIso);
  if (!nextRo) {
    return '';
  }

  const raw = (existing || '').trim();
  if (!raw || raw === '-' || raw === '—') {
    if (options?.appendDaysLabel && days !== null) {
      return `${nextRo} (${days} zile)`;
    }
    return nextRo;
  }

  // Strip old "(123 zile)" or "(Expirat ...)" counter if present so we can refresh cleanly
  const withoutOldDays = raw
    .replace(/\s*\(-?\d+\s*zile(?:\s*rămase)?\)/gi, '')
    .trim();

  // Case: open-ended "26.09.2023-Activ" -> "26.09.2023-26.09.2027"
  if (/-\s*activ\b/i.test(withoutOldDays)) {
    return withoutOldDays.replace(/-\s*activ\b/i, `-${nextRo}`);
  }

  // Replace the LAST DD.MM.YYYY occurrence in the string
  const matches = [...withoutOldDays.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)];
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    const idx = last.index ?? 0;
    const replaced =
      withoutOldDays.slice(0, idx) +
      nextRo +
      withoutOldDays.slice(idx + last[0].length);
    if (options?.appendDaysLabel && days !== null && matches.length === 1 && !replaced.includes('(')) {
      return `${replaced} (${days} zile)`;
    }
    return replaced;
  }

  // Replace ISO date if present
  if (/(\d{4})-(\d{2})-(\d{2})/.test(withoutOldDays)) {
    return withoutOldDays.replace(/(\d{4})-(\d{2})-(\d{2})/, nextRo);
  }

  // Otherwise prepend/append cleanly (e.g. "LUTZ · W17 3531 12" -> "LUTZ · W17 3531 12 (31.12.2026)")
  if (options?.keepNoteSuffix !== false) {
    return `${withoutOldDays} (${nextRo})`;
  }
  return nextRo;
}

export interface ExpiryCalendarFieldProps {
  label: string;
  name: string;
  isoValue: string;
  onChangeIso: (nextIso: string) => void;
  insurerTag?: string;
  emptyStatusLabel?: string;
  helperNote?: string;
  required?: boolean;
  allowClear?: boolean;
}

export const ExpiryCalendarField: React.FC<ExpiryCalendarFieldProps> = ({
  label,
  name,
  isoValue,
  onChangeIso,
  insurerTag,
  emptyStatusLabel = 'Fără poliță',
  helperNote,
  required = false,
  allowClear = false,
}) => {
  const inputId = useId();
  const statusId = useId();
  const helperId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setTemporalReadyTick] = useState(0);

  useEffect(() => {
    ensureTemporalPolyfill();
    const rerender = () => setTemporalReadyTick((n) => n + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const badge = getExpiryBadgeSummary(isoValue, emptyStatusLabel);

  const openNativePicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
        (el as HTMLInputElement & { showPicker: () => void }).showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  };

  return (
    <div className="space-y-1.5 min-w-0">
      {/* Label + Live Remaining Days Capsule Badge */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <label
          htmlFor={inputId}
          className="font-bold text-white/85 text-xs flex items-center gap-1.5 min-w-0 truncate cursor-pointer"
        >
          <span className="truncate">{label}</span>
          {insurerTag && insurerTag !== '-' && (
            <span className="px-2 py-0.5 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/35 text-[9.5px] font-black text-[#64D2FF] uppercase shrink-0">
              {insurerTag}
            </span>
          )}
        </label>

        <span
          id={statusId}
          role="status"
          aria-live="polite"
          title={badge.longTooltip}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold tabular-nums whitespace-nowrap shrink-0 shadow-2xs"
          style={{ backgroundColor: badge.bgHex, color: '#ffffff' }}
        >
          {badge.tone === 'ok' && (
            <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: '#ffffff' }} />
          )}
          {badge.tone === 'warn' && (
            <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: '#ffffff' }} />
          )}
          {badge.tone === 'expired' && (
            <AlertCircle className="w-3 h-3 shrink-0" style={{ color: '#ffffff' }} />
          )}
          {badge.tone === 'neutral' && (
            <Clock className="w-3 h-3 shrink-0" style={{ color: '#ffffff' }} />
          )}
          <span style={{ color: '#ffffff' }}>{badge.shortText}</span>
        </span>
      </div>

      {/* Capsule Native Date Input + 1-Click Calendar Trigger */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="date"
          required={required}
          autoComplete="off"
          value={isoValue}
          onChange={(e) => onChangeIso(e.target.value)}
          aria-describedby={helperNote ? `${statusId} ${helperId}` : statusId}
          className={`tms-calendar-input w-full tahoe-card-inner rounded-full pl-3.5 ${
            allowClear && isoValue ? 'pr-24' : 'pr-12'
          } py-2 text-xs font-extrabold tabular-nums text-white border border-white/15 focus:outline-none focus:border-[#0A84FF] cursor-pointer`}
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {allowClear && isoValue && (
            <button
              type="button"
              onClick={() => onChangeIso('')}
              title={`Șterge data (${emptyStatusLabel})`}
              aria-label={`Șterge data pentru ${label}`}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/25 text-white/70 hover:text-red-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={openNativePicker}
            title={`Alege data din calendar (${label})`}
            aria-label={`Deschide calendarul pentru ${label}`}
            className="h-7 px-2.5 rounded-full bg-[#0A84FF] hover:brightness-110 flex items-center justify-center gap-1 text-[10.5px] font-extrabold shadow-xs transition cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffffff' }} />
          </button>
        </div>
      </div>

      {helperNote && (
        <div
          id={helperId}
          className="text-[10px] font-semibold text-white/55 truncate pl-2"
          title={helperNote}
        >
          {helperNote}
        </div>
      )}
    </div>
  );
};
