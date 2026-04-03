import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import type { ReactNode } from "react";
import { User, Palette, Package } from "lucide-react";

interface Props {
  children: ReactNode;
}

const sidebarLinks = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/designs", label: "Saved Designs", icon: Palette },
  { href: "/orders", label: "Orders", icon: Package },
];

export default async function AccountLayout({ children }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">My Account</h1>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar navigation */}
        <nav className="w-full shrink-0 md:w-56">
          <ul className="space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
