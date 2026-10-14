import DataPageClient from "@/components/public-pages/DataPageClient";
import { getCachedMeetingMinutes } from "@/lib/get-cached-meeting-minutes";
import { getUniversityMeetings } from "@/lib/university-meeting-representatives";

export default async function DataPage() {
  const minutes = await getCachedMeetingMinutes();
  return <DataPageClient minutes={minutes} meetings={getUniversityMeetings()} />;
}
