import { createHmac } from "node:crypto";
import { checkoutGatewaySecret } from "../../../lib/checkout-config.ts";
import { parseOrder } from "../../../lib/orders.ts";

const headers = { "Cache-Control": "no-store" };
const MAX_BODY = 24000;

function failure(code: string, message: string, status: number) {
  return Response.json({ code, message }, { status, headers });
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Order details are missing.");
  let bytes = 0;
  let raw = "";
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY) {
        await reader.cancel();
        throw new Error("The order details are too long.");
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const secret = checkoutGatewaySecret();
  if (!secret)
    return failure("CHECKOUT_NOT_OPEN", "WONS orders are not open on this website.", 503);
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin)
    return failure("INVALID_ORIGIN", "Please place your order from the WONS website.", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
    return failure("INVALID_ORDER", "Check your order details and try again.", 400);

  let order;
  try {
    order = parseOrder(await readBody(request));
  } catch (error) {
    return failure("INVALID_ORDER", error instanceof SyntaxError
      ? "Check your order details and try again."
      : error instanceof Error ? error.message : "Check your order details and try again.", 400);
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
  const clientKey = ip ? createHmac("sha256", secret).update(ip).digest("hex") : null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey)
    return failure("CHECKOUT_NOT_OPEN", "WONS orders are not open on this website.", 503);
  try {
    const response = await fetch(new URL("/rest/v1/rpc/submit_wons_order", supabaseUrl), {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ gateway_secret: secret, order_data: order, client_key: clientKey }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.code === "WN001")
        return failure("BAG_CHANGED", "A price or availability changed. Return to your bag and review your items.", 409);
      if (result.code === "WN002")
        return failure("ORDER_LIMIT", "Too many recent order requests. Please wait before trying again.", 429);
      if (result.code === "WN003")
        return failure("RETRY_DETAILS_CHANGED", "The original request may already have been received. Restore the original details or contact WONS before trying again.", 409);
      if (result.code === "22023")
        return failure("INVALID_ORDER", "Check your order details and try again.", 400);
      throw new Error("Order gateway unavailable.");
    }
    if (!Number.isSafeInteger(result?.order_number) || !Number.isSafeInteger(result?.total_vnd))
      throw new Error("Order receipt unavailable.");
    return Response.json({ order_number: result.order_number, total_vnd: result.total_vnd }, { status: 201, headers });
  } catch {
    return failure("ORDER_UNCONFIRMED", "We could not confirm your order yet. Retry here with the same details so it is not submitted twice.", 503);
  }
}
