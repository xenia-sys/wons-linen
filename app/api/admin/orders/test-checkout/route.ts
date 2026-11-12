import { NextResponse } from "next/server";
import { AdminError, adminError, authorizedStaff } from "../../../../../lib/admin-server";
import { checkoutGatewaySecret } from "../../../../../lib/checkout-config";
import { createTestCheckoutCookie, TEST_CHECKOUT_COOKIE, TEST_CHECKOUT_SECONDS } from "../../../../../lib/test-checkout";

export async function POST(request: Request) {
  try {
    await authorizedStaff(request, true);
    const secret = checkoutGatewaySecret();
    if (!secret) throw new AdminError("Test checkout is unavailable on this website.", 503);
    const response = NextResponse.json({ ready: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(TEST_CHECKOUT_COOKIE, createTestCheckoutCookie(secret), {
      httpOnly: true, sameSite: "strict", secure: true, path: "/", maxAge: TEST_CHECKOUT_SECONDS,
    });
    return response;
  } catch (error) {
    return adminError(error);
  }
}
