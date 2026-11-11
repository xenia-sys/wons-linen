import { parseUsdQuote } from "../../../lib/display-currency";

export async function GET() {
  try {
    const response = await fetch("https://api.frankfurter.dev/v2/rate/USD/VND", {
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(3500),
    });
    const quote = response.ok ? parseUsdQuote(await response.json()) : null;
    if (quote) {
      return Response.json(quote, {
        headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
      });
    }
  } catch {
    // An unavailable reference rate must not affect VND shopping.
  }
  return Response.json({ error: "USD_RATE_UNAVAILABLE" }, { status: 503 });
}
