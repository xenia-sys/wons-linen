"use client";

import { useState } from "react";
import { adminFetch } from "../../lib/admin-browser";

export function StartCodTest() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setStarting(true);
    setError("");
    try {
      await adminFetch("/orders/test-checkout", { method: "POST" });
      window.location.assign("/checkout?test=1");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start test checkout.");
      setStarting(false);
    }
  }

  return (
    <>
      <button type="button" className="button dark" onClick={() => void start()} disabled={starting}>
        {starting ? "Starting test…" : "Start COD test"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
