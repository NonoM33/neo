import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';
import 'ds_status_badge.dart' show DsBadgeSize, DsBadgeTone;

/// Priorites ticket — couleur + icone + libelle, jamais la couleur seule.
enum DsPriority {
  basse,
  normale,
  haute,
  urgente,
  critique;

  String get label => switch (this) {
        DsPriority.basse => 'Basse',
        DsPriority.normale => 'Normale',
        DsPriority.haute => 'Haute',
        DsPriority.urgente => 'Urgente',
        DsPriority.critique => 'Critique',
      };

  IconData get icon => switch (this) {
        DsPriority.basse => Icons.keyboard_arrow_down_rounded,
        DsPriority.normale => Icons.remove_rounded,
        DsPriority.haute => Icons.keyboard_arrow_up_rounded,
        DsPriority.urgente => Icons.keyboard_double_arrow_up_rounded,
        DsPriority.critique => Icons.priority_high_rounded,
      };

  Color color(DsColors ds) => switch (this) {
        DsPriority.basse => ds.priorityBasse,
        DsPriority.normale => ds.priorityNormale,
        DsPriority.haute => ds.priorityHaute,
        DsPriority.urgente => ds.priorityUrgente,
        DsPriority.critique => ds.priorityCritique,
      };
}

class DsPriorityBadge extends StatelessWidget {
  const DsPriorityBadge({
    required this.priority,
    this.tone = DsBadgeTone.soft,
    this.size = DsBadgeSize.medium,
    super.key,
  });

  final DsPriority priority;
  final DsBadgeTone tone;
  final DsBadgeSize size;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final color = priority.color(ds);
    final solid = tone == DsBadgeTone.solid;
    final large = size == DsBadgeSize.large;
    final onSolid = ds.isDark ? ds.surfaceBase : Colors.white;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: large ? 12 : 9,
        vertical: large ? 6 : 4,
      ),
      decoration: BoxDecoration(
        color: solid ? color : ds.soft(color),
        borderRadius: DsRadius.badgeAll,
        border: Border.all(
          color: solid ? Colors.transparent : ds.softBorder(color),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DsIcon(
            priority.icon,
            size: large ? 18 : 15,
            color: solid ? onSolid : color,
          ),
          const SizedBox(width: 4),
          Text(
            priority.label,
            style: TextStyle(
              fontSize:
                  large ? context.dsType.labelSize : context.dsType.badgeSize,
              fontWeight: DsWeight.semibold,
              letterSpacing: 0.3,
              color: solid ? onSolid : color,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}
