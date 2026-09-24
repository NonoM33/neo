import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/domain/entities/outbox_entry.dart';
import 'package:neo_integrateur/domain/services/outbox_replay.dart';

/// Ce que le metier exige d'une file d'attente hors ligne.
///
/// Ecrit depuis le besoin chantier, pas depuis une implementation : un
/// integrateur en sous-sol coche ses besoins, range l'iPad, et retrouve tout
/// au bureau. Rien ne doit se perdre, rien ne doit partir deux fois.

/// File en memoire — le test ne doit pas dependre du stockage.
class _MemoryOutbox implements OutboxStore {
  _MemoryOutbox([List<OutboxEntry>? initial])
      : _entries = [...?initial];

  final List<OutboxEntry> _entries;

  List<OutboxEntry> get entries => List.unmodifiable(_entries);

  @override
  Future<void> add(OutboxEntry entry) async => _entries.add(entry);

  @override
  Future<List<OutboxEntry>> pending() async => List.unmodifiable(_entries);

  @override
  Future<void> remove(String id) async {
    _entries.removeWhere((e) => e.id == id);
  }

  @override
  Future<void> replace(OutboxEntry entry) async {
    final index = _entries.indexWhere((e) => e.id == entry.id);
    if (index != -1) _entries[index] = entry;
  }
}

/// Destinataire pilotable : on choisit ce qui passe et ce qui echoue.
class _Sender implements OutboxSender {
  _Sender({this.failOn = const {}, this.failForever = false});

  final Set<String> failOn;
  final bool failForever;
  final List<String> sent = [];

  @override
  Future<void> send(OutboxEntry entry) async {
    if (failForever || failOn.contains(entry.id)) {
      throw Exception('reseau indisponible');
    }
    sent.add(entry.id);
  }
}

OutboxEntry _entry(String id, {int attempts = 0}) => OutboxEntry(
      id: id,
      operation: OutboxOperation.checklistItemUpdate,
      targetId: 'item-$id',
      payload: const {'isChecked': true},
      queuedAt: DateTime(2026, 9, 14),
      attempts: attempts,
    );

void main() {
  group('rejeu de la file', () {
    test('envoie les saisies en attente et vide la file', () async {
      final store = _MemoryOutbox([_entry('a'), _entry('b')]);
      final sender = _Sender();

      final report = await OutboxReplay.drain(store, sender);

      expect(sender.sent, ['a', 'b'], reason: 'dans l\'ordre de mise en file');
      expect(store.entries, isEmpty, reason: 'une saisie transmise sort de la file');
      expect(report.sent, 2);
    });

    test('une saisie transmise ne repart jamais une seconde fois', () async {
      final store = _MemoryOutbox([_entry('a')]);
      final sender = _Sender();

      await OutboxReplay.drain(store, sender);
      await OutboxReplay.drain(store, sender);

      expect(sender.sent, ['a'], reason: 'un devis envoye deux fois est un devis faux');
    });

    test('sans reseau, rien ne se perd et tout reste en attente', () async {
      final store = _MemoryOutbox([_entry('a'), _entry('b')]);
      final sender = _Sender(failForever: true);

      final report = await OutboxReplay.drain(store, sender);

      expect(store.entries, hasLength(2));
      expect(report.sent, 0);
      expect(report.pending, 2);
    });

    test('un echec arrete le rejeu : l\'ordre des saisies est preserve',
        () async {
      // Deux saisies sur le meme point de controle : envoyer la seconde sans
      // la premiere ecrirait un etat qui n'a jamais existe.
      final store = _MemoryOutbox([_entry('a'), _entry('b')]);
      final sender = _Sender(failOn: {'a'});

      await OutboxReplay.drain(store, sender);

      expect(sender.sent, isEmpty);
      expect(store.entries.map((e) => e.id), ['a', 'b']);
    });

    test('chaque echec compte une tentative', () async {
      final store = _MemoryOutbox([_entry('a')]);
      final sender = _Sender(failForever: true);

      await OutboxReplay.drain(store, sender);
      await OutboxReplay.drain(store, sender);

      expect(store.entries.single.attempts, 2);
      expect(store.entries.single.lastError, isNotNull);
    });

    test('une saisie definitivement refusee est abandonnee, pas eternelle',
        () async {
      // Sinon elle bloque la file pour toujours et TOUTES les saisies
      // suivantes restent au sol.
      final store = _MemoryOutbox([
        _entry('poison', attempts: OutboxReplay.maxAttempts - 1),
        _entry('b'),
      ]);
      final sender = _Sender(failOn: {'poison'});

      final report = await OutboxReplay.drain(store, sender);

      expect(store.entries.map((e) => e.id), isNot(contains('poison')));
      expect(report.abandoned, 1);
      expect(sender.sent, contains('b'),
          reason: 'la file repart une fois le bouchon retire');
    });
  });

  group('etat de la file', () {
    test('une saisie en attente porte de quoi la rejouer', () {
      final entry = _entry('a');

      expect(entry.operation, OutboxOperation.checklistItemUpdate);
      expect(entry.targetId, 'item-a');
      expect(entry.payload['isChecked'], isTrue);
    });

    test('une entree illisible est ecartee, elle ne bloque pas la file', () {
      expect(OutboxEntry.fromJson({'id': 'a', 'operation': 'inconnue'}), isNull);
      expect(OutboxEntry.fromJson(const {}), isNull);
    });

    test('une saisie se serialise et se relit a l\'identique', () {
      final entry = _entry('a', attempts: 2);

      final relu = OutboxEntry.fromJson(entry.toJson());

      expect(relu, isNotNull, reason: 'ce qu\'on ecrit doit se relire');
      expect(relu!.id, entry.id);
      expect(relu.operation, entry.operation);
      expect(relu.targetId, entry.targetId);
      expect(relu.payload, entry.payload);
      expect(relu.queuedAt, entry.queuedAt);
      expect(relu.attempts, entry.attempts);
    });
  });
}
