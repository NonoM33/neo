import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/repositories/appointment_repository.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/usecases/appointment_usecases.dart';
import 'appointments_event.dart';
import 'appointments_state.dart';

/// Appointments BLoC
class AppointmentsBloc extends Bloc<AppointmentsEvent, AppointmentsState> {
  final GetAppointmentsUseCase _getAppointmentsUseCase;
  final GetAppointmentUseCase _getAppointmentUseCase;
  final CreateAppointmentUseCase _createAppointmentUseCase;
  final ConfirmAppointmentUseCase _confirmAppointmentUseCase;
  final StartAppointmentUseCase _startAppointmentUseCase;
  final CompleteAppointmentUseCase _completeAppointmentUseCase;
  final CancelAppointmentUseCase _cancelAppointmentUseCase;
  final MarkNoShowUseCase _markNoShowUseCase;

  /// Default date range: current month
  DateTime _fromDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _toDate = DateTime(DateTime.now().year, DateTime.now().month + 1, 0, 23, 59, 59);
  AppointmentFilter? _currentFilter;

  AppointmentsBloc({
    required GetAppointmentsUseCase getAppointmentsUseCase,
    required GetAppointmentUseCase getAppointmentUseCase,
    required CreateAppointmentUseCase createAppointmentUseCase,
    required ConfirmAppointmentUseCase confirmAppointmentUseCase,
    required StartAppointmentUseCase startAppointmentUseCase,
    required CompleteAppointmentUseCase completeAppointmentUseCase,
    required CancelAppointmentUseCase cancelAppointmentUseCase,
    required MarkNoShowUseCase markNoShowUseCase,
  })  : _getAppointmentsUseCase = getAppointmentsUseCase,
        _getAppointmentUseCase = getAppointmentUseCase,
        _createAppointmentUseCase = createAppointmentUseCase,
        _confirmAppointmentUseCase = confirmAppointmentUseCase,
        _startAppointmentUseCase = startAppointmentUseCase,
        _completeAppointmentUseCase = completeAppointmentUseCase,
        _cancelAppointmentUseCase = cancelAppointmentUseCase,
        _markNoShowUseCase = markNoShowUseCase,
        super(const AppointmentsInitial()) {
    on<AppointmentsLoadRequested>(_onLoadRequested);
    on<AppointmentsRefreshRequested>(_onRefreshRequested);
    on<AppointmentLoadRequested>(_onDetailRequested);
    on<AppointmentCreateRequested>(_onCreateRequested);
    on<AppointmentConfirmRequested>(_onConfirmRequested);
    on<AppointmentStartRequested>(_onStartRequested);
    on<AppointmentCompleteRequested>(_onCompleteRequested);
    on<AppointmentCancelRequested>(_onCancelRequested);
    on<AppointmentNoShowRequested>(_onNoShowRequested);
    on<AppointmentsFilterChanged>(_onFilterChanged);
    on<AppointmentsFilterCleared>(_onFilterCleared);
    on<AppointmentDateRangeChanged>(_onDateRangeChanged);
  }

  Future<void> _onLoadRequested(
    AppointmentsLoadRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    if (state is! AppointmentsLoaded) {
      emit(const AppointmentsLoading());
    }

    _currentFilter = event.filter;

    final effectiveFilter = AppointmentFilter(
      fromDate: _fromDate,
      toDate: _toDate,
      type: event.filter?.type,
      status: event.filter?.status,
      userId: event.filter?.userId,
      clientId: event.filter?.clientId,
      projectId: event.filter?.projectId,
    );

    final result = await _getAppointmentsUseCase(filter: effectiveFilter);

    switch (result) {
      case Success(data: final appointments):
        emit(AppointmentsLoaded(
          appointments: appointments,
          filter: event.filter,
          fromDate: _fromDate,
          toDate: _toDate,
        ));
      case Error(failure: final failure):
        if (state is! AppointmentsLoaded) {
          emit(AppointmentsError(failure.message));
        }
    }
  }

  Future<void> _onRefreshRequested(
    AppointmentsRefreshRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    add(AppointmentsLoadRequested(filter: _currentFilter));
  }

  Future<void> _onDetailRequested(
    AppointmentLoadRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    if (state is! AppointmentDetailLoaded) {
      emit(const AppointmentsLoading());
    }

    final result = await _getAppointmentUseCase(event.id);

    switch (result) {
      case Success(data: final appointment):
        emit(AppointmentDetailLoaded(appointment));
      case Error(failure: final failure):
        emit(AppointmentsError(failure.message));
    }
  }

  Future<void> _onCreateRequested(
    AppointmentCreateRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    emit(const AppointmentOperationInProgress('Creation du rendez-vous...'));

    final result = await _createAppointmentUseCase(
      title: event.title,
      type: event.type,
      scheduledAt: event.scheduledAt,
      endAt: event.endAt,
      durationMinutes: event.durationMinutes,
      locationType: event.locationType,
      location: event.location,
      locationDetails: event.locationDetails,
      description: event.description,
      leadId: event.leadId,
      clientId: event.clientId,
      projectId: event.projectId,
      notes: event.notes,
      participantIds: event.participantIds,
    );

    switch (result) {
      case Success(data: final appointment):
        emit(AppointmentOperationSuccess(
          message: 'Rendez-vous cree avec succes',
          appointment: appointment,
        ));
        add(const AppointmentsRefreshRequested());
      case Error(failure: final failure):
        emit(AppointmentsError(failure.message));
    }
  }

  Future<void> _onConfirmRequested(
    AppointmentConfirmRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    final result = await _confirmAppointmentUseCase(event.id);

    switch (result) {
      case Success(data: final appointment):
        emit(AppointmentOperationSuccess(
          message: 'Rendez-vous confirme',
          appointment: appointment,
        ));
        add(const AppointmentsRefreshRequested());
      case Error(failure: final failure):
        emit(AppointmentsError(failure.message));
    }
  }

  Future<void> _onStartRequested(
    AppointmentStartRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    final result = await _startAppointmentUseCase(event.id);

    switch (result) {
      case Success(data: final appointment):
        emit(AppointmentOperationSuccess(
          message: 'Rendez-vous demarre',
          appointment: appointment,
        ));
        add(const AppointmentsRefreshRequested());
      case Error(failure: final failure):
        emit(AppointmentsError(failure.message));
    }
  }

  Future<void> _onCompleteRequested(
    AppointmentCompleteRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    final result = await _completeAppointmentUseCase(
      event.id,
      outcome: event.outcome,
      actualDurationMinutes: event.actualDurationMinutes,
    );

    switch (result) {
      case Success(data: final appointment):
        emit(AppointmentOperationSuccess(
          message: 'Rendez-vous termine',
          appointment: appointment,
        ));
        add(const AppointmentsRefreshRequested());
      case Error(failure: final failure):
        emit(AppointmentsError(failure.message));
    }
  }

  Future<void> _onCancelRequested(
    AppointmentCancelRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    final result = await _cancelAppointmentUseCase(event.id, reason: event.reason);

    switch (result) {
      case Success(data: final appointment):
        emit(AppointmentOperationSuccess(
          message: 'Rendez-vous annule',
          appointment: appointment,
        ));
        add(const AppointmentsRefreshRequested());
      case Error(failure: final failure):
        emit(AppointmentsError(failure.message));
    }
  }

  Future<void> _onNoShowRequested(
    AppointmentNoShowRequested event,
    Emitter<AppointmentsState> emit,
  ) async {
    final result = await _markNoShowUseCase(event.id);

    switch (result) {
      case Success(data: final appointment):
        emit(AppointmentOperationSuccess(
          message: 'Marque comme no-show',
          appointment: appointment,
        ));
        add(const AppointmentsRefreshRequested());
      case Error(failure: final failure):
        emit(AppointmentsError(failure.message));
    }
  }

  Future<void> _onFilterChanged(
    AppointmentsFilterChanged event,
    Emitter<AppointmentsState> emit,
  ) async {
    add(AppointmentsLoadRequested(filter: event.filter));
  }

  Future<void> _onFilterCleared(
    AppointmentsFilterCleared event,
    Emitter<AppointmentsState> emit,
  ) async {
    add(const AppointmentsLoadRequested());
  }

  Future<void> _onDateRangeChanged(
    AppointmentDateRangeChanged event,
    Emitter<AppointmentsState> emit,
  ) async {
    _fromDate = event.fromDate;
    _toDate = event.toDate;
    add(AppointmentsLoadRequested(filter: _currentFilter));
  }
}
