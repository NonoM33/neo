import type { FC } from 'hono/jsx';
import { isRecetteEnabled } from '../../config/env';
import { hasPermission } from '../../modules/roles/permissions';

interface SidebarProps {
  currentPath?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  /** Permission required to see this item. Omit for always-visible items. */
  permission?: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'General',
    items: [
      { path: '/backoffice', label: 'Dashboard', icon: 'bi-grid-1x2' },
      ...(isRecetteEnabled
        ? [{ path: '/backoffice/recette', label: 'Recette (STG)', icon: 'bi-bug' }]
        : []),
    ],
  },
  {
    title: 'Commerce',
    items: [
      { path: '/backoffice/orders', label: 'Commandes', icon: 'bi-bag-check', permission: 'commandes.manage' },
      { path: '/backoffice/invoices', label: 'Factures', icon: 'bi-receipt', permission: 'factures.manage' },
      { path: '/backoffice/stock', label: 'Stock', icon: 'bi-boxes', permission: 'stock.manage' },
      { path: '/backoffice/supplier-orders', label: 'Achats', icon: 'bi-truck', permission: 'achats.manage' },
    ],
  },
  {
    title: 'CRM Commercial',
    items: [
      { path: '/backoffice/parcours', label: 'Parcours projet', icon: 'bi-stars', permission: 'crm.manage' },
      { path: '/backoffice/crm/pipeline', label: 'Pipeline', icon: 'bi-funnel', permission: 'crm.manage' },
      { path: '/backoffice/activities', label: 'Activites', icon: 'bi-calendar-event', permission: 'activites.manage' },
      { path: '/backoffice/crm/kpis', label: 'KPIs', icon: 'bi-graph-up', permission: 'crm.manage' },
      { path: '/backoffice/objectives', label: 'Objectifs', icon: 'bi-bullseye', permission: 'objectifs.manage' },
    ],
  },
  {
    title: 'Planning',
    items: [
      { path: '/backoffice/creneaux', label: 'Creneaux', icon: 'bi-clock-history', permission: 'creneaux.manage' },
    ],
  },
  {
    title: 'Support',
    items: [
      { path: '/backoffice/support', label: 'Dashboard Support', icon: 'bi-headset', permission: 'support.manage' },
      { path: '/backoffice/support/chat', label: 'Chat live', icon: 'bi-chat-dots', permission: 'support.manage' },
      { path: '/backoffice/support/tickets', label: 'Tickets', icon: 'bi-ticket-detailed', permission: 'support.manage' },
      { path: '/backoffice/support/kb', label: 'Base de connaissances', icon: 'bi-book', permission: 'support.manage' },
      { path: '/backoffice/support/faq', label: 'FAQ', icon: 'bi-question-circle', permission: 'support.manage' },
      { path: '/backoffice/support/settings', label: 'Parametres Support', icon: 'bi-gear', permission: 'support.manage' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { path: '/backoffice/newsletter', label: 'Newsletter', icon: 'bi-envelope-paper', permission: 'newsletter.manage' },
      { path: '/backoffice/release-notes', label: 'Notes de version', icon: 'bi-rocket-takeoff', permission: 'newsletter.manage' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { path: '/backoffice/clients', label: 'Clients', icon: 'bi-person-badge', permission: 'clients.manage' },
      { path: '/backoffice/products', label: 'Produits', icon: 'bi-box-seam', permission: 'produits.manage' },
      { path: '/backoffice/suppliers', label: 'Fournisseurs', icon: 'bi-building', permission: 'fournisseurs.manage' },
      { path: '/backoffice/projects', label: 'Projets', icon: 'bi-folder', permission: 'projets.manage' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { path: '/backoffice/users', label: 'Utilisateurs', icon: 'bi-people', permission: 'utilisateurs.manage' },
      { path: '/backoffice/roles', label: 'Roles & permissions', icon: 'bi-shield-lock', permission: 'roles.manage' },
      { path: '/backoffice/api-tokens', label: 'Jetons API', icon: 'bi-key', permission: 'api-tokens.manage' },
    ],
  },
];

export const Sidebar: FC<SidebarProps> = ({ currentPath, permissions = [], isSuperAdmin = false }) => {
  const isActive = (path: string) => {
    if (path === '/backoffice') {
      return currentPath === '/backoffice' || currentPath === '/backoffice/';
    }
    return currentPath?.startsWith(path);
  };

  const canSee = (item: NavItem) =>
    !item.permission || hasPermission(permissions, item.permission, isSuperAdmin);

  const visibleSections = navSections
    .map((section) => ({ ...section, items: section.items.filter(canSee) }))
    .filter((section) => section.items.length > 0);

  return (
    <div class="sidebar">
      <div class="sidebar-header">
        <a href="/backoffice" class="sidebar-brand">
          <i class="bi bi-house-gear"></i>
          Neo Backoffice
        </a>
      </div>
      <nav class="sidebar-nav">
        {visibleSections.map((section) => (
          <div class="mb-3">
            <div class="nav-section">{section.title}</div>
            {section.items.map((item) => (
              <a
                href={item.path}
                class={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <i class={`bi ${item.icon}`}></i>
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
};
