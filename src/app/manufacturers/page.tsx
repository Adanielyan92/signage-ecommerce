import { ManufacturerGrid } from "@/components/manufacturers/manufacturer-grid";

export const metadata = {
  title: "Find a Sign Manufacturer - GatSoft Signs",
  description: "Browse certified sign manufacturers in your area. Channel letters, neon, cabinet signs, and more.",
};

export default function ManufacturersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
          Find a Sign Manufacturer
        </h1>
        <p className="mt-3 text-lg text-neutral-500">
          Browse certified manufacturers in your area
        </p>
      </div>
      <div className="mt-10">
        <ManufacturerGrid />
      </div>
    </div>
  );
}
