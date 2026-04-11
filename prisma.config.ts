import "dotenv/config";
import { defineConfig } from "prisma/config";

// Load .env.local if it exists (Vercel-provisioned env vars)
try {
  const { config } = await import("dotenv");
  config({ path: ".env.local", override: true });
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use unpooled URL for migrations (direct connection required),
    // fall back to pooled DATABASE_URL for runtime
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"]!,
  },
});
