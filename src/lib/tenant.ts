import { prisma } from "./prisma";

const DEFAULT_TENANT_SLUG = "gatsoft";

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
}

/**
 * Resolve the tenant from a request.
 * Priority: X-Tenant-Slug header > X-API-Key header > default tenant.
 */
export async function resolveTenant(request: Request): Promise<ResolvedTenant | null> {
  // 1. Check X-Tenant-Slug header (for widget/API consumers)
  const slugHeader = request.headers.get("x-tenant-slug");
  if (slugHeader) {
    return findTenantBySlug(slugHeader);
  }

  // 2. Check X-API-Key header (for widget embed)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    return findTenantByApiKey(apiKey);
  }

  // 3. Default tenant (D2C storefront)
  return findTenantBySlug(DEFAULT_TENANT_SLUG);
}

async function findTenantBySlug(slug: string): Promise<ResolvedTenant | null> {
  // slug is @unique so findUnique is correct; isActive is not part of the
  // unique constraint so we filter it in code after the fetch.
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, plan: true, isActive: true },
  });
  if (!tenant?.isActive) return null;
  const { isActive: _, ...resolvedTenant } = tenant;
  return { ...resolvedTenant, plan: resolvedTenant.plan as string };
}

async function findTenantByApiKey(key: string): Promise<ResolvedTenant | null> {
  // key is @unique so findUnique is correct; isActive on both ApiKey and Tenant
  // are not part of unique constraints so we check them in code after the fetch.
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key },
    include: {
      tenant: {
        select: { id: true, slug: true, name: true, plan: true, isActive: true },
      },
    },
  });
  if (!apiKeyRecord?.isActive) return null;
  if (!apiKeyRecord.tenant?.isActive) return null;
  const { isActive: _, ...resolvedTenant } = apiKeyRecord.tenant;
  return { ...resolvedTenant, plan: resolvedTenant.plan as string };
}

export { DEFAULT_TENANT_SLUG };
