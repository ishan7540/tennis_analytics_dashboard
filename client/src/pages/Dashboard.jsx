import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState({ name: '', nationality: '', rank: '', hand: 'R' });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterHand, setFilterHand] = useState('');
  const [filterNat, setFilterNat] = useState('');
  const [rankedOnly, setRankedOnly] = useState(true);
  const [nationalities, setNationalities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlayers();
    fetchOverview();
    fetchNationalities();
  }, [sortField, sortOrder, filterHand, filterNat, rankedOnly]);

  const fetchPlayers = async () => {
    try {
      const params = new URLSearchParams();
      params.set('sort', sortField);
      params.set('order', sortOrder);
      if (filterHand) params.set('hand', filterHand);
      if (filterNat) params.set('nationality', filterNat);
      if (rankedOnly) params.set('rankedOnly', 'true');
      const { data } = await api.get(`/players?${params}`);
      setPlayers(data.players || data);
    } catch (err) {
      console.error('Failed to fetch players:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const { data } = await api.get('/matches/overview');
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    }
  };

  const fetchNationalities = async () => {
    try {
      const { data } = await api.get('/players/nationalities');
      setNationalities(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.nationality) return;
    setSubmitting(true);
    try {
      await api.post('/players', {
        ...form,
        rank: form.rank ? parseInt(form.rank, 10) : null,
      });
      setForm({ name: '', nationality: '', rank: '', hand: 'R' });
      fetchPlayers();
    } catch (err) {
      console.error('Failed to add player:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nationality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const surfaceColors = { Hard: '#06b6d4', Clay: '#f59e0b', Grass: '#10b981', Carpet: '#a855f7' };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Player Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Browse, search, sort, and manage tennis players
        </p>
      </div>

      {/* ===== STATS CARDS ===== */}
      {overview && (
        <div className="animate-fade-up" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem', marginBottom: '1.5rem', animationDelay: '0.05s',
        }}>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '1.75rem' }}>{players.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Players</div>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '1.75rem' }}>{overview.totalMatches?.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total Matches</div>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '1.75rem' }}>{overview.tiebreakerMatches?.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Tiebreaker Matches</div>
          </div>
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="stat-number" style={{ fontSize: '1.75rem' }}>{overview.sweepMatches}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>6-0 Sweeps</div>
          </div>
          {/* Surface breakdown mini bars */}
          <div className="glass-card" style={{ padding: '1rem', gridColumn: 'span 1' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Matches by Surface</div>
            {overview.bySurface?.map((s) => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: surfaceColors[s._id] || '#94a3b8', width: '38px', fontWeight: 600 }}>{s._id}</span>
                <div style={{ flex: 1, height: '4px', background: 'rgba(148,163,184,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(s.count / overview.totalMatches) * 100}%`,
                    height: '100%', background: surfaceColors[s._id] || '#64748b', borderRadius: '2px',
                  }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: '40px', textAlign: 'right' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Player Form */}
      <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem', animationDelay: '0.1s' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>➕ Add New Player</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>Player Name *</label>
            <input className="input-field" placeholder="e.g. Carlos Alcaraz" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required id="input-player-name" />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>Nationality *</label>
            <input className="input-field" placeholder="e.g. ESP" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} required id="input-player-nationality" />
          </div>
          <div style={{ flex: '0 1 100px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>Rank</label>
            <input className="input-field" type="number" placeholder="#" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} id="input-player-rank" />
          </div>
          <div style={{ flex: '0 1 100px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block' }}>Hand</label>
            <select className="input-field" value={form.hand} onChange={(e) => setForm({ ...form, hand: e.target.value })} id="select-player-hand">
              <option value="R">Right</option>
              <option value="L">Left</option>
              <option value="U">Unknown</option>
            </select>
          </div>
          <button className="btn-primary" type="submit" disabled={submitting} id="btn-add-player">
            {submitting ? 'Adding…' : 'Add Player'}
          </button>
        </form>
      </div>

      {/* ===== FILTERS & SEARCH BAR ===== */}
      <div className="animate-fade-up" style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center', animationDelay: '0.2s',
      }}>
        <input
          className="input-field"
          placeholder="🔍 Search by name or nationality..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: '1 1 250px', maxWidth: '350px' }}
          id="input-search-players"
        />
        <select className="input-field" value={filterHand} onChange={(e) => setFilterHand(e.target.value)} style={{ width: '130px' }} id="filter-hand">
          <option value="">All Hands</option>
          <option value="R">🫱 Right</option>
          <option value="L">🫲 Left</option>
          <option value="U">❓ Unknown</option>
        </select>
        <select className="input-field" value={filterNat} onChange={(e) => setFilterNat(e.target.value)} style={{ width: '130px' }} id="filter-nationality">
          <option value="">All Countries</option>
          {nationalities.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          onClick={() => setRankedOnly(!rankedOnly)}
          style={{
            background: rankedOnly ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)',
            color: rankedOnly ? 'var(--accent-emerald)' : 'var(--text-secondary)',
            border: `1px solid ${rankedOnly ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.15)'}`,
            borderRadius: '8px', padding: '0.5rem 0.875rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          id="toggle-ranked-only"
        >
          {rankedOnly ? '✓ Ranked Only' : 'Show All'}
        </button>
        {(filterHand || filterNat) && (
          <button
            onClick={() => { setFilterHand(''); setFilterNat(''); }}
            style={{
              background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: '8px', padding: '0.5rem 0.875rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Player Table */}
      <div className="glass-card animate-fade-up" style={{ overflow: 'hidden', animationDelay: '0.3s' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('rank')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Rank {getSortIcon('rank')}
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Name {getSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('nationality')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Nationality {getSortIcon('nationality')}
                  </th>
                  <th onClick={() => handleSort('hand')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Hand {getSortIcon('hand')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No players found
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 100).map((player) => (
                    <tr key={player._id}>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '2rem', height: '2rem', borderRadius: '8px',
                          background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)',
                          fontWeight: 700, fontSize: '0.75rem',
                        }}>
                          {player.rank || '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{player.name}</td>
                      <td><span className="badge badge-hard">{player.nationality}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {player.hand === 'R' ? '🫱 Right' : player.hand === 'L' ? '🫲 Left' : 'Unknown'}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/players/${player._id}`)}
                          style={{
                            background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)',
                            border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px',
                            padding: '0.375rem 0.875rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseOver={(e) => { e.target.style.background = 'rgba(16,185,129,0.2)'; }}
                          onMouseOut={(e) => { e.target.style.background = 'rgba(16,185,129,0.1)'; }}
                        >
                          View Stats →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Showing 100 of {filtered.length} players. Use search to narrow results.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
