import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelledPage from './pages/CheckoutCancelledPage';
import ShippingPage from './pages/ShippingPage';
import ReturnsPage from './pages/ReturnsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';
import CollectionPage from './pages/CollectionPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminRequireAuth from './pages/admin/AdminRequireAuth';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminProductEditPage from './pages/admin/AdminProductEditPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminPayoutPage from './pages/admin/AdminPayoutPage';
import AdminDiscountsPage from './pages/admin/AdminDiscountsPage';
import AdminWatchlistPage from './pages/admin/AdminWatchlistPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route
        path="admin"
        element={
          <AdminRequireAuth>
            <AdminLayout />
          </AdminRequireAuth>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductEditPage />} />
        <Route path="products/:id" element={<AdminProductEditPage />} />
        <Route path="discounts" element={<AdminDiscountsPage />} />
        <Route path="watchlist" element={<AdminWatchlistPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="payouts" element={<AdminPayoutPage />} />
      </Route>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="collections/:slug" element={<CollectionPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="checkout/cancelled" element={<CheckoutCancelledPage />} />
        <Route path="shipping" element={<ShippingPage />} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      </Routes>
    </ErrorBoundary>
  );
}
