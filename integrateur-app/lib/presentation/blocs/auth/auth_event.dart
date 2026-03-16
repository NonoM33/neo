import 'package:equatable/equatable.dart';

/// Auth events
sealed class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Check authentication status
final class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

/// Login with credentials
final class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({
    required this.email,
    required this.password,
  });

  @override
  List<Object?> get props => [email, password];
}

/// Logout
final class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

/// Token refresh
final class AuthRefreshRequested extends AuthEvent {
  const AuthRefreshRequested();
}
