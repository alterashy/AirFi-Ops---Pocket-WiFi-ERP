import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoAuthToken) {
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
    return new PrismaClient({ adapter });
  }

  // Fallback to local better-sqlite3 for local offline development
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
