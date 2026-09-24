import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/core/errors/exceptions.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/data/datasources/remote/quote_remote_datasource.dart';
import 'package:neo_integrateur/data/models/quote_model.dart';
import 'package:neo_integrateur/data/repositories/quote_repository_impl.dart';
import 'package:neo_integrateur/domain/entities/quote.dart';
import 'package:neo_integrateur/domain/entities/outbox_entry.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/services/outbox_replay.dart';

/// Un devis se chiffre chez le client, souvent dans une maison sans reseau.
/// Une ligne ajoutee la-bas ne doit pas disparaitre entre le salon et la
/// voiture — c'est exactement le moment ou la vente se joue.

class _Remote implements QuoteRemoteDataSource {
  _Remote({required this.onGet, required this.onUpdate});

  final Future<QuoteModel> Function() onGet;
  final Future<QuoteModel> Function() onUpdate;
  Map<String, dynamic>? sentData;

  @override
  Future<QuoteModel> getQuote(String id) => onGet();

  @override
  Future<QuoteModel> updateQuote(String id, Map<String, dynamic> data) {
    sentData = data;
    return onUpdate();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError('route inattendue');
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

final _quote = QuoteModel(
  id: 'devis-7',
  projectId: 'projet-1',
  number: 'DEV-2026-001',
  status: QuoteStatus.brouillon,
  lines: const [],
  date: DateTime(2026, 9, 14),
);

QuoteLine _line() => const QuoteLine(
      id: 'ligne-1',
      description: 'Ajax DoorProtect',
      quantity: 1,
      unitPriceHT: 49,
      tvaPercent: 20,
      type: QuoteLineType.produit,
    );

void main() {
  test('une ligne ajoutee sans reseau attend, elle ne disparait pas', () async {
    final outbox = _MemoryOutbox();
    final repository = QuoteRepositoryImpl(
      remoteDataSource: _Remote(
        onGet: () async => _quote,
        onUpdate: () => throw const NetworkException(
          message: 'Impossible de se connecter au serveur',
          code: 'CONNECTION_ERROR',
        ),
      ),
      outbox: outbox,
    );

    final result = await repository.addLine('devis-7', _line());

    expect(outbox.entries, hasLength(1),
        reason: 'la ligne doit repartir des que le reseau revient');
    expect(outbox.entries.single.operation, OutboxOperation.quoteLinesUpdate);
    expect(outbox.entries.single.targetId, 'devis-7');
    expect(outbox.entries.single.payload['lines'], isA<List<dynamic>>());
    expect((result as Error<Quote>).failure, isA<OfflineQueuedFailure>());
  });

  test('la saisie en attente porte TOUTES les lignes du devis', () async {
    // Le contrat de l'API est un remplacement complet : n'envoyer que la
    // nouvelle ligne effacerait les precedentes au moment du rejeu.
    final outbox = _MemoryOutbox();
    final dejaLa = QuoteModel(
      id: 'devis-7',
      projectId: 'projet-1',
      number: 'DEV-2026-001',
      status: QuoteStatus.brouillon,
      lines: [_line()],
      date: DateTime(2026, 9, 14),
    );
    final repository = QuoteRepositoryImpl(
      remoteDataSource: _Remote(
        onGet: () async => dejaLa,
        onUpdate: () => throw const NetworkException(message: 'coupe'),
      ),
      outbox: outbox,
    );

    await repository.addLine('devis-7', _line());

    final lines = outbox.entries.single.payload['lines'] as List<dynamic>;
    expect(lines, hasLength(2),
        reason: 'l ancienne ligne ET la nouvelle');
  });

  test('un refus du serveur ne va pas en attente', () async {
    final outbox = _MemoryOutbox();
    final repository = QuoteRepositoryImpl(
      remoteDataSource: _Remote(
        onGet: () async => _quote,
        onUpdate: () =>
            throw const ValidationException(message: 'Devis verrouille'),
      ),
      outbox: outbox,
    );

    await repository.addLine('devis-7', _line());

    expect(outbox.entries, isEmpty,
        reason: 'un devis signe restera verrouille au centieme essai');
  });
}
