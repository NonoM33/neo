import '../entities/user.dart';
import '../../core/errors/failures.dart';

/// Result type for operations that can fail
sealed class Result<T> {
  const Result();
}

class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

class Error<T> extends Result<T> {
  final Failure failure;
  const Error(this.failure);
}

/// Auth repository interface
abstract class AuthRepository {
  /// Login with email and password
  Future<Result<User>> login({
    required String email,
    required String password,
  });

  /// Logout the current user
  Future<Result<void>> logout();

  /// Get the current authenticated user
  Future<Result<User?>> getCurrentUser();

  /// Check if user is authenticated
  Future<bool> isAuthenticated();

  /// Refresh the auth token
  Future<Result<void>> refreshToken();

  /// Get stored auth tokens
  Future<AuthTokens?> getTokens();

  /// Clear stored auth data
  Future<void> clearAuth();
}
