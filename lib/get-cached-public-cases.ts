import { unstable_cache } from "next/cache";
import prisma from "./prisma";
import { isPublicCaseTableMissing } from "./student-rights-cases";

export interface HomePublicCase {
  id: string;
  number: number;
  openedAt: string;
  currentSituation: string;
  publicSummary: string;
  updatedAt: string;
  timelineEvents: {
    id: string;
    occurredAt: string;
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
            orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          },
        },
        orderBy: { number: "desc" },
      });
      return rows.map((caseRecord) => ({
        id: caseRecord.id,
        number: caseRecord.number,
        openedAt: caseRecord.openedAt.toISOString(),
        currentSituation: caseRecord.currentSituation,
        publicSummary: caseRecord.publicSummary,
        updatedAt: caseRecord.updatedAt.toISOString(),
        timelineEvents: caseRecord.timelineEvents.map((event) => ({
          id: event.id,
          occurredAt: event.occurredAt.toISOString(),
          publicNote: event.publicNote,
        })),
      }));
    } catch (error) {
      // Keep the public home page available while a newly deployed migration is pending.
      if (isPublicCaseTableMissing(error)) {
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
