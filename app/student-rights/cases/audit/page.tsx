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
  let auditGroups: Awaited<ReturnType<typeof getAuditGroups>> = [];

  try {
    auditGroups = await getAuditGroups();
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
          <span>
            {auditGroups.length} 件案件 · {auditGroups.reduce((total, group) => total + group.records.length, 0)} 筆
          </span>
        </div>

        {auditGroups.length ? (
          <div className="case-audit-groups">
            {auditGroups.map((group, index) => (
              <details className="case-audit-group" key={group.key} open={index === 0}>
                <summary>
                  <span className="case-audit-group-heading">
                    <strong>{group.caseTarget ? `案件 #${group.caseTarget.number}` : "無法對應案件"}</strong>
                    <span>{group.records.length} 筆 · 最近操作 {displayDateTime(group.records[0].createdAt)}</span>
                  </span>
                  <span className="case-audit-expand" aria-hidden="true" />
                </summary>
                <div className="case-audit-group-content">
                  {group.caseTarget ? (
                    <Link className="case-audit-case-link" href={`/student-rights/cases/manage/${group.caseTarget.id}`}>
                      開啟案件 →
                    </Link>
                  ) : null}
                  <ol className="case-audit-list case-audit-page-list">
                    {group.records.map((record) => (
                      <li key={record.id}>
                        <div className="case-audit-primary">
                          <strong>{actionLabels[record.action] || record.action}</strong>
                          <span className="case-audit-target">{targetTypeLabel(record.targetType)}</span>
                        </div>
                        <span className="case-audit-meta">
                          {displayDateTime(record.createdAt)} · {record.actor}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="caption">尚無稽核紀錄。</p>
        )}
      </section>
    </section>
  );
}

async function getAuditGroups() {
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

  const groups = new Map<string, {
    key: string;
    caseTarget: { id: string; number: number } | null;
    records: typeof logs;
  }>();

  for (const log of logs) {
    const caseTarget = targetMap.get(log.targetId) || null;
    const key = caseTarget?.id || "unmatched";
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.records.push(log);
    } else {
      groups.set(key, { key, caseTarget, records: [log] });
    }
  }

  return Array.from(groups.values());
}
