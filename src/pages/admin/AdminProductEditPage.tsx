import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import {
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminMedia,
  adminUpload,
  type MediaFile,
} from '../../lib/admin-api';
import type { Condition, Product, ProductImage, ProductStatus, ProductVariant } from '../../types';
import { describeAvailability } from '../../types';

const CONDITIONS: Condition[] = ['new', 'excellent', 'very_good', 'good', 'fair'];
const STATUSES: { value: ProductStatus; hint: string }[] = [
  { value: 'draft', hint: 'Only visible here in admin.' },
  { value: 'active', hint: 'Visible in the shop.' },
  { value: 'sold_out', hint: 'Visible but not buyable.' },
  { value: 'archived', hint: 'Hidden everywhere.' },
];
const CATEGORY_SUGGESTIONS = ['Footwear', 'Outerwear', 'Accessories', 'Watches', 'Jewellery', 'Bags', 'Clothing'];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function poundsToPence(input: string): number | null {
  if (input.trim() === '') return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function blankProduct(): Product {
  const now = new Date().toISOString();
  return {
    id: '',
    slug: '',
    title: '',
    category: 'Outerwear',
    description: '',
    price: 0,
    currency: 'GBP',
    condition: 'good',
    conditionNotes: '',
    images: [],
    variants: [],
    sizes: [],
    stockQuantity: 0,
    status: 'draft',
    featured: false,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

function MediaPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const refresh = () =>
    adminMedia()
      .then((r) => setFiles(r.files))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not list images.'));

  useEffect(() => {
    refresh();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const r = await adminUpload(file);
      onPick(r.url);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose product image"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div className="anim-pop anim-blur-in-soft" style={{ background: '#111827', border: '1px solid #1e3a8a', borderRadius: 12, maxWidth: 720, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 16 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>Choose image</h2>
          <label style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#e5e7eb' }}>
            Upload new:{' '}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <button ref={closeRef} onClick={onClose} className="btn" style={{ border: '1px solid #1e3a8a', color: '#fff', borderRadius: 6, padding: '8px 14px', minHeight: 44 }}>
            Close
          </button>
        </div>
        {error && (
          <p role="alert" style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: 8 }}>
            {error}
          </p>
        )}
        {uploading && <p style={{ color: '#e5e7eb' }}>Uploading…</p>}
        {!files ? (
          <p style={{ color: '#e5e7eb' }}>Loading images…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            {files.map((f) => (
              <button key={f.name} onClick={() => onPick(f.url)} title={f.name} style={{ border: '1px solid #1e3a8a', borderRadius: 8, padding: 0, overflow: 'hidden', background: '#0f172a', minHeight: 96 }}>
                <img src={f.url} alt="" loading="lazy" style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/products/new');
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [priceText, setPriceText] = useState('0');
  const [tagsText, setTagsText] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pickerFor, setPickerFor] = useState<'product' | number | null>(null);

  useEffect(() => {
    let alive = true;
    if (isNew) {
      setProduct(blankProduct());
      return;
    }
    adminListProducts()
      .then((r) => {
        if (!alive) return;
        const found = r.products.find((p) => p.id === id);
        if (!found) {
          setError('Product not found.');
          return;
        }
        setProduct(found);
        setPriceText((found.price / 100).toFixed(2));
        setTagsText(found.tags.join(', '));
        setSizesText((found.sizes || []).join(', '));
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load product.');
      });
    return () => {
      alive = false;
    };
  }, [id, isNew]);

  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  const set = (patch: Partial<Product>) => {
    setProduct((p) => (p ? { ...p, ...patch } : p));
    setDirty(true);
  };

  const updateImage = (index: number, patch: Partial<ProductImage>) => {
    setProduct((p) => {
      if (!p) return p;
      const images = p.images.map((image, i) => (i === index ? { ...image, ...patch } : image));
      return { ...p, images };
    });
    setDirty(true);
  };

  const removeImage = (index: number) => {
    setProduct((p) => (p ? { ...p, images: p.images.filter((_, i) => i !== index) } : p));
    setDirty(true);
  };

  const addImage = (url: string) => {
    setProduct((p) => (p ? { ...p, images: [...p.images, { url, alt: p.title || 'Product photo' }] } : p));
    setDirty(true);
    setPickerFor(null);
  };

  const updateVariant = (index: number, patch: Partial<ProductVariant>) => {
    setProduct((p) => {
      if (!p) return p;
      const variants = (p.variants || []).map((v, i) => (i === index ? { ...v, ...patch } : v));
      return { ...p, variants };
    });
    setDirty(true);
  };

  const addVariant = () => {
    setProduct((p) => {
      if (!p) return p;
      const n = (p.variants || []).length + 1;
      const variant: ProductVariant = {
        id: `${slugify(p.title) || 'option'}-${n}-${Math.random().toString(36).slice(2, 6)}`,
        label: `Option ${n}`,
        stockQuantity: 0,
        images: p.images.map((image) => ({ ...image })),
      };
      return { ...p, variants: [...(p.variants || []), variant] };
    });
    setDirty(true);
  };

  const removeVariant = (index: number) => {
    setProduct((p) => (p ? { ...p, variants: (p.variants || []).filter((_, i) => i !== index) } : p));
    setDirty(true);
  };

  const toggleVariantImage = (variantIndex: number, url: string) => {
    setProduct((p) => {
      if (!p) return p;
      const variants = (p.variants || []).map((v, i) => {
        if (i !== variantIndex) return v;
        const current = v.images || [];
        const has = current.some((image) => image.url === url);
        const next = has ? current.filter((image) => image.url !== url) : [...current, { url, alt: v.label }];
        return { ...v, images: next };
      });
      return { ...p, variants };
    });
    setDirty(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || saving) return;
    setError('');
    const pence = poundsToPence(priceText);
    if (pence === null) {
      setError('Price must be a number in pounds, 0 or more (e.g. 49.99).');
      return;
    }
    if (product.images.length === 0) {
      setError('Add at least one product photo before saving.');
      return;
    }
    const payload: Product = {
      ...product,
      price: pence,
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      sizes: sizesText.split(',').map((s) => s.trim()).filter(Boolean),
      slug: product.slug.trim() || slugify(product.title),
      variants: (product.variants || []).map((v) => ({
        ...v,
        price: v.price === null ? undefined : v.price,
      })),
    };
    setSaving(true);
    try {
      if (isNew) {
        const r = await adminCreateProduct(payload);
        setDirty(false);
        navigate(`/admin/products/${r.product.id}`);
      } else {
        await adminUpdateProduct(product.id, payload);
        setDirty(false);
        setProduct(payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed. Your entries are kept — fix the problem and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !product) return <p role="alert">{error}</p>;
  if (!product) return <p style={{ color: '#e5e7eb' }}>Loading…</p>;

  return (
    <>
      <p style={{ marginBottom: 8 }}>
        <Link to="/admin/products" style={{ color: '#93c5fd' }}>← Products</Link>
      </p>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: '#f8fafc' }}>{isNew ? 'New product' : `Edit: ${product.title}`}</h1>
      {error && (
        <p role="alert" className="anim-shake" style={{ color: '#fca5a5', marginBottom: 12 }}>
          {error}
        </p>
      )}
      {!isNew && (
        <section className="admin-card" aria-label="Shop preview" style={{ marginBottom: 14 }}>
          <h2 className="admin-card-title">What customers see right now</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(product.variants && product.variants.length > 0
              ? product.variants.map((v) => ({ key: v.id, label: v.label, info: describeAvailability(product, v.id) }))
              : [{ key: 'base', label: 'One size', info: describeAvailability(product, undefined) }]
            ).map((row) => (
              <li key={row.key} style={{ fontSize: '0.87rem', color: '#e5e7eb', border: '1px solid #1e3a8a', borderRadius: 8, padding: '8px 10px', background: '#0f172a' }}>
                <strong>{row.label}:</strong>{' '}
                <span style={{ color: row.info.purchasable ? '#4ade80' : '#fbbf24', fontWeight: 700 }}>
                  {row.info.purchasable ? 'Buyable' : row.info.label || 'Hidden'}
                </span>
                <br />
                <span style={{ color: '#94a3b8' }}>{row.info.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
        <section className="admin-card anim-rise" aria-label="Product details" style={{ animationDelay: '0ms' }}>
          <h2 className="admin-card-title">Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label htmlFor="f-title" className="label">Title *</label>
              <input id="f-title" className="input input--dark tr-101" value={product.title} onChange={(e) => {
                const title = e.target.value;
                setProduct((p) => (p ? { ...p, title, slug: p.slug || slugify(title) } : p));
                setDirty(true);
              }} required />
            </div>
            <div className="form-grid-2">
              <div>
                <label htmlFor="f-slug" className="label">Slug * (page address)</label>
                <input id="f-slug" className="input input--dark tr-101" value={product.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} required />
              </div>
              <div>
                <label htmlFor="f-category" className="label">Category *</label>
                <input id="f-category" className="input input--dark tr-101" list="category-suggestions" value={product.category} onChange={(e) => set({ category: e.target.value })} required />
                <datalist id="category-suggestions">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label htmlFor="f-desc" className="label">Description * (plain words, no brand names)</label>
              <textarea id="f-desc" className="input input--dark tr-101" rows={4} value={product.description} onChange={(e) => set({ description: e.target.value })} required />
            </div>
            <div className="form-grid-2">
              <div>
                <label htmlFor="f-tags" className="label">Tags (comma separated)</label>
                <input id="f-tags" className="input input--dark tr-101" value={tagsText} onChange={(e) => { setTagsText(e.target.value); setDirty(true); }} placeholder="chunky, black, footwear" />
              </div>
              <div>
                <label htmlFor="f-sizes" className="label">Sizes (comma separated, blank = one-size)</label>
                <input id="f-sizes" className="input input--dark tr-101" value={sizesText} onChange={(e) => { setSizesText(e.target.value); setDirty(true); }} placeholder="S, M, L" />
              </div>
            </div>
          </div>
        </section>

        <section className="admin-card anim-rise" aria-label="Price, stock and status" style={{ animationDelay: '70ms' }}>
          <h2 className="admin-card-title">Price, stock & status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-grid-3">
              <div>
                <label htmlFor="f-price" className="label">Price (£) * — 0 = to be confirmed</label>
                <input id="f-price" className="input input--dark tr-101" inputMode="decimal" value={priceText} onChange={(e) => { setPriceText(e.target.value); setDirty(true); }} required />
              </div>
              <div>
                <label htmlFor="f-stock" className="label">Stock * (−1 = unlimited)</label>
                <input id="f-stock" className="input input--dark tr-101" type="number" min={-1} step={1} value={product.stockQuantity} onChange={(e) => {
                  const n = Math.floor(Number(e.target.value) || 0);
                  set({ stockQuantity: n === -1 ? -1 : Math.max(0, n) });
                }} required />
                {(product.variants || []).length > 0 && (
                  <p style={{ fontSize: '0.78rem', color: '#93c5fd', marginTop: 4 }}>
                    Ignored while colour options exist — set stock on each option below instead.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="f-status" className="label">Status *</label>
                <select id="f-status" className="input input--dark tr-101" value={product.status} onChange={(e) => set({ status: e.target.value as ProductStatus })}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.value} — {s.hint}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-grid-2">
              <div>
                <label htmlFor="f-condition" className="label">Condition *</label>
                <select id="f-condition" className="input input--dark tr-101" value={product.condition} onChange={(e) => set({ condition: e.target.value as Condition })}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-notes" className="label">Condition notes (flaws — shown to customers)</label>
                <textarea id="f-notes" className="input input--dark tr-101" rows={2} value={product.conditionNotes || ''} onChange={(e) => set({ conditionNotes: e.target.value })} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e5e7eb', minHeight: 44 }}>
              <input type="checkbox" checked={product.featured} onChange={(e) => set({ featured: e.target.checked })} style={{ width: 20, height: 20, accentColor: '#2563eb' }} /> Featured on homepage
            </label>
          </div>
        </section>

        <section className="admin-card anim-rise" aria-label="Product photos" style={{ animationDelay: '140ms' }}>
          <h2 className="admin-card-title">Photos ({product.images.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {product.images.map((image, i) => (
              <div key={`${image.url}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid #1e3a8a', borderRadius: 8, padding: 8, background: '#0f172a' }}>
                <img src={image.url} alt="" style={{ width: 52, height: 64, objectFit: 'cover', borderRadius: 4, flexShrink: 0, display: 'block' }} />
                <input aria-label={`Alt text for photo ${i + 1}`} className="input input--dark tr-101" value={image.alt} onChange={(e) => updateImage(i, { alt: e.target.value })} placeholder="Describe this photo" style={{ flex: 1, minWidth: 0 }} />
                <button type="button" onClick={() => removeImage(i)} style={{ textDecoration: 'underline', color: '#fca5a5', flexShrink: 0, minHeight: 44, padding: '0 4px' }}>Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setPickerFor('product')} className="btn" style={{ marginTop: 10, border: '1px solid #1e3a8a', color: '#fff', borderRadius: 6, padding: '10px 18px', minHeight: 44 }}>
            + Add photo
          </button>
        </section>

        <section className="admin-card anim-rise" aria-label="Colour options" style={{ animationDelay: '210ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <h2 className="admin-card-title" style={{ margin: 0 }}>Colour options ({(product.variants || []).length})</h2>
            <button type="button" onClick={addVariant} className="btn" style={{ marginLeft: 'auto', border: '1px solid #1e3a8a', color: '#fff', borderRadius: 6, padding: '10px 18px', minHeight: 44 }}>
              + Add option
            </button>
          </div>
          {(product.variants || []).map((v, i) => (
            <fieldset key={v.id} className="tr-49" style={{ border: '1px solid #1e3a8a', borderRadius: 10, padding: 12, marginBottom: 10, background: '#0f172a', minWidth: 0 }}>
              <legend style={{ fontWeight: 700, padding: '0 6px', color: '#f8fafc' }}>{v.label || `Option ${i + 1}`}</legend>
              <div className="form-grid-3" style={{ marginBottom: 10 }}>
                <div>
                  <label className="label" htmlFor={`v-label-${i}`}>Label *</label>
                  <input id={`v-label-${i}`} className="input input--dark tr-101" value={v.label} onChange={(e) => updateVariant(i, { label: e.target.value })} required />
                </div>
                <div>
                  <label className="label" htmlFor={`v-stock-${i}`}>Stock * (−1 = unlimited)</label>
                  <input id={`v-stock-${i}`} className="input input--dark tr-101" type="number" min={-1} step={1} value={v.stockQuantity} onChange={(e) => {
                    const n = Math.floor(Number(e.target.value) || 0);
                    updateVariant(i, { stockQuantity: n === -1 ? -1 : Math.max(0, n) });
                  }} required />
                </div>
                <div>
                  <label className="label" htmlFor={`v-price-${i}`}>Price £ (blank = product price)</label>
                  <input id={`v-price-${i}`} className="input input--dark tr-101" inputMode="decimal" value={v.price === undefined || v.price === null ? '' : (v.price / 100).toFixed(2)} onChange={(e) => {
                    const raw = e.target.value;
                    updateVariant(i, { price: raw.trim() === '' ? undefined : poundsToPence(raw) ?? undefined });
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <label className="label" htmlFor={`v-hex-${i}`} style={{ margin: 0 }}>Swatch</label>
                <input id={`v-hex-${i}`} type="color" value={v.colorHex || '#888888'} onChange={(e) => updateVariant(i, { colorHex: e.target.value })} style={{ width: 44, height: 44, padding: 2, background: 'transparent', border: '1px solid #1e3a8a', borderRadius: 6 }} />
                <button type="button" onClick={() => removeVariant(i)} style={{ marginLeft: 'auto', textDecoration: 'underline', color: '#fca5a5', minHeight: 44, padding: '0 8px' }}>
                  Remove option
                </button>
              </div>
              <p className="label">Photos for this option (tick the ones that show it):</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {product.images.map((image) => {
                  const checked = (v.images || []).some((x) => x.url === image.url);
                  return (
                    <label key={image.url} style={{ display: 'flex', alignItems: 'center', gap: 4, border: checked ? '2px solid #2563eb' : '1px solid #1e3a8a', borderRadius: 8, padding: 3, cursor: 'pointer', minHeight: 48 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleVariantImage(i, image.url)} aria-label={`Use photo in ${v.label}`} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                      <img src={image.url} alt="" style={{ width: 44, height: 54, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                    </label>
                  );
                })}
                {product.images.length === 0 && <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Add product photos first.</span>}
              </div>
            </fieldset>
          ))}
        </section>

        <div className="admin-savebar">
          <span style={{ fontSize: '0.85rem', color: dirty ? '#fbbf24' : '#94a3b8' }}>
            {dirty ? '● Unsaved changes' : 'All saved'}
          </span>
          <button type="submit" className="btn tr-52" disabled={saving} style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', borderRadius: 6, padding: '12px 28px', minHeight: 48, fontWeight: 700 }}>
            {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </button>
          <Link to="/admin/products" style={{ color: '#93c5fd', fontSize: '0.9rem' }}>
            Cancel
          </Link>
        </div>
      </form>
      {pickerFor !== null && <MediaPicker onPick={addImage} onClose={() => setPickerFor(null)} />}
    </>
  );
}
