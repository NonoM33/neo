import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// String extensions
extension StringExtensions on String {
  /// Capitalize first letter
  String get capitalized {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  /// Capitalize each word
  String get titleCase {
    if (isEmpty) return this;
    return split(' ').map((word) => word.capitalized).join(' ');
  }

  /// Check if string is a valid email
  bool get isValidEmail {
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    return emailRegex.hasMatch(this);
  }

  /// Check if string is a valid phone number (French format)
  bool get isValidPhone {
    final phoneRegex = RegExp(r'^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$');
    return phoneRegex.hasMatch(this);
  }

  /// Truncate string with ellipsis
  String truncate(int maxLength, {String suffix = '...'}) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength - suffix.length)}$suffix';
  }
}

/// DateTime extensions
extension DateTimeExtensions on DateTime {
  /// Format date in French locale
  String get formatted => DateFormat('dd/MM/yyyy').format(this);

  /// Format date with time
  String get formattedWithTime => DateFormat('dd/MM/yyyy HH:mm').format(this);

  /// Format as relative time (e.g., "il y a 2 heures")
  String get relativeTime {
    final now = DateTime.now();
    final difference = now.difference(this);

    if (difference.inDays > 365) {
      final years = (difference.inDays / 365).floor();
      return 'il y a $years an${years > 1 ? 's' : ''}';
    } else if (difference.inDays > 30) {
      final months = (difference.inDays / 30).floor();
      return 'il y a $months mois';
    } else if (difference.inDays > 0) {
      return 'il y a ${difference.inDays} jour${difference.inDays > 1 ? 's' : ''}';
    } else if (difference.inHours > 0) {
      return 'il y a ${difference.inHours} heure${difference.inHours > 1 ? 's' : ''}';
    } else if (difference.inMinutes > 0) {
      return 'il y a ${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''}';
    } else {
      return 'à l\'instant';
    }
  }

  /// Check if date is today
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  /// Check if date is yesterday
  bool get isYesterday {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return year == yesterday.year &&
        month == yesterday.month &&
        day == yesterday.day;
  }

  /// Format for display (smart formatting)
  String get smartFormat {
    if (isToday) {
      return 'Aujourd\'hui à ${DateFormat('HH:mm').format(this)}';
    } else if (isYesterday) {
      return 'Hier à ${DateFormat('HH:mm').format(this)}';
    } else {
      return formattedWithTime;
    }
  }
}

/// Number extensions
extension NumberExtensions on num {
  /// Format as currency (EUR)
  String get asCurrency => NumberFormat.currency(
        locale: 'fr_FR',
        symbol: '€',
        decimalDigits: 2,
      ).format(this);

  /// Format as currency without cents
  String get asCurrencyNoCents => NumberFormat.currency(
        locale: 'fr_FR',
        symbol: '€',
        decimalDigits: 0,
      ).format(this);

  /// Format as percentage
  String get asPercentage => '${toStringAsFixed(1)}%';

  /// Format with thousands separator
  String get formatted => NumberFormat('#,###', 'fr_FR').format(this);
}

/// BuildContext extensions
extension BuildContextExtensions on BuildContext {
  /// Get the current theme
  ThemeData get theme => Theme.of(this);

  /// Get the current color scheme
  ColorScheme get colorScheme => Theme.of(this).colorScheme;

  /// Get the current text theme
  TextTheme get textTheme => Theme.of(this).textTheme;

  /// Get the screen size
  Size get screenSize => MediaQuery.sizeOf(this);

  /// Get the screen width
  double get screenWidth => screenSize.width;

  /// Get the screen height
  double get screenHeight => screenSize.height;

  /// Check if device is in landscape mode
  bool get isLandscape =>
      MediaQuery.orientationOf(this) == Orientation.landscape;

  /// Check if device is a tablet (based on screen width)
  bool get isTablet => screenWidth >= 600;

  /// Show a snackbar
  void showSnackBar(
    String message, {
    bool isError = false,
    Duration duration = const Duration(seconds: 3),
    SnackBarAction? action,
  }) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? colorScheme.error : null,
        duration: duration,
        action: action,
      ),
    );
  }

  /// Show a success snackbar
  void showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white),
            const SizedBox(width: 8),
            Text(message),
          ],
        ),
        backgroundColor: Colors.green,
      ),
    );
  }

  /// Show an error snackbar
  void showErrorSnackBar(String message) {
    showSnackBar(message, isError: true);
  }
}

/// List extensions
extension ListExtensions<T> on List<T> {
  /// Safe get at index, returns null if out of bounds
  T? safeGet(int index) {
    if (index < 0 || index >= length) return null;
    return this[index];
  }

  /// Get first element or null
  T? get firstOrNull => isEmpty ? null : first;

  /// Get last element or null
  T? get lastOrNull => isEmpty ? null : last;
}

/// Map extensions
extension MapExtensions<K, V> on Map<K, V> {
  /// Get value or default
  V getOr(K key, V defaultValue) => this[key] ?? defaultValue;
}
