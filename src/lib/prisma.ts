import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL ?? "";
  // Prisma Postgres proxy URL — extract direct PG URL
  if (url.startsWith("prisma+postgres://")) {
    try {
      const apiKey = new URL(url).searchParams.get("api_key");
      if (apiKey) {
        const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString());
        if (decoded.databaseUrl) return decoded.databaseUrl;
      }
    } catch {
      // Fall through to use URL as-is
    }
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const connStr = getConnectionString();
  if (!connStr) {
    // No database URL — return a stub that will fail gracefully
    return new PrismaClient({} as never);
  }

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new pg.Pool({
      connectionString: connStr,
      max: 10,
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pool);
  return new PrismaClient({ adapter } as never);
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
