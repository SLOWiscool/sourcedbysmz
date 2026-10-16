import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../cart/CartDrawer';

export default function Layout() {
  return (
    <>
      <Header />
      <main id="main-content" role="main">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
