import '../entities/user.dart';
import 'auth_repository.dart';

/// User management repository interface (admin only)
abstract class UserRepository {
  Future<Result<List<User>>> getUsers({
    String? role,
    String? search,
    int page = 1,
    int limit = 20,
  });
  Future<Result<User>> getUser(String id);
  Future<Result<User>> createUser({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
    String role = 'integrateur',
  });
  Future<Result<User>> updateUser(String id, Map<String, dynamic> data);
  Future<Result<void>> deleteUser(String id);
}
