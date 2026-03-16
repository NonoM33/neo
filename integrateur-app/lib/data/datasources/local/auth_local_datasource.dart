import '../../../core/storage/secure_storage.dart';
import '../../../domain/entities/user.dart';
import '../../models/user_model.dart';

/// Local data source for authentication
abstract class AuthLocalDataSource {
  Future<void> saveTokens(AuthTokensModel tokens);
  Future<AuthTokensModel?> getTokens();
  Future<void> saveUser(UserModel user);
  Future<UserModel?> getUser();
  Future<bool> isAuthenticated();
  Future<void> clearAuth();
}

/// Implementation of AuthLocalDataSource using secure storage
class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final SecureStorage _storage;

  AuthLocalDataSourceImpl(this._storage);

  @override
  Future<void> saveTokens(AuthTokensModel tokens) async {
    await _storage.setAccessToken(tokens.accessToken);
    await _storage.setRefreshToken(tokens.refreshToken);
  }

  @override
  Future<AuthTokensModel?> getTokens() async {
    final accessToken = await _storage.getAccessToken();
    final refreshToken = await _storage.getRefreshToken();

    if (accessToken == null || refreshToken == null) return null;

    return AuthTokensModel(
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: DateTime.now().add(const Duration(hours: 24)), // Default expiry
    );
  }

  @override
  Future<void> saveUser(UserModel user) async {
    await _storage.setUserData(
      id: user.id,
      email: user.email,
      role: user.role.name,
    );
  }

  @override
  Future<UserModel?> getUser() async {
    final id = await _storage.getUserId();
    final email = await _storage.getUserEmail();
    final roleStr = await _storage.getUserRole();

    if (id == null || email == null) return null;

    // Return minimal user from cached data
    return UserModel(
      id: id,
      email: email,
      firstName: '',
      lastName: '',
      role: roleStr != null
          ? UserRole.fromString(roleStr)
          : UserRole.auditeur,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<bool> isAuthenticated() async {
    return await _storage.isAuthenticated();
  }

  @override
  Future<void> clearAuth() async {
    await _storage.clearAuth();
  }
}
