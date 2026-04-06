import type { Metadata } from "next";
import { PricingAdmin } from "@/components/admin/pricing-admin";

export const metadata: Metadata = {
  title: "Pricing Admin | GatSoft Signs",
};

export default function PricingAdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-brand-navy">
        Pricing Parameters
      </h1>
      <p className="mt-2 text-sm text-brand-text-secondary">
        Adjust pricing formulas for each product type. Changes are previewed live below.
      </p>
      <PricingAdmin />
    </div>
  );
}
