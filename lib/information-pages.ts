export const informationPages = {
  "our-story": {
    label: "Our story",
    title: "Linen, at your own pace.",
    eyebrow: "MEET WONS",
    body: [
      "WONS is taking shape around a simple idea: a wardrobe that leaves a little room to breathe. Easy silhouettes, natural textures and a palette that feels at home in the everyday.",
      "The first edit brings Women and Men into the same conversation, with relaxed shirts, thoughtful sets and simple shapes.",
      "Explore the collection for current styles, colours and product details.",
    ].join("\n\n"),
  },
  "client-care": {
    label: "Client care",
    title: "A little care, in every detail.",
    eyebrow: "CLIENT CARE",
    body: [
      "Explore styles, choose colours and sizes, and add available items to your bag. WONS contacts customers by WhatsApp or email to confirm orders.",
      "Each product page lists the available sizes and fabric. For measurements, fit or care advice, contact WONS at linenwons@gmail.com or 0912 562 991 (call, WhatsApp or Zalo) before ordering.",
      "Shipping is free within Vietnam. Product prices include taxes and fees. The only payment method is cash on delivery (COD).",
    ].join("\n\n"),
  },
} as const;

export type InformationPageId = keyof typeof informationPages;
export type InformationCopy = { eyebrow: string; title: string; body: string };
export type InformationPage = InformationCopy & { id: InformationPageId; version: number };

export const informationLimits = { eyebrow: 60, title: 120, body: 10000 } as const;
export const informationFields = { eyebrow: "Short label above the title", title: "Page title", body: "Page content" } as const;
export const informationPageSelect = "id,eyebrow,title,body,version";

export function isInformationPage(value: unknown): value is InformationPageId {
  return typeof value === "string" && Object.hasOwn(informationPages, value);
}

export function informationParagraphs(body: string) {
  return body.trim().split(/\n[\t ]*\n\s*/).filter(Boolean);
}

export function parseInformationEdit(value: unknown) {
  if (typeof value !== "object" || value === null || !("version" in value) ||
      typeof value.version !== "number" || !Number.isInteger(value.version) ||
      value.version < 1 || value.version > 2147483647)
    throw Error("Reload the latest page content before saving.");

  const { version } = value;
  const source = value as Record<string, unknown>;
  const read = (key: keyof InformationCopy) => {
    const raw = source[key];
    const text = typeof raw === "string" ? raw.replace(/\r\n?/g, "\n").trim() : "";
    if (!text || text.length > informationLimits[key])
      throw Error(`${informationFields[key]} must contain 1–${informationLimits[key]} characters.`);
    if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(text) || (key !== "body" && /[\n\t]/.test(text)))
      throw Error("Use plain text and keep the page title and short label on one line.");
    return text;
  };
  return { version, copy: { eyebrow: read("eyebrow"), title: read("title"), body: read("body") } };
}
