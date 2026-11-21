"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminRequestError, adminFetch } from "../../lib/admin-browser";
import { informationFields, informationLimits, informationPages, type InformationPage, type InformationPageId } from "../../lib/information-pages";
import { useAdminLanguage } from "./admin-language";

export function InformationEditor({ id }: { id: InformationPageId }) {
  const { t, errorText } = useAdminLanguage();
  const [saved, setSaved] = useState<InformationPage | null>(null);
  const [draft, setDraft] = useState<InformationPage | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const path = `/information/${id}`;
  const changed = draft && saved && (draft.title !== saved.title || draft.eyebrow !== saved.eyebrow || draft.body !== saved.body);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void adminFetch(path, { signal: controller.signal }).then(({ page }: { page: InformationPage }) => {
      if (controller.signal.aborted) return;
      setSaved(page);
      setDraft(page);
      setConflict(false);
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "This page could not be loaded. Try again.");
    });
    return () => controller.abort();
  }, [path, attempt]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !changed || busy || conflict) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { page }: { page: InformationPage } = await adminFetch(path, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setSaved(page);
      setDraft(page);
      setNotice("Changes are live on the storefront.");
    } catch (cause) {
      if (cause instanceof AdminRequestError && cause.status === 409) setConflict(true);
      setError(cause instanceof Error ? cause.message : "This page could not be published. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function edit(field: keyof typeof informationFields, value: string) {
    setDraft(current => current ? { ...current, [field]: value } : current);
    setNotice("");
    if (!conflict) setError("");
  }

  return <>
    <header className="admin-page-heading">
      <div>
        <p className="eyebrow">{t("OWNER TOOLS")}</p>
        <h1>{t(informationPages[id].label)}</h1>
        <p>{t("Edit the English copy shown to customers. Publishing updates the live page.")}</p>
      </div>
      <a className="button" href={path} target="_blank" rel="noopener noreferrer">{t("View live page ↗")}</a>
    </header>
    {!draft && !error && <p className="admin-panel" role="status">{t("Loading page content…")}</p>}
    {!draft && error && <div className="admin-panel admin-information-editor">
      <p className="admin-error" role="alert">{errorText(error)}</p>
      <button className="button" onClick={() => setAttempt(value => value + 1)}>{t("Try again")}</button>
    </div>}
    {draft && <form className="admin-panel admin-information-editor" onSubmit={publish} aria-label={t("Edit page content")}>
      <fieldset disabled={busy}>
        <label>{t(informationFields.eyebrow)}
          <input required value={draft.eyebrow} maxLength={informationLimits.eyebrow} onChange={event => edit("eyebrow", event.target.value)} />
        </label>
        <label>{t(informationFields.title)}
          <input required value={draft.title} maxLength={informationLimits.title} onChange={event => edit("title", event.target.value)} />
        </label>
        <label>{t(informationFields.body)}
          <textarea required rows={10} value={draft.body} maxLength={informationLimits.body} aria-describedby="information-body-help" onChange={event => edit("body", event.target.value)} />
        </label>
        <p className="admin-help" id="information-body-help">{t("Leave a blank line between paragraphs.")}</p>
      </fieldset>
      {error && <p className="admin-error" role="alert">{errorText(error)}</p>}
      {notice && <p className="admin-success" role="status">{t(notice)}</p>}
      <div className="admin-actions">
        {conflict && <button type="button" className="button" onClick={() => setAttempt(value => value + 1)}>{t("Reload latest content")}</button>}
        <button className="button dark" type="submit" disabled={busy || conflict || !changed}>{t(busy ? "Publishing…" : "Publish changes")}</button>
      </div>
    </form>}
  </>;
}
