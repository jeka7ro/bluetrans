import type {
  CargoOrder,
  ClientShipmentProposal,
  SmartGroupageMatch,
  TrailerSwapScenario,
  TrailerUnit,
} from './mockData';
import type { HourlyPlanningCard } from '../components/Planning7DaysView';

export interface TenantInfo {
  id: string;
  name: string;
  vatCode: string;
  city: string;
  plan: string;
  maxTrucks: number;
  primaryColor?: string;
  createdAt?: string;
}

export interface PodFileRecord {
  id: string;
  fileName: string;
  displayName: string;
  trailerId: string;
  segmentId: string;
  segmentLabel: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export type DriverExpenseCategory =
  | 'FUEL'
  | 'ADBLUE'
  | 'TOLL'
  | 'PARKING'
  | 'SERVICE'
  | 'OTHER';

export type DriverExpenseCurrency = 'EUR' | 'RON' | 'HUF' | 'PLN' | 'SEK' | 'CZK';

export interface DriverExpenseRecord {
  id: string;
  trailerId: string;
  driverName: string;
  tripRef?: string;
  tripLabel?: string;
  category: DriverExpenseCategory;
  amount: number;
  currency: DriverExpenseCurrency;
  liters?: number;
  odometerKm?: number;
  vendorName: string;
  expenseDate: string;
  notes?: string;
  fileName?: string;
  displayName?: string;
  mimeType?: string;
  sizeBytes?: number;
  localDataUrl?: string;
  status: 'Înregistrat' | 'Validat Admin';
  createdAt: string;
  createdBy: string;
}

export interface OfferLinkRecord {
  token: string;
  trailerId: string;
  routeSummary: string[];
  loadingWindow: string;
  latestDelivery: string;
  tempC: number;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface OutboxEntry {
  id: string;
  at: string;
  channel: 'email' | 'whatsapp';
  to: string;
  subject: string;
  messagePreview: string;
  deliveryMode: string;
  providerStatus: string;
}

export interface IntegrationStatusPayload {
  cargoTrack: {
    configured: boolean;
    url: string;
    maskedToken: string;
    lastSyncAt: string;
    mode: string;
  };
  tahograf: {
    configured: boolean;
    url: string;
    maskedToken: string;
    mode: string;
  };
  burse: {
    timoComConfigured: boolean;
    transEuConfigured: boolean;
    maskedTimoCom: string;
    maskedTransEu: string;
    lastScanAt: string;
    matchesCount: number;
  };
  notificari: {
    emailConfigured: boolean;
    senderEmail: string;
    maskedResend: string;
    whatsappConfigured: boolean;
    whatsappPhoneId: string;
    outboxCount: number;
  };
  eFactura: {
    companyCif: string;
    companyName: string;
    ublVersion: string;
  };
}

export interface TmsWorkspacePayload {
  tenantId: string;
  initialized: boolean;
  rev: number;
  updatedAt: string;
  updatedBy: string;
  trailers: TrailerUnit[];
  unassignedOrders: CargoOrder[];
  planningCards: HourlyPlanningCard[];
  activeLoads: Array<Record<string, unknown>>;
  proposals: ClientShipmentProposal[];
  swapScenarios: TrailerSwapScenario[];
  clients: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  auditLog: Array<{ id: string; at: string; who: string; action: string }>;
  driverMessages: Record<string, Array<{ id: string; from: 'driver' | 'admin'; text: string; time: string }>>;
  driverCheckins: Record<string, boolean>;
  podFiles: PodFileRecord[];
  driverExpenses?: DriverExpenseRecord[];
  offerLinks: OfferLinkRecord[];
  exchangeMatches: SmartGroupageMatch[];
  outbox: OutboxEntry[];
  lastCargoTrackSyncAt?: string;
  lastExchangeScanAt?: string;
  integrationStatus?: IntegrationStatusPayload;
}

export interface PublicOfferSnapshot {
  token: string;
  companyName: string;
  trailerId: string;
  routeSummary: string[];
  corridorCode: string;
  loadingWindow: string;
  latestDelivery: string;
  tempC: number;
  zone1Temp: number;
  availableLdm: number;
  softReservedLdm: number;
  expiresAt: string;
}

function authHeaders(token: string, tenantId?: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
  };
}

export function resolvePublicOfferRouteFromLocation(): {
  isPublicOffer: boolean;
  token: string;
} {
  if (typeof window === 'undefined') {
    return { isPublicOffer: false, token: '' };
  }
  const pathname = decodeURIComponent(window.location.pathname || '/').replace(/\/+$/, '');
  const params = new URLSearchParams(window.location.search || '');
  if (pathname.startsWith('/ofertare/')) {
    const token = pathname.slice('/ofertare/'.length).split('/')[0] || '';
    return { isPublicOffer: Boolean(token), token };
  }
  const qToken = params.get('offer') || '';
  if (qToken) {
    return { isPublicOffer: true, token: qToken };
  }
  return { isPublicOffer: false, token: '' };
}

export function buildPublicOfferUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/ofertare/${encodeURIComponent(token)}`;
}

export async function apiFetchPublicOffer(token: string): Promise<{
  ok: boolean;
  offer?: PublicOfferSnapshot;
  error?: string;
}> {
  const res = await fetch(`/api/public/offer?token=${encodeURIComponent(token)}`);
  return res.json();
}

export async function apiSubmitPublicOffer(payload: {
  token: string;
  clientName: string;
  clientContact: string;
  routeFrom: string;
  routeTo: string;
  ldmRequested: number;
  weightTons: number;
  tempRequired: number;
  offeredPriceEur: number;
}): Promise<{ ok: boolean; proposalId?: string; detourKm?: number; estimatedContributionEur?: number; error?: string }> {
  const res = await fetch('/api/public/offer/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function apiGetTmsState(
  authToken: string,
  tenantId = 'blue-trans'
): Promise<{
  ok: boolean;
  tenant?: TenantInfo;
  tenants?: TenantInfo[];
  workspace?: TmsWorkspacePayload;
  error?: string;
}> {
  const res = await fetch(
    `/api/tms/state?tenantId=${encodeURIComponent(tenantId)}`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  return res.json();
}

export async function apiBootstrapTmsState(
  authToken: string,
  tenantId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; alreadyInitialized?: boolean; workspace?: TmsWorkspacePayload }> {
  const res = await fetch('/api/tms/bootstrap', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, patch }),
  });
  return res.json();
}

export async function apiSaveTmsState(
  authToken: string,
  tenantId: string,
  patch: Record<string, unknown>,
  expectedRev?: number,
  reason?: string
): Promise<{
  ok: boolean;
  conflict?: boolean;
  workspace?: TmsWorkspacePayload;
  error?: string;
}> {
  const res = await fetch('/api/tms/state', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, patch, expectedRev, reason }),
  });
  return res.json();
}

export async function apiAcceptProposalAtomic(
  authToken: string,
  tenantId: string,
  proposalId: string
): Promise<{
  ok: boolean;
  localOnly?: boolean;
  statusCode?: number;
  workspace?: TmsWorkspacePayload;
  error?: string;
}> {
  const res = await fetch('/api/tms/proposals/accept', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, proposalId }),
  });
  const data = await res.json();
  return { ...data, statusCode: res.status };
}

export async function apiCreatePublicOfferLink(
  authToken: string,
  tenantId: string,
  payload: {
    trailerId: string;
    routeSummary?: string[];
    loadingWindow?: string;
    latestDelivery?: string;
    tempC?: number;
  }
): Promise<{ ok: boolean; link?: OfferLinkRecord; path?: string; error?: string }> {
  const res = await fetch('/api/tms/proposals/create-link', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, ...payload }),
  });
  return res.json();
}

export async function apiDriverAction(
  authToken: string,
  tenantId: string,
  payload: {
    actionType: 'swap-confirm' | 'ramp-checkin' | 'tacho-update' | 'chat-message';
    trailerId?: string;
    scenarioId?: string;
    side?: 'A' | 'B';
    segmentId?: string;
    checked?: boolean;
    tachoStatus?: string;
    text?: string;
  }
): Promise<{ ok: boolean; workspace?: TmsWorkspacePayload; error?: string }> {
  const res = await fetch('/api/tms/driver/action', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, ...payload }),
  });
  return res.json();
}

export async function apiUploadDriverPod(
  authToken: string,
  tenantId: string,
  payload: {
    trailerId: string;
    segmentId: string;
    segmentLabel: string;
    fileName: string;
    base64: string;
  }
): Promise<{ ok: boolean; pod?: PodFileRecord; workspace?: TmsWorkspacePayload; error?: string }> {
  const res = await fetch('/api/tms/driver/pod-upload', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, ...payload }),
  });
  return res.json();
}

export interface SubmitDriverExpenseInput {
  trailerId: string;
  driverName?: string;
  tripRef?: string;
  tripLabel?: string;
  category: DriverExpenseCategory;
  amount: number;
  currency: DriverExpenseCurrency;
  liters?: number;
  odometerKm?: number;
  vendorName: string;
  expenseDate: string;
  notes?: string;
  fileName?: string;
  base64?: string;
}

export async function apiUploadDriverExpense(
  authToken: string,
  tenantId: string,
  payload: SubmitDriverExpenseInput
): Promise<{ ok: boolean; expense?: DriverExpenseRecord; workspace?: TmsWorkspacePayload; error?: string }> {
  const res = await fetch('/api/tms/driver/expense', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, ...payload }),
  });
  return res.json();
}

export async function apiUpdateDriverExpenseStatus(
  authToken: string,
  tenantId: string,
  id: string,
  status: 'Înregistrat' | 'Validat Admin'
): Promise<{ ok: boolean; expense?: DriverExpenseRecord; workspace?: TmsWorkspacePayload; error?: string }> {
  const res = await fetch('/api/tms/driver/expense-status', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, id, status }),
  });
  return res.json();
}

export async function apiDeleteDriverExpense(
  authToken: string,
  tenantId: string,
  id: string
): Promise<{ ok: boolean; workspace?: TmsWorkspacePayload; error?: string }> {
  const res = await fetch('/api/tms/driver/expense-delete', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, id }),
  });
  return res.json();
}

export function buildDriverPodFileUrl(
  fileName: string,
  tenantId: string,
  authToken: string
): string {
  if (!authToken || !fileName) return '';
  return `/api/tms/driver/pod/${encodeURIComponent(fileName)}?tenantId=${encodeURIComponent(tenantId)}&token=${encodeURIComponent(authToken)}`;
}

export function buildDriverExpenseFileUrl(
  fileName: string | undefined,
  tenantId: string,
  authToken: string,
  localDataUrl?: string
): string {
  if (fileName && authToken) {
    return `/api/tms/driver/expense-file/${encodeURIComponent(fileName)}?tenantId=${encodeURIComponent(tenantId)}&token=${encodeURIComponent(authToken)}`;
  }
  return localDataUrl || '';
}

export async function apiSyncCargoTrack(
  authToken: string,
  tenantId: string
): Promise<{ ok: boolean; syncMode?: string; workspace?: TmsWorkspacePayload; error?: string }> {
  const res = await fetch('/api/tms/integrations/sync-cargotrack', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId }),
  });
  return res.json();
}

export async function apiScanExchanges(
  authToken: string,
  tenantId: string
): Promise<{ ok: boolean; matches?: SmartGroupageMatch[]; workspace?: TmsWorkspacePayload; error?: string }> {
  const res = await fetch('/api/tms/integrations/scan-exchanges', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId }),
  });
  return res.json();
}

export async function apiSaveIntegrationConfig(
  authToken: string,
  tenantId: string,
  config: Record<string, string>
): Promise<{ ok: boolean; integrationStatus?: IntegrationStatusPayload; error?: string }> {
  const res = await fetch('/api/tms/integrations/config', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, ...config }),
  });
  return res.json();
}

export async function apiSendNotification(
  authToken: string,
  tenantId: string,
  payload: { channel: 'email' | 'whatsapp'; to: string; subject: string; message: string }
): Promise<{ ok: boolean; entry?: OutboxEntry; integrationStatus?: IntegrationStatusPayload; error?: string }> {
  const res = await fetch('/api/tms/notify/send', {
    method: 'POST',
    headers: authHeaders(authToken, tenantId),
    body: JSON.stringify({ tenantId, ...payload }),
  });
  return res.json();
}

export async function apiCreateTenant(
  authToken: string,
  payload: { name: string; vatCode: string; city: string; plan: string; maxTrucks: number }
): Promise<{ ok: boolean; tenant?: TenantInfo; tenants?: TenantInfo[]; error?: string }> {
  const res = await fetch('/api/tms/tenants', {
    method: 'POST',
    headers: authHeaders(authToken),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export function subscribeTmsEvents(
  authToken: string,
  tenantId: string,
  onEvent: (data: { type: string; rev?: number; updatedBy?: string }) => void
): () => void {
  if (typeof EventSource === 'undefined' || !authToken) {
    return () => {};
  }
  const url = `/api/tms/events?tenantId=${encodeURIComponent(tenantId)}&token=${encodeURIComponent(authToken)}`;
  const es = new EventSource(url);
  const handleUpdate = (ev: MessageEvent) => {
    try {
      const parsed = JSON.parse(ev.data || '{}');
      onEvent({ type: 'update', ...parsed });
    } catch {
      onEvent({ type: 'update' });
    }
  };
  es.addEventListener('tms-update', handleUpdate);
  return () => {
    es.removeEventListener('tms-update', handleUpdate);
    es.close();
  };
}
