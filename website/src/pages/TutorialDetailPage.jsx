import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { mediaUrl } from '../utils';

export default function TutorialDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(async () => {
    const list = await api.tutorials();
    return (Array.isArray(list) ? list : []).find((t) => String(t._id) === String(id));
  }, [id]);

  return (
    <>
      <Seo title={data?.title || 'Tutorial'} />
      <section className="page-hero">
        <div className="container">
          {loading && <div className="skeleton" />}
          {error && <p className="error">{error}</p>}
          {!loading && !data && <p className="empty">Tutorial not found.</p>}
          {data && (
            <div className="card" style={{ padding: 24, maxWidth: 760 }}>
              {data.thumbnail && (
                <img
                  src={mediaUrl(data.thumbnail)}
                  alt=""
                  style={{ width: '100%', borderRadius: 16, marginBottom: 16, maxHeight: 280, objectFit: 'cover' }}
                />
              )}
              <h1>{data.title}</h1>
              <p className="muted" style={{ margin: '12px 0 20px' }}>{data.description}</p>
              {data.videoLink && (
                <a className="btn btn-primary" href={data.videoLink} target="_blank" rel="noreferrer">
                  Watch video
                </a>
              )}
              <div style={{ marginTop: 16 }}>
                <Link className="link" to="/tutorials">
                  ← All tutorials
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
