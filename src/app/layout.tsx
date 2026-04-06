import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SessionProvider } from "@/components/providers/session-provider";
import { CartSyncProvider } from "@/components/providers/cart-sync-provider";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://gatsoftsigns.com"
  ),
  title: {
    default: "GatSoft Signs - Custom Channel Letters & 3D Signage",
    template: "%s | GatSoft Signs",
  },
  description:
    "Design and order custom channel letters, 3D letters, and illuminated signage online. Real-time 3D preview with instant pricing.",
  keywords: [
    "channel letters",
    "3D signage",
    "custom signs",
    "illuminated signs",
    "LED signs",
    "storefront signage",
    "halo-lit letters",
    "back-lit letters",
    "marquee letters",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "GatSoft Signs",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <CartSyncProvider>
            <I18nProvider defaultLocale="en" availableLocales={["en", "es"]}>
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <OrganizationJsonLd />
              <Toaster position="top-right" />
            </I18nProvider>
          </CartSyncProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
