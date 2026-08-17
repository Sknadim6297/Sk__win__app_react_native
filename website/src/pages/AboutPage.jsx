import Seo from '../components/Seo';
import { ABOUT, BRAND } from '../content';

export default function AboutPage() {
  return (
    <>
      <Seo title="About" />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Studio</p>
          <h1>About {BRAND.name}</h1>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="card" style={{ padding: 28, maxWidth: 760 }}>
            <h2>{BRAND.fullName}</h2>
            <p className="muted" style={{ margin: '10px 0 18px' }}>
              {BRAND.tagline}
            </p>
            {ABOUT.paragraphs.map((p) => (
              <p key={p} className="muted" style={{ marginBottom: 14 }}>
                {p}
              </p>
            ))}
            <p className="dim">This page uses the same About copy as the mobile app.</p>
          </div>
        </div>
      </section>
    </>
  );
}
