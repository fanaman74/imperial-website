import { createPublicClient } from './supabase-server';

export interface ClientCartItem {
  id: string | number;
  name: string;
  quantity: number;
  /** Client-supplied price — IGNORED. Recomputed from the DB. */
  price?: number;
}

export interface PricedItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PricedOrder {
  items: PricedItem[];
  total: number;
}

export class OrderPricingError extends Error {}

/**
 * Takeaway price = explicit price_takeaway if set, else restaurant price × 0.9,
 * rounded to cents. Mirrors the display logic in components/Menu.tsx — the
 * single source of truth lives here, server-side.
 */
export function takeawayPrice(priceRestaurant: number, priceTakeaway: number | null): number {
  if (priceTakeaway != null) return Math.round(priceTakeaway * 100) / 100;
  return Math.round(priceRestaurant * 0.9 * 100) / 100;
}

/**
 * Recompute line prices and total from authoritative DB prices.
 *
 * Never trust client-supplied prices or totals: a malicious client can POST any
 * `price`/`total` it likes. We keep the client's item ids and quantities, look up
 * the real prices, and recompute everything. Throws OrderPricingError if any id
 * is unknown or inactive.
 */
export async function recomputeOrder(items: ClientCartItem[]): Promise<PricedOrder> {
  const ids = items.map(i => String(i.id));
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('imperial_items')
    .select('id, price_restaurant, price_takeaway, active')
    .in('id', ids);

  if (error) throw new OrderPricingError('Price lookup failed');

  const priceMap = new Map<string, number>();
  for (const row of data || []) {
    if (row.active === false) continue;
    priceMap.set(
      String(row.id),
      takeawayPrice(Number(row.price_restaurant), row.price_takeaway != null ? Number(row.price_takeaway) : null),
    );
  }

  const priced: PricedItem[] = items.map(i => {
    const price = priceMap.get(String(i.id));
    if (price == null) throw new OrderPricingError(`Unknown or unavailable item: ${i.id}`);
    return { id: String(i.id), name: i.name, quantity: i.quantity, price };
  });

  const total = Math.round(priced.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
  return { items: priced, total };
}
