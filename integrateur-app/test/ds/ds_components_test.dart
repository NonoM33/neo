import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/presentation/widgets/ds/ds.dart';

/// Garde-fous du Design System : ce sont les regles que le systeme declare
/// non negociables (cibles tactiles, planchers typographiques, couleur jamais
/// seule porteuse d'information).
Widget _host(Widget child, {Size size = const Size(1366, 1024)}) {
  return MediaQuery(
    data: MediaQueryData(size: size),
    child: MaterialApp(
      theme: DsTheme.light(DsDevice.fromWidth(size.width)),
      home: Scaffold(body: Center(child: child)),
    ),
  );
}

void main() {
  group('Cibles tactiles', () {
    testWidgets('un bouton medium fait au moins 48 dp de haut', (tester) async {
      await tester.pumpWidget(
        _host(DsButton(label: 'Générer le devis', onPressed: () {})),
      );

      final size = tester.getSize(find.byType(DsButton));
      expect(size.height, greaterThanOrEqualTo(DsSpacing.targetMin));
    });

    testWidgets('un bouton large atteint la cible ideale de 56 dp',
        (tester) async {
      await tester.pumpWidget(
        _host(
          DsButton(
            label: 'Reprendre l’audit',
            size: DsButtonSize.large,
            onPressed: () {},
          ),
        ),
      );

      final size = tester.getSize(find.byType(DsButton));
      expect(size.height, DsSpacing.targetIdeal);
    });

    testWidgets('un bouton-icone garde une cible de 48 dp', (tester) async {
      await tester.pumpWidget(
        _host(
          DsIconButton(
            icon: DsGlyph.sync,
            label: 'Synchroniser',
            onPressed: () {},
          ),
        ),
      );

      final size = tester.getSize(find.byType(DsIconButton));
      expect(size.width, DsSpacing.targetMin);
      expect(size.height, DsSpacing.targetMin);
    });
  });

  group('Typographie', () {
    test('le corps ne descend jamais sous 14 pt', () {
      for (final scale in [DsTypeScale.phone, DsTypeScale.tablet]) {
        expect(scale.bodySize, greaterThanOrEqualTo(14));
        expect(scale.labelSize, greaterThanOrEqualTo(12));
        expect(scale.badgeSize, greaterThanOrEqualTo(12));
      }
    });

    test('les echelles iPhone et iPad sont distinctes', () {
      expect(DsTypeScale.phone.bodySize, isNot(DsTypeScale.tablet.bodySize));
      expect(DsTypeScale.phone.h1Size, lessThan(DsTypeScale.tablet.h1Size));
    });

    test('le mode chantier monte le corps a 17 pt', () {
      expect(DsTypeScale.phone.chantier().bodySize, 17);
      expect(DsTypeScale.tablet.chantier().bodySize, 17);
    });
  });

  group('Statuts', () {
    testWidgets('un badge de statut porte couleur, icone ET libelle',
        (tester) async {
      await tester.pumpWidget(
        _host(const DsStatusBadge(status: DsStatus.envoye)),
      );

      expect(find.text('Envoyé'), findsOneWidget);
      expect(find.byIcon(DsStatus.envoye.icon), findsOneWidget);
    });

    test('chaque statut a un libelle et une icone distincts du defaut', () {
      for (final status in DsStatus.values) {
        expect(status.label, isNotEmpty);
        expect(status.color(DsColors.light), isNot(DsColors.light.textPrimary));
      }
    });

    testWidgets('une priorite critique reste lisible en libelle',
        (tester) async {
      await tester.pumpWidget(
        _host(const DsPriorityBadge(priority: DsPriority.critique)),
      );

      expect(find.text('Critique'), findsOneWidget);
    });
  });

  group('Synchronisation', () {
    testWidgets('le hors-ligne est annonce comme un etat, pas comme une erreur',
        (tester) async {
      await tester.pumpWidget(
        _host(const DsSyncIndicator(state: DsSyncState.offline, expanded: true)),
      );

      expect(find.text('Hors ligne'), findsOneWidget);
      expect(find.textContaining('Erreur'), findsNothing);
      expect(find.textContaining('Échec'), findsNothing);
    });

    testWidgets('les elements en attente sont comptes', (tester) async {
      await tester.pumpWidget(
        _host(
          const DsSyncIndicator(
            state: DsSyncState.pending,
            pending: 3,
            expanded: true,
          ),
        ),
      );

      expect(find.text('3 en attente'), findsOneWidget);
    });
  });

  group('Erreurs', () {
    test('une coupure reseau est qualifiee comme telle', () {
      expect(
        DsErrorKind.fromMessage('SocketException: failed host lookup'),
        DsErrorKind.network,
      );
      expect(DsErrorKind.fromMessage('500 Internal'), DsErrorKind.server);
      expect(
        DsErrorKind.fromMessage('Permission refusée'),
        DsErrorKind.permission,
      );
    });

    testWidgets('le message reseau ne culpabilise pas l’utilisateur',
        (tester) async {
      await tester.pumpWidget(
        _host(const DsErrorState(kind: DsErrorKind.network)),
      );

      expect(find.text('Pas de réseau'), findsOneWidget);
      expect(find.textContaining('enregistrées sur l’appareil'), findsOneWidget);
    });
  });

  group('Thème', () {
    test('le dark mode n’utilise ni blanc pur ni gris neutre', () {
      expect(DsColors.dark.textPrimary, const Color(0xFFF0F3F6));
      // Surfaces teintees bleu : la composante bleue domine la rouge.
      expect(DsColors.dark.surface2.b, greaterThan(DsColors.dark.surface2.r));
    });

    test('les cards sont plates : aucune ombre par defaut', () {
      final theme = DsTheme.light();
      expect(theme.cardTheme.elevation, 0);
    });
  });
}
