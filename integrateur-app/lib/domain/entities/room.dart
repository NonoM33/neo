import 'package:equatable/equatable.dart';
import 'checklist_item.dart';

/// Room type enum
enum RoomType {
  salon,
  chambre,
  cuisine,
  salleDeBain,
  bureau,
  entree,
  couloir,
  garage,
  jardin,
  terrasse,
  cave,
  buanderie,
  autre;

  String get displayName {
    switch (this) {
      case RoomType.salon:
        return 'Salon';
      case RoomType.chambre:
        return 'Chambre';
      case RoomType.cuisine:
        return 'Cuisine';
      case RoomType.salleDeBain:
        return 'Salle de bain';
      case RoomType.bureau:
        return 'Bureau';
      case RoomType.entree:
        return 'Entrée';
      case RoomType.couloir:
        return 'Couloir';
      case RoomType.garage:
        return 'Garage';
      case RoomType.jardin:
        return 'Jardin';
      case RoomType.terrasse:
        return 'Terrasse';
      case RoomType.cave:
        return 'Cave';
      case RoomType.buanderie:
        return 'Buanderie';
      case RoomType.autre:
        return 'Autre';
    }
  }

  String get icon {
    switch (this) {
      case RoomType.salon:
        return 'living';
      case RoomType.chambre:
        return 'bed';
      case RoomType.cuisine:
        return 'kitchen';
      case RoomType.salleDeBain:
        return 'bathroom';
      case RoomType.bureau:
        return 'desk';
      case RoomType.entree:
        return 'door_front';
      case RoomType.couloir:
        return 'meeting_room';
      case RoomType.garage:
        return 'garage';
      case RoomType.jardin:
        return 'yard';
      case RoomType.terrasse:
        return 'deck';
      case RoomType.cave:
        return 'foundation';
      case RoomType.buanderie:
        return 'local_laundry_service';
      case RoomType.autre:
        return 'room';
    }
  }

  static RoomType fromString(String value) {
    return RoomType.values.firstWhere(
      (type) => type.name == value.toLowerCase(),
      orElse: () => RoomType.autre,
    );
  }
}

/// Photo entity
class RoomPhoto extends Equatable {
  final String id;
  final String localPath;
  final String? remoteUrl;
  final String? caption;
  final DateTime createdAt;
  final bool isSynced;

  const RoomPhoto({
    required this.id,
    required this.localPath,
    this.remoteUrl,
    this.caption,
    required this.createdAt,
    this.isSynced = false,
  });

  String get displayUrl => remoteUrl ?? localPath;

  RoomPhoto copyWith({
    String? id,
    String? localPath,
    String? remoteUrl,
    String? caption,
    DateTime? createdAt,
    bool? isSynced,
  }) {
    return RoomPhoto(
      id: id ?? this.id,
      localPath: localPath ?? this.localPath,
      remoteUrl: remoteUrl ?? this.remoteUrl,
      caption: caption ?? this.caption,
      createdAt: createdAt ?? this.createdAt,
      isSynced: isSynced ?? this.isSynced,
    );
  }

  @override
  List<Object?> get props => [
        id,
        localPath,
        remoteUrl,
        caption,
        createdAt,
        isSynced,
      ];
}

/// Room entity
class Room extends Equatable {
  final String id;
  final String projectId;
  final String name;
  final RoomType type;
  final double? surfaceM2;
  final List<RoomPhoto> photos;
  final List<ChecklistItem> checklist;
  final String? notes;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Room({
    required this.id,
    required this.projectId,
    required this.name,
    required this.type,
    this.surfaceM2,
    this.photos = const [],
    this.checklist = const [],
    this.notes,
    required this.createdAt,
    this.updatedAt,
  });

  /// Get display name (custom name or type name)
  String get displayName => name.isNotEmpty ? name : type.displayName;

  /// Get number of photos
  int get photoCount => photos.length;

  /// Get number of checked items
  int get checkedItemsCount =>
      checklist.where((item) => item.isChecked).length;

  /// Get checklist completion percentage
  double get checklistProgress {
    if (checklist.isEmpty) return 0;
    return checkedItemsCount / checklist.length;
  }

  /// Get items by category
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
    double? surfaceM2,
    List<RoomPhoto>? photos,
    List<ChecklistItem>? checklist,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Room(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      name: name ?? this.name,
      type: type ?? this.type,
      surfaceM2: surfaceM2 ?? this.surfaceM2,
      photos: photos ?? this.photos,
      checklist: checklist ?? this.checklist,
      notes: notes ?? this.notes,
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
        surfaceM2,
        photos,
        checklist,
        notes,
        createdAt,
        updatedAt,
      ];
}
