export const REPRESENTATIVES_SOURCE_URL =
  "https://docs.google.com/spreadsheets/d/1d5OAYzAW_LyCyFqTIx09cQGPOaJIIQryMGv2hA982i4/edit?gid=0#gid=0";

const REPRESENTATIVES_DATA_URL =
  "https://docs.google.com/spreadsheets/d/1d5OAYzAW_LyCyFqTIx09cQGPOaJIIQryMGv2hA982i4/gviz/tq?tqx=out:json&gid=0";

type GvizCell = { v?: unknown } | null;
type GvizRow = { c?: GvizCell[] };

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
  note?: string;
};

function cellText(cells: GvizCell[], index: number): string {
  const value = cells[index]?.v;
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function optionalText(value: string): string | undefined {
  return value && value !== "X" && value !== "?" ? value : undefined;
}

function publicEmail(value: string): string | undefined {
  const email = optionalText(value);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function publicHttpUrl(value: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parsePayload(payload: string): { table?: { rows?: GvizRow[] } } {
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Invalid Google Sheets response");
  return JSON.parse(payload.slice(start, end + 1));
}

export function parseUniversityMeetings(payload: string): UniversityMeeting[] {
  const rows = parsePayload(payload).table?.rows ?? [];
  const meetings: UniversityMeeting[] = [];

  // The first row in this sheet contains its human-readable column headings.
  for (const [rowIndex, row] of rows.slice(1).entries()) {
    const cells = row.c ?? [];
    const meetingName = cellText(cells, 0);
    const representativeName = optionalText(cellText(cells, 1));
    const representativeEmail = publicEmail(cellText(cells, 2));
    const representativeStudentId = optionalText(cellText(cells, 3));

    if (!meetingName) {
      const previousMeeting = meetings.at(-1);
      if (previousMeeting && representativeName) {
        previousMeeting.representatives.push({
          name: representativeName,
          email: representativeEmail,
          studentId: representativeStudentId,
        });
      }
      continue;
    }

    meetings.push({
      id: `meeting-${rowIndex + 1}`,
      name: meetingName,
      representatives: representativeName
        ? [
            {
              name: representativeName,
              email: representativeEmail,
              studentId: representativeStudentId,
            },
          ]
        : [],
      appointmentMethod: optionalText(cellText(cells, 4)),
      reportStatus: optionalText(cellText(cells, 5)),
      otherRepresentatives: optionalText(cellText(cells, 6)),
      office: optionalText(cellText(cells, 7)),
      subject: optionalText(cellText(cells, 8)),
      frequency: optionalText(cellText(cells, 9)),
      regulationUrl: publicHttpUrl(cellText(cells, 10)),
      note: optionalText(cellText(cells, 11)),
    });
  }

  return meetings;
}

export async function getUniversityMeetings(): Promise<UniversityMeeting[]> {
  const response = await fetch(REPRESENTATIVES_DATA_URL, {
    next: { revalidate: 3600, tags: ["university-meeting-representatives"] },
  });

  if (!response.ok) {
    throw new Error(`Google Sheets returned ${response.status}`);
  }

  return parseUniversityMeetings(await response.text());
}
