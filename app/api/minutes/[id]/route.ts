import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";

function canManageMinute(
  minute: { authorEmail: string | null },
  user: { email?: string | null; role?: string | null; department?: string | null }
) {
  if (!user.email) return false;
  const isAuthor = minute.authorEmail?.toLowerCase() === user.email.toLowerCase();
  const isReviewer = user.role === "admin" || user.role === "reviewer" || user.department === "公關部";
  return isAuthor || isReviewer;
}

function validateMinuteInput(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const { title, date, url } = body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) return null;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  if (typeof url !== "string" || !url.trim()) return null;

  try {
    const parsedUrl = new URL(url.trim());
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { title: title.trim(), date: date.trim(), url: url.trim() };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const minute = await prisma.meetingMinute.findUnique({ where: { id } });
    if (!minute) {
      return NextResponse.json({ errorCode: "NOT_FOUND" }, { status: 404 });
    }

    if (!canManageMinute(minute, session.user)) {
      return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
    }

    const input = validateMinuteInput(await request.json());
    if (!input) {
      return NextResponse.json({ errorCode: "INVALID_INPUT" }, { status: 400 });
    }

    const updatedMinute = await prisma.meetingMinute.update({
      where: { id },
      data: input,
    });

    revalidatePath("/");
    revalidatePath("/minutes/upload");
    return NextResponse.json(updatedMinute);
  } catch (error) {
    console.error("更新會議紀錄失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}

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

    if (!canManageMinute(minute, session.user)) {
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
