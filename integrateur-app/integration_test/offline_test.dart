import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:neo_integrateur/app.dart';
import 'package:neo_integrateur/core/services/feedback_log_buffer.dart';
import 'package:neo_integrateur/core/storage/hive_storage.dart';
import 'package:neo_integrateur/presentation/widgets/ds/ds.dart';

/// Parcours **hors ligne** — le coeur du metier sur chantier.
///
/// Ce fichier se lance **backend arrete**. Il verifie qu'un integrateur qui
/// perd le reseau garde une application utilisable, informative, et ne perd
/// pas ce qu'il a saisi.
///
/// Prerequis : avoir joue au moins une fois `app_test.dart` en ligne, pour
/// que la session et les donnees soient en cache local.

Future<void> settle(WidgetTester tester, {int seconds = 6}) async {
  for (var i = 0; i < seconds * 4; i++) {
    await tester.pump(const Duration(milliseconds: 250));
  }
}

Future<void> bootApp(WidgetTester tester) async {
  FeedbackLogBuffer.install();
  await HiveStorage.init();
  await tester.pumpWidget(const ProviderScope(child: NeoIntegrateurApp()));
  await settle(tester, seconds: 10);
}

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

  testWidgets('H1 — l\'application demarre et reste utilisable sans serveur',
      (tester) async {
    await bootApp(tester);

    // L'app ne doit pas rester bloquee sur un ecran de chargement.
    expect(find.byType(CircularProgressIndicator), findsNothing,
        reason: 'sans reseau, l\'app doit trancher au lieu d\'attendre. '
            'A l\'ecran : ${visibleTexts(tester)}');

    // Elle ne doit pas accuser le serveur d'une panne quand c'est la session
    // ou le reseau qui manque.
    final erreurs = find
        .byType(DsErrorState)
        .evaluate()
        .map((e) => (e.widget as DsErrorState).kind)
        .toList();
    expect(erreurs.contains(DsErrorKind.server), isFalse,
        reason: 'hors ligne n\'est pas une panne serveur : '
            'l\'etat affiche doit etre reseau ou session');

    await settle(tester, seconds: 2);
    expect(tester.takeException(), isNull,
        reason: 'aucun debordement hors ligne');
  });

  testWidgets('H2 — le travail hors ligne est annonce, pas subi',
      (tester) async {
    await bootApp(tester);

    // Si l'app est connectee (donnees en cache), elle doit dire clairement
    // qu'elle est hors ligne plutot que d'afficher des ecrans vides muets.
    final texts = visibleTexts(tester, limit: 60).join(' | ').toLowerCase();
    final annonce = texts.contains('hors ligne') ||
        texts.contains('connexion') ||
        texts.contains('session') ||
        texts.contains('réseau') ||
        texts.contains('enregistr');

    expect(annonce, isTrue,
        reason: 'l\'utilisateur doit comprendre son etat sans deviner. '
            'A l\'ecran : ${visibleTexts(tester, limit: 60)}');
  });
}
