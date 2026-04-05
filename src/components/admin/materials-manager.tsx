// src/components/admin/materials-manager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import type { MaterialPresetData, ThreeMaterialType, MaterialProperties } from "@/types/material-preset";

export function MaterialsManager() {
  const [presets, setPresets] = useState<MaterialPresetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<MaterialPresetData | null>(null);

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/materials");
      const data = await res.json();
      setPresets(data.presets ?? []);
    } catch {
      console.error("Failed to fetch material presets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Material Preset</DialogTitle>
            </DialogHeader>
            <MaterialForm
              onSubmit={async (data) => {
                const res = await fetch("/api/v1/materials", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (res.ok) {
                  setShowCreateDialog(false);
                  fetchPresets();
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-muted rounded mb-3" />
                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <Card key={preset.id} className="overflow-hidden">
              <div
                className="h-20 border-b"
                style={{
                  background: preset.properties.color ?? "#888",
                  opacity: preset.properties.opacity ?? 1,
                }}
              />
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{preset.name}</h3>
                  {preset.tenantId === null ? (
                    <Badge variant="outline" className="text-xs">Platform</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingPreset(preset)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant="secondary" className="text-xs">{preset.materialType.replace("Mesh", "").replace("Material", "")}</Badge>
                  {preset.properties.metalness !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Metal: {preset.properties.metalness}
                    </Badge>
                  )}
                  {preset.properties.roughness !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Rough: {preset.properties.roughness}
                    </Badge>
                  )}
                  {preset.properties.transmission !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Trans: {preset.properties.transmission}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingPreset} onOpenChange={(open) => !open && setEditingPreset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingPreset?.name}</DialogTitle>
          </DialogHeader>
          {editingPreset && (
            <MaterialForm
              initial={editingPreset}
              onSubmit={async (data) => {
                const res = await fetch(`/api/v1/materials/${editingPreset.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (res.ok) {
                  setEditingPreset(null);
                  fetchPresets();
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MaterialFormProps {
  initial?: MaterialPresetData;
  onSubmit: (data: {
    name: string;
    slug: string;
    description: string | null;
    materialType: ThreeMaterialType;
    properties: MaterialProperties;
  }) => Promise<void>;
}

function MaterialForm({ initial, onSubmit }: MaterialFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [materialType, setMaterialType] = useState<ThreeMaterialType>(
    initial?.materialType ?? "MeshStandardMaterial"
  );
  const [props, setProps] = useState<MaterialProperties>(initial?.properties ?? {
    color: "#FFFFFF",
    metalness: 0.5,
    roughness: 0.5,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateProp = <K extends keyof MaterialProperties>(key: K, value: MaterialProperties[K]) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: description || null,
        materialType,
        properties: props,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mat-name">Name</Label>
        <Input id="mat-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Brushed Aluminum" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mat-desc">Description</Label>
        <Input id="mat-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Material description" />
      </div>

      <div className="space-y-2">
        <Label>Material Type</Label>
        <Select value={materialType} onValueChange={(v) => setMaterialType(v as ThreeMaterialType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MeshStandardMaterial">Standard (PBR)</SelectItem>
            <SelectItem value="MeshPhysicalMaterial">Physical (advanced PBR)</SelectItem>
            <SelectItem value="MeshBasicMaterial">Basic (unlit/emissive)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mat-color">Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            id="mat-color"
            value={props.color ?? "#FFFFFF"}
            onChange={(e) => updateProp("color", e.target.value)}
            className="h-10 w-12 rounded border cursor-pointer"
          />
          <Input value={props.color ?? "#FFFFFF"} onChange={(e) => updateProp("color", e.target.value)} className="font-mono" />
        </div>
      </div>

      {materialType !== "MeshBasicMaterial" && (
        <>
          <div className="space-y-2">
            <Label>Metalness: {props.metalness ?? 0}</Label>
            <Slider
              value={[props.metalness ?? 0]}
              onValueChange={([v]) => updateProp("metalness", v)}
              min={0} max={1} step={0.05}
            />
          </div>
          <div className="space-y-2">
            <Label>Roughness: {props.roughness ?? 0.5}</Label>
            <Slider
              value={[props.roughness ?? 0.5]}
              onValueChange={([v]) => updateProp("roughness", v)}
              min={0} max={1} step={0.05}
            />
          </div>
        </>
      )}

      {materialType === "MeshPhysicalMaterial" && (
        <div className="space-y-2">
          <Label>Transmission: {props.transmission ?? 0}</Label>
          <Slider
            value={[props.transmission ?? 0]}
            onValueChange={([v]) => updateProp("transmission", v)}
            min={0} max={1} step={0.05}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={submitting || !name}>
        {submitting ? "Saving..." : initial ? "Update Material" : "Create Material"}
      </Button>
    </form>
  );
}
