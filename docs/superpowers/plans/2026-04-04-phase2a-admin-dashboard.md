# Phase 2A: Admin Dashboard & Product Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin dashboard where tenant admins can manage products, configure options, assign pricing formulas, and manage tenant branding — all through a UI, without code changes.

**Architecture:** New `/admin` route group within the existing Next.js app. Admin pages are server-rendered layouts with client-side interactive components. Admin auth uses a simple role check on the existing NextAuth session (admin role on User model). All data operations go through the existing v1 API routes + new admin-specific API routes for tenants and formulas.

**Tech Stack:** Next.js 16 App Router, shadcn/ui, Tailwind CSS, Zustand (for admin form state), existing v1 API

**Reference:** Full spec at `docs/superpowers/specs/2026-04-04-signage-platform-design.md`, Section 2 (Admin Dashboard)

---

## Scope

This plan covers:
1. Admin API routes (tenant CRUD, formula CRUD)
2. Admin layout with sidebar navigation
3. Dashboard overview page
4. Product list page (with create/edit/delete)
5. Product editor — the schema-driven option builder UI
6. Pricing formula list and preset assignment
7. Tenant branding settings

NOT in this plan (deferred to Phase 2B/2C):
- Visual formula node editor (Phase 2B)
- 3D Model Builder with GLB upload (Phase 2C)
- Script formula editor (Phase 4)

---

## File Structure

### New files to create

```
src/app/
├── admin/
│   ├── layout.tsx                           # Admin shell: sidebar + topbar
│   ├── page.tsx                             # Dashboard overview
│   ├── products/
│   │   ├── page.tsx                         # Product list with search/filter
│   │   ├── new/
│   │   │   └── page.tsx                     # Create product page
│   │   └── [productId]/
│   │       └── page.tsx                     # Edit product page
│   ├── formulas/
│   │   └── page.tsx                         # Pricing formula list + assign presets
│   └── settings/
│       └── page.tsx                         # Tenant branding settings
├── api/v1/
│   ├── admin/
│   │   └── tenant/
│   │       └── route.ts                     # GET/PATCH current tenant settings
│   └── formulas/
│       ├── route.ts                         # GET list / POST create formula
│       └── [formulaId]/
│           └── route.ts                     # GET / PATCH / DELETE formula

src/components/admin/
├── sidebar.tsx                              # Admin sidebar navigation
├── product-form.tsx                         # Product create/edit form
├── option-builder.tsx                       # Schema-driven option list builder
├── option-editor.tsx                        # Single option editor (type, label, values, rules)
├── formula-picker.tsx                       # Dropdown to assign pricing formula to product
└── tenant-settings-form.tsx                 # Tenant branding form
```

### Files to modify

```
prisma/schema.prisma                         # Add role field to User model
src/lib/api-client.ts                        # Add admin API methods
```

---

## Task 1: Admin Role on User Model

**Files:**
- Modify: `prisma/schema.prisma`

Add a `role` field to the User model so we can gate admin access.

- [ ] **Step 1: Add role enum and field to User**

In `prisma/schema.prisma`, add after the existing enums:

```prisma
enum UserRole {
  USER
  ADMIN
}
```

Add to the User model after the `updatedAt` field:

```prisma
  role         UserRole  @default(USER)
  tenantId     String?
```

Also add a relation to Tenant on User (optional — admins belong to a tenant):

In the Tenant model, add:
```prisma
  admins          User[]
```

In the User model, add:
```prisma
  tenant       Tenant?   @relation(fields: [tenantId], references: [id])
```

- [ ] **Step 2: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add UserRole enum and admin role to User model"
```

---

## Task 2: Admin Auth Guard

**Files:**
- Create: `src/lib/admin-auth.ts`

A utility to check if the current session user is an admin for the resolved tenant.

- [ ] **Step 1: Create the admin auth guard**

```typescript
// src/lib/admin-auth.ts

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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin-auth.ts
git commit -m "feat: add admin auth guard for dashboard pages and API routes"
```

---

## Task 3: Admin API Routes — Tenant & Formulas

**Files:**
- Create: `src/app/api/v1/admin/tenant/route.ts`
- Create: `src/app/api/v1/formulas/route.ts`
- Create: `src/app/api/v1/formulas/[formulaId]/route.ts`

- [ ] **Step 1: Create tenant settings API**

```typescript
// src/app/api/v1/admin/tenant/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: admin.tenantId },
  });

  return NextResponse.json({ tenant });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, logoUrl, primaryColor, accentColor, customDomain, currency, locale } = body;

  const tenant = await prisma.tenant.update({
    where: { id: admin.tenantId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(primaryColor !== undefined ? { primaryColor } : {}),
      ...(accentColor !== undefined ? { accentColor } : {}),
      ...(customDomain !== undefined ? { customDomain } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(locale !== undefined ? { locale } : {}),
    },
  });

  return NextResponse.json({ tenant });
}
```

- [ ] **Step 2: Create formulas list/create API**

```typescript
// src/app/api/v1/formulas/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getAllPresetFormulas } from "@/engine/formula-presets";

export async function GET(request: NextRequest) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const formulas = await prisma.pricingFormula.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });

  // Also return available presets for the UI
  const presets = getAllPresetFormulas().map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    variables: p.variables,
  }));

  return NextResponse.json({ formulas, presets });
}

export async function POST(request: NextRequest) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, type, presetId, formulaAst } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const formula = await prisma.pricingFormula.create({
    data: {
      tenantId: tenant.id,
      name,
      description,
      type,
      presetId: presetId ?? null,
      formulaAst: formulaAst ?? undefined,
    },
  });

  return NextResponse.json({ formula }, { status: 201 });
}
```

- [ ] **Step 3: Create formula detail API**

```typescript
// src/app/api/v1/formulas/[formulaId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formulaId: string }> },
) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { formulaId } = await params;

  const formula = await prisma.pricingFormula.findFirst({
    where: { id: formulaId, tenantId: tenant.id },
  });

  if (!formula) {
    return NextResponse.json({ error: "Formula not found" }, { status: 404 });
  }

  return NextResponse.json({ formula });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ formulaId: string }> },
) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { formulaId } = await params;
  const body = await request.json();

  const formula = await prisma.pricingFormula.update({
    where: { id: formulaId, tenantId: tenant.id },
    data: body,
  });

  return NextResponse.json({ formula });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formulaId: string }> },
) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { formulaId } = await params;

  await prisma.pricingFormula.delete({
    where: { id: formulaId, tenantId: tenant.id },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/admin/tenant/route.ts src/app/api/v1/formulas/
git commit -m "feat: add admin tenant settings and formula CRUD API routes"
```

---

## Task 4: Admin API Client Extensions

**Files:**
- Modify: `src/lib/api-client.ts`

Add admin-specific API methods.

- [ ] **Step 1: Add admin methods to api-client.ts**

Add to the `api` object in `src/lib/api-client.ts`:

```typescript
admin: {
  getTenant(options?: ApiOptions) {
    return apiFetch<{ tenant: ApiTenant }>("/admin/tenant", undefined, options);
  },
  updateTenant(data: Partial<ApiTenant>, options?: ApiOptions) {
    return apiFetch<{ tenant: ApiTenant }>(
      "/admin/tenant",
      { method: "PATCH", body: JSON.stringify(data) },
      options,
    );
  },
},
formulas: {
  list(options?: ApiOptions) {
    return apiFetch<{ formulas: ApiFormula[]; presets: ApiPresetInfo[] }>(
      "/formulas",
      undefined,
      options,
    );
  },
  get(formulaId: string, options?: ApiOptions) {
    return apiFetch<{ formula: ApiFormula }>(`/formulas/${formulaId}`, undefined, options);
  },
  create(data: { name: string; description?: string; type: string; presetId?: string }, options?: ApiOptions) {
    return apiFetch<{ formula: ApiFormula }>(
      "/formulas",
      { method: "POST", body: JSON.stringify(data) },
      options,
    );
  },
  update(formulaId: string, data: Partial<ApiFormula>, options?: ApiOptions) {
    return apiFetch<{ formula: ApiFormula }>(
      `/formulas/${formulaId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      options,
    );
  },
  delete(formulaId: string, options?: ApiOptions) {
    return apiFetch<{ success: boolean }>(`/formulas/${formulaId}`, { method: "DELETE" }, options);
  },
},
```

Also add these types:

```typescript
export interface ApiTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  currency: string;
  locale: string;
}

export interface ApiFormula {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: string;
  presetId: string | null;
  formulaAst: unknown;
  scriptBody: string | null;
}

export interface ApiPresetInfo {
  id: string;
  name: string;
  description: string;
  variables: Array<{ name: string; label: string; source: string; description: string }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat: add admin and formula API methods to client"
```

---

## Task 5: Admin Layout with Sidebar

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/sidebar.tsx`

- [ ] **Step 1: Create the admin sidebar**

```typescript
// src/components/admin/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Calculator,
  Settings,
  ArrowLeft,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/formulas", label: "Pricing Formulas", icon: Calculator },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-16 items-center border-b border-neutral-200 px-6">
        <h1 className="text-lg font-bold text-neutral-900">Admin</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create the admin layout**

```typescript
// src/app/admin/layout.tsx

import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = {
  title: "Admin Dashboard — GatSoft Signs",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx src/components/admin/sidebar.tsx
git commit -m "feat: add admin layout with sidebar navigation"
```

---

## Task 6: Admin Dashboard Overview Page

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create the dashboard page**

```typescript
// src/app/admin/page.tsx

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { Package, Calculator, ShoppingCart, Users } from "lucide-react";

export default async function AdminDashboard() {
  const admin = await requireAdmin();

  const [productCount, formulaCount, orderCount] = await Promise.all([
    prisma.product.count({ where: { tenantId: admin.tenantId } }),
    prisma.pricingFormula.count({ where: { tenantId: admin.tenantId } }),
    prisma.order.count({ where: { tenantId: admin.tenantId } }),
  ]);

  const stats = [
    { label: "Products", value: productCount, icon: Package, href: "/admin/products" },
    { label: "Pricing Formulas", value: formulaCount, icon: Calculator, href: "/admin/formulas" },
    { label: "Orders", value: orderCount, icon: ShoppingCart, href: "/admin/orders" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">
        Welcome, {admin.tenantName}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Manage your products, pricing, and orders.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <a
              key={stat.label}
              href={stat.href}
              className="rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add admin dashboard overview page with stats"
```

---

## Task 7: Product List Page

**Files:**
- Create: `src/app/admin/products/page.tsx`

- [ ] **Step 1: Create the product list page**

```typescript
// src/app/admin/products/page.tsx

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default async function AdminProductsPage() {
  const admin = await requireAdmin();

  const products = await prisma.product.findMany({
    where: { tenantId: admin.tenantId },
    include: {
      pricingFormula: { select: { name: true, type: true } },
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  // Group by category
  const grouped = products.reduce<Record<string, typeof products>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {products.length} products across {Object.keys(grouped).length} categories
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              {category.replace(/_/g, " ")}
            </h2>
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Formula</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500 font-mono">
                        {product.slug}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500">
                        {product.pricingFormula?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            product.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/products/page.tsx
git commit -m "feat: add admin product list page with category grouping"
```

---

## Task 8: Product Form Component

**Files:**
- Create: `src/components/admin/product-form.tsx`
- Create: `src/components/admin/option-builder.tsx`
- Create: `src/components/admin/option-editor.tsx`
- Create: `src/components/admin/formula-picker.tsx`

This is the core of the admin dashboard — the product editor with schema-driven option builder.

- [ ] **Step 1: Create the formula picker**

```typescript
// src/components/admin/formula-picker.tsx
"use client";

import { useState, useEffect } from "react";

interface Formula {
  id: string;
  name: string;
  type: string;
  presetId: string | null;
}

interface PresetInfo {
  id: string;
  name: string;
  description: string;
}

interface FormulPickerProps {
  value: string | null;
  onChange: (formulaId: string | null) => void;
  tenantFormulas: Formula[];
  presets: PresetInfo[];
  onCreateFromPreset: (presetId: string, presetName: string) => void;
}

export function FormulaPicker({
  value,
  onChange,
  tenantFormulas,
  presets,
  onCreateFromPreset,
}: FormulPickerProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        Pricing Formula
      </label>

      {tenantFormulas.length > 0 && (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">— Select formula —</option>
          {tenantFormulas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.type})
            </option>
          ))}
        </select>
      )}

      {tenantFormulas.length === 0 && (
        <p className="text-sm text-neutral-500">
          No formulas created yet. Create one from a preset below.
        </p>
      )}

      <div className="mt-2">
        <p className="text-xs font-medium text-neutral-500 mb-2">
          Or create from preset:
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {presets.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onCreateFromPreset(preset.id, preset.name)}
              className="rounded-lg border border-neutral-200 p-3 text-left text-xs hover:border-blue-300 hover:bg-blue-50/50"
            >
              <p className="font-medium text-neutral-800">{preset.name}</p>
              <p className="mt-1 text-neutral-500 line-clamp-2">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the option editor (single option)**

```typescript
// src/components/admin/option-editor.tsx
"use client";

import { Trash2, GripVertical } from "lucide-react";

export interface OptionDef {
  id: string;
  type: "text" | "number" | "select" | "color" | "toggle" | "font-picker";
  label: string;
  required: boolean;
  defaultValue: string;
  values: { value: string; label?: string }[];
  dependsOn: Record<string, string[]>;
}

interface OptionEditorProps {
  option: OptionDef;
  onChange: (updated: OptionDef) => void;
  onDelete: () => void;
}

const OPTION_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select / Dropdown" },
  { value: "color", label: "Color Picker" },
  { value: "toggle", label: "Toggle / Switch" },
  { value: "font-picker", label: "Font Picker" },
];

export function OptionEditor({ option, onChange, onDelete }: OptionEditorProps) {
  const update = (patch: Partial<OptionDef>) =>
    onChange({ ...option, ...patch });

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <GripVertical className="mt-2 h-4 w-4 shrink-0 cursor-grab text-neutral-300" />

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500">Label</label>
              <input
                type="text"
                value={option.label}
                onChange={(e) => update({ label: e.target.value })}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="Option label"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Type</label>
              <select
                value={option.type}
                onChange={(e) => update({ type: e.target.value as OptionDef["type"] })}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {OPTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Default</label>
              <input
                type="text"
                value={option.defaultValue}
                onChange={(e) => update({ defaultValue: e.target.value })}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="Default value"
              />
            </div>
          </div>

          {option.type === "select" && (
            <div>
              <label className="block text-xs font-medium text-neutral-500">
                Values (comma-separated)
              </label>
              <input
                type="text"
                value={option.values.map((v) => v.value).join(", ")}
                onChange={(e) =>
                  update({
                    values: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean)
                      .map((v) => ({ value: v })),
                  })
                }
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder='e.g. Lit, Non-Lit'
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={option.required}
                onChange={(e) => update({ required: e.target.checked })}
                className="rounded border-neutral-300"
              />
              Required
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the option builder (list of options)**

```typescript
// src/components/admin/option-builder.tsx
"use client";

import { Plus } from "lucide-react";
import { OptionEditor, type OptionDef } from "./option-editor";

interface OptionBuilderProps {
  options: OptionDef[];
  onChange: (options: OptionDef[]) => void;
}

let nextId = 1;
function generateId() {
  return `opt_${Date.now()}_${nextId++}`;
}

export function OptionBuilder({ options, onChange }: OptionBuilderProps) {
  const addOption = () => {
    onChange([
      ...options,
      {
        id: generateId(),
        type: "text",
        label: "",
        required: false,
        defaultValue: "",
        values: [],
        dependsOn: {},
      },
    ]);
  };

  const updateOption = (index: number, updated: OptionDef) => {
    const next = [...options];
    next[index] = updated;
    onChange(next);
  };

  const deleteOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-neutral-700">
          Product Options ({options.length})
        </label>
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Plus className="h-3 w-3" />
          Add Option
        </button>
      </div>

      {options.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm text-neutral-500">
            No options defined. Click &quot;Add Option&quot; to start building your product configurator.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {options.map((option, index) => (
          <OptionEditor
            key={option.id}
            option={option}
            onChange={(updated) => updateOption(index, updated)}
            onDelete={() => deleteOption(index)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the product form**

```typescript
// src/components/admin/product-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OptionBuilder } from "./option-builder";
import type { OptionDef } from "./option-editor";
import { FormulaPicker } from "./formula-picker";
import { toast } from "sonner";

interface ProductFormProps {
  productId?: string; // undefined = create, string = edit
  initialData?: {
    name: string;
    slug: string;
    description: string;
    category: string;
    isActive: boolean;
    options: OptionDef[];
    pricingFormulaId: string | null;
    pricingParams: Record<string, number>;
    renderPipeline: string;
  };
}

const CATEGORIES = [
  "CHANNEL_LETTERS",
  "LIT_SHAPES",
  "CABINET_SIGNS",
  "DIMENSIONAL_LETTERS",
  "LOGOS",
  "PRINT_SIGNS",
  "SIGN_POSTS",
  "LIGHT_BOX_SIGNS",
  "NEON_SIGNS",
  "VINYL_BANNERS",
];

const RENDER_PIPELINES = [
  { value: "text-to-3d", label: "Text to 3D (letters)" },
  { value: "part-assembly", label: "Part Assembly (models)" },
  { value: "flat-2d", label: "Flat 2D (print)" },
];

export function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "CHANNEL_LETTERS");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [options, setOptions] = useState<OptionDef[]>(initialData?.options ?? []);
  const [pricingFormulaId, setPricingFormulaId] = useState<string | null>(
    initialData?.pricingFormulaId ?? null,
  );
  const [pricingParams, setPricingParams] = useState<Record<string, number>>(
    initialData?.pricingParams ?? {},
  );
  const [renderPipeline, setRenderPipeline] = useState(
    initialData?.renderPipeline ?? "text-to-3d",
  );

  // Formula data
  const [tenantFormulas, setTenantFormulas] = useState<
    Array<{ id: string; name: string; type: string; presetId: string | null }>
  >([]);
  const [presets, setPresets] = useState<
    Array<{ id: string; name: string; description: string }>
  >([]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!productId) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  }, [name, productId]);

  // Load formulas
  useEffect(() => {
    fetch("/api/v1/formulas")
      .then((r) => r.json())
      .then((data) => {
        setTenantFormulas(data.formulas ?? []);
        setPresets(data.presets ?? []);
      })
      .catch(() => {});
  }, []);

  const handleCreateFromPreset = async (presetId: string, presetName: string) => {
    const res = await fetch("/api/v1/formulas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: presetName, type: "PRESET", presetId }),
    });
    const data = await res.json();
    if (data.formula) {
      setTenantFormulas((prev) => [...prev, data.formula]);
      setPricingFormulaId(data.formula.id);
      toast.success(`Created formula: ${presetName}`);
    }
  };

  const handleSave = async () => {
    if (!name || !slug || !category) {
      toast.error("Name, slug, and category are required");
      return;
    }

    setSaving(true);

    const productSchema = {
      name,
      slug,
      description,
      category,
      options: options.map((o) => ({
        id: o.id,
        type: o.type,
        label: o.label,
        required: o.required,
        defaultValue: o.defaultValue,
        values: o.values,
        dependsOn: o.dependsOn,
      })),
      rules: [],
      renderConfig: { pipeline: renderPipeline, meshBindings: {} },
      pricingFormulaId,
      pricingParams,
    };

    const body = {
      name,
      slug,
      description,
      category,
      isActive,
      productSchema,
      pricingParams,
      renderConfig: { pipeline: renderPipeline, meshBindings: {} },
      pricingFormulaId,
    };

    const url = productId
      ? `/api/v1/products/${productId}`
      : "/api/v1/products";
    const method = productId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save");
        setSaving(false);
        return;
      }

      toast.success(productId ? "Product updated" : "Product created");
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Basic Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Front-Lit Channel Letters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono"
              placeholder="front-lit-channel-letters"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-neutral-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Product description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Render Pipeline</label>
            <select
              value={renderPipeline}
              onChange={(e) => setRenderPipeline(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {RENDER_PIPELINES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-neutral-300"
              id="isActive"
            />
            <label htmlFor="isActive" className="text-sm text-neutral-700">Active</label>
          </div>
        </div>
      </section>

      {/* Pricing Formula */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Pricing</h2>
        <FormulaPicker
          value={pricingFormulaId}
          onChange={setPricingFormulaId}
          tenantFormulas={tenantFormulas}
          presets={presets}
          onCreateFromPreset={handleCreateFromPreset}
        />

        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Pricing Parameters (JSON)
          </label>
          <textarea
            value={JSON.stringify(pricingParams, null, 2)}
            onChange={(e) => {
              try {
                setPricingParams(JSON.parse(e.target.value));
              } catch {
                // Let user keep typing
              }
            }}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono"
            rows={5}
            placeholder='{ "basePricePerInch": 16, "minOrderPrice": 1360 }'
          />
        </div>
      </section>

      {/* Options */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Configurator Options</h2>
        <OptionBuilder options={options} onChange={setOptions} />
      </section>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : productId ? "Update Product" : "Create Product"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/
git commit -m "feat: add product form with option builder and formula picker"
```

---

## Task 9: Create/Edit Product Pages

**Files:**
- Create: `src/app/admin/products/new/page.tsx`
- Create: `src/app/admin/products/[productId]/page.tsx`

- [ ] **Step 1: Create the new product page**

```typescript
// src/app/admin/products/new/page.tsx

import { requireAdmin } from "@/lib/admin-auth";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Create Product</h1>
      <ProductForm />
    </div>
  );
}
```

- [ ] **Step 2: Create the edit product page**

```typescript
// src/app/admin/products/[productId]/page.tsx

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import type { OptionDef } from "@/components/admin/option-editor";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: admin.tenantId },
    include: { pricingFormula: true },
  });

  if (!product) notFound();

  const schema = product.productSchema as Record<string, unknown> | null;
  const options = ((schema?.options as OptionDef[]) ?? []).map((o) => ({
    id: o.id ?? crypto.randomUUID(),
    type: o.type ?? "text",
    label: o.label ?? "",
    required: o.required ?? false,
    defaultValue: String(o.defaultValue ?? ""),
    values: o.values ?? [],
    dependsOn: o.dependsOn ?? {},
  })) as OptionDef[];

  const renderConfig = product.renderConfig as Record<string, unknown> | null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">
        Edit: {product.name}
      </h1>
      <ProductForm
        productId={product.id}
        initialData={{
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          category: product.category,
          isActive: product.isActive,
          options,
          pricingFormulaId: product.pricingFormulaId,
          pricingParams: (product.pricingParams as Record<string, number>) ?? {},
          renderPipeline: (renderConfig?.pipeline as string) ?? "text-to-3d",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/products/
git commit -m "feat: add create and edit product admin pages"
```

---

## Task 10: Formulas List Page

**Files:**
- Create: `src/app/admin/formulas/page.tsx`

- [ ] **Step 1: Create the formulas page**

```typescript
// src/app/admin/formulas/page.tsx

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAllPresetFormulas } from "@/engine/formula-presets";

export default async function AdminFormulasPage() {
  const admin = await requireAdmin();

  const formulas = await prisma.pricingFormula.findMany({
    where: { tenantId: admin.tenantId },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  const presets = getAllPresetFormulas();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Pricing Formulas</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {formulas.length} formulas configured
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Preset</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Products</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {formulas.map((f) => {
              const preset = f.presetId
                ? presets.find((p) => p.id === f.presetId)
                : null;
              return (
                <tr key={f.id} className="hover:bg-neutral-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                    {f.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {f.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {preset?.name ?? "Custom"}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {f._count.products} products
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900">Available Presets</h2>
        <p className="mt-1 text-sm text-neutral-500">
          These formula templates are available to assign to products.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="rounded-lg border border-neutral-200 p-4"
            >
              <h3 className="font-medium text-neutral-900">{preset.name}</h3>
              <p className="mt-1 text-xs text-neutral-500">{preset.description}</p>
              <div className="mt-2">
                <p className="text-xs font-medium text-neutral-400">Variables:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {preset.variables.map((v) => (
                    <span
                      key={v.name}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600"
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/formulas/page.tsx
git commit -m "feat: add admin pricing formulas list page"
```

---

## Task 11: Tenant Settings Page

**Files:**
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/components/admin/tenant-settings-form.tsx`

- [ ] **Step 1: Create the tenant settings form**

```typescript
// src/components/admin/tenant-settings-form.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

interface TenantSettingsFormProps {
  initialData: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    customDomain: string | null;
    currency: string;
    locale: string;
  };
}

export function TenantSettingsForm({ initialData }: TenantSettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialData.name);
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(initialData.primaryColor ?? "#2563EB");
  const [accentColor, setAccentColor] = useState(initialData.accentColor ?? "#3B82F6");
  const [customDomain, setCustomDomain] = useState(initialData.customDomain ?? "");
  const [currency, setCurrency] = useState(initialData.currency);
  const [locale, setLocale] = useState(initialData.locale);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          logoUrl: logoUrl || null,
          primaryColor,
          accentColor,
          customDomain: customDomain || null,
          currency,
          locale,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save");
      } else {
        toast.success("Settings saved");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Branding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Business Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Logo URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Primary Color</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-neutral-300"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Accent Color</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-neutral-300"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Localization</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="AUD">AUD — Australian Dollar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Custom Domain</label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="signs.yourdomain.com"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the settings page**

```typescript
// src/app/admin/settings/page.tsx

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { TenantSettingsForm } from "@/components/admin/tenant-settings-form";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();

  const tenant = await prisma.tenant.findUnique({
    where: { id: admin.tenantId },
  });

  if (!tenant) throw new Error("Tenant not found");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Settings</h1>
      <TenantSettingsForm
        initialData={{
          name: tenant.name,
          logoUrl: tenant.logoUrl,
          primaryColor: tenant.primaryColor,
          accentColor: tenant.accentColor,
          customDomain: tenant.customDomain,
          currency: tenant.currency,
          locale: tenant.locale,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/settings/page.tsx src/components/admin/tenant-settings-form.tsx
git commit -m "feat: add admin tenant settings page with branding form"
```

---

## Task 12: Verify Tests + Build

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

```bash
npx jest --no-cache
```

Expected: 196+ tests pass.

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds. The admin pages may show warnings about auth (NextAuth session) at build time — this is expected since there's no session during static analysis.

- [ ] **Step 3: Fix any issues**

- [ ] **Step 4: Commit fixes if any**

---

## Summary

| Task | What It Builds | Files |
|---|---|---|
| 1 | Admin role on User | Schema update |
| 2 | Admin auth guard | `admin-auth.ts` |
| 3 | Admin API routes | Tenant + Formula CRUD |
| 4 | API client extensions | Admin + formula methods |
| 5 | Admin layout + sidebar | Shell with navigation |
| 6 | Dashboard overview | Stats page |
| 7 | Product list | Table with category grouping |
| 8 | Product form components | Form + option builder + formula picker |
| 9 | Create/edit product pages | New + edit pages |
| 10 | Formulas list | Formula management + preset reference |
| 11 | Tenant settings | Branding + localization form |
| 12 | Verification | Tests + build |

**Admin can now:** Sign in, see dashboard stats, create/edit products with options, assign pricing formulas from presets, configure tenant branding. All through a UI — zero code changes needed.
