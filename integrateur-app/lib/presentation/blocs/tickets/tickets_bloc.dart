import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/entities/ticket.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/ticket_repository.dart';
import '../../../domain/usecases/ticket_usecases.dart';
import 'tickets_event.dart';
import 'tickets_state.dart';

/// Tickets BLoC
class TicketsBloc extends Bloc<TicketsEvent, TicketsState> {
  final GetTicketsUseCase _getTicketsUseCase;
  final GetTicketStatsUseCase _getTicketStatsUseCase;
  final GetTicketUseCase _getTicketUseCase;
  final CreateTicketUseCase _createTicketUseCase;
  final ChangeTicketStatusUseCase _changeTicketStatusUseCase;
  final AssignTicketUseCase _assignTicketUseCase;
  final AddTicketCommentUseCase _addCommentUseCase;
  final EscalateTicketUseCase _escalateTicketUseCase;
  final TicketRepository _ticketRepository;

  List<TicketCategory> _categories = [];

  TicketsBloc({
    required GetTicketsUseCase getTicketsUseCase,
    required GetTicketStatsUseCase getTicketStatsUseCase,
    required GetTicketUseCase getTicketUseCase,
    required CreateTicketUseCase createTicketUseCase,
    required ChangeTicketStatusUseCase changeTicketStatusUseCase,
    required AssignTicketUseCase assignTicketUseCase,
    required AddTicketCommentUseCase addCommentUseCase,
    required EscalateTicketUseCase escalateTicketUseCase,
    required TicketRepository ticketRepository,
  })  : _getTicketsUseCase = getTicketsUseCase,
        _getTicketStatsUseCase = getTicketStatsUseCase,
        _getTicketUseCase = getTicketUseCase,
        _createTicketUseCase = createTicketUseCase,
        _changeTicketStatusUseCase = changeTicketStatusUseCase,
        _assignTicketUseCase = assignTicketUseCase,
        _addCommentUseCase = addCommentUseCase,
        _escalateTicketUseCase = escalateTicketUseCase,
        _ticketRepository = ticketRepository,
        super(const TicketsInitial()) {
    on<TicketsLoadRequested>(_onLoadRequested);
    on<TicketsRefreshRequested>(_onRefreshRequested);
    on<TicketStatsLoadRequested>(_onStatsLoadRequested);
    on<TicketLoadRequested>(_onTicketLoadRequested);
    on<TicketCreateRequested>(_onCreateRequested);
    on<TicketStatusChangeRequested>(_onStatusChangeRequested);
    on<TicketAssignRequested>(_onAssignRequested);
    on<TicketEscalateRequested>(_onEscalateRequested);
    on<TicketCommentAddRequested>(_onCommentAddRequested);
    on<TicketsFilterChanged>(_onFilterChanged);
    on<TicketsFilterCleared>(_onFilterCleared);
    on<TicketCategoriesLoadRequested>(_onCategoriesLoadRequested);
  }

  Future<void> _onLoadRequested(
    TicketsLoadRequested event,
    Emitter<TicketsState> emit,
  ) async {
    if (state is! TicketsLoaded) {
      emit(const TicketsLoading());
    }

    // Load categories if not already loaded
    if (_categories.isEmpty) {
      final catResult = await _ticketRepository.getCategories();
      if (catResult is Success<List<TicketCategory>>) {
        _categories = catResult.data;
      }
    }

    final result = await _getTicketsUseCase(filter: event.filter);

    switch (result) {
      case Success(data: final tickets):
        // Also load stats
        TicketStats? stats;
        final statsResult = await _getTicketStatsUseCase();
        if (statsResult is Success<TicketStats>) {
          stats = statsResult.data;
        }
        emit(TicketsLoaded(
          tickets: tickets,
          filter: event.filter,
          stats: stats,
          categories: _categories,
        ));
      case Error(failure: final failure):
        if (state is! TicketsLoaded) {
          emit(TicketsError(failure.message));
        }
    }
  }

  Future<void> _onRefreshRequested(
    TicketsRefreshRequested event,
    Emitter<TicketsState> emit,
  ) async {
    final currentState = state;
    TicketFilter? filter;

    if (currentState is TicketsLoaded) {
      filter = currentState.filter;
    }

    add(TicketsLoadRequested(filter: filter));
  }

  Future<void> _onStatsLoadRequested(
    TicketStatsLoadRequested event,
    Emitter<TicketsState> emit,
  ) async {
    final currentState = state;
    if (currentState is TicketsLoaded) {
      final result = await _getTicketStatsUseCase();
      if (result is Success<TicketStats>) {
        emit(currentState.copyWith(stats: result.data));
      }
    }
  }

  Future<void> _onTicketLoadRequested(
    TicketLoadRequested event,
    Emitter<TicketsState> emit,
  ) async {
    if (state is! TicketDetailLoaded) {
      emit(const TicketsLoading());
    }

    // Load categories if needed
    if (_categories.isEmpty) {
      final catResult = await _ticketRepository.getCategories();
      if (catResult is Success<List<TicketCategory>>) {
        _categories = catResult.data;
      }
    }

    final result = await _getTicketUseCase(event.id);

    switch (result) {
      case Success(data: final ticket):
        emit(TicketDetailLoaded(ticket, categories: _categories));
      case Error(failure: final failure):
        emit(TicketsError(failure.message));
    }
  }

  Future<void> _onCreateRequested(
    TicketCreateRequested event,
    Emitter<TicketsState> emit,
  ) async {
    emit(const TicketOperationInProgress('Création du ticket...'));

    final result = await _createTicketUseCase(
      title: event.title,
      description: event.description,
      clientId: event.clientId,
      priority: event.priority,
      source: event.source,
      categoryId: event.categoryId,
      projectId: event.projectId,
      assignedToId: event.assignedToId,
      tags: event.tags,
    );

    switch (result) {
      case Success(data: final ticket):
        emit(TicketOperationSuccess(
          message: 'Ticket créé avec succès',
          ticket: ticket,
        ));
        add(const TicketsRefreshRequested());
      case Error(failure: final failure):
        emit(TicketsError(failure.message));
    }
  }

  Future<void> _onStatusChangeRequested(
    TicketStatusChangeRequested event,
    Emitter<TicketsState> emit,
  ) async {
    final result = await _changeTicketStatusUseCase(
      event.id,
      status: event.status,
      notes: event.notes,
    );

    switch (result) {
      case Success(data: final ticket):
        emit(TicketOperationSuccess(
          message: 'Statut mis à jour',
          ticket: ticket,
        ));
        add(const TicketsRefreshRequested());
      case Error(failure: final failure):
        emit(TicketsError(failure.message));
    }
  }

  Future<void> _onAssignRequested(
    TicketAssignRequested event,
    Emitter<TicketsState> emit,
  ) async {
    final result = await _assignTicketUseCase(
      event.id,
      assignedToId: event.assignedToId,
    );

    switch (result) {
      case Success(data: final ticket):
        emit(TicketOperationSuccess(
          message: 'Ticket assigné',
          ticket: ticket,
        ));
        add(const TicketsRefreshRequested());
      case Error(failure: final failure):
        emit(TicketsError(failure.message));
    }
  }

  Future<void> _onEscalateRequested(
    TicketEscalateRequested event,
    Emitter<TicketsState> emit,
  ) async {
    final result = await _escalateTicketUseCase(
      event.id,
      notes: event.notes,
    );

    switch (result) {
      case Success(data: final ticket):
        emit(TicketOperationSuccess(
          message: 'Ticket escaladé',
          ticket: ticket,
        ));
        add(const TicketsRefreshRequested());
      case Error(failure: final failure):
        emit(TicketsError(failure.message));
    }
  }

  Future<void> _onCommentAddRequested(
    TicketCommentAddRequested event,
    Emitter<TicketsState> emit,
  ) async {
    final result = await _addCommentUseCase(
      event.ticketId,
      content: event.content,
      type: event.type,
    );

    switch (result) {
      case Success():
        emit(const TicketOperationSuccess(message: 'Commentaire ajouté'));
        // Reload the ticket detail to get updated comments
        add(TicketLoadRequested(event.ticketId));
      case Error(failure: final failure):
        emit(TicketsError(failure.message));
    }
  }

  Future<void> _onFilterChanged(
    TicketsFilterChanged event,
    Emitter<TicketsState> emit,
  ) async {
    add(TicketsLoadRequested(filter: event.filter));
  }

  Future<void> _onFilterCleared(
    TicketsFilterCleared event,
    Emitter<TicketsState> emit,
  ) async {
    add(const TicketsLoadRequested());
  }

  Future<void> _onCategoriesLoadRequested(
    TicketCategoriesLoadRequested event,
    Emitter<TicketsState> emit,
  ) async {
    final result = await _ticketRepository.getCategories();
    if (result is Success<List<TicketCategory>>) {
      _categories = result.data;
      final currentState = state;
      if (currentState is TicketsLoaded) {
        emit(currentState.copyWith(categories: _categories));
      }
    }
  }
}
