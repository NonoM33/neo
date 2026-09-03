import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/presentation/widgets/ds/ds.dart';

/// Garde-fous des modales et des surfaces.
///
/// Ces tests existent a cause de trois defauts constates en recette sur la
/// feuille « Ajouter au devis » : une carte noire en theme clair, deux
/// poignees de glissement empilees, et un contenu coupe en bas d'ecran.
/// Ils echouent si l'un de ces defauts revient, sur n'importe quel ecran.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('surfaces du theme', () {
    testWidgets('toutes les surfaces du theme clair sont reellement claires', (tester) async {
      final scheme = DsTheme.light(DsDevice.tablet).colorScheme;

      final surfaces = <String, Color>{
        'surface': scheme.surface,
        'surfaceContainerLowest': scheme.surfaceContainerLowest,
        'surfaceContainerLow': scheme.surfaceContainerLow,
        'surfaceContainer': scheme.surfaceContainer,
        'surfaceContainerHigh': scheme.surfaceContainerHigh,
        'surfaceContainerHighest': scheme.surfaceContainerHighest,
      };

      surfaces.forEach((name, color) {
        expect(
          color.computeLuminance(),
          greaterThan(0.5),
          reason: '$name est sombre en theme clair : tout widget Material qui '
              's\'y appuie deviendra illisible (texte sombre sur fond sombre)',
        );
      });

      // inverseSurface est la seule surface volontairement sombre en clair :
      // c'est le fond des infobulles.
      expect(scheme.inverseSurface.computeLuminance(), lessThan(0.5));
      expect(scheme.onInverseSurface.computeLuminance(), greaterThan(0.5));
    });

    testWidgets('toutes les surfaces du theme sombre sont reellement sombres', (tester) async {
      final scheme = DsTheme.dark(DsDevice.tablet).colorScheme;

      final surfaces = <String, Color>{
        'surface': scheme.surface,
        'surfaceContainerLowest': scheme.surfaceContainerLowest,
        'surfaceContainerLow': scheme.surfaceContainerLow,
        'surfaceContainer': scheme.surfaceContainer,
        'surfaceContainerHigh': scheme.surfaceContainerHigh,
        'surfaceContainerHighest': scheme.surfaceContainerHighest,
      };

      surfaces.forEach((name, color) {
        expect(
          color.computeLuminance(),
          lessThan(0.5),
          reason: '$name est clair en theme sombre',
        );
      });
    });

    testWidgets('le texte reste lisible sur chaque surface du theme clair', (tester) async {
      final scheme = DsTheme.light(DsDevice.tablet).colorScheme;
      for (final surface in [
        scheme.surface,
        scheme.surfaceContainerHigh,
        scheme.surfaceContainerHighest,
      ]) {
        final contrast = _contrastRatio(scheme.onSurface, surface);
        expect(
          contrast,
          greaterThanOrEqualTo(4.5),
          reason: 'contraste texte/surface sous le seuil WCAG AA',
        );
      }
    });
  });

  group('regles de code sur les modales', () {
    test('aucune poignee de glissement dessinee a la main', () {
      final offenders = <String>[];

      for (final file in _dartFiles()) {
        final source = file.readAsStringSync();
        // Poignee maison : un bandeau large et tres fin, arrondi en pilule.
        final matches = RegExp(
          r'width:\s*(3[0-9]|4[0-9]|50),\s*\n?\s*height:\s*[2-6],',
        ).allMatches(source);
        for (final match in matches) {
          final context = source.substring(
            match.start,
            (match.end + 220).clamp(0, source.length),
          );
          if (context.contains('Full') || context.contains('full')) {
            offenders.add(file.path);
          }
        }
      }

      expect(
        offenders,
        isEmpty,
        reason: 'le theme fournit deja `showDragHandle: true` : une poignee '
            'dessinee a la main en affiche une seconde par-dessus',
      );
    });

    test('les nouvelles feuilles passent par le Design System', () {
      // Feuilles anterieures au DS, tolerees mais rendues defilantes. Cette
      // liste ne doit pas s'allonger : toute nouvelle feuille utilise
      // `showDsSheet`, qui garantit entete, fermeture et defilement.
      const legacy = {
        'lib/presentation/screens/quotes/signature_screen.dart',
        'lib/presentation/screens/floor_plan/floor_plan_screen.dart',
        'lib/presentation/screens/catalogue/product_detail_screen.dart',
        'lib/presentation/widgets/floor_plan/properties_panel.dart',
      };

      final offenders = <String>[];
      for (final file in _dartFiles()) {
        final relative = file.path.replaceFirst('${Directory.current.path}/', '');
        if (relative.startsWith('lib/presentation/widgets/ds/')) continue;
        if (legacy.contains(relative)) continue;
        if (file.readAsStringSync().contains('showModalBottomSheet')) {
          offenders.add(relative);
        }
      }

      expect(
        offenders,
        isEmpty,
        reason: 'utiliser `showDsSheet` plutot que `showModalBottomSheet`',
      );
    });

    testWidgets(
      'DsSheet rend son corps defilant et ne coupe pas un contenu long',
      (tester) async {
        await tester.pumpWidget(
          MediaQuery(
            data: const MediaQueryData(size: Size(600, 420)),
            child: MaterialApp(
              theme: DsTheme.light(DsDevice.tablet),
              home: Scaffold(
                body: DsSheet(
                  title: 'Ajouter au devis',
                  child: Column(
                    children: List.generate(
                      30,
                      (i) => SizedBox(height: 56, child: Text('Ligne $i')),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );

        expect(tester.takeException(), isNull);
        expect(
          find.byType(SingleChildScrollView),
          findsWidgets,
          reason: 'le corps d\'une feuille doit toujours pouvoir defiler',
        );
      },
    );
  });
}

List<File> _dartFiles() => Directory('lib')
    .listSync(recursive: true)
    .whereType<File>()
    .where((f) => f.path.endsWith('.dart'))
    .toList();

double _contrastRatio(Color a, Color b) {
  final la = a.computeLuminance() + 0.05;
  final lb = b.computeLuminance() + 0.05;
  return la > lb ? la / lb : lb / la;
}
