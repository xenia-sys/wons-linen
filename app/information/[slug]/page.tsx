import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import policies from "../../../content/store-policies.json";
import { policyLinks } from "../../../lib/policy-links";
import { getInformationCopy } from "../../../lib/information-content";
import { informationParagraphs, isInformationPage } from "../../../lib/information-pages";
import "./policy.css";

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
  return { title: isInformationPage(slug) ? (await getInformationCopy(slug)).title : "Information" };
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
  if (!isInformationPage(slug)) notFound();
  const page = await getInformationCopy(slug);
  return (
    <article className="information-page">
      <p className="eyebrow">{page.eyebrow}</p>
      <h1>{page.title}</h1>
      {informationParagraphs(page.body).map((p, index) => (
        <p key={index}>{p}</p>
      ))}
      <Link href="/shop" className="underlined-link">
        Explore the collection →
      </Link>
    </article>
  );
}
