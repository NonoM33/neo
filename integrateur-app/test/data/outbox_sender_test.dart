import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/data/datasources/remote/project_remote_datasource.dart';
import 'package:neo_integrateur/data/models/quote_model.dart';
import 'package:neo_integrateur/data/models/room_model.dart';
import 'package:neo_integrateur/domain/entities/checklist_item.dart';
import 'package:neo_integrateur/data/datasources/remote/quote_remote_datasource.dart';
import 'package:neo_integrateur/data/repositories/outbox_sender_impl.dart';
import 'package:neo_integrateur/domain/entities/outbox_entry.dart';

/// Chaque saisie doit repartir vers la BONNE route, avec le corps qu'elle
/// portait au moment ou l'integrateur l'a faite.
class _Projects implements ProjectRemoteDataSource {
  String? id;
  Map<String, dynamic>? data;

  @override
  Future<ChecklistItemModel> updateChecklistItem(
      String id, Map<String, dynamic> data) async {
    this.id = id;
    this.data = data;
    return const ChecklistItemModel(
      id: 'item',
      label: 'point',
      category: ChecklistCategory.securite,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError('route inattendue');
}

class _Quotes implements QuoteRemoteDataSource {
  String? id;
  Map<String, dynamic>? data;

  @override
  Future<QuoteModel> updateQuote(String id, Map<String, dynamic> data) async {
    this.id = id;
    this.data = data;
    throw UnimplementedError('le corps transmis est ce qui compte ici');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError('route inattendue');
}

void main() {
  test('une coche d audit repart vers le point de controle', () async {
    final projects = _Projects();
    final sender = OutboxSenderImpl(projects: projects, quotes: _Quotes());

    await sender.send(OutboxEntry(
      id: '1',
      operation: OutboxOperation.checklistItemUpdate,
      targetId: 'item-42',
      payload: const {'checked': true},
      queuedAt: DateTime(2026, 9, 14),
    ));

    expect(projects.id, 'item-42');
    expect(projects.data, {'checked': true});
  });

  test('une ligne de devis repart vers le devis', () async {
    final quotes = _Quotes();
    final sender = OutboxSenderImpl(projects: _Projects(), quotes: quotes);

    await expectLater(
        sender.send(OutboxEntry(
      id: '2',
      operation: OutboxOperation.quoteLinesUpdate,
      targetId: 'devis-7',
      payload: const {'lines': []},
      queuedAt: DateTime(2026, 9, 14),
    )),
        throwsUnimplementedError);

    expect(quotes.id, 'devis-7');
    expect(quotes.data, {'lines': []});
  });
}
