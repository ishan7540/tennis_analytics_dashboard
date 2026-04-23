import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api';

const SURFACE_COLORS = { Hard: '#06b6d4', Clay: '#f59e0b', Grass: '#10b981', Carpet: '#a855f7' };

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [topWinners, setTopWinners] = useState([]);
  const [surfaceStats, setSurfaceStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurface, setSelectedSurface] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTopWinners();
  }, [selectedSurface]);

  const fetchData = async () => {
    try {
      const [tourRes, surfRes] = await Promise.all([
        api.get('/matches/tournament-stats?limit=25'),
        api.get('/matches/surface-stats'),
      ]);
      setTournaments(tourRes.data);
      setSurfaceStats(surfRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchTopWinners = async () => {
    try {
      const params = selectedSurface ? `?surface=${selectedSurface}&limit=15` : '?limit=15';
      const { data } = await api.get(`/matches/top-winners${params}`);
      setTopWinners(data);
    } catch (err) { console.error(err); }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.8125rem',
        }}>
          <p style={{ fontWeight: 600 }}>{label}</p>
          <p style={{ color: 'var(--accent-emerald)' }}>{payload[0]?.value} matches</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  const chartData = tournaments.slice(0, 15).map((t) => ({
    name: t.tournament.length > 18 ? t.tournament.slice(0, 16) + '…' : t.tournament,
    fullName: t.tournament,
    matches: t.matchCount,
    surfaces: t.surfaces,
  }));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          🏆 Tournament Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Explore tournament data, surface distribution, and top winners
        </p>
      </div>

      {/* Surface Stats Cards */}
      <div className="animate-fade-up" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.75rem', marginBottom: '1.5rem', animationDelay: '0.05s',
      }}>
        {surfaceStats.map((s) => (
          <div key={s.surface} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: SURFACE_COLORS[s.surface] || '#64748b' }}>
              {s.matchCount.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
              {s.surface === 'Hard' ? '🏟️' : s.surface === 'Clay' ? '🧱' : s.surface === 'Grass' ? '🌿' : '🟣'} {s.surface}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Tournament Bar Chart */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.1s' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Top Tournaments by Matches</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="matches" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={`hsl(${160 + idx * 8}, 70%, ${55 - idx * 1.5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Winners */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>🏅 Top Winners</h2>
            <select
              className="input-field"
              value={selectedSurface}
              onChange={(e) => setSelectedSurface(e.target.value)}
              style={{ width: '140px' }}
              id="filter-top-surface"
            >
              <option value="">All Surfaces</option>
              <option value="Hard">🏟️ Hard</option>
              <option value="Clay">🧱 Clay</option>
              <option value="Grass">🌿 Grass</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {topWinners.map((w, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0', borderBottom: '1px solid rgba(148,163,184,0.06)',
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  background: idx < 3 ? 'var(--gradient-brand)' : 'rgba(148,163,184,0.1)',
                  color: idx < 3 ? 'white' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {w.nationality} · {w.tournamentCount} tournaments
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.875rem' }}>{w.wins}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> wins</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Tournament Table */}
      <div className="glass-card animate-fade-up" style={{ marginTop: '1.5rem', overflow: 'hidden', animationDelay: '0.3s' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.875rem' }}>
          All Tournaments
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tournament</th>
                <th>Matches</th>
                <th>Surfaces</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t, idx) => (
                <tr key={idx}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{t.tournament}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: '2.5rem', padding: '0.25rem 0.5rem', borderRadius: '8px',
                      background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.8125rem',
                    }}>
                      {t.matchCount}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {t.surfaces.map((s) => {
                        const cls = s === 'Hard' ? 'badge-hard' : s === 'Clay' ? 'badge-clay' : s === 'Grass' ? 'badge-grass' : 'badge-hard';
                        return <span key={s} className={`badge ${cls}`}>{s}</span>;
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
