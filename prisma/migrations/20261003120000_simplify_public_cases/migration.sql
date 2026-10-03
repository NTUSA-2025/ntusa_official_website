-- Keep existing case IDs, event relationships, and audit targets intact.
-- A database sequence supplies the visible case number for new and existing rows.
ALTER TABLE "PublicCase" ADD COLUMN "number" SERIAL;
CREATE UNIQUE INDEX "PublicCase_number_key" ON "PublicCase"("number");

DROP INDEX "PublicCase_publicCaseNo_key";
DROP INDEX "PublicCase_isPublic_source_idx";
ALTER TABLE "PublicCase" DROP COLUMN "publicCaseNo", DROP COLUMN "source", DROP COLUMN "currentStatus";
CREATE INDEX "PublicCase_isPublic_idx" ON "PublicCase"("isPublic");

ALTER TABLE "CaseTimelineEvent" DROP COLUMN "status";
