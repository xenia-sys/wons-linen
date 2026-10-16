// Fail closed until authoritative prices/inventory, delivery and payment pass UAT.
// An environment flag alone must never enable an unfinished order endpoint.
export async function POST() {
  return Response.json(
    {
      code: "CHECKOUT_NOT_OPEN",
      message:
        "WONS orders are not open yet. No order or payment has been created.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
