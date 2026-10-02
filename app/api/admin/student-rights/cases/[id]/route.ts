import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CaseValidationError, isStudentRightsCaseManager, parseCaseInput, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

function revalidatePublicCases() {
  revalidatePath("/student-rights/cases");
  revalidatePath("/student-rights/cases/[publicCaseNo]", "page");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!isStudentRightsCaseManager(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const { id } = await params;
    const input = parseCaseInput(await request.json());
    const actor = session.user.email.toLowerCase();
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.publicCase.findUnique({ where: { id } });
      if (!before) return null;
      const after = await tx.publicCase.update({
        where: { id },
        data: { ...input, isPublic: input.isPublic ?? before.isPublic, updatedBy: actor },
      });
      const action = !before.isPublic && after.isPublic ? "PUBLISH" : before.isPublic && !after.isPublic ? "HIDE" : "UPDATE";
      await tx.caseAuditLog.create({
        data: { actor, action, targetType: "PUBLIC_CASE", targetId: id, before: toAuditSnapshot(before), after: toAuditSnapshot(after) },
      });
      return after;
    });
    if (!updated) return NextResponse.json({ errorCode: "CASE_NOT_FOUND" }, { status: 404 });
    revalidatePublicCases();
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof CaseValidationError) return NextResponse.json({ errorCode: error.message }, { status: 400 });
    console.error("更新公開學權案件失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
