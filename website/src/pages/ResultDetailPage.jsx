import { Link, useParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../api';
import { useFetch } from '../hooks/useFetch';
import { inr } from '../utils';

export default function ResultDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => api.results(id), [id]);

  const pending = data?.resultPending;
  const br = data?.isBattleRoyale || data?.tournamentType === 'battle_royale';
  const brRows = br ? data?.leaderboard || [] : [];
  const teams = data?.customMatch?.teams || [];

  return (
    <>
      <Seo title={data?.tournament?.name ? `${data.tournament.name} results` : 'Match result'} />
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Result</p>
          <h1>{data?.tournament?.name || 'Match result'}</h1>
          <p className="muted">{br ? 'Battle Royale' : 'Clash Squad'}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 12 }}>
        <div className="container">
          {loading && <div className="skeleton" />}
          {error && (
            <p className="error">
              {error} — results are only shown after they are published in the app.
            </p>
          )}
          {pending && <p className="empty">{data.message || 'Result not published yet.'}</p>}
          {!loading && !error && !pending && br && (
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Kills</th>
                    <th>Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {brRows.map((r) => (
                    <tr key={r.userId || r.rank}>
                      <td>#{r.rank}</td>
                      <td>{r.gamingID || r.username || 'Player'}</td>
                      <td>{r.kills ?? '—'}</td>
                      <td className="prize">₹{inr(r.prize || r.totalReward)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && !pending && !br && (
            <div className="grid-2">
              {(teams).map((team) => (
                <article className="card" key={team._id} style={{ padding: 20 }}>
                  <div className={`badge ${team.isWinner ? 'badge-done' : 'badge-up'}`}>
                    {team.isWinner ? 'Winner' : `Team ${team.side || ''}`}
                  </div>
                  <h3 style={{ marginTop: 10 }}>{team.name}</h3>
                  <ul className="rules">
                    {(team.members || []).map((m) => (
                      <li key={m.userId}>{m.gamingUsername || m.username}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
          <div style={{ marginTop: 22 }}>
            <Link className="btn btn-ghost" to={`/tournaments/${id}`}>
              Match details
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
