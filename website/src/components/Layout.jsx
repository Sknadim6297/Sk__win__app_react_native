import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import LatestReleaseBanner from './LatestReleaseBanner';
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
      <LatestReleaseBanner />
      <Navbar />
      <main>
        <Outlet context={{ socials }} />
      </main>
      <Footer socials={socials} />
      {socials.whatsapp ? (
        <a
          className="lz-wa-fab"
          href={socials.whatsapp}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.8 12.1l-.3.4.8 2.9-3-.8-.4.2A8 8 0 1 1 12 4zm4.4 9.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.7-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.4 3.8 3.3 2.2.9 2.2.6 2.6.6.4 0 1.3-.5 1.4-1 .2-.5.2-.9.1-1z" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
