import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

export default async function PublicCaseDetailPage({ params }: { params: Promise<{ publicCaseNo: string }> }) {
  const { publicCaseNo } = await params;
  const caseRecord = await prisma.publicCase.findFirst({
    where: { publicCaseNo: publicCaseNo.toUpperCase(), isPublic: true },
    include: {
      timelineEvents: {
        where: { isPublic: true },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!caseRecord) notFound();

  return (
    <section className="case-page">
      <Link href="/student-rights/cases" className="case-back">← 返回案件列表</Link>
      <div className="case-detail-heading">
        <div className="case-card-meta"><span>{caseRecord.publicCaseNo}</span><span>{caseRecord.category}</span></div>
        <h1>{caseRecord.currentStatus}</h1>
        <p>{caseRecord.publicSummary}</p>
      </div>
      <ol className="case-timeline" aria-label="案件處理歷程">
        {caseRecord.timelineEvents.map((event) => (
          <li key={event.id}>
            <time dateTime={event.occurredAt.toISOString()}>{formatDate(event.occurredAt)}</time>
            <div><h2>{event.status}</h2><p>{event.publicNote}</p></div>
          </li>
        ))}
      </ol>
      {caseRecord.timelineEvents.length === 0 ? <p className="case-empty">此案件尚無可公開的進度事件。</p> : null}
    </section>
  );
}
