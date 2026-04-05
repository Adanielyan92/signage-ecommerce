// src/components/admin/stock-parts-grid.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Box, Search } from "lucide-react";
import { STOCK_PART_CATEGORIES, type StockPartData } from "@/types/stock-part";

export function StockPartsGrid() {
  const [parts, setParts] = useState<StockPartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        activeCategory === "all"
          ? "/api/v1/stock-parts"
          : `/api/v1/stock-parts?category=${activeCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setParts(data.parts ?? []);
    } catch {
      console.error("Failed to fetch stock parts");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const filtered = parts.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (formData: FormData) => {
    const body = {
      name: formData.get("name") as string,
      slug: (formData.get("name") as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      category: formData.get("category") as string,
      description: formData.get("description") as string || null,
      glbUrl: formData.get("glbUrl") as string || null,
    };

    const res = await fetch("/api/v1/stock-parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowCreateDialog(false);
      fetchParts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Part
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Stock Part</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="Wall Standoff Set" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_PART_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Stainless steel standoff mounting kit" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="glbUrl">GLB URL (optional)</Label>
                <Input id="glbUrl" name="glbUrl" placeholder="/models/standoff-set.glb" />
              </div>
              <Button type="submit" className="w-full">Create Part</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {STOCK_PART_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Parts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-t-lg" />
              <CardContent className="pt-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "No parts match your search." : "No stock parts yet. Add your first part to get started."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((part) => (
            <Card key={part.id} className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
              <div className="h-40 bg-muted flex items-center justify-center">
                {part.previewImageUrl ? (
                  <img
                    src={part.previewImageUrl}
                    alt={part.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Box className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <CardContent className="pt-4">
                <h3 className="font-medium text-sm">{part.name}</h3>
                {part.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {part.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {STOCK_PART_CATEGORIES.find((c) => c.value === part.category)?.label ?? part.category}
                  </Badge>
                  {!part.tenantId && (
                    <Badge variant="outline" className="text-xs">Platform</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
