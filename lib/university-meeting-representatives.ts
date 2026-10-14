import meetings from "@/data/university-meeting-representatives.json";

export type MeetingRepresentative = {
  name: string;
  email?: string;
  studentId?: string;
};

export type UniversityMeeting = {
  id: string;
  name: string;
  representatives: MeetingRepresentative[];
  appointmentMethod?: string;
  reportStatus?: string;
  otherRepresentatives?: string;
  office?: string;
  subject?: string;
  frequency?: string;
  regulationUrl?: string;
  minutesUrl?: string;
  note?: string;
};

export function getUniversityMeetings(): UniversityMeeting[] {
  return meetings;
}
