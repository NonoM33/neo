import '../entities/appointment.dart';
import 'auth_repository.dart';

/// Filter options for appointments
class AppointmentFilter {
  final DateTime? fromDate;
  final DateTime? toDate;
  final AppointmentType? type;
  final AppointmentStatus? status;
  final String? userId;
  final String? clientId;
  final String? projectId;

  const AppointmentFilter({
    this.fromDate,
    this.toDate,
    this.type,
    this.status,
    this.userId,
    this.clientId,
    this.projectId,
  });

  bool get hasFilters =>
      fromDate != null ||
      toDate != null ||
      type != null ||
      status != null ||
      userId != null ||
      clientId != null ||
      projectId != null;

  AppointmentFilter copyWith({
    DateTime? fromDate,
    DateTime? toDate,
    AppointmentType? type,
    AppointmentStatus? status,
    String? userId,
    String? clientId,
    String? projectId,
  }) {
    return AppointmentFilter(
      fromDate: fromDate ?? this.fromDate,
      toDate: toDate ?? this.toDate,
      type: type ?? this.type,
      status: status ?? this.status,
      userId: userId ?? this.userId,
      clientId: clientId ?? this.clientId,
      projectId: projectId ?? this.projectId,
    );
  }
}

/// Appointment repository interface
abstract class AppointmentRepository {
  /// Get appointments with pagination and filters
  Future<Result<List<Appointment>>> getAppointments({
    AppointmentFilter? filter,
    int page = 1,
    int limit = 50,
  });

  /// Get single appointment with participants
  Future<Result<Appointment>> getAppointment(String id);

  /// Create a new appointment
  Future<Result<Appointment>> createAppointment({
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
  });

  /// Update appointment fields
  Future<Result<Appointment>> updateAppointment(String id, Map<String, dynamic> data);

  /// Delete appointment
  Future<Result<void>> deleteAppointment(String id);

  /// Confirm appointment
  Future<Result<Appointment>> confirmAppointment(String id);

  /// Start appointment (mark as en_cours)
  Future<Result<Appointment>> startAppointment(String id);

  /// Complete appointment with outcome
  Future<Result<Appointment>> completeAppointment(
    String id, {
    String? outcome,
    int? actualDurationMinutes,
  });

  /// Cancel appointment with reason
  Future<Result<Appointment>> cancelAppointment(String id, {String? reason});

  /// Mark as no-show
  Future<Result<Appointment>> markNoShow(String id);

  /// Get user's availability slots
  Future<Result<List<AvailabilitySlot>>> getAvailability(String userId);

  /// Set user's availability slots (replaces all)
  Future<Result<List<AvailabilitySlot>>> setAvailability(
    String userId,
    List<AvailabilitySlot> slots,
  );

  /// Get available time slots for scheduling
  Future<Result<List<Map<String, dynamic>>>> getAvailableSlots({
    required String userId,
    required DateTime fromDate,
    required DateTime toDate,
    required int durationMinutes,
  });

  /// Update audit data (deep-merge into metadata.audit)
  Future<Result<Appointment>> updateAuditData(String id, Map<String, dynamic> data);
}
