import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

export default async function PublicCasesPage() {
  const cases = await prisma.publicCase.findMany({
    where: { isPublic: true },
    include: { timelineEvents: { where: { isPublic: true }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section className="case-page">
      <div className="case-page-heading">
        <p className="case-eyebrow">STUDENT RIGHTS</p>
        <h1>學權部案件處理進度</h1>
        <p>本頁僅刊載經匿名化與核可公開的案件資訊，不包含原始陳情、個人資料或內部處理紀錄。</p>
      </div>

      {cases.length === 0 ? (
        <div className="case-empty">目前沒有可公開的案件進度。</div>
      ) : (
        <div className="case-list">
          {cases.map((caseRecord) => (
            <article className="case-card" key={caseRecord.id}>
              <div className="case-card-meta"><span>{caseRecord.publicCaseNo}</span><span>{caseRecord.category}</span></div>
              <h2>{caseRecord.currentStatus}</h2>
              <p>{caseRecord.publicSummary}</p>
              <div className="case-card-footer">
                <span>最近更新：{formatDate(caseRecord.updatedAt)}</span>
                <Link className="case-link" href={`/student-rights/cases/${encodeURIComponent(caseRecord.publicCaseNo)}`}>
                  查看處理歷程 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
