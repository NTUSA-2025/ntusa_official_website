import { connection } from "next/server";
import DataPageClient from "@/components/public-pages/DataPageClient";
import { getPublicMeetingMinutes } from "@/lib/get-public-meeting-minutes";
import { getUniversityMeetings } from "@/lib/university-meeting-representatives";

export default async function DataPage() {
  await connection();
  const minutes = await getPublicMeetingMinutes();
  return <DataPageClient minutes={minutes} meetings={getUniversityMeetings()} />;
}
