import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { mediaUrl } from '../utils';

function thumb(t) {
  if (t.thumbnail) return mediaUrl(t.thumbnail);
  const m = String(t.videoLink || '').match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`;
  return '/web_image/dbc60886-e28f-4de6-9e6f-461dbfe670ee.png';
}

export default function TutorialsPage() {
  const { data, loading, error } = useFetch(() => api.tutorials(), []);
  const list = Array.isArray(data) ? data : [];

  return (
    <>
      <Seo title="Tutorials" />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Learn</p>
          <h1>Tutorials</h1>
          <p className="muted">Videos managed in Arena Control — same API as the app.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {loading && <div className="skeleton" />}
          {error && <p className="error">{error}</p>}
          {!loading && list.length === 0 && <p className="empty">No tutorials published yet.</p>}
          <div className="grid-3">
            {list.map((t) => (
              <Link key={t._id} to={`/tutorials/${t._id}`} className="card tut-card" style={{ padding: 0 }}>
                <div className="card-banner" style={{ backgroundImage: `url(${thumb(t)})` }} />
                <div style={{ padding: 16 }}>
                  <h3>{t.title}</h3>
                  <p className="muted">{t.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
