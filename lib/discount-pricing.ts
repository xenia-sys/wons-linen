import { cache } from "react";
import { createPublicSupabaseClient } from "./supabase";

export type DiscountPricing = { rates: Record<string, number>; next_change_at: string | null };

export const getDiscountPricing = cache(async (): Promise<DiscountPricing> => {
  const { data, error } = await createPublicSupabaseClient()
    .rpc("current_wons_discount_pricing").abortSignal(AbortSignal.timeout(8000));
  if (error || !data?.rates)
    throw Error("WONS pricing could not be loaded. Please try again shortly.");
  return data as DiscountPricing;
});
