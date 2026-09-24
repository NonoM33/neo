import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

enum DsTone { neutral, success, warning, error }

/// Snackbar du DS — flottante, radius 12, sur la surface 5.
void showDsSnackbar(
  BuildContext context, {
  required String message,
  DsTone tone = DsTone.neutral,
  String? actionLabel,
  VoidCallback? onAction,
  Duration duration = const Duration(seconds: 4),
}) {
  final ds = context.ds;
  final (IconData icon, Color color) = switch (tone) {
    DsTone.neutral => (DsGlyph.info, ds.textOnTooltip),
    DsTone.success => (DsGlyph.checkCircle, ds.success),
    DsTone.warning => (DsGlyph.warning, ds.brandTertiary),
    DsTone.error => (DsGlyph.error, ds.error),
  };

  if (tone == DsTone.error) {
    HapticFeedback.heavyImpact();
  } else {
    HapticFeedback.lightImpact();
  }

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        duration: duration,
        backgroundColor: ds.surface5,
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: DsRadius.mdAll),
        margin: const EdgeInsets.all(DsSpacing.s4),
        content: Row(
          children: [
            DsIcon(icon, size: 20, color: color),
            const SizedBox(width: DsSpacing.s3),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: context.dsType.bodySize,
                  color: ds.textOnTooltip,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
        action: actionLabel == null
            ? null
            : SnackBarAction(
                label: actionLabel,
                textColor: ds.brandPrimaryStrong,
                onPressed: onAction ?? () {},
              ),
      ),
    );
}
