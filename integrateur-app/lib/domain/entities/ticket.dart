import 'package:equatable/equatable.dart';

import 'client.dart';

/// Ticket status enum matching backend
enum TicketStatus {
  nouveau,
  ouvert,
  enAttenteClient,
  enAttenteInterne,
  escalade,
  resolu,
  ferme;

  String get displayName {
    switch (this) {
      case TicketStatus.nouveau:
        return 'Nouveau';
      case TicketStatus.ouvert:
        return 'Ouvert';
      case TicketStatus.enAttenteClient:
        return 'Attente client';
      case TicketStatus.enAttenteInterne:
        return 'Attente interne';
      case TicketStatus.escalade:
        return 'Escaladé';
      case TicketStatus.resolu:
        return 'Résolu';
      case TicketStatus.ferme:
        return 'Fermé';
    }
  }

  String get apiValue {
    switch (this) {
      case TicketStatus.nouveau:
        return 'nouveau';
      case TicketStatus.ouvert:
        return 'ouvert';
      case TicketStatus.enAttenteClient:
        return 'en_attente_client';
      case TicketStatus.enAttenteInterne:
        return 'en_attente_interne';
      case TicketStatus.escalade:
        return 'escalade';
      case TicketStatus.resolu:
        return 'resolu';
      case TicketStatus.ferme:
        return 'ferme';
    }
  }

  bool get isOpen =>
      this == TicketStatus.nouveau ||
      this == TicketStatus.ouvert ||
      this == TicketStatus.enAttenteClient ||
      this == TicketStatus.enAttenteInterne ||
      this == TicketStatus.escalade;

  bool get isClosed => this == TicketStatus.resolu || this == TicketStatus.ferme;

  static TicketStatus fromString(String value) {
    return TicketStatus.values.firstWhere(
      (status) => status.apiValue == value,
      orElse: () => TicketStatus.nouveau,
    );
  }
}

/// Ticket priority enum matching backend
enum TicketPriority {
  basse,
  normale,
  haute,
  urgente,
  critique;

  String get displayName {
    switch (this) {
      case TicketPriority.basse:
        return 'Basse';
      case TicketPriority.normale:
        return 'Normale';
      case TicketPriority.haute:
        return 'Haute';
      case TicketPriority.urgente:
        return 'Urgente';
      case TicketPriority.critique:
        return 'Critique';
    }
  }

  String get apiValue => name;

  static TicketPriority fromString(String value) {
    return TicketPriority.values.firstWhere(
      (p) => p.apiValue == value,
      orElse: () => TicketPriority.normale,
    );
  }
}

/// Ticket source enum matching backend
enum TicketSource {
  email,
  telephone,
  portail,
  chatAi,
  backoffice,
  api;

  String get displayName {
    switch (this) {
      case TicketSource.email:
        return 'Email';
      case TicketSource.telephone:
        return 'Téléphone';
      case TicketSource.portail:
        return 'Portail';
      case TicketSource.chatAi:
        return 'Chat IA';
      case TicketSource.backoffice:
        return 'Backoffice';
      case TicketSource.api:
        return 'API';
    }
  }

  String get apiValue {
    switch (this) {
      case TicketSource.chatAi:
        return 'chat_ai';
      default:
        return name;
    }
  }

  static TicketSource fromString(String value) {
    return TicketSource.values.firstWhere(
      (s) => s.apiValue == value,
      orElse: () => TicketSource.portail,
    );
  }
}

/// Comment author type
enum CommentAuthorType {
  client,
  staff,
  ai;

  static CommentAuthorType fromString(String value) {
    return CommentAuthorType.values.firstWhere(
      (t) => t.name == value,
      orElse: () => CommentAuthorType.staff,
    );
  }
}

/// Comment type (visibility)
enum CommentType {
  public,
  interne;

  String get displayName {
    switch (this) {
      case CommentType.public:
        return 'Public';
      case CommentType.interne:
        return 'Interne';
    }
  }

  static CommentType fromString(String value) {
    return CommentType.values.firstWhere(
      (t) => t.name == value,
      orElse: () => CommentType.public,
    );
  }
}

/// Ticket category entity
class TicketCategory extends Equatable {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? parentId;
  final int sortOrder;
  final bool isActive;
  final DateTime? createdAt;

  const TicketCategory({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.parentId,
    this.sortOrder = 0,
    this.isActive = true,
    this.createdAt,
  });

  @override
  List<Object?> get props => [id, name, slug, parentId, isActive];
}

/// Ticket comment entity
class TicketComment extends Equatable {
  final String id;
  final String ticketId;
  final CommentAuthorType authorType;
  final String? authorId;
  final CommentType type;
  final String content;
  final String? authorName;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const TicketComment({
    required this.id,
    required this.ticketId,
    required this.authorType,
    this.authorId,
    required this.type,
    required this.content,
    this.authorName,
    required this.createdAt,
    this.updatedAt,
  });

  bool get isInternal => type == CommentType.interne;
  bool get isFromClient => authorType == CommentAuthorType.client;
  bool get isFromAi => authorType == CommentAuthorType.ai;

  @override
  List<Object?> get props => [id, ticketId, authorType, type, content, createdAt];
}

/// Ticket history entry
class TicketHistoryEntry extends Equatable {
  final String id;
  final String ticketId;
  final String changeType;
  final String? field;
  final String? oldValue;
  final String? newValue;
  final String? changedById;
  final String? changedByType;
  final String? notes;
  final DateTime createdAt;

  const TicketHistoryEntry({
    required this.id,
    required this.ticketId,
    required this.changeType,
    this.field,
    this.oldValue,
    this.newValue,
    this.changedById,
    this.changedByType,
    this.notes,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [id, ticketId, changeType, createdAt];
}

/// Staff user info (for assigned to)
class StaffInfo extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? email;

  const StaffInfo({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
  });

  String get fullName => '$firstName $lastName';
  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return '$f$l'.toUpperCase();
  }

  @override
  List<Object?> get props => [id, firstName, lastName, email];
}

/// Ticket entity matching backend schema
class Ticket extends Equatable {
  final String id;
  final String number;
  final String title;
  final String description;
  final TicketStatus status;
  final TicketPriority priority;
  final TicketSource source;
  final String? categoryId;
  final TicketCategory? category;
  final String clientId;
  final Client? client;
  final String? projectId;
  final String? deviceId;
  final String? roomId;
  final String? assignedToId;
  final StaffInfo? assignedTo;
  final bool slaBreached;
  final int escalationLevel;
  final List<String> tags;
  final String? aiDiagnosis;
  final dynamic troubleshootingSteps;
  final DateTime? firstResponseAt;
  final DateTime? firstResponseDueAt;
  final DateTime? resolutionDueAt;
  final DateTime? resolvedAt;
  final DateTime? closedAt;
  final int? satisfactionRating;
  final String? satisfactionComment;
  final List<TicketComment> comments;
  final List<TicketHistoryEntry> history;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Ticket({
    required this.id,
    required this.number,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.source,
    this.categoryId,
    this.category,
    required this.clientId,
    this.client,
    this.projectId,
    this.deviceId,
    this.roomId,
    this.assignedToId,
    this.assignedTo,
    this.slaBreached = false,
    this.escalationLevel = 0,
    this.tags = const [],
    this.aiDiagnosis,
    this.troubleshootingSteps,
    this.firstResponseAt,
    this.firstResponseDueAt,
    this.resolutionDueAt,
    this.resolvedAt,
    this.closedAt,
    this.satisfactionRating,
    this.satisfactionComment,
    this.comments = const [],
    this.history = const [],
    required this.createdAt,
    this.updatedAt,
  });

  /// Public comments only
  List<TicketComment> get publicComments =>
      comments.where((c) => c.type == CommentType.public).toList();

  /// Is SLA at risk (response due within 1 hour)
  bool get isSlaAtRisk {
    if (firstResponseAt != null) return false;
    if (firstResponseDueAt == null) return false;
    return DateTime.now()
        .isAfter(firstResponseDueAt!.subtract(const Duration(hours: 1)));
  }

  /// Client display name
  String get clientName => client?.fullName ?? 'Client inconnu';

  /// Assigned to display name
  String get assignedToName => assignedTo?.fullName ?? 'Non assigné';

  @override
  List<Object?> get props => [
        id, number, title, status, priority, source,
        categoryId, clientId, assignedToId, slaBreached,
        escalationLevel, createdAt, updatedAt,
      ];
}

/// Ticket statistics from /api/tickets/stats
class TicketStats extends Equatable {
  final int totalOpen;
  final Map<TicketStatus, int> byStatus;
  final Map<TicketPriority, int> byPriority;
  final int slaBreached;
  final double avgResolutionHours;

  const TicketStats({
    this.totalOpen = 0,
    this.byStatus = const {},
    this.byPriority = const {},
    this.slaBreached = 0,
    this.avgResolutionHours = 0,
  });

  @override
  List<Object?> get props => [totalOpen, slaBreached, avgResolutionHours];
}
