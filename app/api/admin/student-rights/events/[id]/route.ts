import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isStudentRightsCaseManager, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function revalidatePublicCases() {
  revalidatePath("/");
  revalidatePath("/student-rights/cases");
  revalidatePath("/student-rights/cases/[publicCaseNo]", "page");
}

// Events are append-only. Hiding is the safe correction path and preserves the original record.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  const { id } = await params;
  const actor = session.user.email.toLowerCase();
  const event = await prisma.$transaction(async (tx) => {
    const before = await tx.caseTimelineEvent.findUnique({ where: { id } });
    if (!before) return null;
    const after = await tx.caseTimelineEvent.update({ where: { id }, data: { isPublic: false, updatedBy: actor } });
    const newestPublicEvent = await tx.caseTimelineEvent.findFirst({
      where: { caseId: before.caseId, isPublic: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });
    if (newestPublicEvent) {
      await tx.publicCase.update({ where: { id: before.caseId }, data: { currentStatus: newestPublicEvent.status, updatedBy: actor } });
    }
    await tx.caseAuditLog.create({ data: { actor, action: "HIDE", targetType: "TIMELINE_EVENT", targetId: id, before: toAuditSnapshot(before), after: toAuditSnapshot(after) } });
    return after;
  });
  if (!event) return NextResponse.json({ errorCode: "EVENT_NOT_FOUND" }, { status: 404 });
  revalidatePublicCases();
  return NextResponse.json(event);
}
