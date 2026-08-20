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

          <div id="fair-play" style={{ scrollMarginTop: 96 }}>
            <h3>Fair Play Policy</h3>
            <p>
              Cheating, hacking, emulators (where banned), teaming, account sharing for unfair
              advantage, or abusive behavior may result in disqualification and forfeiture of
              entry fees or prizes. Decisions by WAREZONE admins are final for tournament integrity.
            </p>
          </div>

          <div id="return" style={{ scrollMarginTop: 96 }}>
            <h3>Return / Refund Policy</h3>
            <p>
              Entry fees are generally non-refundable once a match slot or team registration is
              confirmed. If a tournament is cancelled by WAREZONE, entry fees are refunded to the
              wallet. Wrong Game ID / UID submissions are not eligible for refund. Withdrawals of
              wallet winnings follow in-app wallet rules and may take processing time.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
