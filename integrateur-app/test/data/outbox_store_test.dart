import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:neo_integrateur/data/repositories/outbox_store_impl.dart';
import 'package:neo_integrateur/domain/entities/outbox_entry.dart';

/// Une saisie de chantier doit survivre a la fermeture de l'app et au
/// redemarrage de l'iPad : c'est la seule chose qui la distingue d'une
/// variable en memoire.
void main() {
  late Directory dir;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('outbox_test');
    Hive.init(dir.path);
  });

  tearDown(() async {
    await Hive.deleteFromDisk();
    if (dir.existsSync()) dir.deleteSync(recursive: true);
  });

  OutboxEntry entry(String id) => OutboxEntry(
        id: id,
        operation: OutboxOperation.checklistItemUpdate,
        targetId: 'item-$id',
        payload: const {'checked': true},
        queuedAt: DateTime(2026, 9, 14, 10, 30),
      );

  test('une saisie en attente survit a la fermeture de l app', () async {
    final store = OutboxStoreImpl();
    await store.add(entry('a'));
    await store.close();

    final apresRedemarrage = OutboxStoreImpl();
    final pending = await apresRedemarrage.pending();

    expect(pending, hasLength(1));
    expect(pending.single.targetId, 'item-a');
    expect(pending.single.payload['checked'], isTrue);
    expect(pending.single.queuedAt, DateTime(2026, 9, 14, 10, 30));
  });

  test('les saisies ressortent dans l ordre ou elles ont ete faites', () async {
    final store = OutboxStoreImpl();
    for (final id in ['a', 'b', 'c']) {
      await store.add(entry(id));
    }

    final pending = await store.pending();

    expect(pending.map((e) => e.id), ['a', 'b', 'c']);
  });

  test('une saisie transmise disparait definitivement', () async {
    final store = OutboxStoreImpl();
    await store.add(entry('a'));
    await store.add(entry('b'));

    await store.remove('a');
    await store.close();

    final pending = await OutboxStoreImpl().pending();
    expect(pending.map((e) => e.id), ['b']);
  });

  test('un echec enregistre garde la saisie et sa tentative', () async {
    final store = OutboxStoreImpl();
    await store.add(entry('a'));

    final pending = await store.pending();
    await store.replace(pending.single.withFailure('reseau coupe'));
    await store.close();

    final relu = (await OutboxStoreImpl().pending()).single;
    expect(relu.attempts, 1);
    expect(relu.lastError, contains('reseau'));
  });

  test('une entree corrompue est ecartee sans bloquer les autres', () async {
    final store = OutboxStoreImpl();
    await store.add(entry('a'));
    // Quelque chose d illisible arrive dans la boite (version anterieure,
    // ecriture interrompue) : la file doit continuer a fonctionner.
    final box = await Hive.openBox<dynamic>(OutboxStoreImpl.boxName);
    await box.put('corrompu', {'id': 'x', 'operation': 'inconnue'});

    final pending = await store.pending();

    expect(pending.map((e) => e.id), ['a']);
  });
}
