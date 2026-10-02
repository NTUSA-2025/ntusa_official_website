import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isStudentRightsCaseManager } from "@/lib/student-rights-cases";
import PublicCaseManager from "@/components/student-rights/PublicCaseManager";

export const dynamic = "force-dynamic";

export default async function PublicCaseManagePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/api/auth/signin?callbackUrl=/student-rights/cases/manage");
  if (!isStudentRightsCaseManager(session)) redirect("/");

  const cases = await prisma.publicCase.findMany({
    include: { timelineEvents: { orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] } },
    orderBy: { updatedAt: "desc" },
  });
  const serializedCases = cases.map((caseRecord) => ({
    ...caseRecord,
    createdAt: caseRecord.createdAt.toISOString(),
    updatedAt: caseRecord.updatedAt.toISOString(),
    timelineEvents: caseRecord.timelineEvents.map((event) => ({
      ...event,
      occurredAt: event.occurredAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    })),
    auditLogs: [],
  }));

  const auditTargets = serializedCases.flatMap((caseRecord) => [
    caseRecord.id,
    ...caseRecord.timelineEvents.map((event) => event.id),
  ]);
  const auditLogs = await prisma.caseAuditLog.findMany({
    where: { targetId: { in: auditTargets } },
    orderBy: { createdAt: "desc" },
  });
  const auditLogsByTarget = new Map<string, typeof auditLogs>();
  for (const log of auditLogs) {
    auditLogsByTarget.set(log.targetId, [...(auditLogsByTarget.get(log.targetId) || []), log]);
  }
  const casesWithAuditLogs = serializedCases.map((caseRecord) => ({
    ...caseRecord,
    auditLogs: [caseRecord.id, ...caseRecord.timelineEvents.map((event) => event.id)]
      .flatMap((targetId) => auditLogsByTarget.get(targetId) || [])
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((log) => ({ ...log, createdAt: log.createdAt.toISOString() })),
  }));

  return <PublicCaseManager initialCases={casesWithAuditLogs} />;
}
