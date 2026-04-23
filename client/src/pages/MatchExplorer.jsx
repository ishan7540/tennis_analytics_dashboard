import { useState, useEffect } from 'react';
import api from '../api';

const MATCH_TYPES = [
  {
    key: 'sweeps',
    label: '🧹 6-0 Sweeps',
    desc: 'Sets won 6-0 (bagels)',
    endpoint: '/matches/sweeps',
    query: '$elemMatch: { winnerScore: 6, loserScore: 0 }',
  },
  {
    key: 'tiebreakers',
    label: '🎯 Tiebreakers',
    desc: 'Sets decided by tiebreak',
    endpoint: '/matches/tiebreakers',
    query: '$elemMatch: { tiebreak: true }',
  },
  {
    key: 'close-sets',
    label: '🤏 Close Sets (7-5)',
    desc: 'Sets that went 7-5',
    endpoint: '/matches/close-sets',
    query: '$elemMatch: { winnerScore: 7, loserScore: 5 }',
  },
  {
    key: 'three-setters',
    label: '🔥 Three-Setters',
    desc: 'Matches going to a deciding set',
    endpoint: '/matches/three-setters',
    query: '$expr: { $eq: [{ $size: "$sets" }, 3] }',
  },
  {
    key: 'straights',
    label: '⚡ Straight Sets',
    desc: 'Won in exactly 2 sets',
    endpoint: '/matches/straights',
    query: '$expr: { $eq: [{ $size: "$sets" }, 2] }',
  },
  {
    key: 'dominant',
    label: '💪 Dominant Wins',
    desc: 'Every set won 6-0 or 6-1',
    endpoint: '/matches/dominant-wins',
    query: '$not: { $elemMatch: { loserScore: { $gt: 1 } } }',
  },
];

export default function MatchExplorer() {
  const [activeType, setActiveType] = useState('sweeps');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, [activeType]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const type = MATCH_TYPES.find((t) => t.key === activeType);
      const { data } = await api.get(type.endpoint);
      setMatches(data.matches || []);
      setTotalCount(data.count || data.totalCount || data.matches?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatSets = (sets) =>
    sets.map((s) => `${s.winnerScore}-${s.loserScore}${s.tiebreak ? '*' : ''}`).join('  ');

  const getSurfaceBadge = (surface) => {
    const cls =
      surface === 'Hard' ? 'badge-hard' : surface === 'Clay' ? 'badge-clay' : surface === 'Grass' ? 'badge-grass' : 'badge-hard';
    return <span className={`badge ${cls}`}>{surface}</span>;
  };

  const activeInfo = MATCH_TYPES.find((t) => t.key === activeType);

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
          🔎 Match Explorer
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Explore matches by type — each filter uses a different MongoDB query
        </p>
      </div>

      {/* Filter Buttons */}
      <div
        className="animate-fade-up"
        style={{
          display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
          marginBottom: '1.5rem', animationDelay: '0.05s',
        }}
      >
        {MATCH_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => setActiveType(type.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              border: `1px solid ${activeType === type.key ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}`,
              background: activeType === type.key ? 'rgba(16,185,129,0.12)' : 'rgba(15,23,42,0.4)',
              color: activeType === type.key ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Active Query Info */}
      <div
        className="glass-card animate-fade-up"
        style={{ padding: '1rem 1.25rem', marginBottom: '1rem', animationDelay: '0.1s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{activeInfo.desc}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.75rem' }}>
              {totalCount !== null && `${totalCount} matches found`}
            </span>
          </div>
          <code
            style={{
              fontSize: '0.7rem', color: 'var(--accent-cyan)',
              background: 'rgba(6,182,212,0.08)', padding: '0.35rem 0.75rem',
              borderRadius: '6px', fontFamily: 'monospace',
            }}
          >
            {activeInfo.query}
          </code>
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-card animate-fade-up" style={{ overflow: 'hidden', animationDelay: '0.15s' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : matches.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No matches found for this filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Winner</th>
                  <th>Loser</th>
                  <th>Score</th>
                  <th>Tournament</th>
                  <th>Surface</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      {match.winner_id?.name || 'Unknown'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {match.loser_id?.name || 'Unknown'}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {formatSets(match.sets)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {match.tourney_name}
                    </td>
                    <td>{getSurfaceBadge(match.surface)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
