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
              {BRAND.motto} Install the official APK, create your account, and join Clash Squad or
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
                <p className="muted">Size {rel.sizeLabel}</p>
                {rel.releaseNotes && <p className="muted" style={{ marginTop: 10 }}>{rel.releaseNotes}</p>}
                {rel.apkExists ? (
                  <a className="btn btn-primary" style={{ marginTop: 16 }} href={apkHref(rel)}>
                    {rel.downloadLabel || 'Download APK'}
                  </a>
                ) : (
                  <p className="error" style={{ marginTop: 12 }}>
                    APK file is not uploaded yet. Place it in public/downloads on the server.
                  </p>
                )}
                <p className="dim" style={{ marginTop: 12, fontSize: 13 }}>
                  No Play Store link is configured. This page only uses the existing download API.
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
