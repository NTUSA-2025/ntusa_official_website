import { unstable_cache } from "next/cache";
import prisma from "./prisma";

export interface HomePublicCase {
  id: string;
  publicCaseNo: string;
  category: string;
  currentStatus: string;
  publicSummary: string;
  updatedAt: string;
  timelineEvents: {
    id: string;
    occurredAt: string;
    status: string;
    publicNote: string;
  }[];
}

const getPublicCases = unstable_cache(
  async (): Promise<HomePublicCase[]> => {
    try {
      const rows = await prisma.publicCase.findMany({
        where: { isPublic: true },
        include: {
          timelineEvents: {
            where: { isPublic: true },
            orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map((caseRecord) => ({
        id: caseRecord.id,
        publicCaseNo: caseRecord.publicCaseNo,
        category: caseRecord.category,
        currentStatus: caseRecord.currentStatus,
        publicSummary: caseRecord.publicSummary,
        updatedAt: caseRecord.updatedAt.toISOString(),
        timelineEvents: caseRecord.timelineEvents.map((event) => ({
          id: event.id,
          occurredAt: event.occurredAt.toISOString(),
          status: event.status,
          publicNote: event.publicNote,
        })),
      }));
    } catch (error) {
      // Keep the public home page available while a newly deployed migration is pending.
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2021") {
        return [];
      }
      console.error("無法讀取公開學權案件:", error);
      return [];
    }
  },
  ["public-student-rights-cases"],
  { revalidate: 30 },
);

export async function getCachedPublicCases() {
  return getPublicCases();
}
