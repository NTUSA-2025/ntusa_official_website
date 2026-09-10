import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const minute = await prisma.meetingMinute.findUnique({ where: { id } });
    if (!minute) {
      return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
    }

    const userEmail = session.user.email;
    const userRole = session.user.role;
    const userDepartment = session.user.department;

    const isAuthor = minute.authorEmail?.toLowerCase() === userEmail.toLowerCase();
    const isReviewer = userRole === "admin" || userRole === "reviewer" || userDepartment === "公關部";

    if (!isAuthor && !isReviewer) {
      return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.meetingMinute.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/minutes/upload");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("刪除會議紀錄失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
