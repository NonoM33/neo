import 'dart:ui' show Offset;

import 'package:equatable/equatable.dart';

import '../../../domain/entities/floor_plan.dart';

sealed class FloorPlanEvent extends Equatable {
  const FloorPlanEvent();

  @override
  List<Object?> get props => [];
}

// ─── Lifecycle ────────────────────────────────────────────────────────

final class FloorPlanLoadRequested extends FloorPlanEvent {
  final String roomId;
  final String projectId;

  const FloorPlanLoadRequested({required this.roomId, required this.projectId});

  @override
  List<Object?> get props => [roomId, projectId];
}

final class FloorPlanCreateRequested extends FloorPlanEvent {
  final String roomId;
  final String projectId;
  final double widthMeters;
  final double heightMeters;

  const FloorPlanCreateRequested({
    required this.roomId,
    required this.projectId,
    this.widthMeters = 10,
    this.heightMeters = 8,
  });

  @override
  List<Object?> get props => [roomId, projectId, widthMeters, heightMeters];
}

// ─── Tool ─────────────────────────────────────────────────────────────

final class FloorPlanToolSelected extends FloorPlanEvent {
  final PlanTool tool;

  const FloorPlanToolSelected(this.tool);

  @override
  List<Object?> get props => [tool];
}

final class FloorPlanViewModeChanged extends FloorPlanEvent {
  final PlanViewMode mode;

  const FloorPlanViewModeChanged(this.mode);

  @override
  List<Object?> get props => [mode];
}

// ─── Walls ────────────────────────────────────────────────────────────

final class WallAddRequested extends FloorPlanEvent {
  final Offset startPoint;
  final Offset endPoint;
  final WallType wallType;

  const WallAddRequested({
    required this.startPoint,
    required this.endPoint,
    this.wallType = WallType.interior,
  });

  @override
  List<Object?> get props => [startPoint, endPoint, wallType];
}

final class WallUpdateRequested extends FloorPlanEvent {
  final String wallId;
  final Offset? startPoint;
  final Offset? endPoint;
  final WallType? wallType;
  final double? thickness;

  const WallUpdateRequested({
    required this.wallId,
    this.startPoint,
    this.endPoint,
    this.wallType,
    this.thickness,
  });

  @override
  List<Object?> get props => [wallId, startPoint, endPoint, wallType, thickness];
}

final class WallDeleteRequested extends FloorPlanEvent {
  final String wallId;

  const WallDeleteRequested(this.wallId);

  @override
  List<Object?> get props => [wallId];
}

// ─── Openings ─────────────────────────────────────────────────────────

final class OpeningAddRequested extends FloorPlanEvent {
  final String wallId;
  final OpeningType type;
  final double offsetOnWall;
  final double widthMeters;

  const OpeningAddRequested({
    required this.wallId,
    required this.type,
    required this.offsetOnWall,
    this.widthMeters = 0.9,
  });

  @override
  List<Object?> get props => [wallId, type, offsetOnWall, widthMeters];
}

final class OpeningDeleteRequested extends FloorPlanEvent {
  final String openingId;

  const OpeningDeleteRequested(this.openingId);

  @override
  List<Object?> get props => [openingId];
}

// ─── Equipment ────────────────────────────────────────────────────────

final class EquipmentPlaceRequested extends FloorPlanEvent {
  final String productId;
  final Offset position;
  final int quantity;
  final String? label;

  const EquipmentPlaceRequested({
    required this.productId,
    required this.position,
    this.quantity = 1,
    this.label,
  });

  @override
  List<Object?> get props => [productId, position, quantity, label];
}

final class EquipmentMoveRequested extends FloorPlanEvent {
  final String equipmentId;
  final Offset newPosition;

  const EquipmentMoveRequested({
    required this.equipmentId,
    required this.newPosition,
  });

  @override
  List<Object?> get props => [equipmentId, newPosition];
}

final class EquipmentDeleteRequested extends FloorPlanEvent {
  final String equipmentId;

  const EquipmentDeleteRequested(this.equipmentId);

  @override
  List<Object?> get props => [equipmentId];
}

final class EquipmentStatusChanged extends FloorPlanEvent {
  final String equipmentId;
  final EquipmentPlacementStatus status;

  const EquipmentStatusChanged({
    required this.equipmentId,
    required this.status,
  });

  @override
  List<Object?> get props => [equipmentId, status];
}

// ─── Annotations ──────────────────────────────────────────────────────

final class AnnotationAddRequested extends FloorPlanEvent {
  final Offset position;
  final AnnotationType type;
  final String text;
  final Offset? endPosition;

  const AnnotationAddRequested({
    required this.position,
    required this.type,
    required this.text,
    this.endPosition,
  });

  @override
  List<Object?> get props => [position, type, text, endPosition];
}

final class AnnotationDeleteRequested extends FloorPlanEvent {
  final String annotationId;

  const AnnotationDeleteRequested(this.annotationId);

  @override
  List<Object?> get props => [annotationId];
}

// ─── Selection ────────────────────────────────────────────────────────

final class FloorPlanElementSelected extends FloorPlanEvent {
  final String? elementId;
  final ElementType? elementType;

  const FloorPlanElementSelected({this.elementId, this.elementType});

  @override
  List<Object?> get props => [elementId, elementType];
}

enum ElementType { wall, opening, equipment, annotation }

// ─── Canvas ───────────────────────────────────────────────────────────

final class FloorPlanUndoRequested extends FloorPlanEvent {
  const FloorPlanUndoRequested();
}

final class FloorPlanRedoRequested extends FloorPlanEvent {
  const FloorPlanRedoRequested();
}

final class FloorPlanDeleteSelectedRequested extends FloorPlanEvent {
  const FloorPlanDeleteSelectedRequested();
}

/// Generate 4 walls forming the room rectangle from plan dimensions
final class FloorPlanGenerateRoomWalls extends FloorPlanEvent {
  const FloorPlanGenerateRoomWalls();
}

/// Import a floor plan from LiDAR scan
final class FloorPlanImportFromScan extends FloorPlanEvent {
  final FloorPlan scannedPlan;

  const FloorPlanImportFromScan(this.scannedPlan);

  @override
  List<Object?> get props => [scannedPlan];
}

/// Save the current floor plan to the backend
final class FloorPlanSaveRequested extends FloorPlanEvent {
  const FloorPlanSaveRequested();
}
