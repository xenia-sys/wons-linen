import Link from "next/link";
export default function NotFound() {
  return (
    <section className="information-page">
      <p className="eyebrow">A DIFFERENT DIRECTION / 404</p>
      <h1>This page has wandered.</h1>
      <p>Let’s find your way back to the collection.</p>
      <Link className="button dark" href="/shop">
        Explore WONS →
      </Link>
    </section>
  );
}
