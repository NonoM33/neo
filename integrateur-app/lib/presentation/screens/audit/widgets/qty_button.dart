import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';

/// Compact +/− button used by quantity controls and the floor selector.
class QtyButton extends StatelessWidget {
  final IconData icon;
  final ColorScheme cs;
  final bool isDark;
  final VoidCallback onTap;

  const QtyButton({
    super.key,
    required this.icon,
    required this.cs,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color:
              isDark ? Colors.white.withAlpha(10) : cs.surfaceContainerHighest,
          borderRadius: AppRadius.borderRadiusXs,
        ),
        child: Icon(icon, size: 14, color: cs.onSurfaceVariant),
      ),
    );
  }
}
