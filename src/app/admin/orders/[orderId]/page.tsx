// src/app/admin/orders/[orderId]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ProductionFileData {
  id: string;
  fileType: string;
  fileName: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

interface OrderItemData {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  configuration: Record<string, unknown>;
  configSnapshot: { productName?: string } | null;
  product: { name: string; slug: string; category: string };
  productionFiles: ProductionFileData[];
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  items: OrderItemData[];
}

const fileIcons: Record<string, typeof FileText> = {
  svg_cut: FileCode,
  bom_json: FileSpreadsheet,
  spec_pdf: FileText,
  thumbnail_png: Image,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchOrder = () => {
    setLoading(true);
    fetch(`/api/v1/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder(data.order ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleRegenerateFiles = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/v1/orders/${orderId}/files`, { method: "POST" });
      fetchOrder();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading order...
      </div>
    );
  }

  if (!order) {
    return <p className="text-gray-500">Order not found.</p>;
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAYMENT_RECEIVED: "bg-green-100 text-green-800",
    IN_PRODUCTION: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.orderNumber}
          </h1>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100"}`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatPrice(order.total)}</p>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-6">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {item.configSnapshot?.productName ?? item.product.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.product.category} / {item.product.slug}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {item.quantity} x {formatPrice(item.unitPrice)}
                  </p>
                  <p className="text-sm text-gray-500">
                    = {formatPrice(item.totalPrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration details */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Configuration
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {Object.entries(item.configuration).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}: </span>
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Files */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Production Files
                </p>
                <button
                  onClick={handleRegenerateFiles}
                  disabled={generating}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              </div>

              {item.productionFiles.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No files generated yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {item.productionFiles.map((file) => {
                    const Icon = fileIcons[file.fileType] ?? FileText;
                    return (
                      <a
                        key={file.id}
                        href={file.url}
                        download={file.fileName}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <Icon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatBytes(file.sizeBytes)}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 ml-auto flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
