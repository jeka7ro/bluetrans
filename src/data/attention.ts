import type { CargoOrder, ClientShipmentProposal, TrailerUnit } from './mockData';
import { rankTrailersForOrder } from './ldmEngine';

export type AttentionSeverity = 'risk' | 'warn' | 'info';

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail: string;
  /** Pagina unde se rezolvă (id de tab din meniu) */
  tab: string;
}

const SEVERITY_RANK: Record<AttentionSeverity, number> = { risk: 0, warn: 1, info: 2 };
const LOW_DRIVE_HOURS = 2;
const FREE_LDM_OPPORTUNITY = 4;
const MAX_ITEMS = 8;

/** „Ce cere atenție azi” — doar lucrurile care cer o decizie, cele mai grave primele. */
export const buildAttentionItems = (
  trailers: TrailerUnit[],
  orders: CargoOrder[],
  proposals: ClientShipmentProposal[]
): AttentionItem[] => {
  const items: AttentionItem[] = [];

  orders.forEach((order) => {
    const best = rankTrailersForOrder(trailers, order).find((r) => r.verdict !== 'blocked');
    if (!best) {
      items.push({
        id: `order-nofit-${order.id}`,
        severity: 'risk',
        title: `Comanda ${order.id} nu încape pe nicio remorcă`,
        detail: `${order.client} · ${order.fromCity} → ${order.toCity} · ${order.ldm.toFixed(1)} LDM`,
        tab: 'planning',
      });
    } else {
      items.push({
        id: `order-fit-${order.id}`,
        severity: 'info',
        title: `Comandă de plasat: ${order.id} (${order.fromCity} → ${order.toCity})`,
        detail: `Recomandat: ${best.trailerId} · câștig estimat +${best.contributionEur} €`,
        tab: 'planning',
      });
    }
  });

  proposals
    .filter((p) => p.status === 'Pending review')
    .forEach((p) => {
      items.push({
        id: `proposal-${p.id}`,
        severity: p.hasConflictWarning ? 'warn' : 'info',
        title: `Ofertă de la ${p.clientName}`,
        detail: `${p.ldmRequested.toFixed(1)} LDM · ${p.offeredPriceEur} € · câștig estimat +${p.estimatedContributionEur} €${
          p.hasConflictWarning ? ' · conflict de capacitate' : ''
        }`,
        tab: 'offers',
      });
    });

  trailers.forEach((t) => {
    const hours = t.driver1.remainingDailyDriveHours;
    if (t.status === 'În tranzit' && hours < LOW_DRIVE_HOURS) {
      items.push({
        id: `driver-${t.id}`,
        severity: 'warn',
        title: `${t.driver1.name} mai poate conduce doar ${hours.toFixed(1)} h azi`,
        detail: `${t.id} · acum la ${t.currentLocation.city}`,
        tab: 'swap',
      });
    }
    if (t.freeLdm >= FREE_LDM_OPPORTUNITY) {
      items.push({
        id: `free-${t.id}`,
        severity: 'info',
        title: `${t.id} are ${t.freeLdm.toFixed(1)} LDM liberi`,
        detail: 'Poți trimite o ofertă de capacitate către clienți',
        tab: 'offers',
      });
    }
  });

  return items
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => SEVERITY_RANK[a.item.severity] - SEVERITY_RANK[b.item.severity] || a.idx - b.idx)
    .map((x) => x.item)
    .slice(0, MAX_ITEMS);
};
