import { unstable_cache } from "next/cache";
import prisma from "./prisma";

export interface UnifiedMeetingMinute {
  id: string;
  date: string;
  title?: string;
  file: string;
  authorEmail?: string | null;
  authorName?: string | null;
  department?: string | null;
  isDb?: boolean;
}

const getDbMeetingMinutes = unstable_cache(
  async (): Promise<UnifiedMeetingMinute[]> => {
    try {
      const rows = await prisma.meetingMinute.findMany({
        orderBy: { date: "desc" },
      });

      return rows.map((item) => ({
        id: item.id,
        date: item.date,
        title: item.title,
        file: item.url,
        authorEmail: item.authorEmail,
        authorName: item.authorName,
        department: item.department,
        isDb: true,
      }));
    } catch (error) {
      console.error("無法從資料庫取得會議紀錄:", error);
      return [];
    }
  },
  ["meeting-minutes-db-list"],
  { revalidate: 30 }
);

export async function getCachedMeetingMinutes(): Promise<UnifiedMeetingMinute[]> {
  return getDbMeetingMinutes();
}
