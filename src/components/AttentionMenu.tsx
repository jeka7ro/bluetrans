import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AttentionItem, AttentionSeverity } from '../data/attention';

const DOT: Record<AttentionSeverity, string> = {
  risk: '#ef4444',
  warn: '#f59e0b',
  info: '#3b82f6',
};

interface AttentionMenuProps {
  items: AttentionItem[];
  onNavigate: (tab: string) => void;
}

export const AttentionMenu: React.FC<AttentionMenuProps> = ({ items, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const worst: AttentionSeverity = items.some((i) => i.severity === 'risk')
    ? 'risk'
    : items.some((i) => i.severity === 'warn')
      ? 'warn'
      : 'info';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderColor: items.length ? DOT[worst] : 'rgba(255,255,255,0.2)',
          color: '#ffffff',
        }}
        title="Ce cere atenție azi"
      >
        <AlertTriangle className="w-3.5 h-3.5" style={{ color: DOT[worst] }} />
        <span>{items.length}</span>
        <span className="hidden xl:inline">Atenție</span>
      </button>

      {open && (
        <>
          <div className="absolute right-0 mt-2 z-[490] w-[min(92vw,400px)] rounded-2xl border border-white/20 shadow-2xl p-3 space-y-2"
            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <div className="px-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: '#64D2FF' }}>
              Ce cere atenție azi
            </div>
            {items.length === 0 ? (
              <div className="px-1 py-3 text-sm" style={{ color: '#cbd5e1' }}>Nimic urgent. Totul e în regulă.</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onNavigate(item.tab);
                  }}
                  className="w-full text-left flex items-start gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/10 transition cursor-pointer"
                >
                  <span
                    className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: DOT[item.severity] }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold leading-snug" style={{ color: '#ffffff' }}>
                      {item.title}
                    </span>
                    <span className="block text-[11.5px] leading-snug" style={{ color: '#cbd5e1' }}>
                      {item.detail}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
