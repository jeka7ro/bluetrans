import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  MessageSquare,
  Navigation,
  Package,
  Receipt,
  Sparkles,
  X,
} from 'lucide-react';

export type HeaderNotificationKind =
  | 'driver_message'
  | 'admin_message'
  | 'driver_expense'
  | 'proposal'
  | 'order'
  | 'trip_assigned';

export interface HeaderNotificationItem {
  id: string;
  kind: HeaderNotificationKind;
  title: string;
  subtitle: string;
  targetTab: string;
  trailerId?: string;
  timeLabel?: string;
  priority?: number;
}

interface HeaderNotificationsMenuProps {
  items: HeaderNotificationItem[];
  seenIds: string[];
  onMarkSeen: (ids: string[]) => void;
  onNavigate?: (tab: string, trailerId?: string) => void;
}

const KIND_META: Record<
  HeaderNotificationKind,
  { label: string; icon: React.ElementType; toneClass: string }
> = {
  driver_message: {
    label: 'Mesaj șofer',
    icon: MessageSquare,
    toneClass: 'tps-notif-tone-blue',
  },
  admin_message: {
    label: 'Mesaj Admin',
    icon: MessageSquare,
    toneClass: 'tps-notif-tone-blue',
  },
  driver_expense: {
    label: 'Bon / Factură șofer',
    icon: Receipt,
    toneClass: 'tps-notif-tone-emerald',
  },
  proposal: {
    label: 'Ofertă client',
    icon: Sparkles,
    toneClass: 'tps-notif-tone-amber',
  },
  order: {
    label: 'Comandă nouă',
    icon: Package,
    toneClass: 'tps-notif-tone-purple',
  },
  trip_assigned: {
    label: 'Cursă alocată',
    icon: Navigation,
    toneClass: 'tps-notif-tone-emerald',
  },
};

export const HeaderNotificationsMenu: React.FC<HeaderNotificationsMenuProps> = ({
  items,
  seenIds,
  onMarkSeen,
  onNavigate,
}) => {
  const [open, setOpen] = useState(false);
  const [justOpenedIds, setJustOpenedIds] = useState<Set<string>>(() => new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);

  const seenSet = useMemo(() => new Set(seenIds), [seenIds]);

  const unreadItems = useMemo(
    () => items.filter((item) => !seenSet.has(item.id)),
    [items, seenSet]
  );
  const unreadCount = unreadItems.length;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setJustOpenedIds(new Set());
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setJustOpenedIds(new Set());
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setJustOpenedIds(new Set());
  };

  const handleToggle = () => {
    if (open) {
      closeMenu();
      return;
    }
    const newIds = unreadItems.map((item) => item.id);
    setJustOpenedIds(new Set(newIds));
    setOpen(true);
    if (newIds.length > 0) {
      onMarkSeen(newIds);
    }
  };

  const handleItemClick = (item: HeaderNotificationItem) => {
    if (!seenSet.has(item.id)) {
      onMarkSeen([item.id]);
    }
    closeMenu();
    if (onNavigate) {
      onNavigate(item.targetTab, item.trailerId);
    }
  };

  const ariaLabel =
    unreadCount > 0
      ? `${unreadCount} notificări noi`
      : 'Notificări — nicio notificare nouă';

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        data-testid="header-notifications-btn"
        data-unread-count={unreadCount}
        className="tps-offers-icon-btn relative w-9 h-9 rounded-full tahoe-btn-secondary flex items-center justify-center transition cursor-pointer shrink-0"
        title={ariaLabel}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell
          className={`tps-offers-bell-icon w-4 h-4 ${
            unreadCount > 0 ? 'text-[#FF9F0A]' : 'tps-notif-bell-idle'
          }`}
        />
        {unreadCount > 0 && (
          <span
            data-testid="header-notifications-badge"
            className="tps-offers-badge absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold tabular-nums leading-none flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Centru notificări"
          data-testid="header-notifications-popover"
          className="tps-notif-popover fixed inset-x-3 top-[78px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[390px] sm:max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl border overflow-hidden z-[90]"
        >
          <div className="tps-notif-header px-4 py-3 border-b flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-[#0A84FF] shrink-0" />
              <span className="text-xs font-bold tracking-tight truncate">
                Notificări recente
              </span>
              {justOpenedIds.size > 0 && (
                <span className="tps-notif-count-pill px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                  {justOpenedIds.size} {justOpenedIds.size === 1 ? 'nouă' : 'noi'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => onMarkSeen(unreadItems.map((item) => item.id))}
                  className="tps-notif-read-btn px-2 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                  title="Marchează toate ca citite"
                >
                  <CheckCheck className="w-3 h-3" />
                  Citit
                </button>
              )}
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Închide notificările"
                className="w-7 h-7 rounded-full tps-notif-close flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="tps-notif-list max-h-[min(65vh,420px)] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCheck className="w-7 h-7 text-[#30D158] mx-auto mb-2 opacity-85" />
                <p className="text-xs font-semibold">Nicio notificare nouă</p>
                <p className="text-[11px] opacity-65 mt-1">
                  Toate mesajele, bonurile și cursele sunt la zi.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const meta = KIND_META[item.kind];
                const Icon = meta.icon;
                const isNewlyViewed =
                  justOpenedIds.has(item.id) || !seenSet.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleItemClick(item)}
                    className={`tps-notif-item w-full text-left px-4 py-3 flex items-start gap-3 transition cursor-pointer ${
                      isNewlyViewed ? 'tps-notif-item-new' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.toneClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 truncate">
                          {meta.label}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.timeLabel && (
                            <span className="text-[10px] font-medium tabular-nums opacity-60">
                              {item.timeLabel}
                            </span>
                          )}
                          {isNewlyViewed && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#0A84FF] text-white leading-none">
                              NOU
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-bold leading-snug mt-0.5 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] opacity-75 leading-snug mt-0.5 line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40 shrink-0 self-center" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
