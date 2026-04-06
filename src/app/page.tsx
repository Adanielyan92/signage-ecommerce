"use client";

import React from "react";
import Link from "next/link";
import {
  Type,
  Lightbulb,
  SquareAsterisk,
  Boxes,
  Stamp,
  Printer,
  Signpost,
  MousePointerClick,
  RotateCcw,
  Package,
  Eye,
  DollarSign,
  ImageIcon,
  Moon,
  Truck,
  Flag,
  Clock,
  ArrowRight,
  PanelTop,
  Leaf,
  Award,
  Layers,
  Map,
  ChevronsRight,
} from "lucide-react";

interface Category {
  name: string;
  description: string;
  startingPrice: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
}

const categories: Category[] = [
  {
    name: "Channel Letters",
    description:
      "The #1 choice for storefronts. Your business name in glowing 3D letters, visible day and night.",
    startingPrice: "$1,360+",
    href: "/configure/front-lit-trim-cap",
    icon: Type,
    image: "/images/products/front-lit-trim-cap.png",
  },
  {
    name: "Lit Shape Signs",
    description:
      "Your logo or custom shape, illuminated with LEDs. Perfect for bold brand statements.",
    startingPrice: "$1,500+",
    href: "/configure/cloud-sign",
    icon: Lightbulb,
    image: "/images/products/lit-logo.png",
  },
  {
    name: "Cabinet Signs",
    description:
      "Illuminated sign boxes — clean, bright, and professional. Available single or double-sided.",
    startingPrice: "$1,500+",
    href: "/configure/single-face-squared",
    icon: SquareAsterisk,
    image: "/images/products/single-face-squared.png",
  },
  {
    name: "Dimensional Letters",
    description:
      "Elegant 3D letters in premium materials. No electricity needed — perfect for lobbies and indoor spaces.",
    startingPrice: "$800+",
    href: "/configure/acrylic",
    icon: Boxes,
    image: "/images/products/brushed-metal.png",
  },
  {
    name: "Logo Signs",
    description:
      "Your logo, fabricated in 3D. Available illuminated or non-lit, built exactly to your artwork.",
    startingPrice: "$800+",
    href: "/configure/lit-logo",
    icon: Stamp,
    image: "/images/products/lit-logo.png",
  },
  {
    name: "Print Signs",
    description:
      "Full-color printed signs — durable, affordable, and ready fast. Great for events, real estate, and promotions.",
    startingPrice: "$100+",
    href: "/configure/acm-panel",
    icon: Printer,
    image: "/images/products/acm-panel.png",
  },
  {
    name: "Sign Posts",
    description:
      "Freestanding signs on posts or monument bases. Maximum visibility from the street.",
    startingPrice: "$600+",
    href: "/configure/single-post",
    icon: Signpost,
    image: "/images/products/single-post.png",
  },
  {
    name: "Light Box Signs",
    description:
      "Illuminated sign boxes with glowing translucent or push-through faces. Clean, bright, and professional.",
    startingPrice: "$1,200+",
    href: "/configure/light-box-single",
    icon: SquareAsterisk,
    image: "/images/products/light-box-single.png",
  },
  {
    name: "Blade Signs",
    description:
      "Wall-projecting signs on a bracket — visible from both directions down the street.",
    startingPrice: "$800+",
    href: "/configure/blade-rectangular",
    icon: Signpost,
    image: "/images/products/blade-rectangular.png",
  },
  {
    name: "LED Neon Signs",
    description:
      "Your text in glowing neon-style LED tubes. Perfect for restaurants, bars, and retail.",
    startingPrice: "$500+",
    href: "/configure/led-neon",
    icon: Lightbulb,
    image: "/images/products/led-neon.png",
  },
  {
    name: "Vinyl Banners",
    description:
      "Full-color printed banners — durable, affordable, and ready fast. Great for events and promotions.",
    startingPrice: "$50+",
    href: "/configure/vinyl-banner-13oz",
    icon: Flag,
    image: "/images/products/vinyl-banner-13oz.png",
  },
  {
    name: "A-Frame Signs",
    description:
      "Portable sidewalk signs. Perfect for restaurants, retail stores, and events. Easy to move and double-sided for maximum visibility.",
    startingPrice: "$150+",
    href: "/configure/a-frame-standard",
    icon: PanelTop,
    image: "/images/products/a-frame.png",
  },
  {
    name: "Yard Signs",
    description:
      "Campaign and real estate signs. Lightweight, affordable, and easy to install with H-stakes. Bulk pricing available.",
    startingPrice: "$50+",
    href: "/configure/yard-sign-coroplast",
    icon: Leaf,
    image: "/images/products/yard-sign.png",
  },
  {
    name: "Plaques & Awards",
    description:
      "Professional recognition plaques and office signage. Available in aluminum, acrylic, wood, and brass with custom engraving.",
    startingPrice: "$100+",
    href: "/configure/plaque-aluminum",
    icon: Award,
    image: "/images/products/plaque.png",
  },
  {
    name: "Vinyl Graphics",
    description:
      "Custom vinyl for walls, windows, floors, and vehicles. Full-color printed graphics with professional installation.",
    startingPrice: "$75+",
    href: "/configure/vinyl-wall-graphic",
    icon: Layers,
    image: "/images/products/vinyl-graphic.png",
  },
  {
    name: "Wayfinding & ADA",
    description:
      "ADA-compliant signs with tactile text and braille. Directional signage, room identification, and custom pictograms.",
    startingPrice: "$100+",
    href: "/configure/wayfinding-ada",
    icon: Map,
    image: "/images/products/wayfinding.png",
  },
  {
    name: "Push-Through Signs",
    description:
      "Illuminated signs with letters physically pushed through the face panel. Premium look with dimensional depth and backlighting.",
    startingPrice: "$1,200+",
    href: "/configure/push-through-single",
    icon: ChevronsRight,
    image: "/images/products/push-through.png",
  },
];

const steps = [
  {
    number: 1,
    title: "Choose Your Sign Type",
    description:
      "Browse our catalog of sign types — from channel letters to cabinet signs, dimensional letters, and more.",
    icon: MousePointerClick,
  },
  {
    number: 2,
    title: "Design in 3D",
    description:
      "Customize every detail with our real-time 3D configurator. Pick fonts, colors, lighting, and size.",
    icon: RotateCcw,
  },
  {
    number: 3,
    title: "Order & We Build",
    description:
      "Place your order and we manufacture your sign with premium materials. Ships free to your door.",
    icon: Package,
  },
];

const features = [
  {
    title: "Real-Time 3D Preview",
    description:
      "See your sign from every angle before ordering. Rotate, zoom, and inspect with realistic materials and lighting.",
    icon: Eye,
  },
  {
    title: "Instant Pricing",
    description:
      "Get accurate pricing as you design — no waiting for quotes. Price updates live as you customize.",
    icon: DollarSign,
  },
  {
    title: "Wall Mockup Tool",
    description:
      "Upload your wall photo and see exactly how your sign looks on your building before you commit.",
    icon: ImageIcon,
  },
  {
    title: "Day & Night View",
    description:
      "Preview your illuminated sign in both daylight and darkness to see how it looks around the clock.",
    icon: Moon,
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-accent">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Custom Business Signs,<br />Designed in Real-Time 3D
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/80">
              The fastest way to design, price, and order professional signage.
              Channel letters, cabinet signs, neon, and more --
              ready to install in 2-3 weeks.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-brand-accent shadow-lg transition hover:bg-brand-bg"
              >
                Design Your Sign
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Browse Templates
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <div className="border-b border-brand-muted bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4 text-center text-sm text-brand-text-secondary sm:gap-16">
          <div>
            <span className="block font-heading text-2xl font-bold text-brand-navy">2,500+</span>
            Signs Delivered
          </div>
          <div>
            <span className="block font-heading text-2xl font-bold text-brand-navy">500+</span>
            Businesses Served
          </div>
          <div>
            <span className="block font-heading text-2xl font-bold text-brand-navy">4.9/5</span>
            Customer Rating
          </div>
          <div>
            <span className="block font-heading text-2xl font-bold text-brand-navy">30+</span>
            Sign Types
          </div>
        </div>
      </div>

      {/* Product Categories Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Every Type of Sign You Need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-text-secondary">
              From illuminated channel letters to printed panels — design and
              price any sign type online.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="group flex flex-col rounded-xl border border-brand-muted bg-white overflow-hidden transition hover:border-brand-accent hover:shadow-lg"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-40 w-full object-cover"
                  />
                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-accent/10 text-brand-accent transition group-hover:bg-brand-accent/15">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-semibold text-brand-navy">
                        {cat.name}
                      </h3>
                    </div>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-text-secondary">
                      {cat.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-brand-accent">
                        {cat.startingPrice}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-text-secondary transition group-hover:text-brand-accent-light">
                        Design &amp; Price
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-brand-bg py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-brand-text-secondary">
              Three simple steps from design to delivery.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent text-white shadow-lg shadow-brand-accent/20">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="absolute -top-2 left-1/2 flex h-7 w-7 -translate-x-1/2 translate-x-6 items-center justify-center rounded-full bg-brand-accent-light text-xs font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-brand-navy">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Why Choose GatSoft Signs
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-brand-text-secondary">
              Tools and features that make ordering custom signage effortless.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-brand-muted bg-white p-6 transition hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-brand-navy">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-brand-navy to-brand-accent py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Create Your Sign?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Start designing your custom sign today with our free 3D configurator.
            No account required.
          </p>
          <div className="mt-8">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-brand-accent shadow-lg transition hover:bg-brand-accent/10"
            >
              Start Designing Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
            <div className="flex items-center gap-2 text-white/70">
              <Truck className="h-5 w-5" />
              <span className="text-sm font-medium">Free Shipping</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Flag className="h-5 w-5" />
              <span className="text-sm font-medium">Made in USA</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">2-3 Week Production</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
