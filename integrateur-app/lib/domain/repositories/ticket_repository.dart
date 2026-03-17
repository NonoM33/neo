import '../entities/ticket.dart';
import 'auth_repository.dart';

/// Filter options for tickets
class TicketFilter {
  final String? searchQuery;
  final TicketStatus? status;
  final TicketPriority? priority;
  final String? assignedToId;
  final String? clientId;
  final String? categoryId;
  final bool? slaBreached;

  const TicketFilter({
    this.searchQuery,
    this.status,
    this.priority,
    this.assignedToId,
    this.clientId,
    this.categoryId,
    this.slaBreached,
  });

  bool get hasFilters =>
      searchQuery != null ||
      status != null ||
      priority != null ||
      assignedToId != null ||
      clientId != null ||
      categoryId != null ||
      slaBreached != null;
}

/// Ticket repository interface
abstract class TicketRepository {
  /// Get tickets with pagination and filters
  Future<Result<List<Ticket>>> getTickets({
    TicketFilter? filter,
    int page = 1,
    int limit = 20,
  });

  /// Get ticket stats (dashboard KPIs)
  Future<Result<TicketStats>> getTicketStats();

  /// Get single ticket with comments and history
  Future<Result<Ticket>> getTicket(String id);

  /// Create a new ticket
  Future<Result<Ticket>> createTicket({
    required String title,
    required String description,
    required String clientId,
    TicketPriority priority = TicketPriority.normale,
    TicketSource source = TicketSource.backoffice,
    String? categoryId,
    String? projectId,
    String? deviceId,
    String? assignedToId,
    List<String>? tags,
  });

  /// Update ticket fields
  Future<Result<Ticket>> updateTicket(String id, Map<String, dynamic> data);

  /// Change ticket status
  Future<Result<Ticket>> changeStatus(String id, {
    required TicketStatus status,
    String? notes,
  });

  /// Assign ticket to staff member
  Future<Result<Ticket>> assignTicket(String id, {String? assignedToId});

  /// Escalate ticket
  Future<Result<Ticket>> escalateTicket(String id, {String? notes});

  /// Add comment to ticket
  Future<Result<TicketComment>> addComment(String ticketId, {
    required String content,
    CommentType type = CommentType.public,
  });

  /// Get ticket history
  Future<Result<List<TicketHistoryEntry>>> getTicketHistory(String ticketId);

  /// Get ticket categories
  Future<Result<List<TicketCategory>>> getCategories();
}
