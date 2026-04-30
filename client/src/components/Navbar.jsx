import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
        }}
      >
        {/* Logo */}
        <NavLink
          to="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
        >
          <span style={{ fontSize: '1.25rem' }}>🎾</span>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            TennisLytics
          </span>
        </NavLink>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: '0.125rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/head-to-head" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            H2H
          </NavLink>
          <NavLink to="/tournaments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Tournaments
          </NavLink>
          <NavLink to="/match-explorer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Explorer
          </NavLink>
          <NavLink to="/player-insights" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Insights
          </NavLink>
          <NavLink to="/sweeps" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Sweeps
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
