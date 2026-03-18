import 'dart:ui' show Offset;

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../../domain/entities/floor_plan.dart';
import '../../../domain/repositories/floor_plan_repository.dart';
import 'floor_plan_event.dart';
import 'floor_plan_state.dart';

const _uuid = Uuid();

class FloorPlanBloc extends Bloc<FloorPlanEvent, FloorPlanState> {
  final FloorPlanRepository _repository;

  FloorPlanBloc({required FloorPlanRepository repository})
      : _repository = repository,
        super(const FloorPlanInitial()) {
    on<FloorPlanLoadRequested>(_onLoadRequested);
    on<FloorPlanSaveRequested>(_onSaveRequested);
    on<FloorPlanCreateRequested>(_onCreateRequested);
    on<FloorPlanToolSelected>(_onToolSelected);
    on<FloorPlanViewModeChanged>(_onViewModeChanged);
    on<FloorPlanElementSelected>(_onElementSelected);
    on<WallAddRequested>(_onWallAdd);
    on<WallUpdateRequested>(_onWallUpdate);
    on<WallDeleteRequested>(_onWallDelete);
    on<OpeningAddRequested>(_onOpeningAdd);
    on<OpeningDeleteRequested>(_onOpeningDelete);
    on<EquipmentPlaceRequested>(_onEquipmentPlace);
    on<EquipmentMoveRequested>(_onEquipmentMove);
    on<EquipmentDeleteRequested>(_onEquipmentDelete);
    on<EquipmentStatusChanged>(_onEquipmentStatusChanged);
    on<AnnotationAddRequested>(_onAnnotationAdd);
    on<AnnotationDeleteRequested>(_onAnnotationDelete);
    on<FloorPlanUndoRequested>(_onUndo);
    on<FloorPlanRedoRequested>(_onRedo);
    on<FloorPlanDeleteSelectedRequested>(_onDeleteSelected);
    on<FloorPlanGenerateRoomWalls>(_onGenerateRoomWalls);
    on<FloorPlanImportFromScan>(_onImportFromScan);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  /// Push current plan onto undo stack before modifying
  FloorPlanLoaded _pushUndo(FloorPlanLoaded current) {
    final newStack = [...current.undoStack, current.plan];
    // Keep max 30 undo steps
    final trimmed = newStack.length > 30
        ? newStack.sublist(newStack.length - 30)
        : newStack;
    return current.copyWith(
      undoStack: trimmed,
      redoStack: const [],
      isDirty: true,
    );
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  Future<void> _onLoadRequested(
    FloorPlanLoadRequested event,
    Emitter<FloorPlanState> emit,
  ) async {
    emit(const FloorPlanLoading());
    try {
      final plan = await _repository.getFloorPlanByRoom(event.roomId);
      if (plan == null) {
        emit(FloorPlanEmpty(roomId: event.roomId, projectId: event.projectId));
      } else {
        emit(FloorPlanLoaded(plan: plan));
      }
    } catch (_) {
      emit(FloorPlanEmpty(roomId: event.roomId, projectId: event.projectId));
    }
  }

  Future<void> _onSaveRequested(
    FloorPlanSaveRequested event,
    Emitter<FloorPlanState> emit,
  ) async {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    emit(s.copyWith(isSaving: true));
    try {
      var saved = await _repository.saveFloorPlan(s.plan);
      // If USDZ file is a local iOS path, upload it to the backend
      if (saved.usdzFilePath != null && saved.usdzFilePath!.startsWith('/')) {
        try {
          saved = await _repository.uploadUsdzFile(saved.id, saved.usdzFilePath!);
        } catch (_) {
          // Upload failed silently — the 2D plan is saved, USDZ will retry next save
        }
      }
      emit(s.copyWith(plan: saved, isSaving: false, isDirty: false));
    } catch (_) {
      emit(s.copyWith(isSaving: false));
    }
  }

  void _onCreateRequested(
    FloorPlanCreateRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final plan = FloorPlan(
      id: _uuid.v4(),
      roomId: event.roomId,
      projectId: event.projectId,
      widthMeters: event.widthMeters,
      heightMeters: event.heightMeters,
      createdAt: DateTime.now(),
    );

    emit(FloorPlanLoaded(plan: plan, isDirty: true));

    // Auto-generate the 4 room walls
    add(const FloorPlanGenerateRoomWalls());
  }

  // ─── Tool / Mode ──────────────────────────────────────────────

  void _onToolSelected(
    FloorPlanToolSelected event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;
    emit(s.copyWith(activeTool: event.tool, clearSelection: true));
  }

  void _onViewModeChanged(
    FloorPlanViewModeChanged event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;
    emit(s.copyWith(viewMode: event.mode));
  }

  void _onElementSelected(
    FloorPlanElementSelected event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;
    if (event.elementId == null) {
      emit(s.copyWith(clearSelection: true));
    } else {
      emit(s.copyWith(
        selectedElementId: event.elementId,
        selectedElementType: event.elementType,
      ));
    }
  }

  // ─── Walls ────────────────────────────────────────────────────

  void _onWallAdd(
    WallAddRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    final wall = PlanWall(
      id: _uuid.v4(),
      startPoint: event.startPoint,
      endPoint: event.endPoint,
      type: event.wallType,
    );

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        walls: [...withUndo.plan.walls, wall],
      ),
      selectedElementId: wall.id,
      selectedElementType: ElementType.wall,
    ));
  }

  void _onWallUpdate(
    WallUpdateRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    final updatedWalls = withUndo.plan.walls.map((w) {
      if (w.id != event.wallId) return w;
      return w.copyWith(
        startPoint: event.startPoint,
        endPoint: event.endPoint,
        type: event.wallType,
        thickness: event.thickness,
      );
    }).toList();

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(walls: updatedWalls),
    ));
  }

  void _onWallDelete(
    WallDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    // Also remove openings on this wall
    final updatedOpenings = withUndo.plan.openings
        .where((o) => o.wallId != event.wallId)
        .toList();

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        walls: withUndo.plan.walls.where((w) => w.id != event.wallId).toList(),
        openings: updatedOpenings,
      ),
      clearSelection: true,
    ));
  }

  // ─── Openings ─────────────────────────────────────────────────

  void _onOpeningAdd(
    OpeningAddRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    final opening = PlanOpening(
      id: _uuid.v4(),
      wallId: event.wallId,
      type: event.type,
      offsetOnWall: event.offsetOnWall,
      widthMeters: event.widthMeters,
    );

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        openings: [...withUndo.plan.openings, opening],
      ),
    ));
  }

  void _onOpeningDelete(
    OpeningDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        openings: withUndo.plan.openings
            .where((o) => o.id != event.openingId)
            .toList(),
      ),
      clearSelection: true,
    ));
  }

  // ─── Equipment ────────────────────────────────────────────────

  void _onEquipmentPlace(
    EquipmentPlaceRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    final eq = PlanEquipment(
      id: _uuid.v4(),
      productId: event.productId,
      position: event.position,
      quantity: event.quantity,
      label: event.label,
    );

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        equipment: [...withUndo.plan.equipment, eq],
      ),
      selectedElementId: eq.id,
      selectedElementType: ElementType.equipment,
    ));
  }

  void _onEquipmentMove(
    EquipmentMoveRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    final updatedEquipment = withUndo.plan.equipment.map((e) {
      if (e.id != event.equipmentId) return e;
      return e.copyWith(position: event.newPosition);
    }).toList();

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(equipment: updatedEquipment),
    ));
  }

  void _onEquipmentDelete(
    EquipmentDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        equipment: withUndo.plan.equipment
            .where((e) => e.id != event.equipmentId)
            .toList(),
      ),
      clearSelection: true,
    ));
  }

  void _onEquipmentStatusChanged(
    EquipmentStatusChanged event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.equipment.map((e) {
      if (e.id != event.equipmentId) return e;
      return e.copyWith(status: event.status);
    }).toList();

    emit(s.copyWith(
      plan: s.plan.copyWith(equipment: updated),
      isDirty: true,
    ));
  }

  // ─── Annotations ──────────────────────────────────────────────

  void _onAnnotationAdd(
    AnnotationAddRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    final annotation = PlanAnnotation(
      id: _uuid.v4(),
      position: event.position,
      type: event.type,
      text: event.text,
      endPosition: event.endPosition,
    );

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        annotations: [...withUndo.plan.annotations, annotation],
      ),
    ));
  }

  void _onAnnotationDelete(
    AnnotationDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final withUndo = _pushUndo(s);
    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        annotations: withUndo.plan.annotations
            .where((a) => a.id != event.annotationId)
            .toList(),
      ),
      clearSelection: true,
    ));
  }

  // ─── Undo / Redo ──────────────────────────────────────────────

  void _onUndo(
    FloorPlanUndoRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded || !s.canUndo) return;

    final previousPlan = s.undoStack.last;
    final newUndoStack = s.undoStack.sublist(0, s.undoStack.length - 1);

    emit(s.copyWith(
      plan: previousPlan,
      undoStack: newUndoStack,
      redoStack: [...s.redoStack, s.plan],
      clearSelection: true,
    ));
  }

  void _onRedo(
    FloorPlanRedoRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded || !s.canRedo) return;

    final nextPlan = s.redoStack.last;
    final newRedoStack = s.redoStack.sublist(0, s.redoStack.length - 1);

    emit(s.copyWith(
      plan: nextPlan,
      undoStack: [...s.undoStack, s.plan],
      redoStack: newRedoStack,
      clearSelection: true,
    ));
  }

  // ─── Delete selected ─────────────────────────────────────────

  void _onDeleteSelected(
    FloorPlanDeleteSelectedRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded || s.selectedElementId == null) return;

    switch (s.selectedElementType) {
      case ElementType.wall:
        add(WallDeleteRequested(s.selectedElementId!));
      case ElementType.opening:
        add(OpeningDeleteRequested(s.selectedElementId!));
      case ElementType.equipment:
        add(EquipmentDeleteRequested(s.selectedElementId!));
      case ElementType.annotation:
        add(AnnotationDeleteRequested(s.selectedElementId!));
      case null:
        break;
    }
  }

  // ─── Generate room walls ──────────────────────────────────────

  void _onGenerateRoomWalls(
    FloorPlanGenerateRoomWalls event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final w = s.plan.widthMeters;
    final h = s.plan.heightMeters;
    const margin = 0.5; // 50cm margin from canvas edge

    final topLeft = const Offset(margin, margin);
    final topRight = Offset(w - margin, margin);
    final bottomRight = Offset(w - margin, h - margin);
    final bottomLeft = Offset(margin, h - margin);

    final withUndo = _pushUndo(s);
    final walls = [
      PlanWall(
        id: _uuid.v4(),
        startPoint: topLeft,
        endPoint: topRight,
        type: WallType.exterior,
      ),
      PlanWall(
        id: _uuid.v4(),
        startPoint: topRight,
        endPoint: bottomRight,
        type: WallType.exterior,
      ),
      PlanWall(
        id: _uuid.v4(),
        startPoint: bottomRight,
        endPoint: bottomLeft,
        type: WallType.exterior,
      ),
      PlanWall(
        id: _uuid.v4(),
        startPoint: bottomLeft,
        endPoint: topLeft,
        type: WallType.exterior,
      ),
    ];

    emit(withUndo.copyWith(
      plan: withUndo.plan.copyWith(
        walls: [...withUndo.plan.walls, ...walls],
      ),
    ));
  }

  // ─── Import from LiDAR scan ───────────────────────────────────

  void _onImportFromScan(
    FloorPlanImportFromScan event,
    Emitter<FloorPlanState> emit,
  ) {
    emit(FloorPlanLoaded(plan: event.scannedPlan, isDirty: true));
  }
}
