"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type TimelineEvent = {
  id: string;
  occurredAt: string;
  publicNote: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ManagedPublicCase = {
  id: string;
  number: number;
  openedAt: string;
  currentSituation: string;
  publicSummary: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  timelineEvents: TimelineEvent[];
};

type CaseForm = {
  openedAt: string;
  currentSituation: string;
  publicSummary: string;
  isPublic: boolean;
};

type EventForm = Pick<TimelineEvent, "id" | "publicNote" | "isPublic"> & { occurredAt: string };

const blankCase: CaseForm = {
  openedAt: new Date().toLocaleDateString("en-CA"),
  currentSituation: "",
  publicSummary: "",
  isPublic: false,
};

function errorMessage(response: Response) {
  return response.json()
    .then((body) => typeof body?.errorCode === "string" ? body.errorCode : "REQUEST_FAILED")
    .catch(() => "REQUEST_FAILED");
}

function displayDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function displayDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Taipei",
  });
}

export default function PublicCaseManager({ caseRecord }: { caseRecord?: ManagedPublicCase }) {
  const router = useRouter();
  const t = useTranslations("caseManagement");
  const locale = useLocale();
  const isEditing = Boolean(caseRecord);
  const [form, setForm] = useState<CaseForm>(() => caseRecord ? {
    openedAt: caseRecord.openedAt.slice(0, 10),
    currentSituation: caseRecord.currentSituation,
    publicSummary: caseRecord.publicSummary,
    isPublic: caseRecord.isPublic,
  } : blankCase);
  const [newEventIsPublic, setNewEventIsPublic] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventForm | null>(null);
  const [message, setMessage] = useState<{
    key: "caseSaved" | "progressAdded" | "progressPublished" | "progressHidden" | "progressSaved" | "progressDeleted" | "saveFailed" | "addFailed" | "visibilityFailed" | "updateFailed" | "deleteFailed";
    errorCode?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof CaseForm>(field: K, value: CaseForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        caseRecord ? `/api/admin/student-rights/cases/${caseRecord.id}` : "/api/admin/student-rights/cases",
        {
          method: caseRecord ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) {
        setMessage({ key: "saveFailed", errorCode: await errorMessage(response) });
        return;
      }

      const saved = await response.json() as ManagedPublicCase;
      if (!caseRecord) {
        router.replace(`/student-rights/cases/manage/${saved.id}`);
        return;
      }

      setMessage({ key: "caseSaved" });
      router.refresh();
    } catch {
      setMessage({ key: "saveFailed", errorCode: "REQUEST_FAILED" });
    } finally {
      setSubmitting(false);
    }
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseRecord) return;

    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/student-rights/cases/${caseRecord.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredAt: data.get("occurredAt"),
          publicNote: data.get("publicNote"),
          isPublic: data.get("isPublic") === "on",
        }),
      });
      if (!response.ok) {
        setMessage({ key: "addFailed", errorCode: await errorMessage(response) });
        return;
      }

      const createdEvent = await response.json() as TimelineEvent;
      if (createdEvent.isPublic) setField("currentSituation", createdEvent.publicNote);
      formElement.reset();
      setNewEventIsPublic(false);
      setMessage({ key: "progressAdded" });
      router.refresh();
    } catch {
      setMessage({ key: "addFailed", errorCode: "REQUEST_FAILED" });
    } finally {
      setSubmitting(false);
    }
  }

  async function setEventVisibility(eventId: string, isPublic: boolean) {
    const timelineEvent = caseRecord?.timelineEvents.find((item) => item.id === eventId);
    if (!timelineEvent) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/student-rights/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredAt: timelineEvent.occurredAt.slice(0, 10),
          publicNote: timelineEvent.publicNote,
          isPublic,
        }),
      });
      if (!response.ok) {
        setMessage({ key: "visibilityFailed", errorCode: await errorMessage(response) });
        return;
      }

      setMessage({ key: isPublic ? "progressPublished" : "progressHidden" });
      router.refresh();
    } catch {
      setMessage({ key: "visibilityFailed", errorCode: "REQUEST_FAILED" });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEvent) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/student-rights/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEvent),
      });
      if (!response.ok) {
        setMessage({ key: "updateFailed", errorCode: await errorMessage(response) });
        return;
      }
      setEditingEvent(null);
      setMessage({ key: "progressSaved" });
      router.refresh();
    } catch {
      setMessage({ key: "updateFailed", errorCode: "REQUEST_FAILED" });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/student-rights/events/${eventId}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage({ key: "deleteFailed", errorCode: await errorMessage(response) });
        return;
      }
      setEditingEvent(null);
      setMessage({ key: "progressDeleted" });
      router.refresh();
    } catch {
      setMessage({ key: "deleteFailed", errorCode: "REQUEST_FAILED" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="case-manager">
      <Link className="case-manager-back" href="/student-rights/cases/manage">
        {t("back")}
      </Link>

      <header className="case-manager-editor-header">
        <p className="case-eyebrow">{t("eyebrow")}</p>
        <h1>{caseRecord ? t("editTitle", { number: caseRecord.number }) : t("newTitle")}</h1>
        <p>
          {caseRecord
            ? t("editDescription")
            : t("newDescription")}
        </p>
      </header>

      {message ? (
        <p className="case-manager-message" role="status">
          {t(`notifications.${message.key}`, {
            reason: t(t.has(`errors.${message.errorCode}`) ? `errors.${message.errorCode}` : "errors.REQUEST_FAILED"),
          })}
        </p>
      ) : null}

      <div className="case-manager-stack">
        {caseRecord ? (
          <section className="case-manager-panel case-event-panel">
            <h2>{t("addProgressTitle")}</h2>
            <p className="caption">{t("progressHelp")}</p>
            <form onSubmit={addEvent} className="case-event-form">
              <label>
                {t("progressDate")}
                <input required name="occurredAt" type="date" />
              </label>
              <label className="event-note">
                {t("progressContent")}
                <textarea required name="publicNote" maxLength={4000} rows={4} />
              </label>
              <label className="case-switch">
                <span className={!newEventIsPublic ? "active" : ""}>{t("private")}</span>
                <input
                  name="isPublic"
                  type="checkbox"
                  role="switch"
                  aria-label={t("progressVisibility")}
                  checked={newEventIsPublic}
                  onChange={(event) => setNewEventIsPublic(event.target.checked)}
                />
                <span className={newEventIsPublic ? "active" : ""}>{t("public")}</span>
              </label>
              <button className="btn btn-primary" disabled={submitting}>{t("addProgress")}</button>
            </form>

            <div className="case-manager-section-heading">
              <h2>{t("progressHistory")}</h2>
              <span>{t("progressCount", { count: caseRecord.timelineEvents.length })}</span>
            </div>
            {caseRecord.timelineEvents.length ? (
              <ol className="case-manager-events">
                {caseRecord.timelineEvents.map((timelineEvent) => (
                  <li key={timelineEvent.id}>
                    {editingEvent?.id === timelineEvent.id ? (
                      <form className="case-event-edit-form" onSubmit={updateEvent}>
                        <label>
                          {t("progressDate")}
                          <input required type="date" value={editingEvent.occurredAt} onChange={(event) => setEditingEvent({ ...editingEvent, occurredAt: event.target.value })} />
                        </label>
                        <label>
                          {t("progressContent")}
                          <textarea required maxLength={4000} rows={4} value={editingEvent.publicNote} onChange={(event) => setEditingEvent({ ...editingEvent, publicNote: event.target.value })} />
                        </label>
                        <label className="case-switch">
                          <span className={!editingEvent.isPublic ? "active" : ""}>{t("private")}</span>
                          <input type="checkbox" role="switch" aria-label={t("progressVisibility")} checked={editingEvent.isPublic} onChange={(event) => setEditingEvent({ ...editingEvent, isPublic: event.target.checked })} />
                          <span className={editingEvent.isPublic ? "active" : ""}>{t("public")}</span>
                        </label>
                        <div className="case-event-actions">
                          <button className="btn btn-primary" disabled={submitting}>{t("saveProgress")}</button>
                          <button className="btn btn-outline" type="button" disabled={submitting} onClick={() => setEditingEvent(null)}>{t("cancel")}</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="case-event-heading">
                          <time dateTime={timelineEvent.occurredAt}>{displayDate(timelineEvent.occurredAt, locale)}</time>
                          <label className="case-switch">
                            <span className={!timelineEvent.isPublic ? "active" : ""}>{t("private")}</span>
                            <input type="checkbox" role="switch" aria-label={t("progressVisibility")} checked={timelineEvent.isPublic} disabled={submitting} onChange={(event) => setEventVisibility(timelineEvent.id, event.target.checked)} />
                            <span className={timelineEvent.isPublic ? "active" : ""}>{t("public")}</span>
                          </label>
                        </div>
                        <p>{timelineEvent.publicNote}</p>
                        <div className="case-event-actions">
                          <button className="btn btn-outline" type="button" disabled={submitting} onClick={() => setEditingEvent({ ...timelineEvent, occurredAt: timelineEvent.occurredAt.slice(0, 10) })}>{t("edit")}</button>
                          <button className="btn btn-danger" type="button" disabled={submitting} onClick={() => deleteEvent(timelineEvent.id)}>{t("delete")}</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="caption">{t("emptyProgress")}</p>
            )}
          </section>
        ) : null}

        <form className="case-manager-panel" onSubmit={submitCase}>
          <h2>{isEditing ? t("caseDetails") : t("createCase")}</h2>
          {!caseRecord ? (
            <>
              <label>
                {t("caseDate")}
                <input
                  required
                  type="date"
                  value={form.openedAt}
                  onChange={(event) => setField("openedAt", event.target.value)}
                />
              </label>
              <p className="caption">
                {t("caseDateHelp")}
              </p>
            </>
          ) : (
            <p className="case-system-created-at">
              {t("systemCreated")}: <time dateTime={caseRecord.createdAt}>{displayDateTime(caseRecord.createdAt, locale)}</time>
            </p>
          )}
          <label>
            {t("subject")}
            <textarea
              required
              maxLength={4000}
              rows={4}
              value={form.publicSummary}
              onChange={(event) => setField("publicSummary", event.target.value)}
            />
          </label>
          {!caseRecord ? (
            <label>
              {t("initialProgress")}
              <textarea
                required
                maxLength={4000}
                rows={4}
                value={form.currentSituation}
                onChange={(event) => setField("currentSituation", event.target.value)}
              />
            </label>
          ) : null}
          <label className="case-switch">
            <span className={!form.isPublic ? "active" : ""}>{t("private")}</span>
            <input
              type="checkbox"
              role="switch"
              aria-label={t("caseVisibility")}
              checked={form.isPublic}
              onChange={(event) => setField("isPublic", event.target.checked)}
            />
            <span className={form.isPublic ? "active" : ""}>{t("public")}</span>
          </label>
          <div className="case-manager-actions">
            <button className="btn btn-primary" disabled={submitting}>
              {isEditing ? t("saveCase") : t("createCase")}
            </button>
          </div>
        </form>

      </div>
    </section>
  );
}
