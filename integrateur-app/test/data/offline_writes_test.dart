import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/domain/entities/checklist_item.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/data/datasources/remote/project_remote_datasource.dart';
import 'package:neo_integrateur/data/repositories/project_repository_impl.dart';

/// Constat, pas satisfecit.
///
/// L'ecran de connexion promet « Vos audits en cours restent enregistres sur
/// cet appareil », et le CLAUDE.md annonce une app offline-first. Or aucune
/// ecriture ne passe par un stockage local : une saisie faite sans reseau est
/// perdue, ni conservee ni rejouee.
///
/// Ce test fige le comportement ACTUEL pour qu'il reste visible. Le jour ou une
/// file d'attente (outbox) est ajoutee, il doit etre INVERSE : la saisie sera
/// alors conservee localement et repartira a la reconnexion.
class _OfflineRemote implements ProjectRemoteDataSource {
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw Exception('SocketException: reseau indisponible');
}

void main() {
  test('sans reseau, une coche d\'audit est PERDUE : aucune file locale',
      () async {
    final repository =
        ProjectRepositoryImpl(remoteDataSource: _OfflineRemote());

    final result =
        await repository.updateChecklistItem('item-1', {'isChecked': true});

    expect(result, isA<Error<ChecklistItem>>(),
        reason: 'attendu tant qu\'il n\'existe pas de file d\'attente');
    expect(result, isNot(isA<Success<ChecklistItem>>()),
        reason: 'rien n\'est conserve localement : la saisie du chantier est '
            'perdue. A INVERSER le jour ou l\'outbox existe.');
  });
}
