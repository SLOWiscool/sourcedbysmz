import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Product } from '../types';
import { getProducts, loadProducts, subscribeProducts } from '../lib/product-source';

let firstLoadStarted = false;

/** Catalogue with loading state. Re-renders automatically when admin edits arrive. */
export function useProducts(): { products: Product[]; loading: boolean } {
  const products = useSyncExternalStore(subscribeProducts, getProducts);
  const [loading, setLoading] = useState(!firstLoadStarted);

  useEffect(() => {
    firstLoadStarted = true;
    let alive = true;
    // Force a refresh on every page mount so admin edits (prices, stock,
    // new products) appear without a hard reload of the tab.
    loadProducts(true).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { products: Array.isArray(products) ? products : [], loading };
}
