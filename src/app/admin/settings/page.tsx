import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { TenantSettingsForm } from "@/components/admin/tenant-settings-form";
import { ExchangeRateForm } from "@/components/admin/exchange-rate-form";

export const metadata = {
  title: "Settings — Admin",
};

export default async function SettingsPage() {
  const admin = await requireAdmin();

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: admin.tenantId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      accentColor: true,
      customDomain: true,
      currency: true,
      locale: true,
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Manage your tenant branding and localization preferences.
      </p>
      <div className="mt-8">
        <TenantSettingsForm initialData={tenant} />
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-neutral-900">Exchange Rates</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Configure currency exchange rates for multi-currency pricing. All base prices are in USD.
        </p>
        <div className="mt-6">
          <ExchangeRateForm />
        </div>
      </div>
    </div>
  );
}
