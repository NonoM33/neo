import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_card.dart';
import '../core/ds_icon.dart';
import '../feedback/ds_priority_badge.dart';
import '../feedback/ds_status_badge.dart';

/// Card ticket de support.
class DsTicketCard extends StatelessWidget {
  const DsTicketCard({
    required this.number,
    required this.subject,
    required this.status,
    required this.priority,
    this.clientName,
    this.slaLabel,
    this.slaBreached = false,
    this.source,
    this.lastActivity,
    this.selected = false,
    this.onTap,
    super.key,
  });

  final String number;
  final String subject;
  final DsStatus status;
  final DsPriority priority;
  final String? clientName;

  /// « 1re réponse dans 2 h 10 ».
  final String? slaLabel;
  final bool slaBreached;
  final String? source;
  final String? lastActivity;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final slaColor = slaBreached ? ds.error : ds.textSecondary;

    return DsCard(
      onTap: onTap,
      selected: selected,
      semanticLabel: '$number, $subject, ${status.label}, ${priority.label}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Text(
                number,
                style: TextStyle(
                  fontSize: t.badgeSize,
                  fontWeight: DsWeight.semibold,
                  fontFeatures: dsTabularFigures,
                  letterSpacing: 0.4,
                  color: ds.textTertiary,
                ),
              ),
              const Spacer(),
              DsPriorityBadge(priority: priority),
            ],
          ),
          const SizedBox(height: DsSpacing.s2),
          Text(
            subject,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: t.titleSize,
              height: t.titleLine / t.titleSize,
              fontWeight: DsWeight.semibold,
              letterSpacing: -0.2,
              color: ds.textPrimary,
            ),
          ),
          if (clientName != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                DsIcon(DsGlyph.client, size: 15, color: ds.textTertiary),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    clientName!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: t.captionSize,
                      color: ds.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: DsSpacing.s3),
          Wrap(
            spacing: DsSpacing.s2,
            runSpacing: DsSpacing.s2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              DsStatusBadge(status: status),
              if (slaLabel != null)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DsIcon(
                      slaBreached ? DsGlyph.warning : DsGlyph.schedule,
                      size: 15,
                      color: slaColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      slaLabel!,
                      style: TextStyle(
                        fontSize: t.badgeSize,
                        fontWeight: DsWeight.semibold,
                        color: slaColor,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          if (source != null || lastActivity != null) ...[
            const SizedBox(height: DsSpacing.s2),
            Text(
              [
                ?source,
                ?lastActivity,
              ].join(' · '),
              style: TextStyle(
                fontSize: t.badgeSize,
                color: ds.textTertiary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
