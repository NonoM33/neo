# Architecture Box + Cloud — Plateforme Domotique Managée

> Document d'architecture issu du brainstorming. Fige le modèle **hybride box locale + control plane cloud**, l'accès distant, l'enrôlement zero-touch et le plan de refacto.
>
> Statut : **proposition validée en brainstorm** — à raffiner avant implémentation.
> Date : juin 2026.

---

## 1. Contexte & décision

On construit une offre **Domotique-as-a-Service** white-label basée sur Home Assistant :
- Box **louée** chez le client (revenu récurrent + on garde la propriété du matériel).
- HA **rebrandé** (white-label léger : logo/nom/couleurs, on suit l'upstream).
- Installation sur site (B2C + B2B), à terme national.
- **Gestion à distance** de toute la flotte = cœur de la valeur + justification de l'abonnement.
- Scénarios métier clé en main par segment (Starter / Confort / Premium).

### Décision structurante : modèle **hybride**

| Chemin | Quand | Où tourne HA |
|---|---|---|
| **Box locale** | Dès qu'il y a du Zigbee / Z-Wave / Thread-Matter (la majorité) | Sur le Raspberry chez le client |
| **Cloud-hosted** | Client 100% WiFi / caméras IP, pas de radio locale | Container Docker sur notre infra |

Les deux chemins remontent au **même plan de contrôle** (backend Hono/Bun + Postgres existants).

---

## 2. Pourquoi la box est obligatoire (contrainte physique)

**Zigbee, Z-Wave et Thread/Matter sont des protocoles radio courte portée.** Le coordinateur radio (dongle) doit être physiquement dans la maison, à quelques mètres des devices. Impossible d'avoir le dongle dans un datacenter et les ampoules chez le client.

→ Dès qu'il y a de la radio locale, **HA tourne sur la box, point.** Le modèle 100% cloud-hosted ne couvre que les devices WiFi/cloud.

C'est pour ça que le `cloud-instances.service.ts` existant (provisioning de containers HA sur le serveur central) ne suffit pas : il décrit le chemin **cloud-hosted**, qui devient un cas **secondaire**, pas le principal.

---

## 3. Runtime de la box : **HA OS**

| Option | Updates / Backups | Customisation OS | Verdict flotte |
|---|---|---|---|
| **HA OS** | ✅ Supervisor API (OTA core+OS, snapshots, add-ons pilotables à distance) | Limitée (via add-ons) | 🥇 **Box** |
| HA Supervised | ✅ Supervisor + OS libre | Totale mais fragile (Debian strict) | ⚠️ casse-gueule en flotte |
| HA Container | ❌ tout à la main | Totale | OK pour le **cloud-hosted** (code actuel) |

**Choix : HA OS sur les box.** Le **Supervisor API** est le levier d'exploitation de la flotte : updates core+OS, snapshots automatiques, gestion add-ons — tout par API authentifiée, pilotable via le mesh. Le VPN s'installe comme **add-on**. Le white-label léger passe par **thèmes + frontend custom** (compatible HA OS).

Le snapshot automatique = assurance-vie en location : box HS → réexpédition → restore du dernier snapshot depuis MinIO → client de retour en ~10 min.

---

## 4. Les 2 plans réseau

Ne **pas** tout faire passer par le mesh. Séparer :

### Plan 1 — Sortant (permanent, sans mesh)
La box appelle le backend en **HTTPS sortant** pour tout le routinier :
- **Heartbeat** / télémétrie (recycle le custom_component `neo_cloud`).
- **Pull de config** (la box récupère sa config désirée).
- **Push des snapshots** → MinIO via **URL pré-signée** (pas via le relay mesh → zéro bande passante relayée pour les backups).

Marche derrière le pire NAT/CGNAT, zéro port ouvert chez le client, indépendant du mesh.

### Plan 2 — Mesh (à la demande, inbound admin)
NetBird sert **uniquement** quand on doit entrer *dans* la box :
- UI HA live `:8123`, Supervisor API, SSH de debug.
- L'agent reste up en permanence (coût nul) → accès instantané au besoin.

Bénéfices : moins de surface d'attaque, moins de bande passante relayée, et le système reste fonctionnel même si le mesh a un incident.

```
   CHEZ LE CLIENT                          NOTRE INFRA (Coolify / Hetzner)
┌─────────────────────┐   Plan 1 (HTTPS sortant)   ┌──────────────────────────┐
│  Box Neo (RPi)      │ ─ heartbeat ─────────────► │  Backend Hono/Bun        │
│  ├─ HA OS white-label│ ─ pull config ───────────► │  ├─ Fleet console        │
│  ├─ dongle Zigbee   │ ─ push snapshot ─► MinIO   │  ├─ Postgres             │
│  ├─ neo_cloud (HB)  │                            │  └─ NetBird Mgmt API     │
│  └─ agent NetBird   │ ◄── Plan 2 (mesh WireGuard) ──► (UI :8123, Supervisor,│
└─────────────────────┘     inbound admin à la demande        SSH)            │
        ▲                                          └──────────────────────────┘
        │ Zigbee / Matter (radio locale)
   capteurs, ampoules, volets…
```

---

## 5. Le mesh : **NetBird auto-hébergé**

**Pourquoi NetBird** (vs alternatives) :
- WireGuard, open-source, **auto-hébergeable** sur l'infra Coolify → pas de dépendance SaaS, **pas de coût par-device** (critique à 200+ box), données en France (RGPD), 100% marque blanche.
- **ACL / groupes** intégrés pour l'isolation.
- NAT traversal WireGuard (hole-punching + relay fallback).

Alternative équivalente : **Headscale + Tailscale** (control-plane communautaire moins fourni). Écarté : **Tailscale SaaS** (facturation par device qui explose à l'échelle).

**Composants à déployer** : management, signal, relay (TURN-like), dashboard, IdP/OIDC.

**Modèle d'isolation** :
- Chaque box = un peer dans son propre groupe `box-{tenantId}`.
- Policy **default-deny**.
- Seul le groupe `backend`/`ops` atteint les box. **Les box ne se voient jamais entre elles.**

---

## 6. Enrôlement zero-touch

```
PRÉPARATION (atelier, en série)
  Flash golden image HA OS
  → génère PROVISIONING_TOKEN unique (haute entropie)
  → imprime QR + code lisible sur sticker collé sur la box
  → backend: INSERT boxes(token_hash=argon2(token), status='unclaimed')

SUR SITE (app Flutter intégrateur)
  Sélection client/projet → scan QR
  → POST /api/boxes/claim { provisioning_token, client_id }
  → backend: valide, lie box↔client, status='claimed'
     crée cloudInstances(type='box', status='provisioning', tenant_id)

1er BOOT (auto-enrôlement)
  box → POST /api/boxes/enroll { provisioning_token }   (HTTPS sortant)
  → backend → NetBird Mgmt API : setup-key ONE-OFF, expiration courte,
     auto-assignée au groupe box-{tenantId}
     + policy ACL backend ↔ box-{tenantId}
  → renvoie { setup_key, tenant_id, api_key, white_label_config }
  → box: `netbird up --setup-key ...` → rejoint le mesh
  → TOKEN BRÛLÉ (single-use)
  → 1er heartbeat → status='online'
```

### Garde-fous sécurité
- `PROVISIONING_TOKEN` : single-use, stocké **hashé (argon2)**, grillé après enrôlement.
- Setup-key NetBird : **one-off + expiration courte (minutes)**.
- **Isolation par ACL** (default-deny), box jamais visibles entre elles.
- La box **n'expose jamais `:8123` sur le WAN** (mesh + LAN uniquement).
- L'app Flutter ne voit **jamais** la setup-key (elle ne fait que le claim).
- `api_key` box↔backend rotée périodiquement.

### Failure-modes couverts
- Changement de box internet/routeur → WireGuard se rétablit seul (sortant), zéro intervention.
- Internet client coupé → automatisations continuent **en local**, heartbeat reprend au retour.
- CGNAT / NAT strict → fallback relay NetBird.
- Box HS → réexpédition + restore snapshot + révocation du peer.

---

## 7. Provisioning de la golden image

Image flashée en série, contenant :
- HA OS + custom_component `neo_cloud` (heartbeat — **recyclé**).
- Add-on VPN NetBird **pré-câblé** (mais SANS setup-key partagée — récupérée JIT à l'enrôlement).
- Thème white-label + templates YAML par défaut (`automations.yaml`, `scenes.yaml`, `scripts.yaml`, `customize.yaml` — **recyclés**).
- QR d'enrôlement unique.

Pas de manip réseau chez le client : l'app Flutter (déjà sur le terrain pour l'audit/install) fait le claim.

---

## 8. OTA + snapshots

- **Updates core + OS** : via Supervisor API sur le mesh, déclenchées depuis la fleet console, **par groupes / canary** (tester sur 5 box avant de pousser à 200).
- **Snapshots** : nocturnes, tirés via Supervisor API, uploadés **box→MinIO en direct (URL pré-signée)**.
- **Restauration** : sur box de remplacement à partir du dernier snapshot.

---

## 9. Push de scénarios / config

- Templates YAML par **segment métier** (Starter / Confort / Premium).
- Déploiement : pull de config (Plan 1) **ou** écriture via mesh puis reload HA.
- Modèle "template métier" déployable d'un clic par client.

---

## 10. Refacto du code existant

Le module `backend/src/modules/cloud-instances/` pilote aujourd'hui des containers via `docker ...` en local. À faire évoluer :

### Abstraction "driver de transport"
```
InstanceDriver (interface)
 ├─ CloudDriver  → docker create/start/stop + localhost:port   (existant)
 └─ BoxDriver    → Supervisor API + SSH via IP mesh            (nouveau)
```

### Schéma
- Ajouter `cloudInstances.type: 'cloud' | 'box'`.
- Champs box : `meshIp`, `netbirdPeerId`, `supervisorToken`, etc.
- Nouvelle table `boxes` (provisioning_token hashé, status, hardware id).

### Ce qui se recycle (~70%)
- CRUD instances, schéma, pagination.
- Heartbeat (`handleHeartbeat`) + custom_component `neo_cloud`.
- Page `cloud` du CRM.
- Templates de config YAML.

### Ce qui change
- `docker create` central → enrôlement/auto-claim de la box.
- Accès `localhost:port` → accès via IP mesh (BoxDriver).
- start/stop/restart : pour les box, via Supervisor API / SSH (pas `docker stop` distant).

---

## 11. Sécurité — résumé

- Tokens single-use hashés (argon2), setup-keys one-off à expiration courte.
- ACL mesh default-deny, isolation totale entre box.
- Pas d'exposition WAN de HA.
- Secrets par-box, rotation périodique.
- Snapshots chiffrés au repos (MinIO).
- Accès admin minimal : privilégier Supervisor API / HA API sur le mesh, SSH réservé au debug (clé uniquement).

---

## 12. Questions ouvertes / prochaines étapes

- [ ] BOM box : modèle Pi (Pi 5 vs alternatives fanless), dongle Zigbee/Thread (ex. SkyConnect/Sonoff), boîtier, coût unitaire, marge location.
- [ ] Déploiement NetBird self-hosted sur Coolify (composants, dimensionnement relay).
- [ ] Détail du BoxDriver (interface précise, gestion des erreurs, timeouts).
- [ ] Stratégie white-label HA OS (thème + frontend custom : jusqu'où on pousse le rebrand ?).
- [ ] CGU location + RGPD + trademark HA (retrait propre des marques).
- [ ] App client : rebrand de l'app companion HA vs app maison.
- [ ] Pipeline canary OTA : taille des cohortes, critères de rollback.

---

## 13. Ce qui se recycle de l'existant

| Brique existante | Statut |
|---|---|
| `cloud-instances` (CRUD, schéma, heartbeat) | ♻️ Recyclé + étendu (driver) |
| custom_component `neo_cloud` | ♻️ Recyclé (télémétrie) |
| Templates YAML `neo-cloud/templates/` | ♻️ Recyclés |
| Page `cloud` CRM | ♻️ Recyclée + vue box |
| App intégrateur Flutter | ♻️ + écran "claim box" |
| MinIO (S3) | ♻️ Stockage snapshots |
| argon2 (auth) | ♻️ Hash des provisioning tokens |
| `docker create` central (cloud-instances) | ➡️ Conservé pour le chemin cloud-hosted uniquement |

---

## 14. La box physique — decisions du 2026-09-03

Materiel retenu (Renaud) :

| Element | Choix |
|---|---|
| Calculateur | Raspberry Pi 4 modele B |
| Radio | antenne/dongle Zigbee **coordinateur** en USB, pilote par **ZHA** (natif HA, pas de broker MQTT, inclus dans les snapshots) |
| Ecran | e-ink **Waveshare 2.13" HAT** (250 x 122, SPI). Le HAT n'a pas de boutons |
| Commandes | croix directionnelle + OK + Retour = **6 boutons tactiles sur GPIO** (broches BCM configurables) |
| Boitier | impression 3D |

Logiciel : le dossier `neo-box/` est un **depot d'add-ons HA OS** ; l'add-on `neo_box`
(Python 3.12, domaine pur + adaptateurs) pilote l'ecran et les boutons :

- **Installation** : QR `NEO:<jeton>` (20 caracteres Crockford, corrige O/I/L a la
  saisie) + code en clair, scanne par l'app installateur pour le `claim` (§6).
- **Statut** : Internet / Cloud / Home Assistant / Zigbee, IP, nom d'hote.
- **Erreur** : un code stable `Exx` (catalogue dans `features/errors/domain/catalogue.py`,
  jamais renomme), libelle, QR vers `https://neo-domotique.fr/aide/Exx`. Une seule
  erreur affichee, la plus bloquante d'abord (`features/status/domain/diagnosis.py`).
- **Menu** : appairage Zigbee (`zha.permit` 120 s), assistance a distance, reseau,
  redemarrage (Supervisor `/host/reboot`).

Tous les ecrans sont mesures avec les vraies metriques de police (tests de layout)
et rendus en PNG par `tools/render_screens.py` : on les regarde avant de livrer.

**Non verifie sur materiel** (pas de carte SD ni d'ecran au 2026-09-03) : driver
Waveshare, boutons GPIO, `devices` du `config.yaml`, `Dockerfile`.

Reste a faire, dans l'ordre : module backend `boxes` (table, `/enroll`, `/claim`,
session d'assistance) ; ecran « claim » dans l'app Flutter ; premier boot sur le Pi ;
NetBird self-hosted (§5) ; app client = fork companion (`neo-apps/neo-android`).
