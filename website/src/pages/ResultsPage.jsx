import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import TournamentCard from '../components/TournamentCard';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { statusBucket } from '../utils';

export default function ResultsPage() {
  const { data, loading, error } = useFetch(() => api.tournaments(), []);
  const list = (Array.isArray(data) ? data : []).filter((t) => statusBucket(t) === 'completed');

  return (
    <>
      <Seo title="Results" description="Completed WAREZONE tournament results." />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Scoreboard</p>
          <h1>Results</h1>
          <p className="muted">Published match outcomes from the same results API as the app.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 12 }}>
        <div className="container">
          {loading && <div className="skeleton" />}
          {error && <p className="error">{error}</p>}
          {!loading && list.length === 0 && <p className="empty">No completed matches yet.</p>}
          <div className="grid-3">
            {list.map((t) => (
              <div key={t._id}>
                <TournamentCard t={t} />
                <div style={{ marginTop: 10 }}>
                  <Link className="btn btn-ghost btn-sm" to={`/results/${t._id}`}>
                    Open scoreboard
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
