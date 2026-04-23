import { useState, useEffect } from 'react';
import api from '../api';

export default function Sweeps() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSweeps = async () => {
      try {
        const { data } = await api.get('/matches/sweeps');
        setMatches(data.matches);
      } catch (err) {
        console.error('Failed to fetch sweeps:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSweeps();
  }, []);

  const formatSets = (sets) =>
    sets.map((s) => `${s.winnerScore}-${s.loserScore}${s.tiebreak ? '*' : ''}`).join('  ');

  const getSurfaceBadge = (surface) => {
    const cls =
      surface === 'Hard'
        ? 'badge-hard'
        : surface === 'Clay'
        ? 'badge-clay'
        : surface === 'Grass'
        ? 'badge-grass'
        : 'badge-hard';
    return <span className={`badge ${cls}`}>{surface}</span>;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ⚡ 6-0 Sweeps
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Matches where a set was won with a dominant 6-0 scoreline
        </p>
      </div>

      {/* Stats Badge */}
      {!loading && (
        <div className="animate-fade-up" style={{ marginBottom: '1.5rem', animationDelay: '0.1s' }}>
          <div
            className="glass-card"
            style={{ display: 'inline-flex', padding: '0.75rem 1.25rem', alignItems: 'center', gap: '0.5rem' }}
          >
            <span className="stat-number" style={{ fontSize: '1.5rem' }}>{matches.length}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>matches with a 6-0 set found</span>
          </div>
        </div>
      )}

      {/* Match List */}
      <div
        className="glass-card animate-fade-up"
        style={{ overflow: 'hidden', animationDelay: '0.2s' }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : matches.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No 6-0 sweeps found in the dataset.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
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
