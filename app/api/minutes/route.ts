import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const minutes = await prisma.meetingMinute.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json(minutes);
  } catch (error) {
    console.error("讀取會議紀錄失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!session.user.email.endsWith("@ntusa.ntu.edu.tw")) {
      return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { title, date, url } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ errorCode: "TITLE_REQUIRED" }, { status: 400 });
    }

    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      return NextResponse.json({ errorCode: "INVALID_DATE" }, { status: 400 });
    }

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ errorCode: "URL_REQUIRED" }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(url.trim());
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json({ errorCode: "INVALID_URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ errorCode: "INVALID_URL" }, { status: 400 });
    }

    const newMinute = await prisma.meetingMinute.create({
      data: {
        title: title.trim(),
        date: date.trim(),
        url: url.trim(),
        authorEmail: session.user.email,
        authorName: session.user.name || null,
        department: session.user.department || null,
      },
    });

    revalidatePath("/");
    revalidatePath("/minutes/upload");
    return NextResponse.json(newMinute, { status: 201 });
  } catch (error) {
    console.error("建立會議紀錄失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
