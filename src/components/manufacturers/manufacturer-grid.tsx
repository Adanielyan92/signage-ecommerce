"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { ManufacturerCard } from "./manufacturer-card";

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string;
  capabilities: string[];
  certifications: string[];
  isVerified: boolean;
  logoUrl: string | null;
}

const CAPABILITY_OPTIONS = [
  { value: "", label: "All Capabilities" },
  { value: "channel-letters", label: "Channel Letters" },
  { value: "neon", label: "Neon Signs" },
  { value: "cabinet-signs", label: "Cabinet Signs" },
  { value: "monument-signs", label: "Monument Signs" },
  { value: "dimensional-letters", label: "Dimensional Letters" },
  { value: "print-signs", label: "Print Signs" },
  { value: "pylon-signs", label: "Pylon Signs" },
  { value: "light-box", label: "Light Box Signs" },
  { value: "led-signs", label: "LED Signs" },
  { value: "vinyl-banners", label: "Vinyl Banners" },
];

export function ManufacturerGrid() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [capability, setCapability] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (capability) params.set("capability", capability);
      if (stateFilter) params.set("state", stateFilter);

      const res = await fetch(`/api/v1/manufacturers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setManufacturers(data.manufacturers);
      }
    } finally {
      setLoading(false);
    }
  }, [search, capability, stateFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchManufacturers, 300);
    return () => clearTimeout(timer);
  }, [fetchManufacturers]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manufacturers..."
            className="w-full rounded-lg border border-neutral-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={capability}
          onChange={(e) => setCapability(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CAPABILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          placeholder="State (e.g. CA)"
          className="w-24 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-12 text-center text-neutral-500">Loading manufacturers...</div>
      ) : manufacturers.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white py-16 text-center">
          <p className="text-neutral-500">No manufacturers found matching your criteria</p>
          <p className="mt-1 text-sm text-neutral-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {manufacturers.map((m) => (
            <ManufacturerCard key={m.id} {...m} />
          ))}
        </div>
      )}
    </div>
  );
}
