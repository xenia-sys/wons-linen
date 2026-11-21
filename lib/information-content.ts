import { cache } from "react";
import { informationPages, type InformationCopy, type InformationPageId } from "./information-pages";
import { createPublicSupabaseClient } from "./supabase";

export const getInformationCopy = cache(async (id: InformationPageId): Promise<InformationCopy> => {
  try {
    const { data, error } = await createPublicSupabaseClient()
      .from("information_pages").select("eyebrow,title,body").eq("id", id)
      .abortSignal(AbortSignal.timeout(4000)).maybeSingle();
    if (!error && data) return data;
  } catch {
    // Keep these storefront pages available if the content service is unavailable.
  }
  return informationPages[id];
});
