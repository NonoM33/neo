import 'package:equatable/equatable.dart';

import 'checklist_item.dart';

/// Room type enum matching backend: salon, cuisine, chambre, salle_de_bain, bureau, garage, exterieur, autre
enum RoomType {
  salon,
  cuisine,
  chambre,
  salleDeBain,
  bureau,
  garage,
  exterieur,
  autre;

  String get displayName {
    switch (this) {
      case RoomType.salon:
        return 'Salon';
      case RoomType.cuisine:
        return 'Cuisine';
      case RoomType.chambre:
        return 'Chambre';
      case RoomType.salleDeBain:
        return 'Salle de bain';
      case RoomType.bureau:
        return 'Bureau';
      case RoomType.garage:
        return 'Garage';
      case RoomType.exterieur:
        return 'Extérieur';
      case RoomType.autre:
        return 'Autre';
    }
  }

  String get apiValue {
    switch (this) {
      case RoomType.salleDeBain:
        return 'salle_de_bain';
      default:
        return name;
    }
  }

  static RoomType fromString(String value) {
    if (value == 'salle_de_bain') return RoomType.salleDeBain;
    return RoomType.values.firstWhere(
      (type) => type.name == value.toLowerCase(),
      orElse: () => RoomType.autre,
    );
  }
}

/// Photo entity matching backend photos table
class RoomPhoto extends Equatable {
  final String id;
  final String roomId;
  final String filename;
  final String url;
  final String? caption;
  final DateTime createdAt;

  const RoomPhoto({
    required this.id,
    required this.roomId,
    required this.filename,
    required this.url,
    this.caption,
    required this.createdAt,
  });

  RoomPhoto copyWith({
    String? id,
    String? roomId,
    String? filename,
    String? url,
    String? caption,
    DateTime? createdAt,
  }) {
    return RoomPhoto(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      filename: filename ?? this.filename,
      url: url ?? this.url,
      caption: caption ?? this.caption,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [id, roomId, filename, url, caption, createdAt];
}

/// Room entity matching backend rooms table
class Room extends Equatable {
  final String id;
  final String projectId;
  final String name;
  final RoomType type;
  final int floor;
  final String? notes;
  final List<RoomPhoto> photos;
  final List<ChecklistItem> checklist;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Room({
    required this.id,
    required this.projectId,
    required this.name,
    required this.type,
    this.floor = 0,
    this.notes,
    this.photos = const [],
    this.checklist = const [],
    required this.createdAt,
    this.updatedAt,
  });

  String get displayName => name.isNotEmpty ? name : type.displayName;

  int get photoCount => photos.length;

  int get checkedItemsCount =>
      checklist.where((item) => item.isChecked).length;

  double get checklistProgress {
    if (checklist.isEmpty) return 0;
    return checkedItemsCount / checklist.length;
  }

  Map<ChecklistCategory, List<ChecklistItem>> get itemsByCategory {
    final map = <ChecklistCategory, List<ChecklistItem>>{};
    for (final item in checklist) {
      map.putIfAbsent(item.category, () => []).add(item);
    }
    return map;
  }

  Room copyWith({
    String? id,
    String? projectId,
    String? name,
    RoomType? type,
    int? floor,
    String? notes,
    List<RoomPhoto>? photos,
    List<ChecklistItem>? checklist,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Room(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      name: name ?? this.name,
      type: type ?? this.type,
      floor: floor ?? this.floor,
      notes: notes ?? this.notes,
      photos: photos ?? this.photos,
      checklist: checklist ?? this.checklist,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        projectId,
        name,
        type,
        floor,
        notes,
        photos,
        checklist,
        createdAt,
        updatedAt,
      ];
}
