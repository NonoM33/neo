import 'package:equatable/equatable.dart';

import '../../../domain/entities/tech_audit.dart';

sealed class TechAuditState extends Equatable {
  const TechAuditState();

  @override
  List<Object?> get props => [];
}

final class TechAuditInitial extends TechAuditState {
  const TechAuditInitial();
}

final class TechAuditLoading extends TechAuditState {
  const TechAuditLoading();
}

final class TechAuditLoaded extends TechAuditState {
  final String appointmentId;
  final TechAuditData auditData;
  final int currentSectionIndex;
  final bool isSaving;
  final DateTime? lastSavedAt;

  const TechAuditLoaded({
    required this.appointmentId,
    required this.auditData,
    this.currentSectionIndex = 0,
    this.isSaving = false,
    this.lastSavedAt,
  });

  AuditSectionDef get currentSectionDef => TechAuditTemplate.sections[currentSectionIndex];

  AuditSectionData get currentSectionData =>
      auditData.sections[currentSectionDef.id] ?? const AuditSectionData();

  bool get isFirstSection => currentSectionIndex == 0;
  bool get isLastSection => currentSectionIndex == TechAuditTemplate.sections.length - 1;
  int get totalSections => TechAuditTemplate.sections.length;

  TechAuditLoaded copyWith({
    TechAuditData? auditData,
    int? currentSectionIndex,
    bool? isSaving,
    DateTime? lastSavedAt,
  }) {
    return TechAuditLoaded(
      appointmentId: appointmentId,
      auditData: auditData ?? this.auditData,
      currentSectionIndex: currentSectionIndex ?? this.currentSectionIndex,
      isSaving: isSaving ?? this.isSaving,
      lastSavedAt: lastSavedAt ?? this.lastSavedAt,
    );
  }

  @override
  List<Object?> get props => [appointmentId, auditData, currentSectionIndex, isSaving, lastSavedAt];
}

final class TechAuditError extends TechAuditState {
  final String message;

  const TechAuditError(this.message);

  @override
  List<Object?> get props => [message];
}
