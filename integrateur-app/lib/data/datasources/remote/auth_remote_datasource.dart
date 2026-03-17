import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/user_model.dart';

/// Remote data source for authentication
abstract class AuthRemoteDataSource {
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  });

  Future<void> logout(String? refreshToken);

  Future<UserModel> getCurrentUser();

  Future<AuthTokensModel> refreshToken(String refreshToken);
}

/// Implementation using API client
class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSourceImpl(this._apiClient);

  @override
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.login,
      data: {
        'email': email,
        'password': password,
      },
    );

    return LoginResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> logout(String? refreshToken) async {
    await _apiClient.post(
      ApiEndpoints.logout,
      data: refreshToken != null ? {'refreshToken': refreshToken} : {},
    );
  }

  @override
  Future<UserModel> getCurrentUser() async {
    final response = await _apiClient.get(ApiEndpoints.me);
    return UserModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<AuthTokensModel> refreshToken(String refreshToken) async {
    final response = await _apiClient.post(
      ApiEndpoints.refreshToken,
      data: {'refreshToken': refreshToken},
    );

    return AuthTokensModel.fromRefreshJson(
        response.data as Map<String, dynamic>);
  }
}
