import '../../core/errors/failures.dart';
import '../entities/appointment.dart';
import '../repositories/auth_repository.dart';
import '../repositories/appointment_repository.dart';

/// Get appointments use case
class GetAppointmentsUseCase {
  final AppointmentRepository _repository;

  GetAppointmentsUseCase(this._repository);

  Future<Result<List<Appointment>>> call({
    AppointmentFilter? filter,
    int page = 1,
    int limit = 50,
  }) async {
    return _repository.getAppointments(filter: filter, page: page, limit: limit);
  }
}

/// Get single appointment use case
class GetAppointmentUseCase {
  final AppointmentRepository _repository;

  GetAppointmentUseCase(this._repository);

  Future<Result<Appointment>> call(String id) async {
    return _repository.getAppointment(id);
  }
}

/// Create appointment use case
class CreateAppointmentUseCase {
  final AppointmentRepository _repository;

  CreateAppointmentUseCase(this._repository);

  Future<Result<Appointment>> call({
    required String title,
    required AppointmentType type,
    required DateTime scheduledAt,
    required DateTime endAt,
    required int durationMinutes,
    LocationType locationType = LocationType.surSite,
    String? location,
    String? locationDetails,
    String? description,
    String? leadId,
    String? clientId,
    String? projectId,
    String? notes,
    List<String>? participantIds,
  }) async {
    // Validate title
    if (title.trim().isEmpty) {
      return const Error(ValidationFailure(message: 'Le titre est requis'));
    }

    // Validate dates
    if (endAt.isBefore(scheduledAt)) {
      return const Error(ValidationFailure(
        message: 'La date de fin doit etre apres la date de debut',
      ));
    }

    if (durationMinutes <= 0) {
      return const Error(ValidationFailure(
        message: 'La duree doit etre positive',
      ));
    }

    return _repository.createAppointment(
      title: title,
      type: type,
      scheduledAt: scheduledAt,
      endAt: endAt,
      durationMinutes: durationMinutes,
      locationType: locationType,
      location: location,
      locationDetails: locationDetails,
      description: description,
      leadId: leadId,
      clientId: clientId,
      projectId: projectId,
      notes: notes,
      participantIds: participantIds,
    );
  }
}

/// Confirm appointment use case
class ConfirmAppointmentUseCase {
  final AppointmentRepository _repository;

  ConfirmAppointmentUseCase(this._repository);

  Future<Result<Appointment>> call(String id) async {
    return _repository.confirmAppointment(id);
  }
}

/// Start appointment use case
class StartAppointmentUseCase {
  final AppointmentRepository _repository;

  StartAppointmentUseCase(this._repository);

  Future<Result<Appointment>> call(String id) async {
    return _repository.startAppointment(id);
  }
}

/// Complete appointment use case
class CompleteAppointmentUseCase {
  final AppointmentRepository _repository;

  CompleteAppointmentUseCase(this._repository);

  Future<Result<Appointment>> call(
    String id, {
    String? outcome,
    int? actualDurationMinutes,
  }) async {
    return _repository.completeAppointment(
      id,
      outcome: outcome,
      actualDurationMinutes: actualDurationMinutes,
    );
  }
}

/// Cancel appointment use case
class CancelAppointmentUseCase {
  final AppointmentRepository _repository;

  CancelAppointmentUseCase(this._repository);

  Future<Result<Appointment>> call(String id, {String? reason}) async {
    return _repository.cancelAppointment(id, reason: reason);
  }
}

/// Mark no-show use case
class MarkNoShowUseCase {
  final AppointmentRepository _repository;

  MarkNoShowUseCase(this._repository);

  Future<Result<Appointment>> call(String id) async {
    return _repository.markNoShow(id);
  }
}

/// Get availability use case
class GetAvailabilityUseCase {
  final AppointmentRepository _repository;

  GetAvailabilityUseCase(this._repository);

  Future<Result<List<AvailabilitySlot>>> call(String userId) async {
    return _repository.getAvailability(userId);
  }
}

/// Set availability use case
class SetAvailabilityUseCase {
  final AppointmentRepository _repository;

  SetAvailabilityUseCase(this._repository);

  Future<Result<List<AvailabilitySlot>>> call(
    String userId,
    List<AvailabilitySlot> slots,
  ) async {
    return _repository.setAvailability(userId, slots);
  }
}

/// Get available slots use case
class GetAvailableSlotsUseCase {
  final AppointmentRepository _repository;

  GetAvailableSlotsUseCase(this._repository);

  Future<Result<List<Map<String, dynamic>>>> call({
    required String userId,
    required DateTime fromDate,
    required DateTime toDate,
    required int durationMinutes,
  }) async {
    if (toDate.isBefore(fromDate)) {
      return const Error(ValidationFailure(
        message: 'La date de fin doit etre apres la date de debut',
      ));
    }

    return _repository.getAvailableSlots(
      userId: userId,
      fromDate: fromDate,
      toDate: toDate,
      durationMinutes: durationMinutes,
    );
  }
}
