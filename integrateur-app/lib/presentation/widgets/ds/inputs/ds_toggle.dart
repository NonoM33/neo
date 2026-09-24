import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Interrupteur avec libelle — la ligne entiere est cliquable (cible 56 dp).
class DsToggle extends StatelessWidget {
  const DsToggle({
    required this.label,
    required this.value,
    required this.onChanged,
    this.description,
    this.icon,
    this.enabled = true,
    super.key,
  });

  final String label;
  final bool value;
  final ValueChanged<bool>? onChanged;
  final String? description;
  final IconData? icon;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return Semantics(
      toggled: value,
      label: label,
      child: Material(
        color: Colors.transparent,
        borderRadius: DsRadius.mdAll,
        child: InkWell(
          onTap: enabled && onChanged != null
              ? () {
                  HapticFeedback.selectionClick();
                  onChanged!(!value);
                }
              : null,
          borderRadius: DsRadius.mdAll,
          child: Container(
            constraints: const BoxConstraints(minHeight: DsSpacing.targetIdeal),
            padding: const EdgeInsets.symmetric(
              horizontal: DsSpacing.s3,
              vertical: DsSpacing.s2,
            ),
            child: Row(
              children: [
                if (icon != null) ...[
                  DsIcon(icon!, size: 22, color: ds.textSecondary),
                  const SizedBox(width: DsSpacing.s3),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: type.bodySize,
                          fontWeight: DsWeight.medium,
                          color: ds.textBody,
                          height: 1.3,
                        ),
                      ),
                      if (description != null)
                        Text(
                          description!,
                          style: TextStyle(
                            fontSize: type.captionSize,
                            color: ds.textSecondary,
                            height: 1.35,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: DsSpacing.s3),
                Switch(
                  value: value,
                  onChanged: enabled ? onChanged : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
