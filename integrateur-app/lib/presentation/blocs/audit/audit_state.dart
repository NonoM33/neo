import 'package:equatable/equatable.dart';
import '../../../domain/entities/room.dart';
import '../../../domain/entities/checklist_item.dart';

/// Audit states
sealed class AuditState extends Equatable {
  const AuditState();

  @override
  List<Object?> get props => [];
}

/// Initial state
final class AuditInitial extends AuditState {
  const AuditInitial();
}

/// Loading state
final class AuditLoading extends AuditState {
  const AuditLoading();
}

/// Rooms loaded
final class AuditLoaded extends AuditState {
  final String projectId;
  final List<Room> rooms;
  final Room? selectedRoom;

  const AuditLoaded({
    required this.projectId,
    required this.rooms,
    this.selectedRoom,
  });

  /// Get completion percentage
  double get completionPercentage {
    if (rooms.isEmpty) return 0;

    final totalItems = rooms.fold<int>(
      0,
      (sum, room) => sum + room.checklist.length,
    );
    if (totalItems == 0) return 0;

    final checkedItems = rooms.fold<int>(
      0,
      (sum, room) => sum + room.checkedItemsCount,
    );
    return checkedItems / totalItems;
  }

  /// Get total photos
  int get totalPhotos => rooms.fold<int>(
        0,
        (sum, room) => sum + room.photoCount,
      );

  /// Get checklist items by category for selected room
  Map<ChecklistCategory, List<ChecklistItem>> get checklistByCategory {
    if (selectedRoom == null) return {};
    return selectedRoom!.itemsByCategory;
  }

  AuditLoaded copyWith({
    String? projectId,
    List<Room>? rooms,
    Room? selectedRoom,
    bool clearSelectedRoom = false,
  }) {
    return AuditLoaded(
      projectId: projectId ?? this.projectId,
      rooms: rooms ?? this.rooms,
      selectedRoom: clearSelectedRoom ? null : (selectedRoom ?? this.selectedRoom),
    );
  }

  @override
  List<Object?> get props => [projectId, rooms, selectedRoom];
}

/// Error state
final class AuditError extends AuditState {
  final String message;

  const AuditError(this.message);

  @override
  List<Object?> get props => [message];
}

/// Operation in progress
final class AuditOperationInProgress extends AuditState {
  final String operation;

  const AuditOperationInProgress(this.operation);

  @override
  List<Object?> get props => [operation];
}
