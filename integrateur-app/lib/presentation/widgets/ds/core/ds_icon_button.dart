import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import 'ds_icon.dart';

/// Bouton-icone. `label` est **obligatoire** : c'est le libelle VoiceOver et le
/// tooltip. La cible fait 48 dp (56 en `large`), quelle que soit la taille du glyphe.
class DsIconButton extends StatelessWidget {
  const DsIconButton({
    required this.icon,
    required this.label,
    this.onPressed,
    this.badge,
    this.active = false,
    this.large = false,
    this.tone,
    this.filled = false,
    this.haptic = true,
    super.key,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  /// Pastille de compteur (elements en attente, notifications).
  final int? badge;

  /// Etat selectionne (favori actif, filtre actif).
  final bool active;
  final bool large;
  final Color? tone;

  /// Fond tinte plutot que transparent.
  final bool filled;
  final bool haptic;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final side = large ? DsSpacing.targetIdeal : DsSpacing.targetMin;
    final color = tone ?? (active ? ds.brandPrimary : ds.textSecondary);

    return Tooltip(
      message: label,
      child: Semantics(
        button: true,
        label: label,
        selected: active,
        child: SizedBox.square(
          dimension: side,
          child: Material(
            color: filled ? ds.soft(color, 0.12) : Colors.transparent,
            borderRadius: DsRadius.mdAll,
            child: InkWell(
              onTap: onPressed == null
                  ? null
                  : () {
                      if (haptic) HapticFeedback.selectionClick();
                      onPressed!.call();
                    },
              borderRadius: DsRadius.mdAll,
              hoverColor: ds.hoverOverlay,
              highlightColor: ds.pressedOverlay,
              child: Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none,
                children: [
                  Opacity(
                    opacity: onPressed == null ? 0.42 : 1,
                    child: DsIcon(icon, size: large ? 26 : 22, color: color),
                  ),
                  if (badge != null && badge! > 0)
                    Positioned(
                      top: large ? 8 : 6,
                      right: large ? 8 : 5,
                      child: _Badge(count: badge!),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return Container(
      constraints: const BoxConstraints(minWidth: 18),
      height: 18,
      padding: const EdgeInsets.symmetric(horizontal: 5),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: ds.brandTertiary,
        borderRadius: DsRadius.fullAll,
        border: Border.all(color: ds.surface1, width: 1.5),
      ),
      child: Text(
        count > 99 ? '99+' : '$count',
        style: TextStyle(
          fontSize: context.dsType.badgeSize,
          fontWeight: DsWeight.semibold,
          color: Colors.white,
          height: 1,
        ),
      ),
    );
  }
}
