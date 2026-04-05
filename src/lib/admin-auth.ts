import { getServerSession } from "next-auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export interface AdminSession {
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

/**
 * Get the admin session for server components.
 * Redirects to /auth/signin if not authenticated or not an admin.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true },
  });

  if (!user || user.role !== "ADMIN" || !user.tenantId || !user.tenant) {
    redirect("/auth/signin?error=unauthorized");
  }

  return {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenant.slug,
    tenantName: user.tenant.name,
  };
}

/**
 * Check admin status for API routes (returns null if not admin).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getServerSession();

  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true },
  });

  if (!user || user.role !== "ADMIN" || !user.tenantId || !user.tenant) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenant.slug,
    tenantName: user.tenant.name,
  };
}
