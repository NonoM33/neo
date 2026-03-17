import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components';
import {
  LoginPage,
  DashboardPage,
  LeadsPage,
  LeadDetailPage,
  LeadFormPage,
  ActivitiesPage,
  ActivityFormPage,
  KPIsPage,
  LeaderboardPage,
  ProfilePage,
  ProspectionHubPage,
  QualificationWizardPage,
  CalendarPage,
  AppointmentFormPage,
  AppointmentDetailPage,
  AvailabilityPage,
  CalendarSyncPage,
  CloudInstancesPage,
  CloudInstanceDetailPage,
} from './pages';
import { useAuthStore } from './stores';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirect to home if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'leads',
        element: <LeadsPage />,
      },
      {
        path: 'leads/new',
        element: <LeadFormPage />,
      },
      {
        path: 'leads/:id',
        element: <LeadDetailPage />,
      },
      {
        path: 'leads/:id/edit',
        element: <LeadFormPage />,
      },
      {
        path: 'activities',
        element: <ActivitiesPage />,
      },
      {
        path: 'activities/new',
        element: <ActivityFormPage />,
      },
      {
        path: 'activities/:id/edit',
        element: <ActivityFormPage />,
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      {
        path: 'calendar/new',
        element: <AppointmentFormPage />,
      },
      {
        path: 'calendar/:id',
        element: <AppointmentDetailPage />,
      },
      {
        path: 'calendar/:id/edit',
        element: <AppointmentFormPage />,
      },
      {
        path: 'calendar/availability',
        element: <AvailabilityPage />,
      },
      {
        path: 'calendar/sync',
        element: <CalendarSyncPage />,
      },
      {
        path: 'kpis',
        element: <KPIsPage />,
      },
      {
        path: 'leaderboard',
        element: <LeaderboardPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'prospection',
        element: <ProspectionHubPage />,
      },
      {
        path: 'prospection/qualify',
        element: <QualificationWizardPage />,
      },
      {
        path: 'prospection/qualify/:id',
        element: <QualificationWizardPage />,
      },
      {
        path: 'cloud',
        element: <CloudInstancesPage />,
      },
      {
        path: 'cloud/:id',
        element: <CloudInstanceDetailPage />,
      },
    ],
  },
]);

export default router;
