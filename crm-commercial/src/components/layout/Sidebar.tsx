import { NavLink } from 'react-router-dom';
import { useGamificationStore, useAuthStore, useUIStore } from '../../stores';
import { computeLevelProgress } from '../../services/gamification.engine';
import { useUserRoles } from '../../hooks';
import { rolesCanAccess, type Feature } from '../../config/permissions';
import { Icon, Avatar, type IconName } from '../neo';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
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
    items: [{ to: '/', label: 'Dashboard', icon: 'dashboard', feature: 'dashboard', end: true }],
  },
  {
    title: 'Commercial',
    items: [
      { to: '/prospection', label: 'Prospection', icon: 'crosshair', feature: 'prospection' },
      { to: '/leads', label: 'Pipeline', icon: 'filter', feature: 'leads' },
      { to: '/activities', label: 'Activités', icon: 'calendar', feature: 'activities' },
      { to: '/calendar', label: 'Agenda', icon: 'calendar', feature: 'calendar' },
      { to: '/kpis', label: 'KPIs', icon: 'chart', feature: 'kpis' },
    ],
  },
  {
    title: 'Catalogue',
    items: [{ to: '/produits', label: 'Produits', icon: 'package', feature: 'catalogue' }],
  },
  {
    title: 'Mon espace',
    items: [{ to: '/calendar/availability', label: 'Disponibilités', icon: 'clock', feature: 'availability' }],
  },
  {
    title: 'Gamification',
    items: [
      { to: '/leaderboard', label: 'Classement', icon: 'trophy', feature: 'leaderboard' },
      { to: '/profile', label: 'Mon Profil', icon: 'user', feature: 'profile' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { to: '/clients', label: 'Clients', icon: 'users', feature: 'clients' },
      { to: '/projets', label: 'Projets', icon: 'folder', feature: 'projets' },
      { to: '/devis', label: 'Devis', icon: 'fileText', feature: 'devis' },
    ],
  },
  {
    title: 'Support',
    items: [{ to: '/tickets', label: 'Tickets', icon: 'ticket', feature: 'support' }],
  },
  {
    title: 'Infrastructure',
    items: [{ to: '/cloud', label: 'Cloud HA', icon: 'cloud', feature: 'cloud' }],
  },
  {
    title: 'Administration',
    items: [
      { to: '/marketing', label: 'Marketing', icon: 'megaphone', feature: 'marketing' },
      { to: '/templates', label: 'Templates', icon: 'palette', feature: 'templates' },
      { to: '/design-system', label: 'Design System', icon: 'sparkles', feature: 'design-system' },
      { to: '/users', label: 'Utilisateurs', icon: 'shield', feature: 'users' },
    ],
  },
];

export function Sidebar() {
  const { profile } = useGamificationStore();
  const { user } = useAuthStore();
  const { setSidebarOpen } = useUIStore();
  const roles = useUserRoles();

  const levelProgress = computeLevelProgress(profile.totalXP);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => rolesCanAccess(item.feature, roles)),
  })).filter((section) => section.items.length > 0);

  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Utilisateur';

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sb-brand" onClick={() => setSidebarOpen(false)}>
        <span className="sb-logo">
          <Icon name="home" size={20} />
        </span>
        <div>
          <b>Neo CRM</b>
          <small>Espace staff</small>
        </div>
      </NavLink>

      <nav className="sb-scroll">
        {visibleSections.map((section) => (
          <div className="sb-group" key={section.title}>
            <div className="sb-group-label">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}
              >
                <Icon name={item.icon} size={19} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="sb-xp">
          <div className="sb-xp-top">
            <span className="sb-xp-lvl" style={{ color: profile.level.color }}>
              <Icon name="trophy" size={13} />
              {profile.level.label}
            </span>
            <span className="sb-xp-val">{profile.totalXP.toLocaleString('fr-FR')} XP</span>
          </div>
          <div className="sb-xp-bar">
            <i style={{ width: `${levelProgress * 100}%` }} />
          </div>
          {profile.streak > 0 && (
            <div className="sb-xp-streak">
              <span className="animate-flame">🔥</span>
              {profile.streak} jour{profile.streak > 1 ? 's' : ''} de streak
            </div>
          )}
        </div>
        <NavLink to="/profile" className="sb-user" onClick={() => setSidebarOpen(false)}>
          <Avatar name={userName} size={36} tone="grad" />
          <div>
            <div className="nm">{userName}</div>
            <div className="rl">{user?.role ?? ''}</div>
          </div>
          <Icon name="chevronRight" size={16} className="chev" />
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
