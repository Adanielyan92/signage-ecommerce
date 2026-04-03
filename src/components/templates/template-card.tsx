"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SignTemplate } from "@/types/templates";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  "front-lit-trim-cap": "Front-Lit",
  trimless: "Trimless",
  "marquee-letters": "Marquee",
  "back-lit": "Back-Lit",
  "halo-lit": "Halo-Lit",
  "non-lit": "Non-Lit",
};

const LED_LABELS: Record<string, string> = {
  "3000K": "Warm White",
  "3500K": "Neutral White",
  "6000K": "Cool White",
  Red: "Red",
  Green: "Green",
  Blue: "Blue",
  RGB: "RGB",
};

export function TemplateCard({ template }: { template: SignTemplate }) {
  const { configuration } = template;
  const productLabel =
    PRODUCT_TYPE_LABELS[configuration.productType] || configuration.productType;
  const ledLabel = LED_LABELS[configuration.led] || configuration.led;

  return (
    <Card className="group flex flex-col transition-all duration-200 hover:shadow-lg hover:border-neutral-300">
      {/* Text preview area */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-neutral-50 to-neutral-100 px-4">
        <span className="truncate text-2xl font-bold tracking-wide text-neutral-700 transition group-hover:text-neutral-900">
          {configuration.text}
        </span>
        <Badge
          variant="secondary"
          className="absolute right-3 top-3 text-[10px]"
        >
          {productLabel}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">
          {template.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
            {configuration.height}&quot; tall
          </span>
          {configuration.lit === "Lit" && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {ledLabel} LED
            </span>
          )}
          {configuration.lit === "Non-Lit" && (
            <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
              Non-Lit
            </span>
          )}
          {configuration.litSides === "Duo Lit" && (
            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
              Duo Lit
            </span>
          )}
          {configuration.painting === "Painted" && (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Painted
            </span>
          )}
          {configuration.font !== "Standard" && (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              {configuration.font}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full" size="sm">
          <Link
            href={`/configure/${configuration.productType}?template=${template.id}`}
          >
            Use This Template
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
