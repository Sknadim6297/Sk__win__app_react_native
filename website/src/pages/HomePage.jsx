import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import TournamentCard from '../components/TournamentCard';
import PhoneShowcase from '../components/PhoneShowcase';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { BRAND, HOW_IT_WORKS, WHY } from '../content';
import { inr, mediaUrl, statusBucket } from '../utils';

export default function HomePage() {
  const { data, loading } = useFetch(async () => {
    const [tournaments, home, sliders, games, board, news, site] = await Promise.all([
      api.tournaments().catch(() => []),
      api.homeConfig().catch(() => ({})),
      api.sliders().catch(() => []),
      api.games().catch(() => []),
      api.leaderboard('all').catch(() => ({ players: [] })),
      api.announcements().catch(() => []),
      api.site().catch(() => ({ stats: {}, recentWithdrawals: [], modes: [] })),
    ]);
    const ff = (Array.isArray(games) ? games : []).find((g) => /free\s*fire/i.test(g.name || '')) || games?.[0];
    const modesFromGame = ff?._id ? await api.gameModes(ff._id).catch(() => []) : [];
    return { tournaments, home, sliders, modesFromGame, board, news, site };
  }, []);

  const list = Array.isArray(data?.tournaments) ? data.tournaments : [];
  const liveUp = list.filter((t) => statusBucket(t) !== 'completed').slice(0, 6);
  const done = list.filter((t) => statusBucket(t) === 'completed').slice(0, 3);
  const players = data?.board?.players || [];
  const news = Array.isArray(data?.news) ? data.news.slice(0, 3) : [];
  const siteModes = Array.isArray(data?.site?.modes) ? data.site.modes : [];
  const gameModes = Array.isArray(data?.modesFromGame) ? data.modesFromGame : [];
  const modeCards = (siteModes.length ? siteModes : gameModes).slice(0, 6);
  const modes = modeCards.map((m) => ({
    name: (m.name || 'MODE').toUpperCase(),
    image: mediaUrl(m.image),
  }));
  const ticker = data?.home?.latestAnnouncementTitle || data?.home?.latestNews?.text;
  const stats = data?.site?.stats || {};
  const withdrawals = Array.isArray(data?.site?.recentWithdrawals)
    ? data.site.recentWithdrawals.filter((w) => Number(w.amount) > 0)
    : [];

  return (
    <>
      <Seo title="Home" />
      <section className="hero">
        <div className="container hero-grid">
          <div className="fade-up">
            <p className="kicker">Free Fire esports</p>
            <h1>
              {BRAND.motto.split('. ').map((part, i, arr) => (
                <span key={part}>
                  {i === arr.length - 1 ? <span>{part.replace(/\.$/, '')}</span> : `${part}. `}
                </span>
              ))}
            </h1>
            <p className="lede">
              {BRAND.tagline} Browse live Clash Squad and Battle Royale matches here — join and get
              paid from the official WAREZONE Android app.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/download">
                Download App
              </Link>
              <Link className="btn btn-ghost" to="/tournaments">
                View Tournaments
              </Link>
            </div>
            <div className="hero-meta">
              <div>
                <strong>{stats.totalUsers ?? '—'}</strong>
                Players
              </div>
              <div>
                <strong>{stats.totalMatches ?? '—'}</strong>
                Matches played
              </div>
              <div>
                <strong>{stats.totalWinnings != null ? `₹${inr(stats.totalWinnings)}` : '—'}</strong>
                Total winnings
              </div>
            </div>
          </div>
          <PhoneShowcase news={ticker} modes={modes} liveName={liveUp[0]?.name} />
        </div>
      </section>

      {Array.isArray(data?.sliders) && data.sliders[0]?.image && (
        <section className="section" style={{ paddingTop: 10 }}>
          <div className="container">
            <img
              src={data.sliders[0].image}
              alt="WAREZONE tournament banner"
              style={{ width: '100%', borderRadius: 22, maxHeight: 280, objectFit: 'cover' }}
              loading="lazy"
            />
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Live stats</h2>
              <p className="sub">Pulled live from the WAREZONE database — not placeholder numbers.</p>
            </div>
          </div>
          <div className="big-stats">
            <article className="card big-stat">
              <strong>{inr(stats.totalUsers || 0)}</strong>
              <span>Total Users</span>
            </article>
            <article className="card big-stat">
              <strong>{inr(stats.totalMatches || 0)}</strong>
              <span>Total Matches Played</span>
            </article>
            <article className="card big-stat">
              <strong>₹{inr(stats.totalWinnings || 0)}</strong>
              <span>Total Winnings</span>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Recent withdrawals</h2>
              <p className="sub">Latest wallet withdrawals from the app. Amounts are real.</p>
            </div>
          </div>
          {withdrawals.length === 0 ? (
            <p className="empty">No withdrawals yet. They show here after players cash out in the app.</p>
          ) : (
            <div className="withdraw-list card">
              {withdrawals.map((w, i) => (
                <div className="withdraw-row" key={`${w.name}-${w.at}-${i}`}>
                  <span className="withdraw-name">{w.name}</span>
                  <span className="withdraw-amt">₹{inr(w.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Tournament modes</h2>
              <p className="sub">Modes configured in Arena Control for Free Fire.</p>
            </div>
            <Link className="link" to="/tournaments">
              Browse matches →
            </Link>
          </div>
          {modeCards.length === 0 ? (
            <p className="empty">Add game modes in the admin panel to show them here.</p>
          ) : (
            <div className="grid-3">
              {modeCards.map((m) => (
                <article className="card mode-card" key={m.id || m.name}>
                  {m.image ? <img className="mode-card-img" src={mediaUrl(m.image)} alt="" /> : null}
                  <h3>{m.name}</h3>
                  <p>{m.description || 'Join this mode from the WAREZONE app.'}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Live tournaments</h2>
              <p className="sub">Upcoming and live matches from the same backend as the app.</p>
            </div>
            <Link className="link" to="/tournaments">
              All matches →
            </Link>
          </div>
          {loading ? (
            <div className="grid-3">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : liveUp.length === 0 ? (
            <p className="empty">No live or upcoming matches right now. Check back soon.</p>
          ) : (
            <div className="grid-3">
              {liveUp.map((t) => (
                <TournamentCard key={t._id} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Why WAREZONE</h2>
              <p className="sub">Built around the features already in the mobile app.</p>
            </div>
          </div>
          <div className="grid-2">
            {WHY.map((w) => (
              <article className="card why-card" key={w.title}>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>How it works</h2>
              <p className="sub">Register, join, and withdraw from the official Android app.</p>
            </div>
            <Link className="link" to="/how-it-works">
              Full guide →
            </Link>
          </div>
          <div className="grid-3">
            {HOW_IT_WORKS.map((s) => (
              <article className="card step-card" key={s.n}>
                <div className="step-num">
                  {s.n} — {s.title}
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>App showcase</h2>
              <p className="sub">The same dark WAREZONE UI — home, contest details, and wallet.</p>
            </div>
            <Link className="btn btn-green btn-sm" to="/download">
              Get the app
            </Link>
          </div>
          <PhoneShowcase news={ticker} modes={modes} liveName={liveUp[0]?.name} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Leaderboard preview</h2>
              <p className="sub">Top players from the live ranking API.</p>
            </div>
            <Link className="link" to="/leaderboard">
              Full board →
            </Link>
          </div>
          {players.length === 0 ? (
            <p className="empty">Rankings appear after players complete matches.</p>
          ) : (
            <div className="card">
              {players.slice(0, 5).map((p) => (
                <div className="lb-row" key={p.id}>
                  <strong>#{p.rank}</strong>
                  <div className="player">
                    <img className="avatar" src={p.photo ? mediaUrl(p.photo) : '/avatar.png'} alt="" />
                    {p.name}
                  </div>
                  <span className="lb-hide">{p.wins} wins</span>
                  <span>{p.points} pts</span>
                  <span className="prize lb-hide">₹{p.earnings}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Latest results</h2>
              <p className="sub">Recently completed matches.</p>
            </div>
            <Link className="link" to="/results">
              All results →
            </Link>
          </div>
          {done.length === 0 ? (
            <p className="empty">No published results yet.</p>
          ) : (
            <div className="grid-3">
              {done.map((t) => (
                <TournamentCard key={t._id} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>News</h2>
              <p className="sub">Announcements from Arena Control.</p>
            </div>
            <Link className="link" to="/news">
              All news →
            </Link>
          </div>
          {news.length === 0 ? (
            <p className="empty">No announcements yet.</p>
          ) : (
            <div className="grid-3">
              {news.map((n) => (
                <Link key={n.id} to={`/news/${n.id}`} className="card news-card">
                  <div className="badge badge-up">{n.category}</div>
                  <h3 style={{ marginTop: 10 }}>{n.title}</h3>
                  <p>{n.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container">
        <div className="cta-band">
          <h2>Ready to enter the arena?</h2>
          <p className="muted" style={{ marginBottom: 18 }}>
            Download WAREZONE and join the next Free Fire tournament.
          </p>
          <Link className="btn btn-primary" to="/download">
            Download App
          </Link>
        </div>
      </div>
    </>
  );
}
