# Mesh Neo — Headscale

Serveur de controle Tailscale auto-heberge (un conteneur, SQLite) : c'est par lui
que l'equipe Neo atteint les box installees chez les clients (`http://<ip mesh>:8123`).
Les relais DERP publics de Tailscale assurent le passage des NAT.

| element | valeur |
|---|---|
| application Coolify | `neo-headscale-prod` (projet Neo Domotique, env production) |
| domaine | `https://mesh.neo.157.180.43.90.sslip.io` (FIGE : ecrit dans chaque box) |
| build | docker-compose, `base_directory /neo-cloud/headscale`, branche `stg` |
| volume | `headscale-data:/var/lib/headscale` (declare dans le compose) |
| sante | `GET /health` |
| politique | `policy.hujson` : `ops@` -> `tag:box`, tout le reste refuse |

Au premier boot, `entrypoint.sh` cree l'utilisateur `ops` et une cle API pour le
backend, affichee UNE fois dans les logs du conteneur -> `HEADSCALE_API_KEY`.

Cote box : l'add-on `neo_box` embarque `tailscaled` en mode userspace et s'enrole
avec la cle pre-auth (`tag:box`, usage unique) recue avec sa cle API.

Cote ops (Mac) : `tailscale login --login-server https://mesh.neo.157.180.43.90.sslip.io`
puis enregistrer le noeud sous l'utilisateur `ops` (`headscale nodes register --user ops --key ...`).
