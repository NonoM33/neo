import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

@immutable
class DsTabItem {
  const DsTabItem({
    required this.id,
    required this.label,
    this.icon,
    this.count,
  });

  final String id;
  final String label;
  final IconData? icon;
  final int? count;
}

/// Onglets du panneau d'audit et de tout detail a sections.
/// Hauteur 56 dp : c'est une cible tactile, pas un onglet de bureau.
class DsSegmentedTabs extends StatelessWidget {
  const DsSegmentedTabs({
    required this.items,
    required this.activeId,
    required this.onChanged,
    this.expand = true,
    super.key,
  });

  final List<DsTabItem> items;
  final String activeId;
  final ValueChanged<String> onChanged;

  /// `true` : les onglets se partagent la largeur. `false` : ils se suivent.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    Widget tab(DsTabItem item) {
      final active = item.id == activeId;
      return Semantics(
        button: true,
        selected: active,
        label: item.label,
        child: Material(
          color: active ? ds.surface1 : Colors.transparent,
          borderRadius: DsRadius.mdAll,
          child: InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              onChanged(item.id);
            },
            borderRadius: DsRadius.mdAll,
            child: Container(
              height: DsSpacing.targetIdeal,
              // Marge laterale resserree sur iPhone : a pleine largeur, la
              // somme des onglets depassait d'une fraction de pixel.
              padding: EdgeInsets.symmetric(
                horizontal: context.dsDevice.isPhone
                    ? DsSpacing.s3
                    : DsSpacing.s4,
              ),
              clipBehavior: Clip.hardEdge,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: DsRadius.mdAll,
                border: Border.all(
                  color: active ? ds.borderSubtle : Colors.transparent,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (item.icon != null) ...[
                    DsIcon(
                      item.icon!,
                      size: 20,
                      color: active ? ds.brandPrimary : ds.textSecondary,
                    ),
                    const SizedBox(width: DsSpacing.s2),
                  ],
                  Flexible(
                    child: Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: type.labelSize,
                        fontWeight: DsWeight.semibold,
                        color: active ? ds.brandPrimary : ds.textSecondary,
                      ),
                    ),
                  ),
                  if (item.count != null) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: active
                            ? ds.soft(ds.brandPrimary, 0.16)
                            : ds.surfaceSunken,
                        borderRadius: DsRadius.fullAll,
                      ),
                      child: Text(
                        '${item.count}',
                        style: TextStyle(
                          fontSize: type.badgeSize,
                          fontWeight: DsWeight.semibold,
                          fontFeatures: dsTabularFigures,
                          color: active ? ds.brandPrimary : ds.textSecondary,
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

    final children = <Widget>[
      for (var i = 0; i < items.length; i++) ...[
        if (expand) Expanded(child: tab(items[i])) else tab(items[i]),
        if (i < items.length - 1) const SizedBox(width: DsSpacing.s1),
      ],
    ];

    return Container(
      padding: const EdgeInsets.all(DsSpacing.s1),
      decoration: BoxDecoration(
        color: ds.surfaceSunken,
        borderRadius: DsRadius.lgAll,
      ),
      child: expand
          ? Row(children: children)
          : SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: children),
            ),
    );
  }
}
