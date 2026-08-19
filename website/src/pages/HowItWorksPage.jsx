import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { HOW_IT_WORKS, FAQ } from '../content';
import { useState } from 'react';

export default function HowItWorksPage() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <Seo title="How it works" />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Guide</p>
          <h1>How it works</h1>
          <p className="muted">Discover matches here. Join, pay, and play in the Android app or iPhone web app.</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid-3">
          {HOW_IT_WORKS.map((s) => (
            <article className="card step-card" key={s.n}>
              <div className="step-num">STEP {s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 style={{ marginBottom: 16 }}>FAQ</h2>
          <div className="accordion">
            {FAQ.map((f, i) => (
              <div key={f.q}>
                <button type="button" onClick={() => setOpen(i === open ? -1 : i)}>
                  {f.q}
                </button>
                {open === i && <div className="ans">{f.a}</div>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Link className="btn btn-primary" to="/download">
              Download App
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
