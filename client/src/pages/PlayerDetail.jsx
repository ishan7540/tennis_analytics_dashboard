import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import api from '../api';

const SURFACE_COLORS = { Hard: '#06b6d4', Clay: '#f59e0b', Grass: '#10b981', Carpet: '#a855f7' };
const SURFACE_LABELS = { Hard: '🏟️ Hard', Clay: '🧱 Clay', Grass: '🌿 Grass', Carpet: '🟣 Carpet' };

export default function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, matchRes] = await Promise.all([
          api.get(`/players/${id}/stats`),
          api.get(`/players/${id}/matches?limit=30`),
        ]);
        setData(statsRes.data);
        setMatches(matchRes.data.matches || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load player stats');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-rose)' }}>{error}</div>
      </div>
    );
  }

  const { player, stats } = data;
  const totalWins = stats.reduce((sum, s) => sum + s.wins, 0);
  const totalMatches = stats.reduce((sum, s) => sum + s.total, 0);
  const overallWinPct = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  const pieData = stats.map((s) => ({
    name: s.surface, value: s.wins, percentage: s.winPercentage, total: s.total,
  }));

  const formatSets = (sets) =>
    sets.map((s) => `${s.winnerScore}-${s.loserScore}${s.tiebreak ? '*' : ''}`).join('  ');

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.8125rem',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{SURFACE_LABELS[d.name] || d.name}</p>
          <p style={{ color: 'var(--text-secondary)' }}>{d.value} wins / {d.total} matches ({d.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <button onClick={() => navigate('/')} style={{
        background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
        fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
      }}>← Back to Dashboard</button>

      {/* Player Card */}
      <div className="glass-card animate-fade-up animate-pulse-glow" style={{
        padding: '2rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: 'var(--gradient-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: 'white', flexShrink: 0,
        }}>
          {player.name?.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>{player.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>🌍 {player.nationality}</span>
            <span>📊 Rank #{player.rank || 'N/A'}</span>
            <span>{player.hand === 'R' ? '🫱 Right' : player.hand === 'L' ? '🫲 Left' : '❓ Unknown'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <div className="stat-number">{overallWinPct}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Win Rate</div>
          </div>
          <div>
            <div className="stat-number" style={{ fontSize: '2rem' }}>{totalWins}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wins</div>
          </div>
          <div>
            <div className="stat-number" style={{ fontSize: '2rem' }}>{totalMatches}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matches</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Pie Chart */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.15s' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>🏆 Wins by Surface</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                  {pieData.map((entry) => <Cell key={entry.name} fill={SURFACE_COLORS[entry.name] || '#64748b'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{SURFACE_LABELS[v] || v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>No data</p>
          )}
        </div>

        {/* Surface Breakdown */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.25s' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>📊 Surface Breakdown</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats.map((s) => {
              const color = SURFACE_COLORS[s.surface] || '#64748b';
              return (
                <div key={s.surface} className="match-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{SURFACE_LABELS[s.surface] || s.surface}</span>
                    <span style={{ color, fontWeight: 700 }}>{s.winPercentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(148,163,184,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${s.winPercentage}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                    {s.wins}W / {s.total - s.wins}L — {s.total} matches
                  </div>
                </div>
              );
            })}
            {stats.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No data</p>}
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      {matches.length > 0 && (
        <div className="glass-card animate-fade-up" style={{ overflow: 'hidden', animationDelay: '0.35s' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.875rem' }}>
            📋 Recent Matches ({matches.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Result</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Tournament</th>
                  <th>Surface</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, idx) => {
                  const isWinner = m.winner_id?._id === id;
                  const opponent = isWinner ? m.loser_id : m.winner_id;
                  const surfaceCls = m.surface === 'Hard' ? 'badge-hard' : m.surface === 'Clay' ? 'badge-clay' : m.surface === 'Grass' ? 'badge-grass' : 'badge-hard';
                  return (
                    <tr key={idx}>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                          background: isWinner ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                          color: isWinner ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          fontWeight: 700, fontSize: '0.7rem',
                        }}>
                          {isWinner ? 'W' : 'L'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{opponent?.name || 'Unknown'}</td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatSets(m.sets)}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{m.tourney_name}</td>
                      <td><span className={`badge ${surfaceCls}`}>{m.surface}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
