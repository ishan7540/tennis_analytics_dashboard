import { useState, useEffect, useRef } from 'react';

export default function SearchableSelect({ players, value, onChange, placeholder = 'Search player…', id }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapperRef = useRef(null);

  const selectedPlayer = players.find((p) => p._id === value);

  const filtered = search.length >= 1
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.nationality.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 30)
    : players.slice(0, 30);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  const handleSelect = (playerId) => {
    onChange(playerId);
    setSearch('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        handleSelect(filtered[highlightIndex]._id);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 9999 : 1 }} id={id}>
      {/* Display selected player or search input */}
      {!isOpen && selectedPlayer ? (
        <div
          className="input-field"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', minHeight: '42px',
          }}
          onClick={() => { setIsOpen(true); setSearch(''); }}
        >
          <span style={{ fontWeight: 500 }}>
            {selectedPlayer.name}
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
              {selectedPlayer.nationality} {selectedPlayer.rank ? `#${selectedPlayer.rank}` : ''}
            </span>
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>✕</span>
        </div>
      ) : (
        <input
          className="input-field"
          placeholder={placeholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoFocus={isOpen}
          style={{ minHeight: '42px' }}
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
            marginTop: '4px', maxHeight: '280px', overflowY: 'auto',
            background: '#1e293b', border: '1px solid rgba(148,163,184,0.25)',
            borderRadius: '10px', boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {search.length >= 1 ? `No players match "${search}"` : 'Type to search players…'}
            </div>
          ) : (
            filtered.map((p, idx) => (
              <div
                key={p._id}
                onClick={() => handleSelect(p._id)}
                style={{
                  padding: '0.625rem 1rem',
                  cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: idx === highlightIndex ? 'rgba(16,185,129,0.1)' : 'transparent',
                  borderBottom: '1px solid rgba(148,163,184,0.06)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {p.nationality} {p.rank ? `#${p.rank}` : ''}
                </span>
              </div>
            ))
          )}
          {search.length < 1 && (
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
              💡 Type a name like "Thiem", "Moutet", "Walton"...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
