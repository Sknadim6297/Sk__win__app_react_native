import { useOutletContext } from 'react-router-dom';
import Seo from '../components/Seo';
import { SUPPORT } from '../content';

export default function ContactPage() {
  const { socials = {} } = useOutletContext() || {};
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
            <h3>Phone / WhatsApp</h3>
            <p className="muted">{SUPPORT.phoneDisplay}</p>
          </article>
          {(socials.whatsapp || socials.telegram || socials.instagram) && (
            <article className="card" style={{ padding: 24 }}>
              <h3>Social</h3>
              <p className="muted">Links from WAREZONE Home Config — not invented.</p>
              <div className="socials" style={{ marginTop: 12 }}>
                {socials.whatsapp && (
                  <a href={socials.whatsapp} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
                {socials.telegram && (
                  <a href={socials.telegram} target="_blank" rel="noreferrer">
                    Telegram
                  </a>
                )}
                {socials.instagram && (
                  <a href={socials.instagram} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                )}
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}
