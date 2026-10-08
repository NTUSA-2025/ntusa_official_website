import { notFound, redirect } from "next/navigation";
import PublicCaseManager from "@/components/student-rights/PublicCaseManager";
import prisma from "@/lib/prisma";
import { isPublicCaseTableMissing } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

export default async function EditPublicCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let caseRecord = null;

  try {
    caseRecord = await prisma.publicCase.findUnique({
      where: { id },
      include: {
        timelineEvents: {
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });
  } catch (error) {
    if (!isPublicCaseTableMissing(error)) throw error;
    redirect("/student-rights/cases/manage");
  }

  if (!caseRecord) notFound();

  const auditTargets = [caseRecord.id, ...caseRecord.timelineEvents.map((timelineEvent) => timelineEvent.id)];
  const auditLogs = await prisma.caseAuditLog.findMany({
    where: { targetId: { in: auditTargets } },
    orderBy: { createdAt: "desc" },
  });

  const serializedCase = {
    ...caseRecord,
    openedAt: caseRecord.openedAt.toISOString(),
    createdAt: caseRecord.createdAt.toISOString(),
    updatedAt: caseRecord.updatedAt.toISOString(),
    timelineEvents: caseRecord.timelineEvents.map((timelineEvent) => ({
      ...timelineEvent,
      occurredAt: timelineEvent.occurredAt.toISOString(),
      createdAt: timelineEvent.createdAt.toISOString(),
      updatedAt: timelineEvent.updatedAt.toISOString(),
    })),
    auditLogs: auditLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  };

  return <PublicCaseManager caseRecord={serializedCase} />;
}
