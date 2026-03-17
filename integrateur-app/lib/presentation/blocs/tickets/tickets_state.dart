import 'package:equatable/equatable.dart';

import '../../../domain/entities/ticket.dart';
import '../../../domain/repositories/ticket_repository.dart';

/// Tickets states
sealed class TicketsState extends Equatable {
  const TicketsState();

  @override
  List<Object?> get props => [];
}

/// Initial state
final class TicketsInitial extends TicketsState {
  const TicketsInitial();
}

/// Loading tickets
final class TicketsLoading extends TicketsState {
  const TicketsLoading();
}

/// Tickets loaded successfully
final class TicketsLoaded extends TicketsState {
  final List<Ticket> tickets;
  final TicketFilter? filter;
  final TicketStats? stats;
  final List<TicketCategory> categories;

  const TicketsLoaded({
    required this.tickets,
    this.filter,
    this.stats,
    this.categories = const [],
  });

  /// Get tickets by status
  List<Ticket> getByStatus(TicketStatus status) {
    return tickets.where((t) => t.status == status).toList();
  }

  /// Get tickets by priority
  List<Ticket> getByPriority(TicketPriority priority) {
    return tickets.where((t) => t.priority == priority).toList();
  }

  /// Get open tickets count
  int get openCount => tickets.where((t) => t.status.isOpen).length;

  /// Get SLA breached tickets
  List<Ticket> get slaBreachedTickets =>
      tickets.where((t) => t.slaBreached).toList();

  TicketsLoaded copyWith({
    List<Ticket>? tickets,
    TicketFilter? filter,
    TicketStats? stats,
    List<TicketCategory>? categories,
  }) {
    return TicketsLoaded(
      tickets: tickets ?? this.tickets,
      filter: filter ?? this.filter,
      stats: stats ?? this.stats,
      categories: categories ?? this.categories,
    );
  }

  @override
  List<Object?> get props => [tickets, filter, stats, categories];
}

/// Single ticket loaded
final class TicketDetailLoaded extends TicketsState {
  final Ticket ticket;
  final List<TicketCategory> categories;

  const TicketDetailLoaded(this.ticket, {this.categories = const []});

  @override
  List<Object?> get props => [ticket, categories];
}

/// Error loading tickets
final class TicketsError extends TicketsState {
  final String message;

  const TicketsError(this.message);

  @override
  List<Object?> get props => [message];
}

/// Ticket operation in progress
final class TicketOperationInProgress extends TicketsState {
  final String operation;

  const TicketOperationInProgress(this.operation);

  @override
  List<Object?> get props => [operation];
}

/// Ticket operation success
final class TicketOperationSuccess extends TicketsState {
  final String message;
  final Ticket? ticket;

  const TicketOperationSuccess({
    required this.message,
    this.ticket,
  });

  @override
  List<Object?> get props => [message, ticket];
}
