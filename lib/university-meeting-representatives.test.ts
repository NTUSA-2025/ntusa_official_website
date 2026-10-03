import { describe, expect, it } from "vitest";
import { getUniversityMeetings } from "./university-meeting-representatives";

describe("university meeting representatives data", () => {
  it("includes all meetings and groups additional representatives", () => {
    const meetings = getUniversityMeetings();

    expect(meetings).toHaveLength(50);
    expect(new Set(meetings.map((meeting) => meeting.id)).size).toBe(meetings.length);
    expect(meetings.find((meeting) => meeting.name === "行政E化工作小組會議")?.representatives)
      .toHaveLength(2);
  });

  it("contains only valid public links and emails", () => {
    for (const meeting of getUniversityMeetings()) {
      if (meeting.regulationUrl) expect(new URL(meeting.regulationUrl).protocol).toBe("https:");
      for (const representative of meeting.representatives) {
        if (representative.email) expect(representative.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      }
    }
  });
});
