import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import {
  bannerOf,
  inr,
  modeName,
  parseRules,
  prizePool,
  scheduleLine,
  statusBucket,
  statusLabel,
} from '../utils';
import { PWA_URL } from '../release';

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(async () => {
    const [t, slots] = await Promise.all([api.tournament(id), api.slots(id).catch(() => null)]);
    return { t, slots };
  }, [id]);

  const t = data?.t;
  const completed = t && statusBucket(t) === 'completed';

  return (
    <>
      <Seo title={t?.name || 'Tournament'} description={t ? `${t.name} — ${modeName(t)}` : 'WAREZONE match details'} />
      <section className="page-hero">
        <div className="container">
          {loading && <div className="skeleton" style={{ minHeight: 280 }} />}
          {error && <p className="error">{error}</p>}
          {t && (
            <>
              <div className="details-hero" style={{ backgroundImage: `url(${bannerOf(t)})` }}>
                <div className="details-hero-content">
                  <span className={`badge ${statusBucket(t) === 'live' ? 'badge-live' : statusBucket(t) === 'completed' ? 'badge-done' : 'badge-up'}`}>
                    {statusLabel(t)}
                  </span>
                  <h1 style={{ marginTop: 12 }}>{t.name}</h1>
                  <p className="muted">
                    Match #{t.matchNumber || '—'} · {modeName(t)} {t.formatLabel ? `· ${t.formatLabel}` : ''}
                  </p>
                </div>
              </div>
              <div className="stat-grid">
                <div className="stat">
                  <span>Prize pool</span>
                  <strong className="prize">₹{inr(prizePool(t))}</strong>
                </div>
                <div className="stat">
                  <span>Entry fee</span>
                  <strong>₹{inr(t.entryFee)}</strong>
                </div>
                <div className="stat">
                  <span>Schedule</span>
                  <strong style={{ fontSize: 15 }}>{scheduleLine(t.startDate)}</strong>
                </div>
                <div className="stat">
                  <span>Map</span>
                  <strong>{t.map || '—'}</strong>
                </div>
              </div>
              <p className="muted">
                Slots {t.participantCount || t.currentParticipants || 0}/{t.totalSlots || t.maxParticipants || data?.slots?.totalSlots || '—'}
              </p>

              {t.description && (
                <div className="card" style={{ padding: 20, marginTop: 20 }}>
                  <h3>About this match</h3>
                  <p className="muted" style={{ marginTop: 8 }}>{t.description}</p>
                </div>
              )}

              <div className="card" style={{ padding: 20, marginTop: 18 }}>
                <h3>Rules</h3>
                <ul className="rules">
                  {parseRules(t.rules).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
                <a className="btn btn-primary" href={`${PWA_URL}/tournament/${t._id}`} target="_blank" rel="noreferrer">
                  Join in web app
                </a>
                <Link className="btn btn-ghost" to="/download">
                  Android APK
                </Link>
                {completed && (
                  <Link className="btn btn-ghost" to={`/results/${t._id}`}>
                    View result
                  </Link>
                )}
              </div>
              <p className="dim" style={{ marginTop: 10, fontSize: 13 }}>
                Room ID and password stay inside the WAREZONE app / web app after you join.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
