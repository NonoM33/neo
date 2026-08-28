// Coordonnées de contact affichées aux prospects (site vitrine, emails, écrans
// de confirmation). Source unique côté backend : le site vitrine a la sienne
// dans site-vitrine/src/config/site.ts, et les deux sont figées par des tests.

/** Numéro de téléphone commercial, format affiché. */
export const CONTACT_PHONE = '07 78 57 18 19';

/** Le même numéro au format lien `tel:` (E.164). */
export const CONTACT_PHONE_HREF = 'tel:+33778571819';

/** Invitation à appeler, ajoutée aux messages de confirmation. */
export const CALL_US_SENTENCE = `Pour aller plus vite, appelez-nous au ${CONTACT_PHONE}.`;
