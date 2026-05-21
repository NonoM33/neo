# 📊 Neo ERP — Dashboard temps réel

Outil de pilotage de l'ERP : scanne le repo en temps réel et affiche LOC,
tests, dette technique, roadmap, fichiers monstres, TODOs, activité git.

## Lancer le dashboard

```bash
bun run _status/server.ts
# → http://localhost:4321
```

- Cliquer 🔄 **Rafraîchir** force un nouveau scan
- Cocher **Auto 30s** pour un refresh automatique
- Cliquer 📝 **STATUS.md** régénère le markdown statique à la racine du repo

## Générer un snapshot markdown (sans serveur)

```bash
bun run _status/generate-status-md.ts
# → écrit /Users/nono92/neo/STATUS.md
```

## Composition

| Fichier | Rôle |
|---|---|
| `scanner.ts` | Lit le FS et le git history, produit un `RepoStatus` JSON |
| `server.ts` | HTTP server Bun : `/`, `/api/status`, `/api/markdown` (GET+POST) |
| `index.html` | Dashboard UI (Tailwind + Chart.js + Alpine.js via CDN) |
| `generate-status-md.ts` | One-shot pour écrire `STATUS.md` à la racine |

Aucune dépendance npm — tout est inline ou via CDN.

## Ce qui est tracké

- **KPIs globaux** : LOC, fichiers, tests, modules, big files, TODOs, commits 30j
- **Santé** (✅/🟠/🔴) : tests, fichiers monstres, TODOs, état de la branche
- **Projets** : backend, integrateur-app, crm-commercial, site-vitrine, neo-cloud, whisper-proxy
- **Roadmap** : 5 sections (sprint actuel, sprints prévus, dette), kanban
- **Fichiers > 300 lignes** (cible CLAUDE.md global)
- **TODOs / FIXMEs / XXX / HACK** dans le code
- **Modules backend / écrans intégrateur / pages CRM** (auto-discovered)
- **Derniers commits** (20 derniers)

## Port

Par défaut `4321` (évite la collision avec Task Viewer en `3457` et le
backend en `3000`). Override : `PORT=5000 bun run _status/server.ts`.
