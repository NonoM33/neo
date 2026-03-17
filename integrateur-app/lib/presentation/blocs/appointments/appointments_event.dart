import 'package:equatable/equatable.dart';

import '../../../domain/entities/appointment.dart';
import '../../../domain/repositories/appointment_repository.dart';

/// Appointments events
sealed class AppointmentsEvent extends Equatable {
  const AppointmentsEvent();

  @override
  List<Object?> get props => [];
}

/// Load appointments for current date range/filter
final class AppointmentsLoadRequested extends AppointmentsEvent {
  final AppointmentFilter? filter;

  const AppointmentsLoadRequested({this.filter});

  @override
  List<Object?> get props => [filter];
}

/// Refresh appointments with current filter/date range
final class AppointmentsRefreshRequested extends AppointmentsEvent {
  const AppointmentsRefreshRequested();
}

/// Load single appointment detail
final class AppointmentLoadRequested extends AppointmentsEvent {
  final String id;

  const AppointmentLoadRequested(this.id);

  @override
  List<Object?> get props => [id];
}

/// Create a new appointment
final class AppointmentCreateRequested extends AppointmentsEvent {
  final String title;
  final AppointmentType type;
  final DateTime scheduledAt;
  final DateTime endAt;
  final int durationMinutes;
  final LocationType locationType;
  final String? location;
  final String? locationDetails;
  final String? description;
  final String? leadId;
  final String? clientId;
  final String? projectId;
  final String? notes;
  final List<String>? participantIds;

  const AppointmentCreateRequested({
    required this.title,
    required this.type,
    required this.scheduledAt,
    required this.endAt,
    required this.durationMinutes,
    this.locationType = LocationType.surSite,
    this.location,
    this.locationDetails,
    this.description,
    this.leadId,
    this.clientId,
    this.projectId,
    this.notes,
    this.participantIds,
  });

  @override
  List<Object?> get props => [title, type, scheduledAt, endAt, durationMinutes];
}

/// Confirm appointment
final class AppointmentConfirmRequested extends AppointmentsEvent {
  final String id;

  const AppointmentConfirmRequested(this.id);

  @override
  List<Object?> get props => [id];
}

/// Start appointment
final class AppointmentStartRequested extends AppointmentsEvent {
  final String id;

  const AppointmentStartRequested(this.id);

  @override
  List<Object?> get props => [id];
}

/// Complete appointment
final class AppointmentCompleteRequested extends AppointmentsEvent {
  final String id;
  final String? outcome;
  final int? actualDurationMinutes;

  const AppointmentCompleteRequested({
    required this.id,
    this.outcome,
    this.actualDurationMinutes,
  });

  @override
  List<Object?> get props => [id, outcome, actualDurationMinutes];
}

/// Cancel appointment
final class AppointmentCancelRequested extends AppointmentsEvent {
  final String id;
  final String? reason;

  const AppointmentCancelRequested({
    required this.id,
    this.reason,
  });

  @override
  List<Object?> get props => [id, reason];
}

/// Mark as no-show
final class AppointmentNoShowRequested extends AppointmentsEvent {
  final String id;

  const AppointmentNoShowRequested(this.id);

  @override
  List<Object?> get props => [id];
}

/// Apply filter
final class AppointmentsFilterChanged extends AppointmentsEvent {
  final AppointmentFilter filter;

  const AppointmentsFilterChanged(this.filter);

  @override
  List<Object?> get props => [filter];
}

/// Clear filters
final class AppointmentsFilterCleared extends AppointmentsEvent {
  const AppointmentsFilterCleared();
}

/// Change date range
final class AppointmentDateRangeChanged extends AppointmentsEvent {
  final DateTime fromDate;
  final DateTime toDate;

  const AppointmentDateRangeChanged({
    required this.fromDate,
    required this.toDate,
  });

  @override
  List<Object?> get props => [fromDate, toDate];
}
