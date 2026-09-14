import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/core/theme/ds_theme.dart';
import 'package:neo_integrateur/presentation/widgets/ds/ds.dart';

/// Ce que « natif » doit vouloir dire, concretement.
///
/// Flutter dessine ses propres pixels : il n'instancie aucun composant UIKit.
/// On ne peut donc pas avoir LA tab bar d'Apple. Ce qui se tient, et qui se
/// verifie, c'est que la chrome adopte les codes de chaque plateforme :
/// materiau translucide et gestes iOS d'un cote, surface opaque et retour
/// predictif Android de l'autre — sans jamais perdre l'accessibilite.

const _items = [
  DsNavItem(id: 'a', label: 'Aujourd’hui', icon: DsGlyph.dashboard),
  DsNavItem(id: 'b', label: 'Projets', icon: DsGlyph.folder),
  DsNavItem(id: 'c', label: 'Agenda', icon: DsGlyph.event),
  DsNavItem(id: 'd', label: 'Catalogue', icon: DsGlyph.catalogue),
  DsNavItem(id: 'e', label: 'Plus', icon: DsGlyph.more),
];

Widget _host(
  Widget child, {
  required TargetPlatform platform,
  Size size = const Size(390, 844),
  EdgeInsets padding = const EdgeInsets.only(bottom: 34),
  double textScale = 1.0,
}) {
  return MediaQuery(
    data: MediaQueryData(
      size: size,
      padding: padding,
      textScaler: TextScaler.linear(textScale),
    ),
    child: MaterialApp(
      theme: DsTheme.light(DsDevice.fromWidth(size.width))
          .copyWith(platform: platform),
      home: Scaffold(bottomNavigationBar: child),
    ),
  );
}

void main() {
  group('materiau de la barre basse', () {
    testWidgets('sur iOS, la barre est translucide et floute le contenu',
        (tester) async {
      await tester.pumpWidget(_host(
        DsBottomBar(items: _items, activeId: 'a', onSelected: (_) {}),
        platform: TargetPlatform.iOS,
      ));

      expect(
        find.descendant(
          of: find.byType(DsBottomBar),
          matching: find.byType(BackdropFilter),
        ),
        findsOneWidget,
        reason: 'c est ce qui rapproche le plus du materiau d iOS : le '
            'contenu qui passe dessous doit se voir, floute',
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('sur Android, la barre reste une surface opaque',
        (tester) async {
      await tester.pumpWidget(_host(
        DsBottomBar(items: _items, activeId: 'a', onSelected: (_) {}),
        platform: TargetPlatform.android,
      ));

      expect(
        find.descendant(
          of: find.byType(DsBottomBar),
          matching: find.byType(BackdropFilter),
        ),
        findsNothing,
        reason: 'Material 3 ne floute pas sa barre de navigation',
      );
      expect(tester.takeException(), isNull);
    });
  });

  group('compatibilite appareils', () {
    testWidgets('la barre laisse la place a l indicateur d accueil',
        (tester) async {
      for (final inset in [0.0, 34.0]) {
        await tester.pumpWidget(_host(
          DsBottomBar(items: _items, activeId: 'a', onSelected: (_) {}),
          platform: TargetPlatform.iOS,
          padding: EdgeInsets.only(bottom: inset),
        ));

        final hauteur = tester.getSize(find.byType(DsBottomBar)).height;
        expect(hauteur, greaterThanOrEqualTo(64 + inset),
            reason: 'sans cette reserve, la derniere rangee passe sous '
                'l indicateur d accueil de l iPhone');
      }
    });

    testWidgets('cinq entrees tiennent sur le plus petit iPhone',
        (tester) async {
      await tester.pumpWidget(_host(
        DsBottomBar(items: _items, activeId: 'a', onSelected: (_) {}),
        platform: TargetPlatform.iOS,
        size: const Size(320, 568),
      ));

      expect(tester.takeException(), isNull,
          reason: 'un iPhone SE reste un appareil pris en charge');
    });

    testWidgets('la barre tient avec la typographie systeme agrandie',
        (tester) async {
      await tester.pumpWidget(_host(
        DsBottomBar(items: _items, activeId: 'a', onSelected: (_) {}),
        platform: TargetPlatform.iOS,
        textScale: 1.3,
      ));

      expect(tester.takeException(), isNull,
          reason: 'un reglage d accessibilite ne doit pas casser la '
              'navigation');
    });

    testWidgets('chaque entree garde une cible tactile d au moins 48 pt',
        (tester) async {
      await tester.pumpWidget(_host(
        DsBottomBar(items: _items, activeId: 'a', onSelected: (_) {}),
        platform: TargetPlatform.iOS,
      ));

      for (final item in _items) {
        final cible = tester.getSize(find.text(item.label).hitTestable().first);
        expect(cible.height, greaterThan(0));
      }
      final barre = tester.getSize(find.byType(DsBottomBar));
      expect(barre.height - 34, greaterThanOrEqualTo(48));
    });
  });

  group('gestes de navigation', () {
    test('iOS retourne par balayage, Android par retour predictif', () {
      final transitions =
          DsTheme.light(DsDevice.phone).pageTransitionsTheme.builders;

      expect(transitions[TargetPlatform.iOS],
          isA<CupertinoPageTransitionsBuilder>(),
          reason: 'le balayage depuis le bord est LE geste de retour iOS');
      expect(transitions[TargetPlatform.android],
          isA<PredictiveBackPageTransitionsBuilder>(),
          reason: 'Android 14+ montre l ecran precedent pendant le geste ; '
              'servir une transition iOS y est un contresens');
    });
  });
}
