import { create } from 'zustand';
import { CartItem, Customer, Product } from '../types';

interface CartStore {
  items: CartItem[];
  customer: Customer | null;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customer: null,
  total: 0,

  addItem: (product) => {
    const items = get().items;
    const existingItem = items.find(item => item.product.id === product.id);

    if (existingItem) {
      const updatedItems = items.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      set({ items: updatedItems, total: calculateTotal(updatedItems) });
    } else {
      const updatedItems = [...items, { product, quantity: 1 }];
      set({ items: updatedItems, total: calculateTotal(updatedItems) });
    }
  },

  removeItem: (productId) => {
    const items = get().items.filter(item => item.product.id !== productId);
    set({ items, total: calculateTotal(items) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity < 0) return;
    const items = get().items.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    ).filter(item => item.quantity > 0);
    set({ items, total: calculateTotal(items) });
  },

  setCustomer: (customer) => set({ customer }),
  clearCart: () => set({ items: [], customer: null, total: 0 }),
}));

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
}; 