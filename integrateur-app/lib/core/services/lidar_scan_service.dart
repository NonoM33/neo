import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' show Offset;

import 'package:flutter_roomplan/flutter_roomplan.dart';
import 'package:uuid/uuid.dart';

import '../../domain/entities/floor_plan.dart';

const _uuid = Uuid();

/// Service to scan rooms with LiDAR (Apple RoomPlan) and convert to FloorPlan
class LidarScanService {
  final FlutterRoomplan _roomplan = FlutterRoomplan();
  Completer<String?>? _scanCompleter;

  /// Check if the current device supports LiDAR scanning
  Future<bool> isSupported() async {
    try {
      return await _roomplan.isSupported();
    } catch (_) {
      return false;
    }
  }

  /// Check if multi-room scanning is supported (iOS 17+)
  Future<bool> isMultiRoomSupported() async {
    try {
      return await _roomplan.isMultiRoomSupported();
    } catch (_) {
      return false;
    }
  }

  /// Start a LiDAR room scan. Returns JSON file path when scan completes.
  /// The RoomPlan native UI is presented automatically by the plugin.
  Future<String?> startScanAndWait() async {
    _scanCompleter = Completer<String?>();

    _roomplan.onRoomCaptureFinished(() async {
      final jsonPath = await _roomplan.getJsonFilePath();
      if (_scanCompleter != null && !_scanCompleter!.isCompleted) {
        _scanCompleter!.complete(jsonPath);
      }
    });

    await _roomplan.startScan();
    return _scanCompleter!.future;
  }

  /// Parse the RoomPlan JSON output into a FloorPlan entity
  Future<FloorPlan?> parseJsonToFloorPlan({
    required String jsonFilePath,
    required String roomId,
    required String projectId,
  }) async {
    try {
      final file = File(jsonFilePath);
      if (!await file.exists()) return null;

      final jsonString = await file.readAsString();
      final data = json.decode(jsonString) as Map<String, dynamic>;

      return _convertRoomPlanData(data, roomId, projectId);
    } catch (_) {
      return null;
    }
  }

  /// Convert RoomPlan JSON structure to our FloorPlan entities.
  /// RoomPlan provides walls, doors, windows with 3D transforms.
  /// We project to 2D top-down view (X, Z axes).
  FloorPlan? _convertRoomPlanData(
    Map<String, dynamic> data,
    String roomId,
    String projectId,
  ) {
    final walls = <PlanWall>[];
    final openings = <PlanOpening>[];

    // Parse walls
    final wallsList = data['walls'] as List<dynamic>? ?? [];
    for (final wallData in wallsList) {
      final wall = _parseWall(wallData as Map<String, dynamic>);
      if (wall != null) walls.add(wall);
    }

    // Parse doors
    final doorsList = data['doors'] as List<dynamic>? ?? [];
    for (final doorData in doorsList) {
      final opening = _parseOpening(
          doorData as Map<String, dynamic>, walls, OpeningType.door);
      if (opening != null) openings.add(opening);
    }

    // Parse windows
    final windowsList = data['windows'] as List<dynamic>? ?? [];
    for (final windowData in windowsList) {
      final opening = _parseOpening(
          windowData as Map<String, dynamic>, walls, OpeningType.window);
      if (opening != null) openings.add(opening);
    }

    if (walls.isEmpty) return null;

    // Calculate bounding box
    double minX = double.infinity, minY = double.infinity;
    double maxX = double.negativeInfinity, maxY = double.negativeInfinity;

    for (final wall in walls) {
      for (final pt in [wall.startPoint, wall.endPoint]) {
        if (pt.dx < minX) minX = pt.dx;
        if (pt.dy < minY) minY = pt.dy;
        if (pt.dx > maxX) maxX = pt.dx;
        if (pt.dy > maxY) maxY = pt.dy;
      }
    }

    // Normalize: shift all points so min is at (0.5, 0.5) with margin
    const margin = 0.5;
    final offsetX = -minX + margin;
    final offsetY = -minY + margin;
    final width = (maxX - minX) + margin * 2;
    final height = (maxY - minY) + margin * 2;

    final normalizedWalls = walls.map((w) {
      return w.copyWith(
        startPoint:
            Offset(w.startPoint.dx + offsetX, w.startPoint.dy + offsetY),
        endPoint: Offset(w.endPoint.dx + offsetX, w.endPoint.dy + offsetY),
      );
    }).toList();

    return FloorPlan(
      id: _uuid.v4(),
      roomId: roomId,
      projectId: projectId,
      widthMeters: width.ceilToDouble().clamp(3, 50),
      heightMeters: height.ceilToDouble().clamp(3, 50),
      walls: normalizedWalls,
      openings: openings,
      createdAt: DateTime.now(),
    );
  }

  /// Parse a wall from RoomPlan JSON.
  /// Walls have dimensions {width, height} and a 4x4 column-major transform.
  PlanWall? _parseWall(Map<String, dynamic> data) {
    try {
      final dimensions = data['dimensions'] as Map<String, dynamic>?;
      final transform = data['transform'] as List<dynamic>?;
      if (dimensions == null || transform == null) return null;

      final length = (dimensions['width'] as num?)?.toDouble() ?? 0;
      if (length < 0.1) return null;

      final matrix = transform.map((e) => (e as num).toDouble()).toList();
      if (matrix.length < 16) return null;

      // Position from column 3 of 4x4 matrix (column-major)
      final centerX = matrix[12];
      final centerZ = matrix[14]; // Z = Y in our 2D top-down

      // Wall direction from column 0 (local X axis)
      final dirX = matrix[0];
      final dirZ = matrix[2];

      final halfLen = length / 2;
      return PlanWall(
        id: _uuid.v4(),
        startPoint: Offset(centerX - halfLen * dirX, centerZ - halfLen * dirZ),
        endPoint: Offset(centerX + halfLen * dirX, centerZ + halfLen * dirZ),
        type: WallType.exterior,
      );
    } catch (_) {
      return null;
    }
  }

  /// Parse a door or window and snap to nearest wall
  PlanOpening? _parseOpening(
    Map<String, dynamic> data,
    List<PlanWall> walls,
    OpeningType type,
  ) {
    try {
      final dimensions = data['dimensions'] as Map<String, dynamic>?;
      final transform = data['transform'] as List<dynamic>?;
      if (dimensions == null || transform == null) return null;

      final width = (dimensions['width'] as num?)?.toDouble() ?? 0.9;
      final matrix = transform.map((e) => (e as num).toDouble()).toList();
      if (matrix.length < 16) return null;

      final pos = Offset(matrix[12], matrix[14]);

      // Find nearest wall
      String? nearestWallId;
      double nearestDist = double.infinity;
      double nearestOffset = 0;

      for (final wall in walls) {
        final dist =
            _pointToSegmentDist(pos, wall.startPoint, wall.endPoint);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestWallId = wall.id;
          nearestOffset =
              _projectionOnSegment(pos, wall.startPoint, wall.endPoint);
        }
      }

      if (nearestWallId == null || nearestDist > 0.5) return null;

      return PlanOpening(
        id: _uuid.v4(),
        wallId: nearestWallId,
        type: type,
        offsetOnWall: nearestOffset,
        widthMeters: width,
      );
    } catch (_) {
      return null;
    }
  }

  // ─── Geometry helpers ─────────────────────────────────────────

  double _pointToSegmentDist(Offset p, Offset a, Offset b) {
    final ab = b - a;
    final ap = p - a;
    final lenSq = ab.dx * ab.dx + ab.dy * ab.dy;
    if (lenSq == 0) return (p - a).distance;
    var t = (ap.dx * ab.dx + ap.dy * ab.dy) / lenSq;
    t = t.clamp(0.0, 1.0);
    final proj = Offset(a.dx + t * ab.dx, a.dy + t * ab.dy);
    return (p - proj).distance;
  }

  double _projectionOnSegment(Offset p, Offset a, Offset b) {
    final ab = b - a;
    final ap = p - a;
    final lenSq = ab.dx * ab.dx + ab.dy * ab.dy;
    if (lenSq == 0) return 0;
    var t = (ap.dx * ab.dx + ap.dy * ab.dy) / lenSq;
    t = t.clamp(0.0, 1.0);
    return t * (b - a).distance;
  }
}
