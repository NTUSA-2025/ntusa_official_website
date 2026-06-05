/**
 * Static registry of published meeting minutes (會議紀錄).
 *
 * To publish a new document: add the PDF to `public/minutes/` and prepend an
 * entry here (newest first). `type` maps to a localized label in
 * `messages/*.json` under `home.data.types`.
 */
export type MeetingType = "admin";

export interface MeetingMinute {
  /** Stable id, also used as React key (ISO date). */
  id: string;
  /** ISO date (YYYY-MM-DD) of the meeting, formatted per locale in the UI. */
  date: string;
  /** Meeting category; resolved to a localized title. */
  type: MeetingType;
  /** Public path to the PDF served from `public/`. */
  file: string;
}

export const meetingMinutes: readonly MeetingMinute[] = [
  { id: "2026-06-03", date: "2026-06-03", type: "admin", file: "/minutes/2026-06-03-admin-meeting.pdf" },
  { id: "2026-05-20", date: "2026-05-20", type: "admin", file: "/minutes/2026-05-20-admin-meeting.pdf" },
  { id: "2026-04-22", date: "2026-04-22", type: "admin", file: "/minutes/2026-04-22-admin-meeting.pdf" },
  { id: "2026-04-10", date: "2026-04-10", type: "admin", file: "/minutes/2026-04-10-admin-meeting.pdf" },
];
