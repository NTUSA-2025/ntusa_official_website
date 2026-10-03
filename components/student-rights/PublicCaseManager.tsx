"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TimelineEvent = {
  id: string; occurredAt: string; publicNote: string; isPublic: boolean;
  createdAt: string; updatedAt: string;
};
type PublicCase = {
  id: string; number: number; openedAt: string; currentSituation: string; publicSummary: string;
  isPublic: boolean; createdAt: string; updatedAt: string; timelineEvents: TimelineEvent[];
  auditLogs: { id: string; actor: string; action: string; targetType: string; targetId: string; createdAt: string }[];
};
type CaseForm = {
  openedAt: string; currentSituation: string; publicSummary: string; isPublic: boolean;
};
const blankCase: CaseForm = { openedAt: "", currentSituation: "", publicSummary: "", isPublic: false };

function errorMessage(response: Response) {
  return response.json().then((body) => body.errorCode || "REQUEST_FAILED").catch(() => "REQUEST_FAILED");
}

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export default function PublicCaseManager({ initialCases, migrationPending }: { initialCases: PublicCase[]; migrationPending?: boolean }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(blankCase);
  const [newEventIsPublic, setNewEventIsPublic] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = initialCases.find((caseRecord) => caseRecord.id === selectedId) || null;
  const setField = <K extends keyof CaseForm>(field: K, value: CaseForm[K]) => setForm((previous) => ({ ...previous, [field]: value }));

  function selectCase(caseRecord: PublicCase) {
    setSelectedId(caseRecord.id);
    setForm({
      openedAt: caseRecord.openedAt.slice(0, 10),
      currentSituation: caseRecord.currentSituation,
      publicSummary: caseRecord.publicSummary,
      isPublic: caseRecord.isPublic,
    });
    setMessage("");
  }

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage("");
    try {
      const response = await fetch(selected ? `/api/admin/student-rights/cases/${selected.id}` : "/api/admin/student-rights/cases", {
        method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!response.ok) return setMessage(`儲存失敗：${await errorMessage(response)}`);
      const saved = await response.json() as PublicCase;
      if (!selected) setSelectedId(saved.id);
      setMessage(selected ? "案件已更新並留下稽核紀錄。" : "案件已建立，現在可以新增後續狀況。");
      router.refresh();
    } catch {
      setMessage("儲存失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/student-rights/cases/${selected.id}/events`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurredAt: data.get("occurredAt"), publicNote: data.get("publicNote"), isPublic: data.get("isPublic") === "on" }),
      });
      if (!response.ok) return setMessage(`新增進度失敗：${await errorMessage(response)}`);
      const createdEvent = await response.json() as TimelineEvent;
      if (createdEvent.isPublic) setField("currentSituation", createdEvent.publicNote);
      formElement.reset();
      setNewEventIsPublic(false);
      setMessage("目前狀況已新增並留下稽核紀錄。");
      router.refresh();
    } catch {
      setMessage("新增進度失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  async function setEventVisibility(eventId: string, isPublic: boolean) {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/student-rights/events/${eventId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) return setMessage(`更新公開狀態失敗：${await errorMessage(response)}`);
      setMessage(isPublic ? "此筆狀況已公開。" : "此筆狀況已隱藏。");
      router.refresh();
    } catch {
      setMessage("更新公開狀態失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="case-manager">
    <header><p className="case-eyebrow">ADMINISTRATION</p><h1>學權部案件公開管理</h1><p>僅輸入已匿名化、已核可公開的內容。原始陳情、聯絡資訊與內部紀錄不得存入本系統。</p></header>
    {migrationPending ? <p className="case-manager-message" role="alert">資料庫 migration 尚未完成；請在 staging 資料庫執行 <code>npm run db:migrate</code> 後重新整理。</p> : null}
    {message ? <p className="case-manager-message" role="status">{message}</p> : null}
    <div className="case-manager-grid">
      <form className="case-manager-panel" onSubmit={submitCase}>
        <h2>{selected ? `編輯案件 #${selected.number}` : "建立公開案件"}</h2>
        <label>建案日期<input required type="date" value={form.openedAt} onChange={(e) => setField("openedAt", e.target.value)} /></label>
        <label>問題概述<textarea required maxLength={4000} rows={4} value={form.publicSummary} onChange={(e) => setField("publicSummary", e.target.value)} /></label>
        <label>{selected ? "目前狀況（由最新公開紀錄帶入）" : "初始目前狀況"}<textarea required disabled={Boolean(selected)} maxLength={4000} rows={3} value={selected ? selected.currentSituation : form.currentSituation} onChange={(e) => setField("currentSituation", e.target.value)} /></label>
        <label className="case-switch"><span>公開案件</span><input type="checkbox" role="switch" checked={form.isPublic} onChange={(e) => setField("isPublic", e.target.checked)} /><span className="case-switch-state">{form.isPublic ? "公開" : "未公開"}</span></label>
        <div className="case-manager-actions"><button className="btn btn-primary" disabled={submitting}>{selected ? "儲存案件" : "建立案件"}</button>{selected ? <button type="button" className="btn btn-outline" onClick={() => { setSelectedId(null); setForm(blankCase); setMessage(""); }}>改為建立新案件</button> : null}</div>
      </form>
      <aside className="case-manager-panel"><h2>既有案件</h2><div className="case-manager-case-list">{initialCases.length ? initialCases.map((caseRecord) => <button type="button" key={caseRecord.id} onClick={() => selectCase(caseRecord)} className={selectedId === caseRecord.id ? "selected" : ""}><strong>案件 #{caseRecord.number}</strong><span>{displayDate(caseRecord.openedAt)} · {caseRecord.isPublic ? "公開" : "未公開"}</span></button>) : <p className="caption">尚未建立案件。</p>}</div></aside>
    </div>
    {selected ? <section className="case-manager-panel case-event-panel">
      <h2>案件 #{selected.number}：新增目前狀況</h2>
      <p className="caption">每筆紀錄只需填寫日期與目前狀況；若內容有誤，隱藏後再新增正確版本。</p>
      <form onSubmit={addEvent} className="case-event-form">
        <label>進度日期<input required name="occurredAt" type="date" /></label>
        <label className="event-note">目前狀況<textarea required name="publicNote" maxLength={4000} rows={4} /></label>
        <label className="case-switch"><span>公開此筆狀況</span><input name="isPublic" type="checkbox" role="switch" checked={newEventIsPublic} onChange={(e) => setNewEventIsPublic(e.target.checked)} /><span className="case-switch-state">{newEventIsPublic ? "公開" : "未公開"}</span></label>
        <button className="btn btn-primary" disabled={submitting}>新增狀況</button>
      </form>
      <ol className="case-manager-events">{selected.timelineEvents.map((event) => <li key={event.id}><div className="case-event-heading"><time dateTime={event.occurredAt}>{displayDate(event.occurredAt)}</time><label className="case-switch"><span>公開</span><input type="checkbox" role="switch" checked={event.isPublic} disabled={submitting} onChange={(e) => setEventVisibility(event.id, e.target.checked)} /><span className="case-switch-state">{event.isPublic ? "公開" : "未公開"}</span></label></div><p>{event.publicNote}</p></li>)}</ol>
      <h2 className="case-audit-heading">稽核歷程</h2><ol className="case-audit-list">{selected.auditLogs.map((log) => <li key={log.id}><strong>{log.action}</strong><span>{new Date(log.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} · {log.actor}</span></li>)}</ol>
    </section> : null}
  </section>;
}
