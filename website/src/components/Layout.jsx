import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { api } from '../api';

export default function Layout() {
  const [socials, setSocials] = useState({});
  const loc = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  useEffect(() => {
    api
      .homeConfig()
      .then((c) => setSocials(c.supportLinks || {}))
      .catch(() => {});
  }, []);

  return (
    <div className="page-shell">
      <div className="bg-glow" />
      <Navbar />
      <main>
        <Outlet context={{ socials }} />
      </main>
      <Footer socials={socials} />
    </div>
  );
}
