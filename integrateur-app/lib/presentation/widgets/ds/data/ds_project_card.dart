import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_card.dart';
import '../core/ds_icon.dart';
import '../feedback/ds_status_badge.dart';

/// Trois variantes : `list` (iPhone), `grid` (iPad portrait), `compact` (maitre-detail).
enum DsProjectCardVariant { list, grid, compact }

/// Card projet.
///
/// Ratio de card jamais inferieur a 1.4 en grille : l'ancien 2.4 etait trop plat.
class DsProjectCard extends StatelessWidget {
  const DsProjectCard({
    required this.projectName,
    required this.clientName,
    required this.status,
    this.address,
    this.dateLabel,
    this.progress,
    this.hasQuote = false,
    this.unsynced = false,
    this.variant = DsProjectCardVariant.list,
    this.selected = false,
    this.onTap,
    this.onLongPress,
    super.key,
  });

  final String projectName;
  final String clientName;
  final DsStatus status;
  final String? address;
  final String? dateLabel;

  /// Avancement de l'audit, en pourcentage.
  final int? progress;
  final bool hasQuote;

  /// Le projet n'est pas encore parti au serveur.
  final bool unsynced;
  final DsProjectCardVariant variant;
  final bool selected;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  String get _initials {
    final parts = clientName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    return parts.take(2).map((p) => p[0]).join().toUpperCase();
  }

  /// Hauteur reservee pour une carte, **selon sa variante**.
  ///
  /// La variante liste affiche en plus la date : reserver la hauteur de la
  /// variante grille la faisait deborder de 21 pt des que la grille tombait
  /// a une seule colonne.
  ///
  /// Derivee de l'echelle typographique : une valeur figee deborde des que le
  /// texte grandit (tablette, mode chantier, reglages d'accessibilite).
  static double extentFor(BuildContext context, DsProjectCardVariant variant) {
    final type = context.dsType;
    final base = DsSpacing.cardPadding * 2 // marges internes de la carte
        + 48 // en-tete (pastille initiales)
        + DsSpacing.s3 * 3 // espacements entre blocs
        + (type.badgeSize + 16) // rangee de badges
        + (type.captionSize + 6) // adresse
        + (type.captionSize + 16) // barre de progression
        + 4; // marge de securite

    if (variant == DsProjectCardVariant.list) {
      return base + DsSpacing.s2 + type.badgeSize + 6; // ligne de date
    }
    return base;
  }

  /// Raccourci pour la variante grille.
  static double gridExtent(BuildContext context) =>
      extentFor(context, DsProjectCardVariant.grid);

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final compact = variant == DsProjectCardVariant.compact;

    return DsCard(
      onTap: onTap,
      onLongPress: onLongPress,
      selected: selected,
      semanticLabel: '$projectName, $clientName, ${status.label}',
      padding: compact
          ? const EdgeInsets.symmetric(
              horizontal: DsSpacing.s4,
              vertical: DsSpacing.s3,
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: ds.brandPrimarySoft,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials,
                  style: TextStyle(
                    fontSize: type.titleSize,
                    fontWeight: DsWeight.semibold,
                    color: ds.brandPrimary,
                  ),
                ),
              ),
              const SizedBox(width: DsSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      projectName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: type.titleSize,
                        height: type.titleLine / type.titleSize,
                        fontWeight: DsWeight.semibold,
                        letterSpacing: -0.2,
                        color: ds.textPrimary,
                      ),
                    ),
                    Text(
                      clientName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: type.captionSize,
                        color: ds.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (unsynced) _LocalBadge(),
            ],
          ),
          if (!compact) ...[
            const SizedBox(height: DsSpacing.s3),
            Wrap(
              spacing: DsSpacing.s2,
              runSpacing: DsSpacing.s2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                DsStatusBadge(status: status),
                if (hasQuote)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DsIcon(DsGlyph.quote, size: 15, color: ds.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        'Devis',
                        style: TextStyle(
                          fontSize: type.badgeSize,
                          fontWeight: DsWeight.semibold,
                          color: ds.textSecondary,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            if (address != null) ...[
              const SizedBox(height: DsSpacing.s3),
              Row(
                children: [
                  DsIcon(DsGlyph.location, size: 16, color: ds.textTertiary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      address!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: type.captionSize,
                        color: ds.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            if (progress != null) ...[
              const SizedBox(height: DsSpacing.s3),
              _ProgressRow(percent: progress!),
            ],
            if (dateLabel != null &&
                variant != DsProjectCardVariant.grid) ...[
              const SizedBox(height: DsSpacing.s2),
              Text(
                dateLabel!,
                style: TextStyle(
                  fontSize: type.badgeSize,
                  color: ds.textTertiary,
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _ProgressRow extends StatelessWidget {
  const _ProgressRow({required this.percent});

  final int percent;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final color = percent >= 100 ? ds.success : ds.brandPrimary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Audit',
              style: TextStyle(
                fontSize: type.badgeSize,
                fontWeight: DsWeight.semibold,
                color: ds.textSecondary,
              ),
            ),
            Text(
              '$percent %',
              style: TextStyle(
                fontSize: type.badgeSize,
                fontWeight: DsWeight.semibold,
                fontFeatures: dsTabularFigures,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: DsRadius.fullAll,
          child: LinearProgressIndicator(
            value: (percent / 100).clamp(0, 1),
            minHeight: 6,
            backgroundColor: ds.surfaceSunken,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

class _LocalBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Tooltip(
      message: 'Non synchronisé — partira à la reconnexion',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: ds.soft(ds.syncOffline, 0.16),
          borderRadius: DsRadius.badgeAll,
          border: Border.all(color: ds.softBorder(ds.syncOffline)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            DsIcon(DsGlyph.cloudUpload, size: 15, color: ds.syncOffline),
            const SizedBox(width: 4),
            Text(
              'Local',
              style: TextStyle(
                fontSize: context.dsType.badgeSize,
                fontWeight: DsWeight.semibold,
                color: ds.syncOffline,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
