import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canManageStudentRightsCaseTags, CaseValidationError, isPublicCaseTableMissing, isStudentRightsCaseManager, parseCaseInput, resolveCaseTagIds, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function revalidatePublicCases() {
  revalidatePath("/");
  revalidatePath("/cases");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const cases = await prisma.publicCase.findMany({
      include: { tags: { orderBy: { name: "asc" } }, timelineEvents: { orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] } },
      orderBy: { number: "desc" },
    });
    return NextResponse.json(cases);
  } catch (error) {
    if (isPublicCaseTableMissing(error)) return NextResponse.json({ errorCode: "MIGRATION_PENDING" }, { status: 503 });
    console.error("讀取管理端學權案件失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const input = parseCaseInput(await request.json());
    const actor = session.user.email.toLowerCase();
    const created = await prisma.$transaction(async (tx) => {
      const tagIds = await resolveCaseTagIds(tx, input.tagIds, input.newTagNames, canManageStudentRightsCaseTags(session));
      const caseRecord = await tx.publicCase.create({
        data: {
          openedAt: input.openedAt,
          currentSituation: input.currentSituation,
          publicSummary: input.publicSummary,
          isPublic: input.isPublic ?? false,
          createdBy: actor,
          updatedBy: actor,
          tags: tagIds ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        },
        include: { tags: true },
      });
      const initialEvent = await tx.caseTimelineEvent.create({
        data: {
          caseId: caseRecord.id,
          occurredAt: input.openedAt,
          publicNote: input.currentSituation,
          isPublic: input.isPublic ?? false,
          createdBy: actor,
          updatedBy: actor,
        },
      });
      await tx.caseAuditLog.create({
        data: { actor, action: "CREATE", targetType: "PUBLIC_CASE", targetId: caseRecord.id, after: toAuditSnapshot(caseRecord) },
      });
      await tx.caseAuditLog.create({
        data: { actor, action: "CREATE", targetType: "TIMELINE_EVENT", targetId: initialEvent.id, after: toAuditSnapshot(initialEvent) },
      });
      return caseRecord;
    });
    revalidatePublicCases();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof CaseValidationError) return NextResponse.json({ errorCode: error.message }, { status: 400 });
    console.error("建立公開學權案件失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
