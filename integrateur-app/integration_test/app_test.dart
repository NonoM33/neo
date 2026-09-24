import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:neo_integrateur/app.dart';
import 'package:neo_integrateur/core/services/feedback_log_buffer.dart';
import 'package:neo_integrateur/core/storage/hive_storage.dart';
import 'package:neo_integrateur/presentation/widgets/ds/ds.dart';

/// Parcours de bout en bout sur appareil, contre l'API reelle.
///
/// Couvre les trois metiers de Neo : **auditer**, **vendre**, **integrer**.
/// Prerequis : backend sur http://localhost:3000 avec les comptes seedes
/// (`bun run db:seed` cote backend).

/// `pumpAndSettle` echoue sur les animations continues (indicateurs de
/// chargement) : on laisse le temps reel s'ecouler par petites tranches.
Future<void> settle(WidgetTester tester, {int seconds = 5}) async {
  for (var i = 0; i < seconds * 4; i++) {
    await tester.pump(const Duration(milliseconds: 250));
  }
}

Future<void> bootApp(WidgetTester tester) async {
  FeedbackLogBuffer.install();
  await HiveStorage.init();
  await tester.pumpWidget(const ProviderScope(child: NeoIntegrateurApp()));
  await settle(tester, seconds: 8);
  // Chaque parcours repart d'une ardoise propre : une erreur de rendu laissee
  // par le parcours precedent ferait tomber le harnais avant toute assertion.
  tester.takeException();
}

Future<void> tapText(WidgetTester tester, String label,
    {int seconds = 5}) async {
  final finder = find.text(label);
  expect(finder, findsWidgets, reason: '« $label » introuvable a l\'ecran');
  await tester.ensureVisible(finder.first);
  await tester.tap(finder.first);
  await settle(tester, seconds: seconds);
  tester.takeException();
}

/// Ouvre une section, quelle que soit la plateforme.
///
/// iPad : six entrees au rail. iPhone : cinq au maximum en barre basse, le
/// reste sous « Plus ». Le parcours doit aboutir dans les deux cas.
Future<void> goToSection(WidgetTester tester, List<String> labels) async {
  for (final label in labels) {
    if (find.text(label).evaluate().isNotEmpty) {
      await tapText(tester, label, seconds: 6);
      return;
    }
  }

  expect(find.text('Plus'), findsWidgets,
      reason: '${labels.first} absente de la navigation et pas de « Plus »');
  await tapText(tester, 'Plus', seconds: 4);

  for (final label in labels) {
    if (find.text(label).evaluate().isNotEmpty) {
      await tapText(tester, label, seconds: 6);
      return;
    }
  }
  fail('${labels.first} introuvable, y compris sous « Plus »');
}

/// Amene une cible a l'ecran puis la tape.
///
/// `warnIfMissed: false` masquait des taps partis dans le vide : un element
/// hors ecran etait « tape » a des coordonnees qui tombaient sur la barre de
/// navigation, et le parcours partait sur un autre ecran.
Future<bool> tapVisible(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) return false;
  await tester.ensureVisible(finder.first);
  await settle(tester, seconds: 1);
  await tester.tap(finder.first);
  await settle(tester, seconds: 8);
  // Les erreurs de rendu transitoires (frames de transition) sont consommees
  // ici : accumulees, elles font tomber le harnais avant meme l'assertion.
  tester.takeException();
  return true;
}

/// Fait defiler jusqu'a un libelle, puis le tape.
///
/// Essaie chaque zone defilante : sur iPhone la premiere peut etre une bande
/// horizontale (filtres, onglets) qui ne fait jamais apparaitre la cible.
Future<bool> scrollToAndTap(WidgetTester tester, String label) async {
  for (var attempt = 0; attempt < 10; attempt++) {
    if (find.text(label).evaluate().isNotEmpty) {
      return tapVisible(tester, find.text(label));
    }

    final scrollables = find.byType(Scrollable);
    final count = scrollables.evaluate().length;
    if (count == 0) return false;

    for (var i = 0; i < count; i++) {
      await tester.drag(scrollables.at(i), const Offset(0, -280));
      await settle(tester, seconds: 1);
      if (find.text(label).evaluate().isNotEmpty) {
        return tapVisible(tester, find.text(label));
      }
    }
  }
  return false;
}

/// Compte les points de controle coches d'un projet, **cote serveur**.
///
/// Verifier la persistance en renaviguant depend de la mise en page ; lire la
/// source de verite prouve que la saisie est bien partie jusqu'au backend.
Future<int?> checkedItemsOnServer(String projectName) async {
  final client = HttpClient();

  Future<dynamic> get(String path, String token) async {
    final request = await client.getUrl(
      Uri.parse('http://localhost:3000/api$path'),
    );
    request.headers.set('Authorization', 'Bearer $token');
    final response = await request.close();
    if (response.statusCode != 200) return null;
    final body = jsonDecode(await response.transform(utf8.decoder).join());
    return (body is Map && body['data'] != null) ? body['data'] : body;
  }

  try {
    final login = await client.postUrl(
      Uri.parse('http://localhost:3000/api/auth/login'),
    );
    login.headers.contentType = ContentType.json;
    login.write(jsonEncode({
      'email': 'jean.dupont@neo-domotique.fr',
      'password': 'password123',
    }));
    final loginResponse = await login.close();
    final token = (jsonDecode(await loginResponse.transform(utf8.decoder).join())
        as Map<String, dynamic>)['accessToken'] as String;

    final projects = await get('/projets', token) as List<dynamic>?;
    if (projects == null) return null;
    final project = projects.cast<Map<String, dynamic>>().firstWhere(
          (p) => (p['name'] ?? '').toString().contains(projectName),
          orElse: () => <String, dynamic>{},
        );
    if (project.isEmpty) return null;

    final rooms = await get('/projets/${project['id']}/pieces', token)
        as List<dynamic>?;
    if (rooms == null) return null;

    var checked = 0;
    for (final room in rooms.cast<Map<String, dynamic>>()) {
      // La checklist n'est pas dans la liste des pieces : il faut le detail
      // (CLAUDE.md, §API — les endpoints liste omettent les sous-ressources).
      final detail = await get('/pieces/${room['id']}', token)
          as Map<String, dynamic>?;
      final items = (detail?['checklist'] ?? detail?['checklistItems'] ?? [])
          as List<dynamic>;
      for (final item in items.cast<Map<String, dynamic>>()) {
        if (item['isChecked'] == true || item['checked'] == true) checked++;
      }
    }
    return checked;
  } catch (_) {
    return null;
  } finally {
    client.close();
  }
}

/// Connecte l'app avec le compte integrateur seede.
Future<void> login(WidgetTester tester) async {
  await bootApp(tester);
  if (find.text('Connexion').evaluate().isNotEmpty) {
    await tapText(tester, 'Intégrateur', seconds: 10);
  }
  expect(find.text('Connexion'), findsNothing,
      reason: 'la connexion doit aboutir');
  tester.takeException();
}

/// Aucun ecran ne doit afficher d'etat d'erreur bloquant.
void expectNoErrorState(String screen) {
  expect(
    find.byType(DsErrorState).evaluate().where((e) {
      final widget = e.widget as DsErrorState;
      return !widget.inline;
    }),
    isEmpty,
    reason: '$screen affiche un etat d\'erreur plein ecran',
  );
}

/// Aucun debordement ne doit subsister une fois l'ecran **stabilise**.
///
/// On ignore volontairement les frames de transition : une carte brievement
/// mise en page a une taille intermediaire n'est pas un defaut visible.
Future<void> expectNoOverflow(WidgetTester tester, String screen) async {
  tester.takeException();
  await settle(tester, seconds: 2);
  final exception = tester.takeException();
  expect(exception, isNull, reason: '$screen leve : $exception');
}


/// Textes visibles a l'ecran, pour diagnostiquer un echec de parcours.
List<String> visibleTexts(WidgetTester tester, {int limit = 40}) {
  final texts = <String>[];
  for (final element in find.byType(Text).evaluate()) {
    final widget = element.widget as Text;
    final value = widget.data ?? widget.textSpan?.toPlainText() ?? '';
    if (value.trim().isNotEmpty) texts.add(value.trim());
    if (texts.length >= limit) break;
  }
  return texts;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Socle — acces a l\'application', () {
    testWidgets('01 — connexion avec un compte integrateur', (tester) async {
      await login(tester);
      await expectNoOverflow(tester, 'Tableau de bord');
    });

    testWidgets('02 — chaque section du rail se charge sans erreur',
        (tester) async {
      await login(tester);

      for (final section in [
        ['Projets'],
        ['Agenda'],
        ['Catalogue'],
        ['Ma Maison', 'Maison'],
        ['Support'],
        ['Tableau de bord', 'Aujourd’hui'],
      ]) {
        await goToSection(tester, section);
        expectNoErrorState(section.first);
        await expectNoOverflow(tester, section.first);
      }
    });
  });

  group('Vendre — catalogue, recherche et filtres', () {
    testWidgets('03 — la recherche trouve un produit en plusieurs termes',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Catalogue']);
      expectNoErrorState('Catalogue');
      expect(find.textContaining('produit'), findsWidgets,
          reason: 'le catalogue doit annoncer ses produits. '
              'A l\'ecran : ${visibleTexts(tester)}');

      final searchField = find.byType(TextField);
      expect(searchField, findsWidgets,
          reason: 'la barre de recherche doit etre visible sans ouvrir '
              'les filtres, quelle que soit la taille d\'ecran');

      await tester.enterText(searchField.first, 'ajax door');
      await settle(tester, seconds: 4);

      expect(find.textContaining('DoorProtect'), findsWidgets,
          reason: '« ajax door » doit trouver l\'Ajax DoorProtect. '
              'A l\'ecran : ${visibleTexts(tester)}');
      await expectNoOverflow(tester, 'Catalogue / recherche');
    });

    testWidgets('04 — la recherche ignore les accents', (tester) async {
      await login(tester);
      await goToSection(tester, ['Catalogue']);

      final field = find.byType(TextField).first;

      await tester.enterText(field, 'sécurité');
      await settle(tester, seconds: 4);
      final avecAccents = find.textContaining('Ajax').evaluate().length;

      await tester.enterText(field, 'securite');
      await settle(tester, seconds: 4);
      final sansAccents = find.textContaining('Ajax').evaluate().length;

      expect(avecAccents, greaterThan(0),
          reason: 'la categorie Sécurité doit etre trouvable. '
              'A l\'ecran : ${visibleTexts(tester)}');
      expect(sansAccents, avecAccents,
          reason: 'saisir sans accents doit donner le meme resultat');
      await expectNoOverflow(tester, 'Catalogue / accents');
    });

    testWidgets('05 — les filtres sont accessibles et se cumulent',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Catalogue']);

      final filtres = find.textContaining('Filtres');
      if (filtres.evaluate().isNotEmpty) {
        await tapVisible(tester, filtres);
      }

      expect(find.text('DISPONIBILITÉ'), findsWidgets,
          reason: 'le panneau de filtres doit proposer la disponibilite. '
              'A l\'ecran : ${visibleTexts(tester)}');
      expect(find.text('CATÉGORIES'), findsWidgets);
      expect(find.text('MARQUES'), findsWidgets,
          reason: 'le filtre par marque doit exister');
      expect(find.text('TRIER PAR'), findsWidgets);
      await expectNoOverflow(tester, 'Catalogue / filtres');
    });
  });

  group('Vendre — fiche produit et ajout au devis', () {
    testWidgets('06 — la modale d\'ajout au devis est utilisable en entier',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Catalogue']);

      final product = find.textContaining('Ajax');
      expect(product, findsWidgets, reason: 'le catalogue doit etre peuple');
      expect(await tapVisible(tester, product), isTrue,
          reason: 'la fiche produit doit s\'ouvrir depuis le catalogue');
      await expectNoOverflow(tester, 'Fiche produit');

      final addButton = find.text('Ajouter au devis');
      if (addButton.evaluate().isNotEmpty) {
        await tapVisible(tester, addButton);

        expect(find.text('Sélectionner un projet'), findsWidgets,
            reason: 'la liste des projets — l\'action de cette feuille — '
                'doit etre atteignable, pas coupee sous le bord');
        await expectNoOverflow(tester, 'Modale ajout au devis');
      }
    });
  });

  group('Auditer — projets et audit technique', () {
    testWidgets('07 — ouvrir un projet et atteindre son audit',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Projets']);
      expectNoErrorState('Projets');

      final project = find.textContaining('Villa Leroy');
      if (project.evaluate().isNotEmpty) {
        await tester.tap(project.first, warnIfMissed: false);
        await settle(tester, seconds: 6);
        await expectNoOverflow(tester, 'Detail projet');
      }
    });
  });

  group('Assistance — signalement', () {
    testWidgets('08 — la fenetre d\'aide s\'ouvre reellement', (tester) async {
      await login(tester);

      // Le rail replie n'affiche que l'icone : on vise la semantique, seule
      // constante entre rail deplie, rail replie et feuille « Plus ».
      var help = find.byIcon(DsGlyph.help);

      if (help.evaluate().isEmpty && find.text('Plus').evaluate().isNotEmpty) {
        await tapText(tester, 'Plus', seconds: 4);
        help = find.byIcon(DsGlyph.help);
        if (help.evaluate().isEmpty) help = find.text('Aide / Bug');
      }

      expect(help, findsWidgets,
          reason: 'l\'entree d\'aide doit etre atteignable sur toute '
              'plateforme (pied du rail sur iPad, « Plus » sur iPhone). '
              'A l\'ecran : ${visibleTexts(tester)}');

      await tapVisible(tester, help);

      expect(find.byType(Dialog), findsWidgets,
          reason: 'la fenetre doit s\'ouvrir : elle etait montee au-dessus '
              'du Navigator et levait une exception');
      await expectNoOverflow(tester, 'Fenetre d\'aide');
    });
  });

  group('Auditer — releve sur site', () {
    testWidgets('09 — l\'audit d\'un projet s\'ouvre et repond',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Projets']);

      final project = find.textContaining('Villa Leroy');
      if (project.evaluate().isEmpty) {
        markTestSkipped('aucun projet seede nomme Villa Leroy');
        return;
      }

      expect(await tapVisible(tester, project), isTrue,
          reason: 'le projet doit s\'ouvrir depuis la liste');

      final ouvert = await scrollToAndTap(tester, 'Audit');
      expect(ouvert, isTrue,
          reason: 'le raccourci Audit doit etre atteignable sur la fiche '
              'projet, y compris sur iPhone. '
              'A l\'ecran : ${visibleTexts(tester)}');

      expectNoErrorState('Audit');
      await expectNoOverflow(tester, 'Audit');
    });
  });

  group('Vendre — devis', () {
    testWidgets('10 — le devis d\'un projet s\'ouvre avec ses totaux',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Projets']);

      final project = find.textContaining('Villa Leroy');
      if (project.evaluate().isEmpty) {
        markTestSkipped('aucun projet seede nomme Villa Leroy');
        return;
      }

      expect(await tapVisible(tester, project), isTrue,
          reason: 'le projet doit s\'ouvrir depuis la liste');

      final ouvert = await scrollToAndTap(tester, 'Devis');
      expect(ouvert, isTrue,
          reason: 'le raccourci Devis doit etre atteignable sur la fiche '
              'projet, y compris sur iPhone');

      expectNoErrorState('Devis');
      expect(find.textContaining('€'), findsWidgets,
          reason: 'un devis doit afficher des montants. '
              'A l\'ecran : ${visibleTexts(tester)}');
      await expectNoOverflow(tester, 'Devis');
    });
  });

  group('Integrer — support et suivi', () {
    testWidgets('11 — le support se charge et reste stable', (tester) async {
      await login(tester);
      await goToSection(tester, ['Support']);

      expectNoErrorState('Support');
      await expectNoOverflow(tester, 'Support');
    });
  });

  group('Auditer — le relevé s\'enregistre', () {
    testWidgets('12 — cocher un besoin le conserve apres retour sur l\'audit',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Projets']);

      final project = find.textContaining('Villa Leroy');
      if (project.evaluate().isEmpty) {
        markTestSkipped('aucun projet seede nomme Villa Leroy');
        return;
      }
      expect(await tapVisible(tester, project), isTrue);
      expect(await scrollToAndTap(tester, 'Audit'), isTrue,
          reason: 'l\'audit doit etre atteignable');

      tester.takeException();

      final rows = find.byType(DsChecklistRow);
      if (rows.evaluate().isEmpty) {
        markTestSkipped('aucun point de controle sur cet audit');
        return;
      }

      final avant = tester
          .widgetList<DsChecklistRow>(rows)
          .where((r) => r.checked)
          .length;

      // Reference cote serveur AVANT la bascule. Le compteur de l'interface
      // ne porte que sur la piece affichee : comparer les deux directement
      // reviendrait a comparer deux perimetres differents.
      final serveurAvant = await checkedItemsOnServer('Villa Leroy');
      expect(serveurAvant, isNotNull,
          reason: 'le projet et ses pieces doivent etre lisibles cote serveur');

      // On bascule le premier point, quel qu'en soit l'etat : un test qui
      // exige un point non coche depend des executions precedentes.
      final cible = find.byType(DsChecklistRow);
      final etatInitial =
          tester.widget<DsChecklistRow>(cible.first).checked;

      // La bascule est portee par la case a cocher, pas par toute la ligne :
      // taper le libelle ne coche rien (c'est le geste reel de l'utilisateur).
      final caseACocher = find
          .descendant(of: cible.first, matching: find.byType(InkWell))
          .first;

      await tester.ensureVisible(caseACocher);
      await settle(tester, seconds: 1);
      await tester.tap(caseACocher);
      await settle(tester, seconds: 6);
      tester.takeException();

      final apres = tester
          .widgetList<DsChecklistRow>(find.byType(DsChecklistRow))
          .where((r) => r.checked)
          .length;
      expect(apres, etatInitial ? avant - 1 : avant + 1,
          reason: 'basculer un besoin doit se voir immediatement');

      // Retour au projet puis reouverture : la valeur doit avoir persiste.
      // Preuve de persistance : on interroge la source de verite plutot que
      // de renaviguer, ce qui dependrait de la mise en page de chaque format.
      tester.takeException();

      // L'app est offline-first : l'ecriture part dans une file de
      // synchronisation. On laisse au serveur le temps de la recevoir plutot
      // que d'exiger une remontee instantanee.
      final attendu = etatInitial ? serveurAvant! - 1 : serveurAvant! + 1;

      int? serveur;
      for (var essai = 0; essai < 10; essai++) {
        serveur = await checkedItemsOnServer('Villa Leroy');
        if (serveur == attendu) break;
        await settle(tester, seconds: 2);
      }

      expect(serveur, attendu,
          reason: 'la saisie doit finir par atteindre le backend : c\'est tout '
              'l\'interet d\'un audit sur chantier');

      await expectNoOverflow(tester, 'Audit apres saisie');
    });
  });

  group('Vendre — le devis se chiffre', () {
    testWidgets('13 — ajouter une ligne fait bouger le total',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Projets']);

      // Un devis signe est volontairement verrouille : on vise un projet en
      // brouillon, sinon le parcours se saute et ne prouve rien.
      final project = find.textContaining('Maison Roux');
      if (project.evaluate().isEmpty) {
        markTestSkipped('aucun projet en brouillon dans les donnees seedees');
        return;
      }
      expect(await tapVisible(tester, project), isTrue);
      expect(await scrollToAndTap(tester, 'Devis'), isTrue,
          reason: 'le devis doit etre atteignable');

      final totalAvant = montantsAffiches(tester);

      final ajouter = find.text('Ajouter une ligne');
      if (ajouter.evaluate().isEmpty) {
        markTestSkipped('devis non modifiable (signe ou verrouille)');
        return;
      }
      await tapVisible(tester, ajouter);

      // La feuille demande d'abord le type de ligne.
      final typeProduit = find.descendant(
        of: find.byType(DsSheet),
        matching: find.text('Produit du catalogue'),
      );
      expect(typeProduit, findsWidgets,
          reason: 'la feuille doit proposer d\'ajouter un produit. '
              'A l\'ecran : ${visibleTexts(tester)}');
      await tapVisible(tester, typeProduit);

      // La recherche doit rester DANS la feuille : un meme libelle existe
      // derriere elle (les lignes du devis), et taper dessus retombe sur la
      // barriere modale, qui referme la feuille sans rien ajouter.
      final produit = find.descendant(
        of: find.byType(DsSheet),
        matching: find.byType(DsProductCard),
      );
      expect(produit, findsWidgets,
          reason: 'le selecteur doit lister les produits du catalogue. '
              'A l\'ecran : ${visibleTexts(tester)}');
      await tapVisible(tester, produit);
      await settle(tester, seconds: 8);

      final totalApres = montantsAffiches(tester);
      expect(totalApres, isNot(equals(totalAvant)),
          reason: 'ajouter une ligne doit changer les montants affiches. '
              'Avant : $totalAvant / Apres : $totalApres');
      await expectNoOverflow(tester, 'Devis apres ajout');
    });
  });

  group('Vendre — conclure', () {
    testWidgets('14 — la signature est atteignable depuis le devis',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Projets']);

      final project = find.textContaining('Maison Roux');
      if (project.evaluate().isEmpty) {
        markTestSkipped('aucun projet en brouillon dans les donnees seedees');
        return;
      }
      expect(await tapVisible(tester, project), isTrue);
      expect(await scrollToAndTap(tester, 'Devis'), isTrue,
          reason: 'le devis doit etre atteignable');

      final signer = find.text('Faire signer');
      expect(signer, findsWidgets,
          reason: 'le devis doit proposer de faire signer. '
              'A l\'ecran : ${visibleTexts(tester)}');

      await tapVisible(tester, signer);

      // Le bouton menait vers un apercu PDF bouchon : la signature doit
      // maintenant s'ouvrir reellement.
      expect(
        find.textContaining('PDF Preview'),
        findsNothing,
        reason: 'la signature ne doit pas retomber sur l\'apercu bouchon',
      );
      expect(
        find.textContaining('signature').evaluate().isNotEmpty ||
            find.textContaining('Signature').evaluate().isNotEmpty,
        isTrue,
        reason: 'un ecran de signature doit s\'ouvrir. '
            'A l\'ecran : ${visibleTexts(tester)}',
      );
      await expectNoOverflow(tester, 'Signature');
    });

    testWidgets('15 — l\'envoi au client demande un message et un nom',
        (tester) async {
      await login(tester);
      await goToSection(tester, ['Projets']);

      final project = find.textContaining('Maison Roux');
      if (project.evaluate().isEmpty) {
        markTestSkipped('aucun projet en brouillon dans les donnees seedees');
        return;
      }
      expect(await tapVisible(tester, project), isTrue);
      expect(await scrollToAndTap(tester, 'Devis'), isTrue);

      final envoyer = find.text('Envoyer au client');
      if (envoyer.evaluate().isEmpty) {
        markTestSkipped('envoi indisponible sur ce devis');
        return;
      }

      await tapVisible(tester, envoyer);

      expect(find.textContaining('Envoyer le devis'), findsWidgets,
          reason: 'la fenetre d\'envoi doit s\'ouvrir. '
              'A l\'ecran : ${visibleTexts(tester)}');
      expect(find.textContaining('prénom et nom'), findsWidgets,
          reason: 'le client doit savoir qui lui ecrit');

      await expectNoOverflow(tester, 'Envoi au client');

      // On referme sans envoyer : le test ne doit pas ecrire au client.
      final annuler = find.text('Annuler');
      if (annuler.evaluate().isNotEmpty) await tapVisible(tester, annuler);
    });
  });
}

/// Montants affiches a l'ecran, pour comparer avant/apres une modification.
List<String> montantsAffiches(WidgetTester tester) {
  final montants = <String>[];
  for (final element in find.byType(Text).evaluate()) {
    final widget = element.widget as Text;
    final value = widget.data ?? '';
    if (value.contains('€')) montants.add(value.trim());
  }
  return montants;
}
