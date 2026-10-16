export type Condition = 'new' | 'excellent' | 'very_good' | 'good' | 'fair';
export type ProductStatus = 'draft' | 'active' | 'sold_out' | 'archived';

export function isNewProduct(product: { status: ProductStatus; createdAt: string }): boolean {
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return product.status === 'active' && Date.now() - new Date(product.createdAt).getTime() < thirtyDays;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  /** Hex swatch colour, e.g. '#111111' */
  colorHex?: string;
  stockQuantity: number;
  /** Variant-specific gallery. Falls back to product.images when absent. */
  images?: ProductImage[];
  /** Optional per-variant price override in minor units. Falls back to product.price. */
  price?: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  brand?: string;
  category: string;
  description: string;
  price: number;
  currency: 'GBP';
  condition: Condition;
  conditionNotes?: string;
  images: ProductImage[];
  variants?: ProductVariant[];
  /** Available sizes (e.g. clothing/shoe sizes). Empty/undefined = one-size; no selector shown. */
  sizes?: string[];
  stockQuantity: number;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  /** Chosen size; required at checkout when the product lists sizes. */
  size?: string;
  quantity: number;
}

export interface CartLine {
  product: Product;
  variantLabel?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'featured';

export interface ProductFilters {
  categories: string[];
  conditions: Condition[];
  sizes: string[];
  priceRange: [number, number] | null;
  inStockOnly: boolean;
}

export type AvailabilityKind = 'coming_soon' | 'sold_out' | 'low_stock' | 'in_stock' | 'unavailable';

export function getVariant(product: Product, variantId?: string): ProductVariant | undefined {
  if (!variantId || !product.variants) return undefined;
  return product.variants.find((v) => v.id === variantId);
}

export function getEffectivePrice(product: Product, variantId?: string): number {
  const v = getVariant(product, variantId);
  if (v?.price !== undefined) return v.price;
  return product.price;
}

export function getEffectiveStock(product: Product, variantId?: string): number {
  const v = getVariant(product, variantId);
  if (v) return v.stockQuantity;
  return product.stockQuantity;
}

export function getGalleryImages(product: Product, variantId?: string): ProductImage[] {
  const v = getVariant(product, variantId);
  if (v?.images && v.images.length > 0) return v.images;
  return product.images;
}

/**
 * Honest availability. Never derive stock from photo counts.
 * price === 0 means the owner has not confirmed pricing yet.
 */
export function getAvailability(product: Product, variantId?: string): AvailabilityKind {
  if (product.status === 'archived' || product.status === 'draft') return 'unavailable';
  const price = getEffectivePrice(product, variantId);
  if (price <= 0) return 'coming_soon';
  if (product.status === 'sold_out') return 'sold_out';
  const stock = getEffectiveStock(product, variantId);
  if (stock <= 0) return 'sold_out';
  if (stock <= 2) return 'low_stock';
  return 'in_stock';
}

export function isPurchasable(product: Product, variantId?: string): boolean {
  if (product.status !== 'active') return false;
  const price = getEffectivePrice(product, variantId);
  if (price <= 0) return false;
  return getEffectiveStock(product, variantId) > 0;
}

export function availabilityLabel(kind: AvailabilityKind): string | null {
  switch (kind) {
    case 'coming_soon':
      return 'Coming Soon';
    case 'sold_out':
      return 'Sold Out';
    case 'low_stock':
      return 'Low Stock';
    default:
      return null;
  }
}

export interface AvailabilityInfo {
  kind: AvailabilityKind;
  label: string | null;
  purchasable: boolean;
  /** Plain-words reason, shown in the admin panel so owners see WHY. */
  reason: string;
}

/**
 * Availability plus a human reason. Used by the admin preview so a
 * "Sold Out" badge is never a mystery (variant stock vs product stock
 * vs status vs missing price).
 */
export function describeAvailability(product: Product, variantId?: string): AvailabilityInfo {
  const kind = getAvailability(product, variantId);
  const purchasable = isPurchasable(product, variantId);
  const label = availabilityLabel(kind);
  const variant = getVariant(product, variantId);
  const name = variant ? `"${variant.label}"` : `"${product.title}"`;

  if (product.status === 'archived' || product.status === 'draft') {
    return { kind, label, purchasable, reason: `${name} is hidden because the product status is "${product.status}".` };
  }
  if (getEffectivePrice(product, variantId) <= 0) {
    return { kind, label, purchasable, reason: `${name} shows "${label}" because no price is set yet.` };
  }
  if (product.status === 'sold_out') {
    return { kind, label, purchasable, reason: `${name} shows "Sold Out" because the product status is "sold_out" — change it to "active".` };
  }
  if (getEffectiveStock(product, variantId) <= 0) {
    if (variant) {
      return { kind, label, purchasable, reason: `${name} shows "Sold Out" because this option's stock is 0. Set stock on EACH colour option — the product-level stock field is ignored while options exist.` };
    }
    return { kind, label, purchasable, reason: `${name} shows "Sold Out" because stock is 0.` };
  }
  if (getEffectiveStock(product, variantId) <= 2) {
    return { kind, label, purchasable, reason: `${name} shows "Low Stock" (${getEffectiveStock(product, variantId)} left).` };
  }
  return { kind, label, purchasable, reason: `${name} is buyable.` };
}
