import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canManageStudentRightsCaseTags, CaseValidationError, isCaseTagNameConflict, parseCaseTagName, toAuditSnapshot } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  if (!canManageStudentRightsCaseTags(session)) return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });

  try {
    const input = parseCaseTagName(await request.json());
    const actor = session.user.email.toLowerCase();
    const tag = await prisma.$transaction(async (tx) => {
      const created = await tx.caseTag.create({ data: input });
      await tx.caseAuditLog.create({
        data: { actor, action: "CREATE", targetType: "CASE_TAG", targetId: created.id, after: toAuditSnapshot(created) },
      });
      return created;
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    if (error instanceof CaseValidationError) return NextResponse.json({ errorCode: error.message }, { status: 400 });
    if (isCaseTagNameConflict(error)) return NextResponse.json({ errorCode: "TAG_ALREADY_EXISTS" }, { status: 409 });
    console.error("建立學權案件標籤失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
