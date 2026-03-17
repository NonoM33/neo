import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../domain/entities/floor_plan.dart';
import '../../../domain/entities/product.dart';

/// Renders the floor plan on a CustomPainter canvas.
/// All coordinates are in meters; [pixelsPerMeter] converts to canvas pixels.
class FloorPlanPainter extends CustomPainter {
  final FloorPlan plan;
  final double pixelsPerMeter;
  final String? selectedElementId;
  final PlanTool activeTool;
  final Offset? ghostStart; // for wall drawing preview
  final Offset? ghostEnd;
  final Map<String, Product> productCache;
  final ColorScheme colorScheme;
  final bool showGrid;

  FloorPlanPainter({
    required this.plan,
    required this.pixelsPerMeter,
    this.selectedElementId,
    this.activeTool = PlanTool.select,
    this.ghostStart,
    this.ghostEnd,
    this.productCache = const {},
    required this.colorScheme,
    this.showGrid = true,
  });

  // ─── Coordinate conversion ────────────────────────────────────

  Offset _toCanvas(Offset meters) =>
      Offset(meters.dx * pixelsPerMeter, meters.dy * pixelsPerMeter);

  double _toCanvasLen(double meters) => meters * pixelsPerMeter;

  // ─── Paint ────────────────────────────────────────────────────

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Grid
    if (showGrid) _paintGrid(canvas, size);

    // 2. Walls
    for (final wall in plan.walls) {
      _paintWall(canvas, wall, wall.id == selectedElementId);
    }

    // 3. Openings
    for (final opening in plan.openings) {
      _paintOpening(canvas, opening);
    }

    // 4. Equipment
    for (final eq in plan.equipment) {
      _paintEquipment(canvas, eq, eq.id == selectedElementId);
    }

    // 5. Annotations
    for (final annotation in plan.annotations) {
      _paintAnnotation(canvas, annotation, annotation.id == selectedElementId);
    }

    // 6. Wall measurements
    for (final wall in plan.walls) {
      _paintWallMeasurement(canvas, wall);
    }

    // 7. Ghost preview (wall being drawn)
    if (ghostStart != null && ghostEnd != null) {
      _paintGhostWall(canvas);
    }
  }

  // ─── Grid ─────────────────────────────────────────────────────

  void _paintGrid(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = colorScheme.outlineVariant.withAlpha(30)
      ..strokeWidth = 0.5;

    final step = _toCanvasLen(0.5); // 50cm grid
    final w = plan.widthMeters * pixelsPerMeter;
    final h = plan.heightMeters * pixelsPerMeter;

    for (double x = 0; x <= w; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, h), paint);
    }
    for (double y = 0; y <= h; y += step) {
      canvas.drawLine(Offset(0, y), Offset(w, y), paint);
    }

    // Stronger 1m grid
    paint.color = colorScheme.outlineVariant.withAlpha(60);
    paint.strokeWidth = 1;
    final stepMajor = _toCanvasLen(1.0);

    for (double x = 0; x <= w; x += stepMajor) {
      canvas.drawLine(Offset(x, 0), Offset(x, h), paint);
    }
    for (double y = 0; y <= h; y += stepMajor) {
      canvas.drawLine(Offset(0, y), Offset(w, y), paint);
    }
  }

  // ─── Wall ─────────────────────────────────────────────────────

  void _paintWall(Canvas canvas, PlanWall wall, bool selected) {
    final start = _toCanvas(wall.startPoint);
    final end = _toCanvas(wall.endPoint);
    final thickness = _toCanvasLen(wall.thickness);

    final wallColor = switch (wall.type) {
      WallType.exterior => colorScheme.onSurface,
      WallType.interior => colorScheme.onSurface.withAlpha(180),
      WallType.loadBearing => colorScheme.error.withAlpha(200),
    };

    final paint = Paint()
      ..color = wallColor
      ..strokeWidth = thickness
      ..strokeCap = StrokeCap.square;

    canvas.drawLine(start, end, paint);

    // Selection highlight
    if (selected) {
      final selectPaint = Paint()
        ..color = colorScheme.primary
        ..strokeWidth = thickness + 4
        ..strokeCap = StrokeCap.square
        ..style = PaintingStyle.stroke;
      canvas.drawLine(start, end, selectPaint);

      // Endpoint handles
      final handlePaint = Paint()..color = colorScheme.primary;
      canvas.drawCircle(start, 6, handlePaint);
      canvas.drawCircle(end, 6, handlePaint);
    }
  }

  // ─── Opening ──────────────────────────────────────────────────

  void _paintOpening(Canvas canvas, PlanOpening opening) {
    final wall = plan.walls.where((w) => w.id == opening.wallId).firstOrNull;
    if (wall == null) return;

    final wallDir = wall.endPoint - wall.startPoint;
    final wallLen = wallDir.distance;
    if (wallLen == 0) return;

    final unitDir = wallDir / wallLen;
    final openingCenter = wall.startPoint +
        unitDir * (opening.offsetOnWall + opening.widthMeters / 2);

    final start = _toCanvas(
        openingCenter - unitDir * (opening.widthMeters / 2));
    final end = _toCanvas(
        openingCenter + unitDir * (opening.widthMeters / 2));

    final thickness = _toCanvasLen(wall.thickness);

    // Erase wall segment
    final erasePaint = Paint()
      ..color = colorScheme.surface
      ..strokeWidth = thickness + 2
      ..strokeCap = StrokeCap.butt;
    canvas.drawLine(start, end, erasePaint);

    // Draw opening symbol
    final openingPaint = Paint()
      ..color = opening.type == OpeningType.window ||
              opening.type == OpeningType.frenchDoor
          ? colorScheme.tertiary
          : colorScheme.secondary
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    if (opening.type == OpeningType.window ||
        opening.type == OpeningType.frenchDoor) {
      // Window: two parallel lines
      final normal = Offset(-unitDir.dy, unitDir.dx);
      final offset = normal * (thickness / 2);
      canvas.drawLine(
          _toCanvas(openingCenter - unitDir * (opening.widthMeters / 2) + Offset(offset.dx / pixelsPerMeter, offset.dy / pixelsPerMeter)),
          _toCanvas(openingCenter + unitDir * (opening.widthMeters / 2) + Offset(offset.dx / pixelsPerMeter, offset.dy / pixelsPerMeter)),
          openingPaint);
      canvas.drawLine(
          _toCanvas(openingCenter - unitDir * (opening.widthMeters / 2) - Offset(offset.dx / pixelsPerMeter, offset.dy / pixelsPerMeter)),
          _toCanvas(openingCenter + unitDir * (opening.widthMeters / 2) - Offset(offset.dx / pixelsPerMeter, offset.dy / pixelsPerMeter)),
          openingPaint);
    } else {
      // Door: arc
      final center = _toCanvas(openingCenter -
          unitDir * (opening.widthMeters / 2));
      final radius = _toCanvasLen(opening.widthMeters);
      final startAngle = math.atan2(unitDir.dy, unitDir.dx);
      final sweepAngle = opening.openingSide == OpeningSide.right
          ? -math.pi / 2
          : math.pi / 2;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        openingPaint,
      );
    }
  }

  // ─── Equipment ────────────────────────────────────────────────

  void _paintEquipment(Canvas canvas, PlanEquipment eq, bool selected) {
    final center = _toCanvas(eq.position);
    const radius = 18.0;

    // Status color
    final statusColor = switch (eq.status) {
      EquipmentPlacementStatus.planned => colorScheme.outlineVariant,
      EquipmentPlacementStatus.ordered => const Color(0xFF7E57C2),
      EquipmentPlacementStatus.installed => const Color(0xFF1E88E5),
      EquipmentPlacementStatus.configured => const Color(0xFF43A047),
      EquipmentPlacementStatus.issue => colorScheme.error,
    };

    // Background circle
    final bgPaint = Paint()..color = statusColor.withAlpha(40);
    canvas.drawCircle(center, radius, bgPaint);

    // Border
    final borderPaint = Paint()
      ..color = selected ? colorScheme.primary : statusColor
      ..strokeWidth = selected ? 3 : 2
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, radius, borderPaint);

    // Category icon (draw as text for simplicity with CustomPainter)
    final product = productCache[eq.productId];
    final iconChar = _categoryIconChar(product?.category);

    final textPainter = TextPainter(
      text: TextSpan(
        text: iconChar,
        style: TextStyle(
          fontSize: 18,
          color: statusColor,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout();

    textPainter.paint(
      canvas,
      center - Offset(textPainter.width / 2, textPainter.height / 2),
    );

    // Label below
    final labelText = eq.label ?? product?.name ?? '';
    if (labelText.isNotEmpty) {
      final label = TextPainter(
        text: TextSpan(
          text: labelText.length > 15
              ? '${labelText.substring(0, 15)}...'
              : labelText,
          style: TextStyle(
            fontSize: 10,
            color: colorScheme.onSurface.withAlpha(180),
          ),
        ),
        textDirection: ui.TextDirection.ltr,
        textAlign: TextAlign.center,
      )..layout(maxWidth: 100);

      label.paint(
        canvas,
        center + Offset(-label.width / 2, radius + 4),
      );
    }

    // Quantity badge
    if (eq.quantity > 1) {
      final badgeCenter = center + const Offset(14, -14);
      canvas.drawCircle(badgeCenter, 10, Paint()..color = colorScheme.primary);
      final qtyPainter = TextPainter(
        text: TextSpan(
          text: '${eq.quantity}',
          style: TextStyle(
            fontSize: 11,
            color: colorScheme.onPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        textDirection: ui.TextDirection.ltr,
      )..layout();
      qtyPainter.paint(
        canvas,
        badgeCenter - Offset(qtyPainter.width / 2, qtyPainter.height / 2),
      );
    }
  }

  String _categoryIconChar(ProductCategory? category) {
    return switch (category) {
      ProductCategory.eclairage => '\u{1F4A1}', // lightbulb
      ProductCategory.securite => '\u{1F6E1}', // shield
      ProductCategory.climat => '\u{1F321}', // thermometer
      ProductCategory.ouvrants => '\u{1FA9F}', // window
      ProductCategory.energie => '\u{1F50C}', // plug
      ProductCategory.multimedia => '\u{1F50A}', // speaker
      ProductCategory.custom => '\u{2699}', // gear
      null => '\u{2B24}', // circle
    };
  }

  // ─── Annotation ───────────────────────────────────────────────

  void _paintAnnotation(
      Canvas canvas, PlanAnnotation annotation, bool selected) {
    final pos = _toCanvas(annotation.position);

    if (annotation.type == AnnotationType.measurement &&
        annotation.endPosition != null) {
      // Measurement line
      final end = _toCanvas(annotation.endPosition!);
      final linePaint = Paint()
        ..color = colorScheme.tertiary
        ..strokeWidth = 1.5;
      canvas.drawLine(pos, end, linePaint);

      // Measurement label
      final length = annotation.measurementLength;
      if (length != null) {
        final mid = Offset((pos.dx + end.dx) / 2, (pos.dy + end.dy) / 2);
        _drawLabel(canvas, '${length.toStringAsFixed(2)}m', mid,
            colorScheme.tertiary);
      }
      return;
    }

    // Note / warning / label
    final bgColor = switch (annotation.type) {
      AnnotationType.warning => colorScheme.error.withAlpha(30),
      AnnotationType.label => colorScheme.primaryContainer,
      _ => colorScheme.surfaceContainerHighest,
    };
    final textColor = switch (annotation.type) {
      AnnotationType.warning => colorScheme.error,
      AnnotationType.label => colorScheme.onPrimaryContainer,
      _ => colorScheme.onSurface,
    };

    final textPainter = TextPainter(
      text: TextSpan(
        text: annotation.text,
        style: TextStyle(fontSize: 12, color: textColor),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout(maxWidth: 150);

    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
          pos.dx - 4, pos.dy - 4, textPainter.width + 8, textPainter.height + 8),
      const Radius.circular(4),
    );

    canvas.drawRRect(rect, Paint()..color = bgColor);
    if (selected) {
      canvas.drawRRect(
        rect,
        Paint()
          ..color = colorScheme.primary
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }

    textPainter.paint(canvas, pos);
  }

  // ─── Wall measurements ────────────────────────────────────────

  void _paintWallMeasurement(Canvas canvas, PlanWall wall) {
    final start = _toCanvas(wall.startPoint);
    final end = _toCanvas(wall.endPoint);
    final mid = Offset((start.dx + end.dx) / 2, (start.dy + end.dy) / 2);

    // Offset label perpendicular to wall
    final dir = end - start;
    final normal = Offset(-dir.dy, dir.dx);
    final normalLen = normal.distance;
    if (normalLen == 0) return;
    final offset = normal / normalLen * 16;

    _drawLabel(
      canvas,
      '${wall.lengthMeters.toStringAsFixed(2)}m',
      mid + offset,
      colorScheme.onSurfaceVariant.withAlpha(180),
    );
  }

  void _drawLabel(Canvas canvas, String text, Offset position, Color color) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout();

    final bg = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: position,
        width: painter.width + 8,
        height: painter.height + 4,
      ),
      const Radius.circular(3),
    );
    canvas.drawRRect(bg, Paint()..color = colorScheme.surface.withAlpha(220));
    painter.paint(
      canvas,
      position - Offset(painter.width / 2, painter.height / 2),
    );
  }

  // ─── Ghost wall preview ───────────────────────────────────────

  void _paintGhostWall(Canvas canvas) {
    final start = _toCanvas(ghostStart!);
    final end = _toCanvas(ghostEnd!);

    final paint = Paint()
      ..color = colorScheme.primary.withAlpha(120)
      ..strokeWidth = _toCanvasLen(0.15)
      ..strokeCap = StrokeCap.square;

    canvas.drawLine(start, end, paint);

    // Ghost measurement
    final length = (ghostEnd! - ghostStart!).distance;
    final mid = Offset((start.dx + end.dx) / 2, (start.dy + end.dy) / 2);
    _drawLabel(canvas, '${length.toStringAsFixed(2)}m', mid - const Offset(0, 16),
        colorScheme.primary);
  }

  @override
  bool shouldRepaint(covariant FloorPlanPainter oldDelegate) {
    return plan != oldDelegate.plan ||
        selectedElementId != oldDelegate.selectedElementId ||
        activeTool != oldDelegate.activeTool ||
        ghostStart != oldDelegate.ghostStart ||
        ghostEnd != oldDelegate.ghostEnd ||
        showGrid != oldDelegate.showGrid;
  }
}
