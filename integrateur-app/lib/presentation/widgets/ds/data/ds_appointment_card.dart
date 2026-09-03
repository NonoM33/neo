import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_card.dart';
import '../core/ds_icon.dart';
import '../feedback/ds_status_badge.dart';

/// Types de rendez-vous — echelle **reconciliee** sur la palette de marque.
/// Les valeurs back-office (`#0d6efd`, `#6f42c1`…) ne doivent plus apparaitre.
enum DsAppointmentType {
  visiteTechnique('Visite technique', DsGlyph.engineering),
  audit('Audit', DsGlyph.checklist),
  commercial('RDV commercial', Icons.handshake_rounded),
  installation('Installation', DsGlyph.install),
  sav('SAV', DsGlyph.support),
  reunion('Réunion interne', Icons.groups_rounded),
  autre('Autre', DsGlyph.event);

  const DsAppointmentType(this.label, this.icon);
  final String label;
  final IconData icon;

  Color color(DsColors ds) => switch (this) {
        DsAppointmentType.visiteTechnique => ds.rdvVisiteTechnique,
        DsAppointmentType.audit => ds.rdvAudit,
        DsAppointmentType.commercial => ds.rdvCommercial,
        DsAppointmentType.installation => ds.rdvInstallation,
        DsAppointmentType.sav => ds.rdvSav,
        DsAppointmentType.reunion => ds.rdvReunion,
        DsAppointmentType.autre => ds.rdvAutre,
      };
}

/// Card rendez-vous — liste du jour et timeline.
class DsAppointmentCard extends StatelessWidget {
  const DsAppointmentCard({
    required this.type,
    required this.time,
    required this.clientName,
    this.duration,
    this.place,
    this.status,
    this.current = false,
    this.onTap,
    this.trailing,
    super.key,
  });

  final DsAppointmentType type;

  /// `09:30`.
  final String time;
  final String clientName;

  /// `120 min`.
  final String? duration;
  final String? place;
  final DsStatus? status;

  /// Rendez-vous en cours : bandeau accentue.
  final bool current;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final accent = type.color(ds);

    return DsCard(
      onTap: onTap,
      accent: current ? accent : null,
      semanticLabel: '${type.label} à $time avec $clientName',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 52,
            decoration: BoxDecoration(
              color: accent,
              borderRadius: DsRadius.fullAll,
            ),
          ),
          const SizedBox(width: DsSpacing.s3),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                time,
                style: TextStyle(
                  fontSize: t.numericSize,
                  fontWeight: DsWeight.semibold,
                  fontFeatures: dsTabularFigures,
                  color: ds.textPrimary,
                ),
              ),
              if (duration != null)
                Text(
                  duration!,
                  style: TextStyle(
                    fontSize: t.badgeSize,
                    color: ds.textSecondary,
                  ),
                ),
            ],
          ),
          const SizedBox(width: DsSpacing.s4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    DsIcon(type.icon, size: 16, color: accent),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        type.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: t.badgeSize,
                          fontWeight: DsWeight.semibold,
                          letterSpacing: 0.3,
                          color: accent,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  clientName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: t.titleSize,
                    fontWeight: DsWeight.semibold,
                    letterSpacing: -0.2,
                    color: ds.textPrimary,
                  ),
                ),
                if (place != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      DsIcon(
                        DsGlyph.location,
                        size: 15,
                        color: ds.textTertiary,
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          place!,
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
                if (status != null) ...[
                  const SizedBox(height: DsSpacing.s2),
                  DsStatusBadge(status: status!),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}
