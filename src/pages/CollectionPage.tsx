import { useParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/product/ProductCard';
import NotFoundPage from './NotFoundPage';

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products: allProducts } = useProducts();

  const collectionMap: Record<string, { title: string; filter: (category: string, featured: boolean) => boolean }> = {
    featured: {
      title: 'Featured Finds',
      filter: (_cat, featured) => featured,
    },
    footwear: {
      title: 'Footwear',
      filter: (cat) => cat === 'Footwear',
    },
    outerwear: {
      title: 'Jackets & Outerwear',
      filter: (cat) => cat === 'Outerwear',
    },
    accessories: {
      title: 'Accessories',
      filter: (cat) => cat === 'Accessories',
    },
    bags: {
      title: 'Bags',
      filter: (cat) => cat === 'Bags',
    },
    watches: {
      title: 'Watches & Jewellery',
      filter: (cat) => cat === 'Watches' || cat === 'Jewellery',
    },
    clothing: {
      title: 'Clothing',
      filter: (cat) => cat === 'Clothing',
    },
  };

  const collection = collectionMap[slug || ''];

  if (!collection) {
    return <NotFoundPage />;
  }

  const products = (Array.isArray(allProducts) ? allProducts : []).filter(
    p => (p.status === 'active' || p.status === 'draft') && collection.filter(p.category, p.featured)
  );

  return (
    <div className="container section">
      <h1 className="anim-rise anim-tilt-in-right" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>{collection.title}</h1>
      <p key={products.length} className="anim-fade" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
        {products.length} {products.length === 1 ? 'product' : 'products'}
      </p>

      {products.length === 0 ? (
        <div className="empty-state anim-pop anim-zoom-fade">
          <h2>No products in this collection yet</h2>
          <p>Check back soon for new additions.</p>
        </div>
      ) : (
        <div className="grid grid--products stagger">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
