import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isPublicCaseTableMissing } from "@/lib/student-rights-cases";

export const dynamic = "force-dynamic";

// This endpoint deliberately returns only data approved for public disclosure.
export async function GET() {
  try {
    const cases = await prisma.publicCase.findMany({
      where: { isPublic: true },
      select: {
        publicCaseNo: true,
        category: true,
        currentStatus: true,
        publicSummary: true,
        createdAt: true,
        updatedAt: true,
        timelineEvents: {
          where: { isPublic: true },
          select: { occurredAt: true, status: true, publicNote: true, createdAt: true, updatedAt: true },
          orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(cases);
  } catch (error) {
    if (isPublicCaseTableMissing(error)) return NextResponse.json([]);
    console.error("讀取公開學權案件失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
