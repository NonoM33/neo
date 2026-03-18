import 'dart:convert';
import 'dart:ui' show Offset;

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../data/models/floor_plan_model.dart';
import '../../../domain/entities/floor_plan.dart';
import '../../../domain/repositories/floor_plan_repository.dart';
import 'floor_plan_event.dart';
import 'floor_plan_state.dart';

const _uuid = Uuid();
const _draftBoxName = 'floor_plan_drafts';

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
    on<EquipmentPlacementAcknowledged>(_onPlacementAcknowledged);
    on<EquipmentMoveRequested>(_onEquipmentMove);
    on<EquipmentDeleteRequested>(_onEquipmentDelete);
    on<EquipmentStatusChanged>(_onEquipmentStatusChanged);
    on<AnnotationAddRequested>(_onAnnotationAdd);
    on<AnnotationMoveRequested>(_onAnnotationMove);
    on<AnnotationUpdateRequested>(_onAnnotationUpdate);
    on<AnnotationPhotoAdded>(_onAnnotationPhotoAdded);
    on<AnnotationPhotoRemoved>(_onAnnotationPhotoRemoved);
    on<AnnotationDeleteRequested>(_onAnnotationDelete);
    on<EquipmentUpdateRequested>(_onEquipmentUpdate);
    on<EquipmentPhotoAdded>(_onEquipmentPhotoAdded);
    on<EquipmentPhotoRemoved>(_onEquipmentPhotoRemoved);
    on<FloorPlanCeilingHeightChanged>(_onCeilingHeightChanged);
    on<FloorPlanUndoRequested>(_onUndo);
    on<FloorPlanRedoRequested>(_onRedo);
    on<FloorPlanDeleteSelectedRequested>(_onDeleteSelected);
    on<FloorPlanGenerateRoomWalls>(_onGenerateRoomWalls);
    on<FloorPlanImportFromScan>(_onImportFromScan);
  }

  // ─── Hive draft helpers ───────────────────────────────────────

  /// Save a plan draft locally to Hive (fire-and-forget)
  Future<void> _saveDraftLocally(String roomId, FloorPlan plan) async {
    try {
      final box = await Hive.openBox<String>(_draftBoxName);
      final model = FloorPlanModel.fromEntity(plan);
      await box.put(roomId, jsonEncode(model.toJson()));
    } catch (_) {}
  }

  /// Load draft from Hive; returns null if none exists
  Future<FloorPlan?> _loadDraftLocally(String roomId) async {
    try {
      final box = await Hive.openBox<String>(_draftBoxName);
      final raw = box.get(roomId);
      if (raw == null) return null;
      final model = FloorPlanModel.fromJson(
          jsonDecode(raw) as Map<String, dynamic>);
      return model;
    } catch (_) {
      return null;
    }
  }

  /// Clear draft after successful server save
  Future<void> _clearDraftLocally(String roomId) async {
    try {
      final box = await Hive.openBox<String>(_draftBoxName);
      await box.delete(roomId);
    } catch (_) {}
  }

  // ─── Undo helper ─────────────────────────────────────────────

  /// Build a new state with [newPlan] applied, current plan pushed onto the
  /// undo stack, redo stack cleared, and a Hive draft saved (fire-and-forget).
  FloorPlanLoaded _withNewPlan(FloorPlanLoaded current, FloorPlan newPlan) {
    final newStack = [...current.undoStack, current.plan];
    final trimmed = newStack.length > 50
        ? newStack.sublist(newStack.length - 50)
        : newStack;
    // Fire-and-forget — do not await so the UI stays responsive
    _saveDraftLocally(newPlan.roomId, newPlan);
    return current.copyWith(
      plan: newPlan,
      undoStack: trimmed,
      redoStack: const [],
      isDirty: true,
      hasDraft: true,
      clearLastPlaced: true,
    );
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  Future<void> _onLoadRequested(
    FloorPlanLoadRequested event,
    Emitter<FloorPlanState> emit,
  ) async {
    emit(const FloorPlanLoading());
    try {
      final serverPlan = await _repository.getFloorPlanByRoom(event.roomId);
      if (serverPlan == null) {
        emit(FloorPlanEmpty(roomId: event.roomId, projectId: event.projectId));
        return;
      }
      // Check for a local draft that may be more recent than the server copy
      final draft = await _loadDraftLocally(event.roomId);
      if (draft != null) {
        emit(FloorPlanLoaded(plan: draft, hasDraft: true, isDirty: true));
      } else {
        emit(FloorPlanLoaded(plan: serverPlan));
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
          saved =
              await _repository.uploadUsdzFile(saved.id, saved.usdzFilePath!);
        } catch (_) {
          // Upload failed silently — the 2D plan is saved, USDZ will retry next save
        }
      }
      // Clear local draft now that changes are persisted on the server
      await _clearDraftLocally(saved.roomId);
      emit(s.copyWith(
          plan: saved, isSaving: false, isDirty: false, hasDraft: false));
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

    final wall = PlanWall(
      id: _uuid.v4(),
      startPoint: event.startPoint,
      endPoint: event.endPoint,
      type: event.wallType,
    );
    final newPlan = s.plan.copyWith(walls: [...s.plan.walls, wall]);
    final next = _withNewPlan(s, newPlan);
    emit(next.copyWith(
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

    final updatedWalls = s.plan.walls.map((w) {
      if (w.id != event.wallId) return w;
      return w.copyWith(
        startPoint: event.startPoint,
        endPoint: event.endPoint,
        type: event.wallType,
        thickness: event.thickness,
      );
    }).toList();
    emit(_withNewPlan(s, s.plan.copyWith(walls: updatedWalls)));
  }

  void _onWallDelete(
    WallDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updatedOpenings =
        s.plan.openings.where((o) => o.wallId != event.wallId).toList();
    final newPlan = s.plan.copyWith(
      walls: s.plan.walls.where((w) => w.id != event.wallId).toList(),
      openings: updatedOpenings,
    );
    emit(_withNewPlan(s, newPlan).copyWith(clearSelection: true));
  }

  // ─── Openings ─────────────────────────────────────────────────

  void _onOpeningAdd(
    OpeningAddRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final opening = PlanOpening(
      id: _uuid.v4(),
      wallId: event.wallId,
      type: event.type,
      offsetOnWall: event.offsetOnWall,
      widthMeters: event.widthMeters,
    );
    emit(_withNewPlan(
        s, s.plan.copyWith(openings: [...s.plan.openings, opening])));
  }

  void _onOpeningDelete(
    OpeningDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final newPlan = s.plan.copyWith(
      openings:
          s.plan.openings.where((o) => o.id != event.openingId).toList(),
    );
    emit(_withNewPlan(s, newPlan).copyWith(clearSelection: true));
  }

  // ─── Equipment ────────────────────────────────────────────────

  void _onEquipmentPlace(
    EquipmentPlaceRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final eq = PlanEquipment(
      id: _uuid.v4(),
      productId: event.productId,
      position: event.position,
      quantity: event.quantity,
      label: event.label,
    );
    final next = _withNewPlan(
        s, s.plan.copyWith(equipment: [...s.plan.equipment, eq]));
    emit(next.copyWith(
      selectedElementId: eq.id,
      selectedElementType: ElementType.equipment,
      lastPlacedEquipment: event.silent ? null : eq,
    ));
  }

  void _onPlacementAcknowledged(
    EquipmentPlacementAcknowledged event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;
    emit(s.copyWith(clearLastPlaced: true));
  }

  void _onEquipmentMove(
    EquipmentMoveRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updatedEquipment = s.plan.equipment.map((e) {
      if (e.id != event.equipmentId) return e;
      return e.copyWith(position: event.newPosition);
    }).toList();
    emit(_withNewPlan(s, s.plan.copyWith(equipment: updatedEquipment)));
  }

  void _onEquipmentDelete(
    EquipmentDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final newPlan = s.plan.copyWith(
      equipment:
          s.plan.equipment.where((e) => e.id != event.equipmentId).toList(),
    );
    emit(_withNewPlan(s, newPlan).copyWith(clearSelection: true));
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
    // Status change is tracked as dirty + draft but not added to undo stack
    final newPlan = s.plan.copyWith(equipment: updated);
    _saveDraftLocally(newPlan.roomId, newPlan);
    emit(s.copyWith(plan: newPlan, isDirty: true, hasDraft: true));
  }

  // ─── Annotations ──────────────────────────────────────────────

  void _onAnnotationAdd(
    AnnotationAddRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final annotation = PlanAnnotation(
      id: _uuid.v4(),
      position: event.position,
      type: event.type,
      text: event.text,
      endPosition: event.endPosition,
    );
    emit(_withNewPlan(s,
        s.plan.copyWith(annotations: [...s.plan.annotations, annotation])));
  }

  void _onAnnotationDelete(
    AnnotationDeleteRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final newPlan = s.plan.copyWith(
      annotations: s.plan.annotations
          .where((a) => a.id != event.annotationId)
          .toList(),
    );
    emit(_withNewPlan(s, newPlan).copyWith(clearSelection: true));
  }

  void _onAnnotationMove(
    AnnotationMoveRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.annotations.map((a) {
      if (a.id != event.annotationId) return a;
      return a.copyWith(position: event.newPosition);
    }).toList();
    emit(_withNewPlan(s, s.plan.copyWith(annotations: updated)));
  }

  void _onAnnotationUpdate(
    AnnotationUpdateRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.annotations.map((a) {
      if (a.id != event.annotationId) return a;
      return a.copyWith(text: event.text ?? a.text);
    }).toList();
    emit(_withNewPlan(s, s.plan.copyWith(annotations: updated)));
  }

  void _onAnnotationPhotoAdded(
    AnnotationPhotoAdded event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.annotations.map((a) {
      if (a.id != event.annotationId) return a;
      return a.copyWith(photoUrls: [...a.photoUrls, event.photoUrl]);
    }).toList();
    final newPlan = s.plan.copyWith(annotations: updated);
    _saveDraftLocally(newPlan.roomId, newPlan);
    emit(s.copyWith(plan: newPlan, isDirty: true, hasDraft: true));
  }

  void _onAnnotationPhotoRemoved(
    AnnotationPhotoRemoved event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.annotations.map((a) {
      if (a.id != event.annotationId) return a;
      return a.copyWith(
        photoUrls: a.photoUrls.where((u) => u != event.photoUrl).toList(),
      );
    }).toList();
    final newPlan = s.plan.copyWith(annotations: updated);
    _saveDraftLocally(newPlan.roomId, newPlan);
    emit(s.copyWith(plan: newPlan, isDirty: true, hasDraft: true));
  }

  void _onEquipmentUpdate(
    EquipmentUpdateRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.equipment.map((e) {
      if (e.id != event.equipmentId) return e;
      return e.copyWith(
        label: event.label ?? e.label,
        notes: event.notes ?? e.notes,
      );
    }).toList();
    emit(_withNewPlan(s, s.plan.copyWith(equipment: updated)));
  }

  void _onEquipmentPhotoAdded(
    EquipmentPhotoAdded event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.equipment.map((e) {
      if (e.id != event.equipmentId) return e;
      return e.copyWith(photoUrls: [...e.photoUrls, event.photoUrl]);
    }).toList();
    final newPlan = s.plan.copyWith(equipment: updated);
    _saveDraftLocally(newPlan.roomId, newPlan);
    emit(s.copyWith(plan: newPlan, isDirty: true, hasDraft: true));
  }

  void _onEquipmentPhotoRemoved(
    EquipmentPhotoRemoved event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final updated = s.plan.equipment.map((e) {
      if (e.id != event.equipmentId) return e;
      return e.copyWith(
        photoUrls: e.photoUrls.where((u) => u != event.photoUrl).toList(),
      );
    }).toList();
    final newPlan = s.plan.copyWith(equipment: updated);
    _saveDraftLocally(newPlan.roomId, newPlan);
    emit(s.copyWith(plan: newPlan, isDirty: true, hasDraft: true));
  }

  void _onCeilingHeightChanged(
    FloorPlanCeilingHeightChanged event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded) return;

    final newPlan = s.plan.copyWith(ceilingHeight: event.ceilingHeight);
    _saveDraftLocally(newPlan.roomId, newPlan);
    emit(s.copyWith(plan: newPlan, isDirty: true, hasDraft: true));
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

    _saveDraftLocally(previousPlan.roomId, previousPlan);
    emit(s.copyWith(
      plan: previousPlan,
      undoStack: newUndoStack,
      redoStack: [s.plan, ...s.redoStack],
      clearSelection: true,
      hasDraft: true,
    ));
  }

  void _onRedo(
    FloorPlanRedoRequested event,
    Emitter<FloorPlanState> emit,
  ) {
    final s = state;
    if (s is! FloorPlanLoaded || !s.canRedo) return;

    final nextPlan = s.redoStack.first;
    final newRedoStack = s.redoStack.sublist(1);

    _saveDraftLocally(nextPlan.roomId, nextPlan);
    emit(s.copyWith(
      plan: nextPlan,
      undoStack: [...s.undoStack, s.plan],
      redoStack: newRedoStack,
      clearSelection: true,
      hasDraft: true,
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

    final newPlan =
        s.plan.copyWith(walls: [...s.plan.walls, ...walls]);
    emit(_withNewPlan(s, newPlan));
  }

  // ─── Import from LiDAR scan ───────────────────────────────────

  void _onImportFromScan(
    FloorPlanImportFromScan event,
    Emitter<FloorPlanState> emit,
  ) {
    emit(FloorPlanLoaded(plan: event.scannedPlan, isDirty: true));
  }
}
