import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  max: 5,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "gatsoft" } });
  if (!tenant) {
    console.log("No tenant found. Run seed first.");
    return;
  }

  const hash = await bcrypt.hash("GatSoft2026!", 10);
  const user = await prisma.user.upsert({
    where: { email: "arman.danielyan@gatsoft.am" },
    update: { role: "ADMIN", tenantId: tenant.id, passwordHash: hash, name: "Arman Danielyan" },
    create: {
      email: "arman.danielyan@gatsoft.am",
      name: "Arman Danielyan",
      role: "ADMIN",
      tenantId: tenant.id,
      passwordHash: hash,
    },
  });

  console.log("");
  console.log("=== Admin User Created ===");
  console.log("  Email:    " + user.email);
  console.log("  Password: GatSoft2026!");
  console.log("  Role:     " + user.role);
  console.log("  Tenant:   " + tenant.name);
  console.log("");
  console.log("Login at:   /auth/signin");
  console.log("Admin at:   /admin");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
