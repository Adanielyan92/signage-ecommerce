// src/types/order.ts
import type { SignConfiguration } from "./configurator";

export type OrderStatus =
  | "PENDING"
  | "PAYMENT_RECEIVED"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type ProductionFileType =
  | "svg_cut"
  | "bom_json"
  | "spec_pdf"
  | "thumbnail_png";

export interface ProductionFile {
  id: string;
  orderItemId: string;
  fileType: ProductionFileType;
  fileName: string;
  url: string;
  sizeBytes: number;
  contentType: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  configuration: SignConfiguration;
  thumbnailUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productionFiles?: ProductionFile[];
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  createdAt: string;
}
