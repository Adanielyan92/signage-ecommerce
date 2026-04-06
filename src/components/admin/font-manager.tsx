// src/components/admin/font-manager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Type, Trash2 } from "lucide-react";

interface FontData {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  fileName: string;
  fileUrl: string | null;
  source: "PLATFORM" | "GOOGLE" | "CUSTOM";
  isCurved: boolean;
  cssFamily: string | null;
  isActive: boolean;
}

export function FontManager() {
  const [fonts, setFonts] = useState<FontData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchFonts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/fonts");
      const data = await res.json();
      setFonts(data.fonts ?? []);
    } catch {
      console.error("Failed to fetch fonts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileEl = form.querySelector<HTMLInputElement>('input[type="file"]');
    const nameEl = form.querySelector<HTMLInputElement>('input[name="fontName"]');
    const curvedEl = form.querySelector<HTMLInputElement>('input[name="isCurved"]');

    const file = fileEl?.files?.[0];
    const fontName = nameEl?.value;

    if (!file || !fontName) return;

    setUploading(true);
    try {
      // 1. Upload the file
      const uploadData = new FormData();
      uploadData.set("file", file);
      const uploadRes = await fetch("/api/v1/fonts/upload", {
        method: "POST",
        body: uploadData,
      });
      const { fileName, fileUrl } = await uploadRes.json();

      if (!uploadRes.ok) return;

      // 2. Create the font record
      const slug = fontName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await fetch("/api/v1/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fontName,
          slug,
          fileName,
          fileUrl,
          source: "CUSTOM",
          isCurved: curvedEl?.checked ?? false,
          cssFamily: `'Sign-${slug}', sans-serif`,
        }),
      });

      setShowUploadDialog(false);
      fetchFonts();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fontId: string) => {
    if (!confirm("Remove this font from your catalog?")) return;
    await fetch(`/api/v1/fonts/${fontId}`, { method: "DELETE" });
    fetchFonts();
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case "PLATFORM": return "Platform";
      case "GOOGLE": return "Google";
      case "CUSTOM": return "Custom";
      default: return source;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-1.5 h-4 w-4" />
              Upload Font
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Custom Font</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontName">Font Name</Label>
                <Input id="fontName" name="fontName" required placeholder="My Custom Font" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontFile">TTF or OTF File</Label>
                <Input id="fontFile" type="file" accept=".ttf,.otf" required />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="isCurved" name="isCurved" />
                <Label htmlFor="isCurved" className="text-sm">
                  Curved/decorative font (applies 1.2x fabrication multiplier)
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload & Add Font"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 bg-muted rounded" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {fonts.map((font) => (
            <Card key={font.id}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0">
                  <Type className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{font.name}</span>
                    <Badge variant="outline" className="text-xs">{sourceLabel(font.source)}</Badge>
                    {font.isCurved && (
                      <Badge variant="secondary" className="text-xs">Curved (1.2x)</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {font.fileName}
                  </p>
                </div>
                {/* Only allow deleting tenant-owned fonts, not platform fonts */}
                {font.tenantId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(font.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
