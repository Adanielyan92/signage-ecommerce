import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Package, Palette } from "lucide-react";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          savedDesigns: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const memberSince = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your account details and activity summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User info */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {user.name
                  ? user.name.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {user.name || "No name set"}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Member since</p>
                  <p className="font-medium">{memberSince}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity summary */}
          <div>
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Activity Summary
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{user._count.orders}</p>
                  <p className="text-sm text-muted-foreground">
                    {user._count.orders === 1 ? "Order" : "Orders"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {user._count.savedDesigns}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user._count.savedDesigns === 1
                      ? "Saved Design"
                      : "Saved Designs"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {user.phone && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{user.phone}</p>
              </div>
            </>
          )}

          {user.image && (
            <Badge variant="secondary" className="text-xs">
              Connected via social login
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
