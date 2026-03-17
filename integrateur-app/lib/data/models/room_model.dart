import '../../domain/entities/room.dart';
import '../../domain/entities/checklist_item.dart';

/// Room photo model - matches backend photos table
class RoomPhotoModel extends RoomPhoto {
  const RoomPhotoModel({
    required super.id,
    required super.roomId,
    required super.filename,
    required super.url,
    super.caption,
    required super.createdAt,
  });

  factory RoomPhotoModel.fromJson(Map<String, dynamic> json) {
    return RoomPhotoModel(
      id: json['id'] as String,
      roomId: json['roomId'] as String? ?? '',
      filename: json['filename'] as String? ?? '',
      url: json['url'] as String? ?? '',
      caption: json['caption'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'roomId': roomId,
      'filename': filename,
      'url': url,
      'caption': caption,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory RoomPhotoModel.fromEntity(RoomPhoto photo) {
    return RoomPhotoModel(
      id: photo.id,
      roomId: photo.roomId,
      filename: photo.filename,
      url: photo.url,
      caption: photo.caption,
      createdAt: photo.createdAt,
    );
  }
}

/// Checklist item model - matches backend checklist_items table
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
      isChecked: json['checked'] as bool? ?? false,
      quantity: json['quantity'] as int?,
      notes: json['notes'] as String?,
      productId: json['productId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'category': category.name,
      'checked': isChecked,
      if (notes != null) 'notes': notes,
    };
  }

  /// For create request
  Map<String, dynamic> toCreateJson() {
    return {
      'category': category.name,
      'label': label,
      'checked': isChecked,
      if (notes != null) 'notes': notes,
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

/// Room model - matches backend rooms table
class RoomModel extends Room {
  const RoomModel({
    required super.id,
    required super.projectId,
    required super.name,
    required super.type,
    super.floor,
    super.notes,
    super.photos,
    super.checklist,
    required super.createdAt,
    super.updatedAt,
  });

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    return RoomModel(
      id: json['id'] as String,
      projectId: json['projectId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: RoomType.fromString(json['type'] as String? ?? 'autre'),
      floor: json['floor'] as int? ?? 0,
      notes: json['notes'] as String?,
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => RoomPhotoModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      checklist: (json['checklistItems'] as List<dynamic>?)
              ?.map((e) => ChecklistItemModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'projectId': projectId,
      'name': name,
      'type': type.apiValue,
      'floor': floor,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  /// For create request
  Map<String, dynamic> toCreateJson() {
    return {
      'name': name,
      'type': type.apiValue,
      'floor': floor,
      if (notes != null) 'notes': notes,
    };
  }

  /// For update request
  Map<String, dynamic> toUpdateJson() {
    return {
      'name': name,
      'type': type.apiValue,
      'floor': floor,
      'notes': notes,
    };
  }

  factory RoomModel.fromEntity(Room room) {
    return RoomModel(
      id: room.id,
      projectId: room.projectId,
      name: room.name,
      type: room.type,
      floor: room.floor,
      notes: room.notes,
      photos: room.photos,
      checklist: room.checklist,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    );
  }
}
