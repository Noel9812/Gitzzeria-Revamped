export interface MenuItem {
  id: string;
  ItemName: string;
  description?: string; // Optional description
  price: number;
}

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}