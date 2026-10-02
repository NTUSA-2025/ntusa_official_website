import { describe, expect, it } from "vitest";
import { parseUniversityMeetings } from "./university-meeting-representatives";

function gviz(rows: unknown[][]): string {
  return `google.visualization.Query.setResponse(${JSON.stringify({
    table: { rows: rows.map((cells) => ({ c: cells.map((v) => ({ v })) })) },
  })});`;
}

describe("parseUniversityMeetings", () => {
  it("maps public meeting information and omits student IDs", () => {
    const meetings = parseUniversityMeetings(
      gviz([
        ["會議名稱", "學生會代表", "代表聯絡資訊", "代表學號"],
        [
          "校務會議",
          "會長 社會科學院 王小明",
          "president@example.com",
          "B00123456",
          "會長為當然代表",
          "不需要",
          "學代會",
          "秘書室",
          "校務治理",
          "每學期 2 次",
          "https://example.com/rules",
          "備註",
        ],
      ]),
    );

    expect(meetings).toEqual([
      {
        id: "meeting-1",
        name: "校務會議",
        representatives: [
          { name: "會長 社會科學院 王小明", email: "president@example.com" },
        ],
        appointmentMethod: "會長為當然代表",
        reportStatus: "不需要",
        otherRepresentatives: "學代會",
        office: "秘書室",
        subject: "校務治理",
        frequency: "每學期 2 次",
        regulationUrl: "https://example.com/rules",
        note: "備註",
      },
    ]);
    expect(JSON.stringify(meetings)).not.toContain("B00123456");
  });

  it("adds continuation-row representatives to the preceding meeting", () => {
    const meetings = parseUniversityMeetings(
      gviz([
        ["會議名稱", "學生會代表", "代表聯絡資訊"],
        ["行政會議", "資訊部部長 王小明", "a@example.com"],
        ["", "資訊部副部長 陳小華", "b@example.com"],
      ]),
    );

    expect(meetings).toHaveLength(1);
    expect(meetings[0].representatives).toEqual([
      { name: "資訊部部長 王小明", email: "a@example.com" },
      { name: "資訊部副部長 陳小華", email: "b@example.com" },
    ]);
  });

  it("rejects non-http regulation links and malformed email addresses", () => {
    const meetings = parseUniversityMeetings(
      gviz([
        ["會議名稱", "學生會代表", "代表聯絡資訊"],
        ["測試會議", "待推派", "not-an-email", "", "", "", "", "", "", "", "javascript:alert(1)"],
      ]),
    );

    expect(meetings[0].representatives).toEqual([{ name: "待推派", email: undefined }]);
    expect(meetings[0].regulationUrl).toBeUndefined();
  });
});
