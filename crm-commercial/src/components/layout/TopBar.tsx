import { useAuthStore, useUIStore } from '../../stores';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../neo';

interface TopBarProps {
  title: string;
  section?: string;
}

export function TopBar({ title, section }: TopBarProps) {
  const { logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <button className="tb-icon sb-toggle" onClick={toggleSidebar} aria-label="Menu">
        <Icon name="menu" size={18} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {section && (
          <>
            <span className="tb-crumb">{section}</span>
            <Icon name="chevronRight" size={14} style={{ color: 'var(--ink-4)' }} />
          </>
        )}
        <span className="tb-title">{title}</span>
      </div>

      <div className="tb-spacer" />

      <div className="tb-search">
        <Icon name="search" size={17} />
        <input placeholder="Rechercher partout…" />
        <span className="kbd">⌘K</span>
      </div>

      <button className="tb-icon" aria-label="Notifications">
        <Icon name="bell" size={18} />
        <span className="dot" />
      </button>
      <button className="tb-icon" onClick={() => navigate('/profile')} aria-label="Profil">
        <Icon name="user" size={18} />
      </button>
      <button className="tb-icon" onClick={handleLogout} aria-label="Déconnexion">
        <Icon name="logout" size={18} />
      </button>
    </header>
  );
}

export default TopBar;
