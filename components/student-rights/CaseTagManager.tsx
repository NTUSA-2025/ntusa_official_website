"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

type CaseTag = { id: string; name: string };
type Notice = { key: "tagCreated" | "tagUpdated" | "tagSaveFailed"; errorCode?: string };

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return typeof body?.errorCode === "string" ? body.errorCode : "REQUEST_FAILED";
  } catch {
    return "REQUEST_FAILED";
  }
}

export default function CaseTagManager({ tags, disabled }: { tags: CaseTag[]; disabled: boolean }) {
  const router = useRouter();
  const t = useTranslations("caseManagement");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function saveTag(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch(id ? `/api/admin/student-rights/tags/${id}` : "/api/admin/student-rights/tags", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: id ? editingName : newName }),
      });
      if (!response.ok) {
        setNotice({ key: "tagSaveFailed", errorCode: await responseError(response) });
        return;
      }
      if (id) {
        setEditingId(null);
        setEditingName("");
      } else {
        setNewName("");
      }
      setNotice({ key: id ? "tagUpdated" : "tagCreated" });
      router.refresh();
    } catch {
      setNotice({ key: "tagSaveFailed", errorCode: "REQUEST_FAILED" });
    } finally {
      setSubmitting(false);
    }
  }

  const reason = notice?.errorCode
    ? t(t.has(`errors.${notice.errorCode}`) ? `errors.${notice.errorCode}` : "errors.REQUEST_FAILED")
    : "";

  return (
    <section className="case-manager-panel case-tag-manager">
      <div className="case-manager-section-heading">
        <h2>{t("manageTags")}</h2>
        <span>{t("tagCount", { count: tags.length })}</span>
      </div>
      <p className="case-tag-hint">{t("manageTagsHint")}</p>
      <form className="case-tag-create-form" onSubmit={(event) => saveTag(event)}>
        <label htmlFor="case-tag-name">{t("newTag")}</label>
        <div>
          <input id="case-tag-name" type="text" maxLength={40} value={newName} disabled={disabled || submitting} onChange={(event) => setNewName(event.target.value)} required />
          <button className="btn btn-outline" type="submit" disabled={disabled || submitting || !newName.trim()}>{t("createTag")}</button>
        </div>
      </form>
      {tags.length > 0 ? (
        <ul className="case-tag-manager-list">
          {tags.map((tag) => (
            <li key={tag.id}>
              {editingId === tag.id ? (
                <form onSubmit={(event) => saveTag(event, tag.id)}>
                  <label htmlFor={`edit-case-tag-${tag.id}`}>{t("editTagName")}</label>
                  <div>
                    <input id={`edit-case-tag-${tag.id}`} type="text" maxLength={40} value={editingName} disabled={disabled || submitting} onChange={(event) => setEditingName(event.target.value)} required />
                    <button className="btn btn-outline" type="submit" disabled={disabled || submitting || !editingName.trim()}>{t("saveTag")}</button>
                    <button className="btn btn-outline" type="button" disabled={submitting} onClick={() => setEditingId(null)}>{t("cancel")}</button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="case-tag">{tag.name}</span>
                  <button className="btn btn-outline" type="button" disabled={disabled || submitting} onClick={() => { setEditingId(tag.id); setEditingName(tag.name); setNotice(null); }}>{t("editTag")}</button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="case-tag-hint">{t(disabled ? "casesUnavailable" : "noTagsYet")}</p>}
      {notice ? <p className={`case-save-feedback${notice.key === "tagSaveFailed" ? " error" : ""}`} role={notice.key === "tagSaveFailed" ? "alert" : "status"}>{t(`notifications.${notice.key}`, { reason })}</p> : null}
    </section>
  );
}
