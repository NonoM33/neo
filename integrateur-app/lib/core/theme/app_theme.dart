import 'package:flutter/material.dart';

import 'ds_theme.dart';

/// Couche de compatibilite au-dessus du Design System.
///
/// La source de verite est desormais `ds_tokens.dart` / `ds_theme.dart`.
/// Dans tout nouveau code, lire les couleurs via `context.ds` : elles suivent
/// alors le mode clair/sombre, ce que les constantes ci-dessous ne font pas.
abstract final class AppTheme {
  /// Theme clair (echelle typographique iPad par defaut ;
  /// `DsThemeScope` bascule sur l'echelle iPhone sous 600 pt).
  static ThemeData get lightTheme => DsTheme.light();

  static ThemeData get darkTheme => DsTheme.dark();

  // Marque.
  static const Color primaryColor = Color(0xFF1565C0);
  static const Color primaryStrongColor = Color(0xFF0D47A1);
  static const Color secondaryColor = Color(0xFF00897B);
  static const Color tertiaryColor = Color(0xFFF57C00);

  // Semantique fonctionnelle.
  static const Color successColor = Color(0xFF2E7D32);
  static const Color warningColor = Color(0xFFF9A825);
  static const Color errorColor = Color(0xFFC62828);
  static const Color infoColor = Color(0xFF039BE5);

  // Statuts projet / devis.
  static const Color statusBrouillon = Color(0xFF7E57C2);
  static const Color statusEnCours = Color(0xFF1E88E5);
  static const Color statusTermine = Color(0xFF43A047);
  static const Color statusArchive = Color(0xFF78909C);
  static const Color statusAudit = Color(0xFF8E24AA);
  static const Color statusDevisEnvoye = Color(0xFF039BE5);
  static const Color statusSigne = Color(0xFF2E7D32);
  static const Color statusRefuse = Color(0xFFC62828);
  static const Color statusExpire = Color(0xFF8D6E63);

  /// Equivalent sensible au mode courant de [statusEnCours] & co.
  static Color status(BuildContext context, Color lightValue) {
    final ds = context.ds;
    if (!ds.isDark) return lightValue;
    return switch (lightValue) {
      statusBrouillon => ds.statusBrouillon,
      statusEnCours => ds.statusEnCours,
      statusTermine => ds.statusTermine,
      statusArchive => ds.statusArchive,
      statusAudit => ds.statusAudit,
      statusDevisEnvoye => ds.statusDevisEnvoye,
      statusSigne => ds.statusSigne,
      statusRefuse => ds.statusRefuse,
      statusExpire => ds.statusExpire,
      successColor => ds.success,
      warningColor => ds.warning,
      errorColor => ds.error,
      infoColor => ds.info,
      tertiaryColor => ds.brandTertiary,
      secondaryColor => ds.brandSecondary,
      primaryColor => ds.brandPrimary,
      _ => lightValue,
    };
  }
}
