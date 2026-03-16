import '../../domain/entities/room.dart';
import '../../domain/entities/checklist_item.dart';

/// Room photo model
class RoomPhotoModel extends RoomPhoto {
  const RoomPhotoModel({
    required super.id,
    required super.localPath,
    super.remoteUrl,
    super.caption,
    required super.createdAt,
    super.isSynced,
  });

  factory RoomPhotoModel.fromJson(Map<String, dynamic> json) {
    return RoomPhotoModel(
      id: json['id'] as String,
      localPath: json['local_path'] as String? ?? json['localPath'] as String? ?? '',
      remoteUrl: json['remote_url'] as String? ?? json['remoteUrl'] as String?,
      caption: json['caption'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String? ??
          json['createdAt'] as String? ??
          DateTime.now().toIso8601String()),
      isSynced: json['is_synced'] as bool? ?? json['isSynced'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'local_path': localPath,
      'remote_url': remoteUrl,
      'caption': caption,
      'created_at': createdAt.toIso8601String(),
      'is_synced': isSynced,
    };
  }

  factory RoomPhotoModel.fromEntity(RoomPhoto photo) {
    return RoomPhotoModel(
      id: photo.id,
      localPath: photo.localPath,
      remoteUrl: photo.remoteUrl,
      caption: photo.caption,
      createdAt: photo.createdAt,
      isSynced: photo.isSynced,
    );
  }
}

/// Checklist item model
class ChecklistItemModel extends ChecklistItem {
  const ChecklistItemModel({
    required super.id,
    required super.label,
    required super.category,
    super.isChecked,
    super.quantity,
    super.notes,
    super.productId,
  });

  factory ChecklistItemModel.fromJson(Map<String, dynamic> json) {
    return ChecklistItemModel(
      id: json['id'] as String,
      label: json['label'] as String,
      category: ChecklistCategory.fromString(
          json['category'] as String? ?? 'autre'),
      isChecked: json['is_checked'] as bool? ?? json['isChecked'] as bool? ?? false,
      quantity: json['quantity'] as int?,
      notes: json['notes'] as String?,
      productId: json['product_id'] as String? ?? json['productId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'category': category.name,
      'is_checked': isChecked,
      'quantity': quantity,
      'notes': notes,
      'product_id': productId,
    };
  }

  factory ChecklistItemModel.fromEntity(ChecklistItem item) {
    return ChecklistItemModel(
      id: item.id,
      label: item.label,
      category: item.category,
      isChecked: item.isChecked,
      quantity: item.quantity,
      notes: item.notes,
      productId: item.productId,
    );
  }
}

/// Room model for JSON serialization
class RoomModel extends Room {
  const RoomModel({
    required super.id,
    required super.projectId,
    required super.name,
    required super.type,
    super.surfaceM2,
    super.photos,
    super.checklist,
    super.notes,
    required super.createdAt,
    super.updatedAt,
  });

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    return RoomModel(
      id: json['id'] as String,
      projectId: json['project_id'] as String? ?? json['projectId'] as String? ?? '',
      name: json['name'] as String? ?? json['nom'] as String? ?? '',
      type: RoomType.fromString(json['type'] as String? ?? 'autre'),
      surfaceM2: (json['surface_m2'] as num?)?.toDouble() ??
          (json['surfaceM2'] as num?)?.toDouble(),
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => RoomPhotoModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      checklist: (json['checklist'] as List<dynamic>?)
              ?.map((e) => ChecklistItemModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String? ??
          json['createdAt'] as String? ??
          DateTime.now().toIso8601String()),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : json['updatedAt'] != null
              ? DateTime.parse(json['updatedAt'] as String)
              : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'name': name,
      'type': type.name,
      'surface_m2': surfaceM2,
      'photos': photos.map((p) => RoomPhotoModel.fromEntity(p).toJson()).toList(),
      'checklist': checklist.map((c) => ChecklistItemModel.fromEntity(c).toJson()).toList(),
      'notes': notes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  factory RoomModel.fromEntity(Room room) {
    return RoomModel(
      id: room.id,
      projectId: room.projectId,
      name: room.name,
      type: room.type,
      surfaceM2: room.surfaceM2,
      photos: room.photos,
      checklist: room.checklist,
      notes: room.notes,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    );
  }
}
