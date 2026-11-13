import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UserPlus,
  Search,
  Copy,
  Check,
  Edit3,
  Trash2,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Mail,
  Truck,
  Users,
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
import { exportRowsToExcel } from '../utils/exportExcel';
import { TrailerUnit } from '../data/mockData';
import {
  AppUserRole,
  AuthUserRecord,
  StaffRoleType,
  UserAccountStatus,
  apiDeleteUser,
  apiInviteOrCreateUser,
  apiListUsers,
  apiUpdateUser,
  buildDriverPortalUrl,
  buildInviteUrl,
} from '../data/authClient';

interface UsersAdminViewProps {
  authToken: string;
  currentUserId: string;
  trailers: TrailerUnit[];
  onUsersChanged?: (pendingInvitesCount: number) => void;
}

const STAFF_ROLES: { value: StaffRoleType; label: string; badgeClass: string }[] = [
  {
    value: 'ADMIN',
    label: 'Administrator',
    badgeClass: 'bg-[#0A84FF]/20 text-[#64D2FF] border-[#0A84FF]/35',
  },
  {
    value: 'DISPECER',
    label: 'Dispecer',
    badgeClass: 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/35',
  },
  {
    value: 'FINANCIAR',
    label: 'Financiar',
    badgeClass: 'bg-[#FF9F0A]/20 text-[#FF9F0A] border-[#FF9F0A]/35',
  },
];

function roleBadgeMeta(role: AppUserRole) {
  const found = STAFF_ROLES.find((r) => r.value === role);
  if (found) return found;
  return {
    value: 'SOFER' as const,
    label: 'Șofer',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/35',
  };
}

function statusBadgeMeta(status: UserAccountStatus) {
  if (status === 'ACTIVE') {
    return {
      label: 'Activ',
      dot: 'bg-[#30D158]',
      cls: 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/35',
    };
  }
  if (status === 'INVITED') {
    return {
      label: 'Invitat',
      dot: 'bg-[#FF9F0A]',
      cls: 'bg-[#FF9F0A]/15 text-[#FF9F0A] border-[#FF9F0A]/35',
    };
  }
  return {
    label: 'Blocat',
    dot: 'bg-rose-400',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
  };
}

function formatDateRo(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest',
  }).format(d);
}

function useLightDismissDialog(
  dialogRef: React.RefObject<HTMLDialogElement | null>,
  isOpen: boolean,
  onClose: () => void
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [dialogRef, isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    const handleNativeClose = () => onClose();
    dialog.addEventListener('close', handleNativeClose);

    // Mandatory fallback for browsers without <dialog closedby="any"> (e.g. Safari)
    let fallbackCleanup: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
      fallbackCleanup = () => dialog.removeEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      if (fallbackCleanup) fallbackCleanup();
    };
  }, [dialogRef, isOpen, onClose]);
}

export const UsersAdminView: React.FC<UsersAdminViewProps> = ({
  authToken,
  currentUserId,
  trailers,
  onUsersChanged,
}) => {
  const [section, setSection] = useState<'STAFF' | 'DRIVER_LINKS'>('STAFF');
  const [users, setUsers] = useState<AuthUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRoleType | 'INVITED'>('ALL');
  const [usersViewMode, setUsersViewMode] = usePersistedViewMode(
    'bluetrans_users_view_v1',
    'list'
  );
  const [usersPageSize, setUsersPageSize] = usePersistedPageSize(
    'bluetrans_users_pagesize_v1',
    10
  );
  const [usersPage, setUsersPage] = useState(1);
  const [userSort, setUserSort] = useState<
    SortState<'name' | 'email' | 'role' | 'status' | 'lastLogin'> | null
  >(null);
  const [linksViewMode, setLinksViewMode] = usePersistedViewMode(
    'bluetrans_driver_links_view_v1',
    'list'
  );
  const [linksPageSize, setLinksPageSize] = usePersistedPageSize(
    'bluetrans_driver_links_pagesize_v1',
    10
  );
  const [linksPage, setLinksPage] = useState(1);
  const [linksSort, setLinksSort] = useState<
    SortState<'assembly' | 'driver' | 'url'> | null
  >(null);
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Bulk Edit / Bulk Delete Utilizatori
  const [showBulkEditUsers, setShowBulkEditUsers] = useState(false);
  const [bulkUserRole, setBulkUserRole] = useState<'KEEP' | StaffRoleType>('KEEP');
  const [bulkUserStatus, setBulkUserStatus] = useState<'KEEP' | UserAccountStatus>(
    'KEEP'
  );
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showBulkDeleteUsers, setShowBulkDeleteUsers] = useState(false);

  useEffect(() => {
    setUsersPage(1);
  }, [searchQuery, roleFilter, usersPageSize, userSort]);

  useEffect(() => {
    setLinksPage(1);
  }, [linksPageSize, linksSort]);

  // Invite / Create Modal state
  const [inviteOpen, setInviteOpen] = useState<boolean>(false);
  const [invName, setInvName] = useState<string>('');
  const [invEmail, setInvEmail] = useState<string>('');
  const [invUsername, setInvUsername] = useState<string>('');
  const [invRole, setInvRole] = useState<StaffRoleType>('DISPECER');
  const [invMode, setInvMode] = useState<'LINK' | 'PASSWORD'>('LINK');
  const [invPassword, setInvPassword] = useState<string>('');
  const [invShowPw, setInvShowPw] = useState<boolean>(false);
  const [invError, setInvError] = useState<string | null>(null);
  const [invSaving, setInvSaving] = useState<boolean>(false);
  const [createdInviteUser, setCreatedInviteUser] = useState<AuthUserRecord | null>(null);
  const inviteDialogRef = useRef<HTMLDialogElement | null>(null);

  // Edit Modal state
  const [editingUser, setEditingUser] = useState<AuthUserRecord | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editUsername, setEditUsername] = useState<string>('');
  const [editRole, setEditRole] = useState<StaffRoleType>('DISPECER');
  const [editStatus, setEditStatus] = useState<UserAccountStatus>('ACTIVE');
  const [editNewPassword, setEditNewPassword] = useState<string>('');
  const [editShowPw, setEditShowPw] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const editDialogRef = useRef<HTMLDialogElement | null>(null);

  const syncUsersState = useCallback(
    (nextUsers: AuthUserRecord[]) => {
      setUsers(nextUsers);
      if (onUsersChanged) {
        const pendingCount = nextUsers.filter((u) => u.status === 'INVITED').length;
        onUsersChanged(pendingCount);
      }
    },
    [onUsersChanged]
  );

  const fetchUsers = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await apiListUsers(authToken);
      syncUsersState(list);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Eroare la încărcarea utilizatorilor.'
      );
    } finally {
      setLoading(false);
    }
  }, [authToken, syncUsersState]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const closeInviteModal = useCallback(() => {
    setInviteOpen(false);
    setCreatedInviteUser(null);
    setInvError(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingUser(null);
    setEditError(null);
    setEditNewPassword('');
  }, []);

  useLightDismissDialog(inviteDialogRef, inviteOpen, closeInviteModal);
  useLightDismissDialog(editDialogRef, Boolean(editingUser), closeEditModal);

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? '' : prev));
      }, 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  const openInviteModal = () => {
    setInvName('');
    setInvEmail('');
    setInvUsername('');
    setInvRole('DISPECER');
    setInvMode('LINK');
    setInvPassword('');
    setInvShowPw(false);
    setInvError(null);
    setCreatedInviteUser(null);
    setInviteOpen(true);
  };

  const handleCreateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invSaving) return;
    setInvError(null);
    setInvSaving(true);
    try {
      const { user, users: updated } = await apiInviteOrCreateUser(authToken, {
        name: invName.trim(),
        email: invEmail.trim(),
        username: invUsername.trim() || undefined,
        role: invRole,
        initialPassword: invMode === 'PASSWORD' ? invPassword : '',
      });
      syncUsersState(updated);
      if (invMode === 'LINK' && user.inviteToken) {
        setCreatedInviteUser(user);
      } else {
        closeInviteModal();
      }
    } catch (err) {
      setInvError(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setInvSaving(false);
    }
  };

  const openEditModal = (u: AuthUserRecord) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditUsername(u.username);
    setEditRole(
      u.role === 'ADMIN' || u.role === 'DISPECER' || u.role === 'FINANCIAR'
        ? u.role
        : 'DISPECER'
    );
    setEditStatus(u.status);
    setEditNewPassword('');
    setEditShowPw(false);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser || editSaving) return;
    setEditError(null);
    setEditSaving(true);
    try {
      const { users: updated } = await apiUpdateUser(authToken, {
        id: editingUser.id,
        name: editName.trim(),
        email: editEmail.trim(),
        username: editUsername.trim(),
        role: editRole,
        status: editStatus,
        newPassword: editNewPassword || undefined,
      });
      syncUsersState(updated);
      closeEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Eroare la actualizare.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleRegenerateInvite = async (u: AuthUserRecord) => {
    try {
      const { user, users: updated } = await apiUpdateUser(authToken, {
        id: u.id,
        regenerateInvite: true,
      });
      syncUsersState(updated);
      if (user.inviteToken) {
        await handleCopyText(buildInviteUrl(user.inviteToken), `inv-${user.id}`);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Nu s-a putut regenera invitația.'
      );
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      const updated = await apiDeleteUser(authToken, id);
      syncUsersState(updated);
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare la ștergere.');
      setConfirmDeleteId(null);
    }
  };

  const staffUsers = users.filter((u) => u.role !== 'SOFER');
  const filteredUsers = staffUsers.filter((u) => {
    if (roleFilter === 'INVITED' && u.status !== 'INVITED') return false;
    if (
      roleFilter !== 'ALL' &&
      roleFilter !== 'INVITED' &&
      u.role !== roleFilter
    ) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!userSort) return 0;
    let cmp = 0;
    switch (userSort.key) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'ro');
        break;
      case 'email':
        cmp = a.email.localeCompare(b.email, 'ro');
        break;
      case 'role':
        cmp = a.role.localeCompare(b.role, 'ro');
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status, 'ro');
        break;
      case 'lastLogin':
        cmp = (a.lastLoginAt || '').localeCompare(b.lastLoginAt || '');
        break;
    }
    return userSort.dir === 'asc' ? cmp : -cmp;
  });

  const {
    total: usersTotal,
    totalPages: usersPageCount,
    safePage: usersSafePage,
    startIdx: usersStartIdx,
    endIdx: usersEndIdx,
    visibleItems: visibleUsers,
  } = paginateItems(sortedUsers, usersPageSize, usersPage);

  const sortedTrailers = [...trailers].sort((a, b) => {
    if (!linksSort) return 0;
    let cmp = 0;
    switch (linksSort.key) {
      case 'assembly':
        cmp = `${a.tractorId} ${a.id}`.localeCompare(
          `${b.tractorId} ${b.id}`,
          'ro'
        );
        break;
      case 'driver':
        cmp = a.driver1.name.localeCompare(b.driver1.name, 'ro');
        break;
      case 'url':
        cmp = buildDriverPortalUrl(a.id).localeCompare(
          buildDriverPortalUrl(b.id),
          'ro'
        );
        break;
    }
    return linksSort.dir === 'asc' ? cmp : -cmp;
  });

  const {
    total: linksTotal,
    totalPages: linksPageCount,
    safePage: linksSafePage,
    startIdx: linksStartIdx,
    endIdx: linksEndIdx,
    visibleItems: visibleTrailers,
  } = paginateItems(sortedTrailers, linksPageSize, linksPage);

  const usersSelection = useTableSelection(
    sortedUsers.map((u) => u.id),
    visibleUsers.map((u) => u.id)
  );
  const selectedUserItems = sortedUsers.filter((u) =>
    usersSelection.isSelected(u.id)
  );
  const deletableSelectedUsers = selectedUserItems.filter(
    (u) => u.id !== currentUserId
  );

  const linksSelection = useTableSelection(
    sortedTrailers.map((t) => t.id),
    visibleTrailers.map((t) => t.id)
  );
  const selectedTrailerItems = sortedTrailers.filter((t) =>
    linksSelection.isSelected(t.id)
  );

  const handleExportUsersExcel = (rowsOverride?: AuthUserRecord[]) => {
    const targetRows = Array.isArray(rowsOverride) ? rowsOverride : sortedUsers;
    const res = exportRowsToExcel({
      fileName: 'BlueTrans_Utilizatori',
      sheetName: 'Utilizatori',
      rows: targetRows,
      columns: [
        { header: '#', value: (_, i) => i + 1, minWidth: 5, maxWidth: 8 },
        { header: 'Nume', value: (u) => u.name },
        { header: 'Username', value: (u) => u.username },
        { header: 'Email', value: (u) => u.email },
        { header: 'Rol', value: (u) => roleBadgeMeta(u.role).label },
        { header: 'Status', value: (u) => statusBadgeMeta(u.status).label },
        {
          header: 'Ultima autentificare',
          value: (u) => formatDateRo(u.lastLoginAt),
        },
      ],
    });
    setBulkFeedback(`Export Excel generat: ${res.fileName} (${res.rowCount} utilizatori).`);
  };

  const handleExportDriverLinksExcel = (rowsOverride?: TrailerUnit[]) => {
    const targetRows = Array.isArray(rowsOverride) ? rowsOverride : sortedTrailers;
    const res = exportRowsToExcel({
      fileName: 'BlueTrans_Linkuri_Soferi',
      sheetName: 'Linkuri Portal Soferi',
      rows: targetRows,
      columns: [
        { header: '#', value: (_, i) => i + 1, minWidth: 5, maxWidth: 8 },
        { header: 'Cap Tractor', value: (t) => t.tractorId },
        { header: 'Semiremorcă', value: (t) => t.id },
        { header: 'Șofer', value: (t) => t.driver1.name },
        {
          header: 'Link dedicat cabină',
          value: (t) => buildDriverPortalUrl(t.id),
        },
      ],
    });
    setBulkFeedback(`Export Excel generat: ${res.fileName} (${res.rowCount} linkuri).`);
  };

  const handleApplyBulkEditUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkBusy || usersSelection.selectedCount === 0) return;
    if (bulkUserRole === 'KEEP' && bulkUserStatus === 'KEEP') {
      setShowBulkEditUsers(false);
      return;
    }
    const editable = selectedUserItems.filter((u) => u.id !== currentUserId);
    if (editable.length === 0) {
      setErrorMsg('Contul tău curent nu poate fi modificat prin editare în masă.');
      setShowBulkEditUsers(false);
      return;
    }
    setBulkBusy(true);
    setErrorMsg(null);
    try {
      let latestList: AuthUserRecord[] = users;
      for (const targetUser of editable) {
        const { users: updated } = await apiUpdateUser(authToken, {
          id: targetUser.id,
          role: bulkUserRole !== 'KEEP' ? bulkUserRole : undefined,
          status: bulkUserStatus !== 'KEEP' ? bulkUserStatus : undefined,
        });
        latestList = updated;
      }
      syncUsersState(latestList);
      usersSelection.clearSelection();
      setShowBulkEditUsers(false);
      setBulkFeedback(`${editable.length} utilizatori au fost actualizați în masă!`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Eroare la actualizarea în masă.'
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleConfirmBulkDeleteUsers = async () => {
    if (bulkBusy || deletableSelectedUsers.length === 0) {
      if (deletableSelectedUsers.length === 0) {
        setErrorMsg('Contul tău curent nu poate fi șters.');
        setShowBulkDeleteUsers(false);
      }
      return;
    }
    setBulkBusy(true);
    setErrorMsg(null);
    try {
      let latestList: AuthUserRecord[] = users;
      for (const targetUser of deletableSelectedUsers) {
        latestList = await apiDeleteUser(authToken, targetUser.id);
      }
      syncUsersState(latestList);
      usersSelection.clearSelection();
      setShowBulkDeleteUsers(false);
      setBulkFeedback(
        `${deletableSelectedUsers.length} utilizatori au fost șterși definitiv.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Eroare la ștergerea în masă.'
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkCopyDriverLinks = async () => {
    const urls = selectedTrailerItems
      .map((t) => `${t.tractorId} (${t.id}) — ${t.driver1.name}: ${buildDriverPortalUrl(t.id)}`)
      .join('\n');
    if (!urls) return;
    await handleCopyText(urls, 'drv-bulk');
    setBulkFeedback(
      `${selectedTrailerItems.length} linkuri Portal Șoferi copiate în clipboard!`
    );
  };

  const generalDriverUrl = buildDriverPortalUrl();

  return (
    <div className="space-y-4">
      {/* Top Bar: Tabs + Primary Invite Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Administrare acces"
          className="w-full grid grid-cols-2 gap-1.5 sm:w-auto sm:flex sm:items-center sm:gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === 'STAFF'}
            onClick={() => setSection('STAFF')}
            className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-2.5 sm:px-4 py-2 rounded-full tahoe-btn-secondary text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Utilizatori ({staffUsers.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={section === 'DRIVER_LINKS'}
            onClick={() => setSection('DRIVER_LINKS')}
            className="min-w-0 w-full sm:w-auto min-h-[38px] sm:min-h-0 px-2.5 sm:px-4 py-2 rounded-full tahoe-btn-secondary text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden truncate">Portal Șoferi ({trailers.length})</span>
            <span className="hidden sm:inline">Linkuri Portal Șoferi ({trailers.length})</span>
          </button>
        </div>

        {section === 'STAFF' && (
          <button
            type="button"
            onClick={openInviteModal}
            className="hidden sm:flex px-4 py-2.5 rounded-full tahoe-btn-primary text-xs font-extrabold text-white items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invită utilizator</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            aria-label="Închide mesajul"
            className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {section === 'STAFF' ? (
        <div className="tahoe-glass rounded-[24px] p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          {/* Search + Role Filter Pills (1 single row on mobile, unchanged on desktop) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <search className="flex-1 sm:w-72">
                <div className="relative">
                  <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    type="search"
                    name="userSearch"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-label="Caută utilizator"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Caută nume, email, utilizator..."
                    className="w-full tahoe-card-inner rounded-full pl-9 pr-4 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>
              </search>
              <button
                type="button"
                onClick={openInviteModal}
                className="sm:hidden px-3 py-2 rounded-full tahoe-btn-primary text-[11px] font-extrabold text-white flex items-center gap-1 cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span>+ Invită</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="grid grid-cols-5 gap-1 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
                {(
                  [
                    { id: 'ALL', label: 'Toți', mobileLabel: 'Toți' },
                    { id: 'ADMIN', label: 'Administrator', mobileLabel: 'Admin' },
                    { id: 'DISPECER', label: 'Dispecer', mobileLabel: 'Disp.' },
                    { id: 'FINANCIAR', label: 'Financiar', mobileLabel: 'Fin.' },
                    { id: 'INVITED', label: 'Invitați', mobileLabel: 'Invitați' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRoleFilter(f.id)}
                    className={`tps-nav-tab-btn min-w-0 px-1.5 sm:px-3 py-1.5 rounded-full text-[10.5px] sm:text-xs font-bold truncate cursor-pointer ${
                      roleFilter === f.id
                        ? 'tahoe-btn-primary text-white'
                        : 'tahoe-btn-secondary text-white/75 hover:text-white'
                    }`}
                  >
                    <span className="sm:hidden">{f.mobileLabel}</span>
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                ))}
              </div>

              <ViewModeToggle
                value={usersViewMode}
                onChange={setUsersViewMode}
                ariaLabel="Mod afișare utilizatori"
              />
              <ExportExcelButton
                onClick={() => handleExportUsersExcel(sortedUsers)}
                count={sortedUsers.length}
                disabled={sortedUsers.length === 0}
              />
            </div>
          </div>

          {bulkFeedback && (
            <div className="p-3 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/35 text-xs font-bold text-[#30D158] flex items-center justify-between gap-2">
              <span>{bulkFeedback}</span>
              <button
                type="button"
                onClick={() => setBulkFeedback(null)}
                className="px-2.5 py-0.5 rounded-full bg-white/10 text-white cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          <BulkActionBar
            selectedCount={usersSelection.selectedCount}
            totalFilteredCount={sortedUsers.length}
            onSelectAllFiltered={usersSelection.selectAllFiltered}
            onClearSelection={usersSelection.clearSelection}
            onBulkExport={() => handleExportUsersExcel(selectedUserItems)}
            onBulkEdit={() => {
              setBulkUserRole('KEEP');
              setBulkUserStatus('KEEP');
              setShowBulkEditUsers(true);
            }}
            onBulkDelete={() => setShowBulkDeleteUsers(true)}
            itemNounSingular="utilizator selectat"
            itemNounPlural="utilizatori selectați"
          />

          {usersViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {loading ? (
                <div className="col-span-full py-8 text-center text-white/60 font-semibold text-xs">
                  Se încarcă utilizatorii...
                </div>
              ) : visibleUsers.length === 0 ? (
                <div className="col-span-full py-8 text-center text-white/55 font-semibold text-xs">
                  Niciun utilizator găsit.
                </div>
              ) : (
                visibleUsers.map((u, idx) => {
                  const roleMeta = roleBadgeMeta(u.role);
                  const statusMeta = statusBadgeMeta(u.status);
                  const invCopyKey = `inv-${u.id}`;
                  const hasInviteLink = Boolean(u.inviteToken);
                  const selected = usersSelection.isSelected(u.id);
                  return (
                    <div
                      key={u.id}
                      className={`tahoe-card-inner rounded-[20px] p-4 border flex flex-col justify-between gap-3 ${
                        selected
                          ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                          : 'border-white/12'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <BulkCheckbox
                              checked={selected}
                              onChange={() => usersSelection.toggleOne(u.id)}
                              ariaLabel={`Selectează ${u.name}`}
                            />
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/75 text-[10.5px] font-bold tabular-nums">
                              #{usersStartIdx + idx + 1}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${roleMeta.badgeClass}`}
                            >
                              {roleMeta.label}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${statusMeta.cls}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            <span>{statusMeta.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-full bg-[#0A84FF]/20 border border-[#0A84FF]/35 text-[#64D2FF] font-extrabold text-xs flex items-center justify-center shrink-0">
                            {u.name
                              .split(' ')
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-white truncate">
                              {u.name}
                            </div>
                            <div className="text-[11px] text-white/55 truncate">
                              @{u.username} · {u.email}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-white/60 tabular-nums">
                          Ultima autentificare: <strong className="text-white/85">{formatDateRo(u.lastLoginAt)}</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                        {hasInviteLink ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(buildInviteUrl(u.inviteToken || ''), invCopyKey)
                            }
                            title="Copiază link invitație"
                            className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-white/85 hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === invCopyKey ? <Check className="w-3 h-3 text-[#30D158]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === invCopyKey ? 'Copiat' : 'Invitație'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRegenerateInvite(u)}
                            title="Generează link invitație"
                            className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[11px] font-semibold text-white/80 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === invCopyKey ? <Check className="w-3 h-3 text-[#30D158]" /> : <RefreshCw className="w-3 h-3" />}
                            <span>{copiedKey === invCopyKey ? 'Copiat' : 'Invitație'}</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            title="Editează utilizator"
                            aria-label={`Editează ${u.name}`}
                            className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUserId &&
                            (confirmDeleteId === u.id ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDelete(u.id)}
                                  className="px-2 py-1 rounded-full bg-rose-500 text-white text-[10.5px] font-extrabold cursor-pointer"
                                >
                                  Șterge
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-full tahoe-btn-secondary text-[10.5px] font-bold cursor-pointer"
                                >
                                  Nu
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(u.id)}
                                title={`Șterge ${u.name}`}
                                aria-label={`Șterge ${u.name}`}
                                className="p-1.5 rounded-full tahoe-btn-secondary text-white/75 hover:text-rose-400 inline-flex items-center justify-center cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Tabel utilizatori și roluri"
              className={TAHOE_TABLE_WRAPPER_CLASS}
            >
              <div className={TAHOE_TABLE_SCROLL_CLASS}>
                <table className="w-full text-left" style={TAHOE_TABLE_STYLE}>
                  <thead>
                    <tr>
                      <CheckboxTh
                        checked={usersSelection.isAllVisibleSelected}
                        indeterminate={usersSelection.isSomeVisibleSelected}
                        onChange={usersSelection.toggleAllVisible}
                        ariaLabel="Selectează toți utilizatorii de pe pagină"
                      />
                      <SortableTh label="#" sort={null} align="center" className="w-10" />
                      <SortableTh
                        label="Utilizator"
                        sortKey="name"
                        sort={userSort}
                        onToggle={(k) => setUserSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Email"
                        sortKey="email"
                        sort={userSort}
                        onToggle={(k) => setUserSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Rol"
                        sortKey="role"
                        sort={userSort}
                        onToggle={(k) => setUserSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Status"
                        sortKey="status"
                        sort={userSort}
                        onToggle={(k) => setUserSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Ultima autentificare"
                        sortKey="lastLogin"
                        sort={userSort}
                        onToggle={(k) => setUserSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh label="Acțiuni" sort={null} align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-white/60 font-semibold">
                          Se încarcă utilizatorii...
                        </td>
                      </tr>
                    ) : visibleUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-white/55 font-semibold">
                          Niciun utilizator găsit.
                        </td>
                      </tr>
                    ) : (
                      visibleUsers.map((u, idx) => {
                        const roleMeta = roleBadgeMeta(u.role);
                        const statusMeta = statusBadgeMeta(u.status);
                        const invCopyKey = `inv-${u.id}`;
                        const hasInviteLink = Boolean(u.inviteToken);
                        const selected = usersSelection.isSelected(u.id);

                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-[#0A84FF]/10 transition-colors"
                            style={getTahoeRowStyle(idx, selected)}
                          >
                            <td className="px-2 text-center" style={TAHOE_CELL_BORDER_STYLE}>
                              <BulkCheckbox
                                checked={selected}
                                onChange={() => usersSelection.toggleOne(u.id)}
                                ariaLabel={`Selectează ${u.name}`}
                              />
                            </td>
                            <td
                              className="px-2.5 text-center text-white/50 font-semibold tabular-nums"
                              style={TAHOE_CELL_BORDER_STYLE}
                            >
                              {usersStartIdx + idx + 1}
                            </td>
                            <th
                              scope="row"
                              className="px-2.5 font-bold text-white whitespace-nowrap"
                              style={TAHOE_CELL_BORDER_STYLE}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-[#0A84FF]/20 border border-[#0A84FF]/35 text-[#64D2FF] font-extrabold text-[11px] flex items-center justify-center shrink-0">
                                  {u.name
                                    .split(' ')
                                    .map((p) => p[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
                                </span>
                                <div className="leading-tight">
                                  <div className="text-xs font-extrabold text-white leading-tight">
                                    {u.name}
                                  </div>
                                  <div className="text-[10.5px] font-medium text-white/50 leading-tight">
                                    @{u.username}
                                  </div>
                                </div>
                              </div>
                            </th>

                            <td
                              className="px-2.5 font-medium text-white/80 whitespace-nowrap"
                              style={TAHOE_CELL_BORDER_STYLE}
                            >
                              {u.email}
                            </td>

                            <td
                              className="px-2.5 whitespace-nowrap"
                              style={TAHOE_CELL_BORDER_STYLE}
                            >
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleMeta.badgeClass}`}
                              >
                                {roleMeta.label}
                              </span>
                            </td>

                            <td
                              className="px-2.5 whitespace-nowrap"
                              style={TAHOE_CELL_BORDER_STYLE}
                            >
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.cls}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                <span>{statusMeta.label}</span>
                              </span>
                            </td>

                            <td
                              className="px-2.5 text-white/65 tabular-nums whitespace-nowrap"
                              style={TAHOE_CELL_BORDER_STYLE}
                            >
                              {formatDateRo(u.lastLoginAt)}
                            </td>

                            <td
                              className="px-2.5 whitespace-nowrap text-right"
                              style={TAHOE_CELL_BORDER_STYLE}
                            >
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {hasInviteLink ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyText(
                                        buildInviteUrl(u.inviteToken || ''),
                                        invCopyKey
                                      )
                                    }
                                    title="Copiază link invitație"
                                    className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-white/85 hover:text-white text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                                  >
                                    {copiedKey === invCopyKey ? (
                                      <>
                                        <Check className="w-3 h-3 text-[#30D158]" />
                                        <span>Copiat</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Invitație</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateInvite(u)}
                                    title="Generează link de invitație / resetare parolă"
                                    className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[10.5px] font-semibold text-white/80 hover:text-white inline-flex items-center gap-1 cursor-pointer transition"
                                  >
                                    {copiedKey === invCopyKey ? (
                                      <>
                                        <Check className="w-3 h-3 text-[#30D158]" />
                                        <span>Copiat</span>
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Invitație</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openEditModal(u)}
                                  title="Editează utilizator"
                                  aria-label={`Editează ${u.name}`}
                                  className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {u.id !== currentUserId &&
                                  (confirmDeleteId === u.id ? (
                                    <span className="inline-flex items-center gap-1 pl-1">
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmDelete(u.id)}
                                        className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10.5px] font-extrabold cursor-pointer"
                                      >
                                        Șterge
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[10.5px] font-bold cursor-pointer"
                                      >
                                        Nu
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(u.id)}
                                      title={`Șterge ${u.name}`}
                                      aria-label={`Șterge ${u.name}`}
                                      className="p-1.5 rounded-full tahoe-btn-secondary text-white/75 hover:text-rose-400 inline-flex items-center justify-center cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ListPaginationBar
            total={usersTotal}
            startIdx={usersStartIdx}
            endIdx={usersEndIdx}
            pageSize={usersPageSize}
            onPageSizeChange={setUsersPageSize}
            page={usersSafePage}
            totalPages={usersPageCount}
            onPageChange={setUsersPage}
            unfilteredTotal={staffUsers.length}
            unfilteredLabel="total utilizatori"
          />
        </div>
      ) : (
        <div className="tahoe-glass rounded-[24px] p-4 sm:p-5 space-y-4">
          {/* General Driver Test Link Bar + Carduri/Listă switch */}
          <div className="p-3.5 rounded-2xl tahoe-card-inner flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-[#30D158]/20 border border-[#30D158]/35 text-[#30D158] flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white">
                  Portal Șoferi — Link General (Test fără parolă)
                </div>
                <div className="text-[11px] text-[#64D2FF] font-semibold truncate">
                  {generalDriverUrl}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ViewModeToggle
                value={linksViewMode}
                onChange={setLinksViewMode}
                ariaLabel="Mod afișare linkuri șoferi"
              />
              <ExportExcelButton
                onClick={() => handleExportDriverLinksExcel(sortedTrailers)}
                count={sortedTrailers.length}
                disabled={sortedTrailers.length === 0}
              />
              <button
                type="button"
                onClick={() => handleCopyText(generalDriverUrl, 'drv-all')}
                className="px-3.5 py-2 rounded-full tahoe-btn-primary text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'drv-all' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiat</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiază link</span>
                  </>
                )}
              </button>
              <a
                href={generalDriverUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Deschide</span>
              </a>
            </div>
          </div>

          {bulkFeedback && (
            <div className="p-3 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/35 text-xs font-bold text-[#30D158] flex items-center justify-between gap-2">
              <span>{bulkFeedback}</span>
              <button
                type="button"
                onClick={() => setBulkFeedback(null)}
                className="px-2.5 py-0.5 rounded-full bg-white/10 text-white cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          <BulkActionBar
            selectedCount={linksSelection.selectedCount}
            totalFilteredCount={sortedTrailers.length}
            onSelectAllFiltered={linksSelection.selectAllFiltered}
            onClearSelection={linksSelection.clearSelection}
            onBulkExport={() => handleExportDriverLinksExcel(selectedTrailerItems)}
            extraActions={
              <button
                type="button"
                onClick={handleBulkCopyDriverLinks}
                className="px-3 py-1.5 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiază linkuri ({linksSelection.selectedCount})</span>
              </button>
            }
            itemNounSingular="ansamblu selectat"
            itemNounPlural="ansambluri selectate"
          />

          {linksViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleTrailers.map((t, idx) => {
                const url = buildDriverPortalUrl(t.id);
                const copyKey = `drv-${t.id}`;
                const selected = linksSelection.isSelected(t.id);
                return (
                  <div
                    key={t.id}
                    className={`tahoe-card-inner rounded-[20px] p-4 border flex flex-col justify-between gap-2.5 ${
                      selected
                        ? 'border-[#0A84FF] bg-[#0A84FF]/10'
                        : 'border-white/12'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <BulkCheckbox
                            checked={selected}
                            onChange={() => linksSelection.toggleOne(t.id)}
                            ariaLabel={`Selectează ${t.id}`}
                          />
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/75 text-[10.5px] font-bold tabular-nums">
                            #{linksStartIdx + idx + 1}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-[#64D2FF] tabular-nums">
                          {t.id}
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-white">
                        {t.tractorId}
                      </div>
                      <div className="text-xs text-white/80 font-semibold">
                        Șofer: {t.driver1.name}
                      </div>
                      <div className="text-[11px] text-white/55 truncate">{url}</div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyText(url, copyKey)}
                        title={copiedKey === copyKey ? 'Link copiat' : 'Copiază link'}
                        aria-label={`Copiază link ${t.id}`}
                        className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                      >
                        {copiedKey === copyKey ? (
                          <Check className="w-3.5 h-3.5 text-[#30D158]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        title="Deschide Portal Cabină"
                        className="px-3 py-1 rounded-full tahoe-btn-secondary text-[11px] font-semibold text-white/85 hover:text-white inline-flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Cabină</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Linkuri directe Portal Șoferi pe camioane"
              className={TAHOE_TABLE_WRAPPER_CLASS}
            >
              <div className={TAHOE_TABLE_SCROLL_CLASS}>
                <table className="w-full text-left" style={TAHOE_TABLE_STYLE}>
                  <thead>
                    <tr>
                      <CheckboxTh
                        checked={linksSelection.isAllVisibleSelected}
                        indeterminate={linksSelection.isSomeVisibleSelected}
                        onChange={linksSelection.toggleAllVisible}
                        ariaLabel="Selectează toate linkurile de pe pagină"
                      />
                      <SortableTh label="#" sort={null} align="center" className="w-10" />
                      <SortableTh
                        label="Ansamblu"
                        sortKey="assembly"
                        sort={linksSort}
                        onToggle={(k) => setLinksSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Șofer"
                        sortKey="driver"
                        sort={linksSort}
                        onToggle={(k) => setLinksSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh
                        label="Link dedicat cabină"
                        sortKey="url"
                        sort={linksSort}
                        onToggle={(k) => setLinksSort((p) => toggleSortState(p, k))}
                      />
                      <SortableTh label="Acțiuni" sort={null} align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTrailers.map((t, idx) => {
                      const url = buildDriverPortalUrl(t.id);
                      const copyKey = `drv-${t.id}`;
                      const selected = linksSelection.isSelected(t.id);
                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-[#0A84FF]/10 transition-colors"
                          style={getTahoeRowStyle(idx, selected)}
                        >
                          <td className="px-2 text-center" style={TAHOE_CELL_BORDER_STYLE}>
                            <BulkCheckbox
                              checked={selected}
                              onChange={() => linksSelection.toggleOne(t.id)}
                              ariaLabel={`Selectează ${t.id}`}
                            />
                          </td>
                          <td
                            className="px-2.5 text-center text-white/50 font-semibold tabular-nums"
                            style={TAHOE_CELL_BORDER_STYLE}
                          >
                            {linksStartIdx + idx + 1}
                          </td>
                          <th
                            scope="row"
                            className="py-2 px-2.5 font-extrabold text-white whitespace-nowrap"
                            style={TAHOE_CELL_BORDER_STYLE}
                          >
                            {t.tractorId} · <span className="text-[#64D2FF]">{t.id}</span>
                          </th>
                          <td
                            className="py-2 px-2.5 font-semibold text-white/85 whitespace-nowrap"
                            style={TAHOE_CELL_BORDER_STYLE}
                          >
                            {t.driver1.name}
                          </td>
                          <td
                            className="py-2 px-2.5 font-medium text-white/70 truncate max-w-xs"
                            style={TAHOE_CELL_BORDER_STYLE}
                          >
                            {url}
                          </td>
                          <td
                            className="py-2 px-2.5 whitespace-nowrap text-right"
                            style={TAHOE_CELL_BORDER_STYLE}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyText(url, copyKey)}
                                title={copiedKey === copyKey ? 'Link copiat' : 'Copiază link'}
                                aria-label={`Copiază link ${t.id}`}
                                className="p-1.5 rounded-full tahoe-btn-secondary text-white/80 hover:text-white inline-flex items-center justify-center cursor-pointer transition"
                              >
                                {copiedKey === copyKey ? (
                                  <Check className="w-3.5 h-3.5 text-[#30D158]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                title="Deschide Portal Cabină"
                                className="px-2.5 py-1 rounded-full tahoe-btn-secondary text-[10.5px] font-semibold text-white/85 hover:text-white inline-flex items-center gap-1 transition"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Cabină</span>
                              </a>
                            </div>
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
            total={linksTotal}
            startIdx={linksStartIdx}
            endIdx={linksEndIdx}
            pageSize={linksPageSize}
            onPageSizeChange={setLinksPageSize}
            page={linksSafePage}
            totalPages={linksPageCount}
            onPageChange={setLinksPage}
            unfilteredTotal={trailers.length}
            unfilteredLabel="total ansambluri"
          />
        </div>
      )}

      {/* =====================================================================
          MODAL 1: INVITĂ UTILIZATOR (<dialog closedby="any">)
      ====================================================================== */}
      <dialog
        ref={inviteDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="invite-user-dialog-title"
        className="m-auto w-[min(94vw,460px)] rounded-[28px] tahoe-glass-elevated p-6 text-[#f5f5f7] border border-white/15 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-nowrap items-start justify-between gap-3 mb-5">
          <h2 id="invite-user-dialog-title" className="text-lg font-extrabold text-white">
            {createdInviteUser ? 'Invitație pregătită' : 'Invită utilizator'}
          </h2>
          <button
            type="button"
            onClick={closeInviteModal}
            aria-label="Închide fereastra"
            className="w-9 h-9 rounded-full shrink-0 tahoe-btn-secondary flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdInviteUser && createdInviteUser.inviteToken ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl tahoe-card-inner space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-white">{createdInviteUser.name}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    roleBadgeMeta(createdInviteUser.role).badgeClass
                  }`}
                >
                  {roleBadgeMeta(createdInviteUser.role).label}
                </span>
              </div>
              <div className="text-white/70">{createdInviteUser.email}</div>
            </div>

            <div>
              <label
                htmlFor="generated-invite-link"
                className="block text-xs font-bold text-white/80 mb-1.5"
              >
                Link activare cont
              </label>
              <input
                id="generated-invite-link"
                name="generatedInviteLink"
                type="text"
                readOnly
                value={buildInviteUrl(createdInviteUser.inviteToken)}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full min-h-[44px] tahoe-card-inner rounded-full px-4 py-2 text-xs font-semibold text-[#64D2FF] border border-white/15 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    buildInviteUrl(createdInviteUser.inviteToken || ''),
                    'modal-inv-copy'
                  )
                }
                className="flex-1 min-h-[44px] px-4 rounded-full tahoe-btn-primary text-xs font-extrabold text-white inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedKey === 'modal-inv-copy' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Link copiat</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiază linkul</span>
                  </>
                )}
              </button>

              <a
                href={`mailto:${encodeURIComponent(
                  createdInviteUser.email
                )}?subject=${encodeURIComponent(
                  'Invitație acces — Blue Trans Spedition'
                )}&body=${encodeURIComponent(
                  `Salut ${createdInviteUser.name},\n\nActivează-ți contul aici:\n${buildInviteUrl(
                    createdInviteUser.inviteToken
                  )}`
                )}`}
                className="min-h-[44px] px-4 rounded-full tahoe-btn-secondary text-xs font-bold text-white inline-flex items-center justify-center gap-1.5"
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            {invError && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-semibold"
              >
                {invError}
              </div>
            )}

            <div>
              <label htmlFor="inv-name" className="block text-xs font-bold text-white/80 mb-1.5">
                Nume
              </label>
              <input
                id="inv-name"
                name="name"
                type="text"
                autoComplete="off"
                required
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                placeholder="Ex: Ion Popescu"
                className="w-full min-h-[44px] tahoe-card-inner rounded-full px-4 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-email" className="block text-xs font-bold text-white/80 mb-1.5">
                  Email
                </label>
                <input
                  id="inv-email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="calin@bluetrans.ro"
                  className="w-full min-h-[44px] tahoe-card-inner rounded-full px-4 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-username"
                  className="block text-xs font-bold text-white/80 mb-1.5"
                >
                  Utilizator (opțional)
                </label>
                <input
                  id="inv-username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={invUsername}
                  onChange={(e) => setInvUsername(e.target.value)}
                  placeholder="ion.popescu"
                  className="w-full min-h-[44px] tahoe-card-inner rounded-full px-4 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
              </div>
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold text-white/80">Rol</legend>
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                {STAFF_ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`px-3 py-2.5 rounded-full border inline-flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition ${
                      invRole === r.value
                        ? 'bg-[#0A84FF]/25 border-[#0A84FF] text-white'
                        : 'tahoe-card-inner border-white/15 text-white/75 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={invRole === r.value}
                      onChange={() => setInvRole(r.value)}
                      className="w-3.5 h-3.5 accent-[#0A84FF] cursor-pointer shrink-0"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold text-white/80">Activare</legend>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <label
                  className={`px-3 py-2 rounded-full border inline-flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition ${
                    invMode === 'LINK'
                      ? 'bg-[#0A84FF]/25 border-[#0A84FF] text-white'
                      : 'tahoe-card-inner border-white/15 text-white/75 hover:text-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="activationMode"
                    value="LINK"
                    checked={invMode === 'LINK'}
                    onChange={() => setInvMode('LINK')}
                    className="w-3.5 h-3.5 accent-[#0A84FF] cursor-pointer shrink-0"
                  />
                  <span>Link invitație</span>
                </label>

                <label
                  className={`px-3 py-2 rounded-full border inline-flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition ${
                    invMode === 'PASSWORD'
                      ? 'bg-[#0A84FF]/25 border-[#0A84FF] text-white'
                      : 'tahoe-card-inner border-white/15 text-white/75 hover:text-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="activationMode"
                    value="PASSWORD"
                    checked={invMode === 'PASSWORD'}
                    onChange={() => setInvMode('PASSWORD')}
                    className="w-3.5 h-3.5 accent-[#0A84FF] cursor-pointer shrink-0"
                  />
                  <span>Setează parolă</span>
                </label>
              </div>
            </fieldset>

            {invMode === 'PASSWORD' && (
              <div>
                <label htmlFor="inv-password" className="block text-xs font-bold text-white/80 mb-1.5">
                  Parolă (minim 6 caractere)
                </label>
                <div className="relative">
                  <input
                    id="inv-password"
                    name="initialPassword"
                    type={invShowPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={invPassword}
                    onChange={(e) => setInvPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] tahoe-card-inner rounded-full pl-4 pr-11 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                  />
                  <button
                    type="button"
                    onClick={() => setInvShowPw((v) => !v)}
                    aria-pressed={invShowPw}
                    aria-label={invShowPw ? 'Ascunde parola' : 'Arată parola'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/65 cursor-pointer"
                  >
                    {invShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeInviteModal}
                className="min-h-[42px] px-4 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={invSaving}
                className="min-h-[42px] px-5 rounded-full tahoe-btn-primary text-xs font-extrabold text-white cursor-pointer disabled:opacity-60"
              >
                {invMode === 'LINK' ? 'Generează invitația' : 'Creează contul'}
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* =====================================================================
          MODAL 2: EDITEAZĂ UTILIZATOR (<dialog closedby="any">)
      ====================================================================== */}
      <dialog
        ref={editDialogRef}
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
        aria-labelledby="edit-user-dialog-title"
        className="m-auto w-[min(94vw,460px)] rounded-[28px] tahoe-glass-elevated p-6 text-[#f5f5f7] border border-white/15 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-nowrap items-start justify-between gap-3 mb-5">
          <h2 id="edit-user-dialog-title" className="text-lg font-extrabold text-white">
            Editează utilizator
          </h2>
          <button
            type="button"
            onClick={closeEditModal}
            aria-label="Închide fereastra"
            className="w-9 h-9 rounded-full shrink-0 tahoe-btn-secondary flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-semibold"
              >
                {editError}
              </div>
            )}

            <div>
              <label htmlFor="edit-name" className="block text-xs font-bold text-white/80 mb-1.5">
                Nume
              </label>
              <input
                id="edit-name"
                name="name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full min-h-[44px] tahoe-card-inner rounded-full px-4 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-email" className="block text-xs font-bold text-white/80 mb-1.5">
                  Email
                </label>
                <input
                  id="edit-email"
                  name="email"
                  type="email"
                  spellCheck={false}
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full min-h-[44px] tahoe-card-inner rounded-full px-4 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-username"
                  className="block text-xs font-bold text-white/80 mb-1.5"
                >
                  Utilizator
                </label>
                <input
                  id="edit-username"
                  name="username"
                  type="text"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full min-h-[44px] tahoe-card-inner rounded-full px-4 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
              </div>
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold text-white/80">Rol</legend>
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                {STAFF_ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`px-3 py-2 rounded-full border inline-flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition ${
                      editRole === r.value
                        ? 'bg-[#0A84FF]/25 border-[#0A84FF] text-white'
                        : 'tahoe-card-inner border-white/15 text-white/75 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editRole"
                      value={r.value}
                      checked={editRole === r.value}
                      onChange={() => setEditRole(r.value)}
                      className="w-3.5 h-3.5 accent-[#0A84FF] cursor-pointer shrink-0"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold text-white/80">Status cont</legend>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {(
                  [
                    { value: 'ACTIVE', label: 'Activ' },
                    { value: 'DISABLED', label: 'Blocat' },
                  ] as const
                ).map((s) => (
                  <label
                    key={s.value}
                    className={`px-3 py-2 rounded-full border inline-flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition ${
                      editStatus === s.value
                        ? 'bg-[#0A84FF]/25 border-[#0A84FF] text-white'
                        : 'tahoe-card-inner border-white/15 text-white/75 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editStatus"
                      value={s.value}
                      checked={editStatus === s.value}
                      onChange={() => setEditStatus(s.value)}
                      className="w-3.5 h-3.5 accent-[#0A84FF] cursor-pointer shrink-0"
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="edit-new-password"
                className="block text-xs font-bold text-white/80 mb-1.5"
              >
                Schimbă parola (lasă gol dacă nu modifici)
              </label>
              <div className="relative">
                <input
                  id="edit-new-password"
                  name="newPassword"
                  type={editShowPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={6}
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] tahoe-card-inner rounded-full pl-4 pr-11 py-2 text-xs font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                />
                <button
                  type="button"
                  onClick={() => setEditShowPw((v) => !v)}
                  aria-pressed={editShowPw}
                  aria-label={editShowPw ? 'Ascunde parola' : 'Arată parola'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/65 cursor-pointer"
                >
                  {editShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="min-h-[42px] px-4 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="min-h-[42px] px-5 rounded-full tahoe-btn-primary text-xs font-extrabold text-white cursor-pointer disabled:opacity-60"
              >
                Salvează
              </button>
            </div>
          </form>
        )}
      </dialog>

      {showBulkEditUsers && (
        <div
          onClick={() => !bulkBusy && setShowBulkEditUsers(false)}
          className="modal-backdrop-lock fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-users-title"
            onSubmit={handleApplyBulkEditUsers}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[26px] tahoe-glass border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="bulk-edit-users-title" className="text-base font-extrabold text-white">
                  Editare în masă — Utilizatori ({usersSelection.selectedCount} selectați)
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Contul tău curent rămâne protejat la modificări în masă.
                </p>
              </div>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setShowBulkEditUsers(false)}
                aria-label="Închide"
                className="w-8 h-8 rounded-full tahoe-btn-secondary flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Rol
                </label>
                <select
                  aria-label="Rol utilizatori în masă"
                  value={bulkUserRole}
                  onChange={(e) =>
                    setBulkUserRole(e.target.value as 'KEEP' | StaffRoleType)
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/65 mb-1">
                  Status cont
                </label>
                <select
                  aria-label="Status utilizatori în masă"
                  value={bulkUserStatus}
                  onChange={(e) =>
                    setBulkUserStatus(
                      e.target.value as 'KEEP' | UserAccountStatus
                    )
                  }
                  className="w-full tahoe-card-inner rounded-xl px-3 py-2 text-white font-semibold border border-white/15"
                >
                  <option value="KEEP">Fără modificare</option>
                  <option value="ACTIVE">Activ</option>
                  <option value="DISABLED">Dezactivat</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setShowBulkEditUsers(false)}
                className="px-4 py-2 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={bulkBusy}
                className="px-5 py-2 rounded-full bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {bulkBusy ? 'Se aplică...' : 'Aplică modificările'}
              </button>
            </div>
          </form>
        </div>
      )}

      <BulkDeleteConfirmModal
        open={showBulkDeleteUsers}
        title="Ștergere în masă — Utilizatori"
        count={deletableSelectedUsers.length}
        previewLabels={deletableSelectedUsers.map((u) => `${u.name} (${u.email})`)}
        warningNote={
          selectedUserItems.some((u) => u.id === currentUserId)
            ? 'Contul tău curent este protejat și nu va fi șters.'
            : undefined
        }
        loading={bulkBusy}
        onCancel={() => !bulkBusy && setShowBulkDeleteUsers(false)}
        onConfirm={handleConfirmBulkDeleteUsers}
      />
    </div>
  );
};
