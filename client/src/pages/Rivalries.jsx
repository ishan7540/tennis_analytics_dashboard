import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Rivalries() {
  const [rivalries, setRivalries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRivalries = async () => {
      try {
        const { data } = await api.get('/matches/top-rivalries?limit=20');
        setRivalries(data);
      } catch (err) {
        console.error('Failed to fetch rivalries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRivalries();
  }, []);

  const getSurfaceBadge = (surface) => {
    const cls =
      surface === 'Hard' ? 'badge-hard' : surface === 'Clay' ? 'badge-clay' : surface === 'Grass' ? 'badge-grass' : 'badge-hard';
    return (
      <span key={surface} className={`badge ${cls}`} style={{ marginRight: '0.25rem' }}>
        {surface}
      </span>
    );
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
          🔥 Top Rivalries
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Player pairs who faced each other the most in the dataset
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rivalries.map((r, idx) => {
            const leading = r.playerA.wins >= r.playerB.wins ? 'A' : 'B';
            const aWinPct = Math.round((r.playerA.wins / r.totalMatches) * 100);
            const bWinPct = 100 - aWinPct;

            return (
              <div
                key={idx}
                className="glass-card animate-fade-up"
                style={{
                  padding: '1.25rem 1.5rem',
                  animationDelay: `${idx * 0.04}s`,
                }}
              >
                {/* Top row: Rank badge + match count */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: idx < 3 ? 'var(--gradient-brand)' : 'rgba(148,163,184,0.1)',
                        color: idx < 3 ? 'white' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.tournamentCount} tournament{r.tournamentCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {r.surfaces.map((s) => getSurfaceBadge(s))}
                  </div>
                </div>

                {/* Player vs Player row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: '1rem',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  {/* Player A */}
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/players/${r.playerA._id}`)}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color:
                          leading === 'A' ? 'var(--accent-emerald)' : 'var(--text-primary)',
                        marginBottom: '0.125rem',
                      }}
                    >
                      {r.playerA.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.playerA.nationality}
                      {r.playerA.rank ? ` · #${r.playerA.rank}` : ''}
                    </div>
                  </div>

                  {/* Center: total matches */}
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '0.5rem 1rem',
                      background: 'rgba(16,185,129,0.08)',
                      borderRadius: '10px',
                      border: '1px solid rgba(16,185,129,0.15)',
                    }}
                  >
                    <div className="stat-number" style={{ fontSize: '1.5rem' }}>
                      {r.totalMatches}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                      MATCHES
                    </div>
                  </div>

                  {/* Player B */}
                  <div
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                    onClick={() => navigate(`/players/${r.playerB._id}`)}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color:
                          leading === 'B' ? 'var(--accent-emerald)' : 'var(--text-primary)',
                        marginBottom: '0.125rem',
                      }}
                    >
                      {r.playerB.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.playerB.nationality}
                      {r.playerB.rank ? ` · #${r.playerB.rank}` : ''}
                    </div>
                  </div>
                </div>

                {/* Win breakdown bar */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      marginBottom: '0.375rem',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: leading === 'A' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                      }}
                    >
                      {r.playerA.wins} wins ({aWinPct}%)
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: leading === 'B' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                      }}
                    >
                      {r.playerB.wins} wins ({bWinPct}%)
                    </span>
                  </div>

                  {/* Stacked progress bar */}
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: 'rgba(148,163,184,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: `${aWinPct}%`,
                        height: '100%',
                        background:
                          leading === 'A'
                            ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                            : 'rgba(148,163,184,0.2)',
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                        borderRadius: '4px 0 0 4px',
                      }}
                    />
                    <div
                      style={{
                        width: `${bWinPct}%`,
                        height: '100%',
                        background:
                          leading === 'B'
                            ? 'linear-gradient(90deg, #14b8a6, #06b6d4)'
                            : 'rgba(148,163,184,0.2)',
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                        borderRadius: '0 4px 4px 0',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
