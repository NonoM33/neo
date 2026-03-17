import 'package:equatable/equatable.dart';

import '../../../domain/entities/appointment.dart';
import '../../../domain/repositories/appointment_repository.dart';

/// Appointments states
sealed class AppointmentsState extends Equatable {
  const AppointmentsState();

  @override
  List<Object?> get props => [];
}

/// Initial state
final class AppointmentsInitial extends AppointmentsState {
  const AppointmentsInitial();
}

/// Loading appointments
final class AppointmentsLoading extends AppointmentsState {
  const AppointmentsLoading();
}

/// Appointments loaded successfully
final class AppointmentsLoaded extends AppointmentsState {
  final List<Appointment> appointments;
  final AppointmentFilter? filter;
  final DateTime fromDate;
  final DateTime toDate;

  const AppointmentsLoaded({
    required this.appointments,
    this.filter,
    required this.fromDate,
    required this.toDate,
  });

  /// Get appointments for a specific day
  List<Appointment> getForDay(DateTime day) {
    return appointments.where((a) {
      return a.scheduledAt.year == day.year &&
          a.scheduledAt.month == day.month &&
          a.scheduledAt.day == day.day;
    }).toList()
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
  }

  /// Get appointments by status
  List<Appointment> getByStatus(AppointmentStatus status) {
    return appointments.where((a) => a.status == status).toList();
  }

  /// Get appointments by type
  List<Appointment> getByType(AppointmentType type) {
    return appointments.where((a) => a.type == type).toList();
  }

  /// Get today's appointments
  List<Appointment> get todayAppointments {
    final now = DateTime.now();
    return getForDay(now);
  }

  /// Get upcoming appointments (today and future, not closed)
  List<Appointment> get upcomingAppointments {
    final now = DateTime.now();
    return appointments
        .where((a) => a.scheduledAt.isAfter(now) && a.status.isActive)
        .toList()
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
  }

  /// Get days that have events (for calendar markers)
  Set<DateTime> get eventDays {
    return appointments
        .map((a) => DateTime(a.scheduledAt.year, a.scheduledAt.month, a.scheduledAt.day))
        .toSet();
  }

  AppointmentsLoaded copyWith({
    List<Appointment>? appointments,
    AppointmentFilter? filter,
    DateTime? fromDate,
    DateTime? toDate,
  }) {
    return AppointmentsLoaded(
      appointments: appointments ?? this.appointments,
      filter: filter ?? this.filter,
      fromDate: fromDate ?? this.fromDate,
      toDate: toDate ?? this.toDate,
    );
  }

  @override
  List<Object?> get props => [appointments, filter, fromDate, toDate];
}

/// Single appointment loaded
final class AppointmentDetailLoaded extends AppointmentsState {
  final Appointment appointment;

  const AppointmentDetailLoaded(this.appointment);

  @override
  List<Object?> get props => [appointment];
}

/// Error loading appointments
final class AppointmentsError extends AppointmentsState {
  final String message;

  const AppointmentsError(this.message);

  @override
  List<Object?> get props => [message];
}

/// Appointment operation in progress
final class AppointmentOperationInProgress extends AppointmentsState {
  final String operation;

  const AppointmentOperationInProgress(this.operation);

  @override
  List<Object?> get props => [operation];
}

/// Appointment operation success
final class AppointmentOperationSuccess extends AppointmentsState {
  final String message;
  final Appointment? appointment;

  const AppointmentOperationSuccess({
    required this.message,
    this.appointment,
  });

  @override
  List<Object?> get props => [message, appointment];
}
