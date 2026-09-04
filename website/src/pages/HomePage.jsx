import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import PhoneShowcase from '../components/PhoneShowcase';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { BRAND, HOME_FEATURES, SUPPORT } from '../content';
import { inr, mediaUrl, apkHref, bannerOf, modePosterFor, DEFAULT_MODE_CARDS, MODE_POSTERS } from '../utils';
import { sortBySortOrder } from '../sortBySortOrder';
import { APP_RELEASE, PWA_URL } from '../release';

function FeatureIcon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (name) {
    case 'gamepad':
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="3" />
          <path d="M8 12h.01M12 10v4M16 12h.01" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15v-4M12 15V8M16 15v-6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M12 8v13M3 12h18M12 8c-2-3-5-3-5-1s2 2 5 1c3 1 5 0 5-1s-3-2-5 1Z" />
        </svg>
      );
    case 'coins':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
        </svg>
      );
    case 'rupee':
      return (
        <svg {...common}>
          <path d="M6 5h12M6 9h12M10 19l6-10H8c3 0 5-2 5-4" />
        </svg>
      );
    default:
      return null;
  }
}

function AndroidIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18a.5.5 0 0 0-.87-.5l-1.86 3.22A7.9 7.9 0 0 0 12 8c-1.66 0-3.2.5-4.71 1.52L5.43 5.8a.5.5 0 1 0-.87.5L6.4 9.48C4.34 11.03 3 13.37 3 16v.5h18V16c0-2.63-1.34-4.97-3.4-6.52zM8.5 14.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.8-2.2-3.5zM14.6 6.5c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.6 1 .1 1.9-.5 2.6-1.2z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.8 12.1l-.3.4.8 2.9-3-.8-.4.2A8 8 0 1 1 12 4zm4.4 9.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.7-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.4 3.8 3.3 2.2.9 2.2.6 2.6.6.4 0 1.3-.5 1.4-1 .2-.5.2-.9.1-1z" />
    </svg>
  );
}

function formatCompact(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (v >= 1000) return `${Math.round(v / 1000)}K+`;
  return inr(v);
}

export default function HomePage() {
  const { data } = useFetch(async () => {
    const [tournaments, home, games, site, release] = await Promise.all([
      api.tournaments().catch(() => []),
      api.homeConfig().catch(() => ({})),
      api.games().catch(() => []),
      api.site().catch(() => ({ stats: {}, modes: [] })),
      api.downloadRelease().catch(() => null),
    ]);
    const ff = (Array.isArray(games) ? games : []).find((g) => /free\s*fire/i.test(g.name || '')) || games?.[0];
    const modesFromGame = ff?._id ? await api.gameModes(ff._id).catch(() => []) : [];
    return { tournaments, home, modesFromGame, site, release: release?.release || null };
  }, []);

  const list = Array.isArray(data?.tournaments) ? data.tournaments : [];
  const liveUp = list.filter((t) => {
    const s = String(t.lifecycleStatus || t.status || '').toLowerCase();
    return s !== 'completed' && s !== 'cancelled' && s !== 'draft';
  });
  const siteModes = Array.isArray(data?.site?.modes) ? data.site.modes : [];
  const gameModes = Array.isArray(data?.modesFromGame) ? data.modesFromGame : [];
  const modeCards = sortBySortOrder(siteModes.length ? siteModes : gameModes).slice(0, 6);
  const modesFromApi = modeCards.map((m) => {
    const name = (m.name || 'MODE').toUpperCase();
    return {
      name,
      image: modePosterFor(name) || mediaUrl(m.image) || MODE_POSTERS.loneWolf,
    };
  });
  const modes = modesFromApi.length ? modesFromApi : DEFAULT_MODE_CARDS;
  const ticker = data?.home?.latestAnnouncementTitle || data?.home?.latestNews?.text;
  const stats = data?.site?.stats || {};
  const apk = apkHref(data?.release);
  const apkVersion = APP_RELEASE.version;
  const leftFeatures = HOME_FEATURES.filter((_, i) => i % 2 === 0);
  const rightFeatures = HOME_FEATURES.filter((_, i) => i % 2 === 1);

  const heroStats = [
    { value: formatCompact(stats.totalUsers), label: 'Gamers' },
    { value: formatCompact(stats.totalMatches), label: 'Tournaments' },
    {
      value: stats.totalWinnings != null ? `₹${formatCompact(stats.totalWinnings)}` : '—',
      label: 'Distributed',
    },
  ];

  const powerStats = [
    { icon: 'gamepad', value: formatCompact(stats.totalMatches), label: 'Tournaments Hosted' },
    { icon: 'users', value: formatCompact(stats.totalUsers), label: 'Active Gamers' },
    {
      icon: 'rupee',
      value: stats.totalWinnings != null ? `₹${formatCompact(stats.totalWinnings)}` : '—',
      label: 'Winnings Distributed',
    },
    { icon: 'gift', value: formatCompact(Math.max(Number(stats.totalMatches) || 0, 0) * 12 || 0), label: 'Rewards Claimed' },
  ];

  return (
    <>
      <Seo title="Home" />

      {/* HERO */}
      <section className="lz-hero">
        <div className="lz-grid-bg" aria-hidden />
        <div className="container lz-hero-grid">
          <div className="lz-hero-copy fade-up">
            <div className="lz-live-pill">
              <span className="lz-live-dot" />
              {liveUp.length > 0 ? 'Live tournaments running now' : 'Tournaments opening soon'}
            </div>
            <h1 className="lz-brand-title">
              <span className="lz-brand-white">{BRAND.name}</span>
              <span className="lz-brand-accent">ESPORTS</span>
            </h1>
            <p className="lz-hero-lede">{BRAND.heroLine}</p>
            <div className="lz-hero-actions">
              <a className="btn btn-primary" href={apk}>
                <AndroidIcon /> Download App v{apkVersion}
              </a>
              <a className="btn btn-ghost" href={`${PWA_URL}/login`}>
                <AppleIcon /> iPhone Web App
              </a>
            </div>
            <div className="lz-hero-stats">
              {heroStats.map((s) => (
                <div key={s.label}>
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lz-hero-visual fade-up d2">
            <PhoneShowcase single news={ticker} modes={modes} liveName={liveUp[0]?.name} />
          </div>
        </div>
      </section>

      {/* ESPORTS MODE POSTERS */}
      <section className="lz-section" id="modes">
        <div className="container">
          <div className="lz-section-head">
            <span className="lz-eyebrow">Esports Games</span>
            <h2>Pick your mode. Play to win.</h2>
            <div className="lz-rule" />
          </div>
          <div className="lz-mode-posters">
            {modes.slice(0, 3).map((m) => (
              <article className="lz-mode-poster" key={m.name}>
                <img src={m.image} alt={m.name} loading="lazy" />
                <div className="lz-mode-poster-foot">
                  <strong>{m.name}</strong>
                  <a className="btn btn-primary" href={apk}>
                    Play in app
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES + PHONE */}
      <section className="lz-section" id="features">
        <div className="container">
          <div className="lz-section-head">
            <span className="lz-eyebrow">Features</span>
            <h2>Everything in one app</h2>
            <div className="lz-rule" />
          </div>
          <div className="lz-features-layout">
            <div className="lz-feature-col">
              {leftFeatures.map((f) => (
                <article className="lz-feature-card" key={f.title}>
                  <div className="lz-feature-icon">
                    <FeatureIcon name={f.icon} />
                  </div>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="lz-features-phone">
              <PhoneShowcase single news={ticker} modes={modes} liveName={liveUp[0]?.name} />
            </div>
            <div className="lz-feature-col">
              {rightFeatures.map((f) => (
                <article className="lz-feature-card" key={f.title}>
                  <div className="lz-feature-icon">
                    <FeatureIcon name={f.icon} />
                  </div>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* APP SCREENS / POWER STATS */}
      <section className="lz-section lz-section-alt">
        <div className="container">
          <div className="lz-section-head">
            <span className="lz-eyebrow">App screens</span>
            <h2>Sleek. Intuitive. Powerful.</h2>
            <div className="lz-rule" />
          </div>
          <div className="lz-power-stats">
            {powerStats.map((s) => (
              <article className="lz-power-stat" key={s.label}>
                <div className="lz-power-icon">
                  <FeatureIcon name={s.icon} />
                </div>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GET THE APP — Android APK + iOS / PWA */}
      <section className="lz-section" id="download">
        <div className="container">
          <div className="lz-getapp">
            <div className="lz-getapp-copy">
              <span className="lz-eyebrow">Get the app</span>
              <h2>Start competing today</h2>
              <p>
                Download the Android APK, or open the iPhone web app in Safari and add it to your
                Home Screen — same WAREZONE experience.
              </p>

              <div className="lz-dl-grid">
                <article className="lz-dl-card">
                  <div className="lz-dl-badge">Android</div>
                  <h3>
                    <AndroidIcon /> Download APK
                  </h3>
                  <p>Official installer for phones and tablets.</p>
                  <a className="btn btn-primary" href={apk}>
                    <AndroidIcon /> Download APK
                  </a>
                  <p className="lz-getapp-meta">
                    Version {APP_RELEASE.version} · Android 6.0+ · Free
                  </p>
                </article>

                <article className="lz-dl-card">
                  <div className="lz-dl-badge">iPhone / iPad</div>
                  <h3>
                    <AppleIcon /> Web App (PWA)
                  </h3>
                  <p>
                    This Download page is not the app. Open the web app first, then add{' '}
                    <strong>that</strong> screen to Home Screen.
                  </p>
                  <a className="btn btn-primary" href={`${PWA_URL}/login`}>
                    <AppleIcon /> Open Web App &amp; Login
                  </a>
                  <ol className="lz-ios-steps">
                    <li>
                      Tap <strong>Open Web App &amp; Login</strong> above (Safari only — not Chrome).
                    </li>
                    <li>
                      Wait for the WAREZONE <strong>login / Get Started</strong> screen (not this
                      Download page).
                    </li>
                    <li>
                      Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> →{' '}
                      <strong>Add</strong>.
                    </li>
                    <li>Open the new Home Screen icon and log in to play.</li>
                  </ol>
                </article>
              </div>
            </div>
            <div className="lz-getapp-visual">
              <PhoneShowcase single news={ticker} modes={modes} liveName={liveUp[0]?.name} />
            </div>
          </div>
        </div>
      </section>

      {/* WHATSAPP BAND */}
      <section className="lz-section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="lz-wa-band">
            <div className="lz-wa-left">
              <div className="lz-wa-mark" aria-hidden>
                <WhatsAppIcon size={28} />
              </div>
              <div>
                <h3>Join our WhatsApp channel</h3>
                <p>Get instant updates on tournaments, results, and exclusive offers.</p>
              </div>
            </div>
            <a
              className="btn btn-wa"
              href={data?.home?.supportLinks?.whatsapp || SUPPORT.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon size={18} /> Join Channel
            </a>
          </div>
        </div>
      </section>

      {/* Live matches strip */}
      {liveUp.length > 0 && (
        <section className="lz-section" style={{ paddingTop: 8 }}>
          <div className="container">
            <div className="lz-section-head lz-section-head-row">
              <div>
                <span className="lz-eyebrow">Live now</span>
                <h2>Open tournaments</h2>
              </div>
              <Link className="link" to="/tournaments">
                All matches →
              </Link>
            </div>
            <div className="lz-match-row">
              {liveUp.slice(0, 4).map((t) => (
                <Link key={t._id} to={`/tournaments/${t._id}`} className="lz-match-card">
                  <img src={bannerOf(t)} alt="" className="lz-match-thumb" />
                  <div>
                    <strong>{t.name}</strong>
                    <span>
                      Entry ₹{t.entryFee ?? 0}/player · Prize ₹{inr(t.prizePool || 0)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
