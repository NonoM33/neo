import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Etat vide : icone + **valeur expliquee** + CTA.
///
/// « Liste vide » et « recherche vide » sont deux messages differents : ne jamais
/// reutiliser le meme texte pour les deux (brief §10).
class DsEmptyState extends StatelessWidget {
  const DsEmptyState({
    required this.title,
    this.description,
    this.icon = DsGlyph.inbox,
    this.action,
    this.secondaryAction,
    this.compact = false,
    super.key,
  });

  final String title;
  final String? description;
  final IconData icon;
  final Widget? action;
  final Widget? secondaryAction;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: DsSpacing.s6,
            vertical: compact ? DsSpacing.s6 : DsSpacing.s10,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: compact ? 52 : 68,
                height: compact ? 52 : 68,
                decoration: BoxDecoration(
                  color: ds.brandPrimarySoft,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: DsIcon(
                  icon,
                  size: compact ? 26 : 34,
                  color: ds.brandPrimary,
                ),
              ),
              const SizedBox(height: DsSpacing.s3),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: type.h3Size,
                  height: type.h3Line / type.h3Size,
                  fontWeight: DsWeight.semibold,
                  letterSpacing: -0.3,
                  color: ds.textPrimary,
                ),
              ),
              if (description != null) ...[
                const SizedBox(height: DsSpacing.s2),
                Text(
                  description!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: type.bodySize,
                    height: type.bodyLine / type.bodySize,
                    color: ds.textSecondary,
                  ),
                ),
              ],
              if (action != null || secondaryAction != null) ...[
                const SizedBox(height: DsSpacing.s5),
                Wrap(
                  spacing: DsSpacing.s2,
                  runSpacing: DsSpacing.s2,
                  alignment: WrapAlignment.center,
                  children: [
                    ?action,
                    ?secondaryAction,
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
