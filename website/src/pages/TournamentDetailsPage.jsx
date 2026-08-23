import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import {
  bannerOf,
  formatName,
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
      <Seo title={t?.name || 'Tournament'} description={t ? `${t.name} — ${formatName(t)}` : 'WAREZONE match details'} />
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
                    Match #{t.matchNumber || '—'} · {modeName(t)} · {formatName(t)}
                    {t.map ? ` · ${t.map}` : ''}
                  </p>
                </div>
              </div>
              <div className="stat-grid">
                {t.gameName || t.game?.name ? (
                  <div className="stat">
                    <span>Game</span>
                    <strong>{t.gameName || t.game?.name}</strong>
                  </div>
                ) : null}
                <div className="stat">
                  <span>Match Type</span>
                  <strong>{modeName(t)}</strong>
                </div>
                <div className="stat">
                  <span>Player Format</span>
                  <strong>{formatName(t)}</strong>
                </div>
                <div className="stat">
                  <span>Map</span>
                  <strong>{t.map || '—'}</strong>
                </div>
                <div className="stat">
                  <span>Entry Fee / Player</span>
                  <strong>₹{inr(t.entryFeePerPlayer ?? t.entryFee)}</strong>
                </div>
                {Number(t.prizePerKill ?? t.perKill) > 0 && t.showPrizePerKill !== false ? (
                  <div className="stat">
                    <span>Prize Per Kill</span>
                    <strong className="prize">₹{inr(t.prizePerKill ?? t.perKill)}</strong>
                  </div>
                ) : null}
                <div className="stat">
                  <span>Prize Pool</span>
                  <strong className="prize">₹{inr(prizePool(t))}</strong>
                </div>
                <div className="stat">
                  <span>Schedule</span>
                  <strong style={{ fontSize: 15 }}>{scheduleLine(t.startDate)}</strong>
                </div>
              </div>

              <div className="card" style={{ padding: 20, marginTop: 20 }}>
                <h3>About this match</h3>
                <h4 style={{ marginTop: 12, marginBottom: 8 }}>Rules and Regulations</h4>
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
                Match ID and password are shown only inside the WAREZONE app after you join this match.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
