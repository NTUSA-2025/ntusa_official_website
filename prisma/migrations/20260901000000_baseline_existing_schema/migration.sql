-- Baseline for the Post and MeetingMinute tables that predate Prisma Migrate.
-- Existing databases should mark this migration as applied; new databases can run it normally.
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "authorEmail" TEXT NOT NULL,
    "authorName" TEXT,
    "department" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingMinute" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "authorEmail" TEXT,
    "authorName" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingMinute_pkey" PRIMARY KEY ("id")
);
