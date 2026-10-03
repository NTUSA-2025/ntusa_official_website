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
    openedAt: "2026-08-05",
    currentSituation: "將持續追蹤後續公告與使用者回饋。",
    publicSummary: "學生反映宿舍生活資源與使用規則的資訊需要更清楚易懂。",
    events: [
      ["2026-08-05", "學權部已記錄學生提出的住宿資源使用建議。"],
      ["2026-08-12", "已彙整問題並與相關單位確認可改善的資訊呈現方式。"],
      ["2026-08-26", "將持續追蹤後續公告與使用者回饋。"],
    ],
  },
  {
    openedAt: "2026-08-08",
    currentSituation: "等待相關單位評估可行的改善方案。",
    publicSummary: "學生建議改善校園通行與停車環境，提升步行及騎乘安全。",
    events: [
      ["2026-08-08", "已蒐集學生對校園通行環境的意見。"],
      ["2026-08-20", "已將具體建議轉交校方相關單位研議。"],
      ["2026-09-03", "等待相關單位評估可行的改善方案。"],
    ],
  },
  {
    openedAt: "2026-08-14",
    currentSituation: "已向學生說明可採取的後續處理方式。",
    publicSummary: "學生反映課程行政資訊與申訴管道的說明需要更完整。",
    events: [
      ["2026-08-14", "已確認學生提出的課程行政資訊需求。"],
      ["2026-08-22", "已協助確認現行規範與可使用的正式反映管道。"],
      ["2026-08-29", "已向學生說明可採取的後續處理方式。"],
    ],
  },
  {
    openedAt: "2026-09-01",
    currentSituation: "將追蹤改善措施是否落實與使用情形。",
    publicSummary: "學生反映公共空間的環境品質與維護需求。",
    events: [
      ["2026-09-01", "已記錄公共空間環境改善建議。"],
      ["2026-09-09", "已向管理單位反映並確認後續處理窗口。"],
      ["2026-09-18", "將追蹤改善措施是否落實與使用情形。"],
    ],
  },
  {
    openedAt: "2026-09-05",
    currentSituation: "將依後續措施與學生回饋持續更新公開進度。",
    publicSummary: "學生建議持續改善校園生活服務的資訊透明度與選擇性。",
    events: [
      ["2026-09-05", "已彙整學生對校園生活服務的建議。"],
      ["2026-09-16", "已將建議納入與相關單位的溝通事項。"],
      ["2026-09-25", "將依後續措施與學生回饋持續更新公開進度。"],
    ],
  },
];

try {
  for (const seedCase of cases) {
    const existingCase = await prisma.publicCase.findFirst({
      where: { createdBy: actor, publicSummary: seedCase.publicSummary },
    });
    const caseData = {
      openedAt: new Date(`${seedCase.openedAt}T12:00:00.000Z`),
      currentSituation: seedCase.currentSituation,
      publicSummary: seedCase.publicSummary,
      isPublic: true,
      updatedBy: actor,
    };
    const caseRecord = existingCase
      ? await prisma.publicCase.update({ where: { id: existingCase.id }, data: caseData })
      : await prisma.publicCase.create({ data: { ...caseData, createdBy: actor } });

    for (const [occurredAt, publicNote] of seedCase.events) {
      const existing = await prisma.caseTimelineEvent.findFirst({
        where: { caseId: caseRecord.id, publicNote },
        select: { id: true },
      });
      const event = existing
        ? await prisma.caseTimelineEvent.update({
            where: { id: existing.id },
            data: { occurredAt: new Date(`${occurredAt}T12:00:00.000Z`), isPublic: true, updatedBy: actor },
          })
        : await prisma.caseTimelineEvent.create({
            data: {
              caseId: caseRecord.id,
              occurredAt: new Date(`${occurredAt}T12:00:00.000Z`),
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
