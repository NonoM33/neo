import 'dart:ui' show Offset;

import '../../domain/entities/floor_plan.dart';

// ─── Helper ───────────────────────────────────────────────────────────

Offset _offsetFromJson(Map<String, dynamic> json) {
  return Offset(
    (json['x'] as num).toDouble(),
    (json['y'] as num).toDouble(),
  );
}

Map<String, dynamic> _offsetToJson(Offset offset) {
  return {'x': offset.dx, 'y': offset.dy};
}

// ─── Wall Model ───────────────────────────────────────────────────────

class PlanWallModel extends PlanWall {
  const PlanWallModel({
    required super.id,
    required super.startPoint,
    required super.endPoint,
    super.thickness,
    super.type,
  });

  factory PlanWallModel.fromJson(Map<String, dynamic> json) {
    return PlanWallModel(
      id: json['id'] as String,
      startPoint: _offsetFromJson(json['startPoint'] as Map<String, dynamic>),
      endPoint: _offsetFromJson(json['endPoint'] as Map<String, dynamic>),
      thickness: (json['thickness'] as num?)?.toDouble() ?? 0.15,
      type: WallType.fromString(json['type'] as String? ?? 'interior'),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'startPoint': _offsetToJson(startPoint),
      'endPoint': _offsetToJson(endPoint),
      'thickness': thickness,
      'type': type.name,
    };
  }

  factory PlanWallModel.fromEntity(PlanWall wall) {
    return PlanWallModel(
      id: wall.id,
      startPoint: wall.startPoint,
      endPoint: wall.endPoint,
      thickness: wall.thickness,
      type: wall.type,
    );
  }
}

// ─── Opening Model ────────────────────────────────────────────────────

class PlanOpeningModel extends PlanOpening {
  const PlanOpeningModel({
    required super.id,
    required super.wallId,
    required super.type,
    required super.offsetOnWall,
    super.widthMeters,
    super.heightMeters,
    super.openingSide,
  });

  factory PlanOpeningModel.fromJson(Map<String, dynamic> json) {
    return PlanOpeningModel(
      id: json['id'] as String,
      wallId: json['wallId'] as String,
      type: OpeningType.fromString(json['type'] as String? ?? 'door'),
      offsetOnWall: (json['offsetOnWall'] as num).toDouble(),
      widthMeters: (json['widthMeters'] as num?)?.toDouble() ?? 0.9,
      heightMeters: (json['heightMeters'] as num?)?.toDouble(),
      openingSide:
          OpeningSide.fromString(json['openingSide'] as String? ?? 'left'),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'wallId': wallId,
      'type': type.name,
      'offsetOnWall': offsetOnWall,
      'widthMeters': widthMeters,
      if (heightMeters != null) 'heightMeters': heightMeters,
      'openingSide': openingSide.name,
    };
  }

  factory PlanOpeningModel.fromEntity(PlanOpening opening) {
    return PlanOpeningModel(
      id: opening.id,
      wallId: opening.wallId,
      type: opening.type,
      offsetOnWall: opening.offsetOnWall,
      widthMeters: opening.widthMeters,
      heightMeters: opening.heightMeters,
      openingSide: opening.openingSide,
    );
  }
}

// ─── Equipment Model ──────────────────────────────────────────────────

class PlanEquipmentModel extends PlanEquipment {
  const PlanEquipmentModel({
    required super.id,
    required super.productId,
    super.deviceId,
    required super.position,
    super.rotation,
    super.quantity,
    super.label,
    super.notes,
    super.status,
  });

  factory PlanEquipmentModel.fromJson(Map<String, dynamic> json) {
    return PlanEquipmentModel(
      id: json['id'] as String,
      productId: json['productId'] as String,
      deviceId: json['deviceId'] as String?,
      position: _offsetFromJson(json['position'] as Map<String, dynamic>),
      rotation: (json['rotation'] as num?)?.toDouble() ?? 0,
      quantity: json['quantity'] as int? ?? 1,
      label: json['label'] as String?,
      notes: json['notes'] as String?,
      status: EquipmentPlacementStatus.fromString(
          json['status'] as String? ?? 'planned'),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      if (deviceId != null) 'deviceId': deviceId,
      'position': _offsetToJson(position),
      'rotation': rotation,
      'quantity': quantity,
      if (label != null) 'label': label,
      if (notes != null) 'notes': notes,
      'status': status.name,
    };
  }

  factory PlanEquipmentModel.fromEntity(PlanEquipment eq) {
    return PlanEquipmentModel(
      id: eq.id,
      productId: eq.productId,
      deviceId: eq.deviceId,
      position: eq.position,
      rotation: eq.rotation,
      quantity: eq.quantity,
      label: eq.label,
      notes: eq.notes,
      status: eq.status,
    );
  }
}

// ─── Annotation Model ─────────────────────────────────────────────────

class PlanAnnotationModel extends PlanAnnotation {
  const PlanAnnotationModel({
    required super.id,
    required super.position,
    required super.type,
    required super.text,
    super.colorValue,
    super.endPosition,
  });

  factory PlanAnnotationModel.fromJson(Map<String, dynamic> json) {
    return PlanAnnotationModel(
      id: json['id'] as String,
      position: _offsetFromJson(json['position'] as Map<String, dynamic>),
      type: AnnotationType.fromString(json['type'] as String? ?? 'note'),
      text: json['text'] as String? ?? '',
      colorValue: json['colorValue'] as int?,
      endPosition: json['endPosition'] != null
          ? _offsetFromJson(json['endPosition'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'position': _offsetToJson(position),
      'type': type.name,
      'text': text,
      if (colorValue != null) 'colorValue': colorValue,
      if (endPosition != null) 'endPosition': _offsetToJson(endPosition!),
    };
  }

  factory PlanAnnotationModel.fromEntity(PlanAnnotation annotation) {
    return PlanAnnotationModel(
      id: annotation.id,
      position: annotation.position,
      type: annotation.type,
      text: annotation.text,
      colorValue: annotation.colorValue,
      endPosition: annotation.endPosition,
    );
  }
}

// ─── FloorPlan Model ──────────────────────────────────────────────────

class FloorPlanModel extends FloorPlan {
  const FloorPlanModel({
    required super.id,
    required super.roomId,
    required super.projectId,
    super.widthMeters,
    super.heightMeters,
    super.pixelsPerMeter,
    super.walls,
    super.openings,
    super.equipment,
    super.annotations,
    super.version,
    required super.createdAt,
    super.updatedAt,
  });

  factory FloorPlanModel.fromJson(Map<String, dynamic> json) {
    return FloorPlanModel(
      id: json['id'] as String,
      roomId: json['roomId'] as String,
      projectId: json['projectId'] as String? ?? '',
      widthMeters: (json['widthMeters'] as num?)?.toDouble() ?? 10,
      heightMeters: (json['heightMeters'] as num?)?.toDouble() ?? 8,
      pixelsPerMeter: (json['pixelsPerMeter'] as num?)?.toDouble() ?? 100,
      walls: (json['walls'] as List<dynamic>?)
              ?.map((e) => PlanWallModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      openings: (json['openings'] as List<dynamic>?)
              ?.map(
                  (e) => PlanOpeningModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      equipment: (json['equipment'] as List<dynamic>?)
              ?.map((e) =>
                  PlanEquipmentModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      annotations: (json['annotations'] as List<dynamic>?)
              ?.map((e) =>
                  PlanAnnotationModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      version: json['version'] as int? ?? 1,
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
      'roomId': roomId,
      'projectId': projectId,
      'widthMeters': widthMeters,
      'heightMeters': heightMeters,
      'pixelsPerMeter': pixelsPerMeter,
      'walls': walls.map((w) => PlanWallModel.fromEntity(w).toJson()).toList(),
      'openings':
          openings.map((o) => PlanOpeningModel.fromEntity(o).toJson()).toList(),
      'equipment': equipment
          .map((e) => PlanEquipmentModel.fromEntity(e).toJson())
          .toList(),
      'annotations': annotations
          .map((a) => PlanAnnotationModel.fromEntity(a).toJson())
          .toList(),
      'version': version,
      'createdAt': createdAt.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  factory FloorPlanModel.fromEntity(FloorPlan plan) {
    return FloorPlanModel(
      id: plan.id,
      roomId: plan.roomId,
      projectId: plan.projectId,
      widthMeters: plan.widthMeters,
      heightMeters: plan.heightMeters,
      pixelsPerMeter: plan.pixelsPerMeter,
      walls: plan.walls,
      openings: plan.openings,
      equipment: plan.equipment,
      annotations: plan.annotations,
      version: plan.version,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    );
  }
}
