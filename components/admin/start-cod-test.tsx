"use client";

import { useAdminLanguage } from "./admin-language";
import { useState } from "react";
import { adminFetch } from "../../lib/admin-browser";

export function StartCodTest() {
  const { t, errorText } = useAdminLanguage();
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
        {starting ? t("Starting test…") : t("Start COD test")}
      </button>
      {error && <p role="alert">{errorText(error)}</p>}
    </>
  );
}
