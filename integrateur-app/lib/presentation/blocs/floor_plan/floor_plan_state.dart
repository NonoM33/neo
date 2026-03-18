import 'package:equatable/equatable.dart';

import '../../../domain/entities/floor_plan.dart';
import 'floor_plan_event.dart' show ElementType;

sealed class FloorPlanState extends Equatable {
  const FloorPlanState();

  @override
  List<Object?> get props => [];
}

final class FloorPlanInitial extends FloorPlanState {
  const FloorPlanInitial();
}

final class FloorPlanLoading extends FloorPlanState {
  const FloorPlanLoading();
}

final class FloorPlanLoaded extends FloorPlanState {
  final FloorPlan plan;
  final PlanTool activeTool;
  final String? selectedElementId;
  final ElementType? selectedElementType;
  final bool isDirty;
  final bool isSaving;
  final PlanViewMode viewMode;
  final List<FloorPlan> undoStack;
  final List<FloorPlan> redoStack;
  final bool hasDraft;
  /// Set when equipment is placed (non-silent); triggers orchestration in screen
  final PlanEquipment? lastPlacedEquipment;

  const FloorPlanLoaded({
    required this.plan,
    this.activeTool = PlanTool.select,
    this.selectedElementId,
    this.selectedElementType,
    this.isDirty = false,
    this.isSaving = false,
    this.viewMode = PlanViewMode.edit,
    this.undoStack = const [],
    this.redoStack = const [],
    this.hasDraft = false,
    this.lastPlacedEquipment,
  });

  bool get canUndo => undoStack.isNotEmpty;
  bool get canRedo => redoStack.isNotEmpty;

  /// Get the selected wall if any
  PlanWall? get selectedWall {
    if (selectedElementType != ElementType.wall || selectedElementId == null) {
      return null;
    }
    return plan.walls
        .where((w) => w.id == selectedElementId)
        .firstOrNull;
  }

  /// Get the selected equipment if any
  PlanEquipment? get selectedEquipment {
    if (selectedElementType != ElementType.equipment ||
        selectedElementId == null) return null;
    return plan.equipment
        .where((e) => e.id == selectedElementId)
        .firstOrNull;
  }

  /// Get the selected annotation if any
  PlanAnnotation? get selectedAnnotation {
    if (selectedElementType != ElementType.annotation ||
        selectedElementId == null) return null;
    return plan.annotations
        .where((a) => a.id == selectedElementId)
        .firstOrNull;
  }

  FloorPlanLoaded copyWith({
    FloorPlan? plan,
    PlanTool? activeTool,
    String? selectedElementId,
    ElementType? selectedElementType,
    bool clearSelection = false,
    bool? isDirty,
    bool? isSaving,
    PlanViewMode? viewMode,
    List<FloorPlan>? undoStack,
    List<FloorPlan>? redoStack,
    bool? hasDraft,
    PlanEquipment? lastPlacedEquipment,
    bool clearLastPlaced = false,
  }) {
    return FloorPlanLoaded(
      plan: plan ?? this.plan,
      activeTool: activeTool ?? this.activeTool,
      selectedElementId:
          clearSelection ? null : (selectedElementId ?? this.selectedElementId),
      selectedElementType: clearSelection
          ? null
          : (selectedElementType ?? this.selectedElementType),
      isDirty: isDirty ?? this.isDirty,
      isSaving: isSaving ?? this.isSaving,
      viewMode: viewMode ?? this.viewMode,
      undoStack: undoStack ?? this.undoStack,
      redoStack: redoStack ?? this.redoStack,
      hasDraft: hasDraft ?? this.hasDraft,
      lastPlacedEquipment: clearLastPlaced
          ? null
          : (lastPlacedEquipment ?? this.lastPlacedEquipment),
    );
  }

  @override
  List<Object?> get props => [
        plan, activeTool, selectedElementId, selectedElementType,
        isDirty, isSaving, viewMode, undoStack, redoStack, hasDraft,
        lastPlacedEquipment,
      ];
}

final class FloorPlanEmpty extends FloorPlanState {
  final String roomId;
  final String projectId;

  const FloorPlanEmpty({required this.roomId, required this.projectId});

  @override
  List<Object?> get props => [roomId, projectId];
}

final class FloorPlanError extends FloorPlanState {
  final String message;

  const FloorPlanError(this.message);

  @override
  List<Object?> get props => [message];
}
