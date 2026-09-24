import 'package:flutter/material.dart';

import '../../../../core/theme/ds_theme.dart';
import '../../../../core/theme/ds_tokens.dart';
import '../core/ds_icon.dart';

/// Erreurs differenciees : reseau / serveur / local / permission / session.
///
/// Chacune est actionnable et ne culpabilise **jamais** l'utilisateur.
///
/// `server` est le cas par defaut : tout ce qui n'est pas reconnu y tombe.
/// Une session expiree s'y retrouvait, et l'app annoncait « Serveur
/// injoignable » alors que le serveur allait bien — d'ou le cas `session`.
enum DsErrorKind {
  network,
  server,
  local,
  permission,
  session;

  IconData get icon => switch (this) {
        DsErrorKind.network => Icons.wifi_off_rounded,
        DsErrorKind.server => Icons.dns_rounded,
        DsErrorKind.local => Icons.sd_card_alert_rounded,
        DsErrorKind.permission => Icons.lock_rounded,
        DsErrorKind.session => Icons.person_off_rounded,
      };

  Color color(DsColors ds) => switch (this) {
        DsErrorKind.network => ds.brandTertiary,
        DsErrorKind.server => ds.error,
        DsErrorKind.local => ds.error,
        DsErrorKind.permission => ds.brandTertiary,
        DsErrorKind.session => ds.brandTertiary,
      };

  String get title => switch (this) {
        DsErrorKind.network => 'Pas de réseau',
        DsErrorKind.server => 'Serveur injoignable',
        DsErrorKind.local => 'Données locales illisibles',
        DsErrorKind.permission => 'Autorisation refusée',
        DsErrorKind.session => 'Session expirée',
      };

  String get description => switch (this) {
        DsErrorKind.network =>
          'Vos saisies sont enregistrées sur l’appareil et partiront à la prochaine connexion.',
        DsErrorKind.server =>
          'Le serveur ne répond pas. Réessayez dans un instant.',
        DsErrorKind.local => 'Un enregistrement local n’a pas pu être ouvert.',
        DsErrorKind.permission =>
          'Autorisez l’accès dans les Réglages iOS pour continuer.',
        DsErrorKind.session =>
          'Reconnectez-vous pour retrouver vos données. Vos saisies locales sont conservées.',
      };

  /// Qualifie une exception remontee par le repository.
  static DsErrorKind fromMessage(String? message) {
    final m = (message ?? '').toLowerCase();
    // La session passe avant le reste : un 401 n'est pas une panne serveur.
    if (m.contains('token') ||
        m.contains('unauthorized') ||
        m.contains('non autorisé') ||
        m.contains('non autorise') ||
        m.contains('session') ||
        m.contains('401')) {
      return DsErrorKind.session;
    }
    if (m.contains('socket') ||
        m.contains('réseau') ||
        m.contains('reseau') ||
        m.contains('network') ||
        m.contains('connexion') ||
        m.contains('timeout')) {
      return DsErrorKind.network;
    }
    if (m.contains('permission') || m.contains('refus')) {
      return DsErrorKind.permission;
    }
    if (m.contains('hive') || m.contains('local') || m.contains('cache')) {
      return DsErrorKind.local;
    }
    return DsErrorKind.server;
  }
}

class DsErrorState extends StatelessWidget {
  const DsErrorState({
    this.kind = DsErrorKind.server,
    this.title,
    this.description,
    this.action,
    this.secondaryAction,
    this.inline = false,
    super.key,
  });

  final DsErrorKind kind;
  final String? title;
  final String? description;
  final Widget? action;
  final Widget? secondaryAction;

  /// Bandeau compact, en tete de contenu, plutot qu'un ecran plein.
  final bool inline;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final color = kind.color(ds);

    if (inline) {
      return Container(
        padding: const EdgeInsets.symmetric(
          horizontal: DsSpacing.s4,
          vertical: DsSpacing.s3,
        ),
        decoration: BoxDecoration(
          color: ds.soft(color, 0.10),
          borderRadius: DsRadius.mdAll,
          border: Border.all(color: ds.softBorder(color, 0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DsIcon(kind.icon, size: 22, color: color),
            const SizedBox(width: DsSpacing.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title ?? kind.title,
                    style: TextStyle(
                      fontSize: type.labelSize,
                      fontWeight: DsWeight.semibold,
                      color: ds.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  Text(
                    description ?? kind.description,
                    style: TextStyle(
                      fontSize: type.captionSize,
                      color: ds.textSecondary,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            if (action != null) ...[
              const SizedBox(width: DsSpacing.s3),
              action!,
            ],
          ],
        ),
      );
    }

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DsSpacing.s6,
            vertical: DsSpacing.s10,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: ds.soft(color),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: DsIcon(kind.icon, size: 34, color: color),
              ),
              const SizedBox(height: DsSpacing.s3),
              Text(
                title ?? kind.title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: type.h3Size,
                  fontWeight: DsWeight.semibold,
                  letterSpacing: -0.3,
                  color: ds.textPrimary,
                ),
              ),
              const SizedBox(height: DsSpacing.s2),
              Text(
                description ?? kind.description,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: type.bodySize,
                  height: type.bodyLine / type.bodySize,
                  color: ds.textSecondary,
                ),
              ),
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
