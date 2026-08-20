import { NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { brandLogoUrl } from '../utils';
import { POLICY_LINKS } from '../content';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'Refer & Earn' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const loc = useLocation();
  const dropRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setPoliciesOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!policiesOpen) return undefined;
    const onDoc = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setPoliciesOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [policiesOpen]);

  const policyActive = POLICY_LINKS.some((p) => loc.pathname === p.to);

  return (
    <header className="nav lz-nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <img src={brandLogoUrl()} alt="WAREZONE" />
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
          <div className={`nav-drop ${policiesOpen ? 'open' : ''}`} ref={dropRef}>
            <button
              type="button"
              className={`nav-drop-btn ${policyActive ? 'active' : ''}`}
              aria-expanded={policiesOpen}
              aria-haspopup="true"
              onClick={() => setPoliciesOpen((v) => !v)}
            >
              Policies
              <span className="nav-drop-caret" aria-hidden>
                ▾
              </span>
            </button>
            {policiesOpen ? (
              <div className="nav-drop-menu" role="menu">
                {POLICY_LINKS.map((p) => (
                  <Link
                    key={p.label}
                    role="menuitem"
                    to={p.hash ? `${p.to}#${p.hash}` : p.to}
                    onClick={() => setPoliciesOpen(false)}
                  >
                    {p.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
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
        <details className="mobile-policies">
          <summary>Policies</summary>
          {POLICY_LINKS.map((p) => (
            <Link
              key={p.label}
              to={p.hash ? `${p.to}#${p.hash}` : p.to}
              onClick={() => setOpen(false)}
            >
              {p.label}
            </Link>
          ))}
        </details>
        <NavLink to="/tournaments" onClick={() => setOpen(false)}>
          Tournaments
        </NavLink>
        <NavLink to="/leaderboard" onClick={() => setOpen(false)}>
          Leaderboard
        </NavLink>
        <NavLink to="/download" onClick={() => setOpen(false)}>
          Download
        </NavLink>
      </div>
    </header>
  );
}
