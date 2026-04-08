import { jsPDF } from "jspdf";
import { formatPrice } from "@/lib/utils";

export async function generateClientQuotePDF(
  productCategory: string,
  config: Record<string, unknown>,
  dimensions: any,
  breakdown: any,
  sfDescription: string
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(20, 40, 80);
  doc.text("GatSoft Signs - Client Quote", 20, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(new Date().toLocaleDateString(), 160, 20);

  // Line separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 25, 190, 25);

  let y = 35;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Product Details", 20, y);
  y += 10;
  
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(`Category: ${productCategory}`, 20, y);
  y += 7;
  
  // Iterate config params loosely
  for (const [k, v] of Object.entries(config)) {
    if (k === "productCategory" || k === "svgPath" || k === "productType" || v === "" || v === "-") continue;
    
    // Only process string, number, or boolean formatting
    let strVal = "";
    if (typeof v === "boolean") strVal = v ? "Yes" : "No";
    else if (typeof v === "string" || typeof v === "number") strVal = String(v);
    else continue;

    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
    doc.text(`${label}: ${strVal}`, 20, y);
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  y += 5;
  doc.setLineWidth(0.1);
  doc.line(20, y, 190, y);
  y += 10;

  if (dimensions && (dimensions.totalWidthInches > 0 || dimensions.heightInches > 0)) {
     doc.setFontSize(14);
     doc.setTextColor(0, 0, 0);
     doc.text("Computed Dimensions", 20, y);
     y += 8;
     doc.setFontSize(11);
     doc.setTextColor(50, 50, 50);
     doc.text(`Width: ${dimensions.totalWidthInches.toFixed(1)}"`, 20, y);
     y += 7;
     doc.text(`Height: ${dimensions.heightInches.toFixed(1)}"`, 20, y);
     y += 7;
     if (dimensions.squareFeet > 0) {
        doc.text(`Total Area: ${dimensions.squareFeet.toFixed(1)} sqft`, 20, y);
        y += 7;
     }

     y += 5;
     doc.line(20, y, 190, y);
     y += 10;
  }

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Pricing Summary", 20, y);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  
  if (breakdown.letterPrice > 0) {
    doc.text(`Base Price: ${formatPrice(breakdown.letterPrice)}`, 20, y);
    y += 7;
  }
  if (breakdown.priceAfterMultipliers - breakdown.letterPrice > 0) {
    doc.text(`Options & Upgrades: ${formatPrice(breakdown.priceAfterMultipliers - breakdown.letterPrice)}`, 20, y);
    y += 7;
  }
  if (breakdown.paintingExtra > 0) {
    doc.text(`Painting: ${formatPrice(breakdown.paintingExtra)}`, 20, y);
    y += 7;
  }
  if (breakdown.racewayPrice > 0) {
    doc.text(`Raceway: ${formatPrice(breakdown.racewayPrice)}`, 20, y);
    y += 7;
  }
  if (breakdown.vinylPrice > 0) {
    doc.text(`Vinyl: ${formatPrice(breakdown.vinylPrice)}`, 20, y);
    y += 7;
  }

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
  y += 2;
  doc.line(20, y, 100, y);
  y += 8;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Estimate: ${formatPrice(breakdown.total)}`, 20, y);

  if (sfDescription) {
    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Internal Configuration String:", 20, y);
    y += 5;
    const splitNotes = doc.splitTextToSize(sfDescription, 170);
    doc.text(splitNotes, 20, y);
  }

  doc.save("GatSoft-Signage-Quote.pdf");
}
