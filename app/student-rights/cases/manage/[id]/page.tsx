import { notFound, redirect } from "next/navigation";
import PublicCaseManager from "@/components/student-rights/PublicCaseManager";
import prisma from "@/lib/prisma";
import { canCreateStudentRightsCaseTags, isPublicCaseTableMissing } from "@/lib/student-rights-cases";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditPublicCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let caseRecord = null;
  let tags: { id: string; name: string }[] = [];
  const session = await getServerSession(authOptions);

  try {
    [caseRecord, tags] = await Promise.all([prisma.publicCase.findUnique({
      where: { id },
      include: {
        tags: { orderBy: { name: "asc" } },
        timelineEvents: {
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        },
      },
    }), prisma.caseTag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  } catch (error) {
    if (!isPublicCaseTableMissing(error)) throw error;
    redirect("/student-rights/cases/manage");
  }

  if (!caseRecord) notFound();

  const serializedCase = {
    ...caseRecord,
    openedAt: caseRecord.openedAt.toISOString(),
    createdAt: caseRecord.createdAt.toISOString(),
    updatedAt: caseRecord.updatedAt.toISOString(),
    tags: caseRecord.tags.map(({ id, name }) => ({ id, name })),
    timelineEvents: caseRecord.timelineEvents.map((timelineEvent) => ({
      ...timelineEvent,
      occurredAt: timelineEvent.occurredAt.toISOString(),
      createdAt: timelineEvent.createdAt.toISOString(),
      updatedAt: timelineEvent.updatedAt.toISOString(),
    })),
  };

  return <PublicCaseManager caseRecord={serializedCase} tagOptions={tags} canCreateTags={canCreateStudentRightsCaseTags(session)} />;
}
