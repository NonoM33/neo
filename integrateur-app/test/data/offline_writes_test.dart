import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/core/errors/exceptions.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/data/datasources/remote/project_remote_datasource.dart';
import 'package:neo_integrateur/data/repositories/project_repository_impl.dart';
import 'package:neo_integrateur/data/models/room_model.dart';
import 'package:neo_integrateur/domain/entities/checklist_item.dart';
import 'package:neo_integrateur/domain/entities/outbox_entry.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/services/outbox_replay.dart';

/// Ce que le chantier exige.
///
/// L'ecran de connexion promet « Vos audits en cours restent enregistres sur
/// cet appareil ». Une saisie faite en sous-sol doit donc survivre a la
/// coupure et repartir toute seule — mais un refus du serveur, lui, ne doit
/// pas encombrer la file : il ne reussira jamais.

class _Remote implements ProjectRemoteDataSource {
  _Remote(this._onUpdate);

  final Future<ChecklistItemModel> Function() _onUpdate;
  int calls = 0;

  @override
  Future<ChecklistItemModel> updateChecklistItem(
    String id,
    Map<String, dynamic> data,
  ) {
    calls++;
    return _onUpdate();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError('non utilise par ce test');
}

class _MemoryOutbox implements OutboxStore {
  final List<OutboxEntry> entries = [];

  @override
  Future<void> add(OutboxEntry entry) async => entries.add(entry);

  @override
  Future<List<OutboxEntry>> pending() async => List.unmodifiable(entries);

  @override
  Future<void> remove(String id) async =>
      entries.removeWhere((e) => e.id == id);

  @override
  Future<void> replace(OutboxEntry entry) async {
    final i = entries.indexWhere((e) => e.id == entry.id);
    if (i != -1) entries[i] = entry;
  }
}

const _item = ChecklistItemModel(
  id: 'item-1',
  label: 'Detecteur d ouverture',
  category: ChecklistCategory.securite,
);

void main() {
  group('saisie d audit sans reseau', () {
    test('la saisie est gardee sur l appareil, jamais perdue', () async {
      final outbox = _MemoryOutbox();
      final repository = ProjectRepositoryImpl(
        remoteDataSource: _Remote(
          () => throw const NetworkException(
            message: 'Impossible de se connecter au serveur',
            code: 'CONNECTION_ERROR',
          ),
        ),
        outbox: outbox,
      );

      final result =
          await repository.updateChecklistItem('item-1', {'isChecked': true});

      expect(outbox.entries, hasLength(1),
          reason: 'la saisie doit attendre le retour du reseau');
      expect(outbox.entries.single.targetId, 'item-1');
      expect(outbox.entries.single.payload['isChecked'], isTrue);
      expect(outbox.entries.single.operation,
          OutboxOperation.checklistItemUpdate);

      expect(result, isA<Error<ChecklistItem>>());
      expect((result as Error<ChecklistItem>).failure, isA<OfflineQueuedFailure>(),
          reason: 'ce n est pas une panne : c est une saisie en attente, et '
              'l interface doit pouvoir le dire au lieu d alarmer');
    });

    test('un serveur en panne met aussi la saisie en attente', () async {
      final outbox = _MemoryOutbox();
      final repository = ProjectRepositoryImpl(
        remoteDataSource: _Remote(
          () => throw const ServerException(message: 'Panne', statusCode: 503),
        ),
        outbox: outbox,
      );

      await repository.updateChecklistItem('item-1', {'isChecked': true});

      expect(outbox.entries, hasLength(1),
          reason: 'une panne serveur est passagere, la saisie repartira');
    });
  });

  group('ce qui ne doit PAS encombrer la file', () {
    test('un refus du serveur n est pas mis en attente', () async {
      final outbox = _MemoryOutbox();
      final repository = ProjectRepositoryImpl(
        remoteDataSource: _Remote(
          () => throw const ValidationException(message: 'Champ invalide'),
        ),
        outbox: outbox,
      );

      final result =
          await repository.updateChecklistItem('item-1', {'isChecked': true});

      expect(outbox.entries, isEmpty,
          reason: 'rejouer un refus mille fois ne le fera pas passer');
      expect((result as Error<ChecklistItem>).failure,
          isNot(isA<OfflineQueuedFailure>()));
    });

    test('avec du reseau, rien ne passe par la file', () async {
      final outbox = _MemoryOutbox();
      final remote = _Remote(() async => _item);
      final repository = ProjectRepositoryImpl(
        remoteDataSource: remote,
        outbox: outbox,
      );

      final result =
          await repository.updateChecklistItem('item-1', {'isChecked': true});

      expect(remote.calls, 1);
      expect(outbox.entries, isEmpty);
      expect(result, isA<Success<ChecklistItem>>());
    });
  });
}
