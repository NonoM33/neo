import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Chip de filtre — padding 16 x 12 minimum, cible 48 dp, forme pilule.
class DsFilterChip extends StatelessWidget {
  const DsFilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
    this.icon,
    this.count,
    this.tone,
    super.key,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;
  final IconData? icon;
  final int? count;

  /// Teinte specifique (statut, priorite) — sinon la couleur de marque.
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final accent = tone ?? ds.brandPrimary;
    final fg = selected ? accent : ds.textSecondary;

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: Material(
        color: selected ? ds.soft(accent, 0.14) : ds.surface1,
        borderRadius: DsRadius.fullAll,
        child: InkWell(
          onTap: () {
            HapticFeedback.selectionClick();
            onSelected();
          },
          borderRadius: DsRadius.fullAll,
          child: Container(
            constraints: const BoxConstraints(minHeight: DsSpacing.targetMin),
            padding: const EdgeInsets.symmetric(
              horizontal: DsSpacing.s4,
              vertical: DsSpacing.s3,
            ),
            decoration: BoxDecoration(
              borderRadius: DsRadius.fullAll,
              border: Border.all(
                color: selected ? ds.softBorder(accent, 0.5) : ds.borderDefault,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  DsIcon(icon!, size: 18, color: fg),
                  const SizedBox(width: 6),
                ],
                Text(
                  label,
                  style: TextStyle(
                    fontSize: type.labelSize,
                    fontWeight: DsWeight.semibold,
                    color: fg,
                    height: 1.2,
                  ),
                ),
                if (count != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: selected ? ds.soft(accent, 0.22) : ds.surfaceSunken,
                      borderRadius: DsRadius.fullAll,
                    ),
                    child: Text(
                      '$count',
                      style: TextStyle(
                        fontSize: type.badgeSize,
                        fontWeight: DsWeight.semibold,
                        fontFeatures: dsTabularFigures,
                        color: fg,
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
