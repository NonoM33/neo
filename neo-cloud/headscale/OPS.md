# Rejoindre le mesh Neo (poste ops)

Une fois sur le mesh, une box se joint par son adresse `100.64.x.y`
(back-office > Box > « Localiser la box ») : `http://<adresse>:8123` = Home Assistant.

## macOS

```bash
brew install tailscale            # le daemon + la CLI (pas l'app du Mac App Store)
sudo brew services start tailscale
sudo tailscale up --login-server https://mesh.neo.157.180.43.90.sslip.io \
    --authkey <CLE OPS> --hostname mac-renaud --accept-dns=false
tailscale status                  # la box apparait avec son adresse 100.64.x.y
```

La cle ops est une cle pre-auth **reutilisable** de l'utilisateur `ops` (30 jours) :
elle se genere depuis l'API headscale avec la cle API du backend (voir COOLIFY.md) :

```bash
# id de l'utilisateur ops
curl -s -H "Authorization: Bearer $HEADSCALE_API_KEY" "$HEADSCALE_URL/api/v1/user?name=ops"
# cle pre-auth reutilisable 30 j, taguee ops
curl -s -X POST -H "Authorization: Bearer $HEADSCALE_API_KEY" -H 'Content-Type: application/json' \
  "$HEADSCALE_URL/api/v1/preauthkey" \
  -d '{"user":"1","reusable":true,"ephemeral":false,"expiration":"2026-10-03T00:00:00Z","aclTags":["tag:ops"]}'
```

## Ce que la politique autorise

`ops@` et `tag:ops` atteignent `tag:box` sur tous les ports. Rien d'autre : une box ne
voit ni les autres box ni les postes ops, et un poste ops ne voit pas les autres postes.

## Verifier qu'une box est arrivee

```bash
curl -s -H "Authorization: Bearer $HEADSCALE_API_KEY" "$HEADSCALE_URL/api/v1/node" | python3 -m json.tool
```
