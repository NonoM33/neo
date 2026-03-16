import 'package:equatable/equatable.dart';

/// Base failure class for all application failures
abstract class Failure extends Equatable {
  final String message;
  final String? code;

  const Failure({required this.message, this.code});

  @override
  List<Object?> get props => [message, code];
}

/// Network-related failures
class NetworkFailure extends Failure {
  const NetworkFailure({
    super.message = 'Une erreur réseau est survenue',
    super.code,
  });
}

/// Server-side failures (HTTP 5xx)
class ServerFailure extends Failure {
  final int? statusCode;

  const ServerFailure({
    super.message = 'Erreur serveur',
    super.code,
    this.statusCode,
  });

  @override
  List<Object?> get props => [message, code, statusCode];
}

/// Authentication failures
class AuthFailure extends Failure {
  const AuthFailure({
    super.message = 'Erreur d\'authentification',
    super.code,
  });
}

/// Invalid credentials failure
class InvalidCredentialsFailure extends AuthFailure {
  const InvalidCredentialsFailure({
    super.message = 'Email ou mot de passe incorrect',
    super.code = 'INVALID_CREDENTIALS',
  });
}

/// Session expired failure
class SessionExpiredFailure extends AuthFailure {
  const SessionExpiredFailure({
    super.message = 'Votre session a expiré, veuillez vous reconnecter',
    super.code = 'SESSION_EXPIRED',
  });
}

/// Cache/local storage failures
class CacheFailure extends Failure {
  const CacheFailure({
    super.message = 'Erreur de cache local',
    super.code,
  });
}

/// Validation failures
class ValidationFailure extends Failure {
  final Map<String, List<String>>? fieldErrors;

  const ValidationFailure({
    super.message = 'Erreur de validation',
    super.code,
    this.fieldErrors,
  });

  @override
  List<Object?> get props => [message, code, fieldErrors];
}

/// Not found failure
class NotFoundFailure extends Failure {
  const NotFoundFailure({
    super.message = 'Ressource non trouvée',
    super.code = 'NOT_FOUND',
  });
}

/// Offline failure - no internet connection
class OfflineFailure extends Failure {
  const OfflineFailure({
    super.message = 'Pas de connexion internet',
    super.code = 'OFFLINE',
  });
}

/// Sync failure
class SyncFailure extends Failure {
  const SyncFailure({
    super.message = 'Erreur de synchronisation',
    super.code,
  });
}

/// Permission denied failure
class PermissionDeniedFailure extends Failure {
  const PermissionDeniedFailure({
    super.message = 'Permission refusée',
    super.code = 'PERMISSION_DENIED',
  });
}

/// Unknown/unexpected failure
class UnknownFailure extends Failure {
  final Object? originalError;

  const UnknownFailure({
    super.message = 'Une erreur inattendue est survenue',
    super.code,
    this.originalError,
  });

  @override
  List<Object?> get props => [message, code, originalError];
}
