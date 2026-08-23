import { Link } from 'react-router-dom';
import { bannerOf, formatName, inr, modeName, prizePool, scheduleLine, statusBucket, statusLabel } from '../utils';

export default function TournamentCard({ t }) {
  const bucket = statusBucket(t);
  const badgeClass = bucket === 'live' ? 'badge-live' : bucket === 'completed' ? 'badge-done' : 'badge-up';
  const slots = t.totalSlots || t.maxParticipants || 0;
  const joined = t.participantCount || t.currentParticipants || 0;

  return (
    <article className="card fade-up">
      <Link to={`/tournaments/${t._id}`}>
        <div className="card-banner" style={{ backgroundImage: `url(${bannerOf(t)})` }} />
        <div className="card-body">
          <span className={`badge ${badgeClass}`}>{statusLabel(t)}</span>
          <h3 style={{ margin: '10px 0 4px', fontSize: 18 }}>{t.name}</h3>
          <p className="dim" style={{ fontSize: 13 }}>
            {modeName(t)} · {formatName(t)} {t.map ? `· ${t.map}` : ''}
          </p>
          <div className="meta-row">
            <span className="prize">Prize ₹{inr(prizePool(t))}</span>
            <span className="fee">Entry ₹{inr(t.entryFee)}</span>
          </div>
          <div className="meta-row">
            <span>{scheduleLine(t.startDate)}</span>
            <span>
              {joined}/{slots} slots
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <span className="btn btn-ghost btn-sm">
              {bucket === 'completed' ? 'View match' : 'View details'}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
