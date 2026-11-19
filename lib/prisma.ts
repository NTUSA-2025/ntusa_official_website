import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. 建立連線池 (確保 .env 裡有 DATABASE_URL)
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// 2. 建立 Prisma 7 專用的 PostgreSQL Adapter
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 3. ⚠️ 最關鍵的一行：把 adapter 傳入 PrismaClient！
export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  transactionOptions: {
    // Neon may need more than Prisma's 2-second default to wake and acquire a connection.
    maxWait: 15_000,
    timeout: 10_000,
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
