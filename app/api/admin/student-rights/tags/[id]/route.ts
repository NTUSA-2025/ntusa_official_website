import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canManageStudentRightsCaseTags, CaseValidationError, isCaseDatabaseUnavailable, isCaseTagNameConflict, parseCaseTagName, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!canManageStudentRightsCaseTags(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const { id } = await params;
    const input = parseCaseTagName(await request.json());
    const actor = session.user.email.toLowerCase();
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.caseTag.findUnique({ where: { id } });
      if (!before) return null;
      const after = await tx.caseTag.update({ where: { id }, data: input });
      await tx.caseAuditLog.create({
        data: { actor, action: "UPDATE", targetType: "CASE_TAG", targetId: id, before: toAuditSnapshot(before), after: toAuditSnapshot(after) },
      });
      return after;
    });
    if (!updated) return NextResponse.json({ errorCode: "TAG_NOT_FOUND" }, { status: 404 });
    revalidatePath("/");
    revalidatePath("/cases");
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof CaseValidationError) return NextResponse.json({ errorCode: error.message }, { status: 400 });
    if (isCaseTagNameConflict(error)) return NextResponse.json({ errorCode: "TAG_ALREADY_EXISTS" }, { status: 409 });
    console.error("更新學權案件標籤失敗:", error);
    if (isCaseDatabaseUnavailable(error)) return NextResponse.json({ errorCode: "DATABASE_UNAVAILABLE" }, { status: 503 });
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
