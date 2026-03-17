import { useAuthStore, useUIStore, useThemeStore, useGamificationStore } from '../../stores';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const { theme, toggleTheme } = useThemeStore();
  const { profile } = useGamificationStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

  return (
    <header className="top-bar">
      <div className="d-flex align-items-center gap-3">
        <button className="btn mobile-menu-btn" onClick={toggleSidebar}>
          <i className="bi bi-list fs-4"></i>
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* XP compact display */}
        <div
          className="d-none d-md-flex align-items-center gap-2"
          style={{
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'var(--neo-xp-light)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/profile')}
        >
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--neo-xp-color)',
          }}>
            {profile.totalXP.toLocaleString('fr-FR')} XP
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '1px 8px',
            borderRadius: '10px',
            background: profile.level.color,
            color: '#fff',
            fontWeight: 600,
          }}>
            {profile.level.label}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          className="btn btn-sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          style={{ color: 'var(--neo-text-secondary)' }}
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'} fs-5`}></i>
        </button>

        {/* User dropdown */}
        <div className="user-dropdown" ref={dropdownRef}>
          <div
            className="d-flex align-items-center gap-2"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ cursor: 'pointer' }}
          >
            <div className="user-avatar">{initials}</div>
            <div className="d-none d-md-block">
              <div className="fw-semibold">{user?.firstName} {user?.lastName}</div>
              <small className="text-muted">{user?.role}</small>
            </div>
            <i className="bi bi-chevron-down"></i>
          </div>

          {dropdownOpen && (
            <div className="dropdown-menu show position-absolute end-0" style={{ top: '100%', marginTop: '8px' }}>
              <button className="dropdown-item" onClick={() => { navigate('/profile'); setDropdownOpen(false); }}>
                <i className="bi bi-person-badge me-2"></i>
                Mon Profil
              </button>
              <hr className="dropdown-divider" />
              <button className="dropdown-item" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
