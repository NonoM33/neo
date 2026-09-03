import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import 'ds_nav_rail.dart' show DsNavItem;

/// Barre basse iPhone — **cinq entrees maximum**.
///
/// Au-dela de cinq, les libelles se compressent et les cibles tombent sous le
/// confort : les sections restantes vivent sous « Plus ».
/// La synchro n'est jamais ici, elle est dans l'app bar (`DsSyncIndicator`).
class DsBottomBar extends StatelessWidget {
  const DsBottomBar({
    required this.items,
    required this.activeId,
    required this.onSelected,
    super.key,
  }) : assert(items.length <= 5, 'Cinq entrées maximum en barre basse');

  final List<DsNavItem> items;
  final String activeId;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return Container(
      decoration: BoxDecoration(
        color: ds.surface1,
        border: Border(top: BorderSide(color: ds.borderSubtle)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              for (final item in items)
                Expanded(
                  child: _BottomEntry(
                    item: item,
                    active: item.id == activeId,
                    labelSize: type.badgeSize,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      onSelected(item.id);
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomEntry extends StatelessWidget {
  const _BottomEntry({
    required this.item,
    required this.active,
    required this.labelSize,
    required this.onTap,
  });

  final DsNavItem item;
  final bool active;
  final double labelSize;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final color = active ? ds.brandPrimary : ds.textSecondary;
    final icon = active ? (item.activeIcon ?? item.icon) : item.icon;

    return Semantics(
      button: true,
      selected: active,
      label: item.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: DsRadius.mdAll,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56,
              height: 30,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: active ? ds.surfaceSelected : Colors.transparent,
                borderRadius: DsRadius.fullAll,
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  DsIcon(icon, size: 24, color: color),
                  if (item.badge != null && item.badge! > 0)
                    Positioned(
                      top: -3,
                      right: -6,
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 15),
                        height: 15,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: ds.brandTertiary,
                          borderRadius: DsRadius.fullAll,
                        ),
                        child: Text(
                          '${item.badge!}',
                          style: TextStyle(
                            fontSize: labelSize - 2,
                            fontWeight: DsWeight.semibold,
                            color: Colors.white,
                            height: 1,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: labelSize,
                fontWeight: DsWeight.semibold,
                color: color,
                height: 1.1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
