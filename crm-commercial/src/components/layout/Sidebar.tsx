import { NavLink } from 'react-router-dom';
import { useAuthStore, useGamificationStore } from '../../stores';
import { computeLevelProgress } from '../../services/gamification.engine';

export function Sidebar() {
  const { user } = useAuthStore();
  const { profile } = useGamificationStore();

  const levelProgress = computeLevelProgress(profile.totalXP);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand">
          <i className="bi bi-house-gear-fill"></i>
          Neo CRM
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Tableau de bord</div>
        <NavLink to="/" className="nav-link" end>
          <i className="bi bi-speedometer2"></i>
          Dashboard
        </NavLink>

        <div className="nav-section">Commercial</div>
        <NavLink to="/prospection" className="nav-link">
          <i className="bi bi-crosshair"></i>
          Prospection
        </NavLink>
        <NavLink to="/leads" className="nav-link">
          <i className="bi bi-funnel"></i>
          Pipeline
        </NavLink>
        <NavLink to="/activities" className="nav-link">
          <i className="bi bi-calendar-event"></i>
          Activités
        </NavLink>
        <NavLink to="/calendar" className="nav-link">
          <i className="bi bi-calendar3"></i>
          Agenda
        </NavLink>
        <NavLink to="/kpis" className="nav-link">
          <i className="bi bi-graph-up"></i>
          KPIs
        </NavLink>

        <div className="nav-section">Mon espace</div>
        <NavLink to="/calendar/availability" className="nav-link">
          <i className="bi bi-clock"></i>
          Disponibilités
        </NavLink>

        <div className="nav-section">Gamification</div>
        <NavLink to="/leaderboard" className="nav-link">
          <i className="bi bi-trophy"></i>
          Classement
        </NavLink>
        <NavLink to="/profile" className="nav-link">
          <i className="bi bi-person-badge"></i>
          Mon Profil
        </NavLink>

        {user?.roles?.includes('admin') && (
          <>
            <div className="nav-section">Infrastructure</div>
            <NavLink to="/cloud" className="nav-link">
              <i className="bi bi-cloud-arrow-up"></i>
              Cloud HA
            </NavLink>

            <div className="nav-section">Administration</div>
            <NavLink to="/objectives" className="nav-link">
              <i className="bi bi-bullseye"></i>
              Objectifs
            </NavLink>
          </>
        )}
      </nav>

      {/* XP Bar & Streak at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        borderTop: '1px solid var(--neo-border-light)',
        background: 'inherit',
      }}>
        {/* Streak */}
        {profile.streak > 0 && (
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="animate-flame" style={{ color: 'var(--neo-streak-color)', fontSize: '1.1rem' }}>
              🔥
            </span>
            <span style={{ color: 'var(--neo-sidebar-text)', fontSize: '0.8rem' }}>
              {profile.streak} jour{profile.streak > 1 ? 's' : ''} de streak
            </span>
          </div>
        )}

        {/* Level & XP bar */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <span style={{
            fontSize: '0.75rem',
            color: profile.level.color,
            fontWeight: 600,
          }}>
            <i className={`bi ${profile.level.icon} me-1`}></i>
            {profile.level.label}
          </span>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--neo-xp-color)',
            fontWeight: 600,
          }}>
            {profile.totalXP.toLocaleString('fr-FR')} XP
          </span>
        </div>
        <div style={{
          height: '4px',
          borderRadius: '2px',
          background: 'var(--neo-bg-light, rgba(255,255,255,0.1))',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${levelProgress * 100}%`,
            borderRadius: '2px',
            background: `linear-gradient(90deg, var(--neo-accent), var(--neo-xp-color))`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
