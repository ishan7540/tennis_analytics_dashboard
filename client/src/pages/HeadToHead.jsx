import { useState, useEffect } from 'react';
import api from '../api';
import SearchableSelect from '../components/SearchableSelect';

export default function HeadToHead() {
  const [players, setPlayers] = useState([]);
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/players').then(({ data }) => {
      const list = data.players || data;
      setPlayers(list);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!player1 || !player2) {
      setError('Please select both players');
      return;
    }
    if (player1 === player2) {
      setError('Please select two different players');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.get(`/matches/head-to-head?player1=${player1}&player2=${player2}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch head-to-head data');
    } finally {
      setLoading(false);
    }
  };

  const getSurfaceBadge = (surface) => {
    const cls = surface === 'Hard' ? 'badge-hard' : surface === 'Clay' ? 'badge-clay' : surface === 'Grass' ? 'badge-grass' : 'badge-hard';
    return <span className={`badge ${cls}`}>{surface}</span>;
  };

  const formatSets = (sets) =>
    sets.map((s) => `${s.winnerScore}-${s.loserScore}${s.tiebreak ? '*' : ''}`).join('  ');

  const p1Name = players.find((p) => p._id === player1)?.name || 'Player 1';
  const p2Name = players.find((p) => p._id === player2)?.name || 'Player 2';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Head-to-Head
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Search and compare any two players — type a name to find them
        </p>
      </div>

      {/* Selection Form with Searchable Dropdowns */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.5rem', animationDelay: '0.1s' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>
              Player 1
            </label>
            <SearchableSelect
              players={players}
              value={player1}
              onChange={setPlayer1}
              placeholder='Search player 1 (e.g. "Sinner")...'
              id="search-player1"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0.5rem' }}>
            VS
          </div>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>
              Player 2
            </label>
            <SearchableSelect
              players={players}
              value={player2}
              onChange={setPlayer2}
              placeholder='Search player 2 (e.g. "Alcaraz")...'
              id="search-player2"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} id="btn-compare">
            {loading ? 'Loading…' : 'Compare'}
          </button>
        </form>
        {error && (
          <p style={{ color: 'var(--accent-rose)', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="animate-fade-up">
          {/* Summary Cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem',
            marginBottom: '1.5rem', alignItems: 'center',
          }}>
            <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{
                fontSize: '2rem', fontWeight: 800,
                color: result.player1Wins >= result.player2Wins ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              }}>
                {result.player1Wins}
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.25rem' }}>{p1Name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>wins</div>
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0 0.5rem', textAlign: 'center' }}>
              <div>{result.totalMatches}</div>
              <div style={{ fontSize: '0.75rem' }}>matches</div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{
                fontSize: '2rem', fontWeight: 800,
                color: result.player2Wins >= result.player1Wins ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              }}>
                {result.player2Wins}
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.25rem' }}>{p2Name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>wins</div>
            </div>
          </div>

          {/* No matches */}
          {result.totalMatches === 0 && (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              These players have not faced each other in the dataset.
            </div>
          )}

          {/* Match List */}
          {result.matches.length > 0 && (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.875rem' }}>
                Match History
              </div>
              {result.matches.map((match, idx) => (
                <div key={idx} className="match-card" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: idx === 0 ? 'none' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>🏆 {match.winner.name}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>def.</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{match.loser.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {formatSets(match.sets)}
                      </span>
                      {getSurfaceBadge(match.surface)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                    📍 {match.tourney_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
