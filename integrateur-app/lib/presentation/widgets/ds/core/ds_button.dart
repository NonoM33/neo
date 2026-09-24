import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import 'ds_icon.dart';

/// Variantes de bouton. Une seule action `primary` visible par ecran.
enum DsButtonVariant {
  primary,
  secondary,
  ghost,
  danger,

  /// Teal — ecrans tendus au client (devis presente, signature).
  clientMode,
}

/// Tailles : `small` 48 (plancher a11y), `medium` 52, `large` 56 (action terrain).
enum DsButtonSize {
  small(DsSpacing.targetMin),
  medium(52),
  large(DsSpacing.targetIdeal);

  const DsButtonSize(this.height);
  final double height;
}

/// Bouton du Design System — elevation 0, radius 12, jamais moins de 48 dp.
class DsButton extends StatelessWidget {
  const DsButton({
    required this.label,
    this.onPressed,
    this.variant = DsButtonVariant.primary,
    this.size = DsButtonSize.medium,
    this.icon,
    this.trailingIcon,
    this.loading = false,
    this.fullWidth = false,
    this.haptic = true,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final DsButtonVariant variant;
  final DsButtonSize size;
  final IconData? icon;
  final IconData? trailingIcon;
  final bool loading;
  final bool fullWidth;
  final bool haptic;

  bool get _disabled => onPressed == null || loading;

  ({Color background, Color foreground, Color border}) _colors(DsColors ds) =>
      switch (variant) {
        DsButtonVariant.primary => (
            background: ds.brandPrimary,
            foreground: ds.textOnBrand,
            border: Colors.transparent,
          ),
        DsButtonVariant.secondary => (
            background: Colors.transparent,
            foreground: ds.brandPrimary,
            border: ds.borderStrong,
          ),
        DsButtonVariant.ghost => (
            background: Colors.transparent,
            foreground: ds.brandPrimary,
            border: Colors.transparent,
          ),
        DsButtonVariant.danger => (
            background: ds.error,
            foreground: ds.isDark ? ds.surfaceBase : Colors.white,
            border: Colors.transparent,
          ),
        DsButtonVariant.clientMode => (
            background: ds.clientModeAccent,
            foreground: ds.isDark ? ds.surfaceBase : Colors.white,
            border: Colors.transparent,
          ),
      };

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final c = _colors(ds);

    final textStyle = TextStyle(
      fontSize: size == DsButtonSize.small ? type.labelSize : type.bodySize,
      fontWeight: DsWeight.semibold,
      letterSpacing: 0.2,
      color: c.foreground,
      height: 1.2,
    );

    final child = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading)
          SizedBox.square(
            dimension: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: c.foreground,
            ),
          )
        else if (icon != null)
          DsIcon(icon!, size: 20, color: c.foreground),
        if (loading || icon != null) const SizedBox(width: DsSpacing.s2),
        Flexible(
          child: Text(
            label,
            style: textStyle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (trailingIcon != null && !loading) ...[
          const SizedBox(width: DsSpacing.s2),
          DsIcon(trailingIcon!, size: 20, color: c.foreground),
        ],
      ],
    );

    return Opacity(
      opacity: _disabled ? 0.42 : 1,
      child: SizedBox(
        height: size.height,
        width: fullWidth ? double.infinity : null,
        child: Material(
          color: c.background,
          borderRadius: DsRadius.buttonAll,
          child: InkWell(
            onTap: _disabled
                ? null
                : () {
                    if (haptic) HapticFeedback.lightImpact();
                    onPressed!.call();
                  },
            borderRadius: DsRadius.buttonAll,
            hoverColor: ds.hoverOverlay,
            highlightColor: ds.pressedOverlay,
            child: Container(
              constraints: BoxConstraints(minWidth: fullWidth ? 0 : 120),
              padding: EdgeInsets.symmetric(
                horizontal:
                    size == DsButtonSize.small ? DsSpacing.s4 : DsSpacing.s5,
              ),
              decoration: BoxDecoration(
                borderRadius: DsRadius.buttonAll,
                border: Border.all(color: c.border),
              ),
              alignment: Alignment.center,
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
