import 'package:equatable/equatable.dart';

sealed class TechAuditEvent extends Equatable {
  const TechAuditEvent();

  @override
  List<Object?> get props => [];
}

/// Load/initialize audit from existing metadata
final class TechAuditLoadRequested extends TechAuditEvent {
  final String appointmentId;
  final Map<String, dynamic>? existingMetadata;

  const TechAuditLoadRequested({required this.appointmentId, this.existingMetadata});

  @override
  List<Object?> get props => [appointmentId];
}

/// Navigate to a specific section
final class TechAuditSectionSelected extends TechAuditEvent {
  final int sectionIndex;

  const TechAuditSectionSelected(this.sectionIndex);

  @override
  List<Object?> get props => [sectionIndex];
}

/// Update a single item value
final class TechAuditItemUpdated extends TechAuditEvent {
  final String sectionId;
  final String itemId;
  final dynamic value;

  const TechAuditItemUpdated({
    required this.sectionId,
    required this.itemId,
    required this.value,
  });

  @override
  List<Object?> get props => [sectionId, itemId, value];
}

/// Update section notes
final class TechAuditNotesUpdated extends TechAuditEvent {
  final String sectionId;
  final String notes;

  const TechAuditNotesUpdated({required this.sectionId, required this.notes});

  @override
  List<Object?> get props => [sectionId, notes];
}

/// Navigate to next section
final class TechAuditNextSection extends TechAuditEvent {
  const TechAuditNextSection();
}

/// Navigate to previous section
final class TechAuditPreviousSection extends TechAuditEvent {
  const TechAuditPreviousSection();
}

/// Force save
final class TechAuditSaveRequested extends TechAuditEvent {
  const TechAuditSaveRequested();
}
