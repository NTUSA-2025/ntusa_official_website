import Link from "next/link";
import prisma from "@/lib/prisma";
import { isPublicCaseTableMissing } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function displayDate(value: Date) {
  return value.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function PublicCaseManagePage() {
  let migrationPending = false;
  let cases: Awaited<ReturnType<typeof getCases>> = [];

  try {
    cases = await getCases();
  } catch (error) {
    if (!isPublicCaseTableMissing(error)) throw error;
    migrationPending = true;
  }

  return (
    <section className="case-manager">
      <header className="case-manager-header">
        <div className="case-manager-header-copy">
          <p className="case-eyebrow">ADMINISTRATION</p>
          <h1>學權案件管理</h1>
          <p>檢視所有公開與未公開案件；進入案件後才能更新進度或調整基本資料。</p>
        </div>
        <Link className="btn btn-primary" href="/student-rights/cases/manage/new">
          新增案件
        </Link>
      </header>

      {migrationPending ? (
        <p className="case-manager-message" role="alert">
          資料庫 migration 尚未完成；請在 staging 資料庫執行 <code>npm run db:migrate</code> 後重新整理。
        </p>
      ) : null}

      <section className="case-manager-panel case-manager-list-panel">
        <div className="case-manager-section-heading">
          <h2>所有案件</h2>
          <span>{cases.length} 件</span>
        </div>

        {cases.length ? (
          <div className="case-manager-case-list">
            {cases.map((caseRecord) => {
              const latestProgress = caseRecord.timelineEvents[0]?.publicNote || caseRecord.currentSituation;

              return (
                <Link
                  className="case-manager-case-link"
                  href={`/student-rights/cases/manage/${caseRecord.id}`}
                  key={caseRecord.id}
                >
                  <div className="case-manager-case-row">
                    <strong>案件 #{caseRecord.number}</strong>
                    <span className={`case-manager-status ${caseRecord.isPublic ? "public" : ""}`}>
                      {caseRecord.isPublic ? "公開" : "未公開"}
                    </span>
                  </div>
                  <h3>{caseRecord.publicSummary}</h3>
                  <p className="case-manager-case-progress">{latestProgress}</p>
                  <div className="case-manager-case-dates">
                    <span>建案：{displayDate(caseRecord.openedAt)}</span>
                    <span>最近更新：{displayDate(caseRecord.updatedAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="case-manager-empty">
            <p>尚未建立案件。</p>
            <Link className="btn btn-outline" href="/student-rights/cases/manage/new">建立第一個案件</Link>
          </div>
        )}
      </section>
    </section>
  );
}

function getCases() {
  return prisma.publicCase.findMany({
    include: {
      timelineEvents: {
        orderBy: [{ occurredAt: "desc" as const }, { createdAt: "desc" as const }],
        take: 1,
      },
    },
    orderBy: { number: "desc" },
  });
}
