import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';

/// Notation 1–5 de l'audit technique. Grosses cibles : on note debout, avec des gants.
class DsRatingScale extends StatelessWidget {
  const DsRatingScale({
    required this.label,
    required this.value,
    required this.onChanged,
    this.lowLabel = 'Mauvais',
    this.highLabel = 'Bon',
    super.key,
  });

  final String label;
  final int? value;
  final ValueChanged<int> onChanged;
  final String lowLabel;
  final String highLabel;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    Color toneFor(int v) => switch (v) {
          1 || 2 => ds.error,
          3 => ds.brandTertiary,
          _ => ds.success,
        };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: type.labelSize,
            fontWeight: DsWeight.semibold,
            color: ds.textBody,
          ),
        ),
        const SizedBox(height: DsSpacing.s2),
        Row(
          children: List.generate(5, (index) {
            final v = index + 1;
            final selected = value == v;
            final accent = toneFor(v);
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: index == 4 ? 0 : DsSpacing.s2),
                child: Semantics(
                  button: true,
                  selected: selected,
                  label: 'Note $v sur 5',
                  child: Material(
                    color: selected ? ds.soft(accent, 0.16) : ds.surface1,
                    borderRadius: DsRadius.mdAll,
                    child: InkWell(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        onChanged(v);
                      },
                      borderRadius: DsRadius.mdAll,
                      child: Container(
                        height: DsSpacing.targetIdeal,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          borderRadius: DsRadius.mdAll,
                          border: Border.all(
                            color: selected
                                ? ds.softBorder(accent, 0.55)
                                : ds.borderDefault,
                            width: selected ? 2 : 1,
                          ),
                        ),
                        child: Text(
                          '$v',
                          style: TextStyle(
                            fontSize: type.numericSize,
                            fontWeight: DsWeight.semibold,
                            fontFeatures: dsTabularFigures,
                            color: selected ? accent : ds.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              lowLabel,
              style: TextStyle(
                fontSize: type.badgeSize,
                color: ds.textSecondary,
              ),
            ),
            Text(
              highLabel,
              style: TextStyle(
                fontSize: type.badgeSize,
                color: ds.textSecondary,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
