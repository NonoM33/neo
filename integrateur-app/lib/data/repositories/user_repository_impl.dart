import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/user_repository.dart';
import '../datasources/remote/user_remote_datasource.dart';
import '../models/user_model.dart';

class UserRepositoryImpl implements UserRepository {
  final UserRemoteDataSource _remoteDataSource;

  UserRepositoryImpl({required UserRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<User>>> getUsers({
    String? role,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (role != null) 'role': role,
        if (search != null) 'search': search,
      };
      final data = await _remoteDataSource.getUsers(queryParams: queryParams);
      final usersJson = data['data'] as List<dynamic>? ?? [];
      final users = usersJson
          .map((json) => UserModel.fromJson(json as Map<String, dynamic>))
          .toList();
      return Success(users);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<User>> getUser(String id) async {
    try {
      final user = await _remoteDataSource.getUser(id);
      return Success(user);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Utilisateur non trouvé'));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<User>> createUser({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
    String role = 'integrateur',
  }) async {
    try {
      final data = {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'role': role,
        if (phone != null) 'phone': phone,
      };
      final user = await _remoteDataSource.createUser(data);
      return Success(user);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<User>> updateUser(String id, Map<String, dynamic> data) async {
    try {
      final user = await _remoteDataSource.updateUser(id, data);
      return Success(user);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Utilisateur non trouvé'));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteUser(String id) async {
    try {
      await _remoteDataSource.deleteUser(id);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }
}
