import 'package:equatable/equatable.dart';

/// Appointment type enum matching backend
enum AppointmentType {
  visiteTechnique,
  audit,
  rdvCommercial,
  installation,
  sav,
  reunionInterne,
  autre;

  String get displayName {
    switch (this) {
      case AppointmentType.visiteTechnique:
        return 'Visite technique';
      case AppointmentType.audit:
        return 'Audit';
      case AppointmentType.rdvCommercial:
        return 'RDV Commercial';
      case AppointmentType.installation:
        return 'Installation';
      case AppointmentType.sav:
        return 'SAV';
      case AppointmentType.reunionInterne:
        return 'Reunion interne';
      case AppointmentType.autre:
        return 'Autre';
    }
  }

  String get apiValue {
    switch (this) {
      case AppointmentType.visiteTechnique:
        return 'visite_technique';
      case AppointmentType.audit:
        return 'audit';
      case AppointmentType.rdvCommercial:
        return 'rdv_commercial';
      case AppointmentType.installation:
        return 'installation';
      case AppointmentType.sav:
        return 'sav';
      case AppointmentType.reunionInterne:
        return 'reunion_interne';
      case AppointmentType.autre:
        return 'autre';
    }
  }

  String get color {
    switch (this) {
      case AppointmentType.visiteTechnique:
        return '#0d6efd';
      case AppointmentType.audit:
        return '#6f42c1';
      case AppointmentType.rdvCommercial:
        return '#198754';
      case AppointmentType.installation:
        return '#fd7e14';
      case AppointmentType.sav:
        return '#dc3545';
      case AppointmentType.reunionInterne:
        return '#6c757d';
      case AppointmentType.autre:
        return '#adb5bd';
    }
  }

  String get icon {
    switch (this) {
      case AppointmentType.visiteTechnique:
        return 'engineering';
      case AppointmentType.audit:
        return 'checklist';
      case AppointmentType.rdvCommercial:
        return 'handshake';
      case AppointmentType.installation:
        return 'build';
      case AppointmentType.sav:
        return 'support_agent';
      case AppointmentType.reunionInterne:
        return 'groups';
      case AppointmentType.autre:
        return 'event';
    }
  }

  /// Default duration in minutes for each type
  int get defaultDurationMinutes {
    switch (this) {
      case AppointmentType.visiteTechnique:
        return 90;
      case AppointmentType.audit:
        return 120;
      case AppointmentType.rdvCommercial:
        return 60;
      case AppointmentType.installation:
        return 240;
      case AppointmentType.sav:
        return 60;
      case AppointmentType.reunionInterne:
        return 60;
      case AppointmentType.autre:
        return 60;
    }
  }

  static AppointmentType fromString(String value) {
    return AppointmentType.values.firstWhere(
      (t) => t.apiValue == value,
      orElse: () => AppointmentType.autre,
    );
  }
}

/// Appointment status enum
enum AppointmentStatus {
  propose,
  confirme,
  enCours,
  termine,
  annule,
  noShow;

  String get displayName {
    switch (this) {
      case AppointmentStatus.propose:
        return 'Propose';
      case AppointmentStatus.confirme:
        return 'Confirme';
      case AppointmentStatus.enCours:
        return 'En cours';
      case AppointmentStatus.termine:
        return 'Termine';
      case AppointmentStatus.annule:
        return 'Annule';
      case AppointmentStatus.noShow:
        return 'No-show';
    }
  }

  String get apiValue {
    switch (this) {
      case AppointmentStatus.propose:
        return 'propose';
      case AppointmentStatus.confirme:
        return 'confirme';
      case AppointmentStatus.enCours:
        return 'en_cours';
      case AppointmentStatus.termine:
        return 'termine';
      case AppointmentStatus.annule:
        return 'annule';
      case AppointmentStatus.noShow:
        return 'no_show';
    }
  }

  bool get isActive =>
      this == AppointmentStatus.propose ||
      this == AppointmentStatus.confirme ||
      this == AppointmentStatus.enCours;

  bool get isClosed =>
      this == AppointmentStatus.termine ||
      this == AppointmentStatus.annule ||
      this == AppointmentStatus.noShow;

  static AppointmentStatus fromString(String value) {
    return AppointmentStatus.values.firstWhere(
      (s) => s.apiValue == value,
      orElse: () => AppointmentStatus.propose,
    );
  }
}

/// Location type for appointments
enum LocationType {
  surSite,
  bureau,
  visio,
  telephone;

  String get displayName {
    switch (this) {
      case LocationType.surSite:
        return 'Sur site';
      case LocationType.bureau:
        return 'Bureau';
      case LocationType.visio:
        return 'Visio';
      case LocationType.telephone:
        return 'Telephone';
    }
  }

  String get apiValue {
    switch (this) {
      case LocationType.surSite:
        return 'sur_site';
      case LocationType.bureau:
        return 'bureau';
      case LocationType.visio:
        return 'visio';
      case LocationType.telephone:
        return 'telephone';
    }
  }

  String get icon {
    switch (this) {
      case LocationType.surSite:
        return 'location_on';
      case LocationType.bureau:
        return 'business';
      case LocationType.visio:
        return 'videocam';
      case LocationType.telephone:
        return 'phone';
    }
  }

  static LocationType fromString(String value) {
    return LocationType.values.firstWhere(
      (t) => t.apiValue == value,
      orElse: () => LocationType.surSite,
    );
  }
}

/// Participant role in an appointment
enum ParticipantRole {
  organisateur,
  participant,
  optionnel;

  String get displayName {
    switch (this) {
      case ParticipantRole.organisateur:
        return 'Organisateur';
      case ParticipantRole.participant:
        return 'Participant';
      case ParticipantRole.optionnel:
        return 'Optionnel';
    }
  }

  String get apiValue => name;

  static ParticipantRole fromString(String value) {
    return ParticipantRole.values.firstWhere(
      (r) => r.apiValue == value,
      orElse: () => ParticipantRole.participant,
    );
  }
}

/// Response status for a participant
enum ParticipantResponseStatus {
  enAttente,
  accepte,
  refuse;

  String get displayName {
    switch (this) {
      case ParticipantResponseStatus.enAttente:
        return 'En attente';
      case ParticipantResponseStatus.accepte:
        return 'Accepte';
      case ParticipantResponseStatus.refuse:
        return 'Refuse';
    }
  }

  String get apiValue {
    switch (this) {
      case ParticipantResponseStatus.enAttente:
        return 'en_attente';
      case ParticipantResponseStatus.accepte:
        return 'accepte';
      case ParticipantResponseStatus.refuse:
        return 'refuse';
    }
  }

  static ParticipantResponseStatus fromString(String value) {
    return ParticipantResponseStatus.values.firstWhere(
      (s) => s.apiValue == value,
      orElse: () => ParticipantResponseStatus.enAttente,
    );
  }
}

/// Day of week
enum DayOfWeek {
  lundi,
  mardi,
  mercredi,
  jeudi,
  vendredi,
  samedi,
  dimanche;

  String get displayName {
    switch (this) {
      case DayOfWeek.lundi:
        return 'Lundi';
      case DayOfWeek.mardi:
        return 'Mardi';
      case DayOfWeek.mercredi:
        return 'Mercredi';
      case DayOfWeek.jeudi:
        return 'Jeudi';
      case DayOfWeek.vendredi:
        return 'Vendredi';
      case DayOfWeek.samedi:
        return 'Samedi';
      case DayOfWeek.dimanche:
        return 'Dimanche';
    }
  }

  String get apiValue => name;

  /// Converts Dart's DateTime.weekday (1=Monday) to DayOfWeek
  static DayOfWeek fromWeekday(int weekday) {
    return DayOfWeek.values[weekday - 1];
  }

  static DayOfWeek fromString(String value) {
    return DayOfWeek.values.firstWhere(
      (d) => d.apiValue == value,
      orElse: () => DayOfWeek.lundi,
    );
  }
}

/// Participant in an appointment
class AppointmentParticipant extends Equatable {
  final String id;
  final String userId;
  final String? userName;
  final String? userEmail;
  final ParticipantRole role;
  final ParticipantResponseStatus responseStatus;
  final DateTime? respondedAt;

  const AppointmentParticipant({
    required this.id,
    required this.userId,
    this.userName,
    this.userEmail,
    this.role = ParticipantRole.participant,
    this.responseStatus = ParticipantResponseStatus.enAttente,
    this.respondedAt,
  });

  String get displayInitials {
    if (userName == null || userName!.isEmpty) return '??';
    final parts = userName!.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return userName![0].toUpperCase();
  }

  @override
  List<Object?> get props => [id, userId, role, responseStatus];
}

/// Availability slot for a user (recurring weekly)
class AvailabilitySlot extends Equatable {
  final String id;
  final String userId;
  final DayOfWeek dayOfWeek;
  final String startTime; // "HH:mm" format
  final String endTime; // "HH:mm" format
  final bool isActive;

  const AvailabilitySlot({
    required this.id,
    required this.userId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.isActive = true,
  });

  @override
  List<Object?> get props => [id, userId, dayOfWeek, startTime, endTime, isActive];
}

/// Availability override (single date exception)
class AvailabilityOverride extends Equatable {
  final String id;
  final String userId;
  final DateTime date;
  final bool isUnavailable; // true = block entire day
  final String? startTime; // if partial override
  final String? endTime;
  final String? reason;

  const AvailabilityOverride({
    required this.id,
    required this.userId,
    required this.date,
    this.isUnavailable = true,
    this.startTime,
    this.endTime,
    this.reason,
  });

  @override
  List<Object?> get props => [id, userId, date, isUnavailable];
}

/// Configuration for an appointment type (default duration, color, etc.)
class AppointmentTypeConfig extends Equatable {
  final String id;
  final AppointmentType type;
  final int defaultDurationMinutes;
  final String color;
  final bool requiresLocation;
  final bool isActive;

  const AppointmentTypeConfig({
    required this.id,
    required this.type,
    required this.defaultDurationMinutes,
    required this.color,
    this.requiresLocation = true,
    this.isActive = true,
  });

  @override
  List<Object?> get props => [id, type, defaultDurationMinutes, color, isActive];
}

/// Main Appointment entity
class Appointment extends Equatable {
  final String id;
  final String title;
  final String? description;
  final AppointmentType type;
  final AppointmentStatus status;
  final DateTime scheduledAt;
  final DateTime endAt;
  final int durationMinutes;
  final LocationType locationType;
  final String? location;
  final String? locationDetails;
  final String organizerId;
  final String? organizerName;
  final String? leadId;
  final String? clientId;
  final String? clientName;
  final String? projectId;
  final String? projectName;
  final List<AppointmentParticipant> participants;
  final String? notes;
  final String? outcome;
  final int? actualDurationMinutes;
  final String? cancellationReason;
  final DateTime? confirmedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Appointment({
    required this.id,
    required this.title,
    this.description,
    required this.type,
    required this.status,
    required this.scheduledAt,
    required this.endAt,
    required this.durationMinutes,
    this.locationType = LocationType.surSite,
    this.location,
    this.locationDetails,
    required this.organizerId,
    this.organizerName,
    this.leadId,
    this.clientId,
    this.clientName,
    this.projectId,
    this.projectName,
    this.participants = const [],
    this.notes,
    this.outcome,
    this.actualDurationMinutes,
    this.cancellationReason,
    this.confirmedAt,
    this.startedAt,
    this.completedAt,
    this.cancelledAt,
    required this.createdAt,
    this.updatedAt,
  });

  /// Whether this appointment is in the past
  bool get isPast => endAt.isBefore(DateTime.now());

  /// Whether this appointment is happening now
  bool get isNow {
    final now = DateTime.now();
    return scheduledAt.isBefore(now) && endAt.isAfter(now);
  }

  /// Whether this appointment is upcoming (today or future)
  bool get isUpcoming => scheduledAt.isAfter(DateTime.now());

  /// Whether this is today
  bool get isToday {
    final now = DateTime.now();
    return scheduledAt.year == now.year &&
        scheduledAt.month == now.month &&
        scheduledAt.day == now.day;
  }

  /// Display time range (e.g., "09:00 - 10:30")
  String get timeRange {
    final startHour = scheduledAt.hour.toString().padLeft(2, '0');
    final startMin = scheduledAt.minute.toString().padLeft(2, '0');
    final endHour = endAt.hour.toString().padLeft(2, '0');
    final endMin = endAt.minute.toString().padLeft(2, '0');
    return '$startHour:$startMin - $endHour:$endMin';
  }

  /// Formatted duration (e.g., "1h30")
  String get formattedDuration {
    final hours = durationMinutes ~/ 60;
    final minutes = durationMinutes % 60;
    if (hours > 0 && minutes > 0) return '${hours}h${minutes.toString().padLeft(2, '0')}';
    if (hours > 0) return '${hours}h';
    return '${minutes}min';
  }

  /// Client or lead display name
  String get contactName => clientName ?? 'Non renseigne';

  /// Organizer initials
  String get organizerInitials {
    if (organizerName == null || organizerName!.isEmpty) return '??';
    final parts = organizerName!.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return organizerName![0].toUpperCase();
  }

  @override
  List<Object?> get props => [
        id,
        title,
        type,
        status,
        scheduledAt,
        endAt,
        durationMinutes,
        locationType,
        location,
        organizerId,
        leadId,
        clientId,
        projectId,
        createdAt,
        updatedAt,
      ];
}
