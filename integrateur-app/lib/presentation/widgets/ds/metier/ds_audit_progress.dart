import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

enum DsProgressVariant { bar, ring }

/// Jauge de progression d'audit — par piece ou globale.
///
/// Toujours visible : « toujours montrer l'avancement » est un principe du systeme.
class DsAuditProgress extends StatelessWidget {
  const DsAuditProgress({
    required this.label,
    required this.percent,
    this.itemsDone,
    this.itemsTotal,
    this.variant = DsProgressVariant.bar,
    super.key,
  });

  final String label;
  final int percent;
  final int? itemsDone;
  final int? itemsTotal;
  final DsProgressVariant variant;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final color = percent >= 100 ? ds.success : ds.brandPrimary;

    if (variant == DsProgressVariant.ring) {
      return Row(
        children: [
          SizedBox.square(
            dimension: 64,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size.square(64),
                  painter: _RingPainter(
                    percent: percent,
                    color: color,
                    track: ds.surfaceSunken,
                  ),
                ),
                Text(
                  '$percent %',
                  style: TextStyle(
                    fontSize: t.labelSize,
                    fontWeight: DsWeight.semibold,
                    fontFeatures: dsTabularFigures,
                    color: ds.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: DsSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: t.titleSize,
                    fontWeight: DsWeight.semibold,
                    color: ds.textPrimary,
                  ),
                ),
                if (itemsTotal != null)
                  Text(
                    '${itemsDone ?? 0} sur $itemsTotal besoins relevés',
                    style: TextStyle(
                      fontSize: t.captionSize,
                      color: ds.textSecondary,
                    ),
                  ),
              ],
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            if (percent >= 100) ...[
              DsIcon(DsGlyph.checkCircle, size: 17, color: ds.success),
              const SizedBox(width: 5),
            ],
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: t.labelSize,
                  fontWeight: DsWeight.semibold,
                  color: ds.textBody,
                ),
              ),
            ),
            Text(
              itemsTotal != null
                  ? '${itemsDone ?? 0} / $itemsTotal'
                  : '$percent %',
              style: TextStyle(
                fontSize: t.labelSize,
                fontWeight: DsWeight.semibold,
                fontFeatures: dsTabularFigures,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: DsRadius.fullAll,
          child: TweenAnimationBuilder<double>(
            duration: DsMotion.duration(context, DsMotion.transform),
            curve: DsMotion.easeTransform,
            tween: Tween<double>(begin: 0, end: (percent / 100).clamp(0, 1)),
            builder: (context, value, _) => LinearProgressIndicator(
              value: value,
              minHeight: 8,
              backgroundColor: ds.surfaceSunken,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ),
      ],
    );
  }
}

class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.percent,
    required this.color,
    required this.track,
  });

  final int percent;
  final Color color;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 7.0;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - stroke) / 2;

    final trackPaint = Paint()
      ..color = track
      ..strokeWidth = stroke
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, radius, trackPaint);

    final valuePaint = Paint()
      ..color = color
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * (percent.clamp(0, 100) / 100),
      false,
      valuePaint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.percent != percent || oldDelegate.color != color;
}
