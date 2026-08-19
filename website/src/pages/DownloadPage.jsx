import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import Seo from '../components/Seo';
import PhoneShowcase from '../components/PhoneShowcase';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { apkHref } from '../utils';
import { BRAND, WHY } from '../content';
import { PWA_URL } from '../release';

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
  const canDownload = Boolean(rel?.apkExists && rel?.downloadUrl);
  const href = canDownload ? apkHref(rel) : '/downloads/WAREZONE-v1.0.2.apk';
  const platform = useMemo(detectPlatform, []);
  const pwaHref = `${PWA_URL}/login`;

  return (
    <>
      <Seo
        title="Download App"
        description="Download the WAREZONE Android APK, or open the WAREZONE web app on iPhone and add it to your Home Screen."
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
            {loading && <p className="muted">Loading release…</p>}
            {error && <p className="error">{error}</p>}

            <div className="os-grid">
              <article className={`card os-card ${platform === 'android' ? 'os-card-active' : ''}`}>
                <p className="kicker">Android</p>
                <h2>Download APK</h2>
                <p className="muted">Version {rel?.version || '1.0.2'}</p>
                <p className="muted">{rel?.androidMin || 'Android 8.0+'}</p>
                <p className="muted">Size {rel?.apkExists ? rel.sizeLabel : '—'}</p>
                <a className="btn btn-primary" href={href} download>
                  {rel?.downloadLabel || 'Download APK'}
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
                <a className="btn btn-primary" href={pwaHref} target="_blank" rel="noreferrer">
                  Open WAREZONE Web App
                </a>
                <p className="dim os-help">
                  There is no iPhone APK or IPA download. WAREZONE on iPhone is a web app you can
                  add to your Home Screen. It is not a native iOS App Store app.
                </p>
                <p className="muted" style={{ marginTop: 14, marginBottom: 6 }}>
                  Add to Home Screen
                </p>
                <ol className="a2hs-steps">
                  <li>Open the web app in Safari (not Chrome).</li>
                  <li>Tap the Share button (square with an arrow).</li>
                  <li>Scroll and tap Add to Home Screen.</li>
                  <li>Tap Add. Open WAREZONE from your Home Screen like an app.</li>
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
