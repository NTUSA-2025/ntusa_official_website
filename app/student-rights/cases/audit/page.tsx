import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canViewStudentRightsCaseAudit, isPublicCaseTableMissing } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

const actionLabels: Record<string, string> = {
  CREATE: "建立",
  UPDATE: "更新",
  PUBLISH: "公開",
  HIDE: "設為不公開",
  ARCHIVE_REMOVED_FIELDS: "封存舊欄位",
  SEED_CREATE: "建立初始資料",
};

function displayDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(value);
}

function targetTypeLabel(targetType: string) {
  return targetType === "TIMELINE_EVENT" ? "進度紀錄" : "案件資料";
}

export default async function StudentRightsCaseAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/student-rights/cases/audit");
  }
  if (!canViewStudentRightsCaseAudit(session)) redirect("/");

  let migrationPending = false;
  let records: Awaited<ReturnType<typeof getAuditRecords>> = [];

  try {
    records = await getAuditRecords();
  } catch (error) {
    if (!isPublicCaseTableMissing(error)) throw error;
    migrationPending = true;
  }

  return (
    <section className="case-manager">
      <Link className="case-manager-back" href="/student-rights/cases/manage">
        ← 返回學權案件管理
      </Link>

      <header className="case-manager-editor-header">
        <p className="case-eyebrow">INTERNAL AUDIT</p>
        <h1>案件稽核紀錄</h1>
        <p>集中檢視案件與進度的操作紀錄；此頁面僅供學權部與資訊部使用。</p>
      </header>

      {migrationPending ? (
        <p className="case-manager-message" role="alert">
          資料庫 migration 尚未完成；請完成 migration 後重新整理。
        </p>
      ) : null}

      <section className="case-manager-panel">
        <div className="case-manager-section-heading">
          <h2>全部紀錄</h2>
          <span>{records.length} 筆</span>
        </div>

        {records.length ? (
          <ol className="case-audit-list case-audit-page-list">
            {records.map((record) => (
              <li key={record.id}>
                <div className="case-audit-primary">
                  <strong>{actionLabels[record.action] || record.action}</strong>
                  <span className="case-audit-target">
                    {record.caseTarget ? (
                      <Link href={`/student-rights/cases/manage/${record.caseTarget.id}`}>
                        案件 #{record.caseTarget.number}
                      </Link>
                    ) : (
                      "無法對應案件"
                    )}
                    {` · ${targetTypeLabel(record.targetType)}`}
                  </span>
                </div>
                <span className="case-audit-meta">
                  {displayDateTime(record.createdAt)} · {record.actor}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="caption">尚無稽核紀錄。</p>
        )}
      </section>
    </section>
  );
}

async function getAuditRecords() {
  const [logs, cases] = await Promise.all([
    prisma.caseAuditLog.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.publicCase.findMany({
      select: {
        id: true,
        number: true,
        timelineEvents: { select: { id: true } },
      },
    }),
  ]);

  const targetMap = new Map<string, { id: string; number: number }>();
  for (const caseRecord of cases) {
    const caseTarget = { id: caseRecord.id, number: caseRecord.number };
    targetMap.set(caseRecord.id, caseTarget);
    for (const timelineEvent of caseRecord.timelineEvents) {
      targetMap.set(timelineEvent.id, caseTarget);
    }
  }

  return logs.map((log) => ({
    ...log,
    caseTarget: targetMap.get(log.targetId) || null,
  }));
}
