import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/checklist_item.dart';
import '../../../domain/entities/room.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/project_repository.dart';
import 'audit_event.dart';
import 'audit_state.dart';

/// Audit BLoC for managing room audits
class AuditBloc extends Bloc<AuditEvent, AuditState> {
  final ProjectRepository _projectRepository;

  AuditBloc({
    required ProjectRepository projectRepository,
  })  : _projectRepository = projectRepository,
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

    final result = await _projectRepository.getRoomsByProject(event.projectId);

    switch (result) {
      case Success(data: final rooms):
        // List endpoint returns rooms without checklist/photos.
        // Fetch full detail for each room in parallel.
        final detailedRooms = await Future.wait(
          rooms.map((room) async {
            final detailResult = await _projectRepository.getRoom(room.id);
            return detailResult is Success<Room> ? detailResult.data : room;
          }),
        );

        emit(AuditLoaded(
          projectId: event.projectId,
          rooms: detailedRooms,
          selectedRoom: detailedRooms.isNotEmpty ? detailedRooms.first : null,
        ));
      case Error(failure: final failure):
        emit(AuditError(failure.message));
    }
  }

  Future<void> _onRoomSelected(
    AuditRoomSelected event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded) return;

    // Show selection immediately
    emit(currentState.copyWith(selectedRoom: event.room));

    // Refresh room detail to ensure fresh checklist/photos
    final detailResult = await _projectRepository.getRoom(event.room.id);
    if (detailResult is Success<Room>) {
      final freshRoom = detailResult.data;
      final updatedRooms = currentState.rooms.map((r) {
        return r.id == freshRoom.id ? freshRoom : r;
      }).toList();
      emit(currentState.copyWith(
        rooms: updatedRooms,
        selectedRoom: freshRoom,
      ));
    }
  }

  Future<void> _onAddRoomRequested(
    AuditAddRoomRequested event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded) return;

    final roomName = event.name.trim().isNotEmpty
        ? event.name.trim()
        : event.type.displayName;

    final result = await _projectRepository.createRoom(
      currentState.projectId,
      name: roomName,
      type: event.type.apiValue,
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

    final result = await _projectRepository.updateRoom(
      event.room.id,
      {
        'name': event.room.name,
        'type': event.room.type.apiValue,
        'floor': event.room.floor,
        'notes': event.room.notes,
      },
    );

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

    // Update checklist item via API
    _projectRepository.updateChecklistItem(
      event.itemId,
      {'checked': event.isChecked},
    );

    // Optimistically update local state
    final room = currentState.selectedRoom!;
    final updatedChecklist = room.checklist.map((item) {
      if (item.id == event.itemId) {
        return item.copyWith(isChecked: event.isChecked);
      }
      return item;
    }).toList();

    final updatedRoom = room.copyWith(checklist: updatedChecklist);
    final updatedRooms = currentState.rooms.map((r) {
      return r.id == updatedRoom.id ? updatedRoom : r;
    }).toList();

    emit(currentState.copyWith(
      rooms: updatedRooms,
      selectedRoom: updatedRoom,
    ));
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

    final updatedRoom = room.copyWith(checklist: updatedChecklist);
    final updatedRooms = currentState.rooms.map((r) {
      return r.id == updatedRoom.id ? updatedRoom : r;
    }).toList();

    emit(currentState.copyWith(
      rooms: updatedRooms,
      selectedRoom: updatedRoom,
    ));
  }

  Future<void> _onAddChecklistItem(
    AuditAddChecklistItemRequested event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    final result = await _projectRepository.createChecklistItem(
      currentState.selectedRoom!.id,
      category: event.category.name,
      label: event.label,
    );

    if (result is Success<ChecklistItem>) {
      final room = currentState.selectedRoom!;
      final updatedRoom = room.copyWith(
        checklist: [...room.checklist, result.data],
      );
      final updatedRooms = currentState.rooms.map((r) {
        return r.id == updatedRoom.id ? updatedRoom : r;
      }).toList();

      emit(currentState.copyWith(
        rooms: updatedRooms,
        selectedRoom: updatedRoom,
      ));
    }
  }

  Future<void> _onPhotoCaptured(
    AuditPhotoCaptured event,
    Emitter<AuditState> emit,
  ) async {
    final currentState = state;
    if (currentState is! AuditLoaded || currentState.selectedRoom == null) {
      return;
    }

    final result = await _projectRepository.uploadPhoto(
      currentState.selectedRoom!.id,
      event.localPath,
    );

    switch (result) {
      case Success(data: final photo):
        final room = currentState.selectedRoom!;
        final updatedRoom = room.copyWith(
          photos: [...room.photos, photo],
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
    );

    // Update via API
    _projectRepository.updateRoom(updatedRoom.id, {'notes': event.notes});

    // Optimistic update
    final updatedRooms = currentState.rooms.map((r) {
      return r.id == updatedRoom.id ? updatedRoom : r;
    }).toList();

    emit(currentState.copyWith(
      rooms: updatedRooms,
      selectedRoom: updatedRoom,
    ));
  }
}
