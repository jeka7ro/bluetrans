import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface AuditEntry {
  id: string;
  at: string;
  who: string;
  action: string;
}

interface AuditLogModalProps {
  entries: AuditEntry[];
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ entries, onClose }) => {
  useEffect(() => {
    document.body.classList.add('modal-scroll-locked');
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="modal-backdrop-lock fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tahoe-glass-elevated rounded-[28px] w-full max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 space-y-3 shadow-2xl border border-white/20"
      >
        <div className="flex flex-nowrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
              Istoric modificări
            </div>
            <h2 className="text-lg font-extrabold text-white">Cine a schimbat ce și când</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 flex items-center justify-center text-white cursor-pointer shrink-0"
            aria-label="Închide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="py-6 text-sm text-white/70">
            Nicio modificare încă. Aici apar confirmările de comenzi, ofertele acceptate sau refuzate și schimburile de remorci.
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2"
              >
                <div className="text-[11px] text-white/55 tabular-nums">
                  {new Date(e.at).toLocaleString('ro-RO')} · {e.who}
                </div>
                <div className="text-[13px] font-semibold text-white">{e.action}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
