import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  Truck,
  Package,
  MoreHorizontal,
  X,
  Sun,
  Moon,
  LogOut,
  Navigation,
  ListChecks,
  Users,
  History,
  Building2,
  IdCard,
  Receipt,
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
  TrailerSwapScenario,
  PostSwapAction,
  GroupageCandidateVariant,
  CargoTransferOpportunity,
  formatCountryBadge,
} from './data/mockData';
import { PublicClientOfferView } from './components/PublicClientOfferView';
import {
  resolvePublicOfferRouteFromLocation,
  apiGetTmsState,
  apiBootstrapTmsState,
  apiSaveTmsState,
  apiAcceptProposalAtomic,
  apiDriverAction,
  apiUploadDriverExpense,
  apiUpdateDriverExpenseStatus,
  apiDeleteDriverExpense,
  apiSyncCargoTrack,
  apiScanExchanges,
  subscribeTmsEvents,
  type TenantInfo,
  type IntegrationStatusPayload,
  type PodFileRecord,
  type DriverExpenseRecord,
  type SubmitDriverExpenseInput,
  type OfferLinkRecord,
  type OutboxEntry,
  type TmsWorkspacePayload,
} from './data/tmsSyncClient';
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
import type { FleetBoardExternalFilter } from './components/FleetVinAndDossierModal';
import {
  OrdersAndTripsView,
  INITIAL_ACTIVE_LOADS,
  type ActiveLoadItem,
  type DirectOrderAllocation,
} from './components/OrdersAndTripsView';
import { DriverPortalView } from './components/DriverPortalView';
import { LoginView } from './components/LoginView';
import { UsersAdminView } from './components/UsersAdminView';
import { AuditLogModal, type AuditEntry } from './components/AuditLogModal';
import {
  HeaderNotificationsMenu,
  type HeaderNotificationItem,
} from './components/HeaderNotificationsMenu';
import {
  AuthUserRecord,
  apiListUsers,
  apiLogoutSession,
  apiVerifySession,
  clearStoredAuthSession,
  loadStoredAuthSession,
  resolveDriverPortalRouteFromLocation,
} from './data/authClient';
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

declare const __APP_VERSION__: string;
declare const __APP_BUILD_DATE_RO__: string;
declare const __APP_BUILD_ISO__: string;

const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0';
const APP_BUILD_DATE_RO =
  typeof __APP_BUILD_DATE_RO__ !== 'undefined' ? __APP_BUILD_DATE_RO__ : '—';
const APP_BUILD_ISO =
  typeof __APP_BUILD_ISO__ !== 'undefined' ? __APP_BUILD_ISO__ : '';

export type UserRoleType = 'ADMIN' | 'DISPECER' | 'FINANCIAR' | 'SOFER';

const THEME_STORAGE_KEY = 'bluetrans_tms_theme';
const UI_TAB_STORAGE_KEY = 'bluetrans_tms_ui_tab_v2';
const TRAILERS_STORAGE_KEY = 'bluetrans_trailers_state_v1';
const UNASSIGNED_STORAGE_KEY = 'bluetrans_unassigned_orders_v1';
const PROPOSALS_STORAGE_KEY = 'bluetrans_proposals_v1';
const PLANNING_CARDS_STORAGE_KEY = 'bluetrans_planning_cards_v1';
const ACTIVE_LOADS_STORAGE_KEY = 'bluetrans_active_loads_v1';
const DRIVER_EXPENSES_STORAGE_KEY = 'bluetrans_driver_expenses_v1';

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

interface InitialUiAuthState {
  isAuthenticated: boolean;
  authToken: string;
  loggedUserId: string;
  activeTab: string;
  userRole: UserRoleType;
  loggedUserName: string;
  loggedUserEmail: string;
  driverTrailerId: string;
}

function normalizeTabForRole(rawTab: string | null | undefined, role: UserRoleType): string {
  const cleaned =
    !rawTab
      ? ''
      : rawTab === 'analysis'
        ? 'fleet'
        : rawTab === 'drivers'
          ? 'tacho'
          : rawTab === 'live-tracking'
            ? 'control'
            : rawTab;
  if (role === 'SOFER') return 'driver';
  if (role === 'FINANCIAR') {
    if (
      cleaned === 'offers' ||
      cleaned === 'orders' ||
      cleaned === 'fleet' ||
      cleaned === 'clients' ||
      cleaned === 'tacho' ||
      cleaned === 'invoicing' ||
      cleaned === 'control'
    ) {
      return cleaned;
    }
    return 'fleet';
  }
  if (cleaned === 'users' && role !== 'ADMIN') {
    return 'control';
  }
  return cleaned || 'control';
}

function loadInitialSession(): InitialUiAuthState {
  try {
    // Elimină sesiunea veche neautentificată demo dacă exista în browser
    localStorage.removeItem('bluetrans_tms_auth_v1');
  } catch {
    // ignore
  }

  const storedAuth = loadStoredAuthSession();
  let savedTab = '';
  try {
    savedTab = localStorage.getItem(UI_TAB_STORAGE_KEY) || '';
  } catch {
    // ignore
  }

  if (storedAuth && storedAuth.token && storedAuth.user) {
    const role = (storedAuth.user.role || 'ADMIN') as UserRoleType;
    return {
      isAuthenticated: true,
      authToken: storedAuth.token,
      loggedUserId: storedAuth.user.id || '',
      activeTab: normalizeTabForRole(savedTab, role),
      userRole: role,
      loggedUserName: storedAuth.user.name || 'Administrator',
      loggedUserEmail: storedAuth.user.email || 'admin@bluetrans.ro',
      driverTrailerId: storedAuth.user.driverTrailerId || 'BH 67 STS',
    };
  }

  return {
    isAuthenticated: false,
    authToken: '',
    loggedUserId: '',
    activeTab: 'today',
    userRole: 'ADMIN',
    loggedUserName: '',
    loggedUserEmail: '',
    driverTrailerId: 'BH 67 STS',
  };
}

export function App() {
  const initialSession = loadInitialSession();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    initialSession.isAuthenticated
  );
  const [authToken, setAuthToken] = useState<string>(initialSession.authToken);
  const [loggedUserId, setLoggedUserId] = useState<string>(initialSession.loggedUserId);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);
  const [hasInviteQuery, setHasInviteQuery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(new URLSearchParams(window.location.search).get('invite')?.trim());
  });
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
      localStorage.setItem(UI_TAB_STORAGE_KEY, activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    apiVerifySession(authToken).then((verifiedUser) => {
      if (cancelled) return;
      if (!verifiedUser) {
        clearStoredAuthSession();
        setAuthToken('');
        setIsAuthenticated(false);
        return;
      }
      const nextRole = (verifiedUser.role || 'ADMIN') as UserRoleType;
      setLoggedUserId(verifiedUser.id);
      setUserRole(nextRole);
      setLoggedUserName(verifiedUser.name);
      setLoggedUserEmail(verifiedUser.email);
      if (verifiedUser.driverTrailerId) {
        setDriverTrailerId(verifiedUser.driverTrailerId);
      }
      setActiveTab((prev) => normalizeTabForRole(prev, nextRole));
      if (nextRole === 'ADMIN') {
        apiListUsers(authToken)
          .then((list) => {
            if (cancelled) return;
            setPendingInvitesCount(list.filter((u) => u.status === 'INVITED').length);
          })
          .catch(() => {
            // ignore
          });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

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

  useEffect(() => {
    const seedFlagKey = 'bluetrans_planning_cards_bh67_seed_v2';
    try {
      if (localStorage.getItem(seedFlagKey)) return;
      const seedIds = new Set(['card-16', 'card-17', 'card-18', 'card-19', 'card-20', 'card-21']);
      const extraSeedCards = INITIAL_HOURLY_CARDS.filter((c) => seedIds.has(c.id));
      if (extraSeedCards.length > 0) {
        setPlanningCards((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const toAdd = extraSeedCards.filter((c) => !existingIds.has(c.id));
          const normalized = prev.map((c) =>
            c.trailerId === 'BH 67 STS' && c.driverName === 'Popa Mircea'
              ? { ...c, driverName: 'Popa Ioan' }
              : c
          );
          return toAdd.length > 0 ? [...normalized, ...toAdd] : normalized;
        });
      }
      localStorage.setItem(seedFlagKey, '1');
    } catch {
      // ignore storage errors
    }
  }, [setPlanningCards]);
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState<boolean>(false);
  const [fleetJumpFilter, setFleetJumpFilter] =
    useState<FleetBoardExternalFilter | null>(null);
  const [ordersFocusNonce, setOrdersFocusNonce] = useState<number>(0);

  // Multi-Tenant SaaS + Server Persistence & Live Sync State
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    try {
      return localStorage.getItem('bluetrans_tenant_id_v1') || 'blue-trans';
    } catch {
      return 'blue-trans';
    }
  });
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [activeTenant, setActiveTenant] = useState<TenantInfo | undefined>(undefined);
  const [swapScenarios, setSwapScenarios] = useState<TrailerSwapScenario[]>(
    TRAILER_SWAP_SCENARIOS
  );
  const [podFiles, setPodFiles] = useState<PodFileRecord[]>([]);
  const [driverExpenses, setDriverExpenses] = usePersistentState<DriverExpenseRecord[]>(
    DRIVER_EXPENSES_STORAGE_KEY,
    [],
    (v): v is DriverExpenseRecord[] => Array.isArray(v)
  );
  const [offerLinks, setOfferLinks] = useState<OfferLinkRecord[]>([]);
  const [exchangeMatches, setExchangeMatches] = useState<SmartGroupageMatch[]>([]);
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const [driverMessages, setDriverMessages] = useState<
    Record<string, Array<{ id: string; from: 'driver' | 'admin'; text: string; time: string }>>
  >({});
  const [driverCheckins, setDriverCheckins] = useState<Record<string, boolean>>({});
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatusPayload | undefined>(
    undefined
  );
  const [lastCargoTrackSyncAt, setLastCargoTrackSyncAt] = useState<string | undefined>(undefined);
  const [isSyncingCargoTrack, setIsSyncingCargoTrack] = useState(false);
  const [isScanningExchanges, setIsScanningExchanges] = useState(false);
  const [serverConflictBanner, setServerConflictBanner] = useState<string | null>(null);

  const serverRevRef = useRef<number>(0);
  const suppressSyncRef = useRef<boolean>(false);
  const serverHydratedRef = useRef<boolean>(false);

  const applyWorkspacePayload = useCallback((ws: TmsWorkspacePayload) => {
    suppressSyncRef.current = true;
    serverRevRef.current = ws.rev || 0;
    if (Array.isArray(ws.trailers) && ws.trailers.length > 0) setTrailers(ws.trailers);
    if (Array.isArray(ws.unassignedOrders)) setUnassignedOrders(ws.unassignedOrders);
    if (Array.isArray(ws.planningCards)) setPlanningCards(ws.planningCards);
    if (Array.isArray(ws.activeLoads) && ws.activeLoads.length > 0) {
      setActiveLoads(ws.activeLoads as unknown as ActiveLoadItem[]);
    }
    if (Array.isArray(ws.proposals) && ws.proposals.length > 0) setProposals(ws.proposals);
    if (Array.isArray(ws.swapScenarios) && ws.swapScenarios.length > 0) {
      setSwapScenarios(ws.swapScenarios);
    }
    if (Array.isArray(ws.podFiles)) setPodFiles(ws.podFiles);
    if (Array.isArray(ws.driverExpenses)) setDriverExpenses(ws.driverExpenses);
    if (Array.isArray(ws.offerLinks)) setOfferLinks(ws.offerLinks);
    if (Array.isArray(ws.exchangeMatches)) setExchangeMatches(ws.exchangeMatches);
    if (Array.isArray(ws.outbox)) setOutbox(ws.outbox);
    if (ws.driverMessages) setDriverMessages(ws.driverMessages);
    if (ws.driverCheckins) setDriverCheckins(ws.driverCheckins);
    if (ws.lastCargoTrackSyncAt) setLastCargoTrackSyncAt(ws.lastCargoTrackSyncAt);
    if (ws.integrationStatus) setIntegrationStatus(ws.integrationStatus);
    if (Array.isArray(ws.auditLog) && ws.auditLog.length > 0) {
      setAuditLog(ws.auditLog);
    }
    serverHydratedRef.current = true;
    window.setTimeout(() => {
      suppressSyncRef.current = false;
    }, 60);
  }, [setTrailers, setUnassignedOrders, setPlanningCards, setActiveLoads, setProposals]);

  useEffect(() => {
    if (!authToken) {
      serverHydratedRef.current = false;
      return;
    }
    let cancelled = false;
    serverHydratedRef.current = false;

    const hydrate = async () => {
      try {
        const res = await apiGetTmsState(authToken, activeTenantId);
        if (cancelled || !res.ok) return;
        if (res.tenants) setTenants(res.tenants);
        if (res.tenant) setActiveTenant(res.tenant);
        if (res.workspace?.initialized) {
          applyWorkspacePayload(res.workspace);
        } else {
          const boot = await apiBootstrapTmsState(authToken, activeTenantId, {
            trailers: activeTenantId === 'blue-trans' ? trailers : INITIAL_TRAILERS.slice(0, 4),
            unassignedOrders: activeTenantId === 'blue-trans' ? unassignedOrders : UNASSIGNED_ORDERS.slice(0, 2),
            planningCards: activeTenantId === 'blue-trans' ? planningCards : INITIAL_HOURLY_CARDS.slice(0, 3),
            activeLoads,
            proposals: activeTenantId === 'blue-trans' ? proposals : INITIAL_PROPOSALS.slice(0, 2),
            swapScenarios: TRAILER_SWAP_SCENARIOS,
            auditLog,
          });
          if (!cancelled && boot.ok && boot.workspace) {
            applyWorkspacePayload(boot.workspace);
          }
        }
      } catch {
        // Fallback offline/localStorage transparent
        serverHydratedRef.current = true;
      }
    };

    void hydrate();

    const unsubscribe = subscribeTmsEvents(authToken, activeTenantId, (ev) => {
      if (cancelled) return;
      if (typeof ev.rev === 'number' && ev.rev <= serverRevRef.current) return;
      void apiGetTmsState(authToken, activeTenantId).then((fresh) => {
        if (!cancelled && fresh.ok && fresh.workspace?.initialized) {
          applyWorkspacePayload(fresh.workspace);
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authToken, activeTenantId]);

  useEffect(() => {
    if (!authToken || !serverHydratedRef.current || suppressSyncRef.current) return;
    const timer = window.setTimeout(() => {
      if (suppressSyncRef.current) return;
      void apiSaveTmsState(
        authToken,
        activeTenantId,
        {
          trailers,
          unassignedOrders,
          planningCards,
          activeLoads,
          proposals,
          swapScenarios,
          auditLog,
        },
        serverRevRef.current,
        'sync-ui'
      ).then((res) => {
        if (res.ok && res.workspace) {
          serverRevRef.current = res.workspace.rev;
        } else if (res.conflict && res.workspace) {
          applyWorkspacePayload(res.workspace);
          setServerConflictBanner(
            'Date actualizate de alt dispecer în paralel — planul a fost sincronizat automat cu ultima versiune.'
          );
        }
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [
    authToken,
    activeTenantId,
    trailers,
    unassignedOrders,
    planningCards,
    activeLoads,
    proposals,
    swapScenarios,
    auditLog,
    applyWorkspacePayload,
  ]);

  const handleSwitchTenant = (nextTenantId: string) => {
    if (!nextTenantId || nextTenantId === activeTenantId) return;
    try {
      localStorage.setItem('bluetrans_tenant_id_v1', nextTenantId);
    } catch {
      // ignore
    }
    setActiveTenantId(nextTenantId);
    setServerConflictBanner(`Spațiul companiei a fost comutat la "${nextTenantId}".`);
  };

  const handleAuthenticated = (
    user: AuthUserRecord,
    token: string,
    _remember: boolean
  ) => {
    const role = (user.role || 'ADMIN') as UserRoleType;
    setAuthToken(token);
    setLoggedUserId(user.id);
    setUserRole(role);
    setLoggedUserName(user.name);
    setLoggedUserEmail(user.email);
    setHasInviteQuery(false);
    if (user.driverTrailerId) {
      setDriverTrailerId(user.driverTrailerId);
    }
    setActiveTab(normalizeTabForRole('', role));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (authToken) {
      void apiLogoutSession(authToken);
    }
    clearStoredAuthSession();
    setAuthToken('');
    setLoggedUserId('');
    setPendingInvitesCount(false ? 1 : 0);
    setIsAuthenticated(false);
  };

  const handleNavigate = (tab: string, trailerId?: string) => {
    if (tab === 'orders-unassigned') {
      setActiveTab('orders');
      setMobileMoreOpen(false);
      setOrdersFocusNonce(Date.now());
      return;
    }
    if (tab === 'fleet-expiring') {
      setFleetJumpFilter({
        filterKind: 'expiring',
        searchQuery: trailerId || '',
        sortBy: 'rca',
        nonce: Date.now(),
      });
      const sameTab = activeTab === 'fleet';
      setActiveTab('fleet');
      setMobileMoreOpen(false);
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: sameTab ? 'smooth' : ('instant' as ScrollBehavior),
      });
      return;
    }
    if (tab === 'fleet') {
      setFleetJumpFilter({
        filterKind: 'all',
        searchQuery: trailerId || '',
        sortBy: 'default',
        nonce: Date.now(),
      });
      const sameTab = activeTab === 'fleet';
      setActiveTab('fleet');
      setMobileMoreOpen(false);
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: sameTab ? 'smooth' : ('instant' as ScrollBehavior),
      });
      return;
    }
    const sameTab = activeTab === tab;
    setActiveTab(tab);
    setMobileMoreOpen(false);
    if (trailerId) {
      setSelectedTrailerId(trailerId);
      if (tab === 'driver') {
        setDriverTrailerId(trailerId);
      }
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: sameTab ? 'smooth' : ('instant' as ScrollBehavior),
    });
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

    if (authToken) {
      void apiAcceptProposalAtomic(authToken, activeTenantId, proposalId).then(
        (res) => {
          if (res.ok && res.workspace && !res.localOnly) {
            serverRevRef.current = res.workspace.rev || serverRevRef.current;
          } else if (!res.ok) {
            if (res.workspace) {
              applyWorkspacePayload(res.workspace);
            }
            setServerConflictBanner(
              res.error ||
                'Conflict Soft-Lock: această ofertă a fost deja procesată de alt dispecer.'
            );
          }
        }
      );
    }

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

  const handleConfirmGroupageVariant = (variant: GroupageCandidateVariant) => {
    const matchedOrder = unassignedOrders.find((o) => o.id === variant.orderId);
    if (matchedOrder) {
      handleAssignOrderToTrailer(variant.orderId, variant.trailerId);
    } else {
      setTrailers((prev) =>
        prev.map((t) => {
          if (t.id !== variant.trailerId) return t;
          const nextOcc = Math.min(t.totalLdm, +(t.occupiedLdm + 1.2).toFixed(1));
          return {
            ...t,
            occupiedLdm: nextOcc,
            freeLdm: Math.max(0, +(t.totalLdm - nextOcc).toFixed(1)),
          };
        })
      );
    }
    logAudit(
      `Variantă Grupaj ${variant.variantRank} confirmată pentru ${variant.orderId} pe ${variant.trailerId} (+${variant.criterion8_estimatedProfitEur} € profit net, +${variant.criterion5_extraKm} km)`
    );
    setServerConflictBanner(
      `Grupaj confirmat pe ${variant.trailerId} (${variant.variantRank}) · +${variant.criterion8_estimatedProfitEur} € profit estimat.`
    );
  };

  const handleApproveCargoTransfer = (xfer: CargoTransferOpportunity) => {
    logAudit(
      `Transfer marfă (Cross-Dock) aprobat ${xfer.code}: ${xfer.ldmTransferred} LDM (${xfer.cargoDescription}) ${xfer.donorTrailerId} → ${xfer.receiverTrailerId} la ${xfer.transferHubCity}`
    );
    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id === xfer.donorTrailerId) {
          const nextOcc = Math.max(0, +(t.occupiedLdm - xfer.ldmTransferred).toFixed(1));
          return {
            ...t,
            occupiedLdm: nextOcc,
            freeLdm: +(t.totalLdm - nextOcc).toFixed(1),
            currentWeightTons: Math.max(0, +(t.currentWeightTons - xfer.weightTons).toFixed(1)),
          };
        }
        if (t.id === xfer.receiverTrailerId) {
          const nextOcc = Math.min(t.totalLdm, +(t.occupiedLdm + xfer.ldmTransferred).toFixed(1));
          const segIdx = Math.max(0, t.segments.length - 1);
          return {
            ...t,
            occupiedLdm: nextOcc,
            freeLdm: Math.max(0, +(t.totalLdm - nextOcc).toFixed(1)),
            currentWeightTons: +(t.currentWeightTons + xfer.weightTons).toFixed(1),
            segments: t.segments.map((seg, i) =>
              i === segIdx
                ? {
                    ...seg,
                    loadingOrders: [
                      ...seg.loadingOrders,
                      `XFER ${xfer.code}: ${xfer.cargoDescription} (${xfer.ldmTransferred} LDM din ${xfer.donorTrailerId} via ${xfer.transferHubCity})`,
                    ],
                  }
                : seg
            ),
          };
        }
        return t;
      })
    );
    setServerConflictBanner(
      `Cross-Dock aprobat: ${xfer.ldmTransferred} LDM mutați ${xfer.donorTrailerId} → ${xfer.receiverTrailerId} (${xfer.transferHubCity}).`
    );
  };

  const handleExecuteSwap = (
    scenario: TrailerSwapScenario,
    actionA: PostSwapAction,
    actionB: PostSwapAction,
    meetingName: string
  ) => {
    logAudit(
      `SWAP EXECUTAT (${scenario.code}) la ${meetingName}: ${scenario.tractorA.tractorId} ↔ ${scenario.tractorB.tractorId} · Acțiuni: A=${actionA}, B=${actionB}`
    );
    setSwapScenarios((prev) =>
      prev.map((sc) =>
        sc.id === scenario.id
          ? {
              ...sc,
              approvalStatus: 'Aprobat & Activ în Planning',
              meetingPoint: { ...sc.meetingPoint, name: meetingName },
            }
          : sc
      )
    );
    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id === scenario.tractorA.currentTrailerId) {
          return {
            ...t,
            tractorId: scenario.tractorB.tractorId,
            driver1: { ...t.driver1, name: scenario.tractorB.driverNames },
            isDoubleCrew: scenario.tractorB.isDoubleCrew,
          };
        }
        if (
          scenario.tractorB.currentTrailerId !== 'Fără remorcă (Solo)' &&
          t.id === scenario.tractorB.currentTrailerId
        ) {
          return {
            ...t,
            tractorId: scenario.tractorA.tractorId,
            driver1: { ...t.driver1, name: scenario.tractorA.driverNames },
            isDoubleCrew: scenario.tractorA.isDoubleCrew,
          };
        }
        return t;
      })
    );
    setServerConflictBanner(
      `Swap ${scenario.code} activat la ${meetingName}. Tractoarele și planificarea au fost actualizate.`
    );
  };

  const handleConfirmDriverSwap = (scenarioId: string, side: 'A' | 'B') => {
    setSwapScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== scenarioId) return sc;
        const nextA = side === 'A' ? { ...sc.tractorA, driverConfirmed: true } : sc.tractorA;
        const nextB = side === 'B' ? { ...sc.tractorB, driverConfirmed: true } : sc.tractorB;
        const both = nextA.driverConfirmed && nextB.driverConfirmed;
        return {
          ...sc,
          tractorA: nextA,
          tractorB: nextB,
          approvalStatus:
            sc.approvalStatus === 'Aprobat & Activ în Planning'
              ? sc.approvalStatus
              : both
                ? 'Gata de aprobare dispecer'
                : 'Așteaptă confirmare șoferi',
        };
      })
    );
    logAudit(`Șofer Tractor ${side} a confirmat acordul Swap (${scenarioId}) din Portal`);
    if (authToken) {
      void apiDriverAction(authToken, activeTenantId, {
        actionType: 'swap-confirm',
        scenarioId,
        side,
      }).then((res) => {
        if (res.ok && res.workspace) {
          serverRevRef.current = res.workspace.rev || serverRevRef.current;
        }
      });
    }
  };

  const handleDriverRampCheckin = (
    trailerId: string,
    segmentId: string,
    checked: boolean
  ) => {
    setDriverCheckins((prev) => ({ ...prev, [segmentId]: checked }));
    if (authToken) {
      void apiDriverAction(authToken, activeTenantId, {
        actionType: 'ramp-checkin',
        trailerId,
        segmentId,
        checked,
      }).then((res) => {
        if (res.ok && res.workspace) {
          serverRevRef.current = res.workspace.rev || serverRevRef.current;
        }
      });
    }
  };

  const handleDriverTachoUpdate = (trailerId: string, tachoStatus: string) => {
    const typedStatus = tachoStatus as TrailerUnit['driver1']['tachoStatus'];
    setTrailers((prev) =>
      prev.map((t) =>
        t.id === trailerId ? { ...t, driver1: { ...t.driver1, tachoStatus: typedStatus } } : t
      )
    );
    if (authToken) {
      void apiDriverAction(authToken, activeTenantId, {
        actionType: 'tacho-update',
        trailerId,
        tachoStatus,
      }).then((res) => {
        if (res.ok && res.workspace) {
          serverRevRef.current = res.workspace.rev || serverRevRef.current;
        }
      });
    }
  };

  const handleDriverChatSend = (trailerId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const roTime = new Intl.DateTimeFormat('ro-RO', {
      timeZone: 'Europe/Bucharest',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    const fromRole: 'driver' | 'admin' = userRole === 'SOFER' ? 'driver' : 'admin';
    setDriverMessages((prev) => ({
      ...prev,
      [trailerId]: [
        ...(prev[trailerId] || []),
        { id: `msg-${Date.now()}`, from: fromRole, text: clean, time: roTime },
      ].slice(-80),
    }));
    if (authToken) {
      void apiDriverAction(authToken, activeTenantId, {
        actionType: 'chat-message',
        trailerId,
        text: clean,
      }).then((res) => {
        if (res.ok && res.workspace) {
          serverRevRef.current = res.workspace.rev || serverRevRef.current;
        }
      });
    }
  };

  const handleSubmitDriverExpense = async (
    payload: SubmitDriverExpenseInput,
    localPreview?: { dataUrl?: string; mimeType?: string; sizeBytes?: number }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (authToken) {
      const resp = await apiUploadDriverExpense(authToken, activeTenantId, payload);
      if (!resp.ok) {
        return { ok: false, error: resp.error || 'Eroare la încărcarea bonului.' };
      }
      if (resp.workspace) {
        applyWorkspacePayload(resp.workspace);
      } else if (resp.expense) {
        const savedExp = resp.expense;
        setDriverExpenses((prev) => [savedExp, ...prev.filter((e) => e.id !== savedExp.id)]);
      }
      return { ok: true };
    }

    const fallbackExp: DriverExpenseRecord = {
      id: `exp-local-${Date.now()}`,
      trailerId: payload.trailerId,
      driverName: payload.driverName || 'Șofer Cabină',
      tripRef: payload.tripRef,
      tripLabel: payload.tripLabel,
      category: payload.category,
      amount: payload.amount,
      currency: payload.currency,
      liters: payload.liters,
      odometerKm: payload.odometerKm,
      vendorName: payload.vendorName,
      expenseDate: payload.expenseDate,
      notes: payload.notes,
      displayName: payload.fileName,
      mimeType: localPreview?.mimeType,
      sizeBytes: localPreview?.sizeBytes,
      localDataUrl: localPreview?.dataUrl,
      status: 'Înregistrat',
      createdAt: new Date().toISOString(),
      createdBy: loggedUserName || payload.driverName || 'Șofer Cabină',
    };
    setDriverExpenses((prev) => [fallbackExp, ...prev]);
    logAudit(
      `Bon/Cheltuială șofer (${payload.trailerId}): ${payload.amount} ${payload.currency} @ ${payload.vendorName}`
    );
    return { ok: true };
  };

  const handleUpdateDriverExpenseStatus = async (
    id: string,
    status: 'Înregistrat' | 'Validat Admin'
  ) => {
    setDriverExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    );
    if (authToken) {
      const resp = await apiUpdateDriverExpenseStatus(authToken, activeTenantId, id, status);
      if (resp.ok && resp.workspace) {
        applyWorkspacePayload(resp.workspace);
      }
    }
  };

  const handleDeleteDriverExpense = async (id: string) => {
    setDriverExpenses((prev) => prev.filter((e) => e.id !== id));
    if (authToken) {
      const resp = await apiDeleteDriverExpense(authToken, activeTenantId, id);
      if (resp.ok && resp.workspace) {
        applyWorkspacePayload(resp.workspace);
      }
    }
  };

  const handleSyncCargoTrack = () => {
    setIsSyncingCargoTrack(true);
    if (!authToken) {
      const nowIso = new Date().toISOString();
      setLastCargoTrackSyncAt(nowIso);
      setIsSyncingCargoTrack(false);
      return;
    }
    void apiSyncCargoTrack(authToken, activeTenantId)
      .then((res) => {
        if (res.ok && res.workspace) {
          applyWorkspacePayload(res.workspace);
          setServerConflictBanner(
            `Telemetrie GPS & Tahograf G2V2 sincronizată (${res.syncMode || 'live'}).`
          );
        }
      })
      .finally(() => setIsSyncingCargoTrack(false));
  };

  const handleScanExchanges = () => {
    setIsScanningExchanges(true);
    if (!authToken) {
      setIsScanningExchanges(false);
      return;
    }
    void apiScanExchanges(authToken, activeTenantId)
      .then((res) => {
        if (res.ok && res.workspace) {
          applyWorkspacePayload(res.workspace);
          setServerConflictBanner(
            `Scanare TimoCom / Trans.eu finalizată: ${res.matches?.length || 0} potriviri pe coridoarele cu spațiu liber.`
          );
        }
      })
      .finally(() => setIsScanningExchanges(false));
  };

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
      id: 'control',
      label: 'Control Center',
      shortLabel: 'Hartă',
      sub: 'Hartă live · LDM',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
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
      id: 'today',
      label: 'Operațional',
      shortLabel: 'Operațional',
      sub: 'De făcut azi',
      icon: ListChecks,
      badge:
        unassignedOrders.length + pendingProposalsCount > 0
          ? `${unassignedOrders.length + pendingProposalsCount}`
          : undefined,
      roles: ['ADMIN', 'DISPECER'] as UserRoleType[],
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
      sub: 'Camioane · ITP · Acte',
      icon: Truck,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'clients',
      label: 'Clienți',
      shortLabel: 'Clienți',
      sub: 'Contracte · Tarife · Coridoare',
      icon: Building2,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'tacho',
      label: 'Șoferi',
      shortLabel: 'Șoferi',
      sub: 'Documente · Tahograf · CE 561',
      icon: IdCard,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'invoicing',
      label: 'Facturare',
      shortLabel: 'Facturi',
      sub: 'Facturi · CMR · e-Factura XML',
      icon: Receipt,
      roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] as UserRoleType[],
    },
    {
      id: 'users',
      label: 'Utilizatori',
      shortLabel: 'Useri',
      sub: 'Conturi · Roluri · Invitații',
      icon: Users,
      badge: pendingInvitesCount > 0 ? `${pendingInvitesCount}` : undefined,
      roles: ['ADMIN'] as UserRoleType[],
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

  // Rutele din meniul principal; sub-filele interne (Grupaje, Swap, Oferte) rămân grupate sub Planificare
  const navGroupOf = (tab: string): string => {
    if (tab === 'groupage' || tab === 'swap' || tab === 'offers') return 'planning';
    if (tab === 'analysis') return 'fleet';
    if (tab === 'driver') return userRole === 'SOFER' ? 'driver' : 'orders';
    return tab;
  };
  const navTarget = (id: string): string =>
    id === 'planning' && userRole === 'FINANCIAR' ? 'offers' : id;

  const TAB_BARS: Record<
    string,
    { id: string; label: string; mobileLabel: string; roles: UserRoleType[] }[]
  > = {
    planning: [
      { id: 'planning', label: 'Calendar 7 zile', mobileLabel: 'Calendar', roles: ['ADMIN', 'DISPECER'] },
      { id: 'groupage', label: 'Grupaje & disponibilități', mobileLabel: 'Grupaje', roles: ['ADMIN', 'DISPECER'] },
      { id: 'swap', label: 'Schimburi de remorci', mobileLabel: 'Schimburi', roles: ['ADMIN', 'DISPECER'] },
      { id: 'offers', label: 'Oferte clienți', mobileLabel: 'Oferte', roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] },
    ],
    orders: [
      { id: 'orders', label: 'Comenzi & curse', mobileLabel: 'Comenzi & curse', roles: ['ADMIN', 'DISPECER', 'FINANCIAR'] },
      { id: 'driver', label: 'Vedere șofer (cabină)', mobileLabel: 'Vedere șofer', roles: ['ADMIN', 'DISPECER'] },
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
    clients: 'clienți și contracte',
    tacho: 'șoferi, permise și tahograf',
    invoicing: 'facturi, CMR și e-Factura XML',
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

  const primaryMobileTabs =
    userRole === 'SOFER' ? navItems : navItems.slice(0, 5);
  const secondaryMobileTabs =
    userRole === 'SOFER' ? [] : navItems.slice(5);
  const currentTabObj =
    navItems.find((n) => n.id === navGroupOf(activeTab)) || navItems[0];

  const publicOfferRoute = resolvePublicOfferRouteFromLocation();

  const driverPortalRoute = resolveDriverPortalRouteFromLocation(
    trailers.map((t) => t.id)
  );
  const isStandaloneDriverPortal = driverPortalRoute.isDriverPortalLink;
  const effectiveCabTrailerId =
    driverPortalRoute.lockedTrailerId || driverTrailerId;
  const effectiveNotificationRole: UserRoleType = isStandaloneDriverPortal
    ? 'SOFER'
    : userRole;
  const effectiveDriverUnit =
    trailers.find(
      (t) =>
        t.id === effectiveCabTrailerId ||
        t.id.replace(/[\s-]+/g, '').toUpperCase() ===
          effectiveCabTrailerId.replace(/[\s-]+/g, '').toUpperCase()
    ) || activeDriverUnit;

  const notifScopeId = isStandaloneDriverPortal
    ? `cab:${effectiveDriverUnit.id}`
    : loggedUserId || userRole;
  const notifStorageKey = `bluetrans_seen_notif_v1:${activeTenantId}:${notifScopeId}`;

  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(notifStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string').slice(-300)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(notifStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setSeenNotificationIds(
        Array.isArray(parsed)
          ? parsed.filter((x): x is string => typeof x === 'string').slice(-300)
          : []
      );
    } catch {
      setSeenNotificationIds([]);
    }
  }, [notifStorageKey]);

  const handleMarkNotificationsSeen = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setSeenNotificationIds((prev) => {
        const existing = new Set(prev);
        const missing = ids.filter((id) => !existing.has(id));
        if (missing.length === 0) return prev;
        const next = [...prev, ...missing].slice(-300);
        try {
          localStorage.setItem(notifStorageKey, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    [notifStorageKey]
  );

  const headerNotifications = useMemo<HeaderNotificationItem[]>(() => {
    const normalizePlate = (val: string) =>
      val.replace(/[\s-]+/g, '').toUpperCase();
    const extractMsgEpoch = (msgId: string, fallbackIdx: number) => {
      const m = msgId.match(/(\d{10,})/);
      return m ? Number(m[1]) : fallbackIdx;
    };

    if (effectiveNotificationRole === 'SOFER') {
      const unitNorm = normalizePlate(effectiveDriverUnit.id);
      const cabMsgs: HeaderNotificationItem[] = Object.entries(driverMessages)
        .filter(([tId]) => normalizePlate(tId) === unitNorm)
        .flatMap(([tId, list]) =>
          (list || [])
            .filter((m) => m.from === 'admin')
            .map((m, idx) => ({
              id: `admin-msg:${tId}:${m.id}`,
              kind: 'admin_message' as const,
              title: `Mesaj Dispecerat (${effectiveDriverUnit.id})`,
              subtitle: m.text,
              timeLabel: m.time,
              targetTab: 'driver',
              trailerId: effectiveDriverUnit.id,
              priority: extractMsgEpoch(m.id, idx),
            }))
        )
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      const assignedTrips: HeaderNotificationItem[] = planningCards
        .filter((c) => normalizePlate(c.trailerId) === unitNorm)
        .map((c) => ({
          id: `trip:${effectiveDriverUnit.id}:${c.id}`,
          kind: 'trip_assigned' as const,
          title: `Cursă: ${c.routeLabel}`,
          subtitle: `${c.clientName} · ${c.ldm} LDM · ${c.hourSlot}`,
          timeLabel: c.hourSlot,
          targetTab: 'driver',
          trailerId: effectiveDriverUnit.id,
        }));

      return [...cabMsgs, ...assignedTrips];
    }

    const canOpenDriverCab =
      effectiveNotificationRole === 'ADMIN' ||
      effectiveNotificationRole === 'DISPECER';

    const driverChatNotifs: HeaderNotificationItem[] = canOpenDriverCab
      ? Object.entries(driverMessages)
          .flatMap(([tId, list]) =>
            (list || [])
              .filter((m) => m.from === 'driver')
              .map((m, idx) => ({
                id: `drv-msg:${tId}:${m.id}`,
                kind: 'driver_message' as const,
                title: `Mesaj șofer · ${tId}`,
                subtitle: m.text,
                timeLabel: m.time,
                targetTab: 'driver',
                trailerId: tId,
                priority: extractMsgEpoch(m.id, idx),
              }))
          )
          .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      : [];

    const expenseNotifs: HeaderNotificationItem[] = driverExpenses
      .filter((e) => e.status === 'Înregistrat')
      .map((e) => ({
        id: `drv-exp:${e.id}`,
        kind: 'driver_expense' as const,
        title: `Bon nou: ${e.vendorName || e.category}`,
        subtitle: `${e.driverName} (${e.trailerId}) · ${e.amount} ${e.currency}`,
        timeLabel: e.expenseDate,
        targetTab: 'invoicing',
      }));

    const proposalNotifs: HeaderNotificationItem[] = proposals
      .filter((p) => p.status === 'Pending review')
      .map((p) => ({
        id: `proposal:${p.id}`,
        kind: 'proposal' as const,
        title: `Ofertă client: ${p.clientName}`,
        subtitle: `${p.routeFrom} → ${p.routeTo} · ${p.ldmRequested} LDM · €${p.offeredPriceEur}`,
        timeLabel: p.loadingWindow,
        targetTab: 'offers',
      }));

    const orderNotifs: HeaderNotificationItem[] =
      effectiveNotificationRole !== 'FINANCIAR'
        ? unassignedOrders.map((o) => ({
            id: `order:${o.id}`,
            kind: 'order' as const,
            title: `Comandă nealocată: ${o.client}`,
            subtitle: `${o.fromCity} → ${o.toCity} · ${o.ldm} LDM`,
            timeLabel: o.loadingWindow,
            targetTab: 'today',
          }))
        : [];

    return [
      ...driverChatNotifs,
      ...expenseNotifs,
      ...proposalNotifs,
      ...orderNotifs,
    ];
  }, [
    effectiveNotificationRole,
    effectiveDriverUnit.id,
    driverMessages,
    planningCards,
    driverExpenses,
    proposals,
    unassignedOrders,
  ]);

  useEffect(() => {
    if (isStandaloneDriverPortal || effectiveNotificationRole === 'SOFER') {
      return;
    }
    if (activeTab === 'offers') {
      handleMarkNotificationsSeen(
        headerNotifications
          .filter((n) => n.kind === 'proposal')
          .map((n) => n.id)
      );
    } else if (activeTab === 'invoicing') {
      handleMarkNotificationsSeen(
        headerNotifications
          .filter((n) => n.kind === 'driver_expense')
          .map((n) => n.id)
      );
    } else if (activeTab === 'today') {
      handleMarkNotificationsSeen(
        headerNotifications
          .filter((n) => n.kind === 'order')
          .map((n) => n.id)
      );
    } else if (activeTab === 'driver') {
      handleMarkNotificationsSeen(
        headerNotifications
          .filter(
            (n) =>
              n.kind === 'driver_message' &&
              n.trailerId === effectiveDriverUnit.id
          )
          .map((n) => n.id)
      );
    }
  }, [
    activeTab,
    effectiveDriverUnit.id,
    effectiveNotificationRole,
    handleMarkNotificationsSeen,
    headerNotifications,
    isStandaloneDriverPortal,
  ]);

  // Link public ofertare client (/ofertare/<token> sau ?ofertare=<token>) — fără autentificare
  if (publicOfferRoute.isPublicOffer && publicOfferRoute.token) {
    return (
      <I18nProvider>
        <PublicClientOfferView
          token={publicOfferRoute.token}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />
      </I18nProvider>
    );
  }

  // Link separat Portal Șofer (/sofer sau /sofer/BH-67-STS) — momentan fără parolă pentru testare
  if (driverPortalRoute.isDriverPortalLink) {
    return (
      <I18nProvider>
        <div
          data-theme={theme}
          className="min-h-screen tahoe-wallpaper text-[#f5f5f7] flex flex-col transition-colors duration-200"
        >
          <header className="tps-navy-header sticky top-0 z-40 w-full h-[76px] px-4 sm:px-6 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <DynamicBrandLogo height={38} className="shrink-0" />
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/35 whitespace-nowrap">
                Portal Șoferi
              </span>
            </div>

            <div className="ms-auto flex items-center justify-end gap-1.5 sm:gap-3 shrink-0">
              <RomaniaLiveClock />
              <span
                aria-hidden="true"
                className="ro-clock-divider hidden sm:block h-4 w-px bg-white/15 shrink-0"
              />
              <HeaderNotificationsMenu
                items={headerNotifications}
                seenIds={seenNotificationIds}
                onMarkSeen={handleMarkNotificationsSeen}
              />
              <LanguageToggleBar />
              <button
                type="button"
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
            </div>
          </header>

          <main className="p-3 sm:p-5 max-w-7xl w-full mx-auto flex-1">
            <DriverPortalView
              trailers={trailers}
              selectedDriverTrailerId={effectiveCabTrailerId}
              onSelectDriverTrailerId={setDriverTrailerId}
              isStrictDriverRole={Boolean(driverPortalRoute.lockedTrailerId)}
              showMobileBottomDock
              swapScenarios={swapScenarios}
              onConfirmDriverSwap={handleConfirmDriverSwap}
              authToken={authToken}
              tenantId={activeTenantId}
              podFiles={podFiles}
              planningCards={planningCards}
              activeLoads={activeLoads}
              driverExpenses={driverExpenses}
              serverCheckins={driverCheckins}
              serverMessages={driverMessages}
              onDriverRampCheckin={handleDriverRampCheckin}
              onDriverTachoUpdate={handleDriverTachoUpdate}
              onDriverChatSend={handleDriverChatSend}
              onPodUploaded={(pod) => setPodFiles((prev) => [pod, ...prev])}
              onSubmitDriverExpense={handleSubmitDriverExpense}
              onDeleteDriverExpense={handleDeleteDriverExpense}
              onUpdateDriverExpenseStatus={handleUpdateDriverExpenseStatus}
            />
          </main>
        </div>
      </I18nProvider>
    );
  }

  if (!isAuthenticated || hasInviteQuery) {
    return (
      <I18nProvider>
        <LoginView
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onAuthenticated={handleAuthenticated}
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
      <aside className="tps-navy-sidebar hidden lg:flex lg:w-64 backdrop-blur-2xl border-r border-white/10 shrink-0 flex-col sticky top-0 h-screen overflow-hidden">
        {/* Brand Header: Dynamic Blue Trans Spedition Logo — Exact Same 76px Height as Top Header */}
        <div className="tps-brand-bar h-[76px] px-4 border-b border-white/10 flex items-center justify-center shrink-0">
          <DynamicBrandLogo
            height={56}
            onClick={() =>
              handleNavigate(
                userRole === 'SOFER'
                  ? 'driver'
                  : userRole === 'FINANCIAR'
                    ? 'fleet'
                    : 'control'
              )
            }
          />
        </div>

        {/* Navigation Items — macOS Tahoe Pill Selection */}
        <nav aria-label="Meniu principal" className="p-3 space-y-1 flex-1 min-h-0 overflow-y-auto">
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
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    handleNavigate(navTarget(item.id));
                    setMobileMoreOpen(false);
                  }}
                  className={`tps-nav-tab-btn w-full text-left px-4 py-2.5 rounded-full font-semibold flex items-center justify-between group cursor-pointer ${isActive
                      ? 'tahoe-btn-primary text-white'
                      : 'border border-transparent hover:bg-white/8 text-white/80 hover:text-white'
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

        {/* Bottom macOS Tahoe User Profile Card + Version & Build Timestamp */}
        <div className="px-3 pb-3 pt-1 space-y-2 shrink-0">
          <div className="p-3 rounded-[20px] tahoe-card-inner space-y-1.5 text-xs">
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

          <div
            className="tps-sidebar-build-meta px-2 pt-0.5 flex items-center justify-between gap-2 text-[10.5px] tabular-nums text-white/50 select-none"
            title={`Versiunea aplicației v${APP_VERSION} · Build generat la ${APP_BUILD_DATE_RO} (Ora României)`}
          >
            <span className="font-bold text-white/70">v{APP_VERSION}</span>
            <time dateTime={APP_BUILD_ISO || undefined} className="truncate">
              Build: {APP_BUILD_DATE_RO}
            </time>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT AREA (Mobile + Desktop)
      ====================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Edge-to-Edge Header Bar — Exact Same 76px Height as Sidebar Brand Header */}
        <header className="tps-top-header tps-navy-header sticky top-0 z-40 w-full h-[76px] px-4 sm:px-6 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          {/* Left Group: Mobile Brand Only (Hidden on Desktop to avoid duplicating sidebar brand) */}
          <div className="tps-mobile-brand-wrap flex lg:hidden items-center gap-2 min-w-0 shrink">
            <DynamicBrandLogo
              height={34}
              className="shrink-0"
              onClick={() =>
                handleNavigate(userRole === 'SOFER' ? 'driver' : 'control')
              }
            />
            <span className="hidden md:inline text-xs font-bold text-white tracking-tight truncate">
              {currentTabObj.label}
            </span>
          </div>

          {/* Right Group: Frameless Right-Aligned Clock & Date + Action Controls */}
          <div className="tps-header-right-actions ms-auto flex items-center justify-end gap-1.5 sm:gap-3 shrink-0">
            <RomaniaLiveClock />

            <span
              aria-hidden="true"
              className="ro-clock-divider hidden sm:block h-4 w-px bg-white/15 shrink-0"
            />
            <HeaderNotificationsMenu
              items={headerNotifications}
              seenIds={seenNotificationIds}
              onMarkSeen={handleMarkNotificationsSeen}
              onNavigate={handleNavigate}
            />

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

        {/* Main View Container — Full Width with Safe Area for Floating Dock */}
        <main className="p-3 sm:p-4 lg:px-4 lg:py-4 pb-28 lg:pb-8 flex-1 max-w-full w-full mx-auto">
          {(tabBar.length > 1 || (userRole !== 'SOFER' && DEMO_PAGES[activeTab])) && (
            <div
              className={`${
                tabBar.length > 1 ? 'flex' : 'hidden sm:flex'
              } flex-nowrap items-center justify-between gap-2 mb-2.5 sm:mb-3`}
            >
              {tabBar.length > 1 && (
                <div
                  className={`tps-subtab-scroller w-full grid ${
                    tabBar.length === 4
                      ? 'grid-cols-4'
                      : tabBar.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2'
                  } gap-1.5 sm:w-auto sm:flex sm:flex-nowrap sm:items-center sm:gap-2 sm:overflow-x-auto no-scrollbar min-w-0`}
                >
                  {tabBar.map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      aria-current={activeTab === tb.id ? 'page' : undefined}
                      onClick={(e) => {
                        handleNavigate(tb.id);
                        e.currentTarget.scrollIntoView({
                          block: 'nearest',
                          inline: 'nearest',
                        });
                      }}
                      className={`tps-nav-tab-btn min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-2 py-2 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap sm:shrink-0 cursor-pointer ${
                        activeTab === tb.id
                          ? 'bg-[#0A84FF] border border-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/25'
                          : 'tahoe-btn-secondary text-white/80 hover:text-white'
                      }`}
                    >
                      <span className="sm:hidden truncate">{tb.mobileLabel}</span>
                      <span className="hidden sm:inline">{tb.label}</span>
                      {tb.id === 'offers' && pendingProposalsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF9F0A]/25 text-[#FF9F0A] shrink-0">
                          {pendingProposalsCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {userRole !== 'SOFER' && DEMO_PAGES[activeTab] && (
                <div className="hidden sm:block shrink-0">
                  <DemoBadge label={DEMO_PAGES[activeTab]} />
                </div>
              )}
            </div>
          )}

          {serverConflictBanner && (
            <div className="mb-3 rounded-xl border border-[#0A84FF]/35 bg-[#0A84FF]/15 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-white shadow-sm">
              <span className="font-medium leading-snug">{serverConflictBanner}</span>
              <button
                type="button"
                onClick={() => setServerConflictBanner(null)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                Închide
              </button>
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
              trailers={trailers}
              planningCards={planningCards}
              matches={SMART_GROUPAGE_MATCHES}
              proposals={proposals}
              swapScenarios={swapScenarios}
              lastCargoTrackSyncAt={lastCargoTrackSyncAt}
              isSyncingCargoTrack={isSyncingCargoTrack}
              onSyncCargoTrack={handleSyncCargoTrack}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'planning' && (
            <Planning7DaysView
              trailers={trailers}
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
              focusAllocationNonce={ordersFocusNonce}
            />
          )}

          {activeTab === 'groupage' && (
            <SmartGroupageView
              trailers={trailers}
              matches={SMART_GROUPAGE_MATCHES}
              futureSlots={FUTURE_AVAILABILITY_SLOTS}
              unassignedOrders={unassignedOrders}
              planningCards={planningCards}
              exchangeMatches={exchangeMatches}
              isScanningExchanges={isScanningExchanges}
              onScanExchanges={handleScanExchanges}
              onConfirmGroupageVariant={handleConfirmGroupageVariant}
              onApproveCargoTransfer={handleApproveCargoTransfer}
              onAcceptGroupageMatch={handleAcceptGroupageMatch}
              onNavigateToOffers={() => handleNavigate('offers')}
            />
          )}

          {activeTab === 'swap' && (
            <TrailerSwapView
              trailers={trailers}
              scenarios={swapScenarios}
              onChangeScenarios={setSwapScenarios}
              onExecuteSwap={handleExecuteSwap}
            />
          )}

          {activeTab === 'offers' && (
            <ClientOffersView
              proposals={proposals}
              trailers={trailers}
              onAcceptProposal={handleAcceptProposal}
              onCounterOfferProposal={handleCounterOfferProposal}
              onDeclineProposal={handleDeclineProposal}
              onCreateNewProposal={handleCreateNewProposal}
              authToken={authToken}
              tenantId={activeTenantId}
              companyName={activeTenant?.name || 'BLUE TRANS SPEDITION'}
              offerLinks={offerLinks}
              onOfferLinkCreated={(link) =>
                setOfferLinks((prev) => [link, ...prev.filter((l) => l.token !== link.token)])
              }
              onNotificationSent={(entry) => setOutbox((prev) => [entry, ...prev])}
            />
          )}

          {(activeTab === 'fleet' ||
            activeTab === 'clients' ||
            activeTab === 'tacho' ||
            activeTab === 'invoicing' ||
            activeTab === 'analysis') && (
            <TmsOperationsView
              trailers={trailers}
              subTab={
                activeTab === 'clients'
                  ? 'clients'
                  : activeTab === 'tacho'
                    ? 'tacho'
                    : activeTab === 'invoicing'
                      ? 'invoicing'
                      : 'fleet'
              }
              fleetJumpFilter={fleetJumpFilter}
              userRole={userRole}
              authToken={authToken}
              activeTenant={activeTenant}
              tenants={tenants}
              integrationStatus={integrationStatus}
              podFiles={podFiles}
              driverExpenses={driverExpenses}
              outbox={outbox}
              onSwitchTenant={handleSwitchTenant}
              onTenantsUpdated={setTenants}
              onIntegrationUpdated={setIntegrationStatus}
              onSyncCargoTrack={handleSyncCargoTrack}
              onScanExchanges={handleScanExchanges}
              onUpdateDriverExpenseStatus={handleUpdateDriverExpenseStatus}
              onDeleteDriverExpense={handleDeleteDriverExpense}
            />
          )}

          {activeTab === 'users' && userRole === 'ADMIN' && (
            <UsersAdminView
              authToken={authToken}
              currentUserId={loggedUserId}
              trailers={trailers}
              onUsersChanged={setPendingInvitesCount}
            />
          )}

          {(activeTab === 'driver' || userRole === 'SOFER') && (
            <DriverPortalView
              trailers={trailers}
              selectedDriverTrailerId={driverTrailerId}
              onSelectDriverTrailerId={setDriverTrailerId}
              isStrictDriverRole={userRole === 'SOFER'}
              showMobileBottomDock={userRole === 'SOFER'}
              swapScenarios={swapScenarios}
              onConfirmDriverSwap={handleConfirmDriverSwap}
              authToken={authToken}
              tenantId={activeTenantId}
              podFiles={podFiles}
              planningCards={planningCards}
              activeLoads={activeLoads}
              driverExpenses={driverExpenses}
              serverCheckins={driverCheckins}
              serverMessages={driverMessages}
              onDriverRampCheckin={handleDriverRampCheckin}
              onDriverTachoUpdate={handleDriverTachoUpdate}
              onDriverChatSend={handleDriverChatSend}
              onPodUploaded={(pod) => setPodFiles((prev) => [pod, ...prev])}
              onSubmitDriverExpense={handleSubmitDriverExpense}
              onDeleteDriverExpense={handleDeleteDriverExpense}
              onUpdateDriverExpenseStatus={handleUpdateDriverExpenseStatus}
            />
          )}
        </main>

        {showAuditLog && (
          <AuditLogModal entries={auditLog} onClose={() => setShowAuditLog(false)} />
        )}
      </div>

      {/* =====================================================================
          MOBILE DOCKED STICKY BOTTOM BAR (Admin/Staff Tabs; SOFER uses 4-tab Driver Dock)
      ====================================================================== */}
      {userRole !== 'SOFER' && (
      <nav
        aria-label="Meniu mobil"
        className="tps-mobile-dock lg:hidden fixed inset-x-0 bottom-0 z-[45] flex items-center justify-between gap-0.5"
      >
        {primaryMobileTabs.map((item) => {
          const Icon = item.icon;
          const isActive = navGroupOf(activeTab) === item.id && !mobileMoreOpen;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                setMobileMoreOpen(false);
                handleNavigate(navTarget(item.id));
              }}
              className={`tps-nav-tab-btn tps-mobile-tab-item flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl border cursor-pointer ${
                isActive
                  ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-sm shadow-[#007AFF]/35'
                  : 'border-transparent text-white/70 hover:text-white'
              }`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon className="w-[17px] h-[17px] shrink-0" aria-hidden="true" />
                {item.badge && (
                  <span
                    aria-hidden="true"
                    className={`tps-mobile-tab-badge absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] px-1 rounded-full text-[8.5px] font-extrabold tabular-nums leading-none flex items-center justify-center ${
                      isActive
                        ? 'bg-white text-[#007AFF]'
                        : 'bg-[#FF9F0A] text-[#080d1a]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="text-[9px] min-[380px]:text-[9.5px] sm:text-[10.5px] font-semibold mt-0.5 leading-tight tracking-[-0.015em] whitespace-nowrap max-w-full">
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        {/* Compact Icon-Only Three-Dots (•••) Trigger — No "Mai mult" / "Meniu" Text */}
        <button
          type="button"
          aria-expanded={mobileMoreOpen}
          aria-controls="mobile-more-sheet"
          aria-label="Meniu opțiuni secundare"
          onClick={() => setMobileMoreOpen((v) => !v)}
          className={`tps-nav-tab-btn tps-mobile-more-trigger relative w-10 min-[390px]:w-11 min-w-[42px] min-[390px]:min-w-[44px] min-h-[48px] shrink-0 flex items-center justify-center rounded-2xl border cursor-pointer ${
            secondaryMobileTabs.some((t) => t.id === navGroupOf(activeTab)) ||
            mobileMoreOpen
              ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-sm shadow-[#007AFF]/35'
              : 'border-transparent text-white/70 hover:text-white'
          }`}
        >
          {mobileMoreOpen ? (
            <X className="w-5 h-5 shrink-0" aria-hidden="true" />
          ) : (
            <MoreHorizontal className="w-5 h-5 shrink-0" aria-hidden="true" />
          )}
          {secondaryMobileTabs.some((t) => Boolean(t.badge)) &&
            !mobileMoreOpen && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF9F0A]"
              />
            )}
        </button>
      </nav>
      )}

      {/* Mobile Secondary Options Sheet (•••) — Anchored Cleanly Above Docked Bottom Bar */}
      {mobileMoreOpen && (
        <div
          id="mobile-more-sheet"
          onClick={() => setMobileMoreOpen(false)}
          className="lg:hidden fixed inset-0 z-[44] bg-black/60 backdrop-blur-xs flex items-end justify-center px-3 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] tahoe-glass-elevated p-3.5 space-y-2 max-h-[75dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-2 pb-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                Opțiuni & Cont
              </span>
              <span className="text-[10.5px] font-semibold tabular-nums text-white/45">
                v{APP_VERSION}
              </span>
            </div>

            {secondaryMobileTabs.map((item) => {
              const Icon = item.icon;
              const isActive = navGroupOf(activeTab) === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    handleNavigate(navTarget(item.id));
                    setMobileMoreOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-left transition cursor-pointer ${
                    isActive
                      ? 'tahoe-btn-primary text-white'
                      : 'tahoe-card-inner text-white/90 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#64D2FF]'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{item.label}</div>
                      <div
                        className={`text-xs truncate ${
                          isActive ? 'text-white/80' : 'text-white/55'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                setShowAuditLog(true);
              }}
              className="w-full px-4 py-3 rounded-2xl tahoe-card-inner text-white/90 hover:bg-white/10 flex items-center justify-between text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <History className="w-5 h-5 text-[#64D2FF] shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">Jurnal Audit Operațional</div>
                  <div className="text-xs text-white/55 truncate">
                    Istoric acțiuni & modificări sistem
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums bg-white/10 text-white/80 shrink-0">
                {auditLog.length}
              </span>
            </button>

            <div className="p-3 rounded-2xl tahoe-card-inner flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#30D158] shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64D2FF] truncate">
                    {roleMeta[userRole].title}
                  </span>
                </div>
                <div className="font-bold text-white truncate mt-0.5">
                  {loggedUserName}
                </div>
                <div className="text-[11px] text-white/55 truncate">
                  {loggedUserEmail}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  handleLogout();
                }}
                className="px-3 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Ieșire</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </I18nProvider>
  );
}
export default App;
