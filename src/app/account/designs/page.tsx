import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";
import Link from "next/link";
import { DeleteDesignButton } from "./delete-design-button";

export default async function SavedDesignsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/designs");
  }

  const designs = await prisma.savedDesign.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: { slug: true, name: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Designs</h2>
          <p className="text-sm text-muted-foreground">
            {designs.length} {designs.length === 1 ? "design" : "designs"} saved
          </p>
        </div>
      </div>

      {designs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">No saved designs</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Design your custom sign in the configurator and save it for later.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Browse Products
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => {
            const config = design.configuration as Record<string, unknown>;
            const createdDate = design.createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const updatedDate = design.updatedAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card key={design.id} className="overflow-hidden">
                {/* Thumbnail */}
                <div className="aspect-video bg-muted">
                  {design.thumbnailUrl ? (
                    <img
                      src={design.thumbnailUrl}
                      alt={design.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Palette className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{design.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {design.product.name}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Created {createdDate}
                    {createdDate !== updatedDate && ` | Updated ${updatedDate}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Configuration summary */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {config.text ? (
                      <p>
                        Text:{" "}
                        <span className="font-medium text-foreground">
                          &quot;{String(config.text)}&quot;
                        </span>
                      </p>
                    ) : null}
                    {config.height ? (
                      <p>
                        Height:{" "}
                        <span className="font-medium text-foreground">
                          {String(config.height)}&quot;
                        </span>
                      </p>
                    ) : null}
                    {config.fontStyle ? (
                      <p>
                        Font:{" "}
                        <span className="font-medium text-foreground">
                          {String(config.fontStyle)}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/configure/${design.product.slug}?design=${design.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Load Design
                    </Link>
                    <DeleteDesignButton designId={design.id} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
