import type { RoleType } from '../types';

/**
 * Clés de feature gérées par le RBAC de l'app staff.
 * Chaque feature correspond à une (ou plusieurs) entrée(s) de navigation/route.
 */
export type Feature =
  | 'dashboard'
  | 'prospection'
  | 'leads'
  | 'activities'
  | 'calendar'
  | 'kpis'
  | 'catalogue'
  | 'availability'
  | 'creneaux'
  | 'leaderboard'
  | 'profile'
  | 'clients'
  | 'projets'
  | 'parcours'
  | 'devis'
  | 'commandes'
  | 'stock'
  | 'commandes-fournisseurs'
  | 'fournisseurs'
  | 'factures'
  | 'paiements'
  | 'signatures'
  | 'support'
  | 'newsletter'
  | 'recette'
  | 'cloud'
  | 'objectives'
  | 'templates'
  | 'marketing'
  | 'design-system'
  | 'roles'
  | 'api-tokens'
  | 'users';

const ALL_ROLES: RoleType[] = ['admin', 'integrateur', 'auditeur', 'commercial'];

/**
 * Matrice par défaut feature → rôles autorisés.
 * `admin` figure dans chaque liste (accès total). À ajuster selon les besoins métier.
 */
export const featureRoles: Record<Feature, RoleType[]> = {
  // Communes à tous les profils staff
  dashboard: ALL_ROLES,
  catalogue: ALL_ROLES,
  availability: ALL_ROLES,
  profile: ALL_ROLES,
  'design-system': ALL_ROLES,

  // Pôle commercial
  prospection: ['admin', 'commercial'],
  leads: ['admin', 'commercial', 'auditeur'],
  activities: ['admin', 'commercial'],
  calendar: ['admin', 'commercial', 'integrateur'],
  kpis: ['admin', 'commercial', 'auditeur'],
  leaderboard: ['admin', 'commercial'],
  devis: ['admin', 'commercial'],
  clients: ['admin', 'commercial', 'integrateur'],
  parcours: ['admin', 'integrateur', 'commercial'],

  // Pôle intégration / opérations
  projets: ['admin', 'integrateur', 'auditeur'],
  commandes: ['admin', 'integrateur'],
  stock: ['admin', 'integrateur'],
  'commandes-fournisseurs': ['admin', 'integrateur'],
  fournisseurs: ['admin', 'integrateur'],
  factures: ['admin', 'integrateur'],
  paiements: ['admin', 'commercial', 'integrateur'],
  support: ['admin', 'integrateur', 'commercial'],
  cloud: ['admin', 'integrateur'],

  // Réservé admin (et lecture auditeur pour la recette)
  signatures: ['admin'],
  newsletter: ['admin'],
  recette: ['admin', 'auditeur'],
  objectives: ['admin'],
  creneaux: ['admin'],
  templates: ['admin'],
  marketing: ['admin'],
  roles: ['admin'],
  'api-tokens': ['admin'],
  users: ['admin'],
};

export function rolesCanAccess(feature: Feature, roles: RoleType[]): boolean {
  const allowed = featureRoles[feature];
  return roles.some((role) => allowed.includes(role));
}
