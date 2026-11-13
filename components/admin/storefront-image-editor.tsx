"use client";

import { useAdminLanguage } from "./admin-language";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch } from "../../lib/admin-browser";
import { prepareImage } from "../../lib/prepare-image";
import { storefrontImageSlots, storefrontImageUrl } from "../../lib/storefront-images";
import type { StorefrontImage } from "../../lib/storefront-images";

function CoverEditor({ slot, initial }: { slot: (typeof storefrontImageSlots)[number]; initial?: StorefrontImage }) {
  const { t, errorText } = useAdminLanguage();
  const [current, setCurrent] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("file", await prepareImage(file));
      body.set("slot", slot.id);
      body.set("alt", alt.trim());
      const result = await adminFetch("/storefront", { method: "POST", body });
      setCurrent(result.image);
      setAlt(result.image.alt);
      setFile(null);
      setNotice("Cover published to the homepage.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish this cover.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminFetch(`/storefront?slot=${slot.id}`, { method: "DELETE" });
      setCurrent(undefined);
      setFile(null);
      setAlt("");
      setNotice("Default artwork restored.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restore the default artwork.");
    } finally {
      setBusy(false);
    }
  }

  const src = preview || (current ? storefrontImageUrl(current.storage_path) : "");
  return <form className="admin-panel admin-cover-card" onSubmit={publish} aria-labelledby={slot.id}>
    <h2 id={slot.id}>{t(slot.label)}</h2>
    <p>{t(slot.description)}</p>
    <div className="admin-cover-preview">
      {src ? (
        // A local object URL previews the file before any upload.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={preview ? t("Selected image preview") : current?.alt ?? ""} />
      ) : <span>{t("Default WONS artwork")}</span>}
    </div>
    <label className={`admin-upload-label${busy ? " disabled" : ""}`}>
      {current ? t("Change image") : t("Choose image")}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={event => {
        const selected = event.target.files?.[0];
        event.target.value = "";
        if (!selected) return;
        setNotice("");
        if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(selected.type) || selected.size > 20000000) {
          setError("Choose a JPG, PNG, WebP or AVIF image smaller than 20 MB.");
          return;
        }
        setError("");
        setFile(selected);
      }} />
    </label>
    {file && <label>{t("Image description")} <input type="text" required maxLength={300} value={alt} disabled={busy} onChange={event => setAlt(event.target.value)} />
    </label>}
    {error && <p role="alert" className="admin-error">{errorText(error)}</p>}
    {notice && <p role="status">{errorText(notice)}</p>}
    <div className="admin-actions">
      <button type="submit" className="button dark" disabled={busy || !file || !alt.trim()}>{busy && file ? t("Publishing…") : t("Publish image")}</button>
      {file && <button type="button" disabled={busy} onClick={() => { setFile(null); setAlt(current?.alt ?? ""); setError(""); }}>{t("Cancel selection")}</button>}
      {!file && current && <button type="button" disabled={busy} onClick={() => void restore()}>{busy ? t("Restoring…") : t("Restore default artwork")}</button>}
    </div>
  </form>;
}

export function StorefrontImageEditor() {
  const { t, errorText } = useAdminLanguage();
  const [images, setImages] = useState<StorefrontImage[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void adminFetch("/storefront", { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setImages(result.images);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load storefront images.");
    });
    return () => controller.abort();
  }, [retry]);
  return <>
    <div className="admin-page-heading">
      <div><p className="eyebrow">{t("OWNER TOOLS")}</p><h1>{t("Storefront images")}</h1>
        <p>{t("Update the homepage covers. Landscape photos work best.")}</p>
      </div>
      <Link className="underlined-link" href="/">{t("View homepage →")}</Link>
    </div>
    {error ? <div className="admin-panel"><p role="alert">{errorText(error)}</p><button type="button" onClick={() => { setError(""); setRetry(value => value + 1); }}>{t("Try again")}</button></div>
      : !images ? <p role="status">{t("Loading storefront images…")}</p>
      : <div className="admin-cover-grid">{storefrontImageSlots.map(slot =>
        <CoverEditor key={slot.id} slot={slot} initial={images.find(image => image.id === slot.id)} />
      )}</div>}
  </>;
}
