import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/entities/tech_audit.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/usecases/appointment_usecases.dart';
import 'tech_audit_event.dart';
import 'tech_audit_state.dart';

class TechAuditBloc extends Bloc<TechAuditEvent, TechAuditState> {
  final UpdateAuditDataUseCase _updateAuditDataUseCase;
  final GetAppointmentUseCase _getAppointmentUseCase;
  Timer? _debounceTimer;

  /// Track which sections have been modified since last save
  final Set<String> _dirtySections = {};

  TechAuditBloc({
    required UpdateAuditDataUseCase updateAuditDataUseCase,
    required GetAppointmentUseCase getAppointmentUseCase,
  })  : _updateAuditDataUseCase = updateAuditDataUseCase,
        _getAppointmentUseCase = getAppointmentUseCase,
        super(const TechAuditInitial()) {
    on<TechAuditLoadRequested>(_onLoad);
    on<TechAuditSectionSelected>(_onSectionSelected);
    on<TechAuditItemUpdated>(_onItemUpdated);
    on<TechAuditNotesUpdated>(_onNotesUpdated);
    on<TechAuditNextSection>(_onNextSection);
    on<TechAuditPreviousSection>(_onPreviousSection);
    on<TechAuditSaveRequested>(_onSaveRequested);
  }

  Future<void> _onLoad(
    TechAuditLoadRequested event,
    Emitter<TechAuditState> emit,
  ) async {
    emit(const TechAuditLoading());

    // If no metadata passed, fetch from API
    Map<String, dynamic>? metadata = event.existingMetadata;
    if (metadata == null) {
      final result = await _getAppointmentUseCase(event.appointmentId);
      switch (result) {
        case Success(data: final appointment):
          metadata = appointment.metadata;
        case Error(failure: final failure):
          emit(TechAuditError(failure.message));
          return;
      }
    }

    final auditJson = metadata?['audit'] as Map<String, dynamic>?;
    var auditData = TechAuditData.fromJson(auditJson);

    // If not started yet, set startedAt
    if (!auditData.isStarted) {
      auditData = auditData.copyWith(startedAt: DateTime.now().toIso8601String());
    }

    emit(TechAuditLoaded(
      appointmentId: event.appointmentId,
      auditData: auditData,
      currentSectionIndex: auditData.currentSection,
    ));
  }

  Future<void> _onSectionSelected(
    TechAuditSectionSelected event,
    Emitter<TechAuditState> emit,
  ) async {
    final current = state;
    if (current is! TechAuditLoaded) return;

    emit(current.copyWith(
      currentSectionIndex: event.sectionIndex,
      auditData: current.auditData.copyWith(currentSection: event.sectionIndex),
    ));
    _scheduleSave();
  }

  Future<void> _onItemUpdated(
    TechAuditItemUpdated event,
    Emitter<TechAuditState> emit,
  ) async {
    final current = state;
    if (current is! TechAuditLoaded) return;

    final sectionData = current.auditData.sections[event.sectionId] ?? const AuditSectionData();
    final updatedItems = Map<String, dynamic>.from(sectionData.items);
    updatedItems[event.itemId] = event.value;

    final updatedSections = Map<String, AuditSectionData>.from(current.auditData.sections);
    updatedSections[event.sectionId] = sectionData.copyWith(items: updatedItems);

    _dirtySections.add(event.sectionId);

    emit(current.copyWith(
      auditData: current.auditData.copyWith(sections: updatedSections),
    ));
    _scheduleSave();
  }

  Future<void> _onNotesUpdated(
    TechAuditNotesUpdated event,
    Emitter<TechAuditState> emit,
  ) async {
    final current = state;
    if (current is! TechAuditLoaded) return;

    final sectionData = current.auditData.sections[event.sectionId] ?? const AuditSectionData();
    final updatedSections = Map<String, AuditSectionData>.from(current.auditData.sections);
    updatedSections[event.sectionId] = sectionData.copyWith(notes: event.notes);

    _dirtySections.add(event.sectionId);

    emit(current.copyWith(
      auditData: current.auditData.copyWith(sections: updatedSections),
    ));
    _scheduleSave();
  }

  Future<void> _onNextSection(
    TechAuditNextSection event,
    Emitter<TechAuditState> emit,
  ) async {
    final current = state;
    if (current is! TechAuditLoaded || current.isLastSection) return;

    final nextIndex = current.currentSectionIndex + 1;
    emit(current.copyWith(
      currentSectionIndex: nextIndex,
      auditData: current.auditData.copyWith(currentSection: nextIndex),
    ));
    _scheduleSave();
  }

  Future<void> _onPreviousSection(
    TechAuditPreviousSection event,
    Emitter<TechAuditState> emit,
  ) async {
    final current = state;
    if (current is! TechAuditLoaded || current.isFirstSection) return;

    final prevIndex = current.currentSectionIndex - 1;
    emit(current.copyWith(
      currentSectionIndex: prevIndex,
      auditData: current.auditData.copyWith(currentSection: prevIndex),
    ));
    _scheduleSave();
  }

  Future<void> _onSaveRequested(
    TechAuditSaveRequested event,
    Emitter<TechAuditState> emit,
  ) async {
    await _doSave(emit);
  }

  void _scheduleSave() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      add(const TechAuditSaveRequested());
    });
  }

  Future<void> _doSave(Emitter<TechAuditState> emit) async {
    final current = state;
    if (current is! TechAuditLoaded) return;

    // Build payload with only dirty sections
    final payload = <String, dynamic>{
      'currentSection': current.currentSectionIndex,
      if (current.auditData.startedAt != null) 'startedAt': current.auditData.startedAt,
    };

    if (_dirtySections.isNotEmpty) {
      final sectionsPayload = <String, dynamic>{};
      for (final sectionId in _dirtySections) {
        final data = current.auditData.sections[sectionId];
        if (data != null) {
          sectionsPayload[sectionId] = data.toJson();
        }
      }
      payload['sections'] = sectionsPayload;
    }

    emit(current.copyWith(isSaving: true));

    // Fire-and-forget style: don't block UI on save result
    final result = await _updateAuditDataUseCase(current.appointmentId, payload);

    final afterSave = state;
    if (afterSave is! TechAuditLoaded) return;

    switch (result) {
      case Success():
        _dirtySections.clear();
        emit(afterSave.copyWith(isSaving: false, lastSavedAt: DateTime.now()));
      case Error():
        // Silent failure — data is still in local state, will retry on next change
        emit(afterSave.copyWith(isSaving: false));
    }
  }

  @override
  Future<void> close() {
    _debounceTimer?.cancel();
    return super.close();
  }
}
