import React, { useEffect, useState } from 'react';
import {
  formatRomaniaClockSnapshot,
  getRomaniaZonedNow,
  RomaniaClockSnapshot,
} from '../utils/romaniaTime';

interface RomaniaLiveClockProps {
  compact?: boolean;
}

export const RomaniaLiveClock: React.FC<RomaniaLiveClockProps> = ({
  compact = false,
}) => {
  const [clock, setClock] = useState<RomaniaClockSnapshot>(() =>
    formatRomaniaClockSnapshot(getRomaniaZonedNow())
  );

  useEffect(() => {
    let timeoutId: number | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const now = getRomaniaZonedNow();
      setClock(formatRomaniaClockSnapshot(now));
      const msUntilNextSecond = Math.max(120, 1000 - now.millisecond);
      timeoutId = window.setTimeout(tick, msUntilNextSecond);
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <time
      dateTime={clock.isoInstant}
      title={`Ora României (Europe/Bucharest · ${clock.tzAbbrev} ${clock.utcOffset}) — ${clock.dateFull}`}
      className="ro-live-clock inline-flex flex-col items-end justify-center text-end tabular-nums shrink-0 select-none"
    >
      <span className="ro-live-clock-time font-extrabold tracking-tight text-white">
        {compact ? clock.timeShort : clock.timeWithSeconds}
      </span>

      {!compact && (
        <>
          <span className="ro-live-clock-date hidden md:inline font-medium text-white/70 whitespace-nowrap">
            {clock.dateFull}
          </span>
          <span className="ro-live-clock-date hidden sm:inline md:hidden font-medium text-white/70 whitespace-nowrap">
            {clock.dateCompact}
          </span>
          <span className="ro-live-clock-date inline sm:hidden font-medium text-white/65 whitespace-nowrap">
            {clock.dateMicro}
          </span>
        </>
      )}
    </time>
  );
};
