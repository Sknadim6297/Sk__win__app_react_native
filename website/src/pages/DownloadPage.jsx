import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import Seo from '../components/Seo';
import PhoneShowcase from '../components/PhoneShowcase';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { apkHref } from '../utils';
import { BRAND, WHY } from '../content';
import { IOS_INSTALL_URL, IOS_APP_STORE_URL } from '../release';

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
  const iosReady = Boolean(IOS_INSTALL_URL);

  return (
    <>
      <Seo
        title="Download App"
        description="Download WAREZONE for Android. iPhone players install from TestFlight or the App Store."
      />
      <section className="page-hero">
        <div className="container hero-grid">
          <div>
            <p className="kicker">Android & iPhone</p>
            <h1>Download WAREZONE</h1>
            <p className="lede">
              {BRAND.motto} Install the official app, create your account, and join Clash Squad or
              Battle Royale matches.
            </p>
            {loading && <p className="muted">Loading release…</p>}
            {error && <p className="error">{error}</p>}

            <div className="os-grid">
              <article className={`card os-card ${platform === 'android' ? 'os-card-active' : ''}`}>
                <p className="kicker">Android</p>
                <h2>Get the APK</h2>
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
                <h2>{iosReady ? 'Install iOS app' : 'iOS via TestFlight'}</h2>
                <p className="muted">iOS 15 or newer</p>
                {iosReady ? (
                  <>
                    <a className="btn btn-ghost" href={IOS_INSTALL_URL} target="_blank" rel="noreferrer">
                      {IOS_APP_STORE_URL ? 'Open App Store' : 'Get on TestFlight'}
                    </a>
                    <p className="dim os-help">
                      Apple does not allow APK-style files on iPhone. Use TestFlight or the App
                      Store, then open WAREZONE.
                    </p>
                  </>
                ) : (
                  <>
                    <a className="btn btn-ghost" href="https://apps.apple.com/app/testflight/id899247664" target="_blank" rel="noreferrer">
                      Install TestFlight
                    </a>
                    <p className="dim os-help">
                      iPhone cannot install an Android APK. After we publish WAREZONE on TestFlight,
                      this button will open the invite. Until then, browse matches here and play on
                      Android.
                    </p>
                  </>
                )}
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
