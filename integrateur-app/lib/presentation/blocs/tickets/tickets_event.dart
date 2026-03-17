import 'package:equatable/equatable.dart';

import '../../../domain/entities/ticket.dart';
import '../../../domain/repositories/ticket_repository.dart';

/// Tickets events
sealed class TicketsEvent extends Equatable {
  const TicketsEvent();

  @override
  List<Object?> get props => [];
}

/// Load all tickets
final class TicketsLoadRequested extends TicketsEvent {
  final TicketFilter? filter;

  const TicketsLoadRequested({this.filter});

  @override
  List<Object?> get props => [filter];
}

/// Refresh tickets
final class TicketsRefreshRequested extends TicketsEvent {
  const TicketsRefreshRequested();
}

/// Load ticket stats
final class TicketStatsLoadRequested extends TicketsEvent {
  const TicketStatsLoadRequested();
}

/// Load single ticket detail
final class TicketLoadRequested extends TicketsEvent {
  final String id;

  const TicketLoadRequested(this.id);

  @override
  List<Object?> get props => [id];
}

/// Create a new ticket
final class TicketCreateRequested extends TicketsEvent {
  final String title;
  final String description;
  final String clientId;
  final TicketPriority priority;
  final TicketSource source;
  final String? categoryId;
  final String? projectId;
  final String? assignedToId;
  final List<String>? tags;

  const TicketCreateRequested({
    required this.title,
    required this.description,
    required this.clientId,
    this.priority = TicketPriority.normale,
    this.source = TicketSource.backoffice,
    this.categoryId,
    this.projectId,
    this.assignedToId,
    this.tags,
  });

  @override
  List<Object?> get props => [title, description, clientId, priority, source];
}

/// Change ticket status
final class TicketStatusChangeRequested extends TicketsEvent {
  final String id;
  final TicketStatus status;
  final String? notes;

  const TicketStatusChangeRequested({
    required this.id,
    required this.status,
    this.notes,
  });

  @override
  List<Object?> get props => [id, status, notes];
}

/// Assign ticket
final class TicketAssignRequested extends TicketsEvent {
  final String id;
  final String? assignedToId;

  const TicketAssignRequested({
    required this.id,
    this.assignedToId,
  });

  @override
  List<Object?> get props => [id, assignedToId];
}

/// Escalate ticket
final class TicketEscalateRequested extends TicketsEvent {
  final String id;
  final String? notes;

  const TicketEscalateRequested({
    required this.id,
    this.notes,
  });

  @override
  List<Object?> get props => [id, notes];
}

/// Add comment to ticket
final class TicketCommentAddRequested extends TicketsEvent {
  final String ticketId;
  final String content;
  final CommentType type;

  const TicketCommentAddRequested({
    required this.ticketId,
    required this.content,
    this.type = CommentType.public,
  });

  @override
  List<Object?> get props => [ticketId, content, type];
}

/// Apply filter
final class TicketsFilterChanged extends TicketsEvent {
  final TicketFilter filter;

  const TicketsFilterChanged(this.filter);

  @override
  List<Object?> get props => [filter];
}

/// Clear filters
final class TicketsFilterCleared extends TicketsEvent {
  const TicketsFilterCleared();
}

/// Load categories
final class TicketCategoriesLoadRequested extends TicketsEvent {
  const TicketCategoriesLoadRequested();
}
