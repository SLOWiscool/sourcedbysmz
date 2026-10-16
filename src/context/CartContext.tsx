import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { CartItem, Product } from '../types';
import { getEffectivePrice } from '../types';
import { getProducts, loadProducts } from '../lib/product-source';
import { useProducts } from '../hooks/useProducts';

const STORAGE_KEY = 'sourcedbysmz_cart';

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; productId: string; variantId?: string; size?: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string; variantId?: string; size?: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; variantId?: string; size?: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'HYDRATE'; items: CartItem[] };

interface CartContextValue {
  state: CartState;
  addItem: (productId: string, variantId?: string, quantity?: number, size?: string) => void;
  removeItem: (productId: string, variantId?: string, size?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number, size?: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function sameLine(a: CartItem, b: { productId: string; variantId?: string; size?: string }): boolean {
  return a.productId === b.productId && a.variantId === b.variantId && (a.size || undefined) === (b.size || undefined);
}

function filterValid(items: CartItem[], products: Product[]): CartItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: CartItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.productId !== 'string') continue;
    const product = byId.get(item.productId);
    if (!product) continue;
    if (item.variantId !== undefined) {
      if (typeof item.variantId !== 'string') continue;
      if (!product.variants?.some((v) => v.id === item.variantId)) continue;
    }
    const sizes = product.sizes || [];
    let size: string | undefined;
    if (sizes.length > 0) {
      if (typeof item.size !== 'string' || !sizes.includes(item.size)) continue;
      size = item.size;
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) continue;
    out.push({ productId: item.productId, variantId: item.variantId, size, quantity: item.quantity });
  }
  return out;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return filterValid(parsed, getProducts());
  } catch {
    return [];
  }
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.items };
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => sameLine(i, action));
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            sameLine(i, action) ? { ...i, quantity: i.quantity + action.quantity } : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { productId: action.productId, variantId: action.variantId, size: action.size, quantity: action.quantity }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => !sameLine(i, action)),
      };
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => !sameLine(i, action)),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          sameLine(i, action) ? { ...i, quantity: action.quantity } : i
        ),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'OPEN_DRAWER':
      return { ...state, drawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], drawerOpen: false });
  const { products } = useProducts();

  useEffect(() => {
    dispatch({ type: 'HYDRATE', items: loadCart() });
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-validate saved lines once the live catalogue arrives (unknown or
  // removed products/variants drop out instead of crashing checkout).
  useEffect(() => {
    dispatch({ type: 'HYDRATE', items: filterValid(state.items, products) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Storage full or unavailable
    }
  }, [state.items]);

  const addItem = (productId: string, variantId?: string, quantity = 1, size?: string) => {
    dispatch({ type: 'ADD_ITEM', productId, variantId, size, quantity });
  };

  const removeItem = (productId: string, variantId?: string, size?: string) => {
    dispatch({ type: 'REMOVE_ITEM', productId, variantId, size });
  };

  const updateQuantity = (productId: string, variantId: string | undefined, quantity: number, size?: string) => {
    dispatch({ type: 'UPDATE_QUANTITY', productId, variantId, size, quantity });
  };

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const openDrawer = () => dispatch({ type: 'OPEN_DRAWER' });
  const closeDrawer = () => dispatch({ type: 'CLOSE_DRAWER' });

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotal = state.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return sum;
    return sum + getEffectivePrice(product, item.variantId) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{ state, addItem, removeItem, updateQuantity, clearCart, openDrawer, closeDrawer, itemCount, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function useProductFromCart(productId: string): Product | undefined {
  return getProducts().find((p) => p.id === productId);
}
