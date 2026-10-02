"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TimelineEvent = {
  id: string; occurredAt: string; status: string; publicNote: string; isPublic: boolean;
  createdAt: string; updatedAt: string;
};
type PublicCase = {
  id: string; publicCaseNo: string; category: string; currentStatus: string; publicSummary: string;
  isPublic: boolean; createdAt: string; updatedAt: string; timelineEvents: TimelineEvent[];
  auditLogs: { id: string; actor: string; action: string; targetType: string; targetId: string; createdAt: string }[];
};
type CaseForm = { publicCaseNo: string; category: string; currentStatus: string; publicSummary: string; isPublic: boolean };
const blankCase: CaseForm = { publicCaseNo: "", category: "", currentStatus: "", publicSummary: "", isPublic: false };

function errorMessage(response: Response) {
  return response.json().then((body) => body.errorCode || "REQUEST_FAILED").catch(() => "REQUEST_FAILED");
}

export default function PublicCaseManager({ initialCases }: { initialCases: PublicCase[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(blankCase);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = initialCases.find((caseRecord) => caseRecord.id === selectedId) || null;
  const setField = <K extends keyof CaseForm>(field: K, value: CaseForm[K]) => setForm((previous) => ({ ...previous, [field]: value }));

  function selectCase(caseRecord: PublicCase) {
    setSelectedId(caseRecord.id);
    setForm({ publicCaseNo: caseRecord.publicCaseNo, category: caseRecord.category, currentStatus: caseRecord.currentStatus, publicSummary: caseRecord.publicSummary, isPublic: caseRecord.isPublic });
    setMessage("");
  }

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage("");
    const response = await fetch(selected ? `/api/admin/student-rights/cases/${selected.id}` : "/api/admin/student-rights/cases", {
      method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!response.ok) return setMessage(`儲存失敗：${await errorMessage(response)}`);
    setMessage(selected ? "案件已更新並留下稽核紀錄。" : "案件已建立；未勾選公開前不會顯示於前台。");
    if (!selected) setForm(blankCase);
    router.refresh();
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true); setMessage("");
    const response = await fetch(`/api/admin/student-rights/cases/${selected.id}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occurredAt: data.get("occurredAt"), status: data.get("status"), publicNote: data.get("publicNote"), isPublic: data.get("isPublic") === "on" }),
    });
    setSubmitting(false);
    if (!response.ok) return setMessage(`新增進度失敗：${await errorMessage(response)}`);
    const createdEvent = await response.json() as { status: string; isPublic: boolean };
    if (createdEvent.isPublic) setField("currentStatus", createdEvent.status);
    event.currentTarget.reset(); setMessage("進度事件已新增並留下稽核紀錄。"); router.refresh();
  }

  async function hideEvent(eventId: string) {
    if (!window.confirm("確定要從公開頁面隱藏此事件嗎？紀錄會保留在資料庫與稽核紀錄中。")) return;
    const response = await fetch(`/api/admin/student-rights/events/${eventId}`, { method: "DELETE" });
    if (!response.ok) return setMessage(`隱藏失敗：${await errorMessage(response)}`);
    setMessage("事件已隱藏，未實體刪除。"); router.refresh();
  }

  return <section className="case-manager">
    <header><p className="case-eyebrow">ADMINISTRATION</p><h1>學權部案件公開管理</h1><p>僅輸入已匿名化、已核可公開的內容。原始陳情、聯絡資訊與內部紀錄不得存入本系統。</p></header>
    {message ? <p className="case-manager-message" role="status">{message}</p> : null}
    <div className="case-manager-grid">
      <form className="case-manager-panel" onSubmit={submitCase}>
        <h2>{selected ? `編輯 ${selected.publicCaseNo}` : "建立公開案件"}</h2>
        <label>公開案件編號<input required maxLength={64} value={form.publicCaseNo} onChange={(e) => setField("publicCaseNo", e.target.value)} placeholder="SR-2026-001" /></label>
        <label>類別<input required maxLength={64} value={form.category} onChange={(e) => setField("category", e.target.value)} /></label>
        <label>目前狀態<input required maxLength={64} value={form.currentStatus} onChange={(e) => setField("currentStatus", e.target.value)} /></label>
        <label>公開摘要<textarea required maxLength={4000} rows={5} value={form.publicSummary} onChange={(e) => setField("publicSummary", e.target.value)} /></label>
        <label className="case-checkbox"><input type="checkbox" checked={form.isPublic} onChange={(e) => setField("isPublic", e.target.checked)} />此案件可公開顯示</label>
        <div className="case-manager-actions"><button className="btn btn-primary" disabled={submitting}>{selected ? "儲存案件" : "建立案件"}</button>{selected ? <button type="button" className="btn btn-outline" onClick={() => { setSelectedId(null); setForm(blankCase); }}>改為建立新案件</button> : null}</div>
      </form>
      <aside className="case-manager-panel"><h2>既有案件</h2><div className="case-manager-case-list">{initialCases.length ? initialCases.map((caseRecord) => <button type="button" key={caseRecord.id} onClick={() => selectCase(caseRecord)} className={selectedId === caseRecord.id ? "selected" : ""}><strong>{caseRecord.publicCaseNo}</strong><span>{caseRecord.currentStatus} · {caseRecord.isPublic ? "公開" : "未公開"}</span></button>) : <p className="caption">尚未建立案件。</p>}</div></aside>
    </div>
    {selected ? <section className="case-manager-panel case-event-panel"><h2>{selected.publicCaseNo}：新增處理進度</h2><p className="caption">進度採新增方式保存歷程；若內容不適合公開，請隱藏後新增正確的公開事件。</p><form onSubmit={addEvent} className="case-event-form"><label>事件日期<input required name="occurredAt" type="date" /></label><label>公開狀態<input required name="status" maxLength={64} /></label><label className="event-note">公開說明<textarea required name="publicNote" maxLength={4000} rows={4} /></label><label className="case-checkbox"><input name="isPublic" type="checkbox" />立即公開此事件</label><button className="btn btn-primary" disabled={submitting}>新增進度</button></form><ol className="case-manager-events">{selected.timelineEvents.map((event) => <li key={event.id}><span>{event.occurredAt.slice(0, 10)} · {event.status} · {event.isPublic ? "公開" : "未公開"}</span><p>{event.publicNote}</p>{event.isPublic ? <button type="button" onClick={() => hideEvent(event.id)}>從前台隱藏</button> : null}</li>)}</ol><h2 className="case-audit-heading">稽核歷程</h2><ol className="case-audit-list">{selected.auditLogs.map((log) => <li key={log.id}><strong>{log.action}</strong><span>{new Date(log.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} · {log.actor}</span></li>)}</ol></section> : null}
  </section>;
}
