import { useOutletContext } from 'react-router-dom';
import Seo from '../components/Seo';
import { SUPPORT } from '../content';

export default function ContactPage() {
  const { socials = {} } = useOutletContext() || {};
  const links = {
    whatsapp: socials.whatsapp || SUPPORT.whatsapp,
    telegram: socials.telegram || SUPPORT.telegram,
    instagram: socials.instagram || SUPPORT.instagram,
  };

  return (
    <>
      <Seo title="Contact" />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Support</p>
          <h1>Contact</h1>
          <p className="muted">{SUPPORT.teamLabel}</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid-2">
          <article className="card" style={{ padding: 24 }}>
            <h3>Email</h3>
            <p className="muted">{SUPPORT.email}</p>
            <a className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} href={`mailto:${SUPPORT.email}`}>
              Send email
            </a>
          </article>
          <article className="card" style={{ padding: 24 }}>
            <h3>Phone</h3>
            <p className="muted">{SUPPORT.phoneDisplay}</p>
          </article>
          <article className="card" style={{ padding: 24 }}>
            <h3>Social & Channels</h3>
            <p className="muted">Official WAREZONE support links.</p>
            <div className="socials" style={{ marginTop: 12 }}>
              <a href={links.whatsapp} target="_blank" rel="noreferrer">
                WhatsApp Channel
              </a>
              <a href={links.telegram} target="_blank" rel="noreferrer">
                Telegram
              </a>
              <a href={links.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
