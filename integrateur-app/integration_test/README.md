# Parcours de bout en bout — app intégrateur

Ces tests pilotent **la vraie application sur un appareil** (simulateur iPad ou
iPhone) contre l'**API réelle**. Ils couvrent les trois métiers de Neo :
auditer, vendre, intégrer.

## Prérequis

1. Backend démarré et joignable :
   ```bash
   cd backend && bun run dev
   ```
   Il doit répondre sur `http://localhost:3000` (Swagger sur `/swagger`).

2. Base peuplée avec les comptes de démonstration :
   ```bash
   cd backend && bun run db:seed
   ```
   Comptes : `admin@neo-domotique.fr`, `jean.dupont@neo-domotique.fr`
   (intégrateur), `pierre.durand@neo-domotique.fr` (auditeur) —
   mot de passe `password123`.

3. L'app pointe sur l'API locale : `EnvironmentConfig.baseUrl` en
   `development` vaut `http://localhost:3000/api`. Sur un **appareil
   physique**, remplacer par l'IP du Mac (`EnvironmentConfig.deviceDevBaseUrl`).

## Lancer

```bash
# iPad (rail de navigation, mises en page multi-zones)
flutter test integration_test/app_test.dart -d <UDID_IPAD>

# iPhone (barre basse, entrées secondaires sous « Plus »)
flutter test integration_test/app_test.dart -d <UDID_IPHONE>
```

Lister les appareils : `xcrun simctl list devices booted`.

## Ce qui est vérifié

| Parcours | Vérifie |
|---|---|
| 01 Connexion | l'app démarre sur la connexion et le compte seedé aboutit |
| 02 Sections | les six sections se chargent sans état d'erreur ni débordement |
| 03 Recherche | plusieurs termes, dans n'importe quel ordre (« ajax door ») |
| 04 Accents | « sécurité » et « securite » donnent le même résultat |
| 05 Filtres | tri, disponibilité, catégories et marques sont accessibles |
| 06 Ajout au devis | la feuille s'ouvre entière, la liste des projets est atteignable |
| 07 Projets | ouvrir un projet depuis la liste |
| 08 Aide / Bug | la fenêtre de signalement s'ouvre réellement |
| 09 Audit | l'audit d'un projet s'ouvre et répond |
| 10 Devis | le devis s'ouvre avec ses montants |
| 11 Support | la section se charge et reste stable |
| 12 Audit écrit | cocher un besoin part **jusqu'au backend** (vérifié par l'API) |
| 13 Devis chiffré | ajouter une ligne fait bouger les montants affichés |

Chaque parcours vérifie en plus, **une fois l'écran stabilisé**, l'absence de
débordement de mise en page. Les frames de transition sont volontairement
ignorées : une carte brièvement mise en page à une taille intermédiaire n'est
pas un défaut visible.

## Reprise apres coupure — `sync_recovery_test.dart`

Le parcours qui prouve la file d'attente : une saisie faite sans reseau part
en attente, puis arrive au serveur une fois le reseau revenu.

```bash
flutter test integration_test/sync_recovery_test.dart -d <UDID> \
  --dart-define=E2E_ITEM_ID=<identifiant d un point de controle>
```

Deux partis pris, chacun paye a l'usage :

- **La coupure est simulee par un port mort**, pas en arretant le backend.
  Reinstaller l'app entre deux executions efface ses donnees locales : une
  file remplie dans un premier passage n'existe plus au second. Tout tient
  donc dans UNE execution. Du point de vue du client HTTP, un port sur lequel
  personne n'ecoute est exactement une connexion refusee.
- **Pas d'interface.** L'ecran d'audit est deja couvert par `app_test.dart` ;
  un demarrage hors ligne noie le harnais de test sous les erreurs reseau
  jusqu'a le faire tomber. Ce parcours pilote la vraie pile de l'app (memes
  providers, meme Hive, meme API) sans passer par les widgets.

L'identifiant se recupere sur l'API : `/projets` puis `/projets/<id>/pieces`
puis `/pieces/<id>` — la checklist n'est pas dans la liste des pieces.

## Parcours hors ligne

`offline_test.dart` se lance **backend arrêté** : il vérifie que l'app démarre
sans serveur, ne reste pas bloquée sur un chargement, n'accuse pas le serveur
d'une panne quand c'est la session ou le réseau qui manque, et annonce son état
au lieu de le faire deviner.

```bash
# arrêter le backend, puis :
flutter test integration_test/offline_test.dart -d <UDID>
```

## Écrire un nouveau parcours

- Passer par `goToSection(tester, ['Libellé iPad', 'Libellé iPhone'])` : la
  navigation diffère entre les deux formats, un test qui vise le rail échoue
  sur iPhone.
- Utiliser `settle(tester)` et non `pumpAndSettle` : les indicateurs de
  chargement animent en continu et feraient expirer `pumpAndSettle`.
- En cas d'échec, `visibleTexts(tester)` liste ce qui est réellement à
  l'écran — c'est ce qui a permis de distinguer les vrais défauts des
  mauvaises attentes de test.
- **Restreindre les recherches à la feuille ouverte** (`find.descendant(of:
  find.byType(DsSheet), …)`) : un même libellé existe souvent derrière la
  modale, et taper dessus retombe sur la barrière, qui referme la feuille sans
  rien faire.
- **Ne jamais utiliser `warnIfMissed: false`** : il masque les taps partis dans
  le vide sur un élément hors écran, qui atterrissent alors sur la barre de
  navigation et emmènent le parcours ailleurs. Passer par `tapVisible`.
- **Vérifier une écriture à la source**, pas en renavigant : la navigation
  dépend du format d'écran. Attention au périmètre — le compteur d'un écran
  d'audit porte sur la pièce affichée, celui de l'API sur tout le projet.
- **Les sous-ressources ne sont pas dans les endpoints liste** : la checklist
  se lit dans `GET /api/pieces/{id}`, pas dans la liste des pièces. Un
  vérificateur qui interroge la mauvaise route renvoie zéro sans erreur et
  fait accuser l'app à tort.
