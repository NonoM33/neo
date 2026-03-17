import '../../core/errors/failures.dart';
import '../entities/ticket.dart';
import '../repositories/auth_repository.dart';
import '../repositories/ticket_repository.dart';

/// Get tickets use case
class GetTicketsUseCase {
  final TicketRepository _repository;

  GetTicketsUseCase(this._repository);

  Future<Result<List<Ticket>>> call({
    TicketFilter? filter,
    int page = 1,
    int limit = 20,
  }) async {
    return _repository.getTickets(filter: filter, page: page, limit: limit);
  }
}

/// Get ticket stats use case
class GetTicketStatsUseCase {
  final TicketRepository _repository;

  GetTicketStatsUseCase(this._repository);

  Future<Result<TicketStats>> call() async {
    return _repository.getTicketStats();
  }
}

/// Get single ticket use case
class GetTicketUseCase {
  final TicketRepository _repository;

  GetTicketUseCase(this._repository);

  Future<Result<Ticket>> call(String id) async {
    return _repository.getTicket(id);
  }
}

/// Create ticket use case
class CreateTicketUseCase {
  final TicketRepository _repository;

  CreateTicketUseCase(this._repository);

  Future<Result<Ticket>> call({
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
  }) async {
    if (title.isEmpty) {
      return const Error(ValidationFailure(message: 'Le titre est requis'));
    }
    if (description.isEmpty) {
      return const Error(ValidationFailure(message: 'La description est requise'));
    }

    return _repository.createTicket(
      title: title,
      description: description,
      clientId: clientId,
      priority: priority,
      source: source,
      categoryId: categoryId,
      projectId: projectId,
      deviceId: deviceId,
      assignedToId: assignedToId,
      tags: tags,
    );
  }
}

/// Change ticket status use case
class ChangeTicketStatusUseCase {
  final TicketRepository _repository;

  ChangeTicketStatusUseCase(this._repository);

  Future<Result<Ticket>> call(String id, {
    required TicketStatus status,
    String? notes,
  }) async {
    return _repository.changeStatus(id, status: status, notes: notes);
  }
}

/// Assign ticket use case
class AssignTicketUseCase {
  final TicketRepository _repository;

  AssignTicketUseCase(this._repository);

  Future<Result<Ticket>> call(String id, {String? assignedToId}) async {
    return _repository.assignTicket(id, assignedToId: assignedToId);
  }
}

/// Add comment use case
class AddTicketCommentUseCase {
  final TicketRepository _repository;

  AddTicketCommentUseCase(this._repository);

  Future<Result<TicketComment>> call(String ticketId, {
    required String content,
    CommentType type = CommentType.public,
  }) async {
    if (content.trim().isEmpty) {
      return const Error(ValidationFailure(message: 'Le commentaire ne peut pas être vide'));
    }

    return _repository.addComment(ticketId, content: content, type: type);
  }
}

/// Escalate ticket use case
class EscalateTicketUseCase {
  final TicketRepository _repository;

  EscalateTicketUseCase(this._repository);

  Future<Result<Ticket>> call(String id, {String? notes}) async {
    return _repository.escalateTicket(id, notes: notes);
  }
}
