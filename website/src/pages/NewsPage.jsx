import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';

export default function NewsPage() {
  const { data, loading, error } = useFetch(() => api.announcements(), []);
  const list = Array.isArray(data) ? data : [];

  return (
    <>
      <Seo title="News" />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Updates</p>
          <h1>News & announcements</h1>
        </div>
      </section>
      <section className="section">
        <div className="container grid-3">
          {loading && <div className="skeleton" />}
          {error && <p className="error">{error}</p>}
          {list.map((n) => (
            <Link key={n.id} to={`/news/${n.id}`} className="card news-card">
              <div className="badge badge-up">{n.category}</div>
              <h3 style={{ marginTop: 10 }}>{n.title}</h3>
              <p>{n.description}</p>
              <p className="dim" style={{ marginTop: 10, fontSize: 12 }}>
                {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN') : ''}
              </p>
            </Link>
          ))}
          {!loading && list.length === 0 && <p className="empty">No news yet.</p>}
        </div>
      </section>
    </>
  );
}
