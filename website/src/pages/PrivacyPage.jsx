import Seo from '../components/Seo';
import { PRIVACY } from '../content';

export default function PrivacyPage() {
  return (
    <>
      <Seo title="Privacy Policy" />
      <section className="page-hero">
        <div className="container legal" style={{ maxWidth: 760 }}>
          <h1>Privacy Policy</h1>
          <p className="dim">Last updated: {PRIVACY.updated}. Copied from the existing app.</p>
          {PRIVACY.sections.map((s) => (
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
