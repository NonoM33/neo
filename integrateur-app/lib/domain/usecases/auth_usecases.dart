import '../../core/errors/failures.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

/// Login use case
class LoginUseCase {
  final AuthRepository _repository;

  LoginUseCase(this._repository);

  Future<Result<User>> call({
    required String email,
    required String password,
  }) async {
    // Validate input
    if (email.isEmpty) {
      return Error(ValidationFailure(message: 'L\'email est requis'));
    }
    if (password.isEmpty) {
      return Error(ValidationFailure(message: 'Le mot de passe est requis'));
    }

    return _repository.login(email: email, password: password);
  }
}

/// Logout use case
class LogoutUseCase {
  final AuthRepository _repository;

  LogoutUseCase(this._repository);

  Future<Result<void>> call() async {
    return _repository.logout();
  }
}

/// Get current user use case
class GetCurrentUserUseCase {
  final AuthRepository _repository;

  GetCurrentUserUseCase(this._repository);

  Future<Result<User?>> call() async {
    return _repository.getCurrentUser();
  }
}

/// Check authentication status use case
class CheckAuthStatusUseCase {
  final AuthRepository _repository;

  CheckAuthStatusUseCase(this._repository);

  Future<bool> call() async {
    return _repository.isAuthenticated();
  }
}
