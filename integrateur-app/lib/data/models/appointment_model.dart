import '../../domain/entities/appointment.dart';

/// Participant model for JSON serialization
class AppointmentParticipantModel extends AppointmentParticipant {
  const AppointmentParticipantModel({
    required super.id,
    required super.userId,
    super.userName,
    super.userEmail,
    super.role,
    super.responseStatus,
    super.respondedAt,
  });

  factory AppointmentParticipantModel.fromJson(Map<String, dynamic> json) {
    // Try to build user name from nested user object
    String? userName;
    final user = json['user'];
    if (user is Map<String, dynamic>) {
      final first = user['firstName'] as String? ?? '';
      final last = user['lastName'] as String? ?? '';
      if (first.isNotEmpty || last.isNotEmpty) {
        userName = '$first $last'.trim();
      }
    }

    return AppointmentParticipantModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      userName: userName ?? json['userName'] as String?,
      userEmail: json['userEmail'] as String? ??
          (user is Map<String, dynamic> ? user['email'] as String? : null),
      role: ParticipantRole.fromString(json['role'] as String? ?? 'participant'),
      responseStatus: ParticipantResponseStatus.fromString(
        json['responseStatus'] as String? ?? 'en_attente',
      ),
      respondedAt: json['respondedAt'] != null
          ? DateTime.parse(json['respondedAt'] as String)
          : null,
    );
  }
}

/// Availability slot model for JSON serialization
class AvailabilitySlotModel extends AvailabilitySlot {
  const AvailabilitySlotModel({
    required super.id,
    required super.userId,
    required super.dayOfWeek,
    required super.startTime,
    required super.endTime,
    super.isActive,
  });

  factory AvailabilitySlotModel.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlotModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      dayOfWeek: DayOfWeek.fromString(json['dayOfWeek'] as String? ?? 'lundi'),
      startTime: json['startTime'] as String? ?? '09:00',
      endTime: json['endTime'] as String? ?? '17:00',
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'dayOfWeek': dayOfWeek.apiValue,
      'startTime': startTime,
      'endTime': endTime,
      'isActive': isActive,
    };
  }
}

/// Availability override model for JSON serialization
class AvailabilityOverrideModel extends AvailabilityOverride {
  const AvailabilityOverrideModel({
    required super.id,
    required super.userId,
    required super.date,
    super.isUnavailable,
    super.startTime,
    super.endTime,
    super.reason,
  });

  factory AvailabilityOverrideModel.fromJson(Map<String, dynamic> json) {
    return AvailabilityOverrideModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      date: json['date'] != null
          ? DateTime.parse(json['date'] as String)
          : DateTime.now(),
      isUnavailable: json['isUnavailable'] as bool? ?? true,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      reason: json['reason'] as String?,
    );
  }
}

/// Appointment type config model for JSON serialization
class AppointmentTypeConfigModel extends AppointmentTypeConfig {
  const AppointmentTypeConfigModel({
    required super.id,
    required super.type,
    required super.defaultDurationMinutes,
    required super.color,
    super.requiresLocation,
    super.isActive,
  });

  factory AppointmentTypeConfigModel.fromJson(Map<String, dynamic> json) {
    return AppointmentTypeConfigModel(
      id: json['id'] as String? ?? '',
      type: AppointmentType.fromString(json['type'] as String? ?? 'autre'),
      defaultDurationMinutes: json['defaultDurationMinutes'] as int? ?? 60,
      color: json['color'] as String? ?? '#6c757d',
      requiresLocation: json['requiresLocation'] as bool? ?? true,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

/// Appointment model for JSON serialization - backend uses camelCase
class AppointmentModel extends Appointment {
  const AppointmentModel({
    required super.id,
    required super.title,
    super.description,
    required super.type,
    required super.status,
    required super.scheduledAt,
    required super.endAt,
    required super.durationMinutes,
    super.locationType,
    super.location,
    super.locationDetails,
    required super.organizerId,
    super.organizerName,
    super.leadId,
    super.clientId,
    super.clientName,
    super.projectId,
    super.projectName,
    super.participants,
    super.notes,
    super.outcome,
    super.actualDurationMinutes,
    super.cancellationReason,
    super.confirmedAt,
    super.startedAt,
    super.completedAt,
    super.cancelledAt,
    required super.createdAt,
    super.updatedAt,
    super.metadata,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    // Parse participants
    List<AppointmentParticipant> participants = [];
    final participantsJson = json['participants'];
    if (participantsJson is List) {
      participants = participantsJson
          .map((p) => AppointmentParticipantModel.fromJson(p as Map<String, dynamic>))
          .toList();
    }

    // Parse organizer name
    String? organizerName;
    final organizer = json['organizer'];
    if (organizer is Map<String, dynamic>) {
      final first = organizer['firstName'] as String? ?? '';
      final last = organizer['lastName'] as String? ?? '';
      if (first.isNotEmpty || last.isNotEmpty) {
        organizerName = '$first $last'.trim();
      }
    }

    // Parse client name
    String? clientName;
    final client = json['client'];
    if (client is Map<String, dynamic>) {
      final first = client['firstName'] as String? ?? '';
      final last = client['lastName'] as String? ?? '';
      if (first.isNotEmpty || last.isNotEmpty) {
        clientName = '$first $last'.trim();
      }
    }

    // Parse project name
    String? projectName;
    final project = json['project'];
    if (project is Map<String, dynamic>) {
      projectName = project['name'] as String?;
    }

    // Parse scheduledAt & endAt
    final scheduledAt = json['scheduledAt'] != null
        ? DateTime.parse(json['scheduledAt'] as String)
        : DateTime.now();
    final durationMinutes = json['durationMinutes'] as int? ?? 60;
    final endAt = json['endAt'] != null
        ? DateTime.parse(json['endAt'] as String)
        : scheduledAt.add(Duration(minutes: durationMinutes));

    return AppointmentModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      type: AppointmentType.fromString(json['type'] as String? ?? 'autre'),
      status: AppointmentStatus.fromString(json['status'] as String? ?? 'propose'),
      scheduledAt: scheduledAt,
      endAt: endAt,
      durationMinutes: durationMinutes,
      locationType: LocationType.fromString(json['locationType'] as String? ?? 'sur_site'),
      location: json['location'] as String?,
      locationDetails: json['locationDetails'] as String?,
      organizerId: json['organizerId'] as String? ?? '',
      organizerName: organizerName ?? json['organizerName'] as String?,
      leadId: json['leadId'] as String?,
      clientId: json['clientId'] as String?,
      clientName: clientName ?? json['clientName'] as String?,
      projectId: json['projectId'] as String?,
      projectName: projectName ?? json['projectName'] as String?,
      participants: participants,
      notes: json['notes'] as String?,
      outcome: json['outcome'] as String?,
      actualDurationMinutes: json['actualDurationMinutes'] as int?,
      cancellationReason: json['cancellationReason'] as String?,
      confirmedAt: json['confirmedAt'] != null
          ? DateTime.parse(json['confirmedAt'] as String)
          : null,
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      cancelledAt: json['cancelledAt'] != null
          ? DateTime.parse(json['cancelledAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  /// Convert to JSON for create request
  Map<String, dynamic> toCreateJson() {
    return {
      'title': title,
      if (description != null && description!.isNotEmpty) 'description': description,
      'type': type.apiValue,
      'scheduledAt': scheduledAt.toIso8601String(),
      'endAt': endAt.toIso8601String(),
      'durationMinutes': durationMinutes,
      'locationType': locationType.apiValue,
      if (location != null) 'location': location,
      if (locationDetails != null) 'locationDetails': locationDetails,
      if (leadId != null) 'leadId': leadId,
      if (clientId != null) 'clientId': clientId,
      if (projectId != null) 'projectId': projectId,
      if (notes != null && notes!.isNotEmpty) 'notes': notes,
      if (participants.isNotEmpty)
        'participantIds': participants.map((p) => p.userId).toList(),
    };
  }
}
