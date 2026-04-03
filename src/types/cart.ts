import type { SignConfiguration } from "./configurator";

export interface CartItem {
  id: string;
  productType: string;
  productName: string;
  configuration: SignConfiguration;
  thumbnailUrl?: string;
  quantity: number;
  unitPrice: number;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}
