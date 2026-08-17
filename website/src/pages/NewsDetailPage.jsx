import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';

export default function NewsDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => api.announcement(id), [id]);

  return (
    <>
      <Seo title={data?.title || 'Announcement'} />
      <section className="page-hero">
        <div className="container">
          {loading && <div className="skeleton" />}
          {error && <p className="error">{error}</p>}
          {data && (
            <article className="card" style={{ padding: 28, maxWidth: 760 }}>
              <div className="badge badge-up">{data.category}</div>
              <h1 style={{ marginTop: 12 }}>{data.title}</h1>
              <p className="dim" style={{ margin: '8px 0 16px' }}>
                {data.createdAt ? new Date(data.createdAt).toLocaleString('en-IN') : ''}
              </p>
              <p className="muted">{data.description}</p>
              {data.externalLink && (
                <p style={{ marginTop: 16 }}>
                  <a className="link" href={data.externalLink} target="_blank" rel="noreferrer">
                    Open link
                  </a>
                </p>
              )}
              <div style={{ marginTop: 20 }}>
                <Link to="/news">← All news</Link>
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}
