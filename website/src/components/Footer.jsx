import { Link } from 'react-router-dom';
import { BRAND } from '../content';
import { brandLogoUrl } from '../utils';

export default function Footer({ socials = {} }) {
  const items = [
    { key: 'whatsapp', label: 'WhatsApp', href: socials.whatsapp },
    { key: 'telegram', label: 'Telegram', href: socials.telegram },
    { key: 'instagram', label: 'Instagram', href: socials.instagram },
  ].filter((s) => s.href);

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link to="/" className="brand" style={{ marginBottom: 12 }}>
            <img src={brandLogoUrl()} alt="" width="42" height="42" />
            {BRAND.name}
          </Link>
          <p>{BRAND.motto}</p>
          <p>Free Fire esports tournaments on Android.</p>
          {items.length > 0 && (
            <div className="socials" style={{ marginTop: 14 }}>
              {items.map((s) => (
                <a key={s.key} href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4>Quick links</h4>
          <Link to="/tournaments">Tournaments</Link>
          <Link to="/results">Results</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/how-it-works">How it works</Link>
        </div>
        <div>
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/news">News</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/download">Download App</Link>
        </div>
        <div>
          <h4>Legal</h4>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
      <div className="container copy">© {new Date().getFullYear()} {BRAND.fullName}. Play fair. Compete in the app.</div>
    </footer>
  );
}
