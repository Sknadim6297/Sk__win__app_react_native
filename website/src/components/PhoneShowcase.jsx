import { brandLogoUrl, DEFAULT_MODE_CARDS, modePosterFor, MODE_POSTERS } from '../utils';

function modeAccent(name) {
  const n = String(name || '').toUpperCase();
  if (/LW|LONE\s*WOLF/.test(n)) {
    return { color: '#FFC53D', border: 'rgba(255,180,40,0.65)', className: 'mode-gold' };
  }
  if (/ONE\s*TAP/.test(n)) {
    return { color: '#5CFFF7', border: 'rgba(0,229,255,0.55)', className: 'mode-cyan' };
  }
  if (/CS|CLASH|1V1|2V2|4V4/.test(n)) {
    return { color: '#FFD76A', border: 'rgba(255,200,60,0.55)', className: 'mode-gold' };
  }
  if (/BR|BATTLE|ROYALE|FULL\s*MAP|SURVIVAL/.test(n)) {
    return { color: '#6EFF9A', border: 'rgba(74,222,128,0.55)', className: 'mode-green' };
  }
  return { color: '#FFD76A', border: 'rgba(251,191,36,0.55)', className: 'mode-gold' };
}

/** Big white title + short colored chip — matches app home posters. */
function modeParts(name) {
  const full = String(name || 'MODE').toUpperCase().trim();
  const accent = modeAccent(full);

  if (/^LW\b|LONE\s*WOLF/.test(full)) {
    const short = /^LW\b/.test(full)
      ? full
      : full.replace(/LONE\s*WOLF\s*/i, 'LW ').trim() || 'LW 1V1/2V2';
    return { title: 'LONE WOLF', short, accent };
  }
  if (/ONE\s*TAP/.test(full)) {
    return { title: 'CS ONE TAP TOURNAMENT', short: 'CS ONE TAP', accent };
  }
  if (/^CS\b|CLASH\s*SQUAD/.test(full)) {
    const short = /^CS\b/.test(full)
      ? full
      : full.match(/1V1|2V2|4V4/)
        ? 'CS 1V1/2V2'
        : 'CS';
    const title = /CLASH/.test(full)
      ? full.replace(/\s*1V1.*$/i, '').trim() || 'CLASH SQUAD'
      : 'CLASH SQUAD';
    return { title: title.length > 28 ? 'CLASH SQUAD' : title, short, accent };
  }
  if (/^BR\b|BATTLE\s*ROYALE|FULL\s*MAP|SURVIVAL/.test(full)) {
    if (/SURVIVAL/.test(full)) return { title: 'BR SURVIVAL', short: 'BR SURVIVAL', accent };
    if (/FULL\s*MAP|^BR\s*FULL/.test(full)) return { title: 'BR FULL MAP', short: 'BR FULL MAP', accent };
    return {
      title: /BATTLE/.test(full) ? 'BATTLE ROYALE' : full,
      short: /^BR\b/.test(full) ? full : 'BR',
      accent,
    };
  }
  return { title: full, short: full.slice(0, 16), accent };
}

function ModeTile({ mode }) {
  const { title, short, accent } = modeParts(mode.name);
  const image =
    mode.image ||
    modePosterFor(mode.name) ||
    MODE_POSTERS.loneWolf;
  // Local web_image posters already include titles — keep a light PLAY cue only.
  const isPromoPoster = String(image).includes('/web_image/');

  return (
    <div
      className={`mode-tile ${accent.className}`}
      style={{
        backgroundImage: isPromoPoster
          ? `url(${image})`
          : `linear-gradient(180deg, rgba(5,10,22,0.15), rgba(5,10,22,0.92)), url(${image})`,
        borderColor: accent.border,
      }}
    >
      <div className={`mode-tile-copy ${isPromoPoster ? 'mode-tile-copy-poster' : ''}`}>
        {!isPromoPoster ? (
          <>
            <strong className="mode-tile-title">{title}</strong>
            <span className="mode-tile-short" style={{ color: accent.color }}>
              {short}
            </span>
          </>
        ) : null}
        <span className="mode-tile-play" style={{ color: accent.color }}>
          PLAY ›
        </span>
      </div>
    </div>
  );
}

function ContestIcons() {
  return (
    <div className="phone-contests">
      <div className="phone-contests-head">
        <h4>My Contests</h4>
        <p>Your Tournaments Journey</p>
      </div>
      <div className="phone-contest-row">
        {[
          { label: 'Upcoming', icon: '⏱' },
          { label: 'Ongoing', icon: '📡' },
          { label: 'Completed', icon: '✓' },
        ].map((c) => (
          <div key={c.label} className="phone-contest-tile">
            <span className="phone-contest-icon" aria-hidden>
              {c.icon}
            </span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomePhone({ news, tiles, className = 'phone phone-main lz-phone' }) {
  return (
    <div className={className}>
      <div className="phone-screen">
        <div className="phone-app">
          <div className="phone-header phone-header-app">
            <div className="left">
              <span className="phone-avatar" aria-hidden />
              <img className="logo" src={brandLogoUrl()} alt="WAREZONE" />
            </div>
            <div className="phone-header-right">
              <div className="coin-pill">
                <img src="/coin.png" alt="" />
                760
              </div>
              <span className="phone-bell" aria-hidden>
                🔔
                <i>15</i>
              </span>
            </div>
          </div>
          <div className="phone-news">
            <span className="tag">LATEST</span>
            <span className="phone-news-text">{news || '🚨 Important: Verify Your Profile'}</span>
          </div>
          <div className="phone-body phone-body-home">
            <ContestIcons />
            <div className="phone-esports-head">
              <h4>Esports Games</h4>
            </div>
            <div className="mini-grid mini-grid-modes">
              {tiles.map((m, i) => (
                <ModeTile key={i} mode={m} />
              ))}
            </div>
            <div className="phone-action-row">
              <div className="phone-share-btn">Share</div>
              <div className="phone-wa-btn">WhatsApp</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhoneShowcase({ news, modes = [], liveName, single = false }) {
  const tiles =
    modes.length >= 1
      ? modes.slice(0, 4).map((m) => ({
          name: m.name,
          image: m.image || modePosterFor(m.name) || MODE_POSTERS.loneWolf,
        }))
      : DEFAULT_MODE_CARDS;

  if (single) {
    return (
      <div className="phones phones-single" aria-hidden="true">
        <HomePhone news={news} tiles={tiles} />
      </div>
    );
  }

  return (
    <div className="phones" aria-hidden="true">
      <HomePhone news={news} tiles={tiles} className="phone phone-side lz-phone" />

      <div className="phone phone-main">
        <div className="phone-screen">
          <div className="phone-app">
            <div className="phone-header">
              <div className="left">Contest Details</div>
            </div>
            <div
              className="card-banner"
              style={{
                height: 110,
                backgroundImage: `url(${MODE_POSTERS.clashSquad})`,
                margin: 10,
                borderRadius: 12,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }}
            />
            <div className="phone-body">
              <div className="mini-card">
                <h4>{liveName || 'WAREZONE Match'}</h4>
                <p>Prize pool · Entry fee · Map</p>
              </div>
              <div className="mini-card" style={{ background: '#e11d2e', color: '#fff' }}>
                <h4>Join in app</h4>
                <p>Room ID stays private</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="phone phone-side">
        <div className="phone-screen">
          <div className="phone-app">
            <div className="phone-header">
              <div className="left">
                <img className="logo" src={brandLogoUrl()} alt="" />
                Wallet
              </div>
            </div>
            <div className="phone-body">
              <div className="mini-card" style={{ textAlign: 'center', padding: 22 }}>
                <img src="/coin.png" alt="" style={{ width: 42, height: 42, margin: '0 auto 8px' }} />
                <h4 style={{ fontSize: 22 }}>₹0</h4>
                <p>Add coins in the app</p>
              </div>
              <div className="mini-card">
                <h4>Transactions</h4>
                <p>Wins, entries, top-ups</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
