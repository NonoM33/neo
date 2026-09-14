import '../entities/outbox_entry.dart';

/// Stockage durable de la file d'attente.
abstract class OutboxStore {
  /// Met une saisie en attente de transmission.
  Future<void> add(OutboxEntry entry);

  Future<List<OutboxEntry>> pending();
  Future<void> remove(String id);
  Future<void> replace(OutboxEntry entry);
}

/// Destinataire d'une saisie en attente : sait la transmettre, ou echoue.
abstract class OutboxSender {
  /// Leve une exception si la transmission n'a pas abouti.
  Future<void> send(OutboxEntry entry);
}

/// Resultat d'un passage de rejeu.
class OutboxReplayReport {
  const OutboxReplayReport({
    required this.sent,
    required this.pending,
    required this.abandoned,
  });

  final int sent;
  final int pending;
  final int abandoned;

  bool get idle => sent == 0 && abandoned == 0;
}

/// Rejeu de la file d'attente.
///
/// Service de domaine pur : aucune dependance framework, donc entierement
/// testable sans appareil ni reseau.
abstract final class OutboxReplay {
  /// Au-dela, une saisie est abandonnee.
  ///
  /// Sans ce plafond, une saisie que le serveur refuse pour toujours (donnee
  /// devenue invalide, objet supprime) bloquerait la file indefiniment et
  /// TOUTES les saisies suivantes resteraient au sol.
  static const int maxAttempts = 5;

  /// Transmet les saisies en attente, dans l'ordre ou elles ont ete faites.
  ///
  /// S'arrete au premier echec : deux saisies peuvent porter sur le meme
  /// objet, et transmettre la seconde sans la premiere ecrirait un etat qui
  /// n'a jamais existe.
  static Future<OutboxReplayReport> drain(
    OutboxStore store,
    OutboxSender sender,
  ) async {
    var sent = 0;
    var abandoned = 0;

    for (final entry in await store.pending()) {
      try {
        await sender.send(entry);
        await store.remove(entry.id);
        sent++;
      } catch (error) {
        final failed = entry.withFailure('$error');

        if (failed.attempts >= maxAttempts) {
          await store.remove(entry.id);
          abandoned++;
          continue; // le bouchon retire, la file peut repartir
        }

        await store.replace(failed);
        break;
      }
    }

    final remaining = await store.pending();
    return OutboxReplayReport(
      sent: sent,
      pending: remaining.length,
      abandoned: abandoned,
    );
  }
}
