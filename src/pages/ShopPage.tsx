import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/product/ProductCard';
import type { Condition, SortOption } from '../types';

const CONDITIONS: Condition[] = ['new', 'excellent', 'very_good', 'good', 'fair'];
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export default function ShopPage() {
  const { products } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = searchParams.get('q') || '';
  const sort = (searchParams.get('sort') as SortOption) || 'featured';
  const selectedCategories = searchParams.get('category')?.split(',').filter(Boolean) || [];
  const selectedConditions = (searchParams.get('condition')?.split(',').filter(Boolean) || []) as Condition[];
  const inStockOnly = searchParams.get('in_stock') === 'true';

  const categories = useMemo(() => {
    const cats = new Set(products.filter(p => p.status === 'active' || p.status === 'draft').map(p => p.category));
    return Array.from(cats).sort();
  }, []);

  const filtered = useMemo(() => {
    const all = Array.isArray(products) ? products : [];
    let results = all.filter(p => p.status === 'active' || p.status === 'draft');

    if (query) {
      const q = query.toLowerCase().trim();
      results = results.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      results = results.filter(p => selectedCategories.includes(p.category));
    }

    if (selectedConditions.length > 0) {
      results = results.filter(p => selectedConditions.includes(p.condition));
    }

    if (inStockOnly) {
      results = results.filter(p => p.stockQuantity > 0);
    }

    switch (sort) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'featured':
        results.sort((a, b) => Number(b.featured) - Number(a.featured));
        break;
    }

    return results;
  }, [query, selectedCategories, selectedConditions, inStockOnly, sort]);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next);
  };

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    updateParams({ category: next.length > 0 ? next.join(',') : null });
  };

  const toggleCondition = (cond: Condition) => {
    const next = selectedConditions.includes(cond)
      ? selectedConditions.filter(c => c !== cond)
      : [...selectedConditions, cond];
    updateParams({ condition: next.length > 0 ? next.join(',') : null });
  };

  const clearFilters = () => {
    setSearchParams(query ? { q: query } : {});
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedConditions.length > 0 || inStockOnly;

  const filtersContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {query && (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>Search</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input
              type="search"
              value={query}
              onChange={(e) => updateParams({ q: e.target.value || null })}
              placeholder="Search products..."
              className="input"
              aria-label="Search products"
            />
            {query && (
              <button onClick={() => updateParams({ q: null })} aria-label="Clear search">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>Category</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {categories.map(cat => (
            <label key={cat} className="tr-97" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: '0.9375rem' }}>
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
                style={{ width: 16, height: 16 }}
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>Condition</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {CONDITIONS.map(cond => (
            <label key={cond} className="tr-97" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: '0.9375rem' }}>
              <input
                type="checkbox"
                checked={selectedConditions.includes(cond)}
                onChange={() => toggleCondition(cond)}
                style={{ width: 16, height: 16 }}
              />
              {cond.replace('_', ' ')}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-2)' }}>Availability</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: '0.9375rem' }}>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParams({ in_stock: e.target.checked ? 'true' : null })}
            style={{ width: 16, height: 16 }}
          />
          In stock only
        </label>
      </div>

      {hasActiveFilters && (
        <button onClick={clearFilters} className="btn btn--secondary btn--small">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="container section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-6)' }}>
        <h1 className="anim-slide-down-sm" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Shop All</h1>
        <p key={filtered.length} className="anim-fade" style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="btn btn--secondary btn--small tr-119"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasActiveFilters && (
            <span style={{
              background: 'var(--color-ink)',
              borderRadius: 8,
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--color-paper)'
            }}>
              {selectedCategories.length + selectedConditions.length + (inStockOnly ? 1 : 0)}
            </span>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label htmlFor="sort" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Sort by</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="input t-color tr-46"
            style={{ width: 'auto', minHeight: 32, paddingBlock: 'var(--space-1)', fontSize: '0.875rem' }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state anim-pop anim-zoom-fade">
          <h2>No products found</h2>
          <p>Try adjusting your search or filters.</p>
          <button onClick={clearFilters} className="btn btn--primary">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid--products stagger">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}

      {filtersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product filters"
          style={{ position: 'fixed', inset: 0, zIndex: 200 }}
        >
          <div
            onClick={() => setFiltersOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
          />
          <div className="anim-slide-left" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '100%',
            maxWidth: 320,
            background: 'var(--color-paper)',
            padding: 'var(--space-6)',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-overlay)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X size={18} />
              </button>
            </div>
            {filtersContent}
          </div>
        </div>
      )}
    </div>
  );
}
