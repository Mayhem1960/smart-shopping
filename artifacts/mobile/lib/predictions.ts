import { Product } from './storage';

export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export function getStockStatus(product: Product): StockStatus {
  if (product.currentQuantity <= 0) return 'out';
  if (product.currentQuantity <= product.minThreshold * 0.5) return 'critical';
  if (product.currentQuantity <= product.minThreshold) return 'low';
  return 'ok';
}

/** Returns average daily consumption over the last 30 days, or null if insufficient data. */
export function getAvgDailyConsumption(product: Product): number | null {
  const events = product.usageHistory
    .filter((e) => e.type === 'consume')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (events.length < 1) return null;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => new Date(e.date).getTime() >= thirtyDaysAgo);

  if (recent.length === 0) return null;

  const totalConsumed = recent.reduce((sum, e) => sum + e.quantity, 0);
  const earliest = new Date(recent[0].date).getTime();
  const daysCovered = Math.max(1, (now - earliest) / (24 * 60 * 60 * 1000));

  const avg = totalConsumed / daysCovered;
  return avg > 0 ? avg : null;
}

/** Returns estimated days until stock runs out, or null if unknown. */
export function getDaysUntilEmpty(product: Product): number | null {
  if (product.currentQuantity <= 0) return 0;
  const avg = getAvgDailyConsumption(product);
  if (!avg) return null;
  return product.currentQuantity / avg;
}

/** Returns estimated next purchase date as a Date, or null. */
export function getNextBuyDate(product: Product): Date | null {
  const days = getDaysUntilEmpty(product);
  if (days === null || days === 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(days));
  return d;
}

export function formatDaysLeft(days: number | null): string {
  if (days === null) return 'Unknown';
  if (days <= 0) return 'Out of Stock';
  if (days < 1) return 'Less than a day';
  if (days < 2) return '1 day left';
  return `${Math.floor(days)} days left`;
}

export function stockFraction(product: Product): number {
  if (product.minThreshold <= 0) return product.currentQuantity > 0 ? 1 : 0;
  return Math.min(1, product.currentQuantity / (product.minThreshold * 2));
}

export function needsRestock(product: Product): boolean {
  // Only items at or below their threshold qualify — i.e. Running Low, Critical, or
  // Out of Stock. Items still "In Stock" are never suggested, even if a consumption
  // prediction says they may run out soon.
  const status = getStockStatus(product);
  return status === 'out' || status === 'critical' || status === 'low';
}
