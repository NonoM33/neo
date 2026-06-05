# Neo Domotique — Site vitrine (Astro)

Site marketing statique + configurateur self-service. Build Astro, déployé via
Coolify (recette = branche `stg`, prod = branche `main`).

## Environnements

| Env | Branche | API (`PUBLIC_API_BASE_URL`) | URL site |
|-----|---------|------------------------------|----------|
| Recette (staging) | `stg` | `https://stg.api.neo-domotique.fr` | `https://stg.neo-domotique.fr` |
| Production | `main` | `https://api.neo-domotique.fr` | `https://neo-domotique.fr` |

La recette est déduite de l'URL d'API via `isStagingApiUrl()`
(`src/config/environment.ts`) → exposée par `SITE_CONFIG.isStaging`
(`src/config/site.ts`). Pas de drapeau d'environnement dédié au build.

## Règles produit (NON négociables)

### Outils internes en RECETTE UNIQUEMENT, jamais en prod

Certains outils ne doivent JAMAIS apparaître en production. Toujours les
encadrer par `{SITE_CONFIG.isStaging && (...)}`.

- **Widget de feedback / signalement** (`feedback-widget.js`, monté dans
  `src/pages/index.astro`) : recette uniquement. C'est un outil de QA interne,
  pas une fonctionnalité destinée aux visiteurs. Ne jamais le déployer en prod.

Avant de merger `stg → main`, vérifier qu'aucun outil interne (feedback, debug,
bannières de recette…) ne fuit en production.
