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

  // Page padding - larger for tablets
  static const EdgeInsets pagePadding = EdgeInsets.all(24.0);
  static const EdgeInsets pagePaddingHorizontal = EdgeInsets.symmetric(horizontal: 24.0);
  static const EdgeInsets pagePaddingVertical = EdgeInsets.symmetric(vertical: 24.0);

  // Card padding
  static const EdgeInsets cardPadding = EdgeInsets.all(16.0);
  static const EdgeInsets cardPaddingLarge = EdgeInsets.all(24.0);

  // List item padding
  static const EdgeInsets listItemPadding = EdgeInsets.symmetric(
    horizontal: 16.0,
    vertical: 12.0,
  );

  // Form padding
  static const EdgeInsets formPadding = EdgeInsets.all(24.0);
  static const double formFieldSpacing = 16.0;
  static const double formSectionSpacing = 32.0;

  // Dialog padding
  static const EdgeInsets dialogPadding = EdgeInsets.all(24.0);

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

/// Breakpoints for responsive design
class AppBreakpoints {
  static const double mobile = 600;
  static const double tablet = 900;
  static const double desktop = 1200;
  static const double largeDesktop = 1800;

  static bool isMobile(BuildContext context) =>
      MediaQuery.sizeOf(context).width < mobile;

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= mobile && width < desktop;
  }

  static bool isDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= desktop;

  static bool isLargeDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= largeDesktop;

  AppBreakpoints._();
}
