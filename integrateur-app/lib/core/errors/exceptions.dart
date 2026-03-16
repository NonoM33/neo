/// Base exception class for all application exceptions
class AppException implements Exception {
  final String message;
  final String? code;
  final Object? originalError;

  const AppException({
    required this.message,
    this.code,
    this.originalError,
  });

  @override
  String toString() => 'AppException: $message (code: $code)';
}

/// Network exceptions
class NetworkException extends AppException {
  const NetworkException({
    super.message = 'Network error occurred',
    super.code,
    super.originalError,
  });
}

/// Server exceptions (HTTP 5xx)
class ServerException extends AppException {
  final int? statusCode;

  const ServerException({
    super.message = 'Server error',
    super.code,
    super.originalError,
    this.statusCode,
  });
}

/// Authentication exceptions
class AuthException extends AppException {
  const AuthException({
    super.message = 'Authentication error',
    super.code,
    super.originalError,
  });
}

/// Invalid credentials exception
class InvalidCredentialsException extends AuthException {
  const InvalidCredentialsException({
    super.message = 'Invalid email or password',
    super.code = 'INVALID_CREDENTIALS',
  });
}

/// Session expired exception
class SessionExpiredException extends AuthException {
  const SessionExpiredException({
    super.message = 'Session expired',
    super.code = 'SESSION_EXPIRED',
  });
}

/// Cache exceptions
class CacheException extends AppException {
  const CacheException({
    super.message = 'Cache error',
    super.code,
    super.originalError,
  });
}

/// Not found exception
class NotFoundException extends AppException {
  const NotFoundException({
    super.message = 'Resource not found',
    super.code = 'NOT_FOUND',
  });
}

/// Validation exception
class ValidationException extends AppException {
  final Map<String, List<String>>? fieldErrors;

  const ValidationException({
    super.message = 'Validation error',
    super.code,
    this.fieldErrors,
  });
}

/// Offline exception
class OfflineException extends AppException {
  const OfflineException({
    super.message = 'No internet connection',
    super.code = 'OFFLINE',
  });
}

/// Sync exception
class SyncException extends AppException {
  const SyncException({
    super.message = 'Sync error',
    super.code,
    super.originalError,
  });
}
