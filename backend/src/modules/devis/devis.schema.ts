import { z } from 'zod';

// ─── Énumérations du questionnaire ───────────────────────────────────────────
export const housingTypeValues = [
  'maison',
  'appartement',
  'local_pro',
  'autre',
] as const;

export const ownershipValues = ['proprietaire', 'locataire'] as const;

export const projectKindValues = ['neuf', 'renovation', 'existant'] as const;

export const budgetValues = [
  'lt_2000',
  '2000_5000',
  '5000_10000',
  'gt_10000',
  'inconnu',
] as const;

export const timelineValues = [
  'asap',
  '1_3_mois',
  '3_6_mois',
  'plus_6_mois',
  'renseignement',
] as const;

export const contactTimeValues = [
  'matin',
  'apres_midi',
  'soir',
  'indifferent',
] as const;

export const needValues = [
  'eclairage',
  'chauffage',
  'securite',
  'volets',
  'vocal',
  'multimedia',
  'energie',
  'interphone',
] as const;

// ─── Libellés FR (réutilisés pour construire la description du lead) ──────────
export const HOUSING_LABELS: Record<(typeof housingTypeValues)[number], string> = {
  maison: 'Maison',
  appartement: 'Appartement',
  local_pro: 'Local professionnel',
  autre: 'Autre',
};

export const OWNERSHIP_LABELS: Record<(typeof ownershipValues)[number], string> = {
  proprietaire: 'Propriétaire',
  locataire: 'Locataire',
};

export const PROJECT_KIND_LABELS: Record<(typeof projectKindValues)[number], string> = {
  neuf: 'Construction neuve',
  renovation: 'Rénovation',
  existant: 'Logement existant',
};

export const BUDGET_LABELS: Record<(typeof budgetValues)[number], string> = {
  lt_2000: 'Moins de 2 000 €',
  '2000_5000': '2 000 € – 5 000 €',
  '5000_10000': '5 000 € – 10 000 €',
  gt_10000: 'Plus de 10 000 €',
  inconnu: 'À définir',
};

export const TIMELINE_LABELS: Record<(typeof timelineValues)[number], string> = {
  asap: 'Dès que possible',
  '1_3_mois': 'Dans 1 à 3 mois',
  '3_6_mois': 'Dans 3 à 6 mois',
  plus_6_mois: 'Dans plus de 6 mois',
  renseignement: 'Je me renseigne',
};

export const CONTACT_TIME_LABELS: Record<(typeof contactTimeValues)[number], string> = {
  matin: 'Le matin',
  apres_midi: "L'après-midi",
  soir: 'En soirée',
  indifferent: 'Peu importe',
};

export const NEED_LABELS: Record<(typeof needValues)[number], string> = {
  eclairage: 'Éclairage intelligent',
  chauffage: 'Chauffage / Climatisation',
  securite: 'Sécurité / Alarme / Caméras',
  volets: 'Volets / Stores',
  vocal: 'Contrôle vocal',
  multimedia: 'Multimédia / Home cinéma',
  energie: "Gestion d'énergie",
  interphone: "Interphone / Contrôle d'accès",
};

// ─── Estimation de valeur (fourchette budgétaire -> point médian) ────────────
export const BUDGET_ESTIMATED_VALUE: Record<(typeof budgetValues)[number], number | null> = {
  lt_2000: 1500,
  '2000_5000': 3500,
  '5000_10000': 7500,
  gt_10000: 12000,
  inconnu: null,
};

// ─── Schéma de la demande de devis publique ──────────────────────────────────
export const publicDevisSchema = z.object({
  // Projet
  housingType: z.enum(housingTypeValues),
  ownership: z.enum(ownershipValues).optional(),
  surface: z.coerce.number().int().positive().max(100000).optional(),
  rooms: z.coerce.number().int().positive().max(100).optional(),
  projectKind: z.enum(projectKindValues).optional(),
  // Besoins
  needs: z.array(z.enum(needValues)).max(needValues.length).default([]),
  // Budget & délai
  budget: z.enum(budgetValues).optional(),
  timeline: z.enum(timelineValues).optional(),
  // Coordonnées
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  email: z.string().email('Email invalide'),
  phone: z.string().min(1, 'Téléphone requis').max(20),
  address: z.string().max(500).optional(),
  postalCode: z.string().regex(/^[0-9]{5}$/, 'Code postal à 5 chiffres requis'),
  city: z.string().max(100).optional(),
  contactTime: z.enum(contactTimeValues).optional(),
  message: z.string().max(2000).optional(),
  consent: z
    .boolean()
    .refine((val) => val === true, { message: 'Le consentement est requis' }),
  // Honeypot anti-bot — doit rester vide
  website: z.string().max(0).optional(),
});

export type PublicDevisInput = z.infer<typeof publicDevisSchema>;
