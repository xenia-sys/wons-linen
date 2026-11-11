"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  DISPLAY_CURRENCY_KEY,
  formatDisplayPrice,
  parseUsdQuote,
  type DisplayCurrency,
} from "../lib/display-currency";

type CurrencyContextValue = {
  currency: DisplayCurrency;
  requested: DisplayCurrency;
  pending: boolean;
  unavailable: boolean;
  choose: (currency: DisplayCurrency) => void;
  format: (amountVnd: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function rememberCurrency(currency: DisplayCurrency) {
  try {
    localStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
  } catch {
    // The switch still works for this visit when browser storage is blocked.
  }
}

export function DisplayCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [requested, setRequested] = useState<DisplayCurrency>("VND");
  const [quote, setQuote] = useState<ReturnType<typeof parseUsdQuote>>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISPLAY_CURRENCY_KEY) === "USD") setRequested("USD");
    } catch {
      // Default to VND.
    }
  }, []);

  useEffect(() => {
    if (requested !== "USD" || quote) return;
    const controller = new AbortController();

    async function loadQuote() {
      try {
        const response = await fetch("/api/display-currency", {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]),
        });
        const nextQuote = response.ok ? parseUsdQuote(await response.json()) : null;
        if (!nextQuote) throw new Error("USD reference rate unavailable");
        if (controller.signal.aborted) return;
        setQuote(nextQuote);
        rememberCurrency("USD");
      } catch {
        if (controller.signal.aborted) return;
        setRequested("VND");
        setUnavailable(true);
      }
    }

    void loadQuote();
    return () => controller.abort();
  }, [requested, quote]);

  const activeQuote = requested === "USD" ? quote : null;

  return (
    <CurrencyContext.Provider value={{
      currency: activeQuote ? "USD" : "VND",
      requested,
      pending: requested === "USD" && !quote,
      unavailable,
      choose(next) {
        setRequested(next);
        setUnavailable(false);
        if (next === "VND" || quote) rememberCurrency(next);
      },
      format: (amountVnd) => formatDisplayPrice(amountVnd, activeQuote),
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error("Display currency requires the storefront provider.");
  return value;
}
