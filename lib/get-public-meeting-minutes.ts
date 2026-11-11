import prisma from "./prisma";

export interface PublicMeetingMinute {
  id: string;
  date: string;
  title: string;
  file: string;
}

export async function getPublicMeetingMinutes(): Promise<PublicMeetingMinute[]> {
  const rows = await prisma.meetingMinute.findMany({
    orderBy: { date: "desc" },
    select: { id: true, date: true, title: true, url: true },
  });

  return rows.map((item) => ({
    id: item.id,
    date: item.date,
    title: item.title,
    file: item.url,
  }));
}
