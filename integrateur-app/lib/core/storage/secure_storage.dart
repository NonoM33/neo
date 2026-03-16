import 'package:hive_flutter/hive_flutter.dart';
import '../config/app_config.dart';

/// Secure storage for sensitive data (tokens, credentials)
class SecureStorage {
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _userEmailKey = 'user_email';
  static const String _userRoleKey = 'user_role';

  Box? _box;

  Future<Box> get box async {
    _box ??= await Hive.openBox(AppConfig.authBoxName);
    return _box!;
  }

  /// Store access token
  Future<void> setAccessToken(String token) async {
    final b = await box;
    await b.put(_accessTokenKey, token);
  }

  /// Get access token
  Future<String?> getAccessToken() async {
    final b = await box;
    return b.get(_accessTokenKey) as String?;
  }

  /// Store refresh token
  Future<void> setRefreshToken(String token) async {
    final b = await box;
    await b.put(_refreshTokenKey, token);
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    final b = await box;
    return b.get(_refreshTokenKey) as String?;
  }

  /// Store user data
  Future<void> setUserData({
    required String id,
    required String email,
    required String role,
  }) async {
    final b = await box;
    await b.put(_userIdKey, id);
    await b.put(_userEmailKey, email);
    await b.put(_userRoleKey, role);
  }

  /// Get user ID
  Future<String?> getUserId() async {
    final b = await box;
    return b.get(_userIdKey) as String?;
  }

  /// Get user email
  Future<String?> getUserEmail() async {
    final b = await box;
    return b.get(_userEmailKey) as String?;
  }

  /// Get user role
  Future<String?> getUserRole() async {
    final b = await box;
    return b.get(_userRoleKey) as String?;
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Clear all auth data
  Future<void> clearAuth() async {
    final b = await box;
    await b.clear();
  }

  /// Close the box
  Future<void> close() async {
    await _box?.close();
    _box = null;
  }
}
