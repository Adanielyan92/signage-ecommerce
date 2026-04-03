"use client";

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
} from "lucide-react";

const categories = [
  {
    name: "Channel Letters",
    description:
      "Illuminated 3D letters with LED lighting — the most popular storefront sign type.",
    startingPrice: "$1,360+",
    href: "/configure/front-lit-trim-cap",
    icon: Type,
  },
  {
    name: "Lit Shape Signs",
    description:
      "Custom LED lit shapes and contoured logo signs for bold brand statements.",
    startingPrice: "$1,500+",
    href: "/configure/cloud-sign",
    icon: Lightbulb,
  },
  {
    name: "Cabinet Signs",
    description:
      "Illuminated box signs with printed or vinyl faces, single or double sided.",
    startingPrice: "$1,500+",
    href: "/configure/single-face-squared",
    icon: SquareAsterisk,
  },
  {
    name: "Dimensional Letters",
    description:
      "Non-illuminated 3D letters in acrylic, painted metal, or brushed aluminum.",
    startingPrice: "$800+",
    href: "/configure/acrylic",
    icon: Boxes,
  },
  {
    name: "Logo Signs",
    description:
      "Custom-fabricated logo signs, available lit or non-lit, built to your artwork.",
    startingPrice: "$800+",
    href: "/configure/lit-logo",
    icon: Stamp,
  },
  {
    name: "Print Signs",
    description:
      "Full-color printed signs on ACM panels, coroplast, or foam board.",
    startingPrice: "$100+",
    href: "/configure/acm-panel",
    icon: Printer,
  },
  {
    name: "Sign Posts",
    description:
      "Freestanding post-mounted and monument base signs for maximum visibility.",
    startingPrice: "$600+",
    href: "/configure/single-post",
    icon: Signpost,
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
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Custom Signs, Designed in 3D
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Design your perfect sign with our real-time 3D configurator. See
              exactly what you&apos;ll get before you order.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50"
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

      {/* Product Categories Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Every Type of Sign You Need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
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
                  className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-neutral-500">
                    {cat.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-600">
                      {cat.startingPrice}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 transition group-hover:text-blue-600">
                      Design &amp; Price
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
              Three simple steps from design to delivery.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="absolute -top-2 left-1/2 flex h-7 w-7 -translate-x-1/2 translate-x-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-neutral-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
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
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Why Choose GatSoft Signs
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
              Tools and features that make ordering custom signage effortless.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-neutral-200 bg-white p-6 transition hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-neutral-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Create Your Sign?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
            Start designing your custom sign today with our free 3D configurator.
            No account required.
          </p>
          <div className="mt-8">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              Start Designing Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
            <div className="flex items-center gap-2 text-blue-100">
              <Truck className="h-5 w-5" />
              <span className="text-sm font-medium">Free Shipping</span>
            </div>
            <div className="flex items-center gap-2 text-blue-100">
              <Flag className="h-5 w-5" />
              <span className="text-sm font-medium">Made in USA</span>
            </div>
            <div className="flex items-center gap-2 text-blue-100">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">2-3 Week Production</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
