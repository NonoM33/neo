import '../../domain/entities/client.dart';
import '../../domain/entities/ticket.dart';
import 'project_model.dart';

/// Staff info model for JSON serialization
class StaffInfoModel extends StaffInfo {
  const StaffInfoModel({
    required super.id,
    required super.firstName,
    required super.lastName,
    super.email,
  });

  factory StaffInfoModel.fromJson(Map<String, dynamic> json) {
    return StaffInfoModel(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String?,
    );
  }
}

/// Ticket category model for JSON serialization
class TicketCategoryModel extends TicketCategory {
  const TicketCategoryModel({
    required super.id,
    required super.name,
    required super.slug,
    super.description,
    super.parentId,
    super.sortOrder,
    super.isActive,
    super.createdAt,
  });

  factory TicketCategoryModel.fromJson(Map<String, dynamic> json) {
    return TicketCategoryModel(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
      parentId: json['parentId'] as String?,
      sortOrder: json['sortOrder'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'slug': slug,
      if (description != null) 'description': description,
      if (parentId != null) 'parentId': parentId,
      'sortOrder': sortOrder,
    };
  }
}

/// Ticket comment model for JSON serialization
class TicketCommentModel extends TicketComment {
  const TicketCommentModel({
    required super.id,
    required super.ticketId,
    required super.authorType,
    super.authorId,
    required super.type,
    required super.content,
    super.authorName,
    required super.createdAt,
    super.updatedAt,
  });

  factory TicketCommentModel.fromJson(Map<String, dynamic> json) {
    // Try to build author name from nested author object
    String? authorName;
    final author = json['author'];
    if (author is Map<String, dynamic>) {
      final first = author['firstName'] as String? ?? '';
      final last = author['lastName'] as String? ?? '';
      if (first.isNotEmpty || last.isNotEmpty) {
        authorName = '$first $last'.trim();
      }
    }

    return TicketCommentModel(
      id: json['id'] as String,
      ticketId: json['ticketId'] as String? ?? '',
      authorType: CommentAuthorType.fromString(json['authorType'] as String? ?? 'staff'),
      authorId: json['authorId'] as String?,
      type: CommentType.fromString(json['type'] as String? ?? 'public'),
      content: json['content'] as String? ?? '',
      authorName: authorName,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }
}

/// Ticket history entry model for JSON serialization
class TicketHistoryEntryModel extends TicketHistoryEntry {
  const TicketHistoryEntryModel({
    required super.id,
    required super.ticketId,
    required super.changeType,
    super.field,
    super.oldValue,
    super.newValue,
    super.changedById,
    super.changedByType,
    super.notes,
    required super.createdAt,
  });

  factory TicketHistoryEntryModel.fromJson(Map<String, dynamic> json) {
    return TicketHistoryEntryModel(
      id: json['id'] as String,
      ticketId: json['ticketId'] as String? ?? '',
      changeType: json['changeType'] as String? ?? '',
      field: json['field'] as String?,
      oldValue: json['oldValue'] as String?,
      newValue: json['newValue'] as String?,
      changedById: json['changedById'] as String?,
      changedByType: json['changedByType'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

/// Ticket model for JSON serialization - backend uses camelCase
class TicketModel extends Ticket {
  const TicketModel({
    required super.id,
    required super.number,
    required super.title,
    required super.description,
    required super.status,
    required super.priority,
    required super.source,
    super.categoryId,
    super.category,
    required super.clientId,
    super.client,
    super.projectId,
    super.deviceId,
    super.roomId,
    super.assignedToId,
    super.assignedTo,
    super.slaBreached,
    super.escalationLevel,
    super.tags,
    super.aiDiagnosis,
    super.troubleshootingSteps,
    super.firstResponseAt,
    super.firstResponseDueAt,
    super.resolutionDueAt,
    super.resolvedAt,
    super.closedAt,
    super.satisfactionRating,
    super.satisfactionComment,
    super.comments,
    super.history,
    required super.createdAt,
    super.updatedAt,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    // Parse client
    Client? client;
    final clientJson = json['client'];
    if (clientJson is Map<String, dynamic>) {
      client = ClientModel.fromJson(clientJson);
    }

    // Parse assigned to
    StaffInfo? assignedTo;
    final assignedToJson = json['assignedTo'];
    if (assignedToJson is Map<String, dynamic>) {
      assignedTo = StaffInfoModel.fromJson(assignedToJson);
    }

    // Parse category
    TicketCategory? category;
    final categoryJson = json['category'];
    if (categoryJson is Map<String, dynamic>) {
      category = TicketCategoryModel.fromJson(categoryJson);
    }

    // Parse comments
    List<TicketComment> comments = [];
    final commentsJson = json['comments'];
    if (commentsJson is List) {
      comments = commentsJson
          .map((c) => TicketCommentModel.fromJson(c as Map<String, dynamic>))
          .toList();
    }

    // Parse history
    List<TicketHistoryEntry> history = [];
    final historyJson = json['history'];
    if (historyJson is List) {
      history = historyJson
          .map((h) => TicketHistoryEntryModel.fromJson(h as Map<String, dynamic>))
          .toList();
    }

    // Parse tags
    List<String> tags = [];
    final tagsJson = json['tags'];
    if (tagsJson is List) {
      tags = tagsJson.map((t) => t.toString()).toList();
    }

    // Parse clientId
    String clientId = json['clientId'] as String? ?? '';
    if (clientId.isEmpty && client != null) {
      clientId = client.id;
    }

    return TicketModel(
      id: json['id'] as String,
      number: json['number'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: TicketStatus.fromString(json['status'] as String? ?? 'nouveau'),
      priority: TicketPriority.fromString(json['priority'] as String? ?? 'normale'),
      source: TicketSource.fromString(json['source'] as String? ?? 'backoffice'),
      categoryId: json['categoryId'] as String?,
      category: category,
      clientId: clientId,
      client: client,
      projectId: json['projectId'] as String?,
      deviceId: json['deviceId'] as String?,
      roomId: json['roomId'] as String?,
      assignedToId: json['assignedToId'] as String?,
      assignedTo: assignedTo,
      slaBreached: json['slaBreached'] as bool? ?? false,
      escalationLevel: json['escalationLevel'] as int? ?? 0,
      tags: tags,
      aiDiagnosis: json['aiDiagnosis'] as String?,
      troubleshootingSteps: json['troubleshootingSteps'],
      firstResponseAt: json['firstResponseAt'] != null
          ? DateTime.parse(json['firstResponseAt'] as String)
          : null,
      firstResponseDueAt: json['firstResponseDueAt'] != null
          ? DateTime.parse(json['firstResponseDueAt'] as String)
          : null,
      resolutionDueAt: json['resolutionDueAt'] != null
          ? DateTime.parse(json['resolutionDueAt'] as String)
          : null,
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.parse(json['resolvedAt'] as String)
          : null,
      closedAt: json['closedAt'] != null
          ? DateTime.parse(json['closedAt'] as String)
          : null,
      satisfactionRating: json['satisfactionRating'] as int?,
      satisfactionComment: json['satisfactionComment'] as String?,
      comments: comments,
      history: history,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  /// Convert to JSON for create request
  Map<String, dynamic> toCreateJson() {
    return {
      'title': title,
      'description': description,
      'clientId': clientId,
      'priority': priority.apiValue,
      'source': source.apiValue,
      if (categoryId != null) 'categoryId': categoryId,
      if (projectId != null) 'projectId': projectId,
      if (deviceId != null) 'deviceId': deviceId,
      if (assignedToId != null) 'assignedToId': assignedToId,
      if (tags.isNotEmpty) 'tags': tags,
    };
  }
}

/// Ticket stats model for JSON serialization
class TicketStatsModel extends TicketStats {
  const TicketStatsModel({
    super.totalOpen,
    super.byStatus,
    super.byPriority,
    super.slaBreached,
    super.avgResolutionHours,
  });

  factory TicketStatsModel.fromJson(Map<String, dynamic> json) {
    // Parse byStatus
    final byStatusMap = <TicketStatus, int>{};
    final byStatusJson = json['byStatus'];
    if (byStatusJson is List) {
      for (final item in byStatusJson) {
        if (item is Map<String, dynamic>) {
          final status = TicketStatus.fromString(item['status'] as String? ?? '');
          final total = item['total'] as int? ?? 0;
          byStatusMap[status] = total;
        }
      }
    }

    // Parse byPriority
    final byPriorityMap = <TicketPriority, int>{};
    final byPriorityJson = json['byPriority'];
    if (byPriorityJson is List) {
      for (final item in byPriorityJson) {
        if (item is Map<String, dynamic>) {
          final priority = TicketPriority.fromString(item['priority'] as String? ?? '');
          final total = item['total'] as int? ?? 0;
          byPriorityMap[priority] = total;
        }
      }
    }

    return TicketStatsModel(
      totalOpen: json['totalOpen'] as int? ?? 0,
      byStatus: byStatusMap,
      byPriority: byPriorityMap,
      slaBreached: json['slaBreached'] as int? ?? 0,
      avgResolutionHours: (json['avgResolutionHours'] as num?)?.toDouble() ?? 0,
    );
  }
}
