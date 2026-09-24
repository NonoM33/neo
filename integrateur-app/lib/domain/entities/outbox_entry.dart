import 'package:equatable/equatable.dart';

/// Nature d'une saisie mise en attente.
///
/// Fermee volontairement : le rejeu doit savoir quoi faire de chaque entree,
/// et une valeur inconnue lue depuis le disque serait une saisie qu'on ne
/// sait plus transmettre.
enum OutboxOperation {
  checklistItemUpdate,
  quoteLinesUpdate;

  static OutboxOperation? fromName(String name) {
    for (final value in OutboxOperation.values) {
      if (value.name == name) return value;
    }
    return null;
  }
}

/// Une saisie faite par l'integrateur et pas encore transmise.
///
/// L'app est utilisee sur chantier, souvent sans reseau : une saisie doit
/// survivre a la coupure, a la fermeture de l'app et au redemarrage de
/// l'iPad. Elle porte donc tout ce qu'il faut pour etre rejouee plus tard,
/// sans dependre de ce qui est encore en memoire.
class OutboxEntry extends Equatable {
  const OutboxEntry({
    required this.id,
    required this.operation,
    required this.targetId,
    required this.payload,
    required this.queuedAt,
    this.attempts = 0,
    this.lastError,
  });

  final String id;
  final OutboxOperation operation;

  /// Identifiant de l'objet vise (point de controle, devis...).
  final String targetId;

  /// Corps a transmettre tel quel au moment du rejeu.
  final Map<String, dynamic> payload;

  final DateTime queuedAt;
  final int attempts;
  final String? lastError;

  OutboxEntry withFailure(String error) => OutboxEntry(
        id: id,
        operation: operation,
        targetId: targetId,
        payload: payload,
        queuedAt: queuedAt,
        attempts: attempts + 1,
        lastError: error,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'operation': operation.name,
        'targetId': targetId,
        'payload': payload,
        'queuedAt': queuedAt.toIso8601String(),
        'attempts': attempts,
        if (lastError != null) 'lastError': lastError,
      };

  /// Relit une saisie ecrite sur disque.
  ///
  /// Renvoie `null` si l'entree est inexploitable : une saisie qu'on ne sait
  /// pas rejouer doit etre ecartee proprement, jamais bloquer la file.
  static OutboxEntry? fromJson(Map<dynamic, dynamic> json) {
    final id = json['id'];
    final operation = OutboxOperation.fromName('${json['operation']}');
    final targetId = json['targetId'];
    final queuedAt = DateTime.tryParse('${json['queuedAt']}');
    final payload = json['payload'];

    if (id is! String || operation == null || targetId is! String) return null;
    if (queuedAt == null || payload is! Map) return null;

    return OutboxEntry(
      id: id,
      operation: operation,
      targetId: targetId,
      payload: payload.map((key, value) => MapEntry('$key', value)),
      queuedAt: queuedAt,
      attempts: json['attempts'] is int ? json['attempts'] as int : 0,
      lastError: json['lastError'] is String ? json['lastError'] as String : null,
    );
  }

  @override
  List<Object?> get props =>
      [id, operation, targetId, payload, queuedAt, attempts, lastError];
}
