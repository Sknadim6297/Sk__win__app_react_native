import { useMemo, useState } from 'react';
import Seo from '../components/Seo';
import TournamentCard from '../components/TournamentCard';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { statusBucket } from '../utils';

const TABS = [
  { id: 'live', label: 'LIVE' },
  { id: 'upcoming', label: 'UPCOMING' },
  { id: 'completed', label: 'COMPLETED' },
];

export default function TournamentsPage() {
  const [tab, setTab] = useState('upcoming');
  const { data, loading, error } = useFetch(() => api.tournaments(), []);
  const list = Array.isArray(data) ? data : [];
  const filtered = useMemo(
    () => list.filter((t) => statusBucket(t) === tab),
    [list, tab]
  );

  return (
    <>
      <Seo title="Tournaments" description="Live, upcoming, and completed WAREZONE Free Fire matches." />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Matches</p>
          <h1>Tournaments</h1>
          <p className="muted">Same match list the app uses. Join from the Android app.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 12 }}>
        <div className="container">
          <div className="filters" style={{ marginBottom: 22 }}>
            {TABS.map((t) => (
              <button key={t.id} className={`chip ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {loading && (
            <div className="grid-3">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          )}
          {error && <p className="error">{error}</p>}
          {!loading && !error && filtered.length === 0 && <p className="empty">No {tab} matches right now.</p>}
          <div className="grid-3">
            {filtered.map((t) => (
              <TournamentCard key={t._id} t={t} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
