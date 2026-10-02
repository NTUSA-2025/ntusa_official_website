import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed public cases.");
}

if (process.env.ALLOW_PUBLIC_CASE_SEED !== "true") {
  throw new Error("Set ALLOW_PUBLIC_CASE_SEED=true to seed fictional public cases.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const actor = "seed:infor-62";

// These are fictional, anonymized staging records. They do not reproduce the source workbook.
const cases = [
  {
    publicCaseNo: "SR-DEMO-001",
    openedAt: "2026-08-05",
    source: "陳情表單",
    currentStatus: "持續追蹤",
    currentSituation: "將持續追蹤後續公告與使用者回饋。",
    publicSummary: "學生反映宿舍生活資源與使用規則的資訊需要更清楚易懂。",
    events: [
      ["2026-08-05T09:20:00+08:00", "已收件", "學權部已記錄學生提出的住宿資源使用建議。"],
      ["2026-08-12T14:10:00+08:00", "行政協調", "已彙整問題並與相關單位確認可改善的資訊呈現方式。"],
      ["2026-08-26T11:45:00+08:00", "持續追蹤", "將持續追蹤後續公告與使用者回饋。"],
    ],
  },
  {
    publicCaseNo: "SR-DEMO-002",
    openedAt: "2026-08-08",
    source: "交流版",
    currentStatus: "研議中",
    currentSituation: "等待相關單位評估可行的改善方案。",
    publicSummary: "學生建議改善校園通行與停車環境，提升步行及騎乘安全。",
    events: [
      ["2026-08-08T16:05:00+08:00", "已收件", "已蒐集學生對校園通行環境的意見。"],
      ["2026-08-20T10:30:00+08:00", "行政協調", "已將具體建議轉交校方相關單位研議。"],
      ["2026-09-03T15:40:00+08:00", "研議中", "等待相關單位評估可行的改善方案。"],
    ],
  },
  {
    publicCaseNo: "SR-DEMO-003",
    openedAt: "2026-08-14",
    source: "信件",
    currentStatus: "已回覆",
    currentSituation: "已向學生說明可採取的後續處理方式。",
    publicSummary: "學生反映課程行政資訊與申訴管道的說明需要更完整。",
    events: [
      ["2026-08-14T08:50:00+08:00", "已收件", "已確認學生提出的課程行政資訊需求。"],
      ["2026-08-22T13:25:00+08:00", "行政協調", "已協助確認現行規範與可使用的正式反映管道。"],
      ["2026-08-29T17:10:00+08:00", "已回覆", "已向學生說明可採取的後續處理方式。"],
    ],
  },
  {
    publicCaseNo: "SR-DEMO-004",
    openedAt: "2026-09-01",
    source: "Line",
    currentStatus: "改善追蹤",
    currentSituation: "將追蹤改善措施是否落實與使用情形。",
    publicSummary: "學生反映公共空間的環境品質與維護需求。",
    events: [
      ["2026-09-01T12:15:00+08:00", "已收件", "已記錄公共空間環境改善建議。"],
      ["2026-09-09T09:35:00+08:00", "行政協調", "已向管理單位反映並確認後續處理窗口。"],
      ["2026-09-18T16:20:00+08:00", "改善追蹤", "將追蹤改善措施是否落實與使用情形。"],
    ],
  },
  {
    publicCaseNo: "SR-DEMO-005",
    openedAt: "2026-09-05",
    source: "學生會",
    currentStatus: "持續追蹤",
    currentSituation: "將依後續措施與學生回饋持續更新公開進度。",
    publicSummary: "學生建議持續改善校園生活服務的資訊透明度與選擇性。",
    events: [
      ["2026-09-05T10:05:00+08:00", "已收件", "已彙整學生對校園生活服務的建議。"],
      ["2026-09-16T14:50:00+08:00", "行政協調", "已將建議納入與相關單位的溝通事項。"],
      ["2026-09-25T11:30:00+08:00", "持續追蹤", "將依後續措施與學生回饋持續更新公開進度。"],
    ],
  },
];

try {
  for (const seedCase of cases) {
    const caseRecord = await prisma.publicCase.upsert({
      where: { publicCaseNo: seedCase.publicCaseNo },
      create: {
        publicCaseNo: seedCase.publicCaseNo,
        openedAt: new Date(`${seedCase.openedAt}T12:00:00.000Z`),
        source: seedCase.source,
        currentStatus: seedCase.currentStatus,
        currentSituation: seedCase.currentSituation,
        publicSummary: seedCase.publicSummary,
        isPublic: true,
        createdBy: actor,
        updatedBy: actor,
      },
      update: {
        openedAt: new Date(`${seedCase.openedAt}T12:00:00.000Z`),
        source: seedCase.source,
        currentStatus: seedCase.currentStatus,
        currentSituation: seedCase.currentSituation,
        publicSummary: seedCase.publicSummary,
        isPublic: true,
        updatedBy: actor,
      },
    });

    for (const [occurredAt, status, publicNote] of seedCase.events) {
      const existing = await prisma.caseTimelineEvent.findFirst({
        where: { caseId: caseRecord.id, publicNote },
        select: { id: true },
      });
      const event = existing
        ? await prisma.caseTimelineEvent.update({
            where: { id: existing.id },
            data: { occurredAt: new Date(occurredAt), status, isPublic: true, updatedBy: actor },
          })
        : await prisma.caseTimelineEvent.create({
            data: {
              caseId: caseRecord.id,
              occurredAt: new Date(occurredAt),
              status,
              publicNote,
              isPublic: true,
              createdBy: actor,
              updatedBy: actor,
            },
          });
      await prisma.caseAuditLog.create({
        data: { actor, action: existing ? "SEED_UPDATE" : "SEED_CREATE", targetType: "TIMELINE_EVENT", targetId: event.id, after: JSON.parse(JSON.stringify(event)) },
      });
    }
  }
  console.log(`Seeded ${cases.length} fictional public cases.`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
