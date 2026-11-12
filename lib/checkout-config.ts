export function checkoutGatewaySecret() {
  const key = process.env.WONS_ORDER_GATEWAY_SECRET;
  return process.env.VERCEL_ENV === "production" && key && /^[0-9a-f]{64}$/.test(key)
    ? key
    : undefined;
}
