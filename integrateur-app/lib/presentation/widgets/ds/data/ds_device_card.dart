import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_card.dart';
import '../core/ds_icon.dart';

/// Domaines Home Assistant pilotes par l'app.
enum DsDeviceDomain {
  light('Lumière', DsGlyph.light),
  switchDevice('Interrupteur', DsGlyph.switchDevice),
  cover('Volet', DsGlyph.blinds),
  climate('Climatisation', DsGlyph.thermostat),
  fan('Ventilateur', DsGlyph.fan),
  lock('Serrure', DsGlyph.lock),
  alarm('Alarme', DsGlyph.security),
  camera('Caméra', DsGlyph.camera),
  sensor('Capteur', DsGlyph.sensor),
  media('Média', DsGlyph.media),
  scene('Scène', DsGlyph.scene);

  const DsDeviceDomain(this.label, this.icon);
  final String label;
  final IconData icon;

  static DsDeviceDomain fromHaDomain(String domain) => switch (domain) {
        'light' => DsDeviceDomain.light,
        'switch' => DsDeviceDomain.switchDevice,
        'cover' => DsDeviceDomain.cover,
        'climate' => DsDeviceDomain.climate,
        'fan' => DsDeviceDomain.fan,
        'lock' => DsDeviceDomain.lock,
        'alarm_control_panel' => DsDeviceDomain.alarm,
        'camera' => DsDeviceDomain.camera,
        'media_player' => DsDeviceDomain.media,
        'scene' => DsDeviceDomain.scene,
        _ => DsDeviceDomain.sensor,
      };
}

/// Card appareil Home Assistant.
///
/// C'est l'ecran le plus « grand public » de l'app : il peut etre montre au client.
class DsDeviceCard extends StatelessWidget {
  const DsDeviceCard({
    required this.domain,
    required this.name,
    required this.state,
    this.room,
    this.on = false,
    this.level,
    this.unavailable = false,
    this.onTap,
    this.onToggle,
    this.trailing,
    super.key,
  });

  final DsDeviceDomain domain;
  final String name;

  /// Etat lisible : « Allumé », « Ouvert à 40 % », « Indisponible ».
  final String state;
  final String? room;
  final bool on;

  /// Luminosite ou position, 0 a 100.
  final int? level;
  final bool unavailable;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onToggle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final accent = unavailable
        ? ds.textTertiary
        : on
            ? ds.brandTertiary
            : ds.textSecondary;

    return DsCard(
      onTap: unavailable ? null : onTap,
      accent: on && !unavailable ? ds.brandTertiary : null,
      semanticLabel: '$name, $state',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: ds.soft(accent, on && !unavailable ? 0.16 : 0.08),
                  borderRadius: DsRadius.mdAll,
                ),
                alignment: Alignment.center,
                child: DsIcon(domain.icon, size: 24, color: accent),
              ),
              const SizedBox(width: DsSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: t.titleSize,
                        fontWeight: DsWeight.semibold,
                        letterSpacing: -0.2,
                        color: unavailable ? ds.textSecondary : ds.textPrimary,
                      ),
                    ),
                    Text(
                      room == null ? state : '$room · $state',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: t.captionSize,
                        color: ds.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (trailing != null)
                trailing!
              else if (onToggle != null && !unavailable)
                Switch(value: on, onChanged: onToggle),
            ],
          ),
          if (level != null && !unavailable) ...[
            const SizedBox(height: DsSpacing.s3),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: DsRadius.fullAll,
                    child: LinearProgressIndicator(
                      value: (level! / 100).clamp(0, 1),
                      minHeight: 8,
                      backgroundColor: ds.surfaceSunken,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        on ? ds.brandTertiary : ds.brandPrimary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: DsSpacing.s3),
                Text(
                  '$level %',
                  style: TextStyle(
                    fontSize: t.labelSize,
                    fontWeight: DsWeight.semibold,
                    fontFeatures: dsTabularFigures,
                    color: ds.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
