import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../api';

const HAND_COLORS = { R: '#06b6d4', L: '#f59e0b', U: '#64748b' };
const HAND_LABELS = { R: '🫱 Right', L: '🫲 Left', U: '❓ Unknown' };

export default function PlayerInsights() {
  const [handStats, setHandStats] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [leftPlayers, setLeftPlayers] = useState([]);
  const [rankedPlayers, setRankedPlayers] = useState([]);
  const [rankMin, setRankMin] = useState(20);
  const [rankMax, setRankMax] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchRankRange();
  }, [rankMin, rankMax]);

  const fetchAll = async () => {
    try {
      const [handRes, countryRes, leftRes] = await Promise.all([
        api.get('/players/hand-stats'),
        api.get('/players/top-countries?limit=15'),
        api.get('/players/left-handed'),
      ]);
      setHandStats(handRes.data);
      setCountryStats(countryRes.data);
      setLeftPlayers(leftRes.data.players || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRankRange = async () => {
    try {
      const { data } = await api.get(`/players/rank-range?min=${rankMin}&max=${rankMax}`);
      setRankedPlayers(data.players || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handPieData = handStats.map((h) => ({
    name: HAND_LABELS[h._id] || h._id,
    value: h.count,
    key: h._id,
  }));

  const countryBarData = countryStats.map((c) => ({
    name: c._id,
    players: c.playerCount,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.8125rem',
        }}>
          <p style={{ fontWeight: 600 }}>{payload[0]?.payload?.name || payload[0]?.name}</p>
          <p style={{ color: 'var(--accent-emerald)' }}>{payload[0]?.value} players</p>
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

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}
        >
          📊 Player Insights
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Player demographics and distributions using simple MongoDB queries
        </p>
      </div>

      {/* Row 1: Hand stats + Country stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Hand Distribution — uses $group by hand */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.05s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>🫱 Hand Distribution</h2>
            <code style={{
              fontSize: '0.65rem', color: 'var(--accent-cyan)',
              background: 'rgba(6,182,212,0.08)', padding: '0.25rem 0.5rem',
              borderRadius: '4px',
            }}>$group: hand</code>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={handPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
                stroke="none"
              >
                {handPieData.map((entry) => (
                  <Cell key={entry.key} fill={HAND_COLORS[entry.key] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
            {handStats.map((h) => (
              <div key={h._id} style={{ textAlign: 'center' }}>
                <span style={{ color: HAND_COLORS[h._id], fontWeight: 700, fontSize: '1.25rem' }}>
                  {h.count}
                </span>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {HAND_LABELS[h._id] || h._id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Countries — uses $group by nationality */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>🌍 Top Countries</h2>
            <code style={{
              fontSize: '0.65rem', color: 'var(--accent-cyan)',
              background: 'rgba(6,182,212,0.08)', padding: '0.25rem 0.5rem',
              borderRadius: '4px',
            }}>$group + $sort + $limit</code>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={countryBarData} layout="vertical" margin={{ left: 5, right: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={40} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="players" radius={[0, 4, 4, 0]}>
                {countryBarData.map((_, idx) => (
                  <Cell key={idx} fill={`hsl(${160 + idx * 10}, 65%, ${55 - idx * 1.5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Left-handed + Rank range */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Left-handed Players — uses find({ hand: 'L' }) */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.15s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>🫲 Left-Handed Players ({leftPlayers.length})</h2>
            <code style={{
              fontSize: '0.65rem', color: 'var(--accent-cyan)',
              background: 'rgba(6,182,212,0.08)', padding: '0.25rem 0.5rem',
              borderRadius: '4px',
            }}>find(&#123; hand: &apos;L&apos; &#125;)</code>
          </div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {leftPlayers.slice(0, 50).map((p, idx) => (
              <div
                key={p._id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: '1px solid rgba(148,163,184,0.06)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    {p.nationality}
                  </span>
                </div>
                {p.rank && (
                  <span style={{
                    background: 'rgba(245,158,11,0.1)', color: '#fbbf24',
                    padding: '0.2rem 0.5rem', borderRadius: '6px',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    #{p.rank}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rank Range — uses $gte / $lte */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>📋 Rank Range Finder</h2>
            <code style={{
              fontSize: '0.65rem', color: 'var(--accent-cyan)',
              background: 'rgba(6,182,212,0.08)', padding: '0.25rem 0.5rem',
              borderRadius: '4px',
            }}>$gte + $lte</code>
          </div>
          {/* Range inputs */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Min Rank</label>
              <input
                className="input-field"
                type="number"
                value={rankMin}
                onChange={(e) => setRankMin(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, paddingTop: '1rem' }}>—</span>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Max Rank</label>
              <input
                className="input-field"
                type="number"
                value={rankMax}
                onChange={(e) => setRankMax(parseInt(e.target.value) || 100)}
                min={1}
              />
            </div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{rankedPlayers.length}</span> players found in rank {rankMin}–{rankMax}
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {rankedPlayers.map((p, idx) => (
              <div
                key={p._id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: '1px solid rgba(148,163,184,0.06)',
                }}
              >
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '1.75rem', height: '1.75rem', borderRadius: '6px',
                    background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)',
                    fontWeight: 700, fontSize: '0.7rem', marginRight: '0.5rem',
                  }}>
                    {p.rank}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</span>
                </div>
                <span className="badge badge-hard">{p.nationality}</span>
              </div>
            ))}
            {rankedPlayers.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                No players in this rank range
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
