import 'dart:developer' as developer;

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/ticket.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/ticket_repository.dart';
import '../datasources/remote/ticket_remote_datasource.dart';
import '../models/ticket_model.dart';

/// Implementation of TicketRepository
class TicketRepositoryImpl implements TicketRepository {
  final TicketRemoteDataSource _remoteDataSource;

  TicketRepositoryImpl({
    required TicketRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<Ticket>>> getTickets({
    TicketFilter? filter,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (filter?.searchQuery != null && filter!.searchQuery!.isNotEmpty) {
        queryParams['search'] = filter.searchQuery;
      }
      if (filter?.status != null) {
        queryParams['status'] = filter!.status!.apiValue;
      }
      if (filter?.priority != null) {
        queryParams['priority'] = filter!.priority!.apiValue;
      }
      if (filter?.assignedToId != null) {
        queryParams['assignedToId'] = filter!.assignedToId;
      }
      if (filter?.clientId != null) {
        queryParams['clientId'] = filter!.clientId;
      }
      if (filter?.categoryId != null) {
        queryParams['categoryId'] = filter!.categoryId;
      }
      if (filter?.slaBreached != null) {
        queryParams['slaBreached'] = filter!.slaBreached;
      }

      final data = await _remoteDataSource.getTickets(queryParams: queryParams);
      final ticketsJson = data['data'] as List<dynamic>? ?? [];
      final tickets = ticketsJson
          .map((json) => TicketModel.fromJson(json as Map<String, dynamic>))
          .toList();

      return Success(tickets);
    } on NetworkException catch (e) {
      return Error(NetworkFailure(message: e.message));
    } catch (e, st) {
      developer.log('getTickets error: $e', name: 'TicketRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'getTickets: $e', originalError: e));
    }
  }

  @override
  Future<Result<TicketStats>> getTicketStats() async {
    try {
      final data = await _remoteDataSource.getTicketStats();
      final stats = TicketStatsModel.fromJson(data);
      return Success(stats);
    } on NetworkException catch (e) {
      return Error(NetworkFailure(message: e.message));
    } catch (e, st) {
      developer.log('getTicketStats error: $e', name: 'TicketRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'getTicketStats: $e', originalError: e));
    }
  }

  @override
  Future<Result<Ticket>> getTicket(String id) async {
    try {
      final ticket = await _remoteDataSource.getTicket(id);
      return Success(ticket);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('getTicket error: $e', name: 'TicketRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'getTicket: $e', originalError: e));
    }
  }

  @override
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
  }) async {
    try {
      final data = <String, dynamic>{
        'title': title,
        'description': description,
        'clientId': clientId,
        'priority': priority.apiValue,
        'source': source.apiValue,
        if (categoryId != null) 'categoryId': categoryId,
        if (projectId != null) 'projectId': projectId,
        if (deviceId != null) 'deviceId': deviceId,
        if (assignedToId != null) 'assignedToId': assignedToId,
        if (tags != null && tags.isNotEmpty) 'tags': tags,
      };

      final ticket = await _remoteDataSource.createTicket(data);
      return Success(ticket);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Ticket>> updateTicket(String id, Map<String, dynamic> data) async {
    try {
      final ticket = await _remoteDataSource.updateTicket(id, data);
      return Success(ticket);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Ticket>> changeStatus(String id, {
    required TicketStatus status,
    String? notes,
  }) async {
    try {
      final data = <String, dynamic>{
        'status': status.apiValue,
        if (notes != null) 'notes': notes,
      };
      final ticket = await _remoteDataSource.changeStatus(id, data);
      return Success(ticket);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Ticket>> assignTicket(String id, {String? assignedToId}) async {
    try {
      final data = <String, dynamic>{
        if (assignedToId != null) 'assignedToId': assignedToId,
      };
      final ticket = await _remoteDataSource.assignTicket(id, data);
      return Success(ticket);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Ticket>> escalateTicket(String id, {String? notes}) async {
    try {
      final data = notes != null ? {'notes': notes} : null;
      final ticket = await _remoteDataSource.escalateTicket(id, data);
      return Success(ticket);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<TicketComment>> addComment(String ticketId, {
    required String content,
    CommentType type = CommentType.public,
  }) async {
    try {
      final data = <String, dynamic>{
        'content': content,
        'type': type.name,
      };
      final comment = await _remoteDataSource.addComment(ticketId, data);
      return Success(comment);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<List<TicketHistoryEntry>>> getTicketHistory(String ticketId) async {
    try {
      final history = await _remoteDataSource.getTicketHistory(ticketId);
      return Success(history);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<List<TicketCategory>>> getCategories() async {
    try {
      final categories = await _remoteDataSource.getCategories();
      return Success(categories);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }
}
