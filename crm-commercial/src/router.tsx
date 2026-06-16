import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout, RoleRoute, Spinner } from './components';
import {
  LoginPage,
  DashboardPage,
  UsersPage,
  UserFormPage,
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
  ParcoursPage,
  CalendarPage,
  AppointmentFormPage,
  AppointmentDetailPage,
  AvailabilityPage,
  CreneauxPage,
  CalendarSyncPage,
  CloudInstancesPage,
  CloudInstanceDetailPage,
  ProductsPage,
  ProductFormPage,
  ProductDetailPage,
  ClientsPage,
  ClientFormPage,
  ProjectsPage,
  ProjectFormPage,
  DevisPage,
  DevisDetailPage,
  CommandesPage,
  CommandeDetailPage,
  FacturesPage,
  FactureDetailPage,
  PaiementsPage,
  StockPage,
  AchatsPage,
  AchatDetailPage,
  SuppliersPage,
  ObjectivesPage,
  TicketsPage,
  TicketDetailPage,
  TicketFormPage,
  KbPage,
  FaqPage,
  SupportSettingsPage,
  SupportDashboardPage,
  SupportChatPage,
  NewsletterPage,
  CampaignPage,
  ReleaseNotesPage,
  TemplatesPage,
  MarketingPage,
  DesignSystemPage,
  SignaturesPage,
  RecettePage,
  RolesPage,
  ApiTokensPage,
} from './pages';
import { useAuthStore } from './stores';

// L'éditeur GrapesJS est lourd : chargé à la demande pour alléger le bundle initial.
const TemplateEditorPage = lazy(() => import('./pages/templates/TemplateEditorPage'));

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
        path: 'calendar/creneaux',
        element: (
          <RoleRoute feature="creneaux">
            <CreneauxPage />
          </RoleRoute>
        ),
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
        path: 'parcours',
        element: (
          <RoleRoute feature="parcours">
            <ParcoursPage />
          </RoleRoute>
        ),
      },
      {
        path: 'produits',
        element: <ProductsPage />,
      },
      {
        path: 'produits/new',
        element: <ProductFormPage />,
      },
      {
        path: 'produits/:id',
        element: <ProductDetailPage />,
      },
      {
        path: 'produits/:id/edit',
        element: <ProductFormPage />,
      },
      {
        path: 'clients',
        element: (
          <RoleRoute feature="clients">
            <ClientsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'clients/new',
        element: (
          <RoleRoute feature="clients">
            <ClientFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'clients/:id/edit',
        element: (
          <RoleRoute feature="clients">
            <ClientFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'projets',
        element: (
          <RoleRoute feature="projets">
            <ProjectsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'projets/new',
        element: (
          <RoleRoute feature="projets">
            <ProjectFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'projets/:id/edit',
        element: (
          <RoleRoute feature="projets">
            <ProjectFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'devis',
        element: (
          <RoleRoute feature="devis">
            <DevisPage />
          </RoleRoute>
        ),
      },
      {
        path: 'devis/:id',
        element: (
          <RoleRoute feature="devis">
            <DevisDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'commandes',
        element: (
          <RoleRoute feature="commandes">
            <CommandesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'commandes/:id',
        element: (
          <RoleRoute feature="commandes">
            <CommandeDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'factures',
        element: (
          <RoleRoute feature="factures">
            <FacturesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'factures/:id',
        element: (
          <RoleRoute feature="factures">
            <FactureDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'paiements',
        element: (
          <RoleRoute feature="paiements">
            <PaiementsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'stock',
        element: (
          <RoleRoute feature="stock">
            <StockPage />
          </RoleRoute>
        ),
      },
      {
        path: 'achats',
        element: (
          <RoleRoute feature="commandes-fournisseurs">
            <AchatsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'achats/:id',
        element: (
          <RoleRoute feature="commandes-fournisseurs">
            <AchatDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'fournisseurs',
        element: (
          <RoleRoute feature="fournisseurs">
            <SuppliersPage />
          </RoleRoute>
        ),
      },
      {
        path: 'objectifs',
        element: (
          <RoleRoute feature="objectives">
            <ObjectivesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'tickets',
        element: (
          <RoleRoute feature="support">
            <TicketsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'tickets/new',
        element: (
          <RoleRoute feature="support">
            <TicketFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'tickets/:id',
        element: (
          <RoleRoute feature="support">
            <TicketDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'support/kb',
        element: (
          <RoleRoute feature="support">
            <KbPage />
          </RoleRoute>
        ),
      },
      {
        path: 'support/faq',
        element: (
          <RoleRoute feature="support">
            <FaqPage />
          </RoleRoute>
        ),
      },
      {
        path: 'support/settings',
        element: (
          <RoleRoute feature="support">
            <SupportSettingsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'support/dashboard',
        element: (
          <RoleRoute feature="support">
            <SupportDashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: 'support/chat',
        element: (
          <RoleRoute feature="support">
            <SupportChatPage />
          </RoleRoute>
        ),
      },
      {
        path: 'newsletter',
        element: (
          <RoleRoute feature="newsletter">
            <NewsletterPage />
          </RoleRoute>
        ),
      },
      {
        path: 'newsletter/campaign/:id',
        element: (
          <RoleRoute feature="newsletter">
            <CampaignPage />
          </RoleRoute>
        ),
      },
      {
        path: 'release-notes',
        element: (
          <RoleRoute feature="newsletter">
            <ReleaseNotesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'cloud',
        element: <CloudInstancesPage />,
      },
      {
        path: 'cloud/:id',
        element: <CloudInstanceDetailPage />,
      },
      {
        path: 'templates',
        element: (
          <RoleRoute feature="templates">
            <TemplatesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'templates/:key',
        element: (
          <RoleRoute feature="templates">
            <Suspense fallback={<Spinner />}>
              <TemplateEditorPage />
            </Suspense>
          </RoleRoute>
        ),
      },
      {
        path: 'marketing',
        element: (
          <RoleRoute feature="marketing">
            <MarketingPage />
          </RoleRoute>
        ),
      },
      {
        path: 'design-system',
        element: <DesignSystemPage />,
      },
      {
        path: 'signatures',
        element: (
          <RoleRoute feature="signatures">
            <SignaturesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'recette',
        element: (
          <RoleRoute feature="recette">
            <RecettePage />
          </RoleRoute>
        ),
      },
      {
        path: 'roles',
        element: (
          <RoleRoute feature="roles">
            <RolesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'api-tokens',
        element: (
          <RoleRoute feature="api-tokens">
            <ApiTokensPage />
          </RoleRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleRoute feature="users">
            <UsersPage />
          </RoleRoute>
        ),
      },
      {
        path: 'users/new',
        element: (
          <RoleRoute feature="users">
            <UserFormPage />
          </RoleRoute>
        ),
      },
      {
        path: 'users/:id/edit',
        element: (
          <RoleRoute feature="users">
            <UserFormPage />
          </RoleRoute>
        ),
      },
    ],
  },
]);

export default router;
