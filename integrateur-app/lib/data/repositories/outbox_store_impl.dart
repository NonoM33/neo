import 'dart:developer' as developer;

import 'package:hive/hive.dart';

import '../../domain/entities/outbox_entry.dart';
import '../../domain/services/outbox_replay.dart';

/// File d'attente persistee.
///
/// Les saisies survivent a la fermeture de l'app et au redemarrage de l'iPad :
/// c'est toute la raison d'etre de cette classe. Les entrees sont rangees par
/// ordre de mise en file et relues telles quelles.
class OutboxStoreImpl implements OutboxStore {
  static const String boxName = 'neo_outbox';

  Future<Box<dynamic>> _box() async {
    if (Hive.isBoxOpen(boxName)) return Hive.box<dynamic>(boxName);
    return Hive.openBox<dynamic>(boxName);
  }

  @override
  Future<void> add(OutboxEntry entry) async {
    final box = await _box();
    await box.put(entry.id, entry.toJson());
  }

  @override
  Future<List<OutboxEntry>> pending() async {
    final box = await _box();
    final entries = <OutboxEntry>[];

    for (final key in box.keys) {
      final raw = box.get(key);
      if (raw is! Map) continue;

      final entry = OutboxEntry.fromJson(raw);
      if (entry == null) {
        // Ecriture interrompue ou format d'une version anterieure : on
        // l'ecarte plutot que de bloquer toutes les saisies suivantes.
        developer.log('entree illisible ecartee: $key', name: 'Outbox');
        await box.delete(key);
        continue;
      }
      entries.add(entry);
    }

    entries.sort((a, b) => a.queuedAt.compareTo(b.queuedAt));
    return entries;
  }

  @override
  Future<void> remove(String id) async {
    final box = await _box();
    await box.delete(id);
  }

  @override
  Future<void> replace(OutboxEntry entry) async {
    final box = await _box();
    await box.put(entry.id, entry.toJson());
  }

  /// Nombre de saisies en attente — affiche par l'indicateur de synchro.
  Future<int> count() async => (await pending()).length;

  Future<void> close() async {
    if (Hive.isBoxOpen(boxName)) await Hive.box<dynamic>(boxName).close();
  }
}
