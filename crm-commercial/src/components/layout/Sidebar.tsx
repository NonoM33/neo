import { NavLink } from 'react-router-dom';
import { useGamificationStore } from '../../stores';
import { computeLevelProgress } from '../../services/gamification.engine';
import { useUserRoles } from '../../hooks';
import { rolesCanAccess, type Feature } from '../../config/permissions';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  feature: Feature;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Navigation déclarative : chaque entrée porte sa feature, filtrée par rôle.
// On n'expose ici que les pages réellement implémentées dans l'app React.
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Tableau de bord',
    items: [{ to: '/', label: 'Dashboard', icon: 'bi-speedometer2', feature: 'dashboard', end: true }],
  },
  {
    title: 'Commercial',
    items: [
      { to: '/prospection', label: 'Prospection', icon: 'bi-crosshair', feature: 'prospection' },
      { to: '/leads', label: 'Pipeline', icon: 'bi-funnel', feature: 'leads' },
      { to: '/activities', label: 'Activités', icon: 'bi-calendar-event', feature: 'activities' },
      { to: '/calendar', label: 'Agenda', icon: 'bi-calendar3', feature: 'calendar' },
      { to: '/kpis', label: 'KPIs', icon: 'bi-graph-up', feature: 'kpis' },
    ],
  },
  {
    title: 'Catalogue',
    items: [{ to: '/produits', label: 'Produits', icon: 'bi-box-seam', feature: 'catalogue' }],
  },
  {
    title: 'Mon espace',
    items: [{ to: '/calendar/availability', label: 'Disponibilités', icon: 'bi-clock', feature: 'availability' }],
  },
  {
    title: 'Gamification',
    items: [
      { to: '/leaderboard', label: 'Classement', icon: 'bi-trophy', feature: 'leaderboard' },
      { to: '/profile', label: 'Mon Profil', icon: 'bi-person-badge', feature: 'profile' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { to: '/clients', label: 'Clients', icon: 'bi-people', feature: 'clients' },
      { to: '/projets', label: 'Projets', icon: 'bi-folder', feature: 'projets' },
      { to: '/devis', label: 'Devis', icon: 'bi-file-earmark-text', feature: 'devis' },
    ],
  },
  {
    title: 'Support',
    items: [{ to: '/tickets', label: 'Tickets', icon: 'bi-life-preserver', feature: 'support' }],
  },
  {
    title: 'Infrastructure',
    items: [{ to: '/cloud', label: 'Cloud HA', icon: 'bi-cloud-arrow-up', feature: 'cloud' }],
  },
  {
    title: 'Administration',
    items: [
      { to: '/marketing', label: 'Marketing', icon: 'bi-badge-ad', feature: 'marketing' },
      { to: '/templates', label: 'Templates', icon: 'bi-palette', feature: 'templates' },
      { to: '/users', label: 'Utilisateurs', icon: 'bi-person-gear', feature: 'users' },
    ],
  },
];

export function Sidebar() {
  const { profile } = useGamificationStore();
  const roles = useUserRoles();

  const levelProgress = computeLevelProgress(profile.totalXP);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => rolesCanAccess(item.feature, roles)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand">
          <i className="bi bi-house-gear-fill"></i>
          Neo CRM
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <div className="nav-section">{section.title}</div>
            {section.items.map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link" end={item.end}>
                <i className={`bi ${item.icon}`}></i>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
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
