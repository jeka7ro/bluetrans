import { Temporal } from 'temporal-polyfill';

export const ROMANIA_TIME_ZONE = 'Europe/Bucharest';
export const BASE_PLANNING_MONDAY = Temporal.PlainDate.from('2026-11-09');

export const PLANNING_HOUR_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
] as const;

/**
 * Returns the 1-based daily sequence number (`1..11`) for a planning slot key (`08:00..18:00`).
 * Planning rows represent the daily order/sequence of shipments rather than strict clock hours.
 */
export function getPlanningOrderNumber(hourSlot: string): number {
  const idx = PLANNING_HOUR_SLOTS.indexOf(
    hourSlot as (typeof PLANNING_HOUR_SLOTS)[number]
  );
  return idx >= 0 ? idx + 1 : 1;
}

export function formatPlanningOrderPosition(hourSlot: string): string {
  return `Ordinea #${getPlanningOrderNumber(hourSlot)}`;
}

const RO_WEEKDAY_SHORT = ['LUN', 'MAR', 'MIE', 'JOI', 'VIN', 'SÂM', 'DUM'] as const;
const RO_WEEKDAY_FULL = [
  'Luni',
  'Marți',
  'Miercuri',
  'Joi',
  'Vineri',
  'Sâmbătă',
  'Duminică',
] as const;

const RO_MONTH_SHORT: Record<number, string> = {
  1: 'Ian',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'Mai',
  6: 'Iun',
  7: 'Iul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Noi',
  12: 'Dec',
};

const RO_MONTH_FULL_UPPER: Record<number, string> = {
  1: 'IANUARIE',
  2: 'FEBRUARIE',
  3: 'MARTIE',
  4: 'APRILIE',
  5: 'MAI',
  6: 'IUNIE',
  7: 'IULIE',
  8: 'AUGUST',
  9: 'SEPTEMBRIE',
  10: 'OCTOMBRIE',
  11: 'NOIEMBRIE',
  12: 'DECEMBRIE',
};

const RO_MONTH_TITLE: Record<number, string> = {
  1: 'Ianuarie',
  2: 'Februarie',
  3: 'Martie',
  4: 'Aprilie',
  5: 'Mai',
  6: 'Iunie',
  7: 'Iulie',
  8: 'August',
  9: 'Septembrie',
  10: 'Octombrie',
  11: 'Noiembrie',
  12: 'Decembrie',
};

export interface RomaniaClockSnapshot {
  zdt: Temporal.ZonedDateTime;
  isoInstant: string;
  isoDate: string;
  timeWithSeconds: string;
  timeShort: string;
  weekdayFull: string;
  weekdayShort: string;
  dateFull: string;
  dateCompact: string;
  dateMicro: string;
  tzAbbrev: string;
  utcOffset: string;
}

export interface PlanningDayMeta {
  dayIndex: number;
  weekOffset: number;
  short: string;
  label: string;
  date: string;
  dayNum: number;
  isoDate: string;
  isPastDay: boolean;
  isToday: boolean;
  hasFutureSlots: boolean;
}

export interface PlanningWeekMeta {
  weekOffset: number;
  mondayIso: string;
  sundayIso: string;
  monthYearTitle: string;
  rangeLabel: string;
  days: PlanningDayMeta[];
  hasAnyFutureSlot: boolean;
}

/**
 * Returns the live zoned date-time in Romania (`Europe/Bucharest`),
 * handling EET/EEST DST transitions automatically via Temporal.ZonedDateTime.
 */
export function getRomaniaZonedNow(): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(ROMANIA_TIME_ZONE);
}

/**
 * Formats the live Romania clock & date using Temporal.ZonedDateTime + native locale formatting.
 */
export function formatRomaniaClockSnapshot(
  zdt: Temporal.ZonedDateTime = getRomaniaZonedNow()
): RomaniaClockSnapshot {
  const dayOfWeekIdx = zdt.dayOfWeek - 1; // 1 (Mon) .. 7 (Sun) -> 0..6
  const weekdayFull = RO_WEEKDAY_FULL[dayOfWeekIdx] || 'Luni';
  const weekdayShort =
    weekdayFull === 'Miercuri'
      ? 'Mie'
      : weekdayFull === 'Sâmbătă'
        ? 'Sâm'
        : weekdayFull === 'Duminică'
          ? 'Dum'
          : weekdayFull.slice(0, 3);
  const monthShort = RO_MONTH_SHORT[zdt.month] || 'Noi';
  const monthTitle = RO_MONTH_TITLE[zdt.month] || 'Noiembrie';

  const timeWithSeconds = zdt.toLocaleString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const timeShort = zdt.toLocaleString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const tzAbbrev = zdt.offset === '+03:00' ? 'EEST' : 'EET';

  return {
    zdt,
    isoInstant: zdt.toInstant().toString(),
    isoDate: zdt.toPlainDate().toString(),
    timeWithSeconds,
    timeShort,
    weekdayFull,
    weekdayShort,
    dateFull: `${weekdayFull}, ${zdt.day} ${monthTitle} ${zdt.year}`,
    dateCompact: `${weekdayShort}, ${zdt.day} ${monthShort} ${zdt.year}`,
    dateMicro: `${zdt.day} ${monthShort} ${zdt.year}`,
    tzAbbrev,
    utcOffset: `UTC${zdt.offset}`,
  };
}

/**
 * Checks whether a calendar day/slot in `Europe/Bucharest` belongs to a past calendar date.
 * Planning slots represent the daily order/sequence of shipments (`Ordinea #1..#11`),
 * NOT clock hours, so Today (`AZI`) and all future dates keep every order slot open all day.
 */
export function isPlanningSlotInPast(
  isoDate: string,
  _hourSlot: string,
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): boolean {
  try {
    const slotDate = Temporal.PlainDate.from(isoDate);
    const roToday = zdtNow.toPlainDate();
    return Temporal.PlainDate.compare(slotDate, roToday) < 0;
  } catch {
    return false;
  }
}

/**
 * Computes the default `weekOffset` relative to `2026-11-09` so the 7-day calendar
 * opens on the week containing Romania's current date.
 */
export function getDefaultPlanningWeekOffset(
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): number {
  const roToday = zdtNow.toPlainDate();
  const diffDays = roToday.since(BASE_PLANNING_MONDAY).days;
  return Math.max(0, Math.floor(diffDays / 7));
}

/**
 * Builds the 7-day metadata (`LUN..DUM`) for a given `weekOffset` (0 = 9–15 Nov 2026),
 * annotating `isPastDay`, `isToday`, and `hasFutureSlots` against Romania's live clock.
 */
export function getPlanningWeekMeta(
  weekOffset = 0,
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): PlanningWeekMeta {
  const roToday = zdtNow.toPlainDate();
  const monday = BASE_PLANNING_MONDAY.add({ days: weekOffset * 7 });
  const sunday = monday.add({ days: 6 });

  const days: PlanningDayMeta[] = Array.from({ length: 7 }, (_, idx) => {
    const d = monday.add({ days: idx });
    const isoDate = d.toString();
    const cmp = Temporal.PlainDate.compare(d, roToday);
    const isPastDay = cmp < 0;
    const isToday = cmp === 0;
    const lastSlot = PLANNING_HOUR_SLOTS[PLANNING_HOUR_SLOTS.length - 1];
    const hasFutureSlots =
      !isPastDay && !isPlanningSlotInPast(isoDate, lastSlot, zdtNow);

    return {
      dayIndex: idx,
      weekOffset,
      short: RO_WEEKDAY_SHORT[idx],
      label: RO_WEEKDAY_FULL[idx],
      date: `${d.day} ${RO_MONTH_SHORT[d.month] || 'Noi'}`,
      dayNum: d.day,
      isoDate,
      isPastDay,
      isToday,
      hasFutureSlots,
    };
  });

  const monShort = RO_MONTH_SHORT[monday.month] || 'Noi';
  const sunShort = RO_MONTH_SHORT[sunday.month] || 'Noi';
  const rangeLabel =
    monday.month === sunday.month
      ? `${monday.day} – ${sunday.day} ${sunShort} ${sunday.year}`
      : `${monday.day} ${monShort} – ${sunday.day} ${sunShort} ${sunday.year}`;

  const monthYearTitle =
    monday.month === sunday.month
      ? `${RO_MONTH_FULL_UPPER[monday.month]} ${monday.year}`
      : `${RO_MONTH_FULL_UPPER[monday.month]} – ${RO_MONTH_FULL_UPPER[sunday.month]} ${sunday.year}`;

  return {
    weekOffset,
    mondayIso: monday.toString(),
    sundayIso: sunday.toString(),
    monthYearTitle,
    rangeLabel,
    days,
    hasAnyFutureSlot: days.some((d) => d.hasFutureSlots),
  };
}

/**
 * Finds the first valid NON-PAST `(weekOffset, dayIndex, hourSlot, isoDate)` in Romania time.
 * Never returns a past date or past hour under any circumstance.
 */
export function findFirstFuturePlanningSlot(params: {
  weekOffset?: number;
  preferredDayIndex?: number;
  preferredHourSlot?: string;
  isSlotOccupied?: (weekOffset: number, dayIndex: number, hourSlot: string) => boolean;
  zdtNow?: Temporal.ZonedDateTime;
}): {
  weekOffset: number;
  dayIndex: number;
  hourSlot: string;
  isoDate: string;
} {
  const zdtNow = params.zdtNow ?? getRomaniaZonedNow();
  const minWeekOffset = getDefaultPlanningWeekOffset(zdtNow);
  const startWeek = Math.max(minWeekOffset, params.weekOffset ?? minWeekOffset);
  const isOccupied = params.isSlotOccupied ?? (() => false);

  for (let w = startWeek; w <= startWeek + 4; w++) {
    const week = getPlanningWeekMeta(w, zdtNow);
    if (!week.hasAnyFutureSlot) continue;

    // 1. If caller requested a preferred day on the starting week and it still has future slots:
    if (
      w === params.weekOffset &&
      typeof params.preferredDayIndex === 'number' &&
      params.preferredDayIndex >= 0 &&
      params.preferredDayIndex < 7
    ) {
      const prefDay = week.days[params.preferredDayIndex];
      if (prefDay && prefDay.hasFutureSlots) {
        if (
          params.preferredHourSlot &&
          !isPlanningSlotInPast(prefDay.isoDate, params.preferredHourSlot, zdtNow) &&
          !isOccupied(w, prefDay.dayIndex, params.preferredHourSlot)
        ) {
          return {
            weekOffset: w,
            dayIndex: prefDay.dayIndex,
            hourSlot: params.preferredHourSlot,
            isoDate: prefDay.isoDate,
          };
        }
        for (const h of PLANNING_HOUR_SLOTS) {
          if (
            !isPlanningSlotInPast(prefDay.isoDate, h, zdtNow) &&
            !isOccupied(w, prefDay.dayIndex, h)
          ) {
            return {
              weekOffset: w,
              dayIndex: prefDay.dayIndex,
              hourSlot: h,
              isoDate: prefDay.isoDate,
            };
          }
        }
        // All future hours on preferred day are occupied -> still return first future hour on preferred day for groupage
        const firstFutureOnPref = PLANNING_HOUR_SLOTS.find(
          (h) => !isPlanningSlotInPast(prefDay.isoDate, h, zdtNow)
        );
        if (firstFutureOnPref) {
          return {
            weekOffset: w,
            dayIndex: prefDay.dayIndex,
            hourSlot: firstFutureOnPref,
            isoDate: prefDay.isoDate,
          };
        }
      }
    }

    // 2. Scan chronologically across all remaining future days/hours of week `w` for an empty slot
    for (const day of week.days) {
      if (!day.hasFutureSlots) continue;
      for (const h of PLANNING_HOUR_SLOTS) {
        if (isPlanningSlotInPast(day.isoDate, h, zdtNow)) continue;
        if (!isOccupied(w, day.dayIndex, h)) {
          return {
            weekOffset: w,
            dayIndex: day.dayIndex,
            hourSlot: h,
            isoDate: day.isoDate,
          };
        }
      }
    }

    // 3. If every future slot in week `w` already has at least 1 card, return the earliest future slot for groupage
    for (const day of week.days) {
      if (!day.hasFutureSlots) continue;
      const firstFuture = PLANNING_HOUR_SLOTS.find(
        (h) => !isPlanningSlotInPast(day.isoDate, h, zdtNow)
      );
      if (firstFuture) {
        return {
          weekOffset: w,
          dayIndex: day.dayIndex,
          hourSlot: firstFuture,
          isoDate: day.isoDate,
        };
      }
    }
  }

  // Ultimate fallback: next Monday 08:00
  const fallbackWeek = getPlanningWeekMeta(minWeekOffset + 1, zdtNow);
  return {
    weekOffset: fallbackWeek.weekOffset,
    dayIndex: 0,
    hourSlot: '08:00',
    isoDate: fallbackWeek.days[0].isoDate,
  };
}

/**
 * Formats a `Temporal.ZonedDateTime` as `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`.
 */
export function toDateTimeLocalString(zdt: Temporal.ZonedDateTime): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${zdt.year}-${pad(zdt.month)}-${pad(zdt.day)}T${pad(zdt.hour)}:${pad(zdt.minute)}`;
}

/**
 * Minimum allowed `<input type="datetime-local" min={...}>` value in Romania time.
 */
export function getMinRomaniaDateTimeLocal(
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): string {
  return toDateTimeLocalString(zdtNow);
}

/**
 * Computes sensible non-past default `departureDate` and `arrivalDate` strings
 * in `Europe/Bucharest` for the 3-step Trip Creation Wizard.
 */
export function getDefaultRomaniaTripDateTimes(
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): { departureLocal: string; arrivalLocal: string } {
  let dep = zdtNow
    .add({ hours: 1 })
    .with({ minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });

  if (dep.hour < 8) {
    dep = dep.with({ hour: 8 });
  } else if (dep.hour > 20) {
    dep = dep.add({ days: 1 }).with({ hour: 8 });
  }

  const arr = dep.add({ hours: 26 });
  return {
    departureLocal: toDateTimeLocalString(dep),
    arrivalLocal: toDateTimeLocalString(arr),
  };
}

/**
 * Checks whether a `YYYY-MM-DDTHH:mm` string interpreted in `Europe/Bucharest` is in the past.
 */
export function isRomaniaDateTimeLocalInPast(
  dateTimeLocal: string,
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): boolean {
  if (!dateTimeLocal || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateTimeLocal)) {
    return true;
  }
  try {
    const parsed = Temporal.ZonedDateTime.from(
      `${dateTimeLocal.slice(0, 16)}:00[${ROMANIA_TIME_ZONE}]`,
      { disambiguation: 'compatible' }
    );
    const nowMin = zdtNow.with({
      second: 0,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0,
    });
    return Temporal.ZonedDateTime.compare(parsed, nowMin) < 0;
  } catch {
    return true;
  }
}

/**
 * Converts a `YYYY-MM-DDTHH:mm` departure string into `{ weekOffset, dayIndex, hourSlot, isoDate }`.
 */
export function mapDateTimeLocalToPlanningSlot(
  dateTimeLocal: string,
  zdtNow: Temporal.ZonedDateTime = getRomaniaZonedNow()
): {
  weekOffset: number;
  dayIndex: number;
  hourSlot: string;
  isoDate: string;
} {
  try {
    const parsed = Temporal.ZonedDateTime.from(
      `${dateTimeLocal.slice(0, 16)}:00[${ROMANIA_TIME_ZONE}]`,
      { disambiguation: 'compatible' }
    );
    const plainDate = parsed.toPlainDate();
    const diffDays = plainDate.since(BASE_PLANNING_MONDAY).days;
    const weekOffset = Math.max(0, Math.floor(diffDays / 7));
    const dayIndex = ((diffDays % 7) + 7) % 7;
    const clampedHour = Math.min(18, Math.max(8, parsed.hour));
    const hourStr = `${String(clampedHour).padStart(2, '0')}:00`;
    if (isPlanningSlotInPast(plainDate.toString(), hourStr, zdtNow)) {
      return findFirstFuturePlanningSlot({ weekOffset, zdtNow });
    }
    return {
      weekOffset,
      dayIndex,
      hourSlot: hourStr,
      isoDate: plainDate.toString(),
    };
  } catch {
    return findFirstFuturePlanningSlot({ zdtNow });
  }
}
