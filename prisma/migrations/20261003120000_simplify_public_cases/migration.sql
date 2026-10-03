-- Keep existing case IDs, event relationships, and audit targets intact.
-- A database sequence supplies the visible case number for new and existing rows.
ALTER TABLE "PublicCase" ADD COLUMN "number" SERIAL;
CREATE UNIQUE INDEX "PublicCase_number_key" ON "PublicCase"("number");

-- Preserve removed values in the existing admin-only audit history before
-- dropping their columns. Existing case and event IDs remain unchanged.
INSERT INTO "CaseAuditLog" ("id", "actor", "action", "targetType", "targetId", "before", "after")
SELECT 'archive-20261003-case-' || "id", 'migration:20261003', 'ARCHIVE_REMOVED_FIELDS',
       'PUBLIC_CASE', "id",
       jsonb_build_object('publicCaseNo', "publicCaseNo", 'source', "source", 'currentStatus', "currentStatus"),
       jsonb_build_object('number', "number")
FROM "PublicCase";

INSERT INTO "CaseAuditLog" ("id", "actor", "action", "targetType", "targetId", "before")
SELECT 'archive-20261003-event-' || "id", 'migration:20261003', 'ARCHIVE_REMOVED_FIELDS',
       'TIMELINE_EVENT', "id", jsonb_build_object('status', "status")
FROM "CaseTimelineEvent";

DROP INDEX "PublicCase_publicCaseNo_key";
DROP INDEX "PublicCase_isPublic_source_idx";
ALTER TABLE "PublicCase" DROP COLUMN "publicCaseNo", DROP COLUMN "source", DROP COLUMN "currentStatus";
CREATE INDEX "PublicCase_isPublic_idx" ON "PublicCase"("isPublic");

ALTER TABLE "CaseTimelineEvent" DROP COLUMN "status";
