import type { OrderStatus } from "./orders.ts";

export const OVERVIEW_PERIODS = [7, 30, 90] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];
export function parseOverviewPeriod(value: string | null): OverviewPeriod | null {
  return value === null ? 30 : OVERVIEW_PERIODS.find(days => String(days) === value) ?? null;
}

type Sales = { revenue_vnd: number; units: number; orders: number };
export type OverviewPoint = Sales & { start_date: string; end_date: string };
export type OverviewReport = {
  start_date: string;
  end_date: string;
  sales: Sales;
  series: OverviewPoint[];
  inventory: { units: number; in_stock: number; low_stock: number; out_of_stock: number };
  order_counts: Partial<Record<OrderStatus, number>>;
};
