import 'package:flutter/widgets.dart';

/// Consistent spacing values throughout the app - tablet optimized
class AppSpacing {
  // Base unit (8dp grid)
  static const double unit = 8.0;

  // Named spacing values
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  static const double xxxl = 64.0;

  // Card gap (between cards in grids/lists)
  static const double cardGap = 16.0;

  // Section gap (between major content sections)
  static const double sectionGap = 32.0;

  // Page padding - tablet optimized (32dp)
  static const EdgeInsets pagePadding = EdgeInsets.all(32.0);
  static const EdgeInsets pagePaddingHorizontal = EdgeInsets.symmetric(horizontal: 32.0);
  static const EdgeInsets pagePaddingVertical = EdgeInsets.symmetric(vertical: 32.0);

  // Card padding - tablet optimized (20dp)
  static const EdgeInsets cardPadding = EdgeInsets.all(20.0);
  static const EdgeInsets cardPaddingLarge = EdgeInsets.all(24.0);

  // List item padding - tablet optimized
  static const EdgeInsets listItemPadding = EdgeInsets.symmetric(
    horizontal: 20.0,
    vertical: 12.0,
  );

  // Form padding
  static const EdgeInsets formPadding = EdgeInsets.all(32.0);
  static const double formFieldSpacing = 16.0;
  static const double formSectionSpacing = 32.0;

  // Dialog padding
  static const EdgeInsets dialogPadding = EdgeInsets.all(24.0);

  // Dialog constraints for tablet
  static const BoxConstraints dialogConstraints = BoxConstraints(
    minWidth: 400,
    maxWidth: 560,
  );

  // Bottom sheet constraints for tablet
  static const BoxConstraints bottomSheetConstraints = BoxConstraints(
    maxWidth: 640,
  );

  // Gap widgets for convenience
  static const SizedBox gapXs = SizedBox(width: xs, height: xs);
  static const SizedBox gapSm = SizedBox(width: sm, height: sm);
  static const SizedBox gapMd = SizedBox(width: md, height: md);
  static const SizedBox gapLg = SizedBox(width: lg, height: lg);
  static const SizedBox gapXl = SizedBox(width: xl, height: xl);

  // Horizontal gaps
  static const SizedBox hGapXs = SizedBox(width: xs);
  static const SizedBox hGapSm = SizedBox(width: sm);
  static const SizedBox hGapMd = SizedBox(width: md);
  static const SizedBox hGapLg = SizedBox(width: lg);
  static const SizedBox hGapXl = SizedBox(width: xl);

  // Vertical gaps
  static const SizedBox vGapXs = SizedBox(height: xs);
  static const SizedBox vGapSm = SizedBox(height: sm);
  static const SizedBox vGapMd = SizedBox(height: md);
  static const SizedBox vGapLg = SizedBox(height: lg);
  static const SizedBox vGapXl = SizedBox(height: xl);

  AppSpacing._();
}

/// Consistent border radius tokens
class AppRadius {
  static const double xs = 4.0;   // Checkboxes, small indicators
  static const double sm = 8.0;   // Chips, tags, small buttons
  static const double md = 12.0;  // Buttons, inputs, snackbars
  static const double lg = 16.0;  // Standard cards, containers
  static const double xl = 20.0;  // Feature cards, hero sections
  static const double xxl = 24.0; // Dialogs, modals, bottom sheets
  static const double full = 9999.0; // Pill shapes, avatars

  static BorderRadius get borderRadiusXs => BorderRadius.circular(xs);
  static BorderRadius get borderRadiusSm => BorderRadius.circular(sm);
  static BorderRadius get borderRadiusMd => BorderRadius.circular(md);
  static BorderRadius get borderRadiusLg => BorderRadius.circular(lg);
  static BorderRadius get borderRadiusXl => BorderRadius.circular(xl);
  static BorderRadius get borderRadiusXxl => BorderRadius.circular(xxl);
  static BorderRadius get borderRadiusFull => BorderRadius.circular(full);

  AppRadius._();
}

/// Breakpoints for responsive design
class AppBreakpoints {
  static const double mobile = 600;
  static const double tablet = 900;
  static const double desktop = 1200;
  static const double largeDesktop = 1800;

  static bool isMobile(BuildContext context) =>
      MediaQuery.sizeOf(context).width < mobile;

  /// Returns true for tablet AND desktop (>= 600)
  static bool isTabletOrLarger(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= mobile;

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= mobile && width < desktop;
  }

  static bool isDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= desktop;

  static bool isLargeDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= largeDesktop;

  /// Returns true when enough width for multi-column layouts
  static bool isWideEnoughForColumns(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= tablet;

  AppBreakpoints._();
}
