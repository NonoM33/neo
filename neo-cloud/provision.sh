#!/bin/bash
# Neo Cloud - Tenant provisioning script
# Called by the backend orchestrator to set up a new HA instance
#
# Usage: ./provision.sh <tenant_id> <admin_password> <domain> <backend_url> <api_key>

set -euo pipefail

TENANT_ID="$1"
ADMIN_PASSWORD="$2"
DOMAIN="$3"
BACKEND_URL="$4"
API_KEY="$5"

DATA_DIR="/data/neo-cloud/tenants/${TENANT_ID}"
CONFIG_DIR="${DATA_DIR}/config"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[Neo Cloud] Provisioning tenant: ${TENANT_ID}"

# 1. Create tenant config directory
mkdir -p "${CONFIG_DIR}/custom_components/neo_cloud"
mkdir -p "${CONFIG_DIR}/.storage"
mkdir -p "${CONFIG_DIR}/themes"

# 2. Copy base configuration
cp "${SCRIPT_DIR}/templates/configuration.yaml" "${CONFIG_DIR}/configuration.yaml"
cp "${SCRIPT_DIR}/templates/automations.yaml" "${CONFIG_DIR}/automations.yaml"
cp "${SCRIPT_DIR}/templates/scripts.yaml" "${CONFIG_DIR}/scripts.yaml"
cp "${SCRIPT_DIR}/templates/scenes.yaml" "${CONFIG_DIR}/scenes.yaml"
cp "${SCRIPT_DIR}/templates/customize.yaml" "${CONFIG_DIR}/customize.yaml"

# 3. Copy Neo Cloud custom component
cp -r "${SCRIPT_DIR}/custom_components/neo_cloud/"* "${CONFIG_DIR}/custom_components/neo_cloud/"

# 4. Inject tenant-specific config into configuration.yaml
cat >> "${CONFIG_DIR}/configuration.yaml" <<EOF
  backend_url: "${BACKEND_URL}"
  tenant_id: "${TENANT_ID}"
  api_key: "${API_KEY}"
EOF

# 5. Generate .storage files (onboarding bypass)
# Generate UUID for this instance
INSTANCE_UUID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")

# Onboarding completion marker
cat > "${CONFIG_DIR}/.storage/onboarding" <<EOF
{
  "version": 4,
  "minor_version": 1,
  "key": "onboarding",
  "data": {
    "done": [
      "user",
      "core_config",
      "integration",
      "analytics"
    ]
  }
}
EOF

# Core config
cat > "${CONFIG_DIR}/.storage/core.config" <<EOF
{
  "version": 1,
  "minor_version": 3,
  "key": "core.config",
  "data": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "elevation": 35,
    "unit_system_v2": "metric",
    "location_name": "Neo Domotique",
    "time_zone": "Europe/Paris",
    "external_url": "https://${DOMAIN}",
    "internal_url": null,
    "currency": "EUR",
    "country": "FR",
    "language": "fr"
  }
}
EOF

# Instance UUID
cat > "${CONFIG_DIR}/.storage/core.uuid" <<EOF
{
  "version": 1,
  "minor_version": 1,
  "key": "core.uuid",
  "data": {
    "uuid": "${INSTANCE_UUID}"
  }
}
EOF

# Analytics (opted out)
cat > "${CONFIG_DIR}/.storage/core.analytics" <<EOF
{
  "version": 1,
  "minor_version": 1,
  "key": "core.analytics",
  "data": {
    "preferences": {}
  }
}
EOF

echo "[Neo Cloud] Config generated for tenant: ${TENANT_ID}"
echo "[Neo Cloud] Instance UUID: ${INSTANCE_UUID}"
echo "[Neo Cloud] Domain: ${DOMAIN}"
