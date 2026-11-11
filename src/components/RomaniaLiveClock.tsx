import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
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
    <div
      className="ro-live-clock-pill inline-flex items-center gap-2 px-3 py-1.5 rounded-full tahoe-btn-secondary border border-white/15 shrink-0 select-none"
      title={`Ora oficială a României (Europe/Bucharest · ${clock.tzAbbrev} ${clock.utcOffset}) — ${clock.dateFull}`}
    >
      {/* Authentic Romanian Tricolor Emblem + Live Pulse */}
      <span
        aria-hidden="true"
        className="inline-flex items-center overflow-hidden rounded-full border border-white/30 shadow-xs shrink-0 [forced-color-adjust:none]"
        style={{ width: 18, height: 12 }}
      >
        <span className="h-full flex-1" style={{ backgroundColor: '#002B7F' }} />
        <span className="h-full flex-1" style={{ backgroundColor: '#FCD116' }} />
        <span className="h-full flex-1" style={{ backgroundColor: '#CE1126' }} />
      </span>

      <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-black uppercase tracking-wider text-[#64D2FF]">
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse [forced-color-adjust:none]"
        />
        <span>RO</span>
      </span>

      <time
        dateTime={clock.isoInstant}
        className="inline-flex items-center gap-2 tabular-nums leading-none"
      >
        <span className="inline-flex items-center gap-1 text-[13px] font-black tracking-tight text-white">
          <Clock className="w-3.5 h-3.5 text-[#0A84FF] shrink-0 hidden xl:inline" />
          <span>{compact ? clock.timeShort : clock.timeWithSeconds}</span>
        </span>

        <span
          aria-hidden="true"
          className="ro-clock-divider h-3.5 w-px bg-white/20 shrink-0"
        />

        {!compact && (
          <>
            <span className="hidden lg:inline text-xs font-bold text-white/95 whitespace-nowrap">
              {clock.dateFull}
            </span>
            <span className="hidden sm:inline lg:hidden text-xs font-bold text-white/90 whitespace-nowrap">
              {clock.dateCompact}
            </span>
            <span className="inline sm:hidden text-[11px] font-bold text-white/85 whitespace-nowrap">
              {clock.dateMicro}
            </span>
          </>
        )}
      </time>
    </div>
  );
};
