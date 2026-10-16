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
      "This is the WONS collection preview. You can explore styles, choose preview colours and sizes, and save a selection in your bag. Orders and payments are not open yet.",
      "Confirmed garment measurements, fabric composition and care instructions will be listed with each style before launch. Preview sizes are not a final fitting guide.",
      "Delivery areas, shipping rates, payment methods, returns and a direct client care contact are being prepared. These details will be available before any purchase can be placed.",
    ],
  },
  privacy: {
    title: "Your visit, thoughtfully.",
    eyebrow: "PRIVACY & YOUR BAG",
    paragraphs: [
      "The preview bag stores only product variant identifiers and quantities in your browser’s local storage. It stays on this device until you remove the items or clear this site’s browser data. No name, delivery address or payment details are collected by a checkout form in this preview.",
      "The collection is loaded from WONS’s Supabase catalog and the website is hosted on Vercel. Requests pass through these services to deliver the website; hosting services may process technical request information. This preview does not include an advertising tracker or newsletter form.",
      "A complete store privacy policy, retention details and contact for privacy requests will be published before orders and customer accounts are enabled.",
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
