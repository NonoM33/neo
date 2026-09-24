import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Selecteur du DS.
///
/// Sous 5 options, preferer des chips (`DsFilterChip`) : c'est plus rapide
/// debout, avec des gants, que d'ouvrir un menu.
class DsSelectField<T> extends StatelessWidget {
  const DsSelectField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.hintText,
    this.required = false,
    this.enabled = true,
    this.errorText,
    super.key,
  });

  final String label;
  final T? value;
  final List<DsSelectItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final String? hintText;
  final bool required;
  final bool enabled;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: type.labelSize,
                fontWeight: DsWeight.semibold,
                color: ds.textBody,
              ),
            ),
            if (required)
              Text(
                ' *',
                style: TextStyle(
                  fontSize: type.labelSize,
                  fontWeight: DsWeight.semibold,
                  color: ds.error,
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<T>(
          initialValue: value,
          isExpanded: true,
          borderRadius: DsRadius.mdAll,
          dropdownColor: ds.surface3,
          icon: DsIcon(Icons.expand_more_rounded, size: 22),
          style: TextStyle(fontSize: type.bodySize, color: ds.textPrimary),
          decoration: InputDecoration(
            hintText: hintText,
            errorText: errorText,
            constraints: const BoxConstraints(minHeight: DsSpacing.targetMin),
          ),
          items: [
            for (final item in items)
              DropdownMenuItem<T>(
                value: item.value,
                child: Row(
                  children: [
                    if (item.icon != null) ...[
                      DsIcon(
                        item.icon!,
                        size: 20,
                        color: item.color ?? ds.textSecondary,
                      ),
                      const SizedBox(width: DsSpacing.s2),
                    ],
                    Flexible(
                      child: Text(
                        item.label,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: type.bodySize,
                          color: ds.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
          onChanged: enabled
              ? (next) {
                  HapticFeedback.selectionClick();
                  onChanged?.call(next);
                }
              : null,
        ),
      ],
    );
  }
}

@immutable
class DsSelectItem<T> {
  const DsSelectItem({
    required this.value,
    required this.label,
    this.icon,
    this.color,
  });

  final T value;
  final String label;
  final IconData? icon;
  final Color? color;
}
