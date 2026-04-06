"use client";

import Link from "next/link";
import { ShoppingCart, Menu, X, User, LogOut, LayoutTemplate } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";
import { useSession, signOut } from "next-auth/react";
import { MegaMenuDesktop, MegaMenuMobile } from "@/components/products/mega-menu";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());

  useEffect(() => setMounted(true), []);
  const { data: session, status } = useSession();

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-muted bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-navy text-sm font-bold text-white">
            GS
          </div>
          <span className="hidden font-heading text-lg font-semibold text-brand-navy sm:inline">
            GatSoft Signs
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <MegaMenuDesktop />
          <Link
            href="/configure/front-lit-trim-cap"
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
          >
            Design Your Sign
          </Link>
          <Link
            href="/templates"
            className="text-sm font-medium text-brand-text-secondary transition hover:text-brand-navy"
          >
            Templates
          </Link>
          <LanguageSwitcher />
          <Link
            href="/cart"
            className="relative flex items-center text-brand-text-secondary transition hover:text-brand-navy"
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-brand-muted" />
          ) : session ? (
            <div className="relative group">
              <button className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary transition hover:text-brand-navy">
                <User className="h-5 w-5" />
                <span className="hidden lg:inline">
                  {session.user?.name || session.user?.email?.split("@")[0]}
                </span>
              </button>
              <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-brand-muted bg-white py-1 shadow-lg group-hover:visible">
                <Link
                  href="/account"
                  className="block px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-bg"
                >
                  My Account
                </Link>
                <Link
                  href="/account/designs"
                  className="block px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-bg"
                >
                  Saved Designs
                </Link>
                <Link
                  href="/orders"
                  className="block px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-bg"
                >
                  My Orders
                </Link>
                <hr className="my-1 border-brand-muted" />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-bg"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-brand-text-secondary transition hover:text-brand-navy"
            >
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-brand-muted bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <MegaMenuMobile onNavigate={closeMobile} />

            <Link
              href="/configure/front-lit-trim-cap"
              className="rounded-lg bg-brand-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
              onClick={closeMobile}
            >
              Design Your Sign
            </Link>

            <div className="border-t border-brand-muted pt-3">
              <Link
                href="/templates"
                className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary"
                onClick={closeMobile}
              >
                <LayoutTemplate className="h-4 w-4" />
                Templates
              </Link>
            </div>
            <Link
              href="/cart"
              className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary"
              onClick={closeMobile}
            >
              <ShoppingCart className="h-5 w-5" />
              Cart {mounted && itemCount > 0 && `(${itemCount})`}
            </Link>
            {session ? (
              <>
                <Link
                  href="/account"
                  className="text-sm font-medium text-brand-text-secondary"
                  onClick={closeMobile}
                >
                  My Account
                </Link>
                <Link
                  href="/orders"
                  className="text-sm font-medium text-brand-text-secondary"
                  onClick={closeMobile}
                >
                  My Orders
                </Link>
                <button
                  onClick={() => {
                    closeMobile();
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-brand-text-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-brand-text-secondary"
                onClick={closeMobile}
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
