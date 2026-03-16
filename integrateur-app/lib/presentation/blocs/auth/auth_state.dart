import 'package:equatable/equatable.dart';
import '../../../domain/entities/user.dart';

/// Auth states - sealed class hierarchy
sealed class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Initial state - checking authentication
final class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Loading state
final class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Authenticated state
final class AuthAuthenticated extends AuthState {
  final User user;

  const AuthAuthenticated(this.user);

  @override
  List<Object?> get props => [user];
}

/// Unauthenticated state
final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Authentication error state
final class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}
