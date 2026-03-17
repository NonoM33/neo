import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useUIStore } from '../../stores';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RewardOverlay } from '../gamification/RewardOverlay';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Pipeline',
  '/activities': 'Activités',
  '/kpis': 'KPIs',
  '/objectives': 'Objectifs',
  '/leaderboard': 'Classement',
  '/profile': 'Mon Profil',
  '/prospection': 'Prospection',
};

export function Layout() {
  const { sidebarOpen } = useUIStore();
  const location = useLocation();
  const [title, setTitle] = useState('Dashboard');

  useEffect(() => {
    const basePath = '/' + location.pathname.split('/')[1];
    setTitle(pageTitles[basePath] || pageTitles[location.pathname] || 'Neo CRM');
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <TopBar title={title} />
        <div className="content-area">
          <Outlet />
        </div>
      </main>
      <RewardOverlay />
    </div>
  );
}

export default Layout;
