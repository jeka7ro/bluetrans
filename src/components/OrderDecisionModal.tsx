import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin } from 'lucide-react';
import type { CargoOrder, TrailerUnit } from '../data/mockData';
import {
  rankTrailersForOrder,
  type Evaluation,
  type Verdict,
} from '../data/ldmEngine';

interface OrderDecisionModalProps {
  order: CargoOrder;
  trailers: TrailerUnit[];
  onConfirm: (order: CargoOrder, trailerId: string) => void;
  onClose: () => void;
}

const VERDICT_STYLE: Record<Verdict, { bg: string; label: string }> = {
  ok: { bg: '#16a34a', label: 'Încape' },
  tight: { bg: '#d97706', label: 'Strâmt' },
  blocked: { bg: '#dc2626', label: 'Nu se poate' },
};

const LETTERS = ['A', 'B', 'C'];

const fmt = (n: number) => n.toFixed(1);

export const OrderDecisionModal: React.FC<OrderDecisionModalProps> = ({
  order,
  trailers,
  onConfirm,
  onClose,
}) => {
  const [showOthers, setShowOthers] = useState(false);

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

  const ranked = useMemo(() => rankTrailersForOrder(trailers, order), [trailers, order]);
  const viable = ranked.filter((r) => r.verdict !== 'blocked');
  const variants = viable.slice(0, 3);
  const others = ranked.filter((r) => !variants.includes(r));
  const best = variants[0];

  const trailerById = (id: string) => trailers.find((t) => t.id === id);

  const renderBars = (ev: Evaluation) =>
    ev.checks.map((c) => {
      const beforePct = Math.min(100, (c.occupiedBefore / c.total) * 100);
      const addPct = Math.min(100 - beforePct, (order.ldm / c.total) * 100);
      return (
        <div key={c.segmentId} className="space-y-1">
          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="font-semibold text-white truncate">{c.label}</span>
            <span className="tabular-nums text-white/70 shrink-0">
              {fmt(c.occupiedBefore)} → <strong className="text-white">{fmt(c.occupiedAfter)}</strong> din{' '}
              {fmt(c.total)} LDM
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden flex">
            <div style={{ width: `${beforePct}%`, backgroundColor: '#3b82f6' }} />
            <div style={{ width: `${addPct}%`, backgroundColor: c.ok ? '#22c55e' : '#ef4444' }} />
          </div>
          <div className="text-[10.5px] text-white/55">
            {c.zone ? `${c.zoneLabel}: ${fmt(c.zoneFreeBefore)} → ${fmt(Math.max(0, c.zoneFreeAfter))} LDM liberi` : c.problems[0]}
            {' · '}
            {fmt(c.weightAfter)} / {fmt(c.maxWeight)} t
          </div>
        </div>
      );
    });

  return (
    <div
      onClick={onClose}
      className="modal-backdrop-lock fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tahoe-glass-elevated rounded-[28px] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl border border-white/20"
      >
        {/* Antet — X în colțul dreapta-sus */}
        <div className="flex flex-nowrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
              Unde pun comanda?
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
              {order.client}
            </h2>
            <div className="mt-0.5 text-xs sm:text-sm text-white/75 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="inline-flex items-center gap-1 font-semibold text-white">
                <MapPin className="w-3.5 h-3.5 text-[#64D2FF]" />
                {order.fromCity} → {order.toCity}
              </span>
              <span className="tabular-nums">
                <strong className="text-[#FF9F0A]">{fmt(order.ldm)} LDM</strong> · {order.weightTons} t · +{order.tempReq}°C
              </span>
              <span className="tabular-nums">{order.revenueEur} €</span>
            </div>
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

        {/* Mesaj principal */}
        <div
          className="rounded-2xl px-4 py-3 text-sm font-bold"
          style={{
            backgroundColor: best ? (best.verdict === 'ok' ? '#166534' : '#92400e') : '#991b1b',
            color: '#ffffff',
          }}
        >
          {best
            ? `Recomandat: ${best.trailerId} — ${best.headline.toLowerCase()}. Câștig estimat +${best.contributionEur} €.`
            : 'Nicio remorcă nu poate lua comanda acum. Vezi mai jos de ce.'}
        </div>
        <p className="text-xs text-white/60">
          Aceasta este doar o simulare. Planul nu se schimbă până nu apeși <strong className="text-white">Confirmă</strong>.
        </p>

        {/* Variantele A / B / C */}
        <div className="space-y-3">
          {variants.map((ev, idx) => {
            const t = trailerById(ev.trailerId);
            const style = VERDICT_STYLE[ev.verdict];
            return (
              <div
                key={ev.trailerId}
                className="tahoe-card-inner rounded-2xl border p-3.5 sm:p-4 space-y-3"
                style={{ borderColor: idx === 0 ? '#22c55e' : 'rgba(255,255,255,0.15)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
                    >
                      {LETTERS[idx]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-base font-extrabold text-white truncate">
                        {ev.trailerId}
                      </div>
                      {t && (
                        <div className="text-[11px] text-white/60 truncate">
                          {t.tractorId.split(' (')[0]} · {t.driver1.name} · acum la {t.currentLocation.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {idx === 0 && (
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-extrabold"
                        style={{ backgroundColor: '#22c55e', color: '#052e16' }}
                      >
                        Recomandat
                      </span>
                    )}
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-extrabold"
                      style={{ backgroundColor: style.bg, color: '#ffffff' }}
                    >
                      {style.label}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-white/80">{ev.headline}</div>

                <div className="space-y-2.5">{renderBars(ev)}</div>

                {ev.warnings.length > 0 && (
                  <div
                    className="ldm-warning-box rounded-xl px-3 py-2 text-[11.5px] font-semibold space-y-0.5"
                  >
                    {ev.warnings.map((w) => (
                      <div key={w}>⚠ {w}</div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-white/75 tabular-nums">
                    Venit <strong className="text-white">{ev.revenueEur} €</strong> − cost estimat{' '}
                    <strong className="text-white">{ev.incrementalCostEur} €</strong> ={' '}
                    <strong className="text-[#30D158]">+{ev.contributionEur} €</strong>
                    <span className="text-white/50"> · ocol {ev.detourKm} km</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onConfirm(order, ev.trailerId)}
                    className="px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold cursor-pointer hover:brightness-110 transition"
                    style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
                  >
                    Confirmă pe {ev.trailerId}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Restul remorcilor */}
        {others.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowOthers((v) => !v)}
              className="px-3.5 py-1.5 rounded-full tahoe-btn-secondary text-xs font-bold text-[#64D2FF] cursor-pointer"
            >
              {showOthers || variants.length === 0
                ? 'Ascunde celelalte remorci'
                : `Vezi de ce nu merg celelalte ${others.length} remorci`}
            </button>
            {(showOthers || variants.length === 0) && (
              <div className="space-y-1.5">
                {others.map((ev) => {
                  const style = VERDICT_STYLE[ev.verdict];
                  return (
                    <div
                      key={ev.trailerId}
                      className="flex items-start gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2"
                    >
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 mt-0.5"
                        style={{ backgroundColor: style.bg, color: '#ffffff' }}
                      >
                        {style.label}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white">{ev.trailerId}</div>
                        <div className="text-[11px] text-white/65">
                          {ev.reasons[0] ?? ev.headline}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
