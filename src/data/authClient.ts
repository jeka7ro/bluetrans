export type StaffRoleType = 'ADMIN' | 'DISPECER' | 'FINANCIAR';
export type AppUserRole = StaffRoleType | 'SOFER';
export type UserAccountStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

/**
 * Arhitectură pregătită pentru Portalul Șoferilor:
 * - 'OPEN_TEST': acces direct pe link dedicat (/sofer sau /sofer/BH-67-STS) fără parolă pentru testare
 * - 'CODE_AND_PIN': pregătit pentru activarea ulterioară pe bază de Cod Șofer + PIN
 */
export const DRIVER_PORTAL_AUTH_MODE: 'OPEN_TEST' | 'CODE_AND_PIN' = 'OPEN_TEST';

export interface AuthUserRecord {
  id: string;
  name: string;
  email: string;
  username: string;
  role: AppUserRole;
  driverTrailerId?: string;
  status: UserAccountStatus;
  createdAt?: string;
  lastLoginAt?: string;
  inviteToken?: string;
  inviteExpiresAt?: string;
  invitedBy?: string;
}

export interface InvitePreviewInfo {
  name: string;
  email: string;
  username: string;
  role: AppUserRole;
  driverTrailerId?: string;
  expiresAt?: string;
}

const PERSISTED_AUTH_KEY = 'bluetrans_auth_session_v2';
const REMEMBERED_IDENTIFIER_KEY = 'bluetrans_remembered_identifier_v1';

export interface StoredAuthSession {
  token: string;
  remember: boolean;
  user: AuthUserRecord;
}

export function getRememberedIdentifier(): string {
  try {
    return localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) || '';
  } catch {
    return '';
  }
}

export function setRememberedIdentifier(identifier: string, remember: boolean): void {
  try {
    if (remember && identifier.trim()) {
      localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier.trim());
    } else {
      localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadStoredAuthSession(): StoredAuthSession | null {
  try {
    const rawSession = sessionStorage.getItem(PERSISTED_AUTH_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as StoredAuthSession;
      if (parsed && parsed.token && parsed.user) return parsed;
    }
    const rawLocal = localStorage.getItem(PERSISTED_AUTH_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as StoredAuthSession;
      if (parsed && parsed.token && parsed.user) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveStoredAuthSession(session: StoredAuthSession): void {
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(PERSISTED_AUTH_KEY, serialized);
    if (session.remember) {
      localStorage.setItem(PERSISTED_AUTH_KEY, serialized);
    } else {
      localStorage.removeItem(PERSISTED_AUTH_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearStoredAuthSession(): void {
  try {
    sessionStorage.removeItem(PERSISTED_AUTH_KEY);
    localStorage.removeItem(PERSISTED_AUTH_KEY);
    localStorage.removeItem('bluetrans_tms_auth_v1');
  } catch {
    // ignore
  }
}

/**
 * Detectează dacă URL-ul curent este un link dedicat pentru Portalul Șoferilor:
 * - `/sofer` -> deschide Portalul Șoferilor (cu selector de camion)
 * - `/sofer/BH-67-STS` -> deschide direct cabina camionului `BH 67 STS` (strict pe acel camion)
 * - `/?sofer=BH+67+STS` sau `/?portal=sofer` -> suportat ca alternativă
 */
export function resolveDriverPortalRouteFromLocation(
  availableTrailerIds: string[]
): { isDriverPortalLink: boolean; lockedTrailerId?: string } {
  if (typeof window === 'undefined') {
    return { isDriverPortalLink: false };
  }

  const pathname = decodeURIComponent(window.location.pathname || '/').replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search || '');

  const matchPlate = (rawSlug: string): string | undefined => {
    const normalizedSlug = rawSlug.replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!normalizedSlug) return undefined;
    const exact = availableTrailerIds.find(
      (id) => id.replace(/\s+/g, ' ').trim().toUpperCase() === normalizedSlug
    );
    if (exact) return exact;
    const compactSlug = normalizedSlug.replace(/\s+/g, '');
    return availableTrailerIds.find(
      (id) => id.replace(/\s+/g, '').toUpperCase() === compactSlug
    );
  };

  if (pathname === '/sofer' || pathname === '/driver') {
    const qPlate = params.get('camion') || params.get('plate') || '';
    const matched = qPlate ? matchPlate(qPlate) : undefined;
    return { isDriverPortalLink: true, lockedTrailerId: matched };
  }

  if (pathname.startsWith('/sofer/') || pathname.startsWith('/driver/')) {
    const slug = pathname.split('/').slice(2).join('/');
    const matched = matchPlate(slug);
    return {
      isDriverPortalLink: true,
      lockedTrailerId: matched || availableTrailerIds[0] || 'BH 67 STS',
    };
  }

  const querySofer = params.get('sofer');
  if (querySofer !== null) {
    if (!querySofer || querySofer === '1' || querySofer === 'all') {
      return { isDriverPortalLink: true };
    }
    return {
      isDriverPortalLink: true,
      lockedTrailerId: matchPlate(querySofer) || availableTrailerIds[0] || 'BH 67 STS',
    };
  }

  if (params.get('portal') === 'sofer') {
    return { isDriverPortalLink: true };
  }

  return { isDriverPortalLink: false };
}

export function buildDriverPortalUrl(trailerId?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!trailerId) {
    return `${origin}/sofer`;
  }
  const slug = trailerId.trim().replace(/\s+/g, '-').toUpperCase();
  return `${origin}/sofer/${encodeURIComponent(slug)}`;
}

export function buildInviteUrl(inviteToken: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?invite=${encodeURIComponent(inviteToken)}`;
}

export async function apiLoginWithPassword(
  identifier: string,
  password: string,
  remember: boolean
): Promise<{ token: string; user: AuthUserRecord }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, remember }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    token?: string;
    user?: AuthUserRecord;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.token || !data.user) {
    throw new Error(data.error || 'Email / utilizator sau parolă incorectă.');
  }
  return { token: data.token, user: data.user };
}

export async function apiVerifySession(token: string): Promise<AuthUserRecord | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; user?: AuthUserRecord };
    return data.ok && data.user ? data.user : null;
  } catch {
    return null;
  }
}

export async function apiLogoutSession(token: string): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore network errors on logout
  }
}

export async function apiFetchInvitePreview(token: string): Promise<InvitePreviewInfo> {
  const res = await fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`);
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    invite?: InvitePreviewInfo;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.invite) {
    throw new Error(data.error || 'Linkul de invitație nu este valid sau a expirat.');
  }
  return data.invite;
}

export async function apiAcceptInvite(payload: {
  token: string;
  password: string;
  name?: string;
  username?: string;
  remember: boolean;
}): Promise<{ token: string; user: AuthUserRecord }> {
  const res = await fetch('/api/auth/accept-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    token?: string;
    user?: AuthUserRecord;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.token || !data.user) {
    throw new Error(data.error || 'Nu s-a putut activa contul.');
  }
  return { token: data.token, user: data.user };
}

export async function apiListUsers(authToken: string): Promise<AuthUserRecord[]> {
  const res = await fetch('/api/auth/users', {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    users?: AuthUserRecord[];
    error?: string;
  };
  if (!res.ok || !data.ok || !Array.isArray(data.users)) {
    throw new Error(data.error || 'Nu s-a putut încărca lista de utilizatori.');
  }
  return data.users;
}

export async function apiInviteOrCreateUser(
  authToken: string,
  payload: {
    name: string;
    email: string;
    username?: string;
    role: AppUserRole;
    driverTrailerId?: string;
    initialPassword?: string;
  }
): Promise<{ user: AuthUserRecord; users: AuthUserRecord[] }> {
  const res = await fetch('/api/auth/users/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    user?: AuthUserRecord;
    users?: AuthUserRecord[];
    error?: string;
  };
  if (!res.ok || !data.ok || !data.user || !Array.isArray(data.users)) {
    throw new Error(data.error || 'Nu s-a putut crea invitația.');
  }
  return { user: data.user, users: data.users };
}

export async function apiUpdateUser(
  authToken: string,
  payload: {
    id: string;
    name?: string;
    email?: string;
    username?: string;
    role?: AppUserRole;
    driverTrailerId?: string;
    status?: UserAccountStatus;
    newPassword?: string;
    regenerateInvite?: boolean;
  }
): Promise<{ user: AuthUserRecord; users: AuthUserRecord[] }> {
  const res = await fetch('/api/auth/users/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    user?: AuthUserRecord;
    users?: AuthUserRecord[];
    error?: string;
  };
  if (!res.ok || !data.ok || !data.user || !Array.isArray(data.users)) {
    throw new Error(data.error || 'Nu s-a putut actualiza contul.');
  }
  return { user: data.user, users: data.users };
}

export async function apiDeleteUser(
  authToken: string,
  id: string
): Promise<AuthUserRecord[]> {
  const res = await fetch('/api/auth/users/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ id }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    users?: AuthUserRecord[];
    error?: string;
  };
  if (!res.ok || !data.ok || !Array.isArray(data.users)) {
    throw new Error(data.error || 'Nu s-a putut șterge contul.');
  }
  return data.users;
}
