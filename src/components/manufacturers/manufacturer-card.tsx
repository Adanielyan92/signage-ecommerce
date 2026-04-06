import { MapPin, Globe, Award } from "lucide-react";

interface ManufacturerCardProps {
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  capabilities: string[];
  certifications: string[];
  isVerified: boolean;
  logoUrl?: string | null;
}

const CAPABILITY_LABELS: Record<string, string> = {
  "channel-letters": "Channel Letters",
  "neon": "Neon Signs",
  "cabinet-signs": "Cabinet Signs",
  "monument-signs": "Monument Signs",
  "dimensional-letters": "Dimensional Letters",
  "print-signs": "Print Signs",
  "pylon-signs": "Pylon Signs",
  "light-box": "Light Box Signs",
  "led-signs": "LED Signs",
  "vinyl-banners": "Vinyl Banners",
};

export function ManufacturerCard({
  name,
  description,
  website,
  city,
  state,
  country,
  capabilities,
  certifications,
  isVerified,
  logoUrl,
}: ManufacturerCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-xl font-bold text-blue-600">
            {name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-900">{name}</h3>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <Award className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          {(city || state) && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
              <MapPin className="h-3.5 w-3.5" />
              {[city, state, country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {description && (
        <p className="mt-3 line-clamp-2 text-sm text-neutral-600">{description}</p>
      )}

      {capabilities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {capabilities.map((cap) => (
            <span key={cap} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
              {CAPABILITY_LABELS[cap] ?? cap}
            </span>
          ))}
        </div>
      )}

      {certifications.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {certifications.map((cert) => (
            <span key={cert} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {cert}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <Globe className="h-3.5 w-3.5" />
            Visit Website
          </a>
        )}
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700">
          Request Quote
        </button>
      </div>
    </div>
  );
}
