import 'dart:async';
import 'dart:convert';
import 'dart:developer' as dev;
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

  /// Result from a LiDAR scan containing file paths
  String? _lastUsdzPath;

  /// Start a LiDAR room scan. Returns JSON file path when scan completes.
  /// The RoomPlan native UI is presented automatically by the plugin.
  Future<String?> startScanAndWait() async {
    _scanCompleter = Completer<String?>();
    _lastUsdzPath = null;

    _roomplan.onRoomCaptureFinished(() async {
      final jsonPath = await _roomplan.getJsonFilePath();
      try {
        _lastUsdzPath = await _roomplan.getUsdzFilePath();
      } catch (_) {
        // USDZ is optional
      }
      if (_scanCompleter != null && !_scanCompleter!.isCompleted) {
        _scanCompleter!.complete(jsonPath);
      }
    });

    await _roomplan.startScan();
    return _scanCompleter!.future;
  }

  /// Get the USDZ file path from the last scan (if available)
  String? get lastUsdzPath => _lastUsdzPath;

  /// Parse the RoomPlan JSON output into a FloorPlan entity
  Future<FloorPlan?> parseJsonToFloorPlan({
    required String jsonFilePath,
    required String roomId,
    required String projectId,
  }) async {
    try {
      final file = File(jsonFilePath);
      if (!await file.exists()) {
        dev.log('[LiDAR] JSON file not found: $jsonFilePath');
        return null;
      }

      final jsonString = await file.readAsString();
      final data = json.decode(jsonString);

      // CapturedRoom encodes as a Map, CapturedRoom array as a List
      final Map<String, dynamic> roomData;
      if (data is List && data.isNotEmpty) {
        // Multi-room: use first room
        roomData = data.first as Map<String, dynamic>;
      } else if (data is Map<String, dynamic>) {
        roomData = data;
      } else {
        dev.log('[LiDAR] Unexpected JSON root type: ${data.runtimeType}');
        return null;
      }

      dev.log('[LiDAR] JSON keys: ${roomData.keys.toList()}');
      return _convertRoomPlanData(roomData, roomId, projectId);
    } catch (e, st) {
      dev.log('[LiDAR] Parse error: $e\n$st');
      return null;
    }
  }

  /// Convert RoomPlan JSON structure to our FloorPlan entities.
  ///
  /// Apple's CapturedRoom JSON (via JSONEncoder) format:
  /// - `walls`, `doors`, `windows`, `openings`, `objects`: arrays of Surface
  /// - Each Surface has:
  ///   - `dimensions`: [width, height, depth] (simd_float3 → array)
  ///   - `transform`: [[c0r0..c0r3],[c1r0..c1r3],[c2r0..c2r3],[c3r0..c3r3]]
  ///     (simd_float4x4 → nested column-major array)
  FloorPlan? _convertRoomPlanData(
    Map<String, dynamic> data,
    String roomId,
    String projectId,
  ) {
    final walls = <PlanWall>[];
    final openings = <PlanOpening>[];

    // Parse walls
    final wallsList = data['walls'] as List<dynamic>? ?? [];
    dev.log('[LiDAR] Found ${wallsList.length} walls');
    if (wallsList.isNotEmpty) {
      dev.log('[LiDAR] First wall keys: ${(wallsList.first as Map).keys.toList()}');
      final firstTransform = (wallsList.first as Map)['transform'];
      dev.log('[LiDAR] Transform type: ${firstTransform.runtimeType}');
      final firstDims = (wallsList.first as Map)['dimensions'];
      dev.log('[LiDAR] Dimensions type: ${firstDims.runtimeType}, value: $firstDims');
    }

    for (final wallData in wallsList) {
      final wall = _parseWall(wallData as Map<String, dynamic>);
      if (wall != null) walls.add(wall);
    }
    dev.log('[LiDAR] Parsed ${walls.length} valid walls');

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

    // Also parse "openings" (RoomPlan has a separate openings array)
    final openingsList = data['openings'] as List<dynamic>? ?? [];
    for (final openingData in openingsList) {
      final opening = _parseOpening(
          openingData as Map<String, dynamic>, walls, OpeningType.door);
      if (opening != null) openings.add(opening);
    }

    dev.log('[LiDAR] Result: ${walls.length} walls, ${openings.length} openings');

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
      usdzFilePath: _lastUsdzPath,
    );
  }

  /// Flatten a 4x4 transform matrix from Apple's format.
  ///
  /// Apple encodes simd_float4x4 as either:
  /// - Nested: [[c0r0,c0r1,c0r2,c0r3], [c1...], [c2...], [c3...]] (column-major)
  /// - Flat: [m0, m1, ..., m15] (already column-major)
  List<double>? _flattenTransform(dynamic transform) {
    if (transform is! List || transform.isEmpty) return null;

    // Check if nested (first element is a list)
    if (transform.first is List) {
      // Nested column-major: [[col0], [col1], [col2], [col3]]
      final flat = <double>[];
      for (final col in transform) {
        if (col is List) {
          for (final val in col) {
            flat.add((val as num).toDouble());
          }
        }
      }
      return flat.length >= 16 ? flat : null;
    }

    // Already flat
    if (transform.length >= 16) {
      return transform.map((e) => (e as num).toDouble()).toList();
    }

    return null;
  }

  /// Extract width (first dimension) from Apple's dimensions format.
  ///
  /// Apple encodes simd_float3 as either:
  /// - Array: [width, height, depth]
  /// - Map: {"width": ..., "height": ..., "depth": ...}  (unlikely but handle it)
  double? _parseDimensionWidth(dynamic dimensions) {
    if (dimensions is List && dimensions.isNotEmpty) {
      return (dimensions[0] as num).toDouble();
    }
    if (dimensions is Map) {
      return (dimensions['width'] as num?)?.toDouble();
    }
    return null;
  }

  /// Parse a wall from RoomPlan JSON.
  PlanWall? _parseWall(Map<String, dynamic> data) {
    try {
      final length = _parseDimensionWidth(data['dimensions']);
      if (length == null || length < 0.1) return null;

      final matrix = _flattenTransform(data['transform']);
      if (matrix == null) return null;

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
    } catch (e) {
      dev.log('[LiDAR] Wall parse error: $e');
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
      final width = _parseDimensionWidth(data['dimensions']) ?? 0.9;

      final matrix = _flattenTransform(data['transform']);
      if (matrix == null) return null;

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
    } catch (e) {
      dev.log('[LiDAR] Opening parse error: $e');
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
