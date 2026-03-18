import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Neo Integrateur App Theme - Modern 2025-2026 Design
/// Uses Inter font, deep blue palette, blue-tinted dark mode
class AppTheme {
  // ── Brand Colors ──────────────────────────────────────────
  static const Color primaryColor = Color(0xFF1565C0); // Deep professional blue
  static const Color secondaryColor = Color(0xFF00897B); // Rich teal
  static const Color tertiaryColor = Color(0xFFF57C00); // Amber-orange accent

  // ── Semantic Colors ───────────────────────────────────────
  static const Color successColor = Color(0xFF2E7D32);
  static const Color warningColor = Color(0xFFF9A825);
  static const Color errorColor = Color(0xFFC62828);
  static const Color infoColor = Color(0xFF1565C0);

  // ── Status Colors (for projects) ──────────────────────────
  static const Color statusBrouillon = Color(0xFF7E57C2); // Deep purple
  static const Color statusEnCours = Color(0xFF1E88E5); // Bright blue
  static const Color statusTermine = Color(0xFF43A047); // Rich green
  static const Color statusArchive = Color(0xFF78909C); // Blue-gray
  static const Color statusAudit = Color(0xFF8E24AA);
  static const Color statusDevisEnvoye = Color(0xFF039BE5);
  static const Color statusSigne = Color(0xFF2E7D32);

  // ── Dark Mode Surfaces (blue-tinted, not pure gray) ───────
  static const Color _darkBase = Color(0xFF0F1419);
  static const Color _darkSurface1 = Color(0xFF151B23);
  static const Color _darkSurface2 = Color(0xFF1A2130);
  static const Color _darkSurface3 = Color(0xFF212939);
  static const Color _darkSurface4 = Color(0xFF2A3344);
  static const Color _darkSurface5 = Color(0xFF333E50);

  // ── Light Theme ───────────────────────────────────────────
  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
      secondary: secondaryColor,
      tertiary: tertiaryColor,
      error: errorColor,
    );

    final textTheme = _buildTextTheme(colorScheme);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      brightness: Brightness.light,
      textTheme: GoogleFonts.interTextTheme(textTheme),

      // AppBar - clean, minimal
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
          letterSpacing: -0.3,
        ),
      ),

      // Cards - flat with subtle border (modern trend)
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: colorScheme.outlineVariant.withAlpha(40),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        color: colorScheme.surfaceContainerLowest,
      ),

      // Elevated Buttons - 52dp, rounded
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(120, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      // Filled Buttons - primary action style
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(120, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      // Outlined Buttons
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(120, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      // Text Buttons
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(80, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
      ),

      // Input Fields - modern rounded
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surfaceContainerHighest.withAlpha(60),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.outline.withAlpha(30),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.primary,
            width: 2,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.error),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
      ),

      // Chips - pill-shaped
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      ),

      // FAB
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),

      // Navigation Rail
      navigationRailTheme: NavigationRailThemeData(
        elevation: 0,
        minWidth: 88,
        backgroundColor: colorScheme.surface,
        indicatorColor: colorScheme.primaryContainer,
        indicatorShape: const StadiumBorder(),
        useIndicator: true,
        selectedLabelTextStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.3),
        unselectedLabelTextStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
        selectedIconTheme: IconThemeData(
          color: colorScheme.primary,
          size: 24,
        ),
        unselectedIconTheme: IconThemeData(
          color: colorScheme.onSurfaceVariant,
          size: 24,
        ),
        labelType: NavigationRailLabelType.all,
      ),

      // Dialogs - large radius
      dialogTheme: DialogThemeData(
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),

      // Snackbars
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),

      // Dividers
      dividerTheme: DividerThemeData(
        color: colorScheme.outlineVariant.withAlpha(60),
        thickness: 1,
      ),

      // Checkbox
      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
        ),
        visualDensity: VisualDensity.comfortable,
      ),

      // ListTile
      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        minVerticalPadding: 12,
      ),

      // TabBar
      tabBarTheme: const TabBarThemeData(
        labelPadding: EdgeInsets.symmetric(horizontal: 24),
        indicatorSize: TabBarIndicatorSize.label,
      ),

      // Bottom Sheet
      bottomSheetTheme: const BottomSheetThemeData(
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),

      // Popup Menu
      popupMenuTheme: PopupMenuThemeData(
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),

      // Tooltip
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: colorScheme.inverseSurface,
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  // ── Dark Theme ────────────────────────────────────────────
  static ThemeData get darkTheme {
    final baseScheme = ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
      secondary: secondaryColor,
      tertiary: tertiaryColor,
      error: errorColor,
    );

    // Override with blue-tinted dark surfaces
    final colorScheme = baseScheme.copyWith(
      surface: _darkBase,
      surfaceContainerLowest: _darkSurface1,
      surfaceContainerLow: _darkSurface1,
      surfaceContainer: _darkSurface2,
      surfaceContainerHigh: _darkSurface3,
      surfaceContainerHighest: _darkSurface4,
      onSurface: const Color(0xFFF0F3F6),
      onSurfaceVariant: const Color(0xFF9BA4B0),
      outlineVariant: const Color(0xFF333E50),
    );

    final textTheme = _buildTextTheme(colorScheme);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: _darkBase,
      textTheme: GoogleFonts.interTextTheme(textTheme),

      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: _darkBase,
        foregroundColor: const Color(0xFFF0F3F6),
        titleTextStyle: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: const Color(0xFFF0F3F6),
          letterSpacing: -0.3,
        ),
      ),

      // Cards - flat with subtle border
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: Colors.white.withAlpha(15),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        color: _darkSurface2,
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(120, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(120, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(120, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _darkSurface3,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: Colors.white.withAlpha(12),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: colorScheme.primary,
            width: 2,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.error),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
      ),

      navigationRailTheme: NavigationRailThemeData(
        elevation: 0,
        minWidth: 88,
        backgroundColor: _darkSurface1,
        indicatorColor: colorScheme.primary.withAlpha(45),
        indicatorShape: const StadiumBorder(),
        useIndicator: true,
        selectedLabelTextStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.3),
        unselectedLabelTextStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
        selectedIconTheme: IconThemeData(
          color: colorScheme.primary,
          size: 24,
        ),
        unselectedIconTheme: const IconThemeData(
          color: Color(0xFF9BA4B0),
          size: 24,
        ),
        labelType: NavigationRailLabelType.all,
      ),

      dialogTheme: DialogThemeData(
        elevation: 8,
        backgroundColor: _darkSurface3,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),

      dividerTheme: DividerThemeData(
        color: Colors.white.withAlpha(10),
        thickness: 1,
      ),

      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      ),

      checkboxTheme: CheckboxThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
        ),
        visualDensity: VisualDensity.comfortable,
      ),

      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        minVerticalPadding: 12,
      ),

      tabBarTheme: const TabBarThemeData(
        labelPadding: EdgeInsets.symmetric(horizontal: 24),
        indicatorSize: TabBarIndicatorSize.label,
      ),

      bottomSheetTheme: BottomSheetThemeData(
        showDragHandle: true,
        backgroundColor: _darkSurface3,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),

      popupMenuTheme: PopupMenuThemeData(
        elevation: 8,
        color: _darkSurface4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),

      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: _darkSurface5,
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  // ── Text Theme ────────────────────────────────────────────
  // Modern 2025-2026: light display weights, bold labels, tight heading spacing
  static TextTheme _buildTextTheme(ColorScheme colorScheme) {
    return TextTheme(
      displayLarge: TextStyle(
        fontSize: 57,
        fontWeight: FontWeight.w300, // Light - modern trend
        color: colorScheme.onSurface,
        letterSpacing: -1.5,
      ),
      displayMedium: TextStyle(
        fontSize: 45,
        fontWeight: FontWeight.w300,
        color: colorScheme.onSurface,
        letterSpacing: -0.5,
      ),
      displaySmall: TextStyle(
        fontSize: 36,
        fontWeight: FontWeight.w400,
        color: colorScheme.onSurface,
        letterSpacing: -0.25,
      ),
      headlineLarge: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurface,
        letterSpacing: -0.5,
      ),
      headlineMedium: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurface,
        letterSpacing: -0.5,
      ),
      headlineSmall: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w500, // Slightly lighter - more refined
        color: colorScheme.onSurface,
        letterSpacing: -0.3,
      ),
      titleLarge: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurface,
        letterSpacing: -0.3,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurface,
        letterSpacing: -0.1,
      ),
      titleSmall: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: colorScheme.onSurface,
        letterSpacing: 0,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: colorScheme.onSurface,
        letterSpacing: 0,
        height: 1.5,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: colorScheme.onSurface,
        letterSpacing: 0,
        height: 1.5,
      ),
      bodySmall: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: colorScheme.onSurfaceVariant,
        letterSpacing: 0,
        height: 1.4,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600, // Bolder labels - modern trend
        color: colorScheme.onSurface,
        letterSpacing: 0.1,
      ),
      labelMedium: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurface,
        letterSpacing: 0.1,
      ),
      labelSmall: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: colorScheme.onSurfaceVariant,
        letterSpacing: 0.5,
      ),
    );
  }

  AppTheme._();
}
