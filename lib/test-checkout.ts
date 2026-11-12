import { createHmac, timingSafeEqual } from "node:crypto";

export const TEST_CHECKOUT_COOKIE = "__Host-wons-test-checkout";
export const TEST_CHECKOUT_SECONDS = 30 * 60;

function sign(secret: string, expiry: string) {
  return createHmac("sha256", secret).update(`wons-cod-test:v1:${expiry}`).digest("hex");
}

export function createTestCheckoutCookie(secret: string, now = Date.now()) {
  const expiry = String(now + TEST_CHECKOUT_SECONDS * 1000);
  return `${expiry}.${sign(secret, expiry)}`;
}

export function testCheckoutAllowed(token: string | undefined, secret: string, now = Date.now()) {
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token ?? "");
  if (!match) return false;
  const expiry = Number(match[1]);
  if (expiry <= now || expiry > now + TEST_CHECKOUT_SECONDS * 1000) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(sign(secret, match[1]), "hex"));
}

export function testCheckoutCookie(request: Request) {
  const prefix = TEST_CHECKOUT_COOKIE + "=";
  return request.headers.get("cookie")?.split(";").map(part => part.trim())
    .find(part => part.startsWith(prefix))?.slice(prefix.length);
}
