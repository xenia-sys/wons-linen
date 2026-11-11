import { createClient, type AuthError, type SupabaseClient } from "@supabase/supabase-js";
import type { Address, OrderSummary } from "./customer-account";

type AddressRow = Address & { user_id: string };
type CustomerDatabase = {
  public: {
    Tables: {
      customer_addresses: {
        Row: AddressRow;
        Insert: AddressRow;
        Update: Partial<AddressRow>;
        Relationships: [];
      };
      customer_order_summaries: {
        Row: OrderSummary & { user_id: string | null };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      staff_profile: { Args: never; Returns: { role: string } | null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let client: SupabaseClient<CustomerDatabase> | undefined;

export function customerAuth() {
  return client ??= createClient<CustomerDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: (input, init) => {
          const timeout = AbortSignal.timeout(12000);
          return fetch(input, {
            ...init,
            signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
          });
        },
      },
      auth: {
        storageKey: "wons.customer.auth",
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

export function accountRedirect() {
  return new URL("/account", window.location.origin).href;
}

export function customerAuthMessage(error: AuthError) {
  if (error.status === 429)
    return "Too many attempts. Please wait a moment and try again.";
  switch (error.code) {
    case "email_address_not_authorized":
    case "unexpected_failure":
      return "We could not send your email right now. Please try again later.";
    case "invalid_credentials":
      return "The email or password was not accepted. You can also use a sign-in link.";
    case "weak_password":
      return "Choose a stronger password and try again.";
    case "same_password":
      return "Choose a password different from your current password.";
    case "reauthentication_not_valid":
      return "The verification code was not accepted. Request a new code and try again.";
    default:
      return "We could not complete that request. Please try again.";
  }
}
