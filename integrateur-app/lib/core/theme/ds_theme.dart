import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'ds_tokens.dart';

/// Construction du `ThemeData` a partir des tokens du Design System.
///
/// Le theme depend du device : l'echelle typographique iPhone et iPad sont
/// distinctes (brief §5.4). `DsThemeScope` applique la bonne echelle a partir
/// de la largeur disponible.
abstract final class DsTheme {
  static ThemeData light([
    DsDevice device = DsDevice.tablet,
    bool chantier = false,
  ]) =>
      _build(DsColors.light, device, chantier);

  static ThemeData dark([
    DsDevice device = DsDevice.tablet,
    bool chantier = false,
  ]) =>
      _build(DsColors.dark, device, chantier);

  static ThemeData of(
    Brightness brightness,
    DsDevice device, {
    bool chantier = false,
  }) =>
      brightness == Brightness.dark
          ? dark(device, chantier)
          : light(device, chantier);

  static ThemeData _build(DsColors ds, DsDevice device, bool chantier) {
    final scale = DsTypeScale.forDevice(device, chantier: chantier);
    final isDark = ds.isDark;

    final colorScheme = ColorScheme(
      brightness: ds.brightness,
      primary: ds.brandPrimary,
      onPrimary: ds.textOnBrand,
      primaryContainer: ds.brandPrimarySoft,
      onPrimaryContainer: isDark ? ds.textPrimary : ds.brandPrimaryStrong,
      secondary: ds.brandSecondary,
      onSecondary: isDark ? ds.surfaceBase : Colors.white,
      secondaryContainer: ds.brandSecondarySoft,
      onSecondaryContainer: isDark ? ds.textPrimary : const Color(0xFF00504A),
      tertiary: ds.brandTertiary,
      onTertiary: isDark ? ds.surfaceBase : Colors.white,
      tertiaryContainer: ds.brandTertiarySoft,
      onTertiaryContainer: isDark ? ds.textPrimary : const Color(0xFF7A3D00),
      error: ds.error,
      onError: isDark ? ds.surfaceBase : Colors.white,
      errorContainer: ds.errorSoft,
      onErrorContainer: isDark ? ds.textPrimary : const Color(0xFF7A1414),
      surface: ds.surfaceBase,
      onSurface: ds.textPrimary,
      onSurfaceVariant: ds.textSecondary,
      surfaceContainerLowest: ds.surface1,
      surfaceContainerLow: ds.surface2,
      surfaceContainer: ds.surface3,
      surfaceContainerHigh: ds.surface4,
      // surface5 est la surface des infobulles : en theme clair c'est un fond
      // volontairement sombre. L'exposer comme « surfaceContainerHighest »
      // rendait noire toute surface Material qui s'appuie dessus (cartes de
      // feuilles modales, entetes) sur les ecrans non portes au DS.
      surfaceContainerHighest: isDark ? ds.surface5 : ds.surface4,
      surfaceTint: Colors.transparent,
      outline: ds.borderStrong,
      outlineVariant: ds.borderSubtle,
      inverseSurface: ds.surface5,
      onInverseSurface: ds.textOnTooltip,
      inversePrimary: ds.brandPrimaryStrong,
      shadow: const Color(0xFF131A22),
      scrim: const Color(0xFF131A22),
    );

    final textTheme = _textTheme(ds, scale);

    return ThemeData(
      useMaterial3: true,
      brightness: ds.brightness,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: ds.surfaceBase,
      canvasColor: ds.surfaceBase,
      splashFactory: InkSparkle.splashFactory,
      extensions: <ThemeExtension<dynamic>>[ds],

      appBarTheme: AppBarTheme(
        backgroundColor: ds.surfaceBase,
        foregroundColor: ds.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        toolbarHeight: DsSpacing.appBarHeight,
        titleTextStyle: textTheme.titleLarge,
      ),

      // Style flat assume : elevation 0, la profondeur vient de la bordure.
      cardTheme: CardThemeData(
        color: ds.surfaceCard,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: DsRadius.cardAll,
          side: ds.cardBorder,
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ds.brandPrimary,
          foregroundColor: ds.textOnBrand,
          minimumSize: const Size(120, 52),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s5),
          shape: RoundedRectangleBorder(borderRadius: DsRadius.buttonAll),
          textStyle: textTheme.labelLarge?.copyWith(
            fontSize: scale.bodySize,
            fontWeight: DsWeight.semibold,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: ds.brandPrimary,
          minimumSize: const Size(120, 52),
          padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s5),
          side: BorderSide(color: ds.borderStrong),
          shape: RoundedRectangleBorder(borderRadius: DsRadius.buttonAll),
          textStyle: textTheme.labelLarge?.copyWith(
            fontSize: scale.bodySize,
            fontWeight: DsWeight.semibold,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: ds.brandPrimary,
          minimumSize: const Size(80, DsSpacing.targetMin),
          padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s4),
          shape: RoundedRectangleBorder(borderRadius: DsRadius.buttonAll),
          textStyle: textTheme.labelLarge?.copyWith(
            fontWeight: DsWeight.semibold,
          ),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size.square(DsSpacing.targetMin),
          shape: RoundedRectangleBorder(borderRadius: DsRadius.mdAll),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: ds.surface3,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: DsSpacing.s4,
          vertical: DsSpacing.s4,
        ),
        border: OutlineInputBorder(
          borderRadius: DsRadius.mdAll,
          borderSide: BorderSide(color: ds.borderDefault),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: DsRadius.mdAll,
          borderSide: BorderSide(color: ds.borderDefault),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: DsRadius.mdAll,
          borderSide: BorderSide(color: ds.borderFocus, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: DsRadius.mdAll,
          borderSide: BorderSide(color: ds.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: DsRadius.mdAll,
          borderSide: BorderSide(color: ds.error, width: 2),
        ),
        labelStyle: textTheme.bodyMedium?.copyWith(color: ds.textSecondary),
        hintStyle: textTheme.bodyMedium?.copyWith(color: ds.textTertiary),
        errorStyle: textTheme.labelMedium?.copyWith(color: ds.error),
      ),

      dividerTheme: DividerThemeData(
        color: ds.borderSubtle,
        thickness: 1,
        space: 1,
      ),

      chipTheme: ChipThemeData(
        backgroundColor: ds.surface1,
        selectedColor: ds.surfaceSelected,
        side: BorderSide(color: ds.borderDefault),
        labelStyle: textTheme.labelLarge,
        padding: const EdgeInsets.symmetric(
          horizontal: DsSpacing.s4,
          vertical: DsSpacing.s3,
        ),
        shape: const StadiumBorder(),
      ),

      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: ds.surface1,
        indicatorColor: ds.surfaceSelected,
        minWidth: DsSpacing.railCompact,
        minExtendedWidth: DsSpacing.railExpanded,
        selectedIconTheme: IconThemeData(color: ds.brandPrimary, size: 28),
        unselectedIconTheme: IconThemeData(color: ds.textSecondary, size: 26),
        selectedLabelTextStyle: textTheme.labelMedium?.copyWith(
          color: ds.brandPrimary,
          fontWeight: DsWeight.semibold,
        ),
        unselectedLabelTextStyle: textTheme.labelMedium?.copyWith(
          color: ds.textSecondary,
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: ds.surface1,
        surfaceTintColor: Colors.transparent,
        indicatorColor: ds.surfaceSelected,
        height: 64,
        elevation: 0,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => textTheme.labelMedium?.copyWith(
            fontSize: scale.badgeSize,
            fontWeight: DsWeight.semibold,
            color: states.contains(WidgetState.selected)
                ? ds.brandPrimary
                : ds.textSecondary,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: 26,
            color: states.contains(WidgetState.selected)
                ? ds.brandPrimary
                : ds.textSecondary,
          ),
        ),
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: ds.surface4,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DsRadius.dialog),
        ),
        titleTextStyle: textTheme.headlineSmall,
        contentTextStyle: textTheme.bodyMedium,
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: ds.surface4,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        showDragHandle: true,
        dragHandleColor: ds.borderStrong,
        shape: RoundedRectangleBorder(borderRadius: DsRadius.sheetTop),
        constraints: const BoxConstraints(maxWidth: DsSpacing.sheetMaxHeight),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: ds.surface5,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: ds.textOnTooltip,
        ),
        actionTextColor: ds.brandPrimaryStrong,
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: DsRadius.mdAll),
      ),

      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: ds.surface5,
          borderRadius: DsRadius.smAll,
        ),
        textStyle: textTheme.labelMedium?.copyWith(color: ds.textOnTooltip),
      ),

      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: DsSpacing.s5,
          vertical: DsSpacing.s1,
        ),
        minVerticalPadding: DsSpacing.s3,
        shape: RoundedRectangleBorder(borderRadius: DsRadius.mdAll),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: ds.brandPrimary,
        linearTrackColor: ds.surfaceSunken,
        circularTrackColor: ds.surfaceSunken,
      ),

      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? ds.success
              : Colors.transparent,
        ),
        side: BorderSide(color: ds.borderStrong, width: 2),
        shape: RoundedRectangleBorder(borderRadius: DsRadius.smAll),
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? ds.textOnBrand
              : ds.surface1,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? ds.brandPrimary
              : ds.surfaceSunken,
        ),
      ),

      tabBarTheme: TabBarThemeData(
        labelColor: ds.brandPrimary,
        unselectedLabelColor: ds.textSecondary,
        labelStyle: textTheme.labelLarge?.copyWith(
          fontWeight: DsWeight.semibold,
        ),
        indicatorColor: ds.brandPrimary,
        dividerColor: ds.borderSubtle,
      ),

      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: ds.brandPrimary,
        foregroundColor: ds.textOnBrand,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        highlightElevation: 0,
        shape: RoundedRectangleBorder(borderRadius: DsRadius.lgAll),
      ),

      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }

  static TextTheme _textTheme(DsColors ds, DsTypeScale s) {
    TextStyle style({
      required double size,
      required double line,
      FontWeight weight = DsWeight.regular,
      double letterSpacing = 0,
      Color? color,
    }) =>
        GoogleFonts.inter(
          fontSize: size,
          height: line / size,
          fontWeight: weight,
          letterSpacing: letterSpacing,
          color: color ?? ds.textPrimary,
        );

    return TextTheme(
      displayLarge: style(
        size: s.displaySize,
        line: s.displayLine,
        weight: DsWeight.light,
        letterSpacing: s.displayLs,
      ),
      displayMedium: style(
        size: s.h1Size,
        line: s.h1Line,
        weight: DsWeight.light,
        letterSpacing: -0.6,
      ),
      displaySmall: style(
        size: s.h2Size,
        line: s.h2Line,
        weight: DsWeight.light,
        letterSpacing: -0.4,
      ),
      headlineLarge: style(
        size: s.h1Size,
        line: s.h1Line,
        weight: DsWeight.semibold,
        letterSpacing: -0.5,
      ),
      headlineMedium: style(
        size: s.h2Size,
        line: s.h2Line,
        weight: DsWeight.semibold,
        letterSpacing: -0.4,
      ),
      headlineSmall: style(
        size: s.h3Size,
        line: s.h3Line,
        weight: DsWeight.semibold,
        letterSpacing: -0.3,
      ),
      titleLarge: style(
        size: s.h3Size,
        line: s.h3Line,
        weight: DsWeight.semibold,
        letterSpacing: -0.3,
      ),
      titleMedium: style(
        size: s.titleSize,
        line: s.titleLine,
        weight: DsWeight.semibold,
        letterSpacing: -0.2,
      ),
      titleSmall: style(
        size: s.labelSize,
        line: s.labelLine,
        weight: DsWeight.semibold,
        letterSpacing: 0.2,
      ),
      bodyLarge: style(
        size: s.bodyLgSize,
        line: s.bodyLgLine,
        color: ds.textBody,
      ),
      bodyMedium: style(
        size: s.bodySize,
        line: s.bodyLine,
        color: ds.textBody,
      ),
      // Plancher a11y : jamais en dessous de 13 pt, et jamais pour une info critique.
      bodySmall: style(
        size: s.captionSize,
        line: s.captionLine,
        color: ds.textSecondary,
      ),
      labelLarge: style(
        size: s.labelSize,
        line: s.labelLine,
        weight: DsWeight.semibold,
        letterSpacing: 0.2,
      ),
      labelMedium: style(
        size: s.badgeSize,
        line: s.badgeLine,
        weight: DsWeight.semibold,
        letterSpacing: 0.3,
        color: ds.textSecondary,
      ),
      labelSmall: style(
        size: s.badgeSize,
        line: s.badgeLine,
        weight: DsWeight.semibold,
        letterSpacing: 0.3,
        color: ds.textSecondary,
      ),
    );
  }
}

/// Applique l'echelle typographique correspondant a la largeur disponible.
///
/// A poser une seule fois, dans le `builder` de `MaterialApp`.
class DsThemeScope extends StatelessWidget {
  const DsThemeScope({required this.child, this.chantier = false, super.key});

  final Widget child;

  /// Mode chantier : typo, contraste et cibles renforces.
  final bool chantier;

  @override
  Widget build(BuildContext context) {
    final device = DsDevice.of(context);
    final brightness = Theme.of(context).brightness;
    return Theme(
      data: DsTheme.of(brightness, device, chantier: chantier),
      child: child,
    );
  }
}

/// Acces rapide aux tokens : `context.ds.brandPrimary`.
extension DsThemeContext on BuildContext {
  DsColors get ds =>
      Theme.of(this).extension<DsColors>() ??
      (Theme.of(this).brightness == Brightness.dark
          ? DsColors.dark
          : DsColors.light);

  DsTypeScale get dsType => DsTypeScale.of(this);

  DsDevice get dsDevice => DsDevice.of(this);

  /// `true` en paysage (largeur > hauteur).
  bool get dsIsLandscape =>
      MediaQuery.sizeOf(this).width > MediaQuery.sizeOf(this).height;
}

extension DsThemeData on ThemeData {
  DsColors get ds =>
      extension<DsColors>() ??
      (brightness == Brightness.dark ? DsColors.dark : DsColors.light);
}
