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
  /// Ecran -> l'appel de creation qu'il ne doit jamais proposer sans garde,
  /// et le provider qui porte la regle.
  const ecrans = {
    'lib/presentation/screens/dashboard/dashboard_screen.dart': (
      'goToProjectCreate()',
      'canCreateProjectProvider',
    ),
    'lib/presentation/screens/projects/projects_list_screen.dart': (
      'goToProjectCreate()',
      'canCreateProjectProvider',
    ),
    'lib/presentation/screens/tickets/tickets_list_screen.dart': (
      'goToTicketCreate()',
      'canCreateTicketProvider',
    ),
  };

  test('toute entree vers une creation est gardee par le role', () {
    for (final entree in ecrans.entries) {
      final chemin = entree.key;
      final appelCreation = entree.value.$1;
      final lignes = File(chemin).readAsLinesSync();

      for (var i = 0; i < lignes.length; i++) {
        if (!lignes[i].contains(appelCreation)) continue;

        // Le garde se pose sur le bloc qui porte l'appel, pas sur l'appel :
        // on cherche donc `canCreate` / `peutCreer` dans les lignes au-dessus.
        final debut = i - 12 < 0 ? 0 : i - 12;
        final voisinage = lignes.sublist(debut, i + 1).join('\n');

        expect(
          voisinage.contains('canCreate') || voisinage.contains('peutCreer'),
          isTrue,
          reason: '$chemin:${i + 1} appelle $appelCreation sans verifier que '
              'le profil en a le droit. L\'auditeur verrait un bouton qui '
              'repond 403.',
        );
      }
    }
  });

  test('les ecrans concernes lisent bien la regle de role', () {
    for (final entree in ecrans.entries) {
      final source = File(entree.key).readAsStringSync();
      expect(
        source.contains(entree.value.$2),
        isTrue,
        reason: '${entree.key} doit lire ${entree.value.$2}, seule source de '
            'la regle — la recopier a la main la ferait diverger',
      );
    }
  });
}
