import '../../domain/entities/outbox_entry.dart';
import '../../domain/services/outbox_replay.dart';
import '../datasources/remote/project_remote_datasource.dart';
import '../datasources/remote/quote_remote_datasource.dart';

/// Transmet une saisie mise en attente, en la routant vers l'API qui la
/// concerne. Toute erreur remonte : c'est le rejeu qui decide de reessayer,
/// de patienter ou d'abandonner.
class OutboxSenderImpl implements OutboxSender {
  OutboxSenderImpl({
    required ProjectRemoteDataSource projects,
    required QuoteRemoteDataSource quotes,
  })  : _projects = projects,
        _quotes = quotes;

  final ProjectRemoteDataSource _projects;
  final QuoteRemoteDataSource _quotes;

  @override
  Future<void> send(OutboxEntry entry) async {
    switch (entry.operation) {
      case OutboxOperation.checklistItemUpdate:
        await _projects.updateChecklistItem(entry.targetId, entry.payload);
      case OutboxOperation.quoteLinesUpdate:
        await _quotes.updateQuote(entry.targetId, entry.payload);
    }
  }
}
