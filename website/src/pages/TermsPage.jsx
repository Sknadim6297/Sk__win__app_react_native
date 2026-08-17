import Seo from '../components/Seo';
import { TERMS } from '../content';

export default function TermsPage() {
  return (
    <>
      <Seo title="Terms" />
      <section className="page-hero">
        <div className="container legal" style={{ maxWidth: 760 }}>
          <h1>Terms & Conditions</h1>
          <p className="dim">{TERMS.note}</p>
          {TERMS.sections.map((s) => (
            <div key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
