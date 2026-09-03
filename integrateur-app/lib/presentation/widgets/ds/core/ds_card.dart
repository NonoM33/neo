import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import 'ds_pressable.dart';

/// Card du DS — **elevation 0**, la profondeur vient de la bordure.
///
/// Radius 16, padding 20 (24 en `large`), surface `surface-2`.
class DsCard extends StatelessWidget {
  const DsCard({
    required this.child,
    this.onTap,
    this.onLongPress,
    this.padding,
    this.selected = false,
    this.accent,
    this.large = false,
    this.semanticLabel,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final EdgeInsets? padding;
  final bool selected;

  /// Teinte de la bordure et du fond (statut, priorite, mode client).
  final Color? accent;
  final bool large;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final borderColor = selected
        ? ds.brandPrimary
        : accent != null
            ? ds.softBorder(accent!, 0.28)
            : ds.borderSubtle;

    final background = selected
        ? ds.surfaceSelected
        : accent != null
            ? ds.soft(accent!, 0.07)
            : ds.surfaceCard;

    final content = Container(
      padding: padding ??
          EdgeInsets.all(large ? DsSpacing.cardPaddingLarge : DsSpacing.cardPadding),
      decoration: BoxDecoration(
        color: background,
        borderRadius: DsRadius.cardAll,
        border: Border.all(color: borderColor, width: selected ? 2 : 1),
      ),
      child: child,
    );

    if (onTap == null && onLongPress == null) return content;

    return DsPressable(
      onTap: onTap,
      onLongPress: onLongPress,
      borderRadius: DsRadius.cardAll,
      semanticLabel: semanticLabel,
      child: content,
    );
  }
}
