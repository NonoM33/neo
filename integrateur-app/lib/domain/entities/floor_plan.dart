import 'dart:ui' show Offset;

import 'package:equatable/equatable.dart';

// ─── Enums ────────────────────────────────────────────────────────────

enum WallType {
  exterior,
  interior,
  loadBearing;

  String get displayName {
    switch (this) {
      case WallType.exterior:
        return 'Extérieur';
      case WallType.interior:
        return 'Intérieur';
      case WallType.loadBearing:
        return 'Porteur';
    }
  }

  static WallType fromString(String value) {
    return WallType.values.firstWhere(
      (t) => t.name == value,
      orElse: () => WallType.interior,
    );
  }
}

enum OpeningType {
  door,
  window,
  frenchDoor,
  slidingDoor,
  garageOpening;

  String get displayName {
    switch (this) {
      case OpeningType.door:
        return 'Porte';
      case OpeningType.window:
        return 'Fenêtre';
      case OpeningType.frenchDoor:
        return 'Porte-fenêtre';
      case OpeningType.slidingDoor:
        return 'Baie vitrée';
      case OpeningType.garageOpening:
        return 'Porte garage';
    }
  }

  static OpeningType fromString(String value) {
    return OpeningType.values.firstWhere(
      (t) => t.name == value,
      orElse: () => OpeningType.door,
    );
  }
}

enum OpeningSide {
  left,
  right,
  sliding,
  none;

  static OpeningSide fromString(String value) {
    return OpeningSide.values.firstWhere(
      (s) => s.name == value,
      orElse: () => OpeningSide.left,
    );
  }
}

enum EquipmentPlacementStatus {
  planned,
  ordered,
  installed,
  configured,
  issue;

  String get displayName {
    switch (this) {
      case EquipmentPlacementStatus.planned:
        return 'Planifié';
      case EquipmentPlacementStatus.ordered:
        return 'Commandé';
      case EquipmentPlacementStatus.installed:
        return 'Installé';
      case EquipmentPlacementStatus.configured:
        return 'Configuré';
      case EquipmentPlacementStatus.issue:
        return 'Problème';
    }
  }

  static EquipmentPlacementStatus fromString(String value) {
    return EquipmentPlacementStatus.values.firstWhere(
      (s) => s.name == value,
      orElse: () => EquipmentPlacementStatus.planned,
    );
  }
}

enum AnnotationType {
  note,
  measurement,
  warning,
  label;

  String get displayName {
    switch (this) {
      case AnnotationType.note:
        return 'Note';
      case AnnotationType.measurement:
        return 'Mesure';
      case AnnotationType.warning:
        return 'Avertissement';
      case AnnotationType.label:
        return 'Étiquette';
    }
  }

  static AnnotationType fromString(String value) {
    return AnnotationType.values.firstWhere(
      (t) => t.name == value,
      orElse: () => AnnotationType.note,
    );
  }
}

enum PlanTool {
  select,
  wall,
  door,
  window,
  equipment,
  annotation,
  measurement,
  eraser,
}

enum PlanViewMode {
  edit,
  audit,
  integration,
}

// ─── Entities ─────────────────────────────────────────────────────────

/// A wall segment defined by two endpoints in meters
class PlanWall extends Equatable {
  final String id;
  final Offset startPoint;
  final Offset endPoint;
  final double thickness;
  final WallType type;

  const PlanWall({
    required this.id,
    required this.startPoint,
    required this.endPoint,
    this.thickness = 0.15,
    this.type = WallType.interior,
  });

  double get lengthMeters => (endPoint - startPoint).distance;

  PlanWall copyWith({
    String? id,
    Offset? startPoint,
    Offset? endPoint,
    double? thickness,
    WallType? type,
  }) {
    return PlanWall(
      id: id ?? this.id,
      startPoint: startPoint ?? this.startPoint,
      endPoint: endPoint ?? this.endPoint,
      thickness: thickness ?? this.thickness,
      type: type ?? this.type,
    );
  }

  @override
  List<Object?> get props => [id, startPoint, endPoint, thickness, type];
}

/// An opening (door/window) positioned on a wall
class PlanOpening extends Equatable {
  final String id;
  final String wallId;
  final OpeningType type;
  final double offsetOnWall; // distance from wall start in meters
  final double widthMeters;
  final double? heightMeters;
  final OpeningSide openingSide;

  const PlanOpening({
    required this.id,
    required this.wallId,
    required this.type,
    required this.offsetOnWall,
    this.widthMeters = 0.9,
    this.heightMeters,
    this.openingSide = OpeningSide.left,
  });

  PlanOpening copyWith({
    String? id,
    String? wallId,
    OpeningType? type,
    double? offsetOnWall,
    double? widthMeters,
    double? heightMeters,
    OpeningSide? openingSide,
  }) {
    return PlanOpening(
      id: id ?? this.id,
      wallId: wallId ?? this.wallId,
      type: type ?? this.type,
      offsetOnWall: offsetOnWall ?? this.offsetOnWall,
      widthMeters: widthMeters ?? this.widthMeters,
      heightMeters: heightMeters ?? this.heightMeters,
      openingSide: openingSide ?? this.openingSide,
    );
  }

  @override
  List<Object?> get props =>
      [id, wallId, type, offsetOnWall, widthMeters, heightMeters, openingSide];
}

/// Equipment placed on a floor plan, linked to a product
class PlanEquipment extends Equatable {
  final String id;
  final String productId;
  final String? deviceId;
  final Offset position; // meters from plan origin
  final double rotation; // radians
  final int quantity;
  final String? label;
  final String? notes;
  final EquipmentPlacementStatus status;

  const PlanEquipment({
    required this.id,
    required this.productId,
    this.deviceId,
    required this.position,
    this.rotation = 0,
    this.quantity = 1,
    this.label,
    this.notes,
    this.status = EquipmentPlacementStatus.planned,
  });

  PlanEquipment copyWith({
    String? id,
    String? productId,
    String? deviceId,
    bool clearDeviceId = false,
    Offset? position,
    double? rotation,
    int? quantity,
    String? label,
    String? notes,
    EquipmentPlacementStatus? status,
  }) {
    return PlanEquipment(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      deviceId: clearDeviceId ? null : (deviceId ?? this.deviceId),
      position: position ?? this.position,
      rotation: rotation ?? this.rotation,
      quantity: quantity ?? this.quantity,
      label: label ?? this.label,
      notes: notes ?? this.notes,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props =>
      [id, productId, deviceId, position, rotation, quantity, label, notes, status];
}

/// A text annotation on the floor plan
class PlanAnnotation extends Equatable {
  final String id;
  final Offset position;
  final AnnotationType type;
  final String text;
  final int? colorValue; // ARGB int
  final Offset? endPosition; // for measurement lines

  const PlanAnnotation({
    required this.id,
    required this.position,
    required this.type,
    required this.text,
    this.colorValue,
    this.endPosition,
  });

  /// For measurement annotations, the length in meters
  double? get measurementLength {
    if (endPosition == null) return null;
    return (endPosition! - position).distance;
  }

  PlanAnnotation copyWith({
    String? id,
    Offset? position,
    AnnotationType? type,
    String? text,
    int? colorValue,
    Offset? endPosition,
  }) {
    return PlanAnnotation(
      id: id ?? this.id,
      position: position ?? this.position,
      type: type ?? this.type,
      text: text ?? this.text,
      colorValue: colorValue ?? this.colorValue,
      endPosition: endPosition ?? this.endPosition,
    );
  }

  @override
  List<Object?> get props => [id, position, type, text, colorValue, endPosition];
}

/// The complete floor plan for a room
class FloorPlan extends Equatable {
  final String id;
  final String roomId;
  final String projectId;
  final double widthMeters;
  final double heightMeters;
  final double pixelsPerMeter;
  final List<PlanWall> walls;
  final List<PlanOpening> openings;
  final List<PlanEquipment> equipment;
  final List<PlanAnnotation> annotations;
  final int version;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const FloorPlan({
    required this.id,
    required this.roomId,
    required this.projectId,
    this.widthMeters = 10,
    this.heightMeters = 8,
    this.pixelsPerMeter = 100,
    this.walls = const [],
    this.openings = const [],
    this.equipment = const [],
    this.annotations = const [],
    this.version = 1,
    required this.createdAt,
    this.updatedAt,
  });

  int get equipmentCount => equipment.fold(0, (sum, e) => sum + e.quantity);

  FloorPlan copyWith({
    String? id,
    String? roomId,
    String? projectId,
    double? widthMeters,
    double? heightMeters,
    double? pixelsPerMeter,
    List<PlanWall>? walls,
    List<PlanOpening>? openings,
    List<PlanEquipment>? equipment,
    List<PlanAnnotation>? annotations,
    int? version,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FloorPlan(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      projectId: projectId ?? this.projectId,
      widthMeters: widthMeters ?? this.widthMeters,
      heightMeters: heightMeters ?? this.heightMeters,
      pixelsPerMeter: pixelsPerMeter ?? this.pixelsPerMeter,
      walls: walls ?? this.walls,
      openings: openings ?? this.openings,
      equipment: equipment ?? this.equipment,
      annotations: annotations ?? this.annotations,
      version: version ?? this.version,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id, roomId, projectId, widthMeters, heightMeters, pixelsPerMeter,
        walls, openings, equipment, annotations, version, createdAt, updatedAt,
      ];
}
