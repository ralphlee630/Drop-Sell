import type { Item } from './types';

/** Returns true if the item's deadline has passed and it hasn't sold yet.
 *  Applies whether the item is still waiting to be dropped off OR already
 *  dropped and sitting unsold at the hub — the deadline is a pickup/sale
 *  deadline, not just a "must arrive at hub" deadline. */
export function isOverdue(item: Item): boolean {
  return (
    new Date() > new Date(item.deadline_at) &&
    (item.status === 'pending_dropoff' || item.status === 'dropped')
  );
}

/** Returns the effective handling fee at the current moment */
export function calculateCurrentFee(item: Item): number {
  if (isOverdue(item)) {
    return item.base_handling_fee + item.late_handling_fee;
  }
  return item.base_handling_fee;
}

/** Returns the total amount (item price + current handling fee) */
export function calculateTotal(item: Item): number {
  return item.amount + calculateCurrentFee(item);
}

/**
 * Snaps the handling fee at purchase time (never recalculated retroactively).
 * This is the value stored in transactions.handling_fee_applied.
 */
export function snapshotFeeAtPurchase(item: Item): number {
  return calculateCurrentFee(item);
}

/** Human-readable countdown from now to the deadline */
export function formatDeadlineCountdown(deadlineIso: string): {
  label: string;
  isOverdue: boolean;
  isUrgent: boolean;
} {
  const deadline = new Date(deadlineIso);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    const elapsed = Math.abs(diffMs);
    const hours = Math.floor(elapsed / 3600000);
    if (hours < 24) return { label: `${hours}h overdue`, isOverdue: true, isUrgent: false };
    const days = Math.floor(elapsed / 86400000);
    return { label: `${days}d overdue`, isOverdue: true, isUrgent: false };
  }

  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return { label: `${hours}h left`, isOverdue: false, isUrgent: hours < 6 };
  const days = Math.floor(diffMs / 86400000);
  return { label: `${days}d left`, isOverdue: false, isUrgent: days <= 1 };
}

/** Format number as Philippine Peso */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Time elapsed since a timestamp (e.g. "2h ago", "3 days ago") */
export function timeAgo(isoString: string): string {
  const then = new Date(isoString);
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
