// src/lib/production-files.ts
/**
 * Production file generation service.
 * Generates SVG cut files, BOM JSON, and PDF spec sheets for order items.
 * Stores files via the FileStorage abstraction.
 */

import { getFileStorage, type StoredFile } from "@/lib/file-storage";
import { generateSvgCutFile } from "@/engine/svg-generator";
import { generateBOM, type BOMResult } from "@/engine/bom-generator";
import { generateDxfFromSvgPaths } from "@/engine/dxf-generator";
import type { SignConfiguration, Dimensions } from "@/types/configurator";
import type { ProductionFileType } from "@/types/order";
import { formatPrice } from "@/lib/utils";

export interface GenerateFilesInput {
  orderId: string;
  orderItemId: string;
  orderNumber: string;
  productName: string;
  config: SignConfiguration;
  dimensions: Dimensions;
  unitPrice: number;
  quantity: number;
}

export interface GeneratedFile {
  fileType: ProductionFileType;
  fileName: string;
  storageKey: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

/**
 * Generate all production files for a single order item.
 * Returns an array of generated file metadata to be persisted in the DB.
 */
export async function generateProductionFiles(
  input: GenerateFilesInput
): Promise<GeneratedFile[]> {
  const storage = getFileStorage();
  const basePath = `orders/${input.orderId}/${input.orderItemId}`;
  const results: GeneratedFile[] = [];

  // 1. SVG cut file
  try {
    const svgContent = await generateSvgCutFile({
      text: input.config.text,
      fontName: input.config.font,
      heightInches: input.config.height,
    });

    const svgFile = await storage.write(
      `${basePath}/cut-file.svg`,
      svgContent,
      "image/svg+xml"
    );

    results.push({
      fileType: "svg_cut",
      fileName: `${input.orderNumber}-cut-file.svg`,
      storageKey: svgFile.key,
      url: svgFile.url,
      sizeBytes: svgFile.sizeBytes,
      contentType: "image/svg+xml",
    });
    // Generate DXF from the SVG content
    try {
      const svgPathRegex = /<path[^>]*id="([^"]*)"[^>]*d="([^"]*)"[^>]*\/>/g;
      const dxfPaths: { id: string; d: string }[] = [];
      let match;
      while ((match = svgPathRegex.exec(svgContent)) !== null) {
        dxfPaths.push({ id: match[1], d: match[2] });
      }

      if (dxfPaths.length > 0) {
        const dxfContent = generateDxfFromSvgPaths(dxfPaths, {
          unitInches: true,
          layerPerLetter: true,
        });

        const dxfFile = await storage.write(
          `${basePath}/cut-file.dxf`,
          dxfContent,
          "application/dxf"
        );

        results.push({
          fileType: "dxf_cut" as ProductionFileType,
          fileName: `${input.orderNumber}-cut-file.dxf`,
          storageKey: dxfFile.key,
          url: dxfFile.url,
          sizeBytes: dxfFile.sizeBytes,
          contentType: "application/dxf",
        });
      }
    } catch (dxfErr) {
      console.error(`Failed to generate DXF for order item ${input.orderItemId}:`, dxfErr);
    }
  } catch (err) {
    console.error(`Failed to generate SVG for order item ${input.orderItemId}:`, err);
  }

  // 2. BOM JSON
  try {
    const bom = generateBOM({
      config: input.config,
      dimensions: input.dimensions,
      productName: input.productName,
    });

    const bomJson = JSON.stringify(bom, null, 2);
    const bomFile = await storage.write(
      `${basePath}/bom.json`,
      bomJson,
      "application/json"
    );

    results.push({
      fileType: "bom_json",
      fileName: `${input.orderNumber}-bom.json`,
      storageKey: bomFile.key,
      url: bomFile.url,
      sizeBytes: bomFile.sizeBytes,
      contentType: "application/json",
    });
  } catch (err) {
    console.error(`Failed to generate BOM for order item ${input.orderItemId}:`, err);
  }

  // 3. Spec PDF
  try {
    const bom = generateBOM({
      config: input.config,
      dimensions: input.dimensions,
      productName: input.productName,
    });

    const pdfBuffer = await generateSpecPdf(input, bom);
    const pdfFile = await storage.write(
      `${basePath}/spec-sheet.pdf`,
      pdfBuffer,
      "application/pdf"
    );

    results.push({
      fileType: "spec_pdf",
      fileName: `${input.orderNumber}-spec-sheet.pdf`,
      storageKey: pdfFile.key,
      url: pdfFile.url,
      sizeBytes: pdfFile.sizeBytes,
      contentType: "application/pdf",
    });
  } catch (err) {
    console.error(`Failed to generate PDF for order item ${input.orderItemId}:`, err);
  }

  return results;
}

// ---------------------------------------------------------------------------
// PDF generation (spec sheet)
// ---------------------------------------------------------------------------

async function generateSpecPdf(
  input: GenerateFilesInput,
  bom: BOMResult
): Promise<Buffer> {
  // jsPDF is ESM -- dynamic import for compatibility
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const margin = 50;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFontSize(20);
  doc.text("Production Spec Sheet", margin, y);
  y += 30;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Order: ${input.orderNumber}`, margin, y);
  doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, pageWidth - margin - 120, y);
  y += 20;

  // --- Divider ---
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // --- Product Info ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(input.productName, margin, y);
  y += 25;

  doc.setFontSize(10);
  const specs = [
    ["Text", input.config.text],
    ["Font", input.config.font],
    ["Height", `${input.config.height}"`],
    ["Width", `${Math.round(input.dimensions.totalWidthInches)}"`],
    ["Depth", input.config.sideDepth],
    ["Type", input.config.productType],
    ["Illumination", input.config.lit],
    ...(input.config.lit === "Lit" ? [["LED Color", input.config.led]] : []),
    ...(input.config.lit === "Lit" ? [["Lit Sides", input.config.litSides]] : []),
    ["Painting", input.config.painting],
    ["Raceway", input.config.raceway],
    ["Vinyl", input.config.vinyl],
    ["Background", input.config.background],
  ];

  for (const [label, value] of specs) {
    doc.setTextColor(80);
    doc.text(`${label}:`, margin, y);
    doc.setTextColor(0);
    doc.text(String(value), margin + 100, y);
    y += 16;
  }

  y += 10;

  // --- Pricing ---
  doc.setFontSize(12);
  doc.text("Pricing", margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Unit Price:", margin, y);
  doc.setTextColor(0);
  doc.text(formatPrice(input.unitPrice), margin + 100, y);
  y += 16;

  doc.setTextColor(80);
  doc.text("Quantity:", margin, y);
  doc.setTextColor(0);
  doc.text(String(input.quantity), margin + 100, y);
  y += 16;

  doc.setTextColor(80);
  doc.text("Total:", margin, y);
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(formatPrice(input.unitPrice * input.quantity), margin + 100, y);
  y += 25;

  // --- Divider ---
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // --- BOM Table ---
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Bill of Materials", margin, y);
  y += 20;

  // Table header
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Material", margin, y);
  doc.text("Qty", margin + 200, y);
  doc.text("Unit", margin + 260, y);
  doc.text("Notes", margin + 310, y);
  y += 5;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Table rows
  doc.setTextColor(0);
  for (const item of bom.items) {
    doc.text(item.material, margin, y);
    doc.text(String(item.quantity), margin + 200, y);
    doc.text(item.unit, margin + 260, y);
    if (item.notes) {
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(item.notes.substring(0, 40), margin + 310, y);
      doc.setFontSize(9);
      doc.setTextColor(0);
    }
    y += 14;

    // New page if needed
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // --- Footer ---
  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by GatSoft Signs", margin, y);

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
