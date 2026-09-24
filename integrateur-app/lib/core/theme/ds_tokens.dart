/// Design tokens — Neo Integrateur Design System.
///
/// Port Dart 1:1 des tokens CSS du projet Claude Design
/// « Neo Intégrateur Design System » (`tokens/*.css`).
///
/// Regles structurantes :
/// - neutres teintes bleu, jamais gris pur (clair comme sombre) ;
/// - style flat assume : elevation 0, la profondeur vient de la bordure ;
/// - fonds de badges opaques (color-mix) et jamais alpha(20) : lisibilite plein soleil ;
/// - deux echelles typographiques distinctes iPhone / iPad ;
/// - planchers durs : corps >= 14, label/badge >= 12 ; cibles 48 dp (56 ideal).
library;

import 'package:flutter/material.dart';

/// Melange [top] sur [bottom] a [amount] (0..1) — equivalent de `color-mix(in srgb, …)`.
Color dsMix(Color top, Color bottom, double amount) =>
    Color.alphaBlend(top.withAlpha((amount * 255).round()), bottom);

/// Densite d'affichage deduite de la largeur disponible.
enum DsDevice {
  /// iPhone (< 600).
  phone,

  /// iPad portrait / Split View large (600 – 1199).
  tablet,

  /// iPad paysage / iPad Pro (>= 1200).
  desktop;

  static DsDevice fromWidth(double width) {
    if (width >= DsBreakpoints.desktop) return DsDevice.desktop;
    if (width >= DsBreakpoints.mobile) return DsDevice.tablet;
    return DsDevice.phone;
  }

  static DsDevice of(BuildContext context) =>
      fromWidth(MediaQuery.sizeOf(context).width);

  bool get isPhone => this == DsDevice.phone;
  bool get isTabletOrLarger => this != DsDevice.phone;
  bool get isDesktop => this == DsDevice.desktop;
}

/// Breakpoints de reference (brief §5.7).
abstract final class DsBreakpoints {
  static const double mobile = 600;
  static const double tablet = 900;
  static const double desktop = 1200;
}

/// Grille 8 dp, demi-pas 4 dp.
abstract final class DsSpacing {
  static const double s0 = 0;
  static const double s1 = 4;
  static const double s2 = 8;
  static const double s3 = 12;
  static const double s4 = 16;
  static const double s5 = 20;
  static const double s6 = 24;
  static const double s8 = 32;
  static const double s10 = 40;
  static const double s12 = 48;
  static const double s16 = 64;

  /// Padding de page decline par device (le 32 dp unique etait trop large sur iPhone).
  static const double pagePaddingPhone = 16;
  static const double pagePaddingTablet = 24;
  static const double pagePaddingDesktop = 32;

  static const double cardPadding = 20;
  static const double cardPaddingLarge = 24;
  static const double gapCard = 16;
  static const double gapSection = 32;
  static const double gapInline = 8;

  /// Cibles tactiles — plancher 48, ideal 56, 44 tolere pour un stepper.
  static const double targetMin = 48;
  static const double targetIdeal = 56;
  static const double targetStepper = 44;
  static const double targetGapMin = 8;

  /// Chrome.
  static const double railCompact = 80;
  static const double railExpanded = 220;
  static const double bottomBarHeight = 56;
  static const double appBarHeight = 56;
  static const double sheetMaxHeight = 640;
  static const double dialogMinWidth = 400;
  static const double dialogMaxWidth = 560;

  /// Proportion de la colonne liste dans un maitre-detail.
  static const double panelListRatio = 0.35;

  static double pagePadding(DsDevice device) => switch (device) {
        DsDevice.phone => pagePaddingPhone,
        DsDevice.tablet => pagePaddingTablet,
        DsDevice.desktop => pagePaddingDesktop,
      };

  static EdgeInsets page(DsDevice device) =>
      EdgeInsets.all(pagePadding(device));

  static EdgeInsets pageHorizontal(DsDevice device) =>
      EdgeInsets.symmetric(horizontal: pagePadding(device));
}

/// Rayons — cards 16, dialogs/sheets 24, boutons 12.
abstract final class DsRadius {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double full = 999;

  static const double card = lg;
  static const double button = md;
  static const double field = md;
  static const double dialog = xxl;
  static const double sheet = xxl;
  static const double badge = sm;
  static const double thumb = md;

  static BorderRadius get xsAll => BorderRadius.circular(xs);
  static BorderRadius get smAll => BorderRadius.circular(sm);
  static BorderRadius get mdAll => BorderRadius.circular(md);
  static BorderRadius get lgAll => BorderRadius.circular(lg);
  static BorderRadius get xlAll => BorderRadius.circular(xl);
  static BorderRadius get xxlAll => BorderRadius.circular(xxl);
  static BorderRadius get fullAll => BorderRadius.circular(full);
  static BorderRadius get cardAll => BorderRadius.circular(card);
  static BorderRadius get buttonAll => BorderRadius.circular(button);
  static BorderRadius get badgeAll => BorderRadius.circular(badge);
  static BorderRadius get sheetTop =>
      const BorderRadius.vertical(top: Radius.circular(sheet));
}

/// Mouvement — trois durees, trois courbes, et rien d'autre.
abstract final class DsMotion {
  static const Duration enter = Duration(milliseconds: 220);
  static const Duration exit = Duration(milliseconds: 160);
  static const Duration transform = Duration(milliseconds: 300);

  static const Curve easeEnter = Cubic(0.2, 0, 0, 1);
  static const Curve easeExit = Cubic(0.4, 0, 1, 1);
  static const Curve easeTransform = Cubic(0.2, 0, 0, 1);

  /// Echelle de l'etat presse. Pas de rebond, pas d'elastique.
  static const double pressScale = 0.97;

  /// Respecte `prefers-reduced-motion` (durees a 1 ms, plus de scale).
  static bool reducedMotion(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context);

  static Duration duration(BuildContext context, Duration value) =>
      reducedMotion(context) ? const Duration(milliseconds: 1) : value;

  static double pressScaleOf(BuildContext context) =>
      reducedMotion(context) ? 1 : pressScale;
}

/// Une echelle typographique (iPhone ou iPad).
@immutable
class DsTypeScale {
  const DsTypeScale({
    required this.displaySize,
    required this.displayLine,
    required this.displayLs,
    required this.h1Size,
    required this.h1Line,
    required this.h2Size,
    required this.h2Line,
    required this.h3Size,
    required this.h3Line,
    required this.titleSize,
    required this.titleLine,
    required this.bodySize,
    required this.bodyLine,
    required this.bodyLgSize,
    required this.bodyLgLine,
    required this.labelSize,
    required this.labelLine,
    required this.badgeSize,
    required this.badgeLine,
    required this.captionSize,
    required this.captionLine,
    required this.numericSize,
  });

  final double displaySize;
  final double displayLine;
  final double displayLs;
  final double h1Size;
  final double h1Line;
  final double h2Size;
  final double h2Line;
  final double h3Size;
  final double h3Line;
  final double titleSize;
  final double titleLine;
  final double bodySize;
  final double bodyLine;
  final double bodyLgSize;
  final double bodyLgLine;
  final double labelSize;
  final double labelLine;
  final double badgeSize;
  final double badgeLine;
  final double captionSize;
  final double captionLine;
  final double numericSize;

  /// Echelle iPhone (375–440 pt).
  static const DsTypeScale phone = DsTypeScale(
    displaySize: 34,
    displayLine: 40,
    displayLs: -1,
    h1Size: 28,
    h1Line: 34,
    h2Size: 22,
    h2Line: 28,
    h3Size: 18,
    h3Line: 24,
    titleSize: 17,
    titleLine: 22,
    bodySize: 15,
    bodyLine: 22,
    bodyLgSize: 17,
    bodyLgLine: 25,
    labelSize: 13,
    labelLine: 18,
    badgeSize: 12,
    badgeLine: 16,
    captionSize: 13,
    captionLine: 18,
    numericSize: 17,
  );

  /// Echelle iPad.
  static const DsTypeScale tablet = DsTypeScale(
    displaySize: 45,
    displayLine: 52,
    displayLs: -1.2,
    h1Size: 34,
    h1Line: 41,
    h2Size: 28,
    h2Line: 35,
    h3Size: 22,
    h3Line: 29,
    titleSize: 20,
    titleLine: 26,
    bodySize: 16,
    bodyLine: 24,
    bodyLgSize: 18,
    bodyLgLine: 27,
    labelSize: 14,
    labelLine: 19,
    badgeSize: 12,
    badgeLine: 16,
    captionSize: 14,
    captionLine: 20,
    numericSize: 20,
  );

  static DsTypeScale forDevice(DsDevice device, {bool chantier = false}) {
    final scale = device.isPhone ? phone : tablet;
    return chantier ? scale.chantier() : scale;
  }

  /// Mode chantier — corps 17, label 15, badge 14 (brief §11).
  DsTypeScale chantier() => DsTypeScale(
        displaySize: displaySize,
        displayLine: displayLine,
        displayLs: displayLs,
        h1Size: h1Size,
        h1Line: h1Line,
        h2Size: h2Size,
        h2Line: h2Line,
        h3Size: h3Size,
        h3Line: h3Line,
        titleSize: titleSize,
        titleLine: titleLine,
        bodySize: 17,
        bodyLine: 25,
        bodyLgSize: bodyLgSize,
        bodyLgLine: bodyLgLine,
        labelSize: 15,
        labelLine: 20,
        badgeSize: 14,
        badgeLine: 18,
        captionSize: 15,
        captionLine: 21,
        numericSize: numericSize,
      );

  static DsTypeScale of(BuildContext context) {
    // L'echelle appliquee par DsThemeScope fait foi (elle porte le mode chantier).
    final body = Theme.of(context).textTheme.bodyMedium?.fontSize;
    final base = forDevice(DsDevice.of(context));
    if (body == null || body == base.bodySize) return base;
    return forDevice(DsDevice.of(context), chantier: true);
  }
}

/// Graisses.
abstract final class DsWeight {
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semibold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
}

/// Chiffres a chasse fixe — obligatoire sur tout montant, quantite, compteur.
const List<FontFeature> dsTabularFigures = <FontFeature>[
  FontFeature.tabularFigures(),
];

/// Palette semantique complete, exposee comme `ThemeExtension`.
///
/// Usage : `final ds = Theme.of(context).ds;` (voir `ds_theme.dart`).
@immutable
class DsColors extends ThemeExtension<DsColors> {
  const DsColors({
    required this.brightness,
    required this.brandPrimary,
    required this.brandPrimaryStrong,
    required this.brandPrimarySoft,
    required this.brandSecondary,
    required this.brandSecondarySoft,
    required this.brandTertiary,
    required this.brandTertiarySoft,
    required this.success,
    required this.successSoft,
    required this.warning,
    required this.warningSoft,
    required this.error,
    required this.errorSoft,
    required this.info,
    required this.infoSoft,
    required this.surfaceBase,
    required this.surface1,
    required this.surface2,
    required this.surface3,
    required this.surface4,
    required this.surface5,
    required this.surfaceSunken,
    required this.surfaceSelected,
    required this.textPrimary,
    required this.textBody,
    required this.textSecondary,
    required this.textTertiary,
    required this.textOnBrand,
    required this.textOnTooltip,
    required this.textLink,
    required this.borderSubtle,
    required this.borderDefault,
    required this.borderStrong,
    required this.borderFocus,
    required this.statusBrouillon,
    required this.statusEnCours,
    required this.statusTermine,
    required this.statusArchive,
    required this.statusAudit,
    required this.statusDevisEnvoye,
    required this.statusSigne,
    required this.statusRefuse,
    required this.statusExpire,
    required this.rdvVisiteTechnique,
    required this.rdvAudit,
    required this.rdvCommercial,
    required this.rdvInstallation,
    required this.rdvSav,
    required this.rdvReunion,
    required this.rdvAutre,
    required this.priorityBasse,
    required this.priorityNormale,
    required this.priorityHaute,
    required this.priorityUrgente,
    required this.priorityCritique,
    required this.syncOnline,
    required this.syncOffline,
    required this.syncPending,
    required this.syncFailed,
    required this.clientModeAccent,
    required this.clientModeBanner,
    required this.hoverOverlay,
    required this.pressedOverlay,
  });

  final Brightness brightness;

  // Marque.
  final Color brandPrimary;
  final Color brandPrimaryStrong;
  final Color brandPrimarySoft;
  final Color brandSecondary;
  final Color brandSecondarySoft;
  final Color brandTertiary;
  final Color brandTertiarySoft;

  // Semantique fonctionnelle.
  final Color success;
  final Color successSoft;
  final Color warning;
  final Color warningSoft;
  final Color error;
  final Color errorSoft;
  final Color info;
  final Color infoSoft;

  // Surfaces.
  final Color surfaceBase;
  final Color surface1;
  final Color surface2;
  final Color surface3;
  final Color surface4;
  final Color surface5;
  final Color surfaceSunken;
  final Color surfaceSelected;

  // Texte.
  final Color textPrimary;
  final Color textBody;
  final Color textSecondary;

  /// Ne porte jamais une information utile (illisible en plein soleil).
  final Color textTertiary;
  final Color textOnBrand;
  final Color textOnTooltip;
  final Color textLink;

  // Bordures.
  final Color borderSubtle;
  final Color borderDefault;
  final Color borderStrong;
  final Color borderFocus;

  // Statuts projet / devis.
  final Color statusBrouillon;
  final Color statusEnCours;
  final Color statusTermine;
  final Color statusArchive;
  final Color statusAudit;
  final Color statusDevisEnvoye;
  final Color statusSigne;
  final Color statusRefuse;
  final Color statusExpire;

  // Types de RDV — echelle reconciliee sur la palette de marque.
  final Color rdvVisiteTechnique;
  final Color rdvAudit;
  final Color rdvCommercial;
  final Color rdvInstallation;
  final Color rdvSav;
  final Color rdvReunion;
  final Color rdvAutre;

  // Priorites ticket.
  final Color priorityBasse;
  final Color priorityNormale;
  final Color priorityHaute;
  final Color priorityUrgente;
  final Color priorityCritique;

  // Synchronisation.
  final Color syncOnline;
  final Color syncOffline;
  final Color syncPending;
  final Color syncFailed;

  // Mode client.
  final Color clientModeAccent;
  final Color clientModeBanner;

  // Voiles d'interaction.
  final Color hoverOverlay;
  final Color pressedOverlay;

  bool get isDark => brightness == Brightness.dark;

  /// Surface des cards.
  Color get surfaceCard => surface2;

  /// Fond tinte opaque d'un badge (`color-mix(in srgb, c 14%, surface-1)`).
  Color soft(Color color, [double amount = 0.14]) =>
      dsMix(color, surface1, amount);

  /// Bordure tintee d'un badge (`color-mix(in srgb, c 34%, transparent)`).
  Color softBorder(Color color, [double amount = 0.34]) =>
      color.withAlpha((amount * 255).round());

  /// Bordure de card.
  BorderSide get cardBorder => BorderSide(color: borderSubtle);

  /// Gradient de marque — meme teinte uniquement.
  LinearGradient get gradientBrand => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: isDark
            ? const [Color(0xFF17304A), Color(0xFF0F1419)]
            : const [Color(0xFF1565C0), Color(0xFF0D47A1)],
      );

  /// Gradient des stat cards.
  LinearGradient get gradientStat => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: isDark
            ? [
                const Color(0xFF5FA5E8).withAlpha(36),
                const Color(0xFF5FA5E8).withAlpha(8),
              ]
            : [
                const Color(0xFF1565C0).withAlpha(26),
                const Color(0xFF1565C0).withAlpha(5),
              ],
      );

  /// Degrade de protection sous une legende posee sur une photo.
  LinearGradient get gradientProtectBottom => LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          const Color(0xFF131A22).withAlpha(0),
          const Color(0xFF131A22).withAlpha(140),
        ],
      );

  /// Ombres — reservees aux couches flottantes (sheets, dialogs, palettes, barres collantes).
  List<BoxShadow> get elevationRaised => isDark
      ? const [BoxShadow(color: Color(0x80000000), blurRadius: 2, offset: Offset(0, 1))]
      : const [
          BoxShadow(color: Color(0x0F131A22), blurRadius: 2, offset: Offset(0, 1)),
          BoxShadow(color: Color(0x0F131A22), blurRadius: 8, offset: Offset(0, 2)),
        ];

  List<BoxShadow> get elevationFloating => isDark
      ? const [BoxShadow(color: Color(0x8C000000), blurRadius: 28, offset: Offset(0, 8))]
      : const [
          BoxShadow(color: Color(0x1A131A22), blurRadius: 12, offset: Offset(0, 4)),
          BoxShadow(color: Color(0x1F131A22), blurRadius: 32, offset: Offset(0, 12)),
        ];

  List<BoxShadow> get elevationSticky => isDark
      ? const [BoxShadow(color: Color(0x66000000), blurRadius: 24, offset: Offset(0, -8))]
      : const [
          BoxShadow(color: Color(0x0F131A22), blurRadius: 24, offset: Offset(0, -8)),
        ];

  static const DsColors light = DsColors(
    brightness: Brightness.light,
    brandPrimary: Color(0xFF1565C0),
    brandPrimaryStrong: Color(0xFF0D47A1),
    brandPrimarySoft: Color(0xFFE3EEF9),
    brandSecondary: Color(0xFF00897B),
    brandSecondarySoft: Color(0xFFDCEFEC),
    brandTertiary: Color(0xFFF57C00),
    brandTertiarySoft: Color(0xFFFCEBD8),
    success: Color(0xFF2E7D32),
    successSoft: Color(0xFFE1EEE2),
    warning: Color(0xFFF9A825),
    warningSoft: Color(0xFFFCF1DA),
    error: Color(0xFFC62828),
    errorSoft: Color(0xFFF7E3E3),
    info: Color(0xFF039BE5),
    infoSoft: Color(0xFFDCF0FA),
    surfaceBase: Color(0xFFF5F7FA),
    surface1: Color(0xFFFFFFFF),
    surface2: Color(0xFFFFFFFF),
    surface3: Color(0xFFF8FAFC),
    surface4: Color(0xFFFFFFFF),
    surface5: Color(0xFF1F2733),
    surfaceSunken: Color(0xFFEEF2F7),
    surfaceSelected: Color(0xFFE3EEF9),
    textPrimary: Color(0xFF131A22),
    textBody: Color(0xFF1F2733),
    textSecondary: Color(0xFF4A5563),
    textTertiary: Color(0xFF6B7684),
    textOnBrand: Color(0xFFFFFFFF),
    textOnTooltip: Color(0xFFF0F3F6),
    textLink: Color(0xFF1565C0),
    borderSubtle: Color(0xFFE4E9F0),
    borderDefault: Color(0xFFDCE2EB),
    borderStrong: Color(0xFFC3CBD8),
    borderFocus: Color(0xFF1565C0),
    statusBrouillon: Color(0xFF7E57C2),
    statusEnCours: Color(0xFF1E88E5),
    statusTermine: Color(0xFF43A047),
    statusArchive: Color(0xFF78909C),
    statusAudit: Color(0xFF8E24AA),
    statusDevisEnvoye: Color(0xFF039BE5),
    statusSigne: Color(0xFF2E7D32),
    statusRefuse: Color(0xFFC62828),
    statusExpire: Color(0xFF8D6E63),
    rdvVisiteTechnique: Color(0xFF1565C0),
    rdvAudit: Color(0xFF8E24AA),
    rdvCommercial: Color(0xFF00897B),
    rdvInstallation: Color(0xFFF57C00),
    rdvSav: Color(0xFFC62828),
    rdvReunion: Color(0xFF546E7A),
    rdvAutre: Color(0xFF90A4AE),
    priorityBasse: Color(0xFF78909C),
    priorityNormale: Color(0xFF1E88E5),
    priorityHaute: Color(0xFFF57C00),
    priorityUrgente: Color(0xFFE64A19),
    priorityCritique: Color(0xFFC62828),
    syncOnline: Color(0xFF2E7D32),
    syncOffline: Color(0xFFF57C00),
    syncPending: Color(0xFF1565C0),
    syncFailed: Color(0xFFC62828),
    clientModeAccent: Color(0xFF00897B),
    clientModeBanner: Color(0xFFDCEFEC),
    hoverOverlay: Color(0x0F1565C0),
    pressedOverlay: Color(0x1F1565C0),
  );

  static const DsColors dark = DsColors(
    brightness: Brightness.dark,
    brandPrimary: Color(0xFF5FA5E8),
    brandPrimaryStrong: Color(0xFF8CC0F0),
    brandPrimarySoft: Color(0xFF17304A),
    brandSecondary: Color(0xFF4DB6AC),
    brandSecondarySoft: Color(0xFF123B38),
    brandTertiary: Color(0xFFFFA726),
    brandTertiarySoft: Color(0xFF40290F),
    success: Color(0xFF66BB6A),
    successSoft: Color(0xFF173A1C),
    warning: Color(0xFFFFCA28),
    warningSoft: Color(0xFF3D3110),
    error: Color(0xFFEF5350),
    errorSoft: Color(0xFF3F1B1B),
    info: Color(0xFF4FC3F7),
    infoSoft: Color(0xFF0F3345),
    surfaceBase: Color(0xFF0F1419),
    surface1: Color(0xFF151B23),
    surface2: Color(0xFF1A2130),
    surface3: Color(0xFF212939),
    surface4: Color(0xFF2A3344),
    surface5: Color(0xFF333E50),
    surfaceSunken: Color(0xFF111720),
    surfaceSelected: Color(0xFF17304A),
    textPrimary: Color(0xFFF0F3F6),
    textBody: Color(0xFFE4E8ED),
    textSecondary: Color(0xFF9BA4B0),
    textTertiary: Color(0xFF7A8492),
    textOnBrand: Color(0xFF0F1419),
    textOnTooltip: Color(0xFFF0F3F6),
    textLink: Color(0xFF8CC0F0),
    borderSubtle: Color(0x17FFFFFF),
    borderDefault: Color(0x26FFFFFF),
    borderStrong: Color(0x42FFFFFF),
    borderFocus: Color(0xFF5FA5E8),
    statusBrouillon: Color(0xFFB39DDB),
    statusEnCours: Color(0xFF64B5F6),
    statusTermine: Color(0xFF81C784),
    statusArchive: Color(0xFFB0BEC5),
    statusAudit: Color(0xFFCE93D8),
    statusDevisEnvoye: Color(0xFF4FC3F7),
    statusSigne: Color(0xFF66BB6A),
    statusRefuse: Color(0xFFEF5350),
    statusExpire: Color(0xFFBCAAA4),
    rdvVisiteTechnique: Color(0xFF64B5F6),
    rdvAudit: Color(0xFFCE93D8),
    rdvCommercial: Color(0xFF4DB6AC),
    rdvInstallation: Color(0xFFFFA726),
    rdvSav: Color(0xFFEF5350),
    rdvReunion: Color(0xFF90A4AE),
    rdvAutre: Color(0xFFB0BEC5),
    priorityBasse: Color(0xFFB0BEC5),
    priorityNormale: Color(0xFF64B5F6),
    priorityHaute: Color(0xFFFFA726),
    priorityUrgente: Color(0xFFFF7043),
    priorityCritique: Color(0xFFEF5350),
    syncOnline: Color(0xFF66BB6A),
    syncOffline: Color(0xFFFFA726),
    syncPending: Color(0xFF64B5F6),
    syncFailed: Color(0xFFEF5350),
    clientModeAccent: Color(0xFF4DB6AC),
    clientModeBanner: Color(0xFF123B38),
    hoverOverlay: Color(0x0FFFFFFF),
    pressedOverlay: Color(0x1FFFFFFF),
  );

  @override
  DsColors copyWith({Brightness? brightness}) =>
      brightness == null || brightness == this.brightness
          ? this
          : (brightness == Brightness.dark ? dark : light);

  @override
  DsColors lerp(ThemeExtension<DsColors>? other, double t) {
    if (other is! DsColors) return this;
    return t < 0.5 ? this : other;
  }
}
