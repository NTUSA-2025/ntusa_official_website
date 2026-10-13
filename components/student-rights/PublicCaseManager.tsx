"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";

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

function displayCompactDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
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
  const [editingEvent, setEditingEvent] = useState<EventForm | null>(null);
  const editingEventId = editingEvent?.id;
  const editDateRef = useRef<HTMLInputElement>(null);
  const historyListRef = useRef<HTMLOListElement>(null);
  const historyDragOffsetRef = useRef<number | null>(null);
  const [historyScrollbar, setHistoryScrollbar] = useState({ visible: false, thumbHeight: 0, thumbTop: 0 });
  const [message, setMessage] = useState<{
    key: "caseSaved" | "progressAdded" | "progressPublished" | "progressHidden" | "progressSaved" | "progressDeleted" | "saveFailed" | "addFailed" | "visibilityFailed" | "updateFailed" | "deleteFailed";
    errorCode?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingEventId) editDateRef.current?.focus();
  }, [editingEventId]);

  const syncHistoryScrollbar = useCallback(() => {
    const list = historyListRef.current;
    if (!list) return;
    const scrollRange = list.scrollHeight - list.clientHeight;
    const visible = scrollRange > 1;
    const thumbHeight = visible ? Math.max(28, list.clientHeight * list.clientHeight / list.scrollHeight) : 0;
    const thumbTop = visible ? list.scrollTop / scrollRange * (list.clientHeight - thumbHeight) : 0;
    setHistoryScrollbar((previous) => previous.visible === visible && Math.abs(previous.thumbHeight - thumbHeight) < 0.5 && Math.abs(previous.thumbTop - thumbTop) < 0.5
      ? previous
      : { visible, thumbHeight, thumbTop });
  }, []);

  useEffect(() => {
    const list = historyListRef.current;
    if (!list) return;
    syncHistoryScrollbar();
    const observer = new ResizeObserver(syncHistoryScrollbar);
    observer.observe(list);
    return () => observer.disconnect();
  }, [caseRecord?.timelineEvents, syncHistoryScrollbar]);

  function scrollHistoryFromPointer(clientY: number, track: HTMLDivElement, offset: number) {
    const list = historyListRef.current;
    if (!list) return;
    const trackRect = track.getBoundingClientRect();
    const travel = trackRect.height - historyScrollbar.thumbHeight;
    if (travel <= 0) return;
    const position = Math.max(0, Math.min(travel, clientY - trackRect.top - offset));
    list.scrollTop = position / travel * (list.scrollHeight - list.clientHeight);
  }

  function startHistoryScrollbarDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const trackRect = event.currentTarget.getBoundingClientRect();
    const pointerY = event.clientY - trackRect.top;
    const onThumb = pointerY >= historyScrollbar.thumbTop && pointerY <= historyScrollbar.thumbTop + historyScrollbar.thumbHeight;
    const offset = onThumb ? pointerY - historyScrollbar.thumbTop : historyScrollbar.thumbHeight / 2;
    historyDragOffsetRef.current = offset;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollHistoryFromPointer(event.clientY, event.currentTarget, offset);
  }

  const setField = <K extends keyof CaseForm>(field: K, value: CaseForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const publishOnCreate = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "public";
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        caseRecord ? `/api/admin/student-rights/cases/${caseRecord.id}` : "/api/admin/student-rights/cases",
        {
          method: caseRecord ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, isPublic: caseRecord ? form.isPublic : publishOnCreate }),
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
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "public";
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/student-rights/cases/${caseRecord.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurredAt: data.get("occurredAt"),
          publicNote: data.get("publicNote"),
          isPublic: publish,
        }),
      });
      if (!response.ok) {
        setMessage({ key: "addFailed", errorCode: await errorMessage(response) });
        return;
      }

      const createdEvent = await response.json() as TimelineEvent;
      if (createdEvent.isPublic) setField("currentSituation", createdEvent.publicNote);
      formElement.reset();
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
          <div className="case-progress-layout">
            <section className="case-manager-panel case-event-panel">
              <h2>{editingEvent ? t("editProgressTitle") : t("addProgressTitle")}</h2>
              {!caseRecord.isPublic ? <p className="case-visibility-hint" id="case-visibility-hint">{t("publishCaseFirst")}</p> : null}
              {editingEvent ? (
                <form key="edit-progress" onSubmit={updateEvent} className="case-event-form">
                  <label>
                    {t("progressDate")}
                    <input ref={editDateRef} required type="date" value={editingEvent.occurredAt} onChange={(event) => setEditingEvent({ ...editingEvent, occurredAt: event.target.value })} />
                  </label>
                  <label className="event-note">
                    {t("progressContent")}
                    <textarea required maxLength={4000} rows={4} value={editingEvent.publicNote} onChange={(event) => setEditingEvent({ ...editingEvent, publicNote: event.target.value })} />
                  </label>
                  <label className="case-switch">
                    <span className={!editingEvent.isPublic ? "active" : ""}>{t("private")}</span>
                    <input type="checkbox" role="switch" aria-label={t("progressVisibility")} aria-describedby={!caseRecord.isPublic ? "case-visibility-hint" : undefined} checked={editingEvent.isPublic} disabled={!caseRecord.isPublic || submitting} onChange={(event) => setEditingEvent({ ...editingEvent, isPublic: event.target.checked })} />
                    <span className={editingEvent.isPublic ? "active" : ""}>{t("public")}</span>
                  </label>
                  <div className="case-manager-actions">
                    <button className="btn btn-primary" disabled={submitting}>{t("saveProgress")}</button>
                    <button className="btn btn-outline" type="button" disabled={submitting} onClick={() => setEditingEvent(null)}>{t("cancel")}</button>
                  </div>
                </form>
              ) : (
                <form key="add-progress" onSubmit={addEvent} className="case-event-form">
                  <label>
                    {t("progressDate")}
                    <input required name="occurredAt" type="date" />
                  </label>
                  <label className="event-note">
                    {t("progressContent")}
                    <textarea required name="publicNote" maxLength={4000} rows={4} />
                  </label>
                  <div className="case-manager-actions">
                    <button className="btn btn-outline" type="submit" name="publication" value="draft" disabled={submitting}>{t("draft")}</button>
                    <button className="btn btn-primary" type="submit" name="publication" value="public" disabled={!caseRecord.isPublic || submitting} aria-describedby={!caseRecord.isPublic ? "case-visibility-hint" : undefined}>{t("publishNow")}</button>
                  </div>
                </form>
              )}
            </section>
            <div className="case-history-slot">
              <section className="case-manager-panel case-history-panel">
                <div className="case-manager-section-heading">
                  <h2>{t("progressHistory")}</h2>
                  <span>{t("progressCount", { count: caseRecord.timelineEvents.length })}</span>
                </div>
                {caseRecord.timelineEvents.length ? (
                  <div className="case-history-scroll-area">
                    <ol ref={historyListRef} className="case-manager-events" tabIndex={0} aria-label={t("progressHistory")} onScroll={syncHistoryScrollbar}>
                      {caseRecord.timelineEvents.map((timelineEvent) => (
                        <li className="case-event-row" key={timelineEvent.id}>
                          <time dateTime={timelineEvent.occurredAt} title={displayDate(timelineEvent.occurredAt, locale)}>{displayCompactDate(timelineEvent.occurredAt, locale)}</time>
                          <p title={timelineEvent.publicNote}>{timelineEvent.publicNote}</p>
                          <button
                            className={`case-event-visibility${timelineEvent.isPublic ? " public" : ""}`}
                            type="button"
                            role="switch"
                            aria-label={t("progressVisibility")}
                            aria-checked={timelineEvent.isPublic}
                            aria-describedby={!caseRecord.isPublic ? "case-visibility-hint" : undefined}
                            title={t(timelineEvent.isPublic ? "hideProgressAction" : "publishProgressAction")}
                            disabled={!caseRecord.isPublic || submitting || editingEvent?.id === timelineEvent.id}
                            onClick={() => setEventVisibility(timelineEvent.id, !timelineEvent.isPublic)}
                          >
                            <span className="case-event-switch-track" aria-hidden="true" />
                          </button>
                          <div className="case-event-actions">
                            <button className="case-event-icon-button" type="button" aria-label={t("edit")} title={t("edit")} disabled={submitting} onClick={() => setEditingEvent({ ...timelineEvent, occurredAt: timelineEvent.occurredAt.slice(0, 10) })}>
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z" /></svg>
                            </button>
                            <button className="case-event-icon-button case-event-delete" type="button" aria-label={t("delete")} title={t("delete")} disabled={submitting} onClick={() => deleteEvent(timelineEvent.id)}>
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7" /></svg>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {historyScrollbar.visible ? (
                      <div
                        className="case-history-scrollbar"
                        aria-hidden="true"
                        onPointerDown={startHistoryScrollbarDrag}
                        onPointerMove={(event) => {
                          if (historyDragOffsetRef.current !== null) scrollHistoryFromPointer(event.clientY, event.currentTarget, historyDragOffsetRef.current);
                        }}
                        onPointerUp={(event) => {
                          historyDragOffsetRef.current = null;
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }}
                        onPointerCancel={() => { historyDragOffsetRef.current = null; }}
                      >
                        <span className="case-history-scrollbar-thumb" style={{ height: historyScrollbar.thumbHeight, transform: `translateY(${historyScrollbar.thumbTop}px)` }} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="caption">{t("emptyProgress")}</p>
                )}
              </section>
            </div>
          </div>
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
          {caseRecord ? (
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
          ) : null}
          <div className="case-manager-actions">
            {caseRecord ? (
              <button className="btn btn-primary" disabled={submitting}>{t("saveCase")}</button>
            ) : (
              <>
                <button className="btn btn-outline" type="submit" name="publication" value="draft" disabled={submitting}>{t("draft")}</button>
                <button className="btn btn-primary" type="submit" name="publication" value="public" disabled={submitting}>{t("publishNow")}</button>
              </>
            )}
          </div>
        </form>

      </div>
    </section>
  );
}
