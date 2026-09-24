import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useUIStore } from '../../stores';
import { RewardOverlay } from '../gamification/RewardOverlay';

interface PageMeta {
  title: string;
  section?: string;
}

const pageMeta: Record<string, PageMeta> = {
  '/': { title: 'Dashboard', section: 'Tableau de bord' },
  '/leads': { title: 'Pipeline', section: 'Commercial' },
  '/prospection': { title: 'Prospection', section: 'Commercial' },
  '/activities': { title: 'Activités', section: 'Commercial' },
  '/calendar': { title: 'Agenda', section: 'Commercial' },
  '/kpis': { title: 'KPIs', section: 'Commercial' },
  '/objectives': { title: 'Objectifs', section: 'Commercial' },
  '/produits': { title: 'Produits', section: 'Catalogue' },
  '/leaderboard': { title: 'Classement', section: 'Gamification' },
  '/profile': { title: 'Mon Profil', section: 'Gamification' },
  '/clients': { title: 'Clients', section: 'Gestion' },
  '/projets': { title: 'Projets', section: 'Gestion' },
  '/devis': { title: 'Devis', section: 'Gestion' },
  '/tickets': { title: 'Tickets', section: 'Support' },
  '/cloud': { title: 'Cloud HA', section: 'Infrastructure' },
  '/marketing': { title: 'Marketing', section: 'Administration' },
  '/templates': { title: 'Templates', section: 'Administration' },
  '/design-system': { title: 'Design System', section: 'Administration' },
  '/users': { title: 'Utilisateurs', section: 'Administration' },
};

export function Layout() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/')[1];
  const meta = pageMeta[basePath] || pageMeta[location.pathname] || { title: 'Neo CRM' };

  return (
    <div className="neo-ds">
      <div className={`app${sidebarOpen ? ' sb-open' : ''}`}>
        <div className="sb-scrim" onClick={() => setSidebarOpen(false)} />
        <Sidebar />
        <div className="main">
          <TopBar title={meta.title} section={meta.section} />
          <div className="content">
            <div className="content-in">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      <RewardOverlay />
    </div>
  );
}

export default Layout;
