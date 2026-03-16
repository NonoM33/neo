import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/auth_local_datasource.dart';
import '../datasources/remote/auth_remote_datasource.dart';

/// Implementation of AuthRepository
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final AuthLocalDataSource _localDataSource;
  final ApiClient _apiClient;

  AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required AuthLocalDataSource localDataSource,
    required ApiClient apiClient,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource,
        _apiClient = apiClient;

  @override
  Future<Result<User>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _remoteDataSource.login(
        email: email,
        password: password,
      );

      // Save tokens and user data locally
      await _localDataSource.saveTokens(response.tokens);
      await _localDataSource.saveUser(response.user);

      // Set token in API client
      _apiClient.setAuthToken(response.tokens.accessToken);

      return Success(response.user);
    } on InvalidCredentialsException {
      return const Error(InvalidCredentialsFailure());
    } on NetworkException catch (e) {
      return Error(NetworkFailure(message: e.message));
    } on AppException catch (e) {
      return Error(UnknownFailure(message: e.message, originalError: e));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> logout() async {
    try {
      await _remoteDataSource.logout();
    } catch (_) {
      // Ignore errors during logout, still clear local data
    }

    await _localDataSource.clearAuth();
    _apiClient.clearAuthToken();

    return const Success(null);
  }

  @override
  Future<Result<User?>> getCurrentUser() async {
    try {
      // First check if we have a token
      final isAuth = await _localDataSource.isAuthenticated();
      if (!isAuth) {
        return const Success(null);
      }

      // Try to get fresh user data from server
      try {
        final user = await _remoteDataSource.getCurrentUser();
        await _localDataSource.saveUser(user);
        return Success(user);
      } on NetworkException {
        // If offline, return cached user
        final cachedUser = await _localDataSource.getUser();
        return Success(cachedUser);
      }
    } on SessionExpiredException {
      await _localDataSource.clearAuth();
      return const Error(SessionExpiredFailure());
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<bool> isAuthenticated() async {
    return await _localDataSource.isAuthenticated();
  }

  @override
  Future<Result<void>> refreshToken() async {
    try {
      final tokens = await _localDataSource.getTokens();
      if (tokens == null) {
        return const Error(SessionExpiredFailure());
      }

      final newTokens = await _remoteDataSource.refreshToken(tokens.refreshToken);
      await _localDataSource.saveTokens(newTokens);
      _apiClient.setAuthToken(newTokens.accessToken);

      return const Success(null);
    } on AuthException {
      await _localDataSource.clearAuth();
      return const Error(SessionExpiredFailure());
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<AuthTokens?> getTokens() async {
    return await _localDataSource.getTokens();
  }

  @override
  Future<void> clearAuth() async {
    await _localDataSource.clearAuth();
    _apiClient.clearAuthToken();
  }
}
