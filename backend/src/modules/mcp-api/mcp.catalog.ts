/**
 * Inventaire statique des endpoints de l'API staff (/api/*).
 *
 * Sert uniquement à la *découverte* via l'outil MCP `list_endpoints` : il
 * permet à un client (Claude) de savoir quoi appeler avant d'utiliser
 * `api_request`. L'accès réel reste gouverné par le RBAC du jeton — un endpoint
 * listé ici n'est pas forcément autorisé pour un jeton donné.
 *
 * Module pur (données + filtre), testable en isolation.
 */

export interface ApiEndpoint {
  resource: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  /** Permission backoffice indicative (null = accessible à tout staff authentifié). */
  permission: string | null;
}

export const API_ENDPOINTS: readonly ApiEndpoint[] = [
  // Auth
  { resource: 'auth', method: 'GET', path: '/api/auth/me', description: 'Profil du porteur du jeton', permission: null },

  // Utilisateurs
  { resource: 'users', method: 'GET', path: '/api/users', description: 'Lister les utilisateurs', permission: 'utilisateurs.manage' },
  { resource: 'users', method: 'GET', path: '/api/users/:id', description: 'Détail utilisateur', permission: 'utilisateurs.manage' },
  { resource: 'users', method: 'POST', path: '/api/users', description: 'Créer un utilisateur', permission: 'utilisateurs.manage' },
  { resource: 'users', method: 'PUT', path: '/api/users/:id', description: 'Modifier un utilisateur', permission: 'utilisateurs.manage' },
  { resource: 'users', method: 'DELETE', path: '/api/users/:id', description: 'Supprimer un utilisateur', permission: 'utilisateurs.manage' },

  // Clients
  { resource: 'clients', method: 'GET', path: '/api/projets/clients', description: 'Lister les clients', permission: 'clients.manage' },
  { resource: 'clients', method: 'GET', path: '/api/projets/clients/:id', description: 'Détail client', permission: 'clients.manage' },
  { resource: 'clients', method: 'POST', path: '/api/projets/clients', description: 'Créer un client', permission: 'clients.manage' },
  { resource: 'clients', method: 'PUT', path: '/api/projets/clients/:id', description: 'Modifier un client', permission: 'clients.manage' },
  { resource: 'clients', method: 'DELETE', path: '/api/projets/clients/:id', description: 'Supprimer un client', permission: 'clients.manage' },

  // Projets
  { resource: 'projets', method: 'GET', path: '/api/projets', description: 'Lister les projets', permission: 'projets.manage' },
  { resource: 'projets', method: 'GET', path: '/api/projets/:id', description: 'Détail projet', permission: 'projets.manage' },
  { resource: 'projets', method: 'POST', path: '/api/projets', description: 'Créer un projet', permission: 'projets.manage' },
  { resource: 'projets', method: 'PUT', path: '/api/projets/:id', description: 'Modifier un projet', permission: 'projets.manage' },
  { resource: 'projets', method: 'DELETE', path: '/api/projets/:id', description: 'Supprimer un projet', permission: 'projets.manage' },

  // Pièces
  { resource: 'pieces', method: 'GET', path: '/api/projets/:projectId/pieces', description: 'Lister les pièces d\'un projet', permission: 'projets.manage' },
  { resource: 'pieces', method: 'POST', path: '/api/projets/:projectId/pieces', description: 'Créer une pièce', permission: 'projets.manage' },
  { resource: 'pieces', method: 'GET', path: '/api/pieces/:id', description: 'Détail pièce', permission: 'projets.manage' },
  { resource: 'pieces', method: 'PUT', path: '/api/pieces/:id', description: 'Modifier une pièce', permission: 'projets.manage' },
  { resource: 'pieces', method: 'DELETE', path: '/api/pieces/:id', description: 'Supprimer une pièce', permission: 'projets.manage' },

  // Appareils
  { resource: 'devices', method: 'GET', path: '/api/projets/:projectId/devices', description: 'Lister les appareils d\'un projet', permission: 'projets.manage' },
  { resource: 'devices', method: 'GET', path: '/api/pieces/:roomId/devices', description: 'Lister les appareils d\'une pièce', permission: 'projets.manage' },
  { resource: 'devices', method: 'POST', path: '/api/pieces/:roomId/devices', description: 'Créer un appareil', permission: 'projets.manage' },
  { resource: 'devices', method: 'GET', path: '/api/devices/:id', description: 'Détail appareil', permission: 'projets.manage' },
  { resource: 'devices', method: 'PUT', path: '/api/devices/:id', description: 'Modifier un appareil', permission: 'projets.manage' },
  { resource: 'devices', method: 'DELETE', path: '/api/devices/:id', description: 'Supprimer un appareil', permission: 'projets.manage' },

  // Produits
  { resource: 'produits', method: 'GET', path: '/api/produits', description: 'Lister les produits', permission: 'produits.manage' },
  { resource: 'produits', method: 'GET', path: '/api/produits/categories', description: 'Lister les catégories', permission: 'produits.manage' },
  { resource: 'produits', method: 'GET', path: '/api/produits/marques', description: 'Lister les marques', permission: 'produits.manage' },
  { resource: 'produits', method: 'GET', path: '/api/produits/:id', description: 'Détail produit', permission: 'produits.manage' },
  { resource: 'produits', method: 'POST', path: '/api/produits', description: 'Créer un produit', permission: 'produits.manage' },
  { resource: 'produits', method: 'PUT', path: '/api/produits/:id', description: 'Modifier un produit', permission: 'produits.manage' },
  { resource: 'produits', method: 'DELETE', path: '/api/produits/:id', description: 'Supprimer un produit', permission: 'produits.manage' },

  // Devis
  { resource: 'devis', method: 'GET', path: '/api/devis', description: 'Lister les devis', permission: 'crm.manage' },
  { resource: 'devis', method: 'GET', path: '/api/devis/:id', description: 'Détail devis', permission: 'crm.manage' },
  { resource: 'devis', method: 'POST', path: '/api/projets/:projectId/devis', description: 'Créer un devis', permission: 'crm.manage' },
  { resource: 'devis', method: 'PUT', path: '/api/devis/:id', description: 'Modifier un devis', permission: 'crm.manage' },
  { resource: 'devis', method: 'DELETE', path: '/api/devis/:id', description: 'Supprimer un devis', permission: 'crm.manage' },
  { resource: 'devis', method: 'POST', path: '/api/devis/:id/envoyer', description: 'Envoyer un devis par email', permission: 'crm.manage' },

  // Commandes
  { resource: 'commandes', method: 'GET', path: '/api/commandes', description: 'Lister les commandes', permission: 'commandes.manage' },
  { resource: 'commandes', method: 'GET', path: '/api/commandes/:id', description: 'Détail commande', permission: 'commandes.manage' },
  { resource: 'commandes', method: 'POST', path: '/api/commandes', description: 'Créer une commande', permission: 'commandes.manage' },
  { resource: 'commandes', method: 'PUT', path: '/api/commandes/:id', description: 'Modifier une commande', permission: 'commandes.manage' },
  { resource: 'commandes', method: 'PUT', path: '/api/commandes/:id/status', description: 'Changer le statut', permission: 'commandes.manage' },
  { resource: 'commandes', method: 'DELETE', path: '/api/commandes/:id', description: 'Supprimer une commande', permission: 'commandes.manage' },

  // Factures
  { resource: 'factures', method: 'GET', path: '/api/factures', description: 'Lister les factures', permission: 'factures.manage' },
  { resource: 'factures', method: 'GET', path: '/api/factures/:id', description: 'Détail facture', permission: 'factures.manage' },
  { resource: 'factures', method: 'POST', path: '/api/factures', description: 'Créer une facture', permission: 'factures.manage' },
  { resource: 'factures', method: 'PUT', path: '/api/factures/:id', description: 'Modifier une facture', permission: 'factures.manage' },
  { resource: 'factures', method: 'PUT', path: '/api/factures/:id/status', description: 'Changer le statut', permission: 'factures.manage' },
  { resource: 'factures', method: 'DELETE', path: '/api/factures/:id', description: 'Supprimer une facture', permission: 'factures.manage' },

  // Stock
  { resource: 'stock', method: 'GET', path: '/api/stock', description: 'Tableau de bord du stock', permission: 'stock.manage' },
  { resource: 'stock', method: 'GET', path: '/api/stock/alertes', description: 'Alertes de stock bas', permission: 'stock.manage' },
  { resource: 'stock', method: 'GET', path: '/api/stock/mouvements', description: 'Historique des mouvements', permission: 'stock.manage' },
  { resource: 'stock', method: 'POST', path: '/api/stock/mouvement', description: 'Créer un mouvement de stock', permission: 'stock.manage' },

  // Achats fournisseurs
  { resource: 'achats', method: 'GET', path: '/api/commandes-fournisseurs', description: 'Lister les commandes fournisseurs', permission: 'achats.manage' },
  { resource: 'achats', method: 'GET', path: '/api/commandes-fournisseurs/:id', description: 'Détail commande fournisseur', permission: 'achats.manage' },
  { resource: 'achats', method: 'POST', path: '/api/commandes-fournisseurs', description: 'Créer une commande fournisseur', permission: 'achats.manage' },
  { resource: 'achats', method: 'PUT', path: '/api/commandes-fournisseurs/:id', description: 'Modifier une commande fournisseur', permission: 'achats.manage' },
  { resource: 'achats', method: 'DELETE', path: '/api/commandes-fournisseurs/:id', description: 'Supprimer une commande fournisseur', permission: 'achats.manage' },

  // Leads (CRM)
  { resource: 'leads', method: 'GET', path: '/api/leads', description: 'Lister les leads', permission: 'crm.manage' },
  { resource: 'leads', method: 'GET', path: '/api/leads/stats', description: 'Statistiques du pipeline', permission: 'crm.manage' },
  { resource: 'leads', method: 'GET', path: '/api/leads/:id', description: 'Détail lead', permission: 'crm.manage' },
  { resource: 'leads', method: 'POST', path: '/api/leads', description: 'Créer un lead', permission: 'crm.manage' },
  { resource: 'leads', method: 'PUT', path: '/api/leads/:id', description: 'Modifier un lead', permission: 'crm.manage' },
  { resource: 'leads', method: 'PUT', path: '/api/leads/:id/status', description: 'Changer le statut', permission: 'crm.manage' },
  { resource: 'leads', method: 'POST', path: '/api/leads/:id/convert', description: 'Convertir en projet', permission: 'crm.manage' },
  { resource: 'leads', method: 'DELETE', path: '/api/leads/:id', description: 'Supprimer un lead', permission: 'crm.manage' },

  // Activités (CRM)
  { resource: 'activities', method: 'GET', path: '/api/activities', description: 'Lister les activités', permission: 'activites.manage' },
  { resource: 'activities', method: 'GET', path: '/api/activities/:id', description: 'Détail activité', permission: 'activites.manage' },
  { resource: 'activities', method: 'POST', path: '/api/activities', description: 'Créer une activité', permission: 'activites.manage' },
  { resource: 'activities', method: 'PUT', path: '/api/activities/:id', description: 'Modifier une activité', permission: 'activites.manage' },
  { resource: 'activities', method: 'DELETE', path: '/api/activities/:id', description: 'Supprimer une activité', permission: 'activites.manage' },

  // KPIs
  { resource: 'kpis', method: 'GET', path: '/api/kpis', description: 'Tableaux de bord KPI', permission: 'crm.manage' },

  // Rendez-vous
  { resource: 'appointments', method: 'GET', path: '/api/appointments', description: 'Lister les rendez-vous', permission: 'crm.manage' },
  { resource: 'appointments', method: 'GET', path: '/api/appointments/:id', description: 'Détail rendez-vous', permission: 'crm.manage' },
  { resource: 'appointments', method: 'POST', path: '/api/appointments', description: 'Créer un rendez-vous', permission: 'crm.manage' },
  { resource: 'appointments', method: 'PUT', path: '/api/appointments/:id', description: 'Modifier un rendez-vous', permission: 'crm.manage' },
  { resource: 'appointments', method: 'DELETE', path: '/api/appointments/:id', description: 'Supprimer un rendez-vous', permission: 'crm.manage' },

  // Tickets (support)
  { resource: 'tickets', method: 'GET', path: '/api/tickets', description: 'Lister les tickets', permission: 'support.manage' },
  { resource: 'tickets', method: 'GET', path: '/api/tickets/:id', description: 'Détail ticket', permission: 'support.manage' },
  { resource: 'tickets', method: 'POST', path: '/api/tickets', description: 'Créer un ticket', permission: 'support.manage' },
  { resource: 'tickets', method: 'PUT', path: '/api/tickets/:id', description: 'Modifier un ticket', permission: 'support.manage' },
  { resource: 'tickets', method: 'PUT', path: '/api/tickets/:id/status', description: 'Changer le statut', permission: 'support.manage' },
  { resource: 'tickets', method: 'POST', path: '/api/tickets/:id/comments', description: 'Ajouter un commentaire', permission: 'support.manage' },

  // Base de connaissances
  { resource: 'kb', method: 'GET', path: '/api/kb/articles', description: 'Lister les articles', permission: 'support.manage' },
  { resource: 'kb', method: 'GET', path: '/api/kb/articles/:id', description: 'Détail article', permission: 'support.manage' },
  { resource: 'kb', method: 'POST', path: '/api/kb/articles', description: 'Créer un article', permission: 'support.manage' },
  { resource: 'kb', method: 'PUT', path: '/api/kb/articles/:id', description: 'Modifier un article', permission: 'support.manage' },
  { resource: 'kb', method: 'DELETE', path: '/api/kb/articles/:id', description: 'Supprimer un article', permission: 'support.manage' },

  // Newsletter / marketing
  { resource: 'marketing', method: 'GET', path: '/api/marketing', description: 'Configuration marketing', permission: 'newsletter.manage' },
] as const;

/** Filtre le catalogue par texte libre (resource, path, description) et/ou ressource. */
export function searchEndpoints(
  options: { search?: string; resource?: string } = {}
): ApiEndpoint[] {
  const search = options.search?.trim().toLowerCase();
  const resource = options.resource?.trim().toLowerCase();
  return API_ENDPOINTS.filter((e) => {
    if (resource && e.resource.toLowerCase() !== resource) return false;
    if (search) {
      const haystack = `${e.resource} ${e.method} ${e.path} ${e.description}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/** Liste des noms de ressources distincts (pour orienter la découverte). */
export function listResources(): string[] {
  return [...new Set(API_ENDPOINTS.map((e) => e.resource))];
}
