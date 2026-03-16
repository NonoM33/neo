import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/user_model.dart';

/// Remote data source for authentication
abstract class AuthRemoteDataSource {
  Future<LoginResponseModel> login({
    required String email,
    required String password,
  });

  Future<void> logout();

  Future<UserModel> getCurrentUser();

  Future<AuthTokensModel> refreshToken(String refreshToken);
}

/// Implementation of AuthRemoteDataSource using API client
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
  Future<void> logout() async {
    await _apiClient.post(ApiEndpoints.logout);
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
      data: {'refresh_token': refreshToken},
    );

    return AuthTokensModel.fromJson(response.data as Map<String, dynamic>);
  }
}
