import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../cart/CartDrawer';

export default function Layout() {
  const pathname = useLocation().pathname;
  return (
    <>
      <Header />
      <main id="main-content" role="main">
        <div key={pathname} className="anim-fade">
          <Outlet />
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
