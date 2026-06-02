import type { RecetteFeature } from '../../db/schema';

export interface CatalogueEntry {
  code: string;
  app: RecetteFeature['app'];
  module: string;
  title: string;
  description: string;
  route?: string;
}

// Catalogue exhaustif des features a recetter, recense depuis les 4 apps.
// Sert de source de verite pour le seed (idempotent par `code`).
export const recetteCatalogue: CatalogueEntry[] = [
  // ========================================================================
  // BACKOFFICE ADMIN
  // ========================================================================
  { code: 'admin-login', app: 'admin', module: 'Authentification', title: 'Connexion admin', description: 'Page de connexion pour les administrateurs', route: '/backoffice/login' },
  { code: 'admin-logout', app: 'admin', module: 'Authentification', title: 'Deconnexion', description: 'Deconnexion de l utilisateur administrateur', route: '/backoffice/logout' },
  { code: 'admin-dashboard', app: 'admin', module: 'General', title: 'Tableau de bord', description: 'Vue d ensemble avec statistiques cles, projets recents, devis en attente', route: '/backoffice' },

  { code: 'admin-users-list', app: 'admin', module: 'Utilisateurs', title: 'Liste des utilisateurs', description: 'Affichage pagine de tous les utilisateurs staff', route: '/backoffice/users' },
  { code: 'admin-user-create', app: 'admin', module: 'Utilisateurs', title: 'Creer un utilisateur', description: 'Formulaire d ajout d un nouvel utilisateur staff', route: '/backoffice/users/new' },
  { code: 'admin-user-edit', app: 'admin', module: 'Utilisateurs', title: 'Editer un utilisateur', description: 'Modification des donnees et roles d un utilisateur', route: '/backoffice/users/:id/edit' },
  { code: 'admin-user-delete', app: 'admin', module: 'Utilisateurs', title: 'Supprimer un utilisateur', description: 'Suppression d un utilisateur via action HTMX', route: '/backoffice/users' },

  { code: 'admin-clients-list', app: 'admin', module: 'Clients', title: 'Liste des clients', description: 'Affichage pagine et recherche des clients avec filtres', route: '/backoffice/clients' },
  { code: 'admin-client-create', app: 'admin', module: 'Clients', title: 'Creer un client', description: 'Formulaire de creation avec adresse et contact', route: '/backoffice/clients/new' },
  { code: 'admin-client-edit', app: 'admin', module: 'Clients', title: 'Editer un client', description: 'Modification des informations d un client', route: '/backoffice/clients/:id/edit' },
  { code: 'admin-client-detail', app: 'admin', module: 'Clients', title: 'Detail d un client', description: 'Vue detaillee avec projets associes', route: '/backoffice/clients/:id' },
  { code: 'admin-client-delete', app: 'admin', module: 'Clients', title: 'Supprimer un client', description: 'Suppression d un client via action HTMX', route: '/backoffice/clients' },

  { code: 'admin-products-list', app: 'admin', module: 'Produits', title: 'Catalogue produits', description: 'Liste paginee avec recherche, categories et statut actif/inactif', route: '/backoffice/products' },
  { code: 'admin-product-create', app: 'admin', module: 'Produits', title: 'Creer un produit', description: 'Formulaire avec categorie, fournisseur et prix', route: '/backoffice/products/new' },
  { code: 'admin-product-edit', app: 'admin', module: 'Produits', title: 'Editer un produit', description: 'Modification d un produit et gestion des dependances', route: '/backoffice/products/:id/edit' },
  { code: 'admin-product-delete', app: 'admin', module: 'Produits', title: 'Supprimer un produit', description: 'Suppression d un produit via action HTMX', route: '/backoffice/products' },
  { code: 'admin-product-import', app: 'admin', module: 'Produits', title: 'Importer des produits', description: 'Import en masse depuis un fichier', route: '/backoffice/products/import' },
  { code: 'admin-product-dependencies', app: 'admin', module: 'Produits', title: 'Dependances produits', description: 'Ajout/suppression des relations de dependance entre produits', route: '/backoffice/products/:id/edit' },

  { code: 'admin-suppliers-list', app: 'admin', module: 'Fournisseurs', title: 'Liste des fournisseurs', description: 'Affichage pagine avec recherche par nom/email', route: '/backoffice/suppliers' },
  { code: 'admin-supplier-create', app: 'admin', module: 'Fournisseurs', title: 'Creer un fournisseur', description: 'Formulaire d ajout avec contact', route: '/backoffice/suppliers/new' },
  { code: 'admin-supplier-edit', app: 'admin', module: 'Fournisseurs', title: 'Editer un fournisseur', description: 'Modification des informations d un fournisseur', route: '/backoffice/suppliers/:id/edit' },
  { code: 'admin-supplier-delete', app: 'admin', module: 'Fournisseurs', title: 'Supprimer un fournisseur', description: 'Suppression d un fournisseur via action HTMX', route: '/backoffice/suppliers' },

  { code: 'admin-projects-list', app: 'admin', module: 'Projets', title: 'Liste des projets', description: 'Affichage pagine avec filtres et recherche', route: '/backoffice/projects' },
  { code: 'admin-project-detail', app: 'admin', module: 'Projets', title: 'Detail du projet', description: 'Vue detaillee : pieces, appareils, photos, checklist, devis, historique', route: '/backoffice/projects/:id' },

  { code: 'admin-pipeline', app: 'admin', module: 'CRM', title: 'Pipeline commercial unifie', description: 'Vue Kanban des leads et projets avec filtres et recherche', route: '/backoffice/crm/pipeline' },
  { code: 'admin-lead-create', app: 'admin', module: 'CRM', title: 'Creer un lead', description: 'Formulaire de creation d un prospect avec proprietaire assigne', route: '/backoffice/crm/leads/new' },
  { code: 'admin-lead-edit', app: 'admin', module: 'CRM', title: 'Editer un lead', description: 'Modification d un prospect existant', route: '/backoffice/crm/leads/:id/edit' },
  { code: 'admin-lead-detail', app: 'admin', module: 'CRM', title: 'Detail du lead', description: 'Statut, valeur estimee, probabilite et historique', route: '/backoffice/crm/leads/:id' },
  { code: 'admin-lead-status-change', app: 'admin', module: 'CRM', title: 'Changer le statut d un lead', description: 'Mise a jour du statut avec notes et raison de perte', route: '/backoffice/crm/leads/:id' },
  { code: 'admin-lead-convert', app: 'admin', module: 'CRM', title: 'Convertir un lead en projet', description: 'Conversion d un lead en projet/client', route: '/backoffice/crm/leads/:id' },
  { code: 'admin-lead-delete', app: 'admin', module: 'CRM', title: 'Supprimer un lead', description: 'Suppression d un lead via action HTMX', route: '/backoffice/crm/pipeline' },
  { code: 'admin-crm-kpis', app: 'admin', module: 'CRM', title: 'Tableaux de bord KPI CRM', description: 'Analyses pipeline, conversions, activites, objectifs', route: '/backoffice/crm/kpis' },

  { code: 'admin-activities-list', app: 'admin', module: 'Activites', title: 'Liste des activites', description: 'Affichage pagine avec filtres par type et statut', route: '/backoffice/activities' },
  { code: 'admin-activity-create', app: 'admin', module: 'Activites', title: 'Creer une activite', description: 'Planifier une tache, appel ou reunion liee a un lead/client/projet', route: '/backoffice/activities/new' },
  { code: 'admin-activity-edit', app: 'admin', module: 'Activites', title: 'Editer une activite', description: 'Modification d une activite existante', route: '/backoffice/activities/:id/edit' },
  { code: 'admin-activity-complete', app: 'admin', module: 'Activites', title: 'Marquer comme completee', description: 'Mise a jour du statut d une activite en completee', route: '/backoffice/activities' },
  { code: 'admin-activity-delete', app: 'admin', module: 'Activites', title: 'Supprimer une activite', description: 'Suppression d une activite via action HTMX', route: '/backoffice/activities' },

  { code: 'admin-objectives-list', app: 'admin', module: 'Objectifs', title: 'Objectifs de vente', description: 'Objectifs mensuels/trimestriels/annuels par utilisateur', route: '/backoffice/objectives' },
  { code: 'admin-objective-create', app: 'admin', module: 'Objectifs', title: 'Creer un objectif', description: 'Objectif de revenu/leads/conversions/activites', route: '/backoffice/objectives/new' },
  { code: 'admin-objective-edit', app: 'admin', module: 'Objectifs', title: 'Editer un objectif', description: 'Modification d un objectif existant', route: '/backoffice/objectives/:id/edit' },
  { code: 'admin-objective-delete', app: 'admin', module: 'Objectifs', title: 'Supprimer un objectif', description: 'Suppression d un objectif via action HTMX', route: '/backoffice/objectives' },

  { code: 'admin-orders-list', app: 'admin', module: 'Commandes', title: 'Liste des commandes', description: 'Affichage pagine avec filtres par statut et recherche', route: '/backoffice/orders' },
  { code: 'admin-order-detail', app: 'admin', module: 'Commandes', title: 'Detail de la commande', description: 'Lignes, statut, adresse de livraison, numero de suivi', route: '/backoffice/orders/:id' },
  { code: 'admin-order-edit', app: 'admin', module: 'Commandes', title: 'Editer une commande', description: 'Modification des adresses et infos de suivi', route: '/backoffice/orders/:id/edit' },
  { code: 'admin-order-status-change', app: 'admin', module: 'Commandes', title: 'Changer le statut de la commande', description: 'Mise a jour du statut avec notes', route: '/backoffice/orders/:id' },

  { code: 'admin-stock-dashboard', app: 'admin', module: 'Stock', title: 'Tableau de bord stock', description: 'Produits en rupture, alertes stock et mouvements recents', route: '/backoffice/stock' },
  { code: 'admin-stock-movements', app: 'admin', module: 'Stock', title: 'Mouvements de stock', description: 'Historique pagine des entrees/sorties par type et produit', route: '/backoffice/stock/movements' },

  { code: 'admin-supplier-orders-list', app: 'admin', module: 'Achats', title: 'Commandes fournisseurs', description: 'Liste des achats avec filtres par statut', route: '/backoffice/supplier-orders' },
  { code: 'admin-supplier-order-create', app: 'admin', module: 'Achats', title: 'Creer une commande fournisseur', description: 'Creation avec selection de produits', route: '/backoffice/supplier-orders/new' },
  { code: 'admin-supplier-order-detail', app: 'admin', module: 'Achats', title: 'Detail commande fournisseur', description: 'Lignes et historique de statut', route: '/backoffice/supplier-orders/:id' },
  { code: 'admin-supplier-order-reception', app: 'admin', module: 'Achats', title: 'Enregistrer la reception', description: 'Mise a jour du statut a la reception', route: '/backoffice/supplier-orders/:id' },
  { code: 'admin-supplier-order-status-change', app: 'admin', module: 'Achats', title: 'Changer le statut (achat)', description: 'Mise a jour du statut de la commande fournisseur', route: '/backoffice/supplier-orders/:id' },

  { code: 'admin-invoices-list', app: 'admin', module: 'Facturation', title: 'Liste des factures', description: 'Affichage pagine avec filtres et alertes impayees', route: '/backoffice/invoices' },
  { code: 'admin-invoice-detail', app: 'admin', module: 'Facturation', title: 'Detail de la facture', description: 'Lignes, montants et statut', route: '/backoffice/invoices/:id' },
  { code: 'admin-invoice-from-order', app: 'admin', module: 'Facturation', title: 'Facture depuis une commande', description: 'Generation automatique a partir d une commande', route: '/backoffice/invoices' },
  { code: 'admin-invoice-status-change', app: 'admin', module: 'Facturation', title: 'Changer le statut de la facture', description: 'En attente, payee, remboursee, etc.', route: '/backoffice/invoices/:id' },

  { code: 'admin-quotes-list', app: 'admin', module: 'Devis', title: 'Liste des devis', description: 'Affichage pagine avec filtres par statut et recherche', route: '/backoffice/quotes' },
  { code: 'admin-quote-detail', app: 'admin', module: 'Devis', title: 'Detail du devis', description: 'Lignes, conditions, marge et options d envoi', route: '/backoffice/quotes/:id' },
  { code: 'admin-quote-send', app: 'admin', module: 'Devis', title: 'Envoyer un devis', description: 'Envoi au client avec creation de demande de signature', route: '/backoffice/quotes/:id' },

  { code: 'admin-signatures-list', app: 'admin', module: 'Signatures', title: 'Suivi des signatures', description: 'Demandes de signature avec statut et lien de signature', route: '/backoffice/signatures' },

  { code: 'admin-support-dashboard', app: 'admin', module: 'Support', title: 'Tableau de bord support', description: 'Tickets ouverts, SLA en danger, articles KB', route: '/backoffice/support' },
  { code: 'admin-tickets-list', app: 'admin', module: 'Support', title: 'Liste des tickets', description: 'Filtres par statut, priorite et assigne', route: '/backoffice/support/tickets' },
  { code: 'admin-ticket-detail', app: 'admin', module: 'Support', title: 'Detail du ticket', description: 'Historique, commentaires, SLA, options d escalade', route: '/backoffice/support/tickets/:id' },
  { code: 'admin-ticket-status-change', app: 'admin', module: 'Support', title: 'Changer le statut du ticket', description: 'Nouveau, ouvert, en attente, escalade, resolu, ferme', route: '/backoffice/support/tickets/:id' },
  { code: 'admin-ticket-assign', app: 'admin', module: 'Support', title: 'Assigner un ticket', description: 'Attribution a un agent de support', route: '/backoffice/support/tickets/:id' },
  { code: 'admin-ticket-escalate', app: 'admin', module: 'Support', title: 'Escalader un ticket', description: 'Escalade avec augmentation de priorite', route: '/backoffice/support/tickets/:id' },
  { code: 'admin-ticket-comment', app: 'admin', module: 'Support', title: 'Commenter un ticket', description: 'Reponses ou notes internes sur un ticket', route: '/backoffice/support/tickets/:id' },
  { code: 'admin-kb-list', app: 'admin', module: 'Support', title: 'Articles KB', description: 'Liste paginee des articles avec categories et recherche', route: '/backoffice/support/kb' },
  { code: 'admin-kb-create', app: 'admin', module: 'Support', title: 'Creer un article KB', description: 'Titre, contenu, categorie et tags', route: '/backoffice/support/kb/articles/new' },
  { code: 'admin-kb-edit', app: 'admin', module: 'Support', title: 'Editer un article KB', description: 'Modification d un article existant', route: '/backoffice/support/kb' },
  { code: 'admin-kb-delete', app: 'admin', module: 'Support', title: 'Supprimer un article KB', description: 'Suppression via action HTMX', route: '/backoffice/support/kb' },
  { code: 'admin-faq-list', app: 'admin', module: 'Support', title: 'Gestion des FAQ', description: 'Liste paginee des questions frequentes avec recherche', route: '/backoffice/support/faq' },
  { code: 'admin-faq-create', app: 'admin', module: 'Support', title: 'Creer une FAQ', description: 'Nouvelle question/reponse frequente', route: '/backoffice/support/faq/new' },
  { code: 'admin-faq-edit', app: 'admin', module: 'Support', title: 'Editer une FAQ', description: 'Modification d une entree FAQ', route: '/backoffice/support/faq' },
  { code: 'admin-faq-delete', app: 'admin', module: 'Support', title: 'Supprimer une FAQ', description: 'Suppression via action HTMX', route: '/backoffice/support/faq' },
  { code: 'admin-support-settings', app: 'admin', module: 'Support', title: 'Parametres du support', description: 'Configuration SLA, categories, reponses types', route: '/backoffice/support/settings' },
  { code: 'admin-support-sla-manage', app: 'admin', module: 'Support', title: 'Gestion des SLA', description: 'CRUD des definitions de SLA par priorite/categorie', route: '/backoffice/support/settings' },
  { code: 'admin-support-categories-manage', app: 'admin', module: 'Support', title: 'Gestion des categories', description: 'CRUD des categories de tickets', route: '/backoffice/support/settings' },
  { code: 'admin-support-canned-responses', app: 'admin', module: 'Support', title: 'Reponses types', description: 'CRUD des reponses predefinies', route: '/backoffice/support/settings' },

  // ========================================================================
  // CRM COMMERCIAL (React)
  // ========================================================================
  { code: 'crm-auth-login', app: 'crm', module: 'Authentification', title: 'Connexion', description: 'Ecran de login avec email et mot de passe', route: '/login' },
  { code: 'crm-auth-logout', app: 'crm', module: 'Authentification', title: 'Deconnexion', description: 'Se deconnecter de l application', route: '/' },

  { code: 'crm-dashboard-next-appointment', app: 'crm', module: 'Tableau de bord', title: 'Prochain rendez-vous', description: 'Affiche le prochain RDV avec details et bouton de preparation', route: '/' },
  { code: 'crm-dashboard-preparation-checklist', app: 'crm', module: 'Tableau de bord', title: 'Checklist de preparation', description: 'Cocher les 5 etapes de preparation du prochain RDV', route: '/' },
  { code: 'crm-dashboard-xp-progress', app: 'crm', module: 'Tableau de bord', title: 'Barre de progression XP', description: 'Barre animee de progression vers le prochain niveau', route: '/' },
  { code: 'crm-dashboard-streak', app: 'crm', module: 'Tableau de bord', title: 'Affichage de la serie', description: 'Affiche la serie de jours consecutifs actifs', route: '/' },
  { code: 'crm-dashboard-daily-challenges', app: 'crm', module: 'Tableau de bord', title: 'Defis quotidiens', description: 'Defis du jour avec objectifs et recompenses XP', route: '/' },
  { code: 'crm-dashboard-mini-leaderboard', app: 'crm', module: 'Tableau de bord', title: 'Mini classement', description: 'Top 3 des vendeurs sur la periode actuelle', route: '/' },
  { code: 'crm-dashboard-quick-stats', app: 'crm', module: 'Tableau de bord', title: 'Statistiques rapides', description: 'KPIs cles (leads, gagnes, taux conversion, CA)', route: '/' },
  { code: 'crm-dashboard-pipeline-overview', app: 'crm', module: 'Tableau de bord', title: 'Apercu pipeline', description: 'Graphique du nombre de leads par etape', route: '/' },
  { code: 'crm-dashboard-recent-leads', app: 'crm', module: 'Tableau de bord', title: 'Leads recents', description: 'Tableau des derniers leads crees avec statut et valeur', route: '/' },
  { code: 'crm-dashboard-upcoming-activities', app: 'crm', module: 'Tableau de bord', title: 'Activites a venir', description: 'Tableau des activites prevues pour les jours suivants', route: '/' },

  { code: 'crm-leads-list-view', app: 'crm', module: 'Leads', title: 'Liste des leads', description: 'Tableau avec tous les leads et leurs colonnes cles', route: '/leads' },
  { code: 'crm-leads-kanban-view', app: 'crm', module: 'Leads', title: 'Kanban des leads', description: 'Vue Kanban avec colonnes par statut de pipeline', route: '/leads' },
  { code: 'crm-leads-view-switcher', app: 'crm', module: 'Leads', title: 'Basculement liste/Kanban', description: 'Boutons pour passer entre vue liste et Kanban', route: '/leads' },
  { code: 'crm-leads-filters', app: 'crm', module: 'Leads', title: 'Filtres leads', description: 'Filtrer par statut, par source et reinitialiser', route: '/leads' },
  { code: 'crm-leads-kanban-drag-drop', app: 'crm', module: 'Leads', title: 'Drag-drop Kanban', description: 'Glisser un lead vers une autre colonne pour changer son statut', route: '/leads' },
  { code: 'crm-leads-status-change', app: 'crm', module: 'Leads', title: 'Changer le statut (liste)', description: 'Dropdown pour changer le statut depuis la liste', route: '/leads' },
  { code: 'crm-leads-create', app: 'crm', module: 'Leads', title: 'Creer un lead', description: 'Formulaire contact, projet, adresse et qualification', route: '/leads/new' },
  { code: 'crm-leads-edit', app: 'crm', module: 'Leads', title: 'Modifier un lead', description: 'Formulaire de modification d un lead', route: '/leads/:id/edit' },
  { code: 'crm-leads-detail', app: 'crm', module: 'Leads', title: 'Detail du lead', description: 'Statut/pipeline, description, activites, score et suggestions', route: '/leads/:id' },
  { code: 'crm-leads-detail-call-recorder', app: 'crm', module: 'Leads', title: 'Enregistreur d appel', description: 'Enregistrer un appel et relire les enregistrements', route: '/leads/:id' },
  { code: 'crm-leads-detail-stage-history', app: 'crm', module: 'Leads', title: 'Historique des etapes', description: 'Timeline de progression du lead dans le pipeline', route: '/leads/:id' },
  { code: 'crm-leads-detail-score', app: 'crm', module: 'Leads', title: 'Score prospect', description: 'Jauge de score et detail par criteres', route: '/leads/:id' },

  { code: 'crm-activities-list', app: 'crm', module: 'Activites', title: 'Liste des activites', description: 'Tableau des activites planifiees et completees', route: '/activities' },
  { code: 'crm-activities-filters', app: 'crm', module: 'Activites', title: 'Filtres activites', description: 'Filtrer par type, par statut et reinitialiser', route: '/activities' },
  { code: 'crm-activities-mark-complete', app: 'crm', module: 'Activites', title: 'Marquer complete', description: 'Marquer une activite completee avec XP gagne', route: '/activities' },
  { code: 'crm-activities-create', app: 'crm', module: 'Activites', title: 'Creer une activite', description: 'Type, duree, sujet, description, date, rappel et liaisons', route: '/activities/new' },
  { code: 'crm-activities-edit', app: 'crm', module: 'Activites', title: 'Modifier une activite', description: 'Formulaire de modification d une activite', route: '/activities/:id/edit' },

  { code: 'crm-calendar-views', app: 'crm', module: 'Agenda', title: 'Vues du calendrier', description: 'Vues mois, semaine, jour et liste avec bascule', route: '/calendar' },
  { code: 'crm-calendar-mini-stats', app: 'crm', module: 'Agenda', title: 'Mini stats agenda', description: 'RDV aujourd hui et cette semaine', route: '/calendar' },
  { code: 'crm-calendar-filters', app: 'crm', module: 'Agenda', title: 'Filtres agenda', description: 'Filtrer par type de rendez-vous (7 types)', route: '/calendar' },
  { code: 'crm-calendar-create', app: 'crm', module: 'Agenda', title: 'Creer un RDV (clic/drag)', description: 'Cliquer ou glisser sur une date pour creer un RDV', route: '/calendar' },
  { code: 'crm-appointment-form', app: 'crm', module: 'Agenda', title: 'Formulaire de RDV', description: 'Type, date/heure, duree, lieu, participants, notes, alerte conflit', route: '/calendar/new' },
  { code: 'crm-appointment-detail', app: 'crm', module: 'Agenda', title: 'Detail d un RDV', description: 'Type, lien lead, lieu (Maps), checklist de preparation', route: '/calendar/:id' },
  { code: 'crm-availability-manage', app: 'crm', module: 'Agenda', title: 'Gerer les disponibilites', description: 'Grille hebdo 30min, presets et resume des heures', route: '/calendar/availability' },
  { code: 'crm-availability-exceptions', app: 'crm', module: 'Agenda', title: 'Exceptions de disponibilite', description: 'Dates avec disponibilites differentes (motif, plage)', route: '/calendar/availability' },
  { code: 'crm-calendar-sync', app: 'crm', module: 'Agenda', title: 'Synchronisation calendrier', description: 'Lien vers la synchronisation du calendrier', route: '/calendar' },

  { code: 'crm-kpis-main-stats', app: 'crm', module: 'KPIs', title: 'Statistiques principales', description: 'Leads totaux, gagnes, taux conversion, CA', route: '/kpis' },
  { code: 'crm-kpis-pipeline-analysis', app: 'crm', module: 'KPIs', title: 'Analyse pipeline', description: 'Barres de progression par etape du pipeline', route: '/kpis' },
  { code: 'crm-kpis-conversion-by-source', app: 'crm', module: 'KPIs', title: 'Conversion par source', description: 'Taux conversion et CA par source', route: '/kpis' },
  { code: 'crm-kpis-activity-metrics', app: 'crm', module: 'KPIs', title: 'Metriques activites', description: 'Tableau des metriques par type d activite', route: '/kpis' },
  { code: 'crm-kpis-objectives-progress', app: 'crm', module: 'KPIs', title: 'Progression objectifs', description: 'Barres pour revenus, leads, conversions, activites', route: '/kpis' },
  { code: 'crm-kpis-period-selector', app: 'crm', module: 'KPIs', title: 'Selecteur de periode', description: 'Filtrer par jour, semaine, mois, annee', route: '/kpis' },

  { code: 'crm-prospection-hub', app: 'crm', module: 'Prospection', title: 'Hub de prospection', description: '4 onglets : tableau de bord, boite a outils, guide, formation', route: '/prospection' },
  { code: 'crm-prospection-scripts', app: 'crm', module: 'Prospection', title: 'Scripts telephoniques', description: 'Scripts avec conseils, depliage et texte formate', route: '/prospection' },
  { code: 'crm-prospection-email-templates', app: 'crm', module: 'Prospection', title: 'Templates emails', description: 'Templates avec sujet, corps, contexte et copie presse-papiers', route: '/prospection' },
  { code: 'crm-prospection-objections', app: 'crm', module: 'Prospection', title: 'Gestion des objections', description: '8 objections courantes avec reponses et conseils', route: '/prospection' },
  { code: 'crm-prospection-guide', app: 'crm', module: 'Prospection', title: 'Guide de prospection', description: 'Routine quotidienne, playbook par etape et benchmarks', route: '/prospection' },
  { code: 'crm-prospection-training', app: 'crm', module: 'Prospection', title: 'Formation', description: 'Connaissance produit, methodes de vente, techniques de fermeture, quiz', route: '/prospection' },
  { code: 'crm-qualification-wizard', app: 'crm', module: 'Prospection', title: 'Assistant de qualification', description: 'Wizard 5 etapes pour qualifier un prospect avec score en direct', route: '/prospection/qualify' },

  { code: 'crm-leaderboard', app: 'crm', module: 'Classement', title: 'Classement', description: 'Podium top 3 et tableau complet (rang, XP, serie, deals, CA, tendance)', route: '/leaderboard' },
  { code: 'crm-leaderboard-period', app: 'crm', module: 'Classement', title: 'Periode du classement', description: 'Selecteur semaine, mois ou tous les temps', route: '/leaderboard' },

  { code: 'crm-profile-card', app: 'crm', module: 'Profil', title: 'Carte utilisateur', description: 'Initiales, nom, role, niveau, XP total et serie', route: '/profile' },
  { code: 'crm-profile-stats', app: 'crm', module: 'Profil', title: 'Statistiques profil', description: 'Leads, deals, activites, appels, emails, reunions, visites, CA', route: '/profile' },
  { code: 'crm-profile-xp-chart', app: 'crm', module: 'Profil', title: 'Graphique XP 7j', description: 'Evolution des XP sur 7 jours', route: '/profile' },
  { code: 'crm-profile-levels', app: 'crm', module: 'Profil', title: 'Progression des niveaux', description: 'Tous les niveaux avec statut deverrouille', route: '/profile' },
  { code: 'crm-profile-badges', app: 'crm', module: 'Profil', title: 'Collection de badges', description: 'Grille des badges obtenus et non obtenus', route: '/profile' },

  { code: 'crm-cloud-stats', app: 'crm', module: 'Cloud', title: 'Stats instances cloud', description: 'Totales, en cours, en ligne, en erreur', route: '/cloud' },
  { code: 'crm-cloud-instances-table', app: 'crm', module: 'Cloud', title: 'Tableau des instances', description: 'Table filtrable avec recherche et filtre par statut', route: '/cloud' },
  { code: 'crm-cloud-instance-actions', app: 'crm', module: 'Cloud', title: 'Actions instance', description: 'Demarrer, arreter, redemarrer, detruire (avec confirmation)', route: '/cloud' },
  { code: 'crm-cloud-provision', app: 'crm', module: 'Cloud', title: 'Provisionner une instance', description: 'Modal : client, domaine, memoire, CPU', route: '/cloud' },

  // ========================================================================
  // APP INTEGRATEUR (Flutter)
  // ========================================================================
  { code: 'flutter-auth-login', app: 'flutter', module: 'Auth', title: 'Connexion', description: 'Se connecter avec email et mot de passe', route: '/login' },
  { code: 'flutter-auth-logout', app: 'flutter', module: 'Auth', title: 'Deconnexion', description: 'Se deconnecter et revenir a l ecran de connexion' },

  { code: 'flutter-dashboard-overview', app: 'flutter', module: 'Dashboard', title: 'Accueil projet', description: 'Vue d ensemble avec stats et projets recents', route: '/' },

  { code: 'flutter-projects-list', app: 'flutter', module: 'Projets', title: 'Liste des projets', description: 'Lister, filtrer par statut et chercher les projets', route: '/projects' },
  { code: 'flutter-projects-create', app: 'flutter', module: 'Projets', title: 'Creer un projet', description: 'Formulaire 2 colonnes pour creer un projet avec client', route: '/projects/new' },
  { code: 'flutter-projects-edit', app: 'flutter', module: 'Projets', title: 'Modifier un projet', description: 'Editer les informations du projet et du client', route: '/projects/:id/edit' },
  { code: 'flutter-projects-detail', app: 'flutter', module: 'Projets', title: 'Detail d un projet', description: 'Consulter infos, pieces et statut', route: '/projects/:id' },
  { code: 'flutter-projects-delete', app: 'flutter', module: 'Projets', title: 'Supprimer un projet', description: 'Confirmation et suppression definitive', route: '/projects/:id' },

  { code: 'flutter-audit-overview', app: 'flutter', module: 'Audit technique', title: 'Audit du projet', description: 'Vue d ensemble des pieces du projet', route: '/projects/:id/audit' },
  { code: 'flutter-audit-room-crud', app: 'flutter', module: 'Audit technique', title: 'Gestion des pieces', description: 'Ajouter, editer (nom/surface) et supprimer une piece', route: '/projects/:id/audit' },
  { code: 'flutter-audit-checklist', app: 'flutter', module: 'Audit technique', title: 'Checklist de piece', description: 'Voir, ajouter, cocher et supprimer les items de checklist', route: '/projects/:id/audit' },
  { code: 'flutter-audit-photos', app: 'flutter', module: 'Audit technique', title: 'Photos de piece', description: 'Capturer/charger, visualiser et supprimer des photos', route: '/projects/:id/audit' },

  { code: 'flutter-lidar-scan', app: 'flutter', module: 'Scan LiDAR', title: 'Scan LiDAR de piece', description: 'Lancer un scan LiDAR (iPad Pro) et verifier la compatibilite', route: '/projects/:id/rooms/:roomId/plan' },
  { code: 'flutter-lidar-process', app: 'flutter', module: 'Scan LiDAR', title: 'Traiter le scan', description: 'Convertir les donnees JSON LiDAR en plan d etage', route: '/projects/:id/rooms/:roomId/plan' },
  { code: 'flutter-qr-scan', app: 'flutter', module: 'Scan LiDAR', title: 'Scan via QR iPhone', description: 'Afficher un QR code et attendre le resultat du scan iPhone', route: '/projects/:id/rooms/:roomId/plan' },
  { code: 'flutter-floor-plan-canvas', app: 'flutter', module: 'Plan d etage', title: 'Editeur de plan', description: 'Afficher et editer le plan via la toile interactive', route: '/projects/:id/rooms/:roomId/plan' },
  { code: 'flutter-floor-plan-tools', app: 'flutter', module: 'Plan d etage', title: 'Palette d outils', description: 'Outils murs, portes, fenetres, meubles et proprietes', route: '/projects/:id/rooms/:roomId/plan' },
  { code: 'flutter-floor-plan-devices', app: 'flutter', module: 'Plan d etage', title: 'Placer des appareils', description: 'Placer/retirer des appareils domotiques du catalogue sur le plan', route: '/projects/:id/rooms/:roomId/plan' },
  { code: 'flutter-floor-plan-save', app: 'flutter', module: 'Plan d etage', title: 'Sauvegarder le plan', description: 'Persister le plan d etage', route: '/projects/:id/rooms/:roomId/plan' },

  { code: 'flutter-quote-list', app: 'flutter', module: 'Devis', title: 'Devis du projet', description: 'Lister les devis du projet', route: '/projects/:id/quote' },
  { code: 'flutter-quote-lines', app: 'flutter', module: 'Devis', title: 'Lignes de devis', description: 'Ajouter, editer (qte/prix/remise) et supprimer des produits', route: '/projects/:id/quote' },
  { code: 'flutter-quote-totals', app: 'flutter', module: 'Devis', title: 'Calcul des totaux', description: 'Recalcul automatique HT, TVA, TTC', route: '/projects/:id/quote' },
  { code: 'flutter-quote-pdf', app: 'flutter', module: 'Devis', title: 'PDF du devis', description: 'Generer et previsualiser le PDF du devis', route: '/quotes/:id/preview' },
  { code: 'flutter-quote-send-email', app: 'flutter', module: 'Devis', title: 'Envoyer par email', description: 'Envoyer le devis au client avec message personnalise', route: '/projects/:id/quote' },
  { code: 'flutter-quote-signature', app: 'flutter', module: 'Devis', title: 'Signature du devis', description: 'Demande de signature ou signature directe avec acceptation CGV', route: '/projects/:id/quote' },

  { code: 'flutter-catalogue-list', app: 'flutter', module: 'Catalogue', title: 'Liste des produits', description: 'Afficher le catalogue de tous les produits', route: '/catalogue' },
  { code: 'flutter-catalogue-search', app: 'flutter', module: 'Catalogue', title: 'Recherche produit', description: 'Chercher par nom, reference, categorie', route: '/catalogue' },
  { code: 'flutter-catalogue-sync', app: 'flutter', module: 'Catalogue', title: 'Synchroniser le catalogue', description: 'Recharger le catalogue depuis le serveur', route: '/catalogue' },
  { code: 'flutter-catalogue-detail', app: 'flutter', module: 'Catalogue', title: 'Detail d un produit', description: 'Prix, description, images et dependances', route: '/catalogue/:id' },

  { code: 'flutter-calendar', app: 'flutter', module: 'Rendez-vous', title: 'Calendrier', description: 'Vues mois/jour, navigation et filtre par type', route: '/calendar' },
  { code: 'flutter-appointment-crud', app: 'flutter', module: 'Rendez-vous', title: 'Gestion des RDV', description: 'Creer, consulter, editer et supprimer un rendez-vous', route: '/calendar/new' },
  { code: 'flutter-availability', app: 'flutter', module: 'Rendez-vous', title: 'Gestion des creneaux', description: 'Configurer, ajouter, editer et supprimer des creneaux', route: '/availability' },
  { code: 'flutter-tech-audit', app: 'flutter', module: 'Rendez-vous', title: 'Audit technique du RDV', description: 'Remplir et sauvegarder le formulaire d audit technique', route: '/calendar/:id/audit' },

  { code: 'flutter-tickets-list', app: 'flutter', module: 'Tickets', title: 'Liste des tickets', description: 'Lister, chercher et filtrer (statut, priorite) les tickets', route: '/tickets' },
  { code: 'flutter-ticket-create', app: 'flutter', module: 'Tickets', title: 'Creer un ticket', description: 'Formulaire pour signaler un probleme', route: '/tickets/new' },
  { code: 'flutter-ticket-detail', app: 'flutter', module: 'Tickets', title: 'Detail d un ticket', description: 'Consulter, commenter, changer statut/priorite et assigner', route: '/tickets/:id' },

  { code: 'flutter-homes-connect', app: 'flutter', module: 'Ma Maison', title: 'Connexion Home Assistant', description: 'Entrer URL et token pour se connecter a Home Assistant', route: '/homes' },
  { code: 'flutter-homes-devices', app: 'flutter', module: 'Ma Maison', title: 'Appareils connectes', description: 'Lister les appareils et voir leur etat temps reel', route: '/homes' },
  { code: 'flutter-homes-control', app: 'flutter', module: 'Ma Maison', title: 'Commander un appareil', description: 'Allumer/eteindre, luminosite, temperature', route: '/homes' },

  { code: 'flutter-sync-status', app: 'flutter', module: 'Sync offline', title: 'Etat de synchronisation', description: 'Statut en ligne/hors ligne, uploads en attente, derniere sync', route: '/' },
  { code: 'flutter-sync-manual', app: 'flutter', module: 'Sync offline', title: 'Synchronisation manuelle', description: 'Forcer la synchronisation et basculer le mode hors ligne', route: '/' },

  { code: 'flutter-navigation', app: 'flutter', module: 'Navigation', title: 'Navigation tablette', description: 'Rail de navigation (etendu sur grand ecran) et fil d Ariane', route: '/' },
  { code: 'flutter-dark-mode', app: 'flutter', module: 'Navigation', title: 'Mode sombre', description: 'Basculer theme clair/sombre', route: '/' },
  { code: 'flutter-responsive', app: 'flutter', module: 'Navigation', title: 'Layout responsif', description: 'Adaptation portrait/paysage et retours haptiques', route: '/' },

  // ========================================================================
  // SITE VITRINE (Astro)
  // ========================================================================
  { code: 'site-home', app: 'site', module: 'Pages publiques', title: 'Accueil', description: 'Hero, presentation produit, services, securite, temoignages', route: '/' },
  { code: 'site-about', app: 'site', module: 'Pages publiques', title: 'A propos', description: 'Informations sur l entreprise Neo Domotique', route: '/a-propos' },
  { code: 'site-services', app: 'site', module: 'Pages publiques', title: 'Services', description: 'Detail des services (installation, audit, maintenance)', route: '/services' },
  { code: 'site-how-it-works', app: 'site', module: 'Pages publiques', title: 'Comment ca marche', description: 'Explication du fonctionnement de la plateforme', route: '/comment-ca-marche' },
  { code: 'site-pricing', app: 'site', module: 'Pages publiques', title: 'Tarifs', description: 'Tarification des services et abonnements', route: '/tarifs' },
  { code: 'site-portfolio', app: 'site', module: 'Pages publiques', title: 'Realisations', description: 'Portfolio des projets realises', route: '/realisations' },
  { code: 'site-faq', app: 'site', module: 'Pages publiques', title: 'FAQ', description: 'Reponses aux questions frequentes', route: '/faq' },
  { code: 'site-legal', app: 'site', module: 'Pages publiques', title: 'Mentions legales', description: 'Conditions legales et mentions obligatoires', route: '/mentions-legales' },
  { code: 'site-booking', app: 'site', module: 'Fonctionnalites', title: 'Prendre rendez-vous', description: 'Reservation en ligne : calendrier, creneau, formulaire de contact', route: '/prendre-rdv' },
];
