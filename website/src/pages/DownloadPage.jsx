import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import Seo from '../components/Seo';
import PhoneShowcase from '../components/PhoneShowcase';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { apkHref } from '../utils';
import { BRAND, WHY } from '../content';
import { APP_RELEASE, PWA_URL } from '../release';

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export default function DownloadPage() {
  const { data, loading, error } = useFetch(() => api.downloadRelease(), []);
  const rel = data?.release;
  const canDownload = Boolean(rel?.apkExists !== false && (rel?.downloadUrl || rel?.fileName));
  const href = apkHref(rel);
  const platform = useMemo(detectPlatform, []);
  const pwaHref = `${PWA_URL}/login`;
  const version = rel?.version || APP_RELEASE.version;

  return (
    <>
      <Seo
        title="Download App"
        description="Download the latest WAREZONE Android APK, or open the WAREZONE web app on iPhone and add it to your Home Screen."
      />
      <section className="page-hero">
        <div className="container hero-grid">
          <div>
            <p className="kicker">Android & iPhone</p>
            <h1>Get WAREZONE</h1>
            <p className="lede">
              {BRAND.motto} Android players install the official APK. iPhone players use the
              WAREZONE web app in Safari — it is not a native App Store app.
            </p>
            {loading && <p className="muted">Loading latest release…</p>}
            {error && <p className="error">{error}</p>}

            <div className="os-grid">
              <article className={`card os-card ${platform === 'android' ? 'os-card-active' : ''}`}>
                <div className="os-card-head">
                  <p className="kicker">Android</p>
                  <span className="release-pill">Latest v{version}</span>
                </div>
                <h2>Download APK</h2>
                <p className="muted">{rel?.androidMin || 'Android 8.0+'}</p>
                <p className="muted">
                  Size {rel?.apkExists ? rel.sizeLabel : '—'}
                  {rel?.lastUpdatedLabel ? ` · Updated ${rel.lastUpdatedLabel}` : ''}
                </p>
                {rel?.releaseNotes ? <p className="release-notes">{rel.releaseNotes}</p> : null}
                <a className="btn btn-primary" href={canDownload ? href : '/download'} download={canDownload || undefined}>
                  {rel?.downloadLabel || `Download WAREZONE v${version}`}
                </a>
                <p className="dim os-help">
                  Uninstall any old WAREZONE app first. Allow install from this source if Android
                  asks.
                </p>
              </article>

              <article className={`card os-card ${platform === 'ios' ? 'os-card-active' : ''}`}>
                <p className="kicker">iPhone / iPad</p>
                <h2>Open web app</h2>
                <p className="muted">Safari on iOS 16.4 or newer</p>
                <a className="btn btn-primary" href={pwaHref}>
                  Open Web App &amp; Login
                </a>
                <p className="dim os-help">
                  There is no iPhone APK or IPA. This Download page is only instructions — the real
                  app is the web login screen. Do not Add to Home Screen from this page.
                </p>
                <p className="muted" style={{ marginTop: 14, marginBottom: 6 }}>
                  Add to Home Screen (after login screen opens)
                </p>
                <ol className="a2hs-steps">
                  <li>Tap Open Web App &amp; Login above (must use Safari, not Chrome).</li>
                  <li>Wait until you see WAREZONE Get Started / Login — not this Download page.</li>
                  <li>Tap Share (square with arrow) → Add to Home Screen → Add.</li>
                  <li>Open the Home Screen icon and log in to join tournaments.</li>
                </ol>
              </article>
            </div>

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
