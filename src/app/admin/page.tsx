import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { Package, Calculator, ShoppingCart } from "lucide-react";

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
      <h1 className="text-2xl font-bold text-neutral-900">Welcome, {admin.tenantName}</h1>
      <p className="mt-1 text-sm text-neutral-500">Manage your products, pricing, and orders.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <a key={stat.label} href={stat.href} className="rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2"><Icon className="h-5 w-5 text-blue-600" /></div>
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
