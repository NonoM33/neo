import 'package:equatable/equatable.dart';

/// User role enum
enum UserRole {
  admin,
  integrateur,
  auditeur;

  String get displayName {
    switch (this) {
      case UserRole.admin:
        return 'Administrateur';
      case UserRole.integrateur:
        return 'Intégrateur';
      case UserRole.auditeur:
        return 'Auditeur';
    }
  }

  static UserRole fromString(String value) {
    return UserRole.values.firstWhere(
      (role) => role.name == value.toLowerCase(),
      orElse: () => UserRole.auditeur,
    );
  }
}

/// User entity
class User extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final UserRole role;
  final String? phone;
  final String? avatarUrl;
  final DateTime createdAt;
  final DateTime? lastLoginAt;
  final bool isActive;

  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.phone,
    this.avatarUrl,
    required this.createdAt,
    this.lastLoginAt,
    this.isActive = true,
  });

  String get fullName => '$firstName $lastName';

  String get initials {
    final firstInitial = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final lastInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$firstInitial$lastInitial';
  }

  bool get isAdmin => role == UserRole.admin;
  bool get isIntegrateur => role == UserRole.integrateur;
  bool get isAuditeur => role == UserRole.auditeur;

  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    UserRole? role,
    String? phone,
    String? avatarUrl,
    DateTime? createdAt,
    DateTime? lastLoginAt,
    bool? isActive,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role ?? this.role,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        lastName,
        role,
        phone,
        avatarUrl,
        createdAt,
        lastLoginAt,
        isActive,
      ];
}

/// Auth tokens
class AuthTokens extends Equatable {
  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;

  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresAt,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  bool get shouldRefresh {
    final threshold = expiresAt.subtract(const Duration(hours: 1));
    return DateTime.now().isAfter(threshold);
  }

  @override
  List<Object?> get props => [accessToken, refreshToken, expiresAt];
}
