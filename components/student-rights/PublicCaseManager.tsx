"use client";

import Link from "next/link";
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
  auditLogs: {
    id: string;
    actor: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  }[];
};

type CaseForm = {
  openedAt: string;
  currentSituation: string;
  publicSummary: string;
  isPublic: boolean;
};

const blankCase: CaseForm = {
  openedAt: "",
  currentSituation: "",
  publicSummary: "",
  isPublic: false,
};

function errorMessage(response: Response) {
  return response.json()
    .then((body) => body.errorCode || "REQUEST_FAILED")
    .catch(() => "REQUEST_FAILED");
}

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function displayDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";

  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

export default function PublicCaseManager({ caseRecord }: { caseRecord?: ManagedPublicCase }) {
  const router = useRouter();
  const isEditing = Boolean(caseRecord);
  const [form, setForm] = useState<CaseForm>(() => caseRecord ? {
    openedAt: caseRecord.openedAt.slice(0, 10),
    currentSituation: caseRecord.currentSituation,
    publicSummary: caseRecord.publicSummary,
    isPublic: caseRecord.isPublic,
  } : blankCase);
  const [newEventIsPublic, setNewEventIsPublic] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof CaseForm>(field: K, value: CaseForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

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
        setMessage(`儲存失敗：${await errorMessage(response)}`);
        return;
      }

      const saved = await response.json() as ManagedPublicCase;
      if (!caseRecord) {
        router.replace(`/student-rights/cases/manage/${saved.id}`);
        return;
      }

      setMessage("案件資料已更新並留下稽核紀錄。");
      router.refresh();
    } catch {
      setMessage("儲存失敗，請稍後再試。");
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
    setMessage("");

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
        setMessage(`新增進度失敗：${await errorMessage(response)}`);
        return;
      }

      const createdEvent = await response.json() as TimelineEvent;
      if (createdEvent.isPublic) setField("currentSituation", createdEvent.publicNote);
      formElement.reset();
      setNewEventIsPublic(false);
      setMessage("案件進度已新增並留下稽核紀錄。");
      router.refresh();
    } catch {
      setMessage("新增進度失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  async function setEventVisibility(eventId: string, isPublic: boolean) {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/student-rights/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) {
        setMessage(`更新公開狀態失敗：${await errorMessage(response)}`);
        return;
      }

      setMessage(isPublic ? "此筆進度已公開。" : "此筆進度已隱藏。");
      router.refresh();
    } catch {
      setMessage("更新公開狀態失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="case-manager">
      <Link className="case-manager-back" href="/student-rights/cases/manage">
        ← 返回所有案件
      </Link>

      <header className="case-manager-editor-header">
        <p className="case-eyebrow">ADMINISTRATION</p>
        <h1>{caseRecord ? `編輯案件 #${caseRecord.number}` : "新增學權案件"}</h1>
        <p>
          {caseRecord
            ? "日常更新請先新增案件進度；只有案件基本資訊變動時，才需要調整下方資料。"
            : "僅輸入已匿名化、已核可公開的內容。原始陳情、聯絡資訊與內部紀錄不得存入本系統。"}
        </p>
      </header>

      {message ? <p className="case-manager-message" role="status">{message}</p> : null}

      <div className="case-manager-stack">
        {caseRecord ? (
          <section className="case-manager-panel case-event-panel">
            <h2>新增案件進度</h2>
            <p className="caption">每筆紀錄只需填寫日期與公開內容；若內容有誤，隱藏後再新增正確版本。</p>
            <form onSubmit={addEvent} className="case-event-form">
              <label>
                進度日期
                <input required name="occurredAt" type="date" />
              </label>
              <label className="event-note">
                進度內容
                <textarea required name="publicNote" maxLength={4000} rows={4} />
              </label>
              <label className="case-switch">
                <span>公開此筆進度</span>
                <input
                  name="isPublic"
                  type="checkbox"
                  role="switch"
                  checked={newEventIsPublic}
                  onChange={(event) => setNewEventIsPublic(event.target.checked)}
                />
                <span className="case-switch-state">{newEventIsPublic ? "公開" : "未公開"}</span>
              </label>
              <button className="btn btn-primary" disabled={submitting}>新增進度</button>
            </form>

            <div className="case-manager-section-heading">
              <h2>進度紀錄</h2>
              <span>{caseRecord.timelineEvents.length} 筆</span>
            </div>
            {caseRecord.timelineEvents.length ? (
              <ol className="case-manager-events">
                {caseRecord.timelineEvents.map((timelineEvent) => (
                  <li key={timelineEvent.id}>
                    <div className="case-event-heading">
                      <time dateTime={timelineEvent.occurredAt}>{displayDate(timelineEvent.occurredAt)}</time>
                      <label className="case-switch">
                        <span>公開</span>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={timelineEvent.isPublic}
                          disabled={submitting}
                          onChange={(event) => setEventVisibility(timelineEvent.id, event.target.checked)}
                        />
                        <span className="case-switch-state">{timelineEvent.isPublic ? "公開" : "未公開"}</span>
                      </label>
                    </div>
                    <p>{timelineEvent.publicNote}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="caption">尚未新增案件進度。</p>
            )}
          </section>
        ) : null}

        <form className="case-manager-panel" onSubmit={submitCase}>
          <h2>{isEditing ? "案件基本資料" : "建立案件"}</h2>
          <label>
            建案日期
            <input
              required
              type="date"
              value={form.openedAt}
              onChange={(event) => setField("openedAt", event.target.value)}
            />
          </label>
          <label>
            事件概述
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
              初始進度
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
            <span>公開案件</span>
            <input
              type="checkbox"
              role="switch"
              checked={form.isPublic}
              onChange={(event) => setField("isPublic", event.target.checked)}
            />
            <span className="case-switch-state">{form.isPublic ? "公開" : "未公開"}</span>
          </label>
          <div className="case-manager-actions">
            <button className="btn btn-primary" disabled={submitting}>
              {isEditing ? "儲存案件資料" : "建立案件"}
            </button>
          </div>
        </form>

        {caseRecord ? (
          <section className="case-manager-panel">
            <div className="case-manager-section-heading">
              <h2>稽核歷程</h2>
              <span>{caseRecord.auditLogs.length} 筆</span>
            </div>
            {caseRecord.auditLogs.length ? (
              <ol className="case-audit-list">
                {caseRecord.auditLogs.map((log) => (
                  <li key={log.id}>
                    <strong>{log.action}</strong>
                    <span>{displayDateTime(log.createdAt)} · {log.actor}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="caption">尚無稽核紀錄。</p>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
