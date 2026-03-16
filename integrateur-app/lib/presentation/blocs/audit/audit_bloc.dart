import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';
import '../../../domain/entities/room.dart';
import '../../../domain/entities/checklist_item.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/project_repository.dart';
import 'audit_event.dart';
import 'audit_state.dart';

/// Audit BLoC for managing room audits
class AuditBloc extends Bloc<AuditEvent, AuditState> {
  final ProjectRepository _projectRepository;
  final Uuid _uuid;

  AuditBloc({
    required ProjectRepository projectRepository,
    Uuid? uuid,
  })  : _projectRepository = projectRepository,
        _uuid = uuid ?? const Uuid(),
        super(const AuditInitial()) {
    on<AuditLoadRoomsRequested>(_onLoadRoomsRequested);
    on<AuditRoomSelected>(_onRoomSelected);
    on<AuditAddRoomRequested>(_onAddRoomRequested);
    on<AuditUpdateRoomRequested>(_onUpdateRoomRequested);
    on<AuditDeleteRoomRequested>(_onDeleteRoomRequested);
    on<AuditToggleChecklistItemRequested>(_onToggleChecklistItem);
    on<AuditUpdateChecklistQuantityRequested>(_onUpdateChecklistQuantity);
    on<AuditAddChecklistItemRequested>(_onAddChecklistItem);
    on<AuditPhotoCaptured>(_onPhotoCaptured);
    on<AuditDeletePhotoRequested>(_onDeletePhotoRequested);
    on<AuditUpdateNotesRequested>(_onUpdateNotesRequested);
  }

  Future<void> _onLoadRoomsRequested(
    AuditLoadRoomsRequested event,
    Emitter<AuditState> emit,
  ) async {
    emit(const AuditLoading());

    final result = await _projectRepository.getProject(event.projectId);

    switch (result) {
      case Success(data: final project):
        emit(AuditLoaded(
          projectId: event.projectId,
          rooms: project.rooms,
          selectedRoom: project.rooms.isNotEmpty ? project.rooms.first : null,
        ));
      case Error(failure: final failure):
        emit(AuditError(failure.message));
    }
  }

  void _onRoomSelected(
    AuditRoomSelected event,
    Emitter<AuditState> emit,
  ) {
    final currentState = state;
    if (currentState is AuditLoaded) {
      emit(currentState.copyWith(selectedRoom: event.room));
    }
  }

  Future<void> _onAddRoomRequested(
    AuditAddRoomRequested event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded) return;

    final room = Room(
      id: _uuid.v4(),
      projectId: currentState.projectId,
      name: event.name,
      type: event.type,
      surfaceM2: event.surfaceM2,
      checklist: ChecklistTemplates.defaultItems,
      createdAt: DateTime.now(),
    );

    final result = await _projectRepository.addRoom(
      currentState.projectId,
      room,
    );

    switch (result) {
      case Success(data: final newRoom):
        final updatedRooms = [...currentState.rooms, newRoom];
        emit(currentState.copyWith(
          rooms: updatedRooms,
          selectedRoom: newRoom,
        ));
      case Error(failure: final failure):
        emit(AuditError(failure.message));
    }
  }

  Future<void> _onUpdateRoomRequested(
    AuditUpdateRoomRequested event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded) return;

    final result = await _projectRepository.updateRoom(event.room);

    switch (result) {
      case Success(data: final updatedRoom):
        final updatedRooms = currentState.rooms.map((r) {
          return r.id == updatedRoom.id ? updatedRoom : r;
        }).toList();
        emit(currentState.copyWith(
          rooms: updatedRooms,
          selectedRoom: currentState.selectedRoom?.id == updatedRoom.id
              ? updatedRoom
              : currentState.selectedRoom,
        ));
      case Error(failure: final failure):
        emit(AuditError(failure.message));
    }
  }

  Future<void> _onDeleteRoomRequested(
    AuditDeleteRoomRequested event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded) return;

    await _projectRepository.deleteRoom(event.roomId);

    final updatedRooms =
        currentState.rooms.where((r) => r.id != event.roomId).toList();
    final newSelectedRoom = currentState.selectedRoom?.id == event.roomId
        ? (updatedRooms.isNotEmpty ? updatedRooms.first : null)
        : currentState.selectedRoom;

    emit(currentState.copyWith(
      rooms: updatedRooms,
      selectedRoom: newSelectedRoom,
      clearSelectedRoom: newSelectedRoom == null,
    ));
  }

  void _onToggleChecklistItem(
    AuditToggleChecklistItemRequested event,
    Emitter<AuditState> emit,
  ) {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    final room = currentState.selectedRoom!;
    final updatedChecklist = room.checklist.map((item) {
      if (item.id == event.itemId) {
        return item.copyWith(isChecked: event.isChecked);
      }
      return item;
    }).toList();

    final updatedRoom = room.copyWith(
      checklist: updatedChecklist,
      updatedAt: DateTime.now(),
    );

    add(AuditUpdateRoomRequested(updatedRoom));
  }

  void _onUpdateChecklistQuantity(
    AuditUpdateChecklistQuantityRequested event,
    Emitter<AuditState> emit,
  ) {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    final room = currentState.selectedRoom!;
    final updatedChecklist = room.checklist.map((item) {
      if (item.id == event.itemId) {
        return item.copyWith(quantity: event.quantity);
      }
      return item;
    }).toList();

    final updatedRoom = room.copyWith(
      checklist: updatedChecklist,
      updatedAt: DateTime.now(),
    );

    add(AuditUpdateRoomRequested(updatedRoom));
  }

  void _onAddChecklistItem(
    AuditAddChecklistItemRequested event,
    Emitter<AuditState> emit,
  ) {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    final room = currentState.selectedRoom!;
    final newItem = ChecklistItem(
      id: _uuid.v4(),
      label: event.label,
      category: event.category,
    );

    final updatedRoom = room.copyWith(
      checklist: [...room.checklist, newItem],
      updatedAt: DateTime.now(),
    );

    add(AuditUpdateRoomRequested(updatedRoom));
  }

  Future<void> _onPhotoCaptured(
    AuditPhotoCaptured event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    final result = await _projectRepository.addPhoto(
      currentState.selectedRoom!.id,
      event.localPath,
    );

    switch (result) {
      case Success(data: final photo):
        final room = currentState.selectedRoom!;
        final updatedRoom = room.copyWith(
          photos: [...room.photos, photo],
          updatedAt: DateTime.now(),
        );

        final updatedRooms = currentState.rooms.map((r) {
          return r.id == updatedRoom.id ? updatedRoom : r;
        }).toList();

        emit(currentState.copyWith(
          rooms: updatedRooms,
          selectedRoom: updatedRoom,
        ));
      case Error(failure: final failure):
        emit(AuditError(failure.message));
    }
  }

  Future<void> _onDeletePhotoRequested(
    AuditDeletePhotoRequested event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    await _projectRepository.deletePhoto(event.photoId);

    final room = currentState.selectedRoom!;
    final updatedRoom = room.copyWith(
      photos: room.photos.where((p) => p.id != event.photoId).toList(),
      updatedAt: DateTime.now(),
    );

    final updatedRooms = currentState.rooms.map((r) {
      return r.id == updatedRoom.id ? updatedRoom : r;
    }).toList();

    emit(currentState.copyWith(
      rooms: updatedRooms,
      selectedRoom: updatedRoom,
    ));
  }

  void _onUpdateNotesRequested(
    AuditUpdateNotesRequested event,
    Emitter<AuditState> emit,
  ) {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    final updatedRoom = currentState.selectedRoom!.copyWith(
      notes: event.notes,
      updatedAt: DateTime.now(),
    );

    add(AuditUpdateRoomRequested(updatedRoom));
  }
}
