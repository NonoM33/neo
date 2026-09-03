import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Bandeau « mode client » — en haut des ecrans montres au client
/// (devis presente, signature, Ma Maison en demonstration).
///
/// Tant qu'il est affiche, aucune donnee interne (marge, prix d'achat, note
/// interne, SLA) ne doit etre visible a l'ecran.
class DsClientModeBanner extends StatelessWidget {
  const DsClientModeBanner({
    this.message = 'Mode client — les informations internes sont masquées',
    this.onExit,
    this.exitLabel = 'Quitter',
    super.key,
  });

  final String message;
  final VoidCallback? onExit;
  final String exitLabel;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DsSpacing.s4,
        vertical: DsSpacing.s2,
      ),
      decoration: BoxDecoration(
        color: ds.clientModeBanner,
        border: Border(
          bottom: BorderSide(color: ds.softBorder(ds.clientModeAccent, 0.4)),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            DsIcon(
              Icons.visibility_rounded,
              size: 20,
              color: ds.clientModeAccent,
            ),
            const SizedBox(width: DsSpacing.s2),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: t.labelSize,
                  fontWeight: DsWeight.semibold,
                  color: ds.isDark ? ds.textPrimary : const Color(0xFF00504A),
                ),
              ),
            ),
            if (onExit != null)
              TextButton.icon(
                onPressed: onExit,
                icon: DsIcon(
                  DsGlyph.exitClientMode,
                  size: 18,
                  color: ds.clientModeAccent,
                ),
                label: Text(
                  exitLabel,
                  style: TextStyle(color: ds.clientModeAccent),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
