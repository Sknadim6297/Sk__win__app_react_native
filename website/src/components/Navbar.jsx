import { NavLink, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/results', label: 'Results' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <img src="/brand/logo.png?v=app" alt="WAREZONE logo" />
          WAREZONE
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-cta">
          <Link className="btn btn-primary btn-sm" to="/download">
            Download App
          </Link>
          <button
            className="menu-btn"
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>
      <div className={`container mobile-menu ${open ? 'open' : ''}`}>
        {LINKS.map((l) => (
          <NavLink key={l.to + loc.pathname} to={l.to} end={l.to === '/'} onClick={() => setOpen(false)}>
            {l.label}
          </NavLink>
        ))}
        <NavLink to="/news" onClick={() => setOpen(false)}>
          News
        </NavLink>
        <NavLink to="/tutorials" onClick={() => setOpen(false)}>
          Tutorials
        </NavLink>
        <NavLink to="/faq" onClick={() => setOpen(false)}>
          FAQ
        </NavLink>
        <NavLink to="/contact" onClick={() => setOpen(false)}>
          Contact
        </NavLink>
      </div>
    </header>
  );
}
