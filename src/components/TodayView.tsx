import React, { useMemo, useState } from 'react';
import { Package, Mail, AlertTriangle, Truck, MapPin, Check, X, ChevronRight } from 'lucide-react';
import type { CargoOrder, ClientShipmentProposal, TrailerUnit } from '../data/mockData';
import { rankTrailersForOrder } from '../data/ldmEngine';
import { OrderDecisionModal } from './OrderDecisionModal';
import { DemoBadge } from './DemoBadge';
import { getFleetDocAlerts, getRealFleet } from './FleetVinAndDossierModal';

interface TodayViewProps {
  trailers: TrailerUnit[];
  unassignedOrders: CargoOrder[];
  proposals: ClientShipmentProposal[];
  onNavigate: (tab: string, trailerId?: string) => void;
  onAssignOrderToTrailer: (orderId: string, trailerId: string) => void;
  onAcceptProposal: (proposalId: string) => void;
  onCounterOfferProposal: (proposalId: string, counterEur: number) => void;
  onDeclineProposal: (proposalId: string) => void;
}

const LOW_DRIVE_HOURS = 2;

const docLabel = (days: number) =>
  days < 0
    ? `expirată de ${Math.abs(days)} ${Math.abs(days) === 1 ? 'zi' : 'zile'}`
    : days === 0
      ? 'expiră azi'
      : `expiră în ${days} ${days === 1 ? 'zi' : 'zile'}`;

const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  count: number;
  demo?: boolean;
  tone: string;
}> = ({ icon, title, count, demo, tone }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${tone}22`, color: tone }}
      >
        {icon}
      </span>
      <h2 className="text-sm font-extrabold text-white tracking-tight uppercase">{title}</h2>
      <span
        className="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
        style={{ background: `${tone}22`, color: tone }}
      >
        {count}
      </span>
    </div>
    {demo && <DemoBadge className="hidden sm:inline-flex" label="date de test" />}
  </div>
);

export const TodayView: React.FC<TodayViewProps> = ({
  trailers,
  unassignedOrders,
  proposals,
  onNavigate,
  onAssignOrderToTrailer,
  onAcceptProposal,
  onCounterOfferProposal,
  onDeclineProposal,
}) => {
  const [decisionOrderId, setDecisionOrderId] = useState<string | null>(null);
  const [counterOpenId, setCounterOpenId] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const pendingProposals = proposals.filter((p) => p.status === 'Pending review');
  const docAlerts = useMemo(() => getFleetDocAlerts(14), []);
  const lowDrive = trailers.filter(
    (t) => t.status === 'În tranzit' && t.driver1.remainingDailyDriveHours < LOW_DRIVE_HOURS
  );
  const problemsCount = docAlerts.length + lowDrive.length;
  const realFleet = useMemo(() => getRealFleet(), []);
  const inTransit = trailers.filter((t) => t.status === 'În tranzit').length;

  const recommendations = useMemo(() => {
    const map: Record<string, ReturnType<typeof rankTrailersForOrder>> = {};
    unassignedOrders.forEach((o) => {
      map[o.id] = rankTrailersForOrder(trailers, o);
    });
    return map;
  }, [trailers, unassignedOrders]);

  const decisionOrder = decisionOrderId
    ? unassignedOrders.find((o) => o.id === decisionOrderId)
    : undefined;

  const today = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const [showAllDocs, setShowAllDocs] = useState(false);
  const shownDocs = showAllDocs ? docAlerts : docAlerts.slice(0, 6);

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className="px-4 py-2.5 rounded-2xl shadow-lg text-xs sm:text-sm font-bold flex items-center justify-between gap-3"
          style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
        >
          <span style={{ color: '#ffffff' }}>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="px-3 py-1 rounded-full text-xs font-extrabold cursor-pointer shrink-0"
            style={{ backgroundColor: '#ffffff', color: '#0369a1' }}
          >
            OK
          </button>
        </div>
      )}

      {decisionOrder && (
        <OrderDecisionModal
          order={decisionOrder}
          trailers={trailers}
          onConfirm={(order, trailerId) => {
            onAssignOrderToTrailer(order.id, trailerId);
            setDecisionOrderId(null);
            setToast(
              `Comanda ${order.id} (${order.fromCity} → ${order.toCity}) a fost pusă pe ${trailerId}. Capacitatea s-a actualizat.`
            );
          }}
          onClose={() => setDecisionOrderId(null)}
        />
      )}

      {/* Antet + 3 contoare clickabile direct spre subiect (pe 1 rând pe mobil, neschimbat pe PC) */}
      <div className="tahoe-glass rounded-[24px] sm:rounded-[28px] p-3 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex sm:block items-baseline justify-between gap-2">
          <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
            Operațional
          </h1>
          <div className="text-[11px] sm:text-xs text-white/55 sm:mt-0.5 capitalize">{today}</div>
        </div>
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
          {[
            {
              n: unassignedOrders.length,
              t: 'de plasat',
              c: '#0A84FF',
              hint: 'Deschide alocarea comenzilor de plasat (Comenzi & curse)',
              onClick: () => onNavigate('orders-unassigned'),
            },
            {
              n: pendingProposals.length,
              t: 'de răspuns',
              c: '#FF9F0A',
              hint: 'Deschide Oferte clienți (oferte de răspuns)',
              onClick: () => onNavigate('offers'),
            },
            {
              n: problemsCount,
              t: 'probleme',
              c: '#FF453A',
              hint: 'Deschide alertele din Flotă (acte expirate / curând scadente)',
              onClick: () =>
                onNavigate(
                  docAlerts.length === 0 && lowDrive.length > 0
                    ? 'swap'
                    : 'fleet-expiring'
                ),
            },
          ].map((c) => (
            <button
              key={c.t}
              type="button"
              onClick={c.onClick}
              title={c.hint}
              aria-label={`${c.n} ${c.t} — ${c.hint}`}
              className="today-kpi-shortcut tahoe-card-inner rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 text-center sm:min-w-[96px] cursor-pointer select-none group"
              style={
                {
                  borderTop: `3px solid ${c.c}`,
                  '--kpi-accent': c.c,
                } as React.CSSProperties
              }
            >
              <div
                className="text-xl sm:text-2xl font-extrabold leading-none tabular-nums"
                style={{ color: c.c }}
              >
                {c.n}
              </div>
              <div className="text-[10.5px] sm:text-[11px] font-semibold text-white/65 mt-1 inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
                <span>{c.t}</span>
                <ChevronRight
                  aria-hidden="true"
                  className="w-3 h-3 opacity-55 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                  style={{ color: c.c }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 1. DE PLASAT */}
        <section className="tahoe-glass rounded-[28px] p-4 sm:p-5">
          <SectionTitle
            icon={<Package className="w-4 h-4" />}
            title="De plasat"
            count={unassignedOrders.length}
            tone="#0A84FF"
            demo
          />
          {unassignedOrders.length === 0 ? (
            <div className="text-xs text-white/55 py-4">Toate comenzile sunt plasate.</div>
          ) : (
            <div className="space-y-2">
              {unassignedOrders.map((o) => {
                const ranked = recommendations[o.id] || [];
                const best = ranked.find((r) => r.verdict !== 'blocked');
                const verdictColor = !best
                  ? '#FF453A'
                  : best.verdict === 'tight'
                    ? '#FF9F0A'
                    : '#30D158';
                return (
                  <div key={o.id} className="tahoe-card-inner rounded-2xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold text-white truncate">
                          {o.fromCity} → {o.toCity}
                        </div>
                        <div className="text-[11px] text-white/55 truncate">
                          {o.id} · {o.client} · {o.ldm.toFixed(1)} LDM · +{o.tempReq}°C ·{' '}
                          {o.revenueEur} €
                        </div>
                      </div>
                      <button
                        onClick={() => setDecisionOrderId(o.id)}
                        className="px-3 py-1.5 rounded-full bg-[#0A84FF] hover:bg-[#0a74e0] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <MapPin className="w-3 h-3" />
                        Unde o pun?
                      </button>
                    </div>
                    <div
                      className="mt-2 text-[11px] font-bold flex items-center gap-1.5"
                      style={{ color: verdictColor }}
                    >
                      {!best ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Nu încape pe nicio remorcă
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          {best.verdict === 'tight' ? 'Strâmt pe ' : 'Încape pe '}
                          {best.trailerId} · câștig estimat +{best.contributionEur} €
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. DE RĂSPUNS */}
        <section className="tahoe-glass rounded-[28px] p-4 sm:p-5">
          <SectionTitle
            icon={<Mail className="w-4 h-4" />}
            title="De răspuns"
            count={pendingProposals.length}
            tone="#FF9F0A"
            demo
          />
          {pendingProposals.length === 0 ? (
            <div className="text-xs text-white/55 py-4">Nicio ofertă în așteptare.</div>
          ) : (
            <div className="space-y-2">
              {pendingProposals.map((p) => (
                <div key={p.id} className="tahoe-card-inner rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-extrabold text-white truncate">
                        {p.clientName}
                      </div>
                      <div className="text-[11px] text-white/55 truncate">
                        {p.routeFrom} → {p.routeTo} · {p.ldmRequested.toFixed(1)} LDM · pe{' '}
                        {p.trailerId}
                      </div>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <div className="text-sm font-extrabold text-white whitespace-nowrap">{p.offeredPriceEur}&#160;€</div>
                      <div className="text-[10px] font-semibold text-[#30D158] whitespace-nowrap">
                        câștig +{p.estimatedContributionEur}&#160;€
                      </div>
                    </div>
                  </div>
                  {p.hasConflictWarning && (
                    <div className="mt-2 text-[11px] font-bold text-[#FF9F0A] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Conflict de capacitate — detalii în Planificare › Oferte clienți
                    </div>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        onAcceptProposal(p.id);
                        setToast(`Oferta de la ${p.clientName} a fost acceptată și apare în calendar.`);
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#30D158] hover:bg-[#28b84b] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Acceptă
                    </button>
                    <button
                      onClick={() => {
                        setCounterOpenId(counterOpenId === p.id ? null : p.id);
                        setCounterValue(String(Math.round(p.offeredPriceEur * 1.1)));
                      }}
                      className="px-3 py-1.5 rounded-full tahoe-btn-secondary text-white/90 text-[11px] font-bold cursor-pointer"
                    >
                      Contraofertă
                    </button>
                    <button
                      onClick={() => {
                        onDeclineProposal(p.id);
                        setToast(`Oferta de la ${p.clientName} a fost refuzată.`);
                      }}
                      className="px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-[11px] font-bold cursor-pointer"
                    >
                      Refuză
                    </button>
                  </div>
                  {counterOpenId === p.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={counterValue}
                        onChange={(e) => setCounterValue(e.target.value)}
                        className="w-28 bg-white/8 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#007AFF]"
                      />
                      <span className="text-xs text-white/60">€</span>
                      <button
                        onClick={() => {
                          const v = Number(counterValue);
                          if (!v || v <= 0) return;
                          onCounterOfferProposal(p.id, v);
                          setCounterOpenId(null);
                          setToast(`Contraofertă de ${v} € trimisă către ${p.clientName}.`);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#0A84FF] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Trimite
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 3. PROBLEME */}
      <section className="tahoe-glass rounded-[28px] p-4 sm:p-5">
        <SectionTitle
          icon={<AlertTriangle className="w-4 h-4" />}
          title="Probleme"
          count={problemsCount}
          tone="#FF453A"
        />
        {problemsCount === 0 ? (
          <div className="text-xs text-white/55 py-2">Nicio problemă.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">
                Acte flotă (RCA · CASCO · CMR) — date reale
              </div>
              {docAlerts.length === 0 ? (
                <div className="text-xs text-white/55">Nimic nu expiră în 14 zile.</div>
              ) : (
                <div className="space-y-1.5">
                  {shownDocs.map((a) => (
                    <button
                      key={`${a.plate}-${a.doc}`}
                      type="button"
                      onClick={() => onNavigate('fleet', a.plate)}
                      className="w-full flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full tahoe-card-inner text-left cursor-pointer hover:bg-white/10"
                    >
                      <span className="text-xs font-bold text-white truncate">
                        {a.plate} <span className="text-white/50 font-semibold">· {a.doc}</span>
                      </span>
                      <span
                        className="text-[11px] font-bold shrink-0"
                        style={{ color: a.days < 0 ? '#FF453A' : '#FF9F0A' }}
                      >
                        {docLabel(a.days)}
                      </span>
                    </button>
                  ))}
                  {docAlerts.length > 6 && (
                    <button
                      onClick={() => setShowAllDocs((v) => !v)}
                      className="px-3 py-1 rounded-full bg-white/8 hover:bg-white/14 text-[11px] font-bold text-[#64D2FF] cursor-pointer mt-1"
                    >
                      {showAllDocs ? 'Arată mai puține' : `Încă ${docAlerts.length - 6}…`}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">
                  Șoferi aproape de limita de condus
                </span>
                <DemoBadge />
              </div>
              {lowDrive.length === 0 ? (
                <div className="text-xs text-white/55">Niciun șofer sub {LOW_DRIVE_HOURS} h.</div>
              ) : (
                <div className="space-y-1.5">
                  {lowDrive.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onNavigate('swap')}
                      className="w-full flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full tahoe-card-inner text-left cursor-pointer hover:bg-white/10"
                    >
                      <span className="text-xs font-bold text-white truncate">
                        {t.driver1.name} <span className="text-white/50 font-semibold">· {t.id}</span>
                      </span>
                      <span className="text-[11px] font-bold text-[#FF9F0A] shrink-0">
                        mai poate {t.driver1.remainingDailyDriveHours.toFixed(1)} h
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* FLOTA AZI */}
      <section className="tahoe-glass rounded-[28px] p-4 sm:p-5">
        <SectionTitle
          icon={<Truck className="w-4 h-4" />}
          title="Flota azi"
          count={realFleet.trailers.length}
          tone="#64D2FF"
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/80">
          <span>
            <b className="text-white">{realFleet.trailers.length}</b> remorci active ·{' '}
            <b className="text-white">{realFleet.tractors.length}</b> capete tractor
          </span>
          <span className="flex items-center gap-2">
            <b className="text-white">{inTransit}</b> din {trailers.length} remorci din plan sunt pe
            drum <DemoBadge />
          </span>
          <button
            onClick={() => onNavigate('control')}
            className="ml-auto px-3 py-1.5 rounded-full tahoe-btn-secondary text-white/90 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            Vezi harta <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </section>
    </div>
  );
};
