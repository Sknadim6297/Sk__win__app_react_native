import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { apkHref } from '../utils';
import { APP_RELEASE } from '../release';

const STORAGE_KEY = 'wz_dismiss_release_banner';

/**
 * Slim dismissible bar promoting the latest APK (website).
 */
export default function LatestReleaseBanner() {
  const [release, setRelease] = useState(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .downloadRelease()
      .then((data) => {
        if (cancelled) return;
        const rel = data?.release;
        if (!rel?.version) return;
        try {
          if (localStorage.getItem(`${STORAGE_KEY}:${rel.version}`) === '1') {
            setHidden(true);
            return;
          }
        } catch {
          /* private mode */
        }
        setRelease(rel);
        setHidden(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden || !release) return null;

  const href = apkHref(release);
  const version = release.version || APP_RELEASE.version;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(`${STORAGE_KEY}:${version}`, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="release-banner" role="status">
      <div className="release-banner-inner">
        <p>
          <strong>Latest app</strong> — WAREZONE v{version}
          {release.apkExists ? (
            <>
              {' '}
              ·{' '}
              <a href={href} download>
                Download APK
              </a>
            </>
          ) : (
            <>
              {' '}
              · <Link to="/download">Get the app</Link>
            </>
          )}
        </p>
        <button type="button" className="release-banner-close" onClick={dismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
