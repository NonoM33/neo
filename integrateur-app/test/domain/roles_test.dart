import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/domain/entities/user.dart';

/// Ce que chaque profil a le droit de FAIRE, ecrit depuis la regle metier du
/// serveur — pas depuis l'ecran.
///
/// Regle : l'auditeur a « acces en lecture, sans gestion backoffice ». Un
/// projet lui est CONFIE par un admin ou son proprietaire ; il ne l'ouvre pas
/// lui-meme, et l'API repond 403 s'il essaie.
///
/// Paye le 2026-09-24 : l'application affichait a l'auditeur un ecran vide
/// dont le seul bouton, « + Nouveau projet », partait en 403. Un bouton qui
/// echoue toujours est pire qu'un bouton absent : il fait croire a une panne.
User _profil(UserRole role) => User(
      id: 'u1',
      email: 'essai@neo-domotique.fr',
      firstName: 'Jeanne',
      lastName: 'Exemple',
      role: role,
      createdAt: DateTime(2026, 1, 1),
    );

void main() {
  group('Qui peut ouvrir un projet', () {
    test("l'admin et l'integrateur peuvent", () {
      expect(_profil(UserRole.admin).canCreateProject, isTrue);
      expect(_profil(UserRole.integrateur).canCreateProject, isTrue);
    });

    test("l'auditeur ne peut pas : un projet lui est confie", () {
      expect(_profil(UserRole.auditeur).canCreateProject, isFalse);
    });
  });
}
