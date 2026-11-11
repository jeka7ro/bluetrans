import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  Truck,
  Package,
  Search,
  Bell,
  MoreHorizontal,
  X,
  Sun,
  Moon,
  LogOut,
  Navigation,
  ListChecks,
} from 'lucide-react';
import {
  INITIAL_TRAILERS,
  UNASSIGNED_ORDERS,
  SMART_GROUPAGE_MATCHES,
  INITIAL_PROPOSALS,
  FUTURE_AVAILABILITY_SLOTS,
  TRAILER_SWAP_SCENARIOS,
  TrailerUnit,
  CargoOrder,
  SmartGroupageMatch,
  ClientShipmentProposal,
  formatCountryBadge,
} from './data/mockData';
import { ControlCenterView } from './components/ControlCenterView';
import { TodayView } from './components/TodayView';
import { DemoBadge } from './components/DemoBadge';
import { DynamicBrandLogo } from './components/DynamicBrandLogo';
import {
  Planning7DaysView,
  INITIAL_HOURLY_CARDS,
  WEEK_DAYS,
  HOUR_SLOTS,
  buildRoadDistanceWithDetourLabel,
  type HourlyPlanningCard,
  type DirectTripPayload,
} from './components/Planning7DaysView';
import { SmartGroupageView } from './components/SmartGroupageView';
import { TrailerSwapView } from './components/TrailerSwapView';
import { ClientOffersView } from './components/ClientOffersView';
import { TmsOperationsView } from './components/TmsOperationsView';
import {
  OrdersAndTripsView,
  INITIAL_ACTIVE_LOADS,
  type ActiveLoadItem,
  type DirectOrderAllocation,
} from './components/OrdersAndTripsView';
import { DriverPortalView } from './components/DriverPortalView';
import { LoginView } from './components/LoginView';
import { AuditLogModal, type AuditEntry } from './components/AuditLogModal';
import {
  applyAllocation,
  evaluateAllocation,
  findSegmentRange,
} from './data/ldmEngine';
import { I18nProvider, LanguageToggleBar } from './i18n/i18n';
import { RomaniaLiveClock } from './components/RomaniaLiveClock';
import {
  findFirstFuturePlanningSlot,
  getDefaultPlanningWeekOffset,
  getPlanningWeekMeta,
  getRomaniaZonedNow,
  isPlanningSlotInPast,
} from './utils/romaniaTime';

export type UserRoleType = 'ADMIN' | 'DISPECER' | 'FINANCIAR' | 'SOFER';

const THEME_STORAGE_KEY = 'bluetrans_tms_theme';
const SESSION_STORAGE_KEY = 'bluetrans_tms_auth_v1';
const TRAILERS_STORAGE_KEY = 'bluetrans_trailers_state_v1';
const UNASSIGNED_STORAGE_KEY = 'bluetrans_unassigned_orders_v1';
const PROPOSALS_STORAGE_KEY = 'bluetrans_proposals_v1';
const PLANNING_CARDS_STORAGE_KEY = 'bluetrans_planning_cards_v1';
const ACTIVE_LOADS_STORAGE_KEY = 'bluetrans_active_loads_v1';

function usePersistentState<T>(
  storageKey: string,
  initialValue: T,
  isValid: (val: unknown) => val is T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initialValue;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setPersistentState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (updater) => {
      setState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: T) => T)(prev)
            : updater;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    },
    [storageKey]
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [storageKey, state]);

  return [state, setPersistentState];
}

interface PersistedSession {
  isAuthenticated: boolean;
  activeTab: string;
  userRole: UserRoleType;
  loggedUserName: string;
  loggedUserEmail: string;
  driverTrailerId: string;
}

function loadInitialSession(): PersistedSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        const safeTab =
          !parsed.activeTab
            ? 'today'
            : parsed.activeTab === 'analysis'
              ? 'fleet'
            : parsed.activeTab === 'live-tracking'
              ? 'control'
              : parsed.activeTab;
        return {
          isAuthenticated: parsed.isAuthenticated,
          activeTab: safeTab,
          userRole: parsed.userRole || 'ADMIN',
          loggedUserName:
            parsed.loggedUserName || 'Alexandru Ionescu (Administrator General)',
          loggedUserEmail:
            parsed.loggedUserEmail || 'admin@bluetrans.ro',
          driverTrailerId: parsed.driverTrailerId || 'BH 67 STS',
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    isAuthenticated: false,
    activeTab: 'today',
    userRole: 'ADMIN',
    loggedUserName: 'Alexandru Ionescu (Administrator General)',
    loggedUserEmail: 'admin@bluetrans.ro',
    driverTrailerId: 'BH 67 STS',
  };
}

export function App() {
  const initialSession = loadInitialSession();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    initialSession.isAuthenticated
  );
  const [activeTab, setActiveTab] = useState<string>(initialSession.activeTab);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });
  const [userRole, setUserRole] = useState<UserRoleType>(
    initialSession.userRole
  );
  const [loggedUserName, setLoggedUserName] = useState<string>(
    initialSession.loggedUserName
  );
  const [loggedUserEmail, setLoggedUserEmail] = useState<string>(
    initialSession.loggedUserEmail
  );
  const [driverTrailerId, setDriverTrailerId] = useState<string>(
    initialSession.driverTrailerId
  );

  // Istoric modificări (cine / ce / când) — salvat în localStorage
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => {
    try {
      const raw = localStorage.getItem('bluetrans_audit_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [showAuditLog, setShowAuditLog] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('bluetrans_audit_v1', JSON.stringify(auditLog));
    } catch {
      // ignore
    }
  }, [auditLog]);

  const logAudit = (action: string) => {
    setAuditLog((prev) =>
      [
        {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          at: new Date().toISOString(),
          who: loggedUserName,
          action,
        },
        ...prev,
      ].slice(0, 200)
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      document.documentElement.setAttribute('data-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      const payload: PersistedSession = {
        isAuthenticated,
        activeTab,
        userRole,
        loggedUserName,
        loggedUserEmail,
        driverTrailerId,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [
    isAuthenticated,
    activeTab,
    userRole,
    loggedUserName,
    loggedUserEmail,
    driverTrailerId,
  ]);

  const [trailers, setTrailers] = usePersistentState<TrailerUnit[]>(
    TRAILERS_STORAGE_KEY,
    INITIAL_TRAILERS,
    (v): v is TrailerUnit[] =>
      Array.isArray(v) &&
      v.length >= INITIAL_TRAILERS.length &&
      v.every(
        (t) =>
          Boolean(t) &&
          typeof (t as TrailerUnit).id === 'string' &&
          Array.isArray((t as TrailerUnit).segments)
      )
  );
  const [unassignedOrders, setUnassignedOrders] = usePersistentState<
    CargoOrder[]
  >(
    UNASSIGNED_STORAGE_KEY,
    UNASSIGNED_ORDERS,
    (v): v is CargoOrder[] =>
      Array.isArray(v) &&
      v.every(
        (o) =>
          Boolean(o) &&
          typeof (o as CargoOrder).id === 'string' &&
          typeof (o as CargoOrder).client === 'string'
      )
  );
  const [proposals, setProposals] = usePersistentState<
    ClientShipmentProposal[]
  >(
    PROPOSALS_STORAGE_KEY,
    INITIAL_PROPOSALS,
    (v): v is ClientShipmentProposal[] =>
      Array.isArray(v) &&
      v.length > 0 &&
      v.every(
        (p) =>
          Boolean(p) &&
          typeof (p as ClientShipmentProposal).id === 'string'
      )
  );
  const [planningCards, setPlanningCards] = usePersistentState<
    HourlyPlanningCard[]
  >(
    PLANNING_CARDS_STORAGE_KEY,
    INITIAL_HOURLY_CARDS,
    (v): v is HourlyPlanningCard[] =>
      Array.isArray(v) &&
      v.every(
        (c) =>
          Boolean(c) &&
          typeof (c as HourlyPlanningCard).id === 'string' &&
          typeof (c as HourlyPlanningCard).dayIndex === 'number' &&
          typeof (c as HourlyPlanningCard).hourSlot === 'string' &&
          typeof (c as HourlyPlanningCard).clientName === 'string'
      )
  );
  const [activeLoads, setActiveLoads] = usePersistentState<ActiveLoadItem[]>(
    ACTIVE_LOADS_STORAGE_KEY,
    INITIAL_ACTIVE_LOADS,
    (v): v is ActiveLoadItem[] =>
      Array.isArray(v) &&
      v.every(
        (item) =>
          Boolean(item) &&
          typeof (item as ActiveLoadItem).id === 'string' &&
          typeof (item as ActiveLoadItem).client === 'string'
      )
  );
  const [selectedTrailerId, setSelectedTrailerId] =
    useState<string>('BH 67 STS');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState<boolean>(false);

  const handleLoginSuccess = (
    role: UserRoleType,
    userName: string,
    userEmail: string,
    assignedTrailer?: string
  ) => {
    setUserRole(role);
    setLoggedUserName(userName);
    setLoggedUserEmail(userEmail);
    if (assignedTrailer) {
      setDriverTrailerId(assignedTrailer);
    }
    if (role === 'SOFER') {
      setActiveTab('driver');
    } else if (role === 'FINANCIAR') {
      setActiveTab('fleet');
    } else {
      setActiveTab('today');
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleNavigate = (tab: string, trailerId?: string) => {
    setActiveTab(tab);
    setMobileMoreOpen(false);
    if (trailerId) {
      setSelectedTrailerId(trailerId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateDirectTrip = (payload: DirectTripPayload) => {
    const { card, fromCity, toCity, pallets, revenueEur } = payload;
    logAudit(
      `Cursă creată în Calendar (${WEEK_DAYS[card.dayIndex]?.short ?? 'LUN'} ${card.hourSlot}): ${card.clientName}, ${fromCity} → ${toCity}, ${card.ldm} LDM pe ${card.trailerId} (${revenueEur} €)`
    );

    const loadId = card.linkedLoadId || `LD-${Date.now().toString().slice(-5)}`;
    setActiveLoads((prev) => {
      if (prev.some((l) => l.id === loadId)) return prev;
      return [
        {
          id: loadId,
          client: card.clientName,
          route: `${fromCity} → ${toCity}`,
          cargoDesc: `${pallets} pal · Grupaj Frigo`,
          ldm: card.ldm,
          weightTons: card.weightTons,
          temp: `${card.tempCelsius > 0 ? `+${card.tempCelsius}` : card.tempCelsius}°C`,
          trailerId: card.trailerId,
          status: 'Planificată',
          cmrStatus: 'CMR Activ',
          revenueEur,
        },
        ...prev,
      ];
    });

    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id !== card.trailerId) return t;
        const newOccupied = Math.min(
          t.totalLdm,
          +(t.occupiedLdm + card.ldm).toFixed(1)
        );
        const newFree = Math.max(0, +(t.totalLdm - newOccupied).toFixed(1));
        return {
          ...t,
          occupiedLdm: newOccupied,
          freeLdm: newFree,
          currentWeightTons: +(t.currentWeightTons + card.weightTons).toFixed(1),
        };
      })
    );
  };

  const handleDeletePlanningCard = (cardId: string, linkedLoadId?: string) => {
    const existing = planningCards.find((c) => c.id === cardId);
    if (existing) {
      logAudit(
        `Cursă ștearsă din Calendar: ${existing.clientName} (${existing.routeLabel}, ${existing.ldm} LDM)`
      );
    }
    setPlanningCards((prev) => prev.filter((c) => c.id !== cardId));
    if (linkedLoadId) {
      setActiveLoads((prev) => prev.filter((l) => l.id !== linkedLoadId));
    }
  };

  const handleCreateOrder = (
    newOrder: CargoOrder,
    directAllocation?: DirectOrderAllocation
  ) => {
    if (directAllocation) {
      const { trailerId, tractorPlate, dayIndex, hourSlot, weekOffset = 0 } =
        directAllocation;
      const trKnown = trailers.find((t) => t.id === trailerId);
      const roNow = getRomaniaZonedNow();
      const requestedWeek = getPlanningWeekMeta(weekOffset, roNow);
      const rawDay = Math.min(6, Math.max(0, dayIndex));
      const requestedDayMeta = requestedWeek.days[rawDay];
      const resolvedSlot =
        requestedDayMeta &&
        !isPlanningSlotInPast(requestedDayMeta.isoDate, hourSlot, roNow)
          ? {
              weekOffset,
              dayIndex: rawDay,
              hourSlot,
              isoDate: requestedDayMeta.isoDate,
            }
          : findFirstFuturePlanningSlot({
              weekOffset,
              preferredDayIndex: rawDay,
              preferredHourSlot: hourSlot,
              zdtNow: roNow,
            });
      const resolvedDayMeta =
        getPlanningWeekMeta(resolvedSlot.weekOffset, roNow).days[
          resolvedSlot.dayIndex
        ] || WEEK_DAYS[resolvedSlot.dayIndex];
      logAudit(
        `Cursă nouă ${newOrder.id} alocată direct (${resolvedDayMeta.short} ${resolvedDayMeta.date} ${resolvedSlot.hourSlot}): ${newOrder.client}, ${newOrder.fromCity} → ${newOrder.toCity}, ${newOrder.ldm} LDM pe ${trailerId}`
      );

      setActiveLoads((prev) => [
        {
          id: newOrder.id,
          client: newOrder.client,
          route: `${newOrder.fromCity} (${formatCountryBadge(newOrder.fromCountry)}) → ${newOrder.toCity} (${formatCountryBadge(newOrder.toCountry)})`,
          cargoDesc: `${newOrder.pallets} pal · Grupaj Frigo`,
          ldm: newOrder.ldm,
          weightTons: newOrder.weightTons,
          temp: `${newOrder.tempReq > 0 ? `+${newOrder.tempReq}` : newOrder.tempReq}°C`,
          trailerId,
          status: 'Planificată',
          cmrStatus: 'CMR Activ',
          revenueEur: newOrder.revenueEur,
        },
        ...prev,
      ]);

      setPlanningCards((prev) => {
        const card: HourlyPlanningCard = {
          id: `card-ord-${newOrder.id}`,
          weekOffset: resolvedSlot.weekOffset,
          isoDate: resolvedSlot.isoDate,
          dayIndex: resolvedSlot.dayIndex,
          hourSlot: resolvedSlot.hourSlot,
          clientName: newOrder.client,
          ldm: newOrder.ldm,
          weightTons: newOrder.weightTons,
          cargoSpec: `Grupaj: ${newOrder.pallets} pal · ${newOrder.tempZone}`,
          routeLabel: `${newOrder.fromCity.split(',')[0].trim()} → ${newOrder.toCity.split(',')[0].trim()}`,
          kmDist: buildRoadDistanceWithDetourLabel(
            newOrder.fromCity,
            newOrder.toCity,
            0
          ),
          tempCelsius: newOrder.tempReq,
          trailerId,
          driverName: trKnown ? trKnown.driver1.name : '—',
          tractorPlate:
            tractorPlate ||
            (trKnown ? trKnown.tractorId.split(' (')[0] : undefined),
          colorTheme: 'blue',
          revenueEur: newOrder.revenueEur,
          linkedLoadId: newOrder.id,
        };
        return [...prev, card];
      });

      setTrailers((prev) =>
        prev.map((t) => {
          if (t.id !== trailerId) return t;
          const evaluation = evaluateAllocation(t, newOrder);
          const applied = applyAllocation(t, newOrder, evaluation);
          if (applied) return applied;
          const newOccupied = Math.min(
            t.totalLdm,
            +(t.occupiedLdm + newOrder.ldm).toFixed(1)
          );
          const newFree = Math.max(0, +(t.totalLdm - newOccupied).toFixed(1));
          return {
            ...t,
            occupiedLdm: newOccupied,
            freeLdm: newFree,
            currentWeightTons: +(
              t.currentWeightTons + newOrder.weightTons
            ).toFixed(1),
          };
        })
      );
      return;
    }

    logAudit(`Comandă nouă ${newOrder.id}: ${newOrder.client}, ${newOrder.fromCity} → ${newOrder.toCity}, ${newOrder.ldm} LDM`);
    setUnassignedOrders((prev) => [newOrder, ...prev]);
  };

  // Handler for Drag & Drop / Quick Assign in Planning 7 Days, Dashboard & Trip Wizard
  const handleAssignOrderToTrailer = (
    orderId: string,
    trailerId: string,
    targetDayIndex?: number,
    targetHourSlot?: string,
    targetWeekOffset?: number
  ) => {
    const order = unassignedOrders.find((o) => o.id === orderId);
    if (!order) return;
    logAudit(`Comanda ${order.id} (${order.fromCity} → ${order.toCity}, ${order.ldm} LDM) alocată pe ${trailerId}`);

    // Alocare pe segmentele corecte ale traseului comenzii (motor LDM)
    const targetTrailer = trailers.find((t) => t.id === trailerId);
    const evaluation = targetTrailer ? evaluateAllocation(targetTrailer, order) : null;
    const applied =
      targetTrailer && evaluation ? applyAllocation(targetTrailer, order, evaluation) : null;

    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id !== trailerId) return t;
        if (applied) return applied;
        const newOccupied = Math.min(
          t.totalLdm,
          +(t.occupiedLdm + order.ldm).toFixed(1)
        );
        const newFree = Math.max(0, +(t.totalLdm - newOccupied).toFixed(1));
        return {
          ...t,
          occupiedLdm: newOccupied,
          freeLdm: newFree,
          currentWeightTons: +(t.currentWeightTons + order.weightTons).toFixed(1),
          segments: t.segments.map((seg, idx) =>
            idx >= t.segments.length - 2
              ? {
                ...seg,
                occupiedLdm: Math.min(
                  seg.totalLdm,
                  +(seg.occupiedLdm + order.ldm).toFixed(1)
                ),
                zone2OccupiedLdm: +(seg.zone2OccupiedLdm + order.ldm).toFixed(
                  1
                ),
                payloadTons: +(seg.payloadTons + order.weightTons).toFixed(1),
                loadingOrders: [
                  ...seg.loadingOrders,
                  `${order.id} (${order.client}: ${order.fromCity} -> ${order.toCity}, ${order.ldm} LDM @ +${order.tempReq}°C)`,
                ],
              }
              : seg
          ),
        };
      })
    );

    setActiveLoads((prev) => {
      if (prev.some((l) => l.id === order.id)) return prev;
      return [
        {
          id: order.id,
          client: order.client,
          route: `${order.fromCity} (${formatCountryBadge(order.fromCountry)}) → ${order.toCity} (${formatCountryBadge(order.toCountry)})`,
          cargoDesc: `${order.pallets} pal · Grupaj Frigo`,
          ldm: order.ldm,
          weightTons: order.weightTons,
          temp: `${order.tempReq > 0 ? `+${order.tempReq}` : order.tempReq}°C`,
          trailerId,
          status: 'Planificată',
          cmrStatus: 'CMR Activ',
          revenueEur: order.revenueEur,
        },
        ...prev,
      ];
    });

    const parsedDayFromWin = WEEK_DAYS.findIndex((d) =>
      order.loadingWindow.toLowerCase().startsWith(d.label.toLowerCase())
    );
    const effectiveDay =
      typeof targetDayIndex === 'number'
        ? Math.min(6, Math.max(0, targetDayIndex))
        : parsedDayFromWin >= 0
          ? parsedDayFromWin
          : 0;
    const hourMatch = order.loadingWindow.match(/(\d{2}):/);
    const preferredHour =
      targetHourSlot ||
      (hourMatch && HOUR_SLOTS.find((h) => h.startsWith(hourMatch[1]))) ||
      '08:00';

    setPlanningCards((prev) => {
      if (
        prev.some(
          (c) => c.id === `card-ord-${order.id}` || c.linkedLoadId === order.id
        )
      ) {
        return prev;
      }
      const roNow = getRomaniaZonedNow();
      const weekIdx = targetWeekOffset ?? 0;
      const reqDayMeta = getPlanningWeekMeta(weekIdx, roNow).days[effectiveDay];
      const safeSlot =
        typeof targetDayIndex === 'number' &&
        targetHourSlot &&
        reqDayMeta &&
        !isPlanningSlotInPast(reqDayMeta.isoDate, targetHourSlot, roNow)
          ? {
              weekOffset: weekIdx,
              dayIndex: effectiveDay,
              hourSlot: targetHourSlot,
              isoDate: reqDayMeta.isoDate,
            }
          : findFirstFuturePlanningSlot({
              weekOffset: weekIdx,
              preferredDayIndex: effectiveDay,
              preferredHourSlot: preferredHour,
              isSlotOccupied: (w, d, h) =>
                prev.some(
                  (c) =>
                    (c.weekOffset ?? 0) === w &&
                    c.dayIndex === d &&
                    c.hourSlot === h
                ),
              zdtNow: roNow,
            });
      const newCard: HourlyPlanningCard = {
        id: `card-ord-${order.id}`,
        weekOffset: safeSlot.weekOffset,
        isoDate: safeSlot.isoDate,
        dayIndex: safeSlot.dayIndex,
        hourSlot: safeSlot.hourSlot,
        clientName: order.client,
        ldm: order.ldm,
        weightTons: order.weightTons,
        cargoSpec: `Grupaj: ${order.pallets} pal · ${order.tempZone}`,
        routeLabel: `${order.fromCity.split(',')[0].trim()} → ${order.toCity.split(',')[0].trim()}`,
        kmDist: buildRoadDistanceWithDetourLabel(order.fromCity, order.toCity, 0),
        tempCelsius: order.tempReq,
        trailerId,
        driverName: targetTrailer ? targetTrailer.driver1.name : '—',
        tractorPlate: targetTrailer
          ? targetTrailer.tractorId.split(' (')[0]
          : undefined,
        colorTheme: 'green',
        revenueEur: order.revenueEur,
        linkedLoadId: order.id,
      };
      return [...prev, newCard];
    });

    setUnassignedOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleResetSimulation = () => {
    setTrailers(INITIAL_TRAILERS);
    setUnassignedOrders(UNASSIGNED_ORDERS);
    setProposals(INITIAL_PROPOSALS);
    setPlanningCards(INITIAL_HOURLY_CARDS);
    setActiveLoads(INITIAL_ACTIVE_LOADS);
  };

  const handleUpdateBulkhead = (trailerId: string, newZone1MaxLdm: number) => {
    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id !== trailerId) return t;
        const z1 = Math.max(2.4, Math.min(11.2, +newZone1MaxLdm.toFixed(1)));
        const z2 = +(13.6 - z1).toFixed(1);
        return {
          ...t,
          segments: t.segments.map((seg) => ({
            ...seg,
            zone1MaxLdm: z1,
            zone2MaxLdm: z2,
          })),
        };
      })
    );
  };

  // Handler for Drag & Drop / Quick Swap of Trailers between Tractor Units in Planning 7 Days
  const handleSwapTrailersBetweenTractors = (
    trailerIdA: string,
    trailerIdB: string
  ) => {
    if (trailerIdA === trailerIdB) return;
    logAudit(`Schimb de capete tractor/șoferi între ${trailerIdA} și ${trailerIdB}`);
    setTrailers((prev) => {
      const unitA = prev.find((t) => t.id === trailerIdA);
      const unitB = prev.find((t) => t.id === trailerIdB);
      if (!unitA || !unitB) return prev;
      return prev.map((t) => {
        if (t.id === trailerIdA) {
          return {
            ...t,
            tractorId: unitB.tractorId,
            driver1: unitB.driver1,
            driver2: unitB.driver2,
            isDoubleCrew: unitB.isDoubleCrew,
          };
        }
        if (t.id === trailerIdB) {
          return {
            ...t,
            tractorId: unitA.tractorId,
            driver1: unitA.driver1,
            driver2: unitA.driver2,
            isDoubleCrew: unitA.isDoubleCrew,
          };
        }
        return t;
      });
    });
  };

  // Handler for accepting a Client Proposal (Soft-Lock -> Hard Allocation in Planning + Segment LDM Recalculation)
  const handleAcceptProposal = (proposalId: string) => {
    const targetProp = proposals.find((p) => p.id === proposalId);
    if (!targetProp) return;
    logAudit(`Ofertă ACCEPTATĂ de la ${targetProp.clientName}: ${targetProp.ldmRequested} LDM, ${targetProp.offeredPriceEur} €, pe ${targetProp.trailerId}`);

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === proposalId) {
          return { ...p, status: 'Accepted', hasConflictWarning: false };
        }
        // Update remaining available LDM on competing proposals for the same trailer
        if (
          p.trailerId === targetProp.trailerId &&
          p.status === 'Pending review'
        ) {
          const remainingAfterAccept = Math.max(
            0,
            +(p.availableLdmOnSegment - targetProp.ldmRequested).toFixed(1)
          );
          return {
            ...p,
            availableLdmOnSegment: remainingAfterAccept,
            hasConflictWarning: p.ldmRequested > remainingAfterAccept,
            conflictDetails:
              p.ldmRequested > remainingAfterAccept
                ? ` CAPACITATE INSUFICIENTĂ DUPĂ ACCEPTARE: Au mai rămas doar ${remainingAfterAccept} LDM liberi pe ${p.trailerId}, iar această propunere cere ${p.ldmRequested} LDM. Poți trimite contraofertă pentru ${remainingAfterAccept} LDM sau refuza.`
                : undefined,
          };
        }
        return p;
      })
    );

    // Push accepted proposal into Planning & recalculate segment LDM (pe traseul ofertei)
    const proposalTrailer = trailers.find((t) => t.id === targetProp.trailerId);
    const proposalAsOrder: CargoOrder = {
      id: 'OFERTĂ ACCEPTATĂ',
      client: targetProp.clientName,
      fromCity: targetProp.routeFrom,
      fromCountry: '',
      toCity: targetProp.routeTo,
      toCountry: '',
      ldm: targetProp.ldmRequested,
      weightTons: targetProp.weightTons,
      pallets: 0,
      tempReq: targetProp.tempRequired,
      tempZone: 'Zona 2 (Spate)',
      revenueEur: targetProp.offeredPriceEur,
      status: 'Planificat',
      loadingWindow: '',
      deliveryDeadline: '',
      stackable: false,
      palletExchange: false,
    };
    const proposalRange = proposalTrailer
      ? findSegmentRange(proposalTrailer, proposalAsOrder)
      : null;
    const proposalApplied =
      proposalTrailer && proposalRange
        ? applyAllocation(
            proposalTrailer,
            proposalAsOrder,
            evaluateAllocation(proposalTrailer, proposalAsOrder)
          )
        : null;

    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id !== targetProp.trailerId) return t;
        if (proposalApplied && proposalRange) {
          return {
            ...proposalApplied,
            softReservedLdm: 0,
            segments: proposalApplied.segments.map((seg, idx) =>
              idx >= proposalRange[0] && idx <= proposalRange[1]
                ? { ...seg, softReservedLdm: 0 }
                : seg
            ),
          };
        }
        const newOccupied = Math.min(
          t.totalLdm,
          +(t.occupiedLdm + targetProp.ldmRequested).toFixed(1)
        );
        const newFree = Math.max(0, +(t.totalLdm - newOccupied).toFixed(1));
        return {
          ...t,
          occupiedLdm: newOccupied,
          freeLdm: newFree,
          softReservedLdm: 0,
          currentWeightTons: +(
            t.currentWeightTons + targetProp.weightTons
          ).toFixed(1),
          segments: t.segments.map((seg) =>
            seg.fromCity === 'Viena' || seg.fromCity === 'Köln'
              ? {
                ...seg,
                occupiedLdm: Math.min(
                  seg.totalLdm,
                  +(seg.occupiedLdm + targetProp.ldmRequested).toFixed(1)
                ),
                zone2OccupiedLdm: +(
                  seg.zone2OccupiedLdm + targetProp.ldmRequested
                ).toFixed(1),
                softReservedLdm: 0,
                loadingOrders: [
                  ...seg.loadingOrders,
                  `OFERTĂ ACCEPTATĂ (${targetProp.clientName}: ${targetProp.routeFrom} -> ${targetProp.routeTo}, ${targetProp.ldmRequested} LDM, +${targetProp.offeredPriceEur} €)`,
                ],
              }
              : seg
          ),
        };
      })
    );

    const offerLoadId = `OFT-${targetProp.id}`;
    setActiveLoads((prev) => {
      if (prev.some((l) => l.id === offerLoadId)) return prev;
      return [
        {
          id: offerLoadId,
          client: targetProp.clientName,
          route: `${targetProp.routeFrom} → ${targetProp.routeTo}`,
          cargoDesc: `Ofertă acceptată · Grupaj Frigo`,
          ldm: targetProp.ldmRequested,
          weightTons: targetProp.weightTons,
          temp: `${targetProp.tempRequired > 0 ? `+${targetProp.tempRequired}` : targetProp.tempRequired}°C`,
          trailerId: targetProp.trailerId,
          status: 'Planificată',
          cmrStatus: 'CMR Activ',
          revenueEur: targetProp.offeredPriceEur,
        },
        ...prev,
      ];
    });

    setPlanningCards((prev) => {
      if (prev.some((c) => c.id === `offer-${targetProp.id}`)) return prev;
      const win = targetProp.loadingWindow.toLowerCase();
      const dayNum = win.match(/(\d{1,2})\s*(?:nov|noi)/);
      const preferredDayIdx = dayNum
        ? Math.min(6, Math.max(0, Number(dayNum[1]) - 9))
        : 0;
      const hourMatch = targetProp.loadingWindow.match(/(\d{2}):/);
      const prefHour =
        (hourMatch && HOUR_SLOTS.find((h) => h.startsWith(hourMatch[1]))) ||
        '08:00';
      const roNow = getRomaniaZonedNow();
      const safeSlot = findFirstFuturePlanningSlot({
        weekOffset: getDefaultPlanningWeekOffset(roNow),
        preferredDayIndex: preferredDayIdx,
        preferredHourSlot: prefHour,
        isSlotOccupied: (w, d, h) =>
          prev.some(
            (c) =>
              (c.weekOffset ?? 0) === w &&
              c.dayIndex === d &&
              c.hourSlot === h
          ),
        zdtNow: roNow,
      });
      return [
        ...prev,
        {
          id: `offer-${targetProp.id}`,
          weekOffset: safeSlot.weekOffset,
          isoDate: safeSlot.isoDate,
          dayIndex: safeSlot.dayIndex,
          hourSlot: safeSlot.hourSlot,
          clientName: targetProp.clientName,
          ldm: targetProp.ldmRequested,
          weightTons: targetProp.weightTons,
          cargoSpec: `Ofertă acceptată · ${targetProp.offeredPriceEur} €`,
          routeLabel: `${targetProp.routeFrom} → ${targetProp.routeTo}`,
          kmDist: buildRoadDistanceWithDetourLabel(
            targetProp.routeFrom,
            targetProp.routeTo,
            targetProp.detourKm || 0
          ),
          tempCelsius: targetProp.tempRequired,
          trailerId: targetProp.trailerId,
          driverName: proposalTrailer ? proposalTrailer.driver1.name : '—',
          tractorPlate: proposalTrailer
            ? proposalTrailer.tractorId.split(' (')[0]
            : undefined,
          colorTheme: 'purple',
          revenueEur: targetProp.offeredPriceEur,
          linkedLoadId: offerLoadId,
        },
      ];
    });
  };

  const handleCounterOfferProposal = (
    proposalId: string,
    counterEur: number
  ) => {
    const cProp = proposals.find((p) => p.id === proposalId);
    logAudit(`Contraofertă ${counterEur} € trimisă către ${cProp?.clientName ?? proposalId}`);
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? {
            ...p,
            status: 'Counteroffer sent',
            counterOfferEur: counterEur,
            estimatedContributionEur: counterEur - p.incrementalCostEur,
          }
          : p
      )
    );
  };

  const handleDeclineProposal = (proposalId: string) => {
    const dProp = proposals.find((p) => p.id === proposalId);
    logAudit(`Ofertă REFUZATĂ de la ${dProp?.clientName ?? proposalId}`);
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? { ...p, status: 'Declined', hasConflictWarning: false }
          : p
      )
    );
  };

  const handleCreateNewProposal = (
    newProp: Omit<ClientShipmentProposal, 'id'>
  ) => {
    const id = `prop-${Date.now()}`;
    logAudit(`Ofertă nouă primită de la ${newProp.clientName}: ${newProp.ldmRequested} LDM, ${newProp.offeredPriceEur} €`);
    setProposals((prev) => [{ ...newProp, id }, ...prev]);
  };

  const handleAcceptGroupageMatch = (match: SmartGroupageMatch) => {
    logAudit(`Grupaj acceptat pe ${match.targetTrailerId}: ${match.ldmRequired} LDM`);
    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id !== match.targetTrailerId) return t;
        const newOccupied = Math.min(
          t.totalLdm,
          +(t.occupiedLdm + match.ldmRequired).toFixed(1)
        );
        const newFree = Math.max(0, +(t.totalLdm - newOccupied).toFixed(1));
        return {
          ...t,
          occupiedLdm: newOccupied,
          freeLdm: newFree,
          currentWeightTons: +(t.currentWeightTons + match.weightTons).toFixed(
            1
          ),
        };
      })
    );
  };

  const filteredTrailers = globalSearch.trim()
    ? trailers.filter(
      (t) =>
        t.id.toLowerCase().includes(globalSearch.toLowerCase()) ||
        t.tractorId.toLowerCase().includes(globalSearch.toLowerCase()) ||
        t.driver1.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        t.routeSummary.some((city) =>
          city.toLowerCase().includes(globalSearch.toLowerCase())
        )
    )
    : trailers;

  const pendingProposalsCount = proposals.filter(
    (p) => p.status === 'Pending review'
  ).length;

  const allNavItems: {
    id: string;
    label: string;
    shortLabel: string;
    sub: string;
    icon: React.ElementType;
    badge?: string;
    highlight?: boolean;
    roles: UserRoleType[];
  }[] = [
    {
      id: 'today',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      sub: 'De făcut azi',
      icon: ListChecks,
      badge:
        unassignedOrders.length + pendingProposalsCount > 0
          ? `${unassignedOrders.length + pendingProposalsCount}`
          : undefined,
      roles: ['ADMIN', 'DISPECER'] as UserRoleType[],
    },
    {
      id: 'planning',
      label: 'Planificare',
      shortLabel: 'Plan',
      sub: 'Calendar · Grupaje · Oferte',
      icon: CalendarRange,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'orders',
      label: 'Comenzi & curse',
      shortLabel: 'Comenzi',
      sub: 'Comenzi · CMR · Șofer',
      icon: Package,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'fleet',
      label: 'Flotă',
      shortLabel: 'Flotă',
      sub: 'Camioane · Clienți · Facturi',
      icon: Truck,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'control',
      label: 'Control Center',
      shortLabel: 'Hartă',
      sub: 'Hartă live · LDM',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'driver',
      label: 'Portal Șofer (Cabină)',
      shortLabel: 'Șofer',
      sub: 'Rută · Tehnic · Admin Cursă',
      icon: Navigation,
      badge: driverTrailerId.split(' ')[1] || 'CAB',
      roles: ['SOFER'] as UserRoleType[],
    },
  ];

  // Cele 5 pagini din meniu; paginile vechi (Grupaje, Swap, Oferte, Clienți) sunt file în interiorul lor
  const navGroupOf = (tab: string): string => {
    if (tab === 'groupage' || tab === 'swap' || tab === 'offers') return 'planning';
    if (tab === 'clients' || tab === 'analysis') return 'fleet';
    if (tab === 'driver') return userRole === 'SOFER' ? 'driver' : 'orders';
    return tab;
  };
  const navTarget = (id: string): string =>
    id === 'planning' && userRole === 'FINANCIAR' ? 'offers' : id;

  const TAB_BARS: Record<string, { id: string; label: string; roles: UserRoleType[] }[]> = {
    planning: [
      { id: 'planning', label: 'Calendar 7 zile', roles: ['ADMIN', 'DISPECER'] },
      { id: 'groupage', label: 'Grupaje & disponibilități', roles: ['ADMIN', 'DISPECER'] },
      { id: 'swap', label: 'Schimburi de remorci', roles: ['ADMIN', 'DISPECER'] },
      { id: 'offers', label: 'Oferte clienți', roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] },
    ],
    orders: [
      { id: 'orders', label: 'Comenzi & curse', roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] },
      { id: 'driver', label: 'Vedere șofer (cabină)', roles: ['ADMIN', 'DISPECER'] },
    ],
  };
  const DEMO_PAGES: Record<string, string> = {
    planning: 'comenzi, curse și remorci din calendar',
    groupage: 'grupaje și disponibilități',
    swap: 'scenarii de schimb',
    offers: 'oferte de la clienți',
    orders: 'comenzi și curse',
    driver: 'ruta și șoferul',
    control: 'KPI și poziții GPS',
  };
  const tabBar = (TAB_BARS[navGroupOf(activeTab)] || []).filter((tb) =>
    tb.roles.includes(userRole)
  );

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));
  const activeDriverUnit =
    trailers.find((t) => t.id === driverTrailerId) || trailers[0];

  const roleMeta: Record<
    UserRoleType,
    { title: string; userName: string; badgeColor: string; desc: string }
  > = {
    ADMIN: {
      title: 'Administrator General',
      userName: 'Alexandru Ionescu (Director Operațiuni)',
      badgeColor: 'bg-[#0A84FF]/20 text-[#64D2FF] border-[#0A84FF]/40',
      desc: 'Acces complet: toate modulele TMS, finanțe, arhitectură și supervizare șoferi',
    },
    DISPECER: {
      title: 'Admin Cursă / Dispecer',
      userName: 'Elena Munteanu (Admin Cursă Vest)',
      badgeColor: 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/40',
      desc: 'Coordonează cursele, Planning 7 Zile, Grupaje, Swap și transmite instrucțiuni șoferilor',
    },
    FINANCIAR: {
      title: 'Financiar & Facturare',
      userName: 'Anca Marinescu (Facturare & CMR)',
      badgeColor: 'bg-[#FF9F0A]/20 text-[#FF9F0A] border-[#FF9F0A]/40',
      desc: 'Acces dedicat: Oferte Clienți, Validare CMR, Facturare și Profitabilitate Flotă',
    },
    SOFER: {
      title: `Șofer Camion (${activeDriverUnit.id})`,
      userName: `${activeDriverUnit.driver1.name} (${activeDriverUnit.tractorId})`,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      desc: 'Vede EXCLUSIV ruta atribuită lui, fișa tehnică a camionului și Adminul acelei curse',
    },
  };

  const primaryMobileTabs = navItems.slice(0, 5);
  const secondaryMobileTabs = navItems.slice(5);
  const currentTabObj =
    navItems.find((n) => n.id === navGroupOf(activeTab)) || navItems[0];

  if (!isAuthenticated) {
    return (
      <I18nProvider>
        <LoginView
          trailers={trailers}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onLoginSuccess={handleLoginSuccess}
        />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <div
        data-theme={theme}
        className="min-h-screen tahoe-wallpaper text-[#f5f5f7] flex flex-col lg:flex-row transition-colors duration-200"
      >
      {/* =====================================================================
          DESKTOP SIDEBAR — Docked Full-Height Sidebar
      ====================================================================== */}
      <aside className="hidden lg:flex lg:w-64 bg-[#080d1a]/95 backdrop-blur-2xl border-r border-white/10 shrink-0 flex-col sticky top-0 h-screen overflow-hidden">
        {/* Brand Header: Dynamic Blue Trans Spedition Logo + SFERLE TMS PRO */}
        <div className="pt-3.5 pb-3 px-4 mx-3 border-b border-white/10 flex flex-col items-center shrink-0">
          <DynamicBrandLogo
            height={76}
            onClick={() =>
              handleNavigate(
                userRole === 'SOFER'
                  ? 'driver'
                  : userRole === 'FINANCIAR'
                    ? 'fleet'
                    : 'today'
              )
            }
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
            <span className="sferle-brand-title text-[12.5px] font-extrabold tracking-tight leading-none">
              SFERLE TMS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/35 leading-none">
              PRO
            </span>
          </div>
        </div>

        {/* Navigation Items — macOS Tahoe Pill Selection */}
        <nav className="p-3 space-y-1 flex-1 min-h-0 overflow-y-auto">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Meniu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = navGroupOf(activeTab) === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(navTarget(item.id))}
                  className={`w-full text-left px-4 py-2.5 rounded-full transition-all duration-200 flex items-center justify-between group cursor-pointer ${isActive
                      ? 'tahoe-btn-primary text-white font-semibold'
                      : 'hover:bg-white/8 text-white/80 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive
                          ? 'text-white'
                          : item.highlight
                            ? 'text-[#FF9F0A]'
                            : 'text-[#64D2FF]'
                        }`}
                    />
                    <div className="truncate">
                      <div className="text-[13px] font-semibold leading-tight truncate">
                        {item.label}
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-white/45'
                          }`}
                      >
                        {item.sub}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${isActive
                          ? 'bg-white/25 text-white'
                          : item.highlight
                            ? 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/30'
                            : 'bg-white/10 text-white/75'
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Bottom macOS Tahoe User Profile Card (Clean — No Duplicate Action Buttons) */}
        <div className="p-3 m-3 rounded-[20px] tahoe-card-inner space-y-1.5 text-xs shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64D2FF]">
              {roleMeta[userRole].title}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#30D158]" />
          </div>
          <div>
            <div className="font-bold text-white truncate">
              {loggedUserName}
            </div>
            <div className="text-[11px] text-white/55 truncate mt-0.5">
              {loggedUserEmail}
            </div>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT AREA (Mobile + Desktop)
      ====================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Edge-to-Edge Header Bar — Romania Live Clock & Date FIRST */}
        <header className="w-full h-[64px] px-4 sm:px-6 bg-[#080d1a]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Left Group: #1 Live Romania Time & Date + Mobile Brand + Desktop Spotlight Search */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* #1 FIRST IN HEADER: Live Romania Clock & Date (Europe/Bucharest) */}
            <RomaniaLiveClock />

            {/* Mobile Brand Only (Hidden on Desktop to avoid duplicating sidebar brand) */}
            <div className="hidden sm:flex lg:hidden items-center gap-2 min-w-0">
              <DynamicBrandLogo
                height={38}
                className="shrink-0"
                onClick={() =>
                  handleNavigate(userRole === 'SOFER' ? 'driver' : 'today')
                }
              />
              <span className="text-xs font-bold text-white tracking-tight truncate">
                {currentTabObj.label}
              </span>
            </div>

            {/* Desktop Spotlight Search Input */}
            <search className="hidden md:flex items-center flex-1 max-w-md min-w-0">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-white/45 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  name="globalSearch"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label="Caută remorcă, șofer sau oraș"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Caută remorcă (BH 67 STS), șofer, oraș (Viena, Rotterdam)..."
                  className="w-full bg-white/8 hover:bg-white/12 focus:bg-white/14 border border-white/15 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-white/45 focus:outline-none focus:border-[#007AFF] transition"
                />
                {globalSearch && (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch('')}
                    aria-label="Șterge căutarea"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white text-xs cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </search>
          </div>

          {/* Right Quick Action Pills: Alerts + New Order + Icon-Only Theme Switcher & Icon-Only Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {userRole !== 'SOFER' && (
              <>
                <button
                  onClick={() => setMobileSearchOpen((v) => !v)}
                  className="md:hidden w-9 h-9 rounded-full tahoe-btn-secondary text-white/80 flex items-center justify-center cursor-pointer"
                  aria-label="Caută"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleNavigate('offers')}
                  className="px-3 py-1.5 rounded-full bg-[#FF9F0A]/20 hover:bg-[#FF9F0A]/30 border border-[#FF9F0A]/40 text-[#FF9F0A] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{pendingProposalsCount}</span>
                  <span className="hidden xl:inline">Oferte</span>
                </button>
              </>
            )}

            {/* Top Flag Language Switcher (RO | EN | FR | DE) */}
            <LanguageToggleBar />

            {/* Icon-Only Theme Toggle Button */}
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="w-9 h-9 rounded-full tahoe-btn-secondary flex items-center justify-center transition cursor-pointer"
              title={
                theme === 'dark'
                  ? 'Comută pe Modul Luminos'
                  : 'Comută pe Modul Întunecat'
              }
              aria-label="Schimbă tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#FF9F0A]" />
              ) : (
                <Moon className="w-4 h-4 text-[#0A84FF]" />
              )}
            </button>

            {/* Icon-Only Logout Button */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 flex items-center justify-center transition cursor-pointer"
              title="Deconectare"
              aria-label="Deconectare"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Expandable Mobile Spotlight Search Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pt-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Filtrează remorcă (BH 67 STS), șofer, rută..."
                className="w-full tahoe-glass rounded-full pl-9 pr-9 py-2 text-xs text-white placeholder-white/50 focus:outline-none"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-white/15 flex items-center justify-center text-white/60 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main View Container — Full Width with Safe Area for Floating Dock */}
        <main className="p-3 sm:p-4 lg:px-4 lg:py-4 pb-28 lg:pb-8 flex-1 max-w-full w-full mx-auto">
          {(tabBar.length > 1 || DEMO_PAGES[activeTab]) && (
            <div className="flex flex-nowrap items-center justify-between gap-2 mb-3 overflow-x-auto no-scrollbar">
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar">
                {tabBar.length > 1 &&
                  tabBar.map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={(e) => {
                        handleNavigate(tb.id);
                        e.currentTarget.scrollIntoView({
                          block: 'nearest',
                          inline: 'nearest',
                        });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                        activeTab === tb.id
                          ? 'bg-[#0A84FF] border border-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/25'
                          : 'tahoe-btn-secondary text-white/80 hover:text-white'
                      }`}
                    >
                      <span>{tb.label}</span>
                      {tb.id === 'offers' && pendingProposalsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF9F0A]/25 text-[#FF9F0A]">
                          {pendingProposalsCount}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
              {DEMO_PAGES[activeTab] && <DemoBadge label={DEMO_PAGES[activeTab]} />}
            </div>
          )}

          {activeTab === 'today' && userRole !== 'SOFER' && (
            <TodayView
              trailers={trailers}
              unassignedOrders={unassignedOrders}
              proposals={proposals}
              onNavigate={handleNavigate}
              onAssignOrderToTrailer={handleAssignOrderToTrailer}
              onAcceptProposal={handleAcceptProposal}
              onCounterOfferProposal={handleCounterOfferProposal}
              onDeclineProposal={handleDeclineProposal}
            />
          )}

          {activeTab === 'control' && (
            <ControlCenterView
              trailers={filteredTrailers.length > 0 ? filteredTrailers : trailers}
              matches={SMART_GROUPAGE_MATCHES}
              proposals={proposals}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'planning' && (
            <Planning7DaysView
              trailers={filteredTrailers.length > 0 ? filteredTrailers : trailers}
              unassignedOrders={unassignedOrders}
              proposals={proposals}
              cards={planningCards}
              setCards={setPlanningCards}
              initialSelectedTrailerId={selectedTrailerId}
              onAssignOrderToTrailer={handleAssignOrderToTrailer}
              onCreateDirectTrip={handleCreateDirectTrip}
              onDeletePlanningCard={handleDeletePlanningCard}
              onMoveScheduleBlock={() => { }}
              onUpdateBulkhead={handleUpdateBulkhead}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersAndTripsView
              unassignedOrders={unassignedOrders}
              trailers={trailers}
              activeLoads={activeLoads}
              setActiveLoads={setActiveLoads}
              onCreateOrder={handleCreateOrder}
              onAssignOrderToTrailer={handleAssignOrderToTrailer}
            />
          )}

          {activeTab === 'groupage' && (
            <SmartGroupageView
              trailers={trailers}
              matches={SMART_GROUPAGE_MATCHES}
              futureSlots={FUTURE_AVAILABILITY_SLOTS}
              onAcceptGroupageMatch={handleAcceptGroupageMatch}
              onNavigateToOffers={() => handleNavigate('offers')}
            />
          )}

          {activeTab === 'swap' && <TrailerSwapView />}

          {activeTab === 'offers' && (
            <ClientOffersView
              proposals={proposals}
              trailers={trailers}
              onAcceptProposal={handleAcceptProposal}
              onCounterOfferProposal={handleCounterOfferProposal}
              onDeclineProposal={handleDeclineProposal}
              onCreateNewProposal={handleCreateNewProposal}
            />
          )}

          {(activeTab === 'fleet' || activeTab === 'clients' || activeTab === 'analysis') && (
            <TmsOperationsView
              trailers={trailers}
              subTab={activeTab === 'clients' ? 'clients' : 'fleet'}
            />
          )}

          {(activeTab === 'driver' || userRole === 'SOFER') && (
            <DriverPortalView
              trailers={trailers}
              selectedDriverTrailerId={driverTrailerId}
              onSelectDriverTrailerId={setDriverTrailerId}
              isStrictDriverRole={userRole === 'SOFER'}
              swapScenarios={TRAILER_SWAP_SCENARIOS}
            />
          )}
        </main>

        {showAuditLog && (
          <AuditLogModal entries={auditLog} onClose={() => setShowAuditLog(false)} />
        )}
      </div>

      {/* =====================================================================
          MOBILE FLOATING LIQUID GLASS DOCK (iOS 26 / macOS Tahoe Style)
      ====================================================================== */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-50 rounded-full tahoe-pill-nav px-2.5 py-1.5 flex items-center justify-around">
        {primaryMobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = navGroupOf(activeTab) === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(navTarget(item.id))}
              className={`flex flex-col items-center justify-center py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${isActive
                  ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/40'
                  : 'text-white/65 hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold mt-0.5">
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        {/* More Drawer Trigger for Secondary Tabs */}
        <button
          type="button"
          onClick={() => setMobileMoreOpen((v) => !v)}
          className={`flex flex-col items-center justify-center py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${secondaryMobileTabs.some((t) => t.id === navGroupOf(activeTab)) || mobileMoreOpen
              ? 'bg-white/20 text-white'
              : 'text-white/65 hover:text-white'
            }`}
        >
          {mobileMoreOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <MoreHorizontal className="w-4 h-4" />
          )}
          <span className="text-[10px] font-semibold mt-0.5">Mai mult</span>
        </button>
      </nav>

      {/* Mobile "Mai mult" Liquid Glass Sheet */}
      {mobileMoreOpen && (
        <div
          onClick={() => setMobileMoreOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end justify-center p-3 pb-24"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[26px] tahoe-glass-elevated p-4 space-y-2"
          >
            <div className="text-xs font-semibold text-white/50 px-2 pb-1">
              Module Suplimentare SFERLE TMS PRO
            </div>
            {secondaryMobileTabs.map((item) => {
              const Icon = item.icon;
              const isActive = navGroupOf(activeTab) === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(navTarget(item.id))}
                  className={`w-full px-4 py-3 rounded-full flex items-center justify-between text-left transition cursor-pointer ${isActive
                      ? 'tahoe-btn-primary text-white'
                      : 'tahoe-card-inner text-white/90 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-[#64D2FF]" />
                    <div>
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className="text-xs text-white/55">{item.sub}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </I18nProvider>
  );
}
export default App;
