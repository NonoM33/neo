import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

@immutable
class DsCrumb {
  const DsCrumb({required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;
}

/// Fil d'Ariane des ecrans profonds : `Projet > Audit > Salon`.
///
/// Sur iPhone, `compact` ne garde que le dernier parent.
class DsBreadcrumb extends StatelessWidget {
  const DsBreadcrumb({required this.items, this.compact = false, super.key});

  final List<DsCrumb> items;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final visible = compact && items.length > 2
        ? items.sublist(items.length - 2)
        : items;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < visible.length; i++) ...[
            if (i > 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: DsIcon(
                  DsGlyph.chevronRight,
                  size: 18,
                  color: ds.textTertiary,
                ),
              ),
            if (visible[i].onTap != null)
              TextButton(
                onPressed: visible[i].onTap,
                style: TextButton.styleFrom(
                  minimumSize: const Size(0, DsSpacing.targetMin),
                  padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s2),
                ),
                child: Text(
                  visible[i].label,
                  style: TextStyle(
                    fontSize: type.labelSize,
                    fontWeight: DsWeight.semibold,
                    color: ds.textLink,
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s2),
                child: Text(
                  visible[i].label,
                  style: TextStyle(
                    fontSize: type.labelSize,
                    fontWeight: DsWeight.semibold,
                    color: ds.textSecondary,
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
