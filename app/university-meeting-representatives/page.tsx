import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MeetingRepresentativesPageClient from "@/components/representatives/MeetingRepresentativesPageClient";
import { getUniversityMeetings } from "@/lib/university-meeting-representatives";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("representativesTitle"),
    description: t("representativesDescription"),
  };
}

export default function UniversityMeetingRepresentativesPage() {
  return <MeetingRepresentativesPageClient meetings={getUniversityMeetings()} />;
}
