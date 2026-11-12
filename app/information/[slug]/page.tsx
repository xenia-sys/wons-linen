import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
const pages: Record<
  string,
  { title: string; eyebrow: string; paragraphs: string[] }
> = {
  "our-story": {
    title: "Linen, at your own pace.",
    eyebrow: "MEET WONS",
    paragraphs: [
      "WONS is taking shape around a simple idea: a wardrobe that leaves a little room to breathe. Easy silhouettes, natural textures and a palette that feels at home in the everyday.",
      "The first edit brings Women and Men into the same conversation, with relaxed shirts, thoughtful sets and simple shapes. This preview shares the direction of the collection as we prepare the details.",
      "The styles shown here are illustrated concepts with sample prices. Final product photography, fabric information and fit details will be shared before the collection opens for orders.",
    ],
  },
  "client-care": {
    title: "A little care, in every detail.",
    eyebrow: "CLIENT CARE",
    paragraphs: [
      "You can explore styles, choose colours and sizes, and save a selection in your bag. Preview products cannot be ordered. WONS contacts customers to confirm eligible orders and arrange payment.",
      "Confirmed garment measurements, fabric composition and care instructions will be listed with each style before launch. Preview sizes are not a final fitting guide.",
      "Shipping is free within Vietnam. Product prices include taxes and fees. No online payment is collected during checkout.",
    ],
  },
  privacy: {
    title: "Your visit, thoughtfully.",
    eyebrow: "PRIVACY & YOUR BAG",
    paragraphs: [
      "The bag stores only product variant identifiers and quantities in your browser’s local storage. It stays on this device until you remove the items or clear this site’s browser data. Details entered for preview products are not submitted or saved by WONS.",
      "When you place an order for available products, WONS saves your contact details, billing and delivery addresses, order items and any notes to process the order. Access to the order inbox is restricted to the store Owner. We use a coded request identifier to limit repeated submissions. No card or payment details are requested at checkout.",
      "The collection is loaded from WONS’s Supabase catalog and the website is hosted on Vercel. Requests pass through these services to deliver the website; hosting services may process technical request information. This preview does not include an advertising tracker or newsletter form.",
      "Customer accounts are optional. An order placed as a guest is not automatically linked to an account.",
    ],
  },
};
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: pages[slug]?.eyebrow ?? "Information" };
}
export default async function Information({ params }: Props) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return (
    <article className="information-page">
      <p className="eyebrow">{page.eyebrow}</p>
      <h1>{page.title}</h1>
      {page.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <Link href="/shop" className="underlined-link">
        Explore the collection →
      </Link>
    </article>
  );
}
