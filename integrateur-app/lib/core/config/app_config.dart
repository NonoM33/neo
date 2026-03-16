/// Application configuration
class AppConfig {
  static const String appName = 'Neo Intégrateur';
  static const String appVersion = '1.0.0';

  // API Configuration
  static const String baseUrl = 'https://api.neo-integrateur.com';
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Cache Configuration
  static const String hiveBoxName = 'neo_integrateur_cache';
  static const String authBoxName = 'neo_integrateur_auth';
  static const String syncBoxName = 'neo_integrateur_sync';

  // Pagination
  static const int defaultPageSize = 20;

  // Session
  static const Duration sessionTimeout = Duration(hours: 24);
  static const Duration refreshTokenThreshold = Duration(hours: 1);

  // Sync
  static const Duration syncInterval = Duration(minutes: 5);
  static const int maxRetryAttempts = 3;

  // Quotes
  static const int defaultQuoteValidityDays = 30;
  static const double defaultTvaRate = 20.0;
  static const double reducedTvaRate = 10.0;

  // Image
  static const int maxImageWidth = 1920;
  static const int maxImageHeight = 1080;
  static const int imageQuality = 85;

  AppConfig._();
}

/// Environment configuration
enum Environment {
  development,
  staging,
  production,
}

class EnvironmentConfig {
  static Environment current = Environment.development;

  static String get baseUrl {
    switch (current) {
      case Environment.development:
        return 'http://localhost:8080/api';
      case Environment.staging:
        return 'https://staging-api.neo-integrateur.com';
      case Environment.production:
        return 'https://api.neo-integrateur.com';
    }
  }

  static bool get isDebug => current == Environment.development;
}
