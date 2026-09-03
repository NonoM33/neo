import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Stepper de quantite — cibles 44 dp minimum (56 en `large`).
///
/// C'est la seule tolerance sous 48 dp du systeme, et elle ne vaut que pour
/// les deux boutons du stepper.
class DsNumberStepper extends StatelessWidget {
  const DsNumberStepper({
    required this.value,
    required this.onChanged,
    this.min = 0,
    this.max = 999,
    this.step = 1,
    this.unit,
    this.large = false,
    this.enabled = true,
    super.key,
  });

  final int value;
  final ValueChanged<int>? onChanged;
  final int min;
  final int max;
  final int step;
  final String? unit;
  final bool large;
  final bool enabled;

  void _set(int next) {
    if (onChanged == null) return;
    final clamped = next.clamp(min, max);
    if (clamped == value) return;
    HapticFeedback.selectionClick();
    onChanged!(clamped);
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final box = large ? DsSpacing.targetIdeal : DsSpacing.targetStepper;

    Widget button(IconData icon, String label, int delta, bool off) {
      final disabled = !enabled || off || onChanged == null;
      return Semantics(
        button: true,
        label: label,
        child: SizedBox(
          width: box,
          height: box,
          child: Material(
            color: ds.surface1,
            child: InkWell(
              onTap: disabled ? null : () => _set(value + delta),
              child: DsIcon(
                icon,
                size: 22,
                color: disabled ? ds.textTertiary : ds.brandPrimary,
              ),
            ),
          ),
        ),
      );
    }

    return Opacity(
      opacity: enabled ? 1 : 0.42,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: ds.surface1,
          borderRadius: DsRadius.mdAll,
          border: Border.all(color: ds.borderDefault),
        ),
        child: ClipRRect(
          borderRadius: DsRadius.mdAll,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              button(DsGlyph.remove, 'Diminuer', -step, value <= min),
              Container(
                constraints: BoxConstraints(minWidth: 56, minHeight: box),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  border: Border.symmetric(
                    vertical: BorderSide(color: ds.borderSubtle),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$value',
                      style: TextStyle(
                        fontSize: context.dsType.numericSize,
                        fontWeight: DsWeight.semibold,
                        fontFeatures: dsTabularFigures,
                        color: ds.textPrimary,
                      ),
                    ),
                    if (unit != null) ...[
                      const SizedBox(width: 3),
                      Text(
                        unit!,
                        style: TextStyle(
                          fontSize: context.dsType.badgeSize,
                          fontWeight: DsWeight.medium,
                          color: ds.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              button(DsGlyph.add, 'Augmenter', step, value >= max),
            ],
          ),
        ),
      ),
    );
  }
}
