import { Link } from 'react-router-dom';
import { useState } from 'react';
import { BRAND, POLICY_LINKS, SUPPORT } from '../content';
import { brandLogoUrl, apkHref } from '../utils';
import { APP_RELEASE, PWA_URL } from '../release';

function SocialIcon({ type }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true,
  };
  if (type === 'instagram') {
    return (
      <svg {...common}>
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
      </svg>
    );
  }
  if (type === 'telegram') {
    return (
      <svg {...common}>
        <path d="M9.04 15.3 8.9 18.5c.3 0 .4-.1.6-.3l1.4-1.4 2.9 2.1c.5.3.9.1 1-.5l1.9-8.9c.2-.7-.3-1-1-.7L5.2 12.2c-.7.3-.7.7-.1.9l2.9.9 6.7-4.2c.3-.2.6 0 .3.2l-5.9 5.3z" />
      </svg>
    );
  }
  if (type === 'whatsapp') {
    return (
      <svg {...common}>
        <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.8 12.1l-.3.4.8 2.9-3-.8-.4.2A8 8 0 1 1 12 4zm4.4 9.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.7-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.4 3.8 3.3 2.2.9 2.2.6 2.6.6.4 0 1.3-.5 1.4-1 .2-.5.2-.9.1-1z" />
      </svg>
    );
  }
  return null;
}

function AndroidIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18a.5.5 0 0 0-.87-.5l-1.86 3.22A7.9 7.9 0 0 0 12 8c-1.66 0-3.2.5-4.71 1.52L5.43 5.8a.5.5 0 1 0-.87.5L6.4 9.48C4.34 11.03 3 13.37 3 16v.5h18V16c0-2.63-1.34-4.97-3.4-6.52zM8.5 14.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.5zM14.6 6.5c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.6 1 .1 1.9-.5 2.6-1.2z" />
    </svg>
  );
}

export default function Footer({ socials = {} }) {
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const items = [
    { key: 'instagram', label: 'Instagram', href: socials.instagram || SUPPORT.instagram },
    { key: 'telegram', label: 'Telegram', href: socials.telegram || SUPPORT.telegram },
    { key: 'whatsapp', label: 'WhatsApp', href: socials.whatsapp || SUPPORT.whatsapp },
  ].filter((s) => s.href);

  const apk = apkHref();
  const pwa = `${PWA_URL}/login`;

  return (
    <footer className="site-footer lz-footer">
      <div className="container lz-footer-grid">
        <div className="lz-footer-brand">
          <Link to="/" className="brand lz-footer-logo">
            <img src={brandLogoUrl()} alt="WAREZONE" height="56" />
          </Link>
          <p className="lz-footer-about">
            {BRAND.name} is India&apos;s Free Fire esports platform — Clash Squad, Battle Royale,
            real prizes, and fair results in one app.
          </p>
          {items.length > 0 && (
            <div className="lz-socials">
              {items.map((s) => (
                <a key={s.key} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
                  <SocialIcon type={s.key} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="lz-footer-col">
          <h4>Navigate</h4>
          <Link to="/">Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/how-it-works">Refer & Earn</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="lz-footer-col">
          <h4>Policies</h4>
          <div className={`lz-policy-drop ${policiesOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="lz-policy-btn"
              aria-expanded={policiesOpen}
              onClick={() => setPoliciesOpen((v) => !v)}
            >
              View policies
              <span aria-hidden>{policiesOpen ? '▴' : '▾'}</span>
            </button>
            {policiesOpen ? (
              <div className="lz-policy-menu">
                {POLICY_LINKS.map((p) => (
                  <Link
                    key={p.label}
                    to={p.hash ? `${p.to}#${p.hash}` : p.to}
                    onClick={() => setPoliciesOpen(false)}
                  >
                    {p.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="lz-footer-col lz-footer-download">
          <h4>Download App</h4>
          <p className="lz-footer-dl-copy">
            Android APK or iPhone web app — open the web app first, then Add to Home Screen.
          </p>
          <div className="lz-footer-dl-actions">
            <a className="btn btn-primary btn-sm" href={apk}>
              <AndroidIcon /> Android APK
            </a>
            <a className="btn btn-ghost btn-sm" href={pwa}>
              <AppleIcon /> iPhone Web App
            </a>
          </div>
          <p className="lz-footer-ver">
            APK v{APP_RELEASE.version} · iPhone: open web app → Share → Add to Home Screen
          </p>
        </div>
      </div>

      <div className="container lz-footer-bottom">
        <p>
          © {new Date().getFullYear()} <strong>{BRAND.name}</strong>. All Rights Reserved.
        </p>
        <p>Made in India 🇮🇳 for Gamers</p>
      </div>
    </footer>
  );
}
