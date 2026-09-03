import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Etats du scan de piece. **Chaque etat propose une sortie : jamais un cul-de-sac.**
enum DsScanState {
  /// LiDAR disponible sur cet appareil.
  available,

  /// Appareil sans LiDAR — proposer l'iPhone ou le dessin manuel.
  unsupported,

  /// Scan en cours.
  scanning,

  /// Session deleguee a un iPhone, en attente.
  waiting,

  /// Plan importe.
  done,

  /// Echec du scan.
  failed;

  IconData get icon => switch (this) {
        DsScanState.available => DsGlyph.scan3d,
        DsScanState.unsupported => Icons.no_photography_rounded,
        DsScanState.scanning => DsGlyph.scan3d,
        DsScanState.waiting => DsGlyph.qr,
        DsScanState.done => DsGlyph.checkCircle,
        DsScanState.failed => DsGlyph.warning,
      };

  String get title => switch (this) {
        DsScanState.available => 'Scanner la pièce en 3D',
        DsScanState.unsupported => 'Scan 3D indisponible sur cet appareil',
        DsScanState.scanning => 'Scan en cours…',
        DsScanState.waiting => 'En attente de l’iPhone',
        DsScanState.done => 'Plan importé',
        DsScanState.failed => 'Le scan n’a pas abouti',
      };

  String get description => switch (this) {
        DsScanState.available =>
          'Relevez les murs et les ouvertures en quelques secondes.',
        DsScanState.unsupported =>
          'Le LiDAR nécessite un iPad Pro ou un iPhone Pro. Deux autres chemins restent ouverts.',
        DsScanState.scanning =>
          'Balayez lentement la pièce, murs puis ouvertures.',
        DsScanState.waiting =>
          'Scannez le QR code avec l’iPhone : le plan arrivera ici automatiquement.',
        DsScanState.done => 'Vous pouvez placer les équipements sur le plan.',
        DsScanState.failed =>
          'Reprenez le scan, ou dessinez le plan à la main.',
      };

  Color color(DsColors ds) => switch (this) {
        DsScanState.available => ds.brandPrimary,
        DsScanState.unsupported => ds.brandTertiary,
        DsScanState.scanning => ds.brandPrimary,
        DsScanState.waiting => ds.brandSecondary,
        DsScanState.done => ds.success,
        DsScanState.failed => ds.error,
      };
}

/// Bandeau de scan de piece (LiDAR, delegation iPhone via QR, dessin manuel).
class DsScanBanner extends StatelessWidget {
  const DsScanBanner({
    required this.state,
    this.title,
    this.description,
    this.actions = const <Widget>[],
    this.progress,
    super.key,
  });

  final DsScanState state;
  final String? title;
  final String? description;
  final List<Widget> actions;

  /// 0 a 1 pendant un scan.
  final double? progress;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final color = state.color(ds);

    return Container(
      padding: const EdgeInsets.all(DsSpacing.cardPadding),
      decoration: BoxDecoration(
        color: ds.soft(color, 0.08),
        borderRadius: DsRadius.cardAll,
        border: Border.all(color: ds.softBorder(color, 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: ds.soft(color, 0.16),
                  borderRadius: DsRadius.mdAll,
                ),
                alignment: Alignment.center,
                child: DsIcon(state.icon, size: 24, color: color),
              ),
              const SizedBox(width: DsSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title ?? state.title,
                      style: TextStyle(
                        fontSize: t.titleSize,
                        fontWeight: DsWeight.semibold,
                        letterSpacing: -0.2,
                        color: ds.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description ?? state.description,
                      style: TextStyle(
                        fontSize: t.captionSize,
                        height: 1.4,
                        color: ds.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (state == DsScanState.scanning) ...[
            const SizedBox(height: DsSpacing.s4),
            ClipRRect(
              borderRadius: DsRadius.fullAll,
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 6,
                backgroundColor: ds.surfaceSunken,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
          ],
          if (actions.isNotEmpty) ...[
            const SizedBox(height: DsSpacing.s4),
            Wrap(
              spacing: DsSpacing.s2,
              runSpacing: DsSpacing.s2,
              children: actions,
            ),
          ],
        ],
      ),
    );
  }
}
