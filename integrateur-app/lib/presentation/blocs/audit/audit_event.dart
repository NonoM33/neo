import 'package:equatable/equatable.dart';
import '../../../domain/entities/room.dart';
import '../../../domain/entities/checklist_item.dart';

/// Audit events
sealed class AuditEvent extends Equatable {
  const AuditEvent();

  @override
  List<Object?> get props => [];
}

/// Load rooms for a project
final class AuditLoadRoomsRequested extends AuditEvent {
  final String projectId;

  const AuditLoadRoomsRequested(this.projectId);

  @override
  List<Object?> get props => [projectId];
}

/// Select a room
final class AuditRoomSelected extends AuditEvent {
  final Room room;

  const AuditRoomSelected(this.room);

  @override
  List<Object?> get props => [room];
}

/// Add a new room
final class AuditAddRoomRequested extends AuditEvent {
  final String name;
  final RoomType type;
  final double? surfaceM2;

  const AuditAddRoomRequested({
    required this.name,
    required this.type,
    this.surfaceM2,
  });

  @override
  List<Object?> get props => [name, type, surfaceM2];
}

/// Update room
final class AuditUpdateRoomRequested extends AuditEvent {
  final Room room;

  const AuditUpdateRoomRequested(this.room);

  @override
  List<Object?> get props => [room];
}

/// Delete room
final class AuditDeleteRoomRequested extends AuditEvent {
  final String roomId;

  const AuditDeleteRoomRequested(this.roomId);

  @override
  List<Object?> get props => [roomId];
}

/// Toggle checklist item
final class AuditToggleChecklistItemRequested extends AuditEvent {
  final String itemId;
  final bool isChecked;

  const AuditToggleChecklistItemRequested({
    required this.itemId,
    required this.isChecked,
  });

  @override
  List<Object?> get props => [itemId, isChecked];
}

/// Update checklist item quantity
final class AuditUpdateChecklistQuantityRequested extends AuditEvent {
  final String itemId;
  final int quantity;

  const AuditUpdateChecklistQuantityRequested({
    required this.itemId,
    required this.quantity,
  });

  @override
  List<Object?> get props => [itemId, quantity];
}

/// Add custom checklist item
final class AuditAddChecklistItemRequested extends AuditEvent {
  final String label;
  final ChecklistCategory category;

  const AuditAddChecklistItemRequested({
    required this.label,
    required this.category,
  });

  @override
  List<Object?> get props => [label, category];
}

/// Take photo
final class AuditTakePhotoRequested extends AuditEvent {
  const AuditTakePhotoRequested();
}

/// Pick photo from gallery
final class AuditPickPhotoRequested extends AuditEvent {
  const AuditPickPhotoRequested();
}

/// Photo captured
final class AuditPhotoCaptured extends AuditEvent {
  final String localPath;
  final String? caption;

  const AuditPhotoCaptured({
    required this.localPath,
    this.caption,
  });

  @override
  List<Object?> get props => [localPath, caption];
}

/// Delete photo
final class AuditDeletePhotoRequested extends AuditEvent {
  final String photoId;

  const AuditDeletePhotoRequested(this.photoId);

  @override
  List<Object?> get props => [photoId];
}

/// Update room notes
final class AuditUpdateNotesRequested extends AuditEvent {
  final String notes;

  const AuditUpdateNotesRequested(this.notes);

  @override
  List<Object?> get props => [notes];
}
