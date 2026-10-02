import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CaseValidationError, isStudentRightsCaseManager, parseCaseInput, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function revalidatePublicCases() {
  revalidatePath("/");
  revalidatePath("/student-rights/cases");
  revalidatePath("/student-rights/cases/[publicCaseNo]", "page");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  const cases = await prisma.publicCase.findMany({
    include: { timelineEvents: { orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const input = parseCaseInput(await request.json());
    const actor = session.user.email.toLowerCase();
    const created = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.publicCase.create({
        data: {
          ...input,
          isPublic: input.isPublic ?? false,
          createdBy: actor,
          updatedBy: actor,
        },
      });
      await tx.caseAuditLog.create({
        data: { actor, action: "CREATE", targetType: "PUBLIC_CASE", targetId: caseRecord.id, after: toAuditSnapshot(caseRecord) },
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
