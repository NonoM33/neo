import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

@immutable
class DsNavItem {
  const DsNavItem({
    required this.id,
    required this.label,
    required this.icon,
    this.activeIcon,
    this.badge,
  });

  final String id;
  final String label;
  final IconData icon;

  /// Variante pleine, reservee a l'etat selectionne.
  final IconData? activeIcon;
  final int? badge;
}

/// Rail iPad — 6 entrees maximum, synchro et compte toujours en pied.
///
/// `expanded` seulement au-dela de 1200 pt ; en dessous le rail reste compact
/// avec le libelle sous l'icone.
class DsNavRail extends StatelessWidget {
  const DsNavRail({
    required this.items,
    required this.activeId,
    required this.onSelected,
    this.expanded = false,
    this.syncSlot,
    this.helpSlot,
    this.accountName,
    this.accountRole,
    this.onAccountTap,
    super.key,
  });

  final List<DsNavItem> items;
  final String activeId;
  final ValueChanged<String> onSelected;
  final bool expanded;
  final Widget? syncSlot;

  /// Entree d'aide / signalement, logee dans le pied du rail.
  ///
  /// Elle vit ici et non en bouton flottant : un element flottant finit
  /// toujours par recouvrir une zone tactile du contenu.
  final Widget? helpSlot;

  final String? accountName;
  final String? accountRole;
  final VoidCallback? onAccountTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final width = expanded ? DsSpacing.railExpanded : DsSpacing.railCompact;

    return Container(
      width: width,
      decoration: BoxDecoration(
        color: ds.surface1,
        border: Border(right: BorderSide(color: ds.borderSubtle)),
      ),
      child: SafeArea(
        right: false,
        child: Column(
          children: [
            const SizedBox(height: DsSpacing.s6),
            _Monogram(expanded: expanded),
            const SizedBox(height: DsSpacing.s6),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s2),
                children: [
                  for (final item in items)
                    _RailEntry(
                      item: item,
                      active: item.id == activeId,
                      expanded: expanded,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        onSelected(item.id);
                      },
                    ),
                ],
              ),
            ),
            if (helpSlot != null)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: DsSpacing.s3,
                  vertical: DsSpacing.s1,
                ),
                child: helpSlot!,
              ),
            if (syncSlot != null)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: DsSpacing.s3,
                  vertical: DsSpacing.s2,
                ),
                child: syncSlot!,
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                DsSpacing.s2,
                DsSpacing.s2,
                DsSpacing.s2,
                DsSpacing.s5,
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: DsRadius.mdAll,
                child: InkWell(
                  onTap: onAccountTap,
                  borderRadius: DsRadius.mdAll,
                  child: Container(
                    constraints: const BoxConstraints(
                      minHeight: DsSpacing.targetMin,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: DsSpacing.s2,
                      vertical: DsSpacing.s2,
                    ),
                    child: Row(
                      mainAxisAlignment: expanded
                          ? MainAxisAlignment.start
                          : MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: ds.brandPrimarySoft,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            _initials(accountName),
                            style: TextStyle(
                              fontSize: type.badgeSize,
                              fontWeight: DsWeight.semibold,
                              color: ds.brandPrimary,
                            ),
                          ),
                        ),
                        if (expanded) ...[
                          const SizedBox(width: DsSpacing.s2),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  accountName ?? 'Mon compte',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: type.labelSize,
                                    fontWeight: DsWeight.semibold,
                                    color: ds.textPrimary,
                                  ),
                                ),
                                if (accountRole != null)
                                  Text(
                                    accountRole!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: type.badgeSize,
                                      color: ds.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return 'NI';
    final parts = name.trim().split(RegExp(r'\s+'));
    final letters = parts.take(2).map((p) => p[0]).join();
    return letters.toUpperCase();
  }
}

/// Aucun logo n'a ete fourni par la marque : le nom est compose en type,
/// et le rail porte le monogramme « NI » sur le gradient de marque.
/// **Ne pas dessiner de logo** — demander le fichier a l'equipe.
class _Monogram extends StatelessWidget {
  const _Monogram({required this.expanded});

  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    final mark = Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        gradient: ds.gradientBrand,
        borderRadius: DsRadius.mdAll,
      ),
      alignment: Alignment.center,
      child: const Text(
        'NI',
        style: TextStyle(
          fontSize: 17,
          fontWeight: DsWeight.semibold,
          letterSpacing: 0.5,
          color: Colors.white,
        ),
      ),
    );

    if (!expanded) return mark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s3),
      child: Row(
        children: [
          mark,
          const SizedBox(width: DsSpacing.s3),
          Expanded(
            child: Text(
              'Neo Intégrateur',
              maxLines: 2,
              style: TextStyle(
                fontSize: type.labelSize,
                fontWeight: DsWeight.light,
                letterSpacing: 0.2,
                color: ds.textPrimary,
                height: 1.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RailEntry extends StatelessWidget {
  const _RailEntry({
    required this.item,
    required this.active,
    required this.expanded,
    required this.onTap,
  });

  final DsNavItem item;
  final bool active;
  final bool expanded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final color = active ? ds.brandPrimary : ds.textSecondary;
    final icon = active ? (item.activeIcon ?? item.icon) : item.icon;

    return Padding(
      padding: const EdgeInsets.only(bottom: DsSpacing.s1),
      child: Semantics(
        button: true,
        selected: active,
        label: item.label,
        child: Tooltip(
          message: expanded ? '' : item.label,
          child: Material(
            color: active ? ds.surfaceSelected : Colors.transparent,
            borderRadius: DsRadius.mdAll,
            child: InkWell(
              onTap: onTap,
              borderRadius: DsRadius.mdAll,
              child: Container(
                constraints: BoxConstraints(
                  minHeight: expanded ? DsSpacing.targetIdeal : 64,
                ),
                padding: EdgeInsets.symmetric(
                  horizontal: expanded ? DsSpacing.s3 : DsSpacing.s1,
                  vertical: DsSpacing.s2,
                ),
                child: expanded
                    ? Row(
                        children: [
                          _EntryIcon(icon: icon, color: color, badge: item.badge),
                          const SizedBox(width: DsSpacing.s3),
                          Expanded(
                            child: Text(
                              item.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: type.labelSize,
                                fontWeight: DsWeight.semibold,
                                color: color,
                              ),
                            ),
                          ),
                        ],
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _EntryIcon(icon: icon, color: color, badge: item.badge),
                          const SizedBox(height: 4),
                          Text(
                            item.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: type.badgeSize,
                              fontWeight: DsWeight.semibold,
                              color: color,
                              height: 1.15,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EntryIcon extends StatelessWidget {
  const _EntryIcon({required this.icon, required this.color, this.badge});

  final IconData icon;
  final Color color;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        DsIcon(icon, size: 26, color: color),
        if (badge != null && badge! > 0)
          Positioned(
            top: -4,
            right: -6,
            child: Container(
              constraints: const BoxConstraints(minWidth: 16),
              height: 16,
              padding: const EdgeInsets.symmetric(horizontal: 4),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: ds.brandTertiary,
                borderRadius: DsRadius.fullAll,
              ),
              child: Text(
                '${badge!}',
                style: TextStyle(
                  fontSize: context.dsType.badgeSize - 1,
                  fontWeight: DsWeight.semibold,
                  color: Colors.white,
                  height: 1,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
