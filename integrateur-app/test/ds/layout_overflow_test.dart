import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:neo_integrateur/presentation/widgets/ds/ds.dart';

/// Non-regression sur les debordements de mise en page constates sur iPad
/// portrait : carte projet en grille (33 pt de trop) et barre de titre avec
/// sous-titre (13 pt de trop). Ces tests echouent sur l'ancien code.
Widget _host(Widget child, {Size size = const Size(1032, 1376)}) {
  return MediaQuery(
    data: MediaQueryData(size: size),
    child: MaterialApp(
      theme: DsTheme.light(DsDevice.fromWidth(size.width)),
      home: child,
    ),
  );
}

/// Reproduit les conditions reelles observees en E2E sur iPad paysage :
/// mode chantier actif, typographie agrandie.
Widget _chantierHost(Widget child) {
  const size = Size(1376, 1032);
  return MediaQuery(
    data: const MediaQueryData(size: size),
    child: MaterialApp(
      theme: DsTheme.light(DsDevice.fromWidth(size.width)),
      home: DsThemeScope(chantier: true, child: child),
    ),
  );
}

void main() {
  testWidgets(
    'la carte projet tient aussi en mode chantier, typographie agrandie',
    (tester) async {
      late double extent;

      await tester.pumpWidget(
        _chantierHost(
          Scaffold(
            body: Builder(
              builder: (context) {
                extent = DsProjectCard.gridExtent(context);
                return Center(
                  child: SizedBox(
                    width: 430,
                    height: extent,
                    child: const DsProjectCard(
                      projectName: 'Villa Leroy — Domotique complète',
                      clientName: 'François Leroy',
                      status: DsStatus.enCours,
                      address: '15 rue de la Paix, 75002 Paris',
                      progress: 1,
                      hasQuote: true,
                      // Comme sur le tableau de bord : badge « local » dans
                      // l'entete quand le projet n'est pas encore synchronise.
                      unsynced: true,
                      variant: DsProjectCardVariant.grid,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      );

      expect(tester.takeException(), isNull,
          reason: 'la hauteur de grille doit suivre l\'echelle chantier');
    },
  );

  testWidgets(
    'la carte projet tient dans la hauteur de grille annoncee par le DS',
    (tester) async {
      late double extent;

      await tester.pumpWidget(
        _host(
          Scaffold(
            body: Builder(
              builder: (context) {
                extent = DsProjectCard.gridExtent(context);
                return Center(
                  child: SizedBox(
                    width: 460,
                    height: extent,
                    child: const DsProjectCard(
                      projectName: 'Villa Leroy — Domotique complète',
                      clientName: 'François Leroy',
                      status: DsStatus.enCours,
                      address: '15 rue de la Paix, 75002 Paris',
                      progress: 1,
                      hasQuote: true,
                      variant: DsProjectCardVariant.grid,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      );

      expect(extent, greaterThan(168),
          reason: 'la hauteur figee de 168 pt etait insuffisante');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'la barre de titre avec sous-titre ne deborde pas de sa hauteur reservee',
    (tester) async {
      await tester.pumpWidget(
        _host(
          Scaffold(
            appBar: DsAppBar(
              title: 'Bon après-midi',
              subtitle: 'Jeudi 20 août 2026',
              actions: const [],
            ),
            body: const SizedBox.shrink(),
          ),
        ),
      );

      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'la barre de titre reserve la place de ses actions tactiles',
    (tester) async {
      await tester.pumpWidget(
        _host(
          Scaffold(
            appBar: DsAppBar(
              title: 'Projets',
              actions: [
                DsIconButton(
                  icon: DsGlyph.filter,
                  label: 'Filtres',
                  onPressed: () {},
                ),
                DsIconButton(
                  icon: DsGlyph.sync,
                  label: 'Synchroniser',
                  onPressed: () {},
                ),
              ],
            ),
            body: const SizedBox.shrink(),
          ),
        ),
      );

      expect(tester.takeException(), isNull,
          reason: 'une action fait 48 pt : la barre doit les reserver');
    },
  );

  testWidgets(
    'la barre de titre sans sous-titre reste compacte',
    (tester) async {
      const bar = DsAppBar(title: 'Catalogue');
      expect(bar.preferredSize.height,
          greaterThanOrEqualTo(DsSpacing.targetMin));

      const withSubtitle = DsAppBar(title: 'Catalogue', subtitle: '20 produits');
      expect(
        withSubtitle.preferredSize.height,
        greaterThan(bar.preferredSize.height),
      );
    },
  );

  testWidgets(
    'la carte en variante liste reserve la place de sa ligne de date',
    (tester) async {
      late double extent;

      await tester.pumpWidget(
        _host(
          Scaffold(
            body: Builder(
              builder: (context) {
                extent = DsProjectCard.extentFor(
                  context,
                  DsProjectCardVariant.list,
                );
                return Center(
                  child: SizedBox(
                    width: 430,
                    height: extent,
                    child: const DsProjectCard(
                      projectName: 'Maison Roux — Neuf RT2020',
                      clientName: 'Alain Roux',
                      status: DsStatus.brouillon,
                      address: '8 rue des Lilas, 31000 Toulouse',
                      dateLabel: '20 août 2026',
                      progress: 0,
                      unsynced: true,
                      variant: DsProjectCardVariant.list,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      );

      expect(
        extent,
        greaterThan(DsProjectCard.extentFor(
          tester.element(find.byType(DsProjectCard)),
          DsProjectCardVariant.grid,
        )),
        reason: 'la variante liste est plus haute que la grille',
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'la carte produit tient dans sa hauteur de grille, meme etroite',
    (tester) async {
      // Largeur serree : catalogue a trois zones, panneaux ouverts.
      // 260 pt est la largeur cible minimale garantie par la grille.
      for (final width in [260.0, 300.0, 380.0]) {
        late double extent;

        await tester.pumpWidget(
          _host(
            Scaffold(
              body: Builder(
                builder: (context) {
                  extent = DsProductCard.gridExtent(context);
                  return Center(
                    child: SizedBox(
                      width: width,
                      height: extent,
                      child: const DsProductCard(
                        name: 'Ajax MotionProtect Outdoor Extended',
                        brand: 'Ajax',
                        reference: 'AJAX-MOTION',
                        priceHT: '79,00 € HT',
                        priceTTC: '94,80 € TTC',
                        stock: DsStockLevel.disponible,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        );

        expect(tester.takeException(), isNull,
            reason: 'debordement a ${width.round()} pt de large');
      }
    },
  );

  testWidgets(
    'la barre de titre avec retour, sous-titre et actions ne deborde pas',
    (tester) async {
      // Configuration la plus chargee : c'est celle des ecrans d'audit.
      await tester.pumpWidget(
        _chantierHost(
          Scaffold(
            appBar: DsAppBar(
              title: 'Audit — Villa Leroy',
              subtitle: 'Salon · 12 sur 18 besoins relevés',
              backLabel: 'Retour au projet',
              onBack: () {},
              actions: [
                DsIconButton(
                  icon: DsGlyph.filter,
                  label: 'Filtres',
                  onPressed: () {},
                ),
                DsIconButton(
                  icon: DsGlyph.sync,
                  label: 'Synchroniser',
                  onPressed: () {},
                ),
              ],
            ),
            body: const SizedBox.shrink(),
          ),
        ),
      );

      expect(tester.takeException(), isNull,
          reason: 'retour + sous-titre + actions : la configuration la plus '
              'haute doit tenir dans la hauteur reservee');
    },
  );
}
