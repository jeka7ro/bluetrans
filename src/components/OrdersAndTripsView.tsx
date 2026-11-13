import React, { useState, useEffect, useId, useRef } from 'react';
import {
  Plus,
  ArrowRight,
  CheckCircle2,
  Calculator,
  Search,
  Printer,
  FileCheck2,
  Receipt,
  LocateFixed,
  Loader2,
  ExternalLink,
  AlertCircle,
  Clock,
  Radio,
  X,
  Eye,
} from 'lucide-react';
import {
  BulkActionBar,
  BulkCheckbox,
  BulkDeleteConfirmModal,
  CheckboxTh,
  ExportExcelButton,
  ListPaginationBar,
  SortableTh,
  TAHOE_CELL_BORDER_STYLE,
  TAHOE_TABLE_SCROLL_CLASS,
  TAHOE_TABLE_STYLE,
  TAHOE_TABLE_WRAPPER_CLASS,
  ViewModeToggle,
  getTahoeRowStyle,
  paginateItems,
  toggleSortState,
  usePersistedPageSize,
  usePersistedViewMode,
  useTableSelection,
  type SortState,
} from './ListViewControls';
import { CargoOrder, TrailerUnit, formatCountryBadge } from '../data/mockData';
import { exportRowsToExcel } from '../utils/exportExcel';
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
  buildGoogleMapsDirectionsUrl,
  computeHgvRouteMetrics,
  resolveHgvVehicleProfile,
} from '../utils/googleMapsLinks';
import {
  findFirstFuturePlanningSlot,
  formatPlanningOrderPosition,
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
  focusAllocationNonce?: number;
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
  setActiveLoads,
  onCreateOrder,
  onAssignOrderToTrailer,
  focusAllocationNonce,
}) => {
  const formUid = useId();
  const allocationPanelRef = useRef<HTMLDivElement>(null);
  const allocationHeadingRef = useRef<HTMLHeadingElement>(null);
  const scrollOpRef = useRef(0);
  const [highlightAllocation, setHighlightAllocation] = useState(false);

  useEffect(() => {
    if (!focusAllocationNonce) return;
    const panel = allocationPanelRef.current;
    if (!panel) return;
    const opId = ++scrollOpRef.current;
    setHighlightAllocation(false);

    const runScroll = async () => {
      const maybePromise: unknown = panel.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      if (maybePromise instanceof Promise) {
        await maybePromise;
      } else {
        await new Promise<void>((resolve) => {
          let timerId: number | undefined;
          const finish = () => {
            window.clearTimeout(timerId);
            window.removeEventListener('scrollend', finish);
            window.removeEventListener('scroll', onScroll);
            resolve();
          };
          const onScroll = () => {
            window.clearTimeout(timerId);
            timerId = window.setTimeout(finish, 110);
          };
          window.addEventListener('scrollend', finish, { once: true });
          window.addEventListener('scroll', onScroll, { passive: true });
          timerId = window.setTimeout(finish, 120);
        });
      }
      if (opId !== scrollOpRef.current) return;
      allocationHeadingRef.current?.focus({ preventScroll: true });
      setHighlightAllocation(true);
      window.setTimeout(() => {
        if (opId === scrollOpRef.current) {
          setHighlightAllocation(false);
        }
      }, 1800);
    };

    requestAnimationFrame(() => {
      void runScroll();
    });
  }, [focusAllocationNonce]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ordersViewMode, setOrdersViewMode] = usePersistedViewMode(
    'bluetrans_orders_view_v1',
    'list'
  );
  const [ordersPageSize, setOrdersPageSize] = usePersistedPageSize(
    'bluetrans_orders_pagesize_v1',
    10
  );
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderSort, setOrderSort] = useState<
    SortState<'id' | 'client' | 'route' | 'ldm' | 'trailer' | 'revenue' | 'status'> | null
  >(null);
  const [viewingOrder, setViewingOrder] = useState<ActiveLoadItem | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [printableDoc, setPrintableDoc] =
    useState<PrintableTripDocData | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Acțiuni în masă — Comenzi & curse
  const [showBulkEditOrders, setShowBulkEditOrders] = useState(false);
  const [bulkOrderStatus, setBulkOrderStatus] = useState<
    'KEEP' | ActiveLoadItem['status']
  >('KEEP');
  const [bulkOrderCmrStatus, setBulkOrderCmrStatus] = useState<
    'KEEP' | ActiveLoadItem['cmrStatus']
  >('KEEP');
  const [bulkOrderTrailerId, setBulkOrderTrailerId] = useState('');
  const [bulkOrderTemp, setBulkOrderTemp] = useState('');
  const [showBulkDeleteOrders, setShowBulkDeleteOrders] = useState(false);

  const realFleet = React.useMemo(() => getRealFleet(), []);
  const idleTrailers = realFleet.trailers.filter(
    (v) => !trailers.some((t) => t.id === v.plate)
  );

  useEffect(() => {
    setOrdersPage(1);
  }, [statusFilter, searchQuery, ordersPageSize, orderSort]);

  useEffect(() => {
    if (
      showNewOrderModal ||
      viewingOrder ||
      printableDoc ||
      showBulkEditOrders ||
      showBulkDeleteOrders
    ) {
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
  }, [
    showNewOrderModal,
    viewingOrder,
    printableDoc,
    showBulkEditOrders,
    showBulkDeleteOrders,
  ]);

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
  const autoHgvMetrics = computeHgvRouteMetrics(autoRoadKmNumeric, {
    isHgv: true,
  });
  const autoDriveHours = autoHgvMetrics.pureDriveHours;
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

  const sortedLoads = [...filteredLoads].sort((a, b) => {
    if (!orderSort) return 0;
    let cmp = 0;
    switch (orderSort.key) {
      case 'id':
        cmp = a.id.localeCompare(b.id, 'ro');
        break;
      case 'client':
        cmp = a.client.localeCompare(b.client, 'ro');
        break;
      case 'route':
        cmp = a.route.localeCompare(b.route, 'ro');
        break;
      case 'ldm':
        cmp = a.ldm - b.ldm;
        break;
      case 'trailer':
        cmp = a.trailerId.localeCompare(b.trailerId, 'ro');
        break;
      case 'revenue':
        cmp = a.revenueEur - b.revenueEur;
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status, 'ro');
        break;
    }
    return orderSort.dir === 'asc' ? cmp : -cmp;
  });

  const {
    total: ordersTotal,
    totalPages: ordersPageCount,
    safePage: ordersSafePage,
    startIdx: ordersStartIdx,
    endIdx: ordersEndIdx,
    visibleItems: visibleLoads,
  } = paginateItems(sortedLoads, ordersPageSize, ordersPage);

  const ordersSelection = useTableSelection(
    sortedLoads.map((l) => l.id),
    visibleLoads.map((l) => l.id)
  );
  const selectedOrderItems = sortedLoads.filter((l) =>
    ordersSelection.isSelected(l.id)
  );

  const handleApplyBulkEditOrders = (e: React.FormEvent) => {
    e.preventDefault();
    if (ordersSelection.selectedCount === 0) return;
    const selectedSet = ordersSelection.selectedIds;
    setActiveLoads((prev) =>
      prev.map((load) => {
        if (!selectedSet.has(load.id)) return load;
        return {
          ...load,
          status: bulkOrderStatus !== 'KEEP' ? bulkOrderStatus : load.status,
          cmrStatus:
            bulkOrderCmrStatus !== 'KEEP' ? bulkOrderCmrStatus : load.cmrStatus,
          trailerId: bulkOrderTrailerId || load.trailerId,
          temp: bulkOrderTemp.trim() ? bulkOrderTemp.trim() : load.temp,
        };
      })
    );
    setToast(
      `${ordersSelection.selectedCount} curse/comenzi au fost actualizate în masă!`
    );
    ordersSelection.clearSelection();
    setShowBulkEditOrders(false);
  };

  const handleConfirmBulkDeleteOrders = () => {
    if (ordersSelection.selectedCount === 0) return;
    const count = ordersSelection.selectedCount;
    const selectedSet = ordersSelection.selectedIds;
    setActiveLoads((prev) => prev.filter((load) => !selectedSet.has(load.id)));
    ordersSelection.clearSelection();
    setShowBulkDeleteOrders(false);
    setToast(`${count} curse/comenzi au fost eliminate din registrul activ.`);
  };

  const handleExportOrdersExcel = (rowsOverride?: ActiveLoadItem[]) => {
    const targetRows = Array.isArray(rowsOverride) ? rowsOverride : sortedLoads;
    const res = exportRowsToExcel({
      fileName: 'BlueTrans_Curse',
      sheetName: 'Curse si Comenzi',
      rows: targetRows,
      columns: [
        { header: '#', value: (_, i) => i + 1, minWidth: 5, maxWidth: 8 },
        { header: 'Nr. Comandă / Cursă', value: (l) => l.id },
        { header: 'Client', value: (l) => l.client },
        { header: 'Rută', value: (l) => l.route },
        { header: 'Descriere Marfă', value: (l) => l.cargoDesc },
        { header: 'LDM', value: (l) => l.ldm },
        { header: 'Tonaj (t)', value: (l) => l.weightTons },
        { header: 'Regim Temperatură', value: (l) => l.temp },
        {
          header: 'Cap Tractor',
          value: (l) => {
            const tr = trailers.find((t) => t.id === l.trailerId);
            return tr ? tr.tractorId.split(' (')[0] : '';
          },
        },
        { header: 'Semiremorcă', value: (l) => l.trailerId },
        {
          header: 'Șofer Alocat',
          value: (l) => {
            const tr = trailers.find((t) => t.id === l.trailerId);
            return tr?.driver1.name || '';
          },
        },
        { header: 'Status CMR', value: (l) => l.cmrStatus },
        { header: 'Tarif (EUR)', value: (l) => l.revenueEur },
        { header: 'Status Cursă', value: (l) => l.status },
      ],
    });
    setToast(`Export Excel generat: ${res.fileName} (${res.rowCount} curse).`);
  };

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
    <div className="space-y-3 sm:space-y-6">
      {/* Top Header — hidden on mobile (tab pill above already says Comenzi & curse; + Comandă sits beside search), unchanged on desktop */}
      <div className="hidden sm:flex tahoe-glass rounded-[28px] p-5 flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mt-1">
            Comenzi &amp; curse
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowNewOrderModal(true)}
          className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center sm:justify-start gap-2 shadow-lg shadow-indigo-600/25 transition shrink-0 cursor-pointer"
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
      <div className="tahoe-glass rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border-b border-white/10 pb-3 sm:pb-4">
          <div className="tps-subtab-scroller grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2 sm:flex-nowrap sm:overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: `Toate (${activeLoads.length})`, mobileLabel: `Toate (${activeLoads.length})` },
              { id: 'ACTIVE', label: 'Active / În tranzit', mobileLabel: 'În tranzit' },
              { id: 'DONE', label: 'La descărcare / Finalizate', mobileLabel: 'Finalizate' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={statusFilter === tab.id}
                onClick={(e) => {
                  setStatusFilter(tab.id);
                  e.currentTarget.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                  });
                }}
                className={`min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center justify-center whitespace-nowrap sm:shrink-0 transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#0A84FF] border border-[#0A84FF] text-white'
                    : 'tahoe-btn-secondary text-white/80 hover:text-white'
                }`}
              >
                <span className="sm:hidden truncate">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 min-w-[160px] sm:w-56 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută comandă, client, remorcă..."
                className="w-full bg-[#0b101d] border border-slate-800 rounded-full pl-9 pr-3.5 py-2 sm:py-1.5 text-xs text-white"
              />
            </div>

            <ViewModeToggle
              value={ordersViewMode}
              onChange={setOrdersViewMode}
              ariaLabel="Mod afișare comenzi"
            />

            <ExportExcelButton
              onClick={() => handleExportOrdersExcel(sortedLoads)}
              count={sortedLoads.length}
              disabled={sortedLoads.length === 0}
            />

            <button
              type="button"
              onClick={() => setShowNewOrderModal(true)}
              className="sm:hidden px-3 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-indigo-600/25 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Comandă</span>
            </button>
          </div>
        </div>

        <BulkActionBar
          selectedCount={ordersSelection.selectedCount}
          totalFilteredCount={sortedLoads.length}
          onSelectAllFiltered={ordersSelection.selectAllFiltered}
          onClearSelection={ordersSelection.clearSelection}
          onBulkExport={() => handleExportOrdersExcel(selectedOrderItems)}
          onBulkEdit={() => {
            setBulkOrderStatus('KEEP');
            setBulkOrderCmrStatus('KEEP');
            setBulkOrderTrailerId('');
            setBulkOrderTemp('');
            setShowBulkEditOrders(true);
          }}
          onBulkDelete={() => setShowBulkDeleteOrders(true)}
          itemNounSingular="cursă selectată"
          itemNounPlural="curse selectate"
        />

        {ordersViewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleLoads.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-white/60">
                Nicio comandă nu corespunde filtrelor curente.
              </div>
            )}
            {visibleLoads.map((load, idx) => {
              const trObj = trailers.find((t) => t.id === load.trailerId) || trailers[0];
              const trPlate = trObj ? trObj.tractorId.split(' (')[0] : '';
              const isTwo = Boolean(trPlate && trPlate !== load.trailerId);
              const [fromPart, toPart] = load.route.split(' → ');
              const selected = ordersSelection.isSelected(load.id);
              return (
                <div
                  key={load.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingOrder(load)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewingOrder(load);
                    }
                  }}
                  className={`tahoe-card-inner rounded-[20px] p-3.5 border transition cursor-pointer flex flex-col justify-between gap-2.5 text-left ${
                    selected
                      ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                      : 'border-white/15 hover:border-[#0A84FF]/55 hover:bg-[#0A84FF]/5'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <BulkCheckbox
                          checked={selected}
                          onChange={() => ordersSelection.toggleOne(load.id)}
                          ariaLabel={`Selectează ${load.id}`}
                        />
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/75 text-[10.5px] font-bold tabular-nums">
                          #{ordersStartIdx + idx + 1}
                        </span>
                        <span className="tabular-nums font-extrabold text-xs text-indigo-300">
                          {load.id}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                            load.status === 'În tranzit'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : load.status === 'Planificată'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {load.status}
                        </span>
                      </div>
                      <span className="tabular-nums font-extrabold text-sm text-emerald-400 whitespace-nowrap shrink-0">
                        {load.revenueEur}&#160;€
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white leading-snug">
                        {load.client}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 font-medium">
                        {load.route}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold tabular-nums">
                        {load.ldm.toFixed(1)} LDM · {load.weightTons}t
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold tabular-nums">
                        {load.temp}
                      </span>
                      <span className="text-white/60 text-[10.5px]">{load.cargoDesc}</span>
                    </div>
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="inline-flex items-center gap-1">
                      {isTwo && (
                        <>
                          {renderEuroRoPlate(trPlate)}
                          <span className="font-black text-white/75 text-[10px]">+</span>
                        </>
                      )}
                      {renderEuroRoPlate(load.trailerId)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
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
                          })
                        }
                        title="Deschide și printează CMR"
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full tahoe-btn-secondary text-white/85 hover:text-white font-semibold text-[11px] cursor-pointer"
                      >
                        <FileCheck2 className="w-3 h-3" aria-hidden="true" />
                        <span>CMR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
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
                          })
                        }
                        title="Printează"
                        aria-label={`Printează ${load.id}`}
                        className="inline-flex items-center justify-center p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={TAHOE_TABLE_WRAPPER_CLASS}>
            <div className={TAHOE_TABLE_SCROLL_CLASS}>
              <table className="w-full text-left" style={TAHOE_TABLE_STYLE}>
                <thead>
                  <tr>
                    <CheckboxTh
                      checked={ordersSelection.isAllVisibleSelected}
                      indeterminate={ordersSelection.isSomeVisibleSelected}
                      onChange={ordersSelection.toggleAllVisible}
                      ariaLabel="Selectează toate cursele de pe pagină"
                    />
                    <SortableTh label="#" sort={null} align="center" className="w-7 px-1" />
                    <SortableTh
                      label="Comandă"
                      sortKey="id"
                      sort={orderSort}
                      onToggle={(k) => setOrderSort((p) => toggleSortState(p, k))}
                      className="px-1.5"
                    />
                    <SortableTh
                      label="Client"
                      sortKey="client"
                      sort={orderSort}
                      onToggle={(k) => setOrderSort((p) => toggleSortState(p, k))}
                      className="px-1.5"
                    />
                    <SortableTh
                      label="Rută"
                      sortKey="route"
                      sort={orderSort}
                      onToggle={(k) => setOrderSort((p) => toggleSortState(p, k))}
                      className="px-1.5"
                    />
                    <SortableTh
                      label="Marfă & LDM"
                      sortKey="ldm"
                      sort={orderSort}
                      onToggle={(k) => setOrderSort((p) => toggleSortState(p, k))}
                      className="px-1.5"
                    />
                    <SortableTh label="Temp." sort={null} className="px-1.5" />
                    <SortableTh
                      label="Ansamblu"
                      sortKey="trailer"
                      sort={orderSort}
                      onToggle={(k) => setOrderSort((p) => toggleSortState(p, k))}
                      className="px-1.5"
                    />
                    <SortableTh label="Acțiuni" sort={null} className="px-1.5" />
                    <SortableTh
                      label="Tarif"
                      sortKey="revenue"
                      sort={orderSort}
                      onToggle={(k) => setOrderSort((p) => toggleSortState(p, k))}
                      align="right"
                      className="px-1.5"
                    />
                    <SortableTh
                      label="Status"
                      sortKey="status"
                      sort={orderSort}
                      onToggle={(k) => setOrderSort((p) => toggleSortState(p, k))}
                      className="px-1.5"
                    />
                  </tr>
                </thead>
                <tbody>
                  {visibleLoads.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-white/60">
                        Nicio comandă nu corespunde filtrelor curente.
                      </td>
                    </tr>
                  )}
                  {visibleLoads.map((load, idx) => {
                    const selected = ordersSelection.isSelected(load.id);
                    return (
                    <tr
                      key={load.id}
                      onClick={() => setViewingOrder(load)}
                      className="cursor-pointer transition hover:bg-[#0A84FF]/10"
                      style={getTahoeRowStyle(idx, selected)}
                    >
                      <td className="px-1 text-center" style={TAHOE_CELL_BORDER_STYLE}>
                        <BulkCheckbox
                          checked={selected}
                          onChange={() => ordersSelection.toggleOne(load.id)}
                          ariaLabel={`Selectează ${load.id}`}
                        />
                      </td>
                      <td
                        className="px-1 text-center text-white/50 font-semibold tabular-nums"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        {ordersStartIdx + idx + 1}
                      </td>
                      <td
                        className="px-1.5 tabular-nums font-bold text-indigo-300 whitespace-nowrap text-xs"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        {load.id}
                      </td>
                      <td
                        className="px-1.5 font-semibold text-white max-w-[105px] whitespace-nowrap text-xs"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <div className="truncate" title={load.client}>{load.client}</div>
                      </td>
                      <td
                        className="px-1.5 text-slate-200 whitespace-nowrap text-[11px] max-w-[125px]"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <div className="truncate" title={load.route}>{load.route}</div>
                      </td>
                      <td
                        className="px-1.5 whitespace-nowrap max-w-[108px]"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <div className="leading-tight text-xs">
                          <span className="tabular-nums font-bold text-emerald-400">
                            {load.ldm.toFixed(1)} LDM
                          </span>{' '}
                          · <span className="text-slate-300">{load.weightTons}t</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate leading-tight" title={load.cargoDesc}>
                          {load.cargoDesc}
                        </div>
                      </td>
                      <td
                        className="px-1.5 tabular-nums text-cyan-300 whitespace-nowrap text-xs"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        {load.temp}
                      </td>
                      <td
                        className="px-1.5 tabular-nums font-bold text-white whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
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
                      <td
                        className="px-1.5 whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingOrder(load)}
                            className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                            title="Vezi detalii comandă"
                            aria-label={`Detalii ${load.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
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
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full tahoe-btn-secondary text-white/85 hover:text-white font-semibold text-[10.5px] cursor-pointer transition"
                            title="Deschide și printează Scrisoarea CMR Internațional"
                          >
                            <FileCheck2 className="w-3 h-3" />
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
                            className="inline-flex items-center justify-center p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white cursor-pointer transition"
                            title="Printează"
                            aria-label={`Printează ${load.id}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td
                        className="px-1.5 tabular-nums font-bold text-emerald-400 whitespace-nowrap text-right text-xs"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        {load.revenueEur}&#160;€
                      </td>
                      <td
                        className="px-1.5 whitespace-nowrap"
                        style={TAHOE_CELL_BORDER_STYLE}
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ListPaginationBar
          total={ordersTotal}
          startIdx={ordersStartIdx}
          endIdx={ordersEndIdx}
          pageSize={ordersPageSize}
          onPageSizeChange={setOrdersPageSize}
          page={ordersSafePage}
          totalPages={ordersPageCount}
          onPageChange={setOrdersPage}
          unfilteredTotal={activeLoads.length}
          unfilteredLabel="total curse"
        />
      </div>

      {/* Bottom Panel from Image 4: "Cursă nouă" (1 Detalii -> 2 Alocare -> 3 Confirmare) */}
      <div
        id="orders-allocation-wizard"
        ref={allocationPanelRef}
        className={`tahoe-glass rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-5 space-y-3 sm:space-y-5 shadow-xl scroll-mt-24 transition-shadow duration-300 ${
          highlightAllocation ? 'ring-2 ring-[#0A84FF] shadow-[#0A84FF]/25' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border-b border-white/10 pb-3 sm:pb-4">
          <div>
            <span className="hidden sm:block text-xs font-bold uppercase tracking-wider text-indigo-400">
              WIZARD PLANIFICARE CURSĂ NOUĂ / GRUPAJ
            </span>
            <h2
              ref={allocationHeadingRef}
              tabIndex={-1}
              className="text-sm sm:text-lg font-bold text-white focus:outline-none"
            >
              <span className="sm:hidden">Alocare comandă pe remorcă</span>
              <span className="hidden sm:inline">
                ← Cursă nouă (Alocare Comandă pe Remorcă, Cap Tractor și Șofer)
              </span>
            </h2>
          </div>

          {/* 3-Step Pills — single 3-col row on mobile, unchanged flex on desktop */}
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2 text-[11px] sm:text-xs">
            {[
              { step: 1, label: '1. Detalii Comandă', mobileLabel: '1. Detalii' },
              { step: 2, label: '2. Alocare Vehicul & Șofer', mobileLabel: '2. Alocare' },
              { step: 3, label: '3. Confirmare & LDM', mobileLabel: '3. Confirmare' },
            ].map((item) => (
              <button
                key={item.step}
                onClick={() => setWizardStep(item.step as 1 | 2 | 3)}
                className={`min-w-0 px-2 sm:px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap truncate transition cursor-pointer ${
                  wizardStep === item.step
                    ? 'bg-[#0A84FF] text-white shadow-md'
                    : 'tahoe-btn-secondary text-white/80'
                }`}
              >
                <span className="sm:hidden">{item.mobileLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {unassignedOrders.length === 0 ? (
          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm text-emerald-300 flex items-center justify-between gap-2 sm:gap-3">
            <span>
              Toate comenzile nealocate au fost planificate.
            </span>
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              + Comandă nouă
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
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
                    <span className="text-slate-400">Rută HGV 40T (Google Maps): </span>
                    <a
                      href={buildGoogleMapsDirectionsUrl(
                        `${wizardOrder.fromCity}, ${formatCountryBadge(wizardOrder.fromCountry)}`,
                        `${wizardOrder.toCity}, ${formatCountryBadge(wizardOrder.toCountry)}`,
                        [],
                        { hgv: resolveHgvVehicleProfile(wizardTrailer.totalLdm).isHgv }
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={resolveHgvVehicleProfile(wizardTrailer.totalLdm).googleMapsWarningRo}
                      className="font-extrabold text-[#0284c7] hover:underline"
                    >
                      {wizardOrder.fromCity} ({formatCountryBadge(wizardOrder.fromCountry)}) → {wizardOrder.toCity} ({formatCountryBadge(wizardOrder.toCountry)}) · Coridor 40T ↗
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
                    Adaugă Cursă sau Comandă
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
                          Ordinea comenzii pe zi
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
                                {formatPlanningOrderPosition(slot)}{' '}
                                {slotPast ? '· zi trecută' : ''}
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
                    <div className="text-white/55 text-[10px]">Timp Camion 40T (CE 561)</div>
                    <div className="font-extrabold text-[#64D2FF]">
                      ~{autoDriveHours}h ({autoHgvMetrics.tachoBreakdownRo})
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

      {/* View Order Details Modal */}
      {viewingOrder && (() => {
        const trObj = trailers.find((t) => t.id === viewingOrder.trailerId) || trailers[0];
        const trPlate = trObj ? trObj.tractorId.split(' (')[0] : '';
        const [fromPart, toPart] = viewingOrder.route.split(' → ');
        return (
          <div
            onClick={() => setViewingOrder(null)}
            className="modal-backdrop-lock fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-[28px] tahoe-glass-elevated border border-white/15 p-5 sm:p-6 space-y-4 my-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs text-indigo-300 tabular-nums">
                      {viewingOrder.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                      {viewingOrder.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/75 text-[11px] font-semibold">
                      {viewingOrder.cmrStatus}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1.5">
                    {viewingOrder.client}
                  </h3>
                  <p className="text-xs text-white/75 mt-0.5">
                    Rută: <strong className="text-white">{viewingOrder.route}</strong> · {viewingOrder.cargoDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  aria-label="Închide detalii comandă"
                  className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center text-white/80 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Capacitate</div>
                  <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                    {viewingOrder.ldm.toFixed(1)} LDM · {viewingOrder.weightTons}t
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Regim Temperatură</div>
                  <div className="text-base font-extrabold text-cyan-300 mt-0.5">
                    {viewingOrder.temp}
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Ansamblu Alocat</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {trPlate ? `${trPlate} + ` : ''}{viewingOrder.trailerId}
                  </div>
                </div>
                <div className="tahoe-card-inner rounded-2xl p-3 border border-white/10">
                  <div className="text-[10.5px] text-white/55">Tarif Agreat</div>
                  <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                    {viewingOrder.revenueEur} €
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    const ord = viewingOrder;
                    setViewingOrder(null);
                    setPrintableDoc({
                      docType: 'CMR',
                      referenceNo: ord.id,
                      clientName: ord.client,
                      fromCity: fromPart || 'Oradea',
                      toCity: toPart || 'Rotterdam',
                      cargoDesc: ord.cargoDesc,
                      ldm: ord.ldm,
                      weightTons: ord.weightTons,
                      tempRegime: ord.temp,
                      tractorPlate: trPlate,
                      trailerPlate: trObj.id,
                      driverName: trObj.driver1.name,
                      revenueEur: ord.revenueEur,
                    });
                  }}
                  className="px-3.5 py-2 rounded-full bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 border border-[#0A84FF]/35 text-[#64D2FF] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Printează CMR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ord = viewingOrder;
                    setViewingOrder(null);
                    setPrintableDoc({
                      docType: 'INVOICE',
                      referenceNo: ord.id.replace('LD-', '44'),
                      clientName: ord.client,
                      fromCity: fromPart || 'Oradea',
                      toCity: toPart || 'Rotterdam',
                      cargoDesc: ord.cargoDesc,
                      ldm: ord.ldm,
                      weightTons: ord.weightTons,
                      tempRegime: ord.temp,
                      tractorPlate: trPlate,
                      trailerPlate: trObj.id,
                      driverName: trObj.driver1.name,
                      revenueEur: ord.revenueEur,
                    });
                  }}
                  className="px-3.5 py-2 rounded-full bg-[#30D158]/15 hover:bg-[#30D158]/25 border border-[#30D158]/35 text-[#30D158] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Printează Factură</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  className="px-4 py-2 rounded-full tahoe-btn-secondary text-white font-bold text-xs cursor-pointer"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Printable CMR & Fiscal Invoice Modal */}
      <CmrAndInvoiceModal
        docData={printableDoc}
        onClose={() => setPrintableDoc(null)}
      />

      {showBulkEditOrders && (
        <div
          onClick={() => setShowBulkEditOrders(false)}
          className="modal-backdrop-lock fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-orders-title"
            onSubmit={handleApplyBulkEditOrders}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[26px] tahoe-glass border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="bulk-edit-orders-title" className="text-base font-extrabold text-white">
                  Editare în masă — Comenzi &amp; curse ({ordersSelection.selectedCount} selectate)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Modificările se aplică imediat tuturor curselor bifate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkEditOrders(false)}
                aria-label="Închide"
                className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Status Cursă
                </label>
                <select
                  aria-label="Status cursă în masă"
                  value={bulkOrderStatus}
                  onChange={(e) =>
                    setBulkOrderStatus(
                      e.target.value as 'KEEP' | ActiveLoadItem['status']
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  <option value="Planificată">Planificată</option>
                  <option value="În tranzit">În tranzit</option>
                  <option value="Descărcare">Descărcare</option>
                  <option value="Finalizată">Finalizată</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Status CMR
                </label>
                <select
                  aria-label="Status CMR în masă"
                  value={bulkOrderCmrStatus}
                  onChange={(e) =>
                    setBulkOrderCmrStatus(
                      e.target.value as 'KEEP' | ActiveLoadItem['cmrStatus']
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  <option value="În așteptare aviz">În așteptare aviz</option>
                  <option value="CMR Activ">CMR Activ</option>
                  <option value="CMR Semnat Digital">CMR Semnat Digital</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Remorcă alocată
                </label>
                <select
                  aria-label="Remorcă alocată în masă"
                  value={bulkOrderTrailerId}
                  onChange={(e) => setBulkOrderTrailerId(e.target.value)}
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="">Fără modificare</option>
                  {trailers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} ({t.tractorId.split(' (')[0]})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Regim Temperatură
                </label>
                <input
                  type="text"
                  value={bulkOrderTemp}
                  onChange={(e) => setBulkOrderTemp(e.target.value)}
                  placeholder="ex: +4°C (Bi-Temp Z2)"
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkEditOrders(false)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-extrabold cursor-pointer"
              >
                Aplică la {ordersSelection.selectedCount} curse
              </button>
            </div>
          </form>
        </div>
      )}

      <BulkDeleteConfirmModal
        open={showBulkDeleteOrders}
        title="Ștergere în masă — Comenzi & curse"
        count={ordersSelection.selectedCount}
        previewLabels={selectedOrderItems.map((l) => `${l.id} · ${l.client} (${l.route})`)}
        onCancel={() => setShowBulkDeleteOrders(false)}
        onConfirm={handleConfirmBulkDeleteOrders}
      />
    </div>
  );
};

