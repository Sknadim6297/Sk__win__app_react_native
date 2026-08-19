import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import PhoneShowcase from '../components/PhoneShowcase';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { apkHref } from '../utils';
import { BRAND, WHY } from '../content';

export default function DownloadPage() {
  const { data, loading, error } = useFetch(() => api.downloadRelease(), []);
  const rel = data?.release;
  const canDownload = Boolean(rel?.apkExists && rel?.downloadUrl);
  const href = canDownload ? apkHref(rel) : '/downloads/WAREZONE-v1.0.2.apk';

  return (
    <>
      <Seo
        title="Download App"
        description="Download the official WAREZONE Android app and join Free Fire tournaments."
      />
      <section className="page-hero">
        <div className="container hero-grid">
          <div>
            <p className="kicker">Android</p>
            <h1>Download WAREZONE</h1>
            <p className="lede">
              {BRAND.motto} Install the official app, create your account, and join Clash Squad or
              Battle Royale matches.
            </p>
            {loading && <p className="muted">Loading release…</p>}
            {error && <p className="error">{error}</p>}
            {rel && (
              <div className="card" style={{ padding: 20, marginTop: 22 }}>
                <p>
                  <strong>{rel.title || BRAND.fullName}</strong>
                </p>
                <p className="muted">Version {rel.version}</p>
                <p className="muted">{rel.androidMin}</p>
                <p className="muted">Size {rel.apkExists ? rel.sizeLabel : '—'}</p>
                {rel.releaseNotes && (
                  <p className="muted" style={{ marginTop: 10 }}>
                    {rel.releaseNotes}
                  </p>
                )}
                <a className="btn btn-primary" style={{ marginTop: 16 }} href={href} download>
                  {rel.downloadLabel || 'Download APK'}
                </a>
                <p className="dim" style={{ marginTop: 14, fontSize: 13 }}>
                  Android 8.0 or newer. Uninstall any old WAREZONE app first, then install this
                  build. After download, open the file and allow install from this source if Android
                  asks.
                </p>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <Link className="link" to="/tournaments">
                View tournaments →
              </Link>
            </div>
          </div>
          <PhoneShowcase />
        </div>
      </section>
      <section className="section">
        <div className="container grid-2">
          {WHY.map((w) => (
            <article className="card why-card" key={w.title}>
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
