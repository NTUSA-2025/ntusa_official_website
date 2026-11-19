CREATE TABLE "CaseTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseTag_nameKey_key" ON "CaseTag"("nameKey");

CREATE TABLE "_CaseTagToPublicCase" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CaseTagToPublicCase_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_CaseTagToPublicCase_B_index" ON "_CaseTagToPublicCase"("B");

ALTER TABLE "_CaseTagToPublicCase" ADD CONSTRAINT "_CaseTagToPublicCase_A_fkey" FOREIGN KEY ("A") REFERENCES "CaseTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CaseTagToPublicCase" ADD CONSTRAINT "_CaseTagToPublicCase_B_fkey" FOREIGN KEY ("B") REFERENCES "PublicCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
