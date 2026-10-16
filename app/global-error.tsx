"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#faf8f4",
          color: "#32372d",
          fontFamily: "Arial, sans-serif",
          padding: "10vh 7vw",
        }}
      >
        <p>WONS LINEN</p>
        <h1>A moment to pause.</h1>
        <p>We couldn’t load the collection. Please try again shortly.</p>
        <button
          onClick={reset}
          style={{ padding: "14px 24px", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
