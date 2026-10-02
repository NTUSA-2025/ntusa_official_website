import DataPageClient from "@/components/public-pages/DataPageClient";
import { getCachedMeetingMinutes } from "@/lib/get-cached-meeting-minutes";

export default async function DataPage() {
  const minutes = await getCachedMeetingMinutes();
  return <DataPageClient minutes={minutes} />;
}
