"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="information-page">
      <p className="eyebrow">A MOMENT TO PAUSE</p>
      <h1>We couldn’t load this page.</h1>
      <p>Please try again in a moment. No order or payment has been placed.</p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
