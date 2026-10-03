import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isStudentRightsCaseManager, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function revalidatePublicCases() {
  revalidatePath("/");
  revalidatePath("/cases");
}

// Keep event content append-only; visibility changes retain an audit record.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  let isPublic: unknown;
  try {
    isPublic = (await request.json()).isPublic;
  } catch {
    return NextResponse.json({ errorCode: "INVALID_BODY" }, { status: 400 });
  }
  if (typeof isPublic !== "boolean") return NextResponse.json({ errorCode: "IS_PUBLIC_INVALID" }, { status: 400 });

  const { id } = await params;
  const actor = session.user.email.toLowerCase();
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.caseTimelineEvent.findUnique({ where: { id } });
    if (!before) return null;
    if (before.isPublic === isPublic) return { event: before };
    const after = await tx.caseTimelineEvent.update({ where: { id }, data: { isPublic, updatedBy: actor } });
    const newestPublicEvent = await tx.caseTimelineEvent.findFirst({
      where: { caseId: before.caseId, isPublic: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });
    const caseRecord = await tx.publicCase.findUniqueOrThrow({ where: { id: before.caseId } });
    if (!newestPublicEvent && caseRecord.isPublic) {
      throw new Error("PUBLIC_EVENT_REQUIRED");
    }
    if (newestPublicEvent) {
      await tx.publicCase.update({
        where: { id: before.caseId },
        data: { currentSituation: newestPublicEvent.publicNote, updatedBy: actor },
      });
    }
    await tx.caseAuditLog.create({ data: { actor, action: isPublic ? "PUBLISH" : "HIDE", targetType: "TIMELINE_EVENT", targetId: id, before: toAuditSnapshot(before), after: toAuditSnapshot(after) } });
    return { event: after };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "PUBLIC_EVENT_REQUIRED") return "PUBLIC_EVENT_REQUIRED" as const;
    throw error;
  });
  if (result === "PUBLIC_EVENT_REQUIRED") return NextResponse.json({ errorCode: result }, { status: 400 });
  if (!result) return NextResponse.json({ errorCode: "EVENT_NOT_FOUND" }, { status: 404 });
  revalidatePublicCases();
  return NextResponse.json(result.event);
}
