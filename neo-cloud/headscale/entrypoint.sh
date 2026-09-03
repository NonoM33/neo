#!/bin/sh
# Demarre headscale, puis au PREMIER boot cree l'utilisateur ops et une cle API
# pour le backend Neo. La cle n'est affichee qu'une fois, dans les logs du
# conteneur : la copier dans HEADSCALE_API_KEY du backend.
set -eu
headscale serve &
PID=$!
MARK=/var/lib/headscale/.neo-bootstrapped
if [ ! -f "$MARK" ]; then
  for i in $(seq 1 30); do
    [ -S /var/run/headscale/headscale.sock ] && break
    sleep 1
  done
  headscale users create ops || true
  KEY=$(headscale apikeys create --expiration 3650d)
  echo "=================================================================="
  echo " NEO HEADSCALE BOOTSTRAP — cle API backend (affichee UNE fois) :"
  echo " $KEY"
  echo "=================================================================="
  touch "$MARK"
fi
wait $PID
