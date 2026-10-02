import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CaseValidationError, isStudentRightsCaseManager, parseEventInput, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function revalidatePublicCases() {
  revalidatePath("/student-rights/cases");
  revalidatePath("/student-rights/cases/[publicCaseNo]", "page");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const { id: caseId } = await params;
    const input = parseEventInput(await request.json());
    const actor = session.user.email.toLowerCase();
    const event = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.publicCase.findUnique({ where: { id: caseId } });
      if (!caseRecord) return null;
      const created = await tx.caseTimelineEvent.create({
        data: { ...input, isPublic: input.isPublic ?? false, caseId, createdBy: actor, updatedBy: actor },
      });
      const newestPublicEvent = await tx.caseTimelineEvent.findFirst({
        where: { caseId, isPublic: true },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      });
      if (newestPublicEvent) {
        await tx.publicCase.update({ where: { id: caseId }, data: { currentStatus: newestPublicEvent.status, updatedBy: actor } });
      }
      await tx.caseAuditLog.create({
        data: { actor, action: "CREATE", targetType: "TIMELINE_EVENT", targetId: created.id, after: toAuditSnapshot(created) },
      });
      return created;
    });
    if (!event) return NextResponse.json({ errorCode: "CASE_NOT_FOUND" }, { status: 404 });
    revalidatePublicCases();
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof CaseValidationError) return NextResponse.json({ errorCode: error.message }, { status: 400 });
    console.error("建立公開案件進度失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
