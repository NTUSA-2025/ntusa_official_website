-- Public, anonymized student-rights case progress. Do not add original case data
-- or personally identifiable information to these tables.
CREATE TABLE "PublicCase" (
    "id" TEXT NOT NULL,
    "publicCaseNo" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "publicSummary" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "PublicCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseTimelineEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "publicNote" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "CaseTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseAuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicCase_publicCaseNo_key" ON "PublicCase"("publicCaseNo");
CREATE INDEX "PublicCase_isPublic_category_idx" ON "PublicCase"("isPublic", "category");
CREATE INDEX "PublicCase_updatedAt_idx" ON "PublicCase"("updatedAt");
CREATE INDEX "CaseTimelineEvent_caseId_occurredAt_createdAt_idx" ON "CaseTimelineEvent"("caseId", "occurredAt", "createdAt");
CREATE INDEX "CaseTimelineEvent_isPublic_occurredAt_idx" ON "CaseTimelineEvent"("isPublic", "occurredAt");
CREATE INDEX "CaseAuditLog_targetType_targetId_createdAt_idx" ON "CaseAuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "CaseAuditLog_actor_createdAt_idx" ON "CaseAuditLog"("actor", "createdAt");

ALTER TABLE "CaseTimelineEvent" ADD CONSTRAINT "CaseTimelineEvent_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "PublicCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
