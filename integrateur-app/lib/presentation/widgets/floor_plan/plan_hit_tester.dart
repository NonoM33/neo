import 'dart:ui' show Offset;

import '../../../domain/entities/floor_plan.dart';
import '../../blocs/floor_plan/floor_plan_event.dart' show ElementType;

/// Result of a hit test on the floor plan
class HitTestResult {
  final String elementId;
  final ElementType elementType;

  const HitTestResult({required this.elementId, required this.elementType});
}

/// Performs hit testing on floor plan elements using plan coordinates (meters)
class PlanHitTester {
  static const double _wallHitDistance = 0.2; // meters
  static const double _equipmentHitRadius = 0.3; // meters
  static const double _annotationHitRadius = 0.3; // meters

  /// Hit test at [planPoint] (in meters). Returns the topmost hit element.
  /// Priority: equipment > annotations > walls (front-to-back)
  static HitTestResult? hitTest(FloorPlan plan, Offset planPoint) {
    // 1. Equipment (frontmost)
    for (final eq in plan.equipment.reversed) {
      final dist = (eq.position - planPoint).distance;
      if (dist <= _equipmentHitRadius) {
        return HitTestResult(
          elementId: eq.id,
          elementType: ElementType.equipment,
        );
      }
    }

    // 2. Annotations
    for (final ann in plan.annotations.reversed) {
      final dist = (ann.position - planPoint).distance;
      if (dist <= _annotationHitRadius) {
        return HitTestResult(
          elementId: ann.id,
          elementType: ElementType.annotation,
        );
      }
    }

    // 3. Walls
    for (final wall in plan.walls.reversed) {
      final dist = _pointToSegmentDistance(
        planPoint,
        wall.startPoint,
        wall.endPoint,
      );
      if (dist <= _wallHitDistance) {
        return HitTestResult(
          elementId: wall.id,
          elementType: ElementType.wall,
        );
      }
    }

    return null;
  }

  /// Find the nearest wall to [planPoint] and return the offset along that wall
  static ({String wallId, double offset})? findNearestWall(
    FloorPlan plan,
    Offset planPoint, {
    double maxDistance = 0.5,
  }) {
    String? nearestWallId;
    double nearestDist = double.infinity;
    double nearestOffset = 0;

    for (final wall in plan.walls) {
      final dist = _pointToSegmentDistance(
        planPoint,
        wall.startPoint,
        wall.endPoint,
      );
      if (dist < nearestDist && dist <= maxDistance) {
        nearestDist = dist;
        nearestWallId = wall.id;
        nearestOffset = _projectionOnSegment(
          planPoint,
          wall.startPoint,
          wall.endPoint,
        );
      }
    }

    if (nearestWallId == null) return null;
    return (wallId: nearestWallId, offset: nearestOffset);
  }

  /// Snap [point] to nearest grid intersection or existing wall endpoint
  static Offset snapToGrid(
    Offset point, {
    double gridSize = 0.25,
    List<Offset> snapPoints = const [],
    double snapRadius = 0.2,
  }) {
    // First check snap points (wall endpoints)
    for (final sp in snapPoints) {
      if ((sp - point).distance <= snapRadius) {
        return sp;
      }
    }

    // Snap to grid
    return Offset(
      (point.dx / gridSize).round() * gridSize,
      (point.dy / gridSize).round() * gridSize,
    );
  }

  /// Get all wall endpoints for snapping
  static List<Offset> getWallEndpoints(FloorPlan plan) {
    final points = <Offset>[];
    for (final wall in plan.walls) {
      points.add(wall.startPoint);
      points.add(wall.endPoint);
    }
    return points;
  }

  // ─── Geometry helpers ─────────────────────────────────────────

  /// Distance from point P to segment AB
  static double _pointToSegmentDistance(Offset p, Offset a, Offset b) {
    final ab = b - a;
    final ap = p - a;
    final lenSq = ab.dx * ab.dx + ab.dy * ab.dy;

    if (lenSq == 0) return (p - a).distance;

    var t = (ap.dx * ab.dx + ap.dy * ab.dy) / lenSq;
    t = t.clamp(0.0, 1.0);

    final proj = Offset(a.dx + t * ab.dx, a.dy + t * ab.dy);
    return (p - proj).distance;
  }

  /// Project point P onto segment AB, return distance from A along AB
  static double _projectionOnSegment(Offset p, Offset a, Offset b) {
    final ab = b - a;
    final ap = p - a;
    final lenSq = ab.dx * ab.dx + ab.dy * ab.dy;

    if (lenSq == 0) return 0;

    var t = (ap.dx * ab.dx + ap.dy * ab.dy) / lenSq;
    t = t.clamp(0.0, 1.0);

    return t * (b - a).distance;
  }
}
