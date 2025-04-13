export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id?: string;
  name: string;
  document: string;
  email?: string;
  phone?: string;
}

export interface Sale {
  id: string;
  items: CartItem[];
  customer?: Customer;
  total: number;
  date: Date;
  status: 'pending' | 'completed' | 'cancelled';
} 