import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CaseValidationError, isStudentRightsCaseManager, parseEventInput, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function revalidatePublicCases() {
  revalidatePath("/");
  revalidatePath("/cases");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const input = parseEventInput(await request.json());
    const { id } = await params;
    const actor = session.user.email.toLowerCase();
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.caseTimelineEvent.findUnique({ where: { id } });
      if (!before) return null;
      const after = await tx.caseTimelineEvent.update({
        where: { id },
        data: { ...input, isPublic: input.isPublic ?? before.isPublic, updatedBy: actor },
      });
      const newestPublicEvent = await tx.caseTimelineEvent.findFirst({
        where: { caseId: before.caseId, isPublic: true },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      });
      const caseRecord = await tx.publicCase.findUniqueOrThrow({ where: { id: before.caseId } });
      if (!newestPublicEvent && caseRecord.isPublic) throw new CaseValidationError("PUBLIC_EVENT_REQUIRED");
      if (newestPublicEvent) {
        await tx.publicCase.update({
          where: { id: before.caseId },
          data: { currentSituation: newestPublicEvent.publicNote, updatedBy: actor },
        });
      }
      const action = before.isPublic !== after.isPublic ? (after.isPublic ? "PUBLISH" : "HIDE") : "UPDATE";
      await tx.caseAuditLog.create({ data: { actor, action, targetType: "TIMELINE_EVENT", targetId: id, before: toAuditSnapshot(before), after: toAuditSnapshot(after) } });
      return after;
    });
    if (!result) return NextResponse.json({ errorCode: "EVENT_NOT_FOUND" }, { status: 404 });
    revalidatePublicCases();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CaseValidationError) return NextResponse.json({ errorCode: error.message }, { status: 400 });
    console.error("更新公開案件進度失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const { id } = await params;
    const actor = session.user.email.toLowerCase();
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.caseTimelineEvent.findUnique({ where: { id } });
      if (!before) return null;
      await tx.caseTimelineEvent.delete({ where: { id } });
      const newestPublicEvent = await tx.caseTimelineEvent.findFirst({
        where: { caseId: before.caseId, isPublic: true },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      });
      const caseRecord = await tx.publicCase.findUniqueOrThrow({ where: { id: before.caseId } });
      if (!newestPublicEvent && caseRecord.isPublic) throw new CaseValidationError("PUBLIC_EVENT_REQUIRED");
      if (newestPublicEvent) {
        await tx.publicCase.update({
          where: { id: before.caseId },
          data: { currentSituation: newestPublicEvent.publicNote, updatedBy: actor },
        });
      }
      await tx.caseAuditLog.create({ data: { actor, action: "DELETE", targetType: "TIMELINE_EVENT", targetId: id, before: toAuditSnapshot(before) } });
      return before;
    });
    if (!result) return NextResponse.json({ errorCode: "EVENT_NOT_FOUND" }, { status: 404 });
    revalidatePublicCases();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof CaseValidationError) return NextResponse.json({ errorCode: error.message }, { status: 400 });
    console.error("刪除公開案件進度失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
