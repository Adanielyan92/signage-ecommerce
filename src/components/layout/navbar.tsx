"use client";

import Link from "next/link";
import { ShoppingCart, Menu, X, User, LogOut, LayoutTemplate, Image as ImageIcon } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
            GS
          </div>
          <span className="hidden text-lg font-semibold text-neutral-900 sm:inline">
            GatSoft Signs
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <MegaMenuDesktop />
          <Link
            href="/templates"
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            Templates
          </Link>
          <Link
            href="/mockup"
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            Wall Mockup
          </Link>
          <Link
            href="/configure/front-lit-trim-cap"
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            Design Your Sign
          </Link>
          <Link
            href="/manufacturers"
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            Manufacturers
          </Link>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            Admin
          </Link>
          <LanguageSwitcher />
          <Link
            href="/cart"
            className="relative flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Auth */}
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200" />
          ) : session ? (
            <div className="relative group">
              <button className="flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-900">
                <User className="h-5 w-5" />
                <span className="hidden lg:inline">
                  {session.user?.name || session.user?.email?.split("@")[0]}
                </span>
              </button>
              <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg group-hover:visible">
                <Link
                  href="/account"
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  My Account
                </Link>
                <Link
                  href="/account/designs"
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  Saved Designs
                </Link>
                <Link
                  href="/orders"
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  My Orders
                </Link>
                <hr className="my-1 border-neutral-200" />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
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
        <nav className="border-t border-neutral-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <MegaMenuMobile onNavigate={closeMobile} />

            <div className="border-t border-neutral-100 pt-3">
              <Link
                href="/templates"
                className="flex items-center gap-2 text-sm font-medium text-neutral-600"
                onClick={closeMobile}
              >
                <LayoutTemplate className="h-4 w-4" />
                Templates
              </Link>
            </div>
            <Link
              href="/mockup"
              className="flex items-center gap-2 text-sm font-medium text-neutral-600"
              onClick={closeMobile}
            >
              <ImageIcon className="h-4 w-4" />
              Wall Mockup
            </Link>
            <Link
              href="/configure/front-lit-trim-cap"
              className="text-sm font-medium text-neutral-600"
              onClick={closeMobile}
            >
              Design Your Sign
            </Link>
            <Link
              href="/cart"
              className="flex items-center gap-2 text-sm font-medium text-neutral-600"
              onClick={closeMobile}
            >
              <ShoppingCart className="h-5 w-5" />
              Cart {mounted && itemCount > 0 && `(${itemCount})`}
            </Link>
            {session ? (
              <>
                <Link
                  href="/account"
                  className="text-sm font-medium text-neutral-600"
                  onClick={closeMobile}
                >
                  My Account
                </Link>
                <Link
                  href="/orders"
                  className="text-sm font-medium text-neutral-600"
                  onClick={closeMobile}
                >
                  My Orders
                </Link>
                <button
                  onClick={() => {
                    closeMobile();
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-neutral-600"
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
