import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import policies from "../../../content/store-policies.json";
import { policyLinks } from "../../../lib/policy-links";
import "./policy.css";

const pages: Record<
  string,
  { title: string; eyebrow: string; paragraphs: string[] }
> = {
  "our-story": {
    title: "Linen, at your own pace.",
    eyebrow: "MEET WONS",
    paragraphs: [
      "WONS is taking shape around a simple idea: a wardrobe that leaves a little room to breathe. Easy silhouettes, natural textures and a palette that feels at home in the everyday.",
      "The first edit brings Women and Men into the same conversation, with relaxed shirts, thoughtful sets and simple shapes.",
      "Explore the collection for current styles, colours and product details.",
    ],
  },
  "client-care": {
    title: "A little care, in every detail.",
    eyebrow: "CLIENT CARE",
    paragraphs: [
      "Explore styles, choose colours and sizes, and add available items to your bag. WONS contacts customers by phone, Zalo or email to confirm orders.",
      "Each product page lists the available sizes and fabric. For measurements, fit or care advice, contact WONS at linenwons@gmail.com or 0912 562 991 (call or Zalo) before ordering.",
      "Shipping is free within Vietnam. Product prices include taxes and fees. The only payment method is cash on delivery (COD).",
    ],
  },
};
type PolicySlug = keyof typeof policies;
type Language = "vi" | "en";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};
type PolicyBlock = { kind: string; text?: string; items?: string[] };

function isPolicy(slug: string): slug is PolicySlug {
  return Object.hasOwn(policies, slug);
}

function policyUrl(href: string, lang: Language) {
  return lang === "vi" ? `${href}?lang=vi` : href;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { lang }] = await Promise.all([params, searchParams]);
  if (isPolicy(slug)) return { title: policies[slug][lang === "vi" ? "vi" : "en"].title };
  return { title: Object.hasOwn(pages, slug) ? pages[slug].eyebrow : "Information" };
}

const contacts: Record<string, string> = {
  "linenwons@gmail.com": "mailto:linenwons@gmail.com",
  "0912 562 991": "tel:+84912562991",
  "0914 841 991": "tel:+84914841991",
};

function policyText(value: string) {
  return value.split(/(linenwons@gmail\.com|0912 562 991|0914 841 991)/g).map((part, index) =>
    Object.hasOwn(contacts, part) ? <a key={index} href={contacts[part]}>{part}</a> : part,
  );
}

function PolicyCopy({ blocks }: { blocks: PolicyBlock[] }) {
  return blocks.map((block, index) => block.kind === "list" && block.items ? (
    <ul key={index}>
      {block.items.map((item) => <li key={item}>{policyText(item)}</li>)}
    </ul>
  ) : block.text ? <p key={index}>{policyText(block.text)}</p> : null);
}

function StorePolicy({ slug, lang }: { slug: PolicySlug; lang: Language }) {
  const { title, effectiveLabel, intro, sections } = policies[slug][lang];
  const { href } = policyLinks[slug];
  return (
    <article className="policy-page" lang={lang} aria-labelledby="policy-title">
      <header className="policy-header">
        <p className="eyebrow">WONS LINEN</p>
        <h1 id="policy-title">{title}</h1>
        <time dateTime="2026-11-21">{effectiveLabel}</time>
        <nav className="policy-language" aria-label={lang === "vi" ? "Ngôn ngữ chính sách" : "Policy language"}>
          <Link href={policyUrl(href, "vi")} hrefLang="vi" lang="vi" aria-current={lang === "vi" ? "page" : undefined}>Tiếng Việt</Link>
          <Link href={href} hrefLang="en" lang="en" aria-current={lang === "en" ? "page" : undefined}>English</Link>
        </nav>
      </header>
      <div className="policy-content">
        <PolicyCopy blocks={intro} />
        {sections.map(({ heading, blocks }) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <PolicyCopy blocks={blocks} />
          </section>
        ))}
      </div>
      <nav className="policy-related" aria-labelledby="related-policy-title">
        <h2 id="related-policy-title">{lang === "vi" ? "Chính sách liên quan" : "Related policies"}</h2>
        {Object.values(policyLinks).filter((other) => other.href !== href).map((other) => (
          <Link key={other.href} href={policyUrl(other.href, lang)}>{other[lang]}</Link>
        ))}
      </nav>
    </article>
  );
}

export default async function Information({ params, searchParams }: Props) {
  const [{ slug }, { lang }] = await Promise.all([params, searchParams]);
  if (isPolicy(slug)) return <StorePolicy slug={slug} lang={lang === "vi" ? "vi" : "en"} />;
  if (!Object.hasOwn(pages, slug)) notFound();
  const page = pages[slug];
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
