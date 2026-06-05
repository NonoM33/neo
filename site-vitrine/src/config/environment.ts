// Détection de l'environnement côté site vitrine.
//
// On ne dispose pas d'un drapeau d'environnement dédié au build : on déduit la
// recette (staging) de l'URL de l'API publique, qui vaut « stg.api.… » (ou
// « stg-api.… » sur les domaines sslip.io) en recette et « api.… » en prod.
// Sert à n'exposer certains outils internes (widget de feedback/signalement)
// QU'EN recette, jamais en production.

/** Vrai si l'URL d'API pointe vers l'environnement de recette (staging). */
export function isStagingApiUrl(url: string | undefined): boolean {
  const host = (url ?? '').trim().toLowerCase();
  if (!host) return false;
  // « stg » isolé en début de sous-domaine : //stg. ou //stg-
  return /\/\/stg[.-]/.test(host);
}
