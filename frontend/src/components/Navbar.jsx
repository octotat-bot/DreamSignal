import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/dashboard', label: 'ARCHIVE'  },
  { to: '/record',    label: 'SIGNAL'   },
  { to: '/timeline',  label: 'EXPOSURE' },
  { to: '/analytics', label: 'PATTERNS' },
  { to: '/profile',   label: 'DOSSIER'  },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); window.location.replace('/'); };

  return (
    <nav data-tour="navigation" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      backgroundColor: 'var(--paper-dark)',
      borderBottom: '2px solid var(--ink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 1000,
      fontFamily: '"Share Tech Mono", monospace',
    }}>
      {/* Left — Brand */}
      <Link to="/dashboard" style={{
        fontFamily: '"Special Elite", serif',
        fontSize: '1.05rem',
        color: 'var(--ink)',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1.1,
      }}>
        <span>DREAMSIGNAL</span>
        <span style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--silver)', textTransform: 'uppercase' }}>
          CLASSIFIED / LEVEL 3
        </span>
      </Link>

      {/* Center — Nav links */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {NAV_LINKS.map(({ to, label }) => {
          const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                color: active ? 'var(--ink)' : 'var(--silver)',
                textDecoration: active ? 'underline' : 'none',
                textDecorationStyle: active ? 'dotted' : 'none',
                textUnderlineOffset: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--silver)'; }}
            >
              [{label}]
            </Link>
          );
        })}
      </div>

      {/* Right — Subject + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          to="/profile"
          title="View dossier"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            color: 'var(--ink-faded)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt=""
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1.5px solid var(--ink)',
                objectFit: 'cover',
                filter: 'sepia(0.15)',
              }}
            />
          ) : (
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1.5px solid var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"Special Elite", serif',
                fontSize: '0.8rem',
                color: 'var(--ink)',
                backgroundColor: 'rgba(61,53,40,0.08)',
                flexShrink: 0,
              }}
            >
              {user?.username?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
          SUBJECT: <span style={{
            color: 'var(--ink)',
            textTransform: 'uppercase',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
            textUnderlineOffset: '3px',
          }}>{user?.username}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="btn-stamp btn-stamp-ink"
          style={{ fontSize: '0.6rem', padding: '3px 10px' }}
        >
          LOGOUT
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
