import { useState } from 'react';
import Seo from '../components/Seo';
import { FAQ } from '../content';

export default function FaqPage() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <Seo title="FAQ" />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Help</p>
          <h1>FAQ</h1>
          <p className="muted">Answers from the WAREZONE app tutorial/FAQ screen, updated for the website join flow.</p>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="accordion">
            {FAQ.map((f, i) => (
              <div key={f.q}>
                <button type="button" onClick={() => setOpen(open === i ? -1 : i)}>
                  {f.q}
                </button>
                {open === i && <div className="ans">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
