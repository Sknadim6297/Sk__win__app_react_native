import { useState } from 'react';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { mediaUrl } from '../utils';

const PERIODS = [
  { id: 'all', label: 'ALL TIME' },
  { id: 'month', label: 'THIS MONTH' },
  { id: 'week', label: 'THIS WEEK' },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('all');
  const { data, loading, error } = useFetch(() => api.leaderboard(period), [period]);
  const players = data?.players || [];
  const top = players.slice(0, 3);
  const rest = players.slice(3);
  const order = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <>
      <Seo title="Leaderboard" description="WAREZONE top players — all time, this month, this week." />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Top players</p>
          <h1>Leaderboard</h1>
          <p className="muted">Live ranking from the WAREZONE player API.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 12 }}>
        <div className="container">
          <div className="filters" style={{ marginBottom: 22 }}>
            {PERIODS.map((p) => (
              <button key={p.id} className={`chip ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          {loading && <div className="skeleton" />}
          {error && <p className="error">{error}</p>}
          {!loading && players.length === 0 && <p className="empty">No ranked players for this period yet.</p>}

          {top.length > 0 && (
            <div className="podium">
              {order.map((p) => (
                <article className={`card podium-card ${p.rank === 1 ? 'gold' : ''}`} key={p.id}>
                  <div className="rank">RANK {p.rank}</div>
                  <img
                    className="avatar"
                    src={p.photo ? mediaUrl(p.photo) : '/avatar.png'}
                    alt=""
                    style={{ width: 64, height: 64, margin: '12px auto' }}
                  />
                  <h3>{p.name}</h3>
                  <p className="muted">{p.wins} wins · {p.points} pts</p>
                  <p className="prize">₹{p.earnings}</p>
                </article>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="card">
              <div className="lb-row dim" style={{ fontSize: 12 }}>
                <span>#</span>
                <span>Player</span>
                <span>Wins</span>
                <span className="lb-hide">Points</span>
                <span className="lb-hide">Prize</span>
              </div>
              {rest.map((p) => (
                <div className="lb-row" key={p.id}>
                  <strong>{p.rank}</strong>
                  <div className="player">
                    <img className="avatar" src={p.photo ? mediaUrl(p.photo) : '/avatar.png'} alt="" />
                    {p.name}
                  </div>
                  <span>{p.wins}</span>
                  <span className="lb-hide">{p.points}</span>
                  <span className="prize lb-hide">₹{p.earnings}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
