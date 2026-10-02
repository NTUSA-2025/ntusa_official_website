import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MeetingRepresentativesPageClient from "@/components/representatives/MeetingRepresentativesPageClient";
import {
  getUniversityMeetings,
  REPRESENTATIVES_SOURCE_URL,
  type UniversityMeeting,
} from "@/lib/university-meeting-representatives";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("representativesTitle"),
    description: t("representativesDescription"),
  };
}

export default async function UniversityMeetingRepresentativesPage() {
  let meetings: UniversityMeeting[] = [];
  let loadFailed = false;

  try {
    meetings = await getUniversityMeetings();
  } catch (error) {
    loadFailed = true;
    console.error("Failed to load university meeting representatives", error);
  }

  return (
    <MeetingRepresentativesPageClient
      meetings={meetings}
      loadFailed={loadFailed}
      sourceUrl={REPRESENTATIVES_SOURCE_URL}
    />
  );
}
