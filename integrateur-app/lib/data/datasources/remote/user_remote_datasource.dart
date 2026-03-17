import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/user_model.dart';

/// Remote data source for user management (admin only)
abstract class UserRemoteDataSource {
  Future<Map<String, dynamic>> getUsers({Map<String, dynamic>? queryParams});
  Future<UserModel> getUser(String id);
  Future<UserModel> createUser(Map<String, dynamic> data);
  Future<UserModel> updateUser(String id, Map<String, dynamic> data);
  Future<void> deleteUser(String id);
}

class UserRemoteDataSourceImpl implements UserRemoteDataSource {
  final ApiClient _apiClient;

  UserRemoteDataSourceImpl(this._apiClient);

  @override
  Future<Map<String, dynamic>> getUsers({Map<String, dynamic>? queryParams}) async {
    final response = await _apiClient.get(
      ApiEndpoints.users,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<UserModel> getUser(String id) async {
    final response = await _apiClient.get(ApiEndpoints.user(id));
    return UserModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<UserModel> createUser(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.users, data: data);
    return UserModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<UserModel> updateUser(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.user(id), data: data);
    return UserModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteUser(String id) async {
    await _apiClient.delete(ApiEndpoints.user(id));
  }
}
