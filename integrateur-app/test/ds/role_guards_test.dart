import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Garde-fou : aucune action n'est proposee a un profil qui n'y a pas droit.
///
/// Paye le 2026-09-24. Connecte en AUDITEUR, l'ecran d'accueil et la liste des
/// projets affichaient « + Nouveau projet » — en-tete, bouton flottant et
/// etat vide. Le serveur repond 403 a ce profil : chaque appui echouait, et
/// l'auditeur n'avait aucun moyen de comprendre que ce n'etait pas une panne.
///
/// La regle est verifiee sur la SOURCE parce qu'elle porte sur des ecrans
/// entiers : un test de widget en couvrirait un, celui-ci les couvre tous, y
/// compris ceux qu'on ecrira demain.
void main() {
  const ecrans = [
    'lib/presentation/screens/dashboard/dashboard_screen.dart',
    'lib/presentation/screens/projects/projects_list_screen.dart',
  ];

  test('toute entree vers la creation de projet est gardee par le role', () {
    for (final chemin in ecrans) {
      final lignes = File(chemin).readAsLinesSync();

      for (var i = 0; i < lignes.length; i++) {
        if (!lignes[i].contains('goToProjectCreate()')) continue;

        // Le garde se pose sur le bloc qui porte l'appel, pas sur l'appel :
        // on cherche donc `canCreate` / `peutCreer` dans les lignes au-dessus.
        final debut = i - 12 < 0 ? 0 : i - 12;
        final voisinage = lignes.sublist(debut, i + 1).join('\n');

        expect(
          voisinage.contains('canCreate') || voisinage.contains('peutCreer'),
          isTrue,
          reason: '$chemin:${i + 1} propose la creation d\'un projet sans '
              'verifier que le profil en a le droit. L\'auditeur verrait un '
              'bouton qui repond 403.',
        );
      }
    }
  });

  test('les ecrans concernes lisent bien la regle de role', () {
    for (final chemin in ecrans) {
      final source = File(chemin).readAsStringSync();
      expect(
        source.contains('canCreateProjectProvider'),
        isTrue,
        reason: '$chemin doit lire canCreateProjectProvider, seule source de '
            'la regle — la recopier a la main la ferait diverger',
      );
    }
  });
}
