import React, { useState, useEffect, useId } from 'react';
import {
  Plus,
  ArrowRight,
  CheckCircle2,
  Calculator,
  Search,
  Printer,
  Receipt,
  LocateFixed,
  Loader2,
  ExternalLink,
  AlertCircle,
  Clock,
  Radio,
  X,
} from 'lucide-react';
import { CargoOrder, TrailerUnit, formatCountryBadge } from '../data/mockData';
import {
  GoogleMapsAddressInput,
  detectCurrentUserGpsPlace,
  type DetectedUserGpsLocation,
} from './GoogleMapsAddressInput';
import { ClientDropdownSelect } from './ClientDropdownSelect';
import {
  CmrAndInvoiceModal,
  PrintableTripDocData,
} from './CmrAndInvoiceModal';
import {
  buildRoadDistanceWithDetourLabel,
  HOUR_SLOTS,
} from './Planning7DaysView';
import { getRealFleet } from './FleetVinAndDossierModal';
import {
  findFirstFuturePlanningSlot,
  formatRomaniaClockSnapshot,
  getDefaultRomaniaTripDateTimes,
  getMinRomaniaDateTimeLocal,
  getPlanningWeekMeta,
  getRomaniaZonedNow,
  isPlanningSlotInPast,
  isRomaniaDateTimeLocalInPast,
  mapDateTimeLocalToPlanningSlot,
} from '../utils/romaniaTime';

export interface DirectOrderAllocation {
  trailerId: string;
  tractorPlate?: string;
  weekOffset?: number;
  dayIndex: number;
  hourSlot: string;
}

export interface ActiveLoadItem {
  id: string;
  client: string;
  route: string;
  cargoDesc: string;
  ldm: number;
  weightTons: number;
  temp: string;
  trailerId: string;
  status: 'În tranzit' | 'Planificată' | 'Descărcare' | 'Finalizată';
  cmrStatus: 'CMR Semnat Digital' | 'CMR Activ' | 'În așteptare aviz';
  revenueEur: number;
}

interface OrdersAndTripsViewProps {
  unassignedOrders: CargoOrder[];
  trailers: TrailerUnit[];
  activeLoads: ActiveLoadItem[];
  setActiveLoads: React.Dispatch<React.SetStateAction<ActiveLoadItem[]>>;
  onCreateOrder: (
    newOrder: CargoOrder,
    directAllocation?: DirectOrderAllocation
  ) => void;
  onAssignOrderToTrailer: (
    orderId: string,
    trailerId: string,
    targetDayIndex?: number,
    targetHourSlot?: string,
    targetWeekOffset?: number
  ) => void;
}

export const INITIAL_ACTIVE_LOADS: ActiveLoadItem[] = [
  {
    id: 'LD-9023',
    client: 'Agrana Fruit Austria',
    route: 'Oradea (🇷🇴 RO) → Viena (🇦🇹 AT)',
    cargoDesc: '14 pal · Fructe refrigerate',
    ldm: 4.2,
    weightTons: 5.6,
    temp: '+4°C (Z2)',
    trailerId: 'BH 67 STS',
    status: 'În tranzit',
    cmrStatus: 'CMR Activ',
    revenueEur: 980,
  },
  {
    id: 'LD-9022',
    client: 'Unilever Frozen Europe',
    route: 'Oradea (🇷🇴 RO) → Rotterdam (🇳🇱 NL)',
    cargoDesc: '16 pal · Produse congelate',
    ldm: 5.2,
    weightTons: 9.8,
    temp: '-18°C (Z1)',
    trailerId: 'BH 67 STS',
    status: 'În tranzit',
    cmrStatus: 'CMR Activ',
    revenueEur: 2150,
  },
  {
    id: 'LD-9021',
    client: 'Royal FloraHolland',
    route: 'Rotterdam (🇳🇱 NL) → Stockholm (🇸🇪 SE)',
    cargoDesc: '18 pal · Flori & Plante',
    ldm: 6.8,
    weightTons: 9.4,
    temp: '+4°C (Z1)',
    trailerId: 'BH 75 STS',
    status: 'În tranzit',
    cmrStatus: 'CMR Activ',
    revenueEur: 2450,
  },
  {
    id: 'LD-9020',
    client: 'Transilvania Lactate',
    route: 'Cluj (🇷🇴 RO) → Stuttgart (🇩🇪 DE)',
    cargoDesc: '24 pal · Bi-Temp Lactate & Carne',
    ldm: 9.6,
    weightTons: 15.8,
    temp: '-18°C / +4°C',
    trailerId: 'BH 74 STS',
    status: 'Descărcare',
    cmrStatus: 'CMR Semnat Digital',
    revenueEur: 2390,
  },
];

export const OrdersAndTripsView: React.FC<OrdersAndTripsViewProps> = ({
  unassignedOrders,
  trailers,
  activeLoads,
  onCreateOrder,
  onAssignOrderToTrailer,
}) => {
  const formUid = useId();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [printableDoc, setPrintableDoc] =
    useState<PrintableTripDocData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const realFleet = React.useMemo(() => getRealFleet(), []);
  const idleTrailers = realFleet.trailers.filter(
    (v) => !trailers.some((t) => t.id === v.plate)
  );

  useEffect(() => {
    if (showNewOrderModal) {
      document.body.classList.add('modal-scroll-locked');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('modal-scroll-locked');
      document.body.style.overflow = '';
    };
  }, [showNewOrderModal]);

  // 3-Step Trip Creation Wizard State (matching Image 4 bottom panel: 1 Detalii -> 2 Alocare -> 3 Confirmare)
  const [roClock, setRoClock] = useState(() =>
    formatRomaniaClockSnapshot(getRomaniaZonedNow())
  );
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedOrderForTrip, setSelectedOrderForTrip] = useState<string>(
    unassignedOrders[0]?.id || 'CMD-951'
  );
  const [selectedTrailerForTrip, setSelectedTrailerForTrip] = useState<string>(
    trailers[0]?.id || 'BH 67 STS'
  );
  const [departureDate, setDepartureDate] = useState<string>(
    () => getDefaultRomaniaTripDateTimes().departureLocal
  );
  const [arrivalDate, setArrivalDate] = useState<string>(
    () => getDefaultRomaniaTripDateTimes().arrivalLocal
  );
  const minRoDateTimeLocal = getMinRomaniaDateTimeLocal(roClock.zdt);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRoClock(formatRomaniaClockSnapshot(getRomaniaZonedNow()));
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      unassignedOrders.length > 0 &&
      !unassignedOrders.some((o) => o.id === selectedOrderForTrip)
    ) {
      setSelectedOrderForTrip(unassignedOrders[0].id);
    }
  }, [unassignedOrders, selectedOrderForTrip]);

  // New Order Form State
  const [newClient, setNewClient] = useState('Hochland Deutschland GmbH');
  const [newFromCity, setNewFromCity] = useState('München');
  const [newFromCountry, setNewFromCountry] = useState('DE');
  const [newToCity, setNewToCity] = useState('Oradea');
  const [newToCountry, setNewToCountry] = useState('RO');
  const [newLdm, setNewLdm] = useState<string>('3.6');
  const [newWeight, setNewWeight] = useState<string>('5.4');
  const [newPallets, setNewPallets] = useState<string>('9');
  const [newTemp, setNewTemp] = useState<string>('4');
  const [newRevenue, setNewRevenue] = useState<string>('780');
  const [newAllocationMode, setNewAllocationMode] = useState<
    'DIRECT' | 'UNASSIGNED'
  >('DIRECT');
  const [newTrailerId, setNewTrailerId] = useState<string>(
    trailers[0]?.id || 'BH 67 STS'
  );
  const [newWeekOffset, setNewWeekOffset] = useState<number>(
    () => findFirstFuturePlanningSlot({}).weekOffset
  );
  const [newDayIndex, setNewDayIndex] = useState<number>(
    () => findFirstFuturePlanningSlot({}).dayIndex
  );
  const [newHourSlot, setNewHourSlot] = useState<string>(
    () => findFirstFuturePlanningSlot({}).hourSlot
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [isLocatingModalGps, setIsLocatingModalGps] = useState<boolean>(false);
  const [detectedModalGps, setDetectedModalGps] =
    useState<DetectedUserGpsLocation | null>(null);
  const [modalGpsError, setModalGpsError] = useState<string | null>(null);

  // Whenever the New Order modal opens, ensure the proposed day & hour are strictly in the future (Romania TZ)
  useEffect(() => {
    if (!showNewOrderModal) return;
    const freshNow = getRomaniaZonedNow();
    setRoClock(formatRomaniaClockSnapshot(freshNow));
    const slot = findFirstFuturePlanningSlot({ zdtNow: freshNow });
    setNewWeekOffset(slot.weekOffset);
    setNewDayIndex(slot.dayIndex);
    setNewHourSlot(slot.hourSlot);
    setModalError(null);
    setModalGpsError(null);
  }, [showNewOrderModal]);

  const handleModalIdentifyMyLocation = async (target: 'from' | 'to' = 'from') => {
    if (isLocatingModalGps) return;
    setIsLocatingModalGps(true);
    setModalGpsError(null);
    try {
      const place = await detectCurrentUserGpsPlace();
      setDetectedModalGps(place);
      if (target === 'from') {
        setNewFromCity(place.city);
        setNewFromCountry(place.countryCode);
      } else {
        setNewToCity(place.city);
        setNewToCountry(place.countryCode);
      }
    } catch (err) {
      setModalGpsError(
        err instanceof Error
          ? err.message
          : 'Nu am putut identifica poziția curentă.'
      );
    } finally {
      setIsLocatingModalGps(false);
    }
  };

  const safeParse = (val: string, fallback: number): number => {
    const cleaned = val.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : fallback;
  };

  // Automatic Real Road Distance & Cost Calculator (Point 4)
  const autoRouteDistanceLabel = buildRoadDistanceWithDetourLabel(
    newFromCity,
    newToCity,
    0
  );
  const autoRoadKmNumeric =
    parseInt(
      autoRouteDistanceLabel.split(' km')[0].replace(/\./g, ''),
      10
    ) || 850;
  const autoDriveHours = +(autoRoadKmNumeric / 72).toFixed(1);
  const currentLdmNum = Math.min(13.6, Math.max(0.4, safeParse(newLdm, 3.6)));
  const ldmShareRatio = Math.max(0.22, currentLdmNum / 13.6);
  const autoEstimatedDirectCostEur = Math.round(
    autoRoadKmNumeric * 1.18 * ldmShareRatio + 65
  );
  const autoRecommendedTariffEur = Math.round(
    autoEstimatedDirectCostEur * 1.38 + currentLdmNum * 35
  );

  const handleCreateNewOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const freshNow = getRomaniaZonedNow();
    const weekMeta = getPlanningWeekMeta(newWeekOffset, freshNow);
    const chosenDayMeta = weekMeta.days[newDayIndex] || weekMeta.days[0];

    if (
      newAllocationMode === 'DIRECT' &&
      isPlanningSlotInPast(chosenDayMeta.isoDate, newHourSlot, freshNow)
    ) {
      const nextValid = findFirstFuturePlanningSlot({
        weekOffset: newWeekOffset,
        preferredDayIndex: newDayIndex,
        zdtNow: freshNow,
      });
      setRoClock(formatRomaniaClockSnapshot(freshNow));
      setNewWeekOffset(nextValid.weekOffset);
      setNewDayIndex(nextValid.dayIndex);
      setNewHourSlot(nextValid.hourSlot);
      const nextDayMeta =
        getPlanningWeekMeta(nextValid.weekOffset, freshNow).days[
          nextValid.dayIndex
        ];
      setModalError(
        `Nu se poate programa o cursă în trecut (Ora României). Slotul a fost actualizat automat la ${nextDayMeta.label} (${nextDayMeta.date}) · ora ${nextValid.hourSlot}.`
      );
      return;
    }

    const ldmVal = Math.min(13.6, Math.max(0.4, safeParse(newLdm, 2.4)));
    const weightVal = Math.min(22.0, Math.max(0.2, safeParse(newWeight, 3.0)));
    const palletsVal = Math.max(1, Math.round(safeParse(newPallets, 6)));
    const tempVal = safeParse(newTemp, 4);
    const revVal = Math.max(50, Math.round(safeParse(newRevenue, 500)));

    const created: CargoOrder = {
      id: `CMD-${Date.now().toString().slice(-4)}`,
      client: newClient.trim() || 'Client Nou',
      fromCity: newFromCity.trim() || 'Oradea',
      fromCountry: newFromCountry,
      toCity: newToCity.trim() || 'Rotterdam',
      toCountry: newToCountry,
      ldm: ldmVal,
      weightTons: weightVal,
      pallets: palletsVal,
      tempReq: tempVal,
      tempZone: tempVal < 0 ? 'Zona 1 (Față)' : 'Zona 2 (Spate)',
      revenueEur: revVal,
      status: newAllocationMode === 'DIRECT' ? 'Planificat' : 'Nealocat',
      loadingWindow: `${chosenDayMeta.label} (${chosenDayMeta.date}) ${newHourSlot}`,
      deliveryDeadline: 'Conform ETA rută',
      stackable: false,
      palletExchange: true,
    };

    if (newAllocationMode === 'DIRECT') {
      const matchedTr = trailers.find((t) => t.id === newTrailerId);
      onCreateOrder(created, {
        trailerId: newTrailerId,
        tractorPlate: matchedTr ? matchedTr.tractorId.split(' (')[0] : undefined,
        weekOffset: newWeekOffset,
        dayIndex: newDayIndex,
        hourSlot: newHourSlot,
      });
      setModalError(null);
      setShowNewOrderModal(false);
      setToast(
        `Cursa ${created.id} (${created.client}, ${created.ldm} LDM · ${created.revenueEur} €) a fost salvată permanent în Comenzi & curse ȘI în Calendar 7 zile (${chosenDayMeta.short} ${chosenDayMeta.date}, ora ${newHourSlot}) pe ${newTrailerId}!`
      );
    } else {
      onCreateOrder(created);
      setSelectedOrderForTrip(created.id);
      setModalError(null);
      setShowNewOrderModal(false);
      setToast(
        `Comanda ${created.id} (${created.client}, ${created.ldm} LDM @ ${created.tempReq}°C, +${created.revenueEur} €) a fost salvată în Comenzi în așteptare pentru alocare!`
      );
    }
  };

  const handleConfirmTripWizard = () => {
    const order =
      unassignedOrders.find((o) => o.id === selectedOrderForTrip) ||
      unassignedOrders[0];
    const trailer =
      trailers.find((t) => t.id === selectedTrailerForTrip) || trailers[0];

    if (order && trailer) {
      const freshNow = getRomaniaZonedNow();
      if (isRomaniaDateTimeLocalInPast(departureDate, freshNow)) {
        const defaults = getDefaultRomaniaTripDateTimes(freshNow);
        setDepartureDate(defaults.departureLocal);
        setArrivalDate(defaults.arrivalLocal);
        setToast(
          `Data plecării nu poate fi în trecut față de Ora României! Am actualizat automat plecarea la primul interval viitor disponibil (${defaults.departureLocal.replace('T', ' ')}).`
        );
        return;
      }

      const mapped = mapDateTimeLocalToPlanningSlot(departureDate, freshNow);
      const dayMeta =
        getPlanningWeekMeta(mapped.weekOffset, freshNow).days[mapped.dayIndex];

      onAssignOrderToTrailer(
        order.id,
        trailer.id,
        mapped.dayIndex,
        mapped.hourSlot,
        mapped.weekOffset
      );
      setToast(
        `Cursa ${order.id} (${order.client}) a fost alocată pe remorca ${trailer.id} (${dayMeta.short} ${dayMeta.date}, ora ${mapped.hourSlot}) și salvată permanent în Calendar 7 zile!`
      );
      setWizardStep(1);
    }
  };

  const filteredLoads = activeLoads.filter((item) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' &&
        (item.status === 'În tranzit' || item.status === 'Planificată')) ||
      (statusFilter === 'DONE' &&
        (item.status === 'Descărcare' || item.status === 'Finalizată'));
    const matchesSearch =
      !searchQuery ||
      item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.trailerId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const wizardOrder =
    unassignedOrders.find((o) => o.id === selectedOrderForTrip) ||
    unassignedOrders[0];
  const wizardTrailer =
    trailers.find((t) => t.id === selectedTrailerForTrip) || trailers[0];

  const renderEuroRoPlate = (plate: string) => (
    <span
      className="inline-flex items-stretch rounded-[4px] overflow-hidden border border-slate-500/85 shadow-2xs shrink-0 whitespace-nowrap select-none h-[17px]"
      style={{ backgroundColor: '#ffffff' }}
    >
      <span
        className="flex flex-col items-center justify-center bg-[#003399] font-extrabold leading-none px-[3px] text-[5.5px]"
        style={{ backgroundColor: '#003399', color: '#ffffff' }}
      >
        <span
          className="euro-ro-plate-star"
          style={{ color: '#ffcc00', fontSize: '5px', lineHeight: 1 }}
        >
          ★
        </span>
        <span style={{ color: '#ffffff', lineHeight: 1, marginTop: '0.5px' }}>RO</span>
      </span>
      <span
        className="euro-ro-plate-num flex items-center font-black tracking-[0.02em] tabular-nums leading-none whitespace-nowrap px-1.5 text-[9.5px]"
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {plate}
      </span>
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="tahoe-glass rounded-[28px] p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mt-1">
            Comenzi & curse
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowNewOrderModal(true)}
          className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Cursă / Comandă nouă
        </button>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-full text-sm flex items-center justify-between"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold ml-4 cursor-pointer"
          >
            Închide
          </button>
        </div>
      )}

      {/* Active & Planned Orders Table (Matching Image 4 "Comenzi" panel) */}
      <div className="tahoe-glass rounded-[28px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: `Toate (${activeLoads.length})` },
              { id: 'ACTIVE', label: 'Active / În tranzit' },
              { id: 'DONE', label: 'La descărcare / Finalizate' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#0A84FF] text-white'
                    : 'tahoe-btn-secondary text-white/80 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută comandă, client, remorcă..."
              className="w-full bg-[#0b101d] border border-slate-800 rounded-full pl-9 pr-3.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/5 text-white/60 uppercase border-b border-white/10">
                <th className="py-3 px-4">Nr. Comandă</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Rută</th>
                <th className="py-3 px-4">Marfă & LDM</th>
                <th className="py-3 px-4">Temperatură</th>
                <th className="py-3 px-4">Remorcă Alocată</th>
                <th className="py-3 px-4">Documente</th>
                <th className="py-3 px-4">Tarif</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLoads.map((load) => (
                <tr key={load.id} className="hover:bg-[#161f33]">
                  <td className="py-3.5 px-4 tabular-nums font-bold text-indigo-300">
                    {load.id}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {load.client}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">{load.route}</td>
                  <td className="py-3.5 px-4">
                    <span className="tabular-nums font-bold text-emerald-400">
                      {load.ldm.toFixed(1)} LDM
                    </span>{' '}
                    · <span className="text-slate-300">{load.weightTons}t</span>
                    <div className="text-[10px] text-slate-400">{load.cargoDesc}</div>
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-cyan-300">
                    {load.temp}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums font-bold text-white">
                    {(() => {
                      const trObj = trailers.find((t) => t.id === load.trailerId);
                      const trPlate = trObj ? trObj.tractorId.split(' (')[0] : '';
                      const isTwo = Boolean(trPlate && trPlate !== load.trailerId);
                      return (
                        <span className="inline-flex items-center gap-1">
                          {isTwo && (
                            <>
                              {renderEuroRoPlate(trPlate)}
                              <span className="font-black text-white/75 text-[10px]">+</span>
                            </>
                          )}
                          {renderEuroRoPlate(load.trailerId)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const trObj =
                            trailers.find((t) => t.id === load.trailerId) ||
                            trailers[0];
                          const trPlate = trObj.tractorId.split(' (')[0];
                          const [fromPart, toPart] = load.route.split(' → ');
                          setPrintableDoc({
                            docType: 'CMR',
                            referenceNo: load.id,
                            clientName: load.client,
                            fromCity: fromPart || 'Oradea',
                            toCity: toPart || 'Rotterdam',
                            cargoDesc: load.cargoDesc,
                            ldm: load.ldm,
                            weightTons: load.weightTons,
                            tempRegime: load.temp,
                            tractorPlate: trPlate,
                            trailerPlate: trObj.id,
                            driverName: trObj.driver1.name,
                            revenueEur: load.revenueEur,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] font-bold text-[11px] cursor-pointer"
                        title="Deschide și printează Scrisoarea CMR Internațional"
                      >
                        <Printer className="w-3 h-3" />
                        <span>CMR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const trObj =
                            trailers.find((t) => t.id === load.trailerId) ||
                            trailers[0];
                          const trPlate = trObj.tractorId.split(' (')[0];
                          const [fromPart, toPart] = load.route.split(' → ');
                          setPrintableDoc({
                            docType: 'INVOICE',
                            referenceNo: load.id.replace('LD-', '44'),
                            clientName: load.client,
                            fromCity: fromPart || 'Oradea',
                            toCity: toPart || 'Rotterdam',
                            cargoDesc: load.cargoDesc,
                            ldm: load.ldm,
                            weightTons: load.weightTons,
                            tempRegime: load.temp,
                            tractorPlate: trPlate,
                            trailerPlate: trObj.id,
                            driverName: trObj.driver1.name,
                            revenueEur: load.revenueEur,
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#30D158]/15 hover:bg-[#30D158]/25 border border-[#30D158]/35 text-[#30D158] font-bold text-[11px] cursor-pointer"
                        title="Deschide și printează Factura Proformă / Fiscală"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>Factură</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 tabular-nums font-bold text-emerald-400">
                    {load.revenueEur} €
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        load.status === 'În tranzit'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : load.status === 'Planificată'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {load.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Panel from Image 4: "Cursă nouă" (1 Detalii -> 2 Alocare -> 3 Confirmare) */}
      <div className="tahoe-glass rounded-[28px] p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              WIZARD PLANIFICARE CURSĂ NOUĂ / GRUPAJ
            </span>
            <h2 className="text-lg font-bold text-white">
              ← Cursă nouă (Alocare Comandă pe Remorcă, Cap Tractor și Șofer)
            </h2>
          </div>

          {/* 3-Step Pills matching Image 4 */}
          <div className="flex items-center gap-2 text-xs flex-nowrap overflow-x-auto no-scrollbar">
            {[
              { step: 1, label: '1. Detalii Comandă' },
              { step: 2, label: '2. Alocare Vehicul & Șofer' },
              { step: 3, label: '3. Confirmare & LDM' },
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => setWizardStep(item.step as 1 | 2 | 3)}
                className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  wizardStep === item.step
                    ? 'bg-[#0A84FF] text-white shadow-md'
                    : 'tahoe-btn-secondary text-white/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {unassignedOrders.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300 flex items-center justify-between gap-3">
            <span>
              Toate comenzile nealocate au fost deja planificate! Creează o comandă nouă pentru a testa wizard-ul.
            </span>
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              + Comandă nouă
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label
                  htmlFor={`${formUid}-wiz-order`}
                  className="block text-slate-400 font-semibold mb-1.5"
                >
                  Comandă de alocat
                </label>
                <select
                  id={`${formUid}-wiz-order`}
                  name="wizardOrderId"
                  value={selectedOrderForTrip}
                  onChange={(e) => setSelectedOrderForTrip(e.target.value)}
                  className="w-full tahoe-card-inner rounded-full px-3.5 py-2.5 text-white font-medium"
                >
                  {unassignedOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.client} ({o.ldm} LDM · +{o.tempReq}°C)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`${formUid}-wiz-trailer`}
                  className="block text-slate-400 font-semibold mb-1.5"
                >
                  Remorcă & Cap Tractor
                </label>
                <select
                  id={`${formUid}-wiz-trailer`}
                  name="wizardTrailerId"
                  value={selectedTrailerForTrip}
                  onChange={(e) => setSelectedTrailerForTrip(e.target.value)}
                  className="w-full tahoe-card-inner rounded-full px-3.5 py-2.5 text-white font-medium"
                >
                  {trailers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} (Tractor {t.tractorId} · Liber: {t.freeLdm.toFixed(1)} LDM)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`${formUid}-wiz-dep`}
                  className="block text-slate-400 font-semibold mb-1.5"
                >
                  Plecare / Încărcare (Ora României)
                </label>
                <input
                  id={`${formUid}-wiz-dep`}
                  name="departureDate"
                  type="datetime-local"
                  min={minRoDateTimeLocal}
                  value={departureDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDepartureDate(val);
                    if (val && arrivalDate && val > arrivalDate) {
                      setArrivalDate(val);
                    }
                  }}
                  className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formUid}-wiz-arr`}
                  className="block text-slate-400 font-semibold mb-1.5"
                >
                  Sosire estimată (ETA)
                </label>
                <input
                  id={`${formUid}-wiz-arr`}
                  name="arrivalDate"
                  type="datetime-local"
                  min={departureDate || minRoDateTimeLocal}
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white tabular-nums"
                />
              </div>
            </div>

            {/* Live Compatibility & Margin Preview Bar */}
            {wizardOrder && wizardTrailer && (
              <div className="tahoe-card-inner rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-slate-400">Rută comandă (Google Maps): </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                        wizardOrder.fromCity
                      )}&destination=${encodeURIComponent(wizardOrder.toCity)}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-extrabold text-[#0284c7] hover:underline"
                    >
                      {wizardOrder.fromCity} ({formatCountryBadge(wizardOrder.fromCountry)}) → {wizardOrder.toCity} ({formatCountryBadge(wizardOrder.toCountry)}) ↗
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400">Șofer alocat: </span>
                    <strong className="text-emerald-300">
                      {wizardTrailer.driver1.name} ({wizardTrailer.driver1.remainingDailyDriveHours}h condus azi)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Impact LDM pe {wizardTrailer.id}: </span>
                    <strong
                      className={
                        wizardOrder.ldm <= wizardTrailer.freeLdm
                          ? 'text-emerald-400 tabular-nums'
                          : 'text-rose-400 tabular-nums'
                      }
                    >
                      {wizardTrailer.freeLdm.toFixed(1)} LDM liberi →{' '}
                      {(wizardTrailer.freeLdm - wizardOrder.ldm).toFixed(1)} LDM rămași
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {wizardStep < 3 ? (
                    <button
                      onClick={() => setWizardStep((s) => (s === 1 ? 2 : 3))}
                      className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Continuă (Pasul {wizardStep + 1}/3)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled={wizardOrder.ldm > wizardTrailer.freeLdm}
                      onClick={handleConfirmTripWizard}
                      className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmă & Trimite în Planning 7 Zile</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create New Order / Direct Trip */}
      {showNewOrderModal && (() => {
        const modalWeekMeta = getPlanningWeekMeta(newWeekOffset, roClock.zdt);
        const modalDay = modalWeekMeta.days[newDayIndex] || modalWeekMeta.days[0];
        const selectedModalTrailer = trailers.find((t) => t.id === newTrailerId);

        return (
          <div
            onClick={() => setShowNewOrderModal(false)}
            className="modal-backdrop-lock fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 overscroll-contain overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="tahoe-glass-elevated rounded-[26px] max-w-lg w-full p-6 space-y-3.5 shadow-2xl border border-white/20 max-h-[92vh] overflow-y-auto overscroll-contain"
            >
              <div className="flex flex-nowrap items-start justify-between gap-3 border-b border-white/15 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-[#64D2FF] uppercase">
                      CURSĂ / COMANDĂ NOUĂ · SALVARE PERMANENTĂ
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/35 text-[10px] font-bold text-[#64D2FF] tabular-nums">
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span>RO: {roClock.dateCompact} · {roClock.timeShort}</span>
                    </span>
                  </div>
                  <h3
                    id={`${formUid}-title`}
                    className="text-lg font-bold text-white truncate mt-0.5"
                  >
                    Adaugă Cursă sau Comandă în SFERLE TMS PRO
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="w-9 h-9 rounded-full tahoe-card-inner border border-white/15 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer shrink-0 transition"
                  aria-label="Închide fereastra"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div
                  role="alert"
                  className="px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <form
                aria-labelledby={`${formUid}-title`}
                onSubmit={handleCreateNewOrderSubmit}
                className="space-y-3 text-xs"
              >
                {/* Allocation Mode Fieldset (2 options -> visible radios per Modern Web Guidance) */}
                <fieldset className="p-3 rounded-2xl tahoe-card-inner border border-white/15 space-y-2.5">
                  <legend className="px-2 text-[10.5px] font-extrabold uppercase tracking-wider text-[#64D2FF]">
                    Mod de planificare a cursei
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 bg-white/[0.04]">
                      <input
                        id={`${formUid}-mode-direct`}
                        type="radio"
                        name="allocationMode"
                        value="DIRECT"
                        checked={newAllocationMode === 'DIRECT'}
                        onChange={() => setNewAllocationMode('DIRECT')}
                        className="accent-[#0A84FF] w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <label
                        htmlFor={`${formUid}-mode-direct`}
                        className="font-bold text-white cursor-pointer leading-tight"
                      >
                        Alocă direct în Calendar 7 zile
                      </label>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 bg-white/[0.04]">
                      <input
                        id={`${formUid}-mode-unassigned`}
                        type="radio"
                        name="allocationMode"
                        value="UNASSIGNED"
                        checked={newAllocationMode === 'UNASSIGNED'}
                        onChange={() => setNewAllocationMode('UNASSIGNED')}
                        className="accent-[#0A84FF] w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <label
                        htmlFor={`${formUid}-mode-unassigned`}
                        className="font-bold text-white/85 cursor-pointer leading-tight"
                      >
                        Lasă în așteptare (nealocată)
                      </label>
                    </div>
                  </div>

                  {newAllocationMode === 'DIRECT' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>
                        <label
                          htmlFor={`${formUid}-trailer`}
                          className="block text-white/75 font-bold mb-1"
                        >
                          Remorcă alocată
                        </label>
                        <select
                          id={`${formUid}-trailer`}
                          name="trailerId"
                          value={newTrailerId}
                          onChange={(e) => setNewTrailerId(e.target.value)}
                          className="w-full tahoe-card-inner rounded-full px-3 py-1.5 text-white font-bold border border-white/15"
                        >
                          <optgroup label="Remorci active cu șofer">
                            {trailers.map((t) => (
                              <option
                                key={t.id}
                                value={t.id}
                                className="bg-slate-900 text-white"
                              >
                                {t.id} · {t.driver1.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={`Disponibile în flotă (${idleTrailers.length})`}>
                            {idleTrailers.map((v) => (
                              <option
                                key={v.plate}
                                value={v.plate}
                                className="bg-slate-900 text-white"
                              >
                                {v.plate} · {v.company}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`${formUid}-day`}
                          className="block text-white/75 font-bold mb-1"
                        >
                          Ziua încărcării
                        </label>
                        <select
                          id={`${formUid}-day`}
                          name="dayIndex"
                          value={newDayIndex}
                          onChange={(e) => {
                            const nextDay = Number(e.target.value);
                            const nextMeta = modalWeekMeta.days[nextDay];
                            if (!nextMeta || !nextMeta.hasFutureSlots) return;
                            setNewDayIndex(nextDay);
                            if (
                              isPlanningSlotInPast(
                                nextMeta.isoDate,
                                newHourSlot,
                                roClock.zdt
                              )
                            ) {
                              const nextSlot = findFirstFuturePlanningSlot({
                                weekOffset: newWeekOffset,
                                preferredDayIndex: nextDay,
                                zdtNow: roClock.zdt,
                              });
                              setNewHourSlot(nextSlot.hourSlot);
                            }
                            setModalError(null);
                          }}
                          className="w-full tahoe-card-inner rounded-full px-3 py-1.5 text-white font-bold border border-white/15"
                        >
                          {modalWeekMeta.days.map((d) => (
                            <option
                              key={d.isoDate}
                              value={d.dayIndex}
                              disabled={!d.hasFutureSlots}
                              className="bg-slate-900 text-white"
                            >
                              {d.label} ({d.date})
                              {!d.hasFutureSlots
                                ? ' · trecut'
                                : d.isToday
                                  ? ' · AZI'
                                  : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`${formUid}-hour`}
                          className="block text-white/75 font-bold mb-1"
                        >
                          Ora încărcării
                        </label>
                        <select
                          id={`${formUid}-hour`}
                          name="hourSlot"
                          value={newHourSlot}
                          onChange={(e) => {
                            setNewHourSlot(e.target.value);
                            setModalError(null);
                          }}
                          className="w-full tahoe-card-inner rounded-full px-3 py-1.5 text-white font-bold border border-white/15 tabular-nums"
                        >
                          {HOUR_SLOTS.map((slot) => {
                            const slotPast = isPlanningSlotInPast(
                              modalDay.isoDate,
                              slot,
                              roClock.zdt
                            );
                            return (
                              <option
                                key={slot}
                                value={slot}
                                disabled={slotPast}
                                className="bg-slate-900 text-white"
                              >
                                {slot} {slotPast ? '· oră trecută' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </fieldset>

                <ClientDropdownSelect
                  label="Client (din Baza de Clienți)"
                  value={newClient}
                  onChange={setNewClient}
                  onSelectClientRecord={(client) => {
                    setNewFromCity(client.defaultFromCity);
                    setNewToCity(client.defaultToCity);
                    setNewLdm(String(client.defaultLdm));
                    setNewWeight(String(client.defaultWeightTons));
                    setNewTemp(String(client.defaultTemp));
                  }}
                />

                {/* Live Geolocation Bar ("Identifică unde sunt" + Poziția GPS a camionului selectat) */}
                <div className="p-2.5 rounded-2xl tahoe-card-inner border border-[#0A84FF]/35 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleModalIdentifyMyLocation('from')}
                      disabled={isLocatingModalGps}
                      className="px-3 py-1.5 rounded-full tahoe-btn-primary text-[11px] font-extrabold text-white inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {isLocatingModalGps ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <LocateFixed className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>
                        {isLocatingModalGps
                          ? 'Se identifică unde ești...'
                          : 'Identifică unde sunt (GPS Live)'}
                      </span>
                    </button>

                    {selectedModalTrailer && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewFromCity(
                            selectedModalTrailer.currentLocation.city.split(' (')[0]
                          )
                        }
                        title="Preia orașul în care se află acum camionul selectat"
                        className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[10.5px] font-bold text-white/85 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Radio className="w-3 h-3 text-[#30D158] shrink-0" />
                        <span className="truncate max-w-[180px]">
                          Camion: {selectedModalTrailer.currentLocation.city.split(' (')[0]}
                        </span>
                      </button>
                    )}
                  </div>

                  {detectedModalGps && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/12 border border-emerald-500/35 text-[10.5px] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#30D158] truncate">
                          📍 Localizat: {detectedModalGps.city} (±{detectedModalGps.accuracyMeters}m)
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${detectedModalGps.lat},${detectedModalGps.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-[#0A84FF] hover:underline shrink-0"
                        >
                          <span>Hartă GPS</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <div className="text-white/75 truncate text-[10px]">
                        {detectedModalGps.fullAddress}
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setNewFromCity(detectedModalGps.city);
                            setNewFromCountry(detectedModalGps.countryCode);
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/40 text-[#64D2FF] text-[10px] font-extrabold cursor-pointer"
                        >
                          Pune la Încărcare
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewToCity(detectedModalGps.city);
                            setNewToCountry(detectedModalGps.countryCode);
                          }}
                          className="px-2.5 py-0.5 rounded-full tahoe-btn-secondary text-white/85 text-[10px] font-bold cursor-pointer"
                        >
                          Pune la Descărcare
                        </button>
                      </div>
                    </div>
                  )}

                  {modalGpsError && (
                    <div
                      role="alert"
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10.5px] font-semibold flex items-start gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{modalGpsError}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <GoogleMapsAddressInput
                    label="Încărcare"
                    required
                    value={newFromCity}
                    onChange={setNewFromCity}
                    onSelectPlace={(place) => setNewFromCountry(place.countryCode)}
                    placeholder="Ex: München, Am Moosfeld 11..."
                  />
                  <GoogleMapsAddressInput
                    label="Descărcare"
                    required
                    value={newToCity}
                    onChange={setNewToCity}
                    onSelectPlace={(place) => setNewToCountry(place.countryCode)}
                    placeholder="Ex: Oradea, Calea Borșului 45..."
                  />
                </div>

              {/* Automatic Live Road Distance, Driving Time & Cost Estimation Card (Point 4) */}
              <div className="p-3 rounded-2xl tahoe-card-inner border border-[#0A84FF]/35 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64D2FF] flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    CALCUL AUTOMAT DISTANȚĂ RUTIERĂ & COST ESTIMAT (GOOGLE MAPS / OSRM)
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewRevenue(String(autoRecommendedTariffEur))}
                    className="px-2.5 py-0.5 rounded-full bg-[#0A84FF] text-white text-[10px] font-extrabold cursor-pointer"
                  >
                    Aplică Tarif ({autoRecommendedTariffEur} €)
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] tabular-nums">
                  <div>
                    <div className="text-white/55 text-[10px]">Distanță Șosea</div>
                    <div className="font-extrabold text-white">
                      {autoRouteDistanceLabel}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/55 text-[10px]">Timp Condus Est.</div>
                    <div className="font-extrabold text-[#64D2FF]">
                      ~{autoDriveHours}h (72 km/h HGV)
                    </div>
                  </div>
                  <div>
                    <div className="text-white/55 text-[10px]">Cost / Tarif Recom.</div>
                    <div className="font-extrabold text-[#30D158]">
                      Cost {autoEstimatedDirectCostEur} € → {autoRecommendedTariffEur} €
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor={`${formUid}-ldm`}
                    className="block text-white/80 font-bold mb-1"
                  >
                    LDM (0.4 – 13.6)
                  </label>
                  <input
                    id={`${formUid}-ldm`}
                    name="ldm"
                    type="number"
                    step="0.2"
                    min="0.4"
                    max="13.6"
                    required
                    value={newLdm}
                    onChange={(e) => setNewLdm(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white tabular-nums font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${formUid}-weight`}
                    className="block text-white/80 font-bold mb-1"
                  >
                    Tonaj (t, max 22)
                  </label>
                  <input
                    id={`${formUid}-weight`}
                    name="weightTons"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="22.0"
                    required
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white tabular-nums font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${formUid}-pallets`}
                    className="block text-white/80 font-bold mb-1"
                  >
                    Nr. Paleți
                  </label>
                  <input
                    id={`${formUid}-pallets`}
                    name="pallets"
                    type="number"
                    min="1"
                    max="33"
                    required
                    value={newPallets}
                    onChange={(e) => setNewPallets(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-white tabular-nums font-bold border border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${formUid}-temp`}
                    className="block text-white/80 font-bold mb-1"
                  >
                    Temperatură Cerută (°C)
                  </label>
                  <input
                    id={`${formUid}-temp`}
                    name="tempReq"
                    type="number"
                    min="-25"
                    max="25"
                    required
                    value={newTemp}
                    onChange={(e) => setNewTemp(e.target.value)}
                    className="w-full tahoe-card-inner rounded-full px-3.5 py-2 text-cyan-300 tabular-nums font-bold border border-white/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${formUid}-revenue`}
                    className="block text-white/80 font-bold mb-1"
                  >
                    Tarif Agreat (EUR)
                  </label>
                  <input
                    id={`${formUid}-revenue`}
                    name="revenueEur"
                    type="number"
                    min="50"
                    required
                    value={newRevenue}
                    onChange={(e) => setNewRevenue(e.target.value)}
                    className="w-full tahoe-card-inner border border-emerald-500/50 rounded-full px-3.5 py-2 text-emerald-400 tabular-nums font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-semibold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full tahoe-btn-primary text-white font-bold cursor-pointer"
                >
                  {newAllocationMode === 'DIRECT'
                    ? `+ Salvează Cursa (${modalDay.short} ${modalDay.dayNum} · ${newHourSlot})`
                    : 'Salvează în Așteptare'}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Printable CMR & Fiscal Invoice Modal */}
      <CmrAndInvoiceModal
        docData={printableDoc}
        onClose={() => setPrintableDoc(null)}
      />
    </div>
  );
};

