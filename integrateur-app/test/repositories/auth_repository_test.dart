import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/exceptions.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/core/network/api_client.dart';
import 'package:neo_integrateur/data/datasources/local/auth_local_datasource.dart';
import 'package:neo_integrateur/data/datasources/remote/auth_remote_datasource.dart';
import 'package:neo_integrateur/data/models/user_model.dart';
import 'package:neo_integrateur/data/repositories/auth_repository_impl.dart';
import 'package:neo_integrateur/domain/entities/user.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';

// Mock classes
class MockAuthRemoteDataSource extends Mock implements AuthRemoteDataSource {}

class MockAuthLocalDataSource extends Mock implements AuthLocalDataSource {}

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late AuthRepositoryImpl repository;
  late MockAuthRemoteDataSource mockRemoteDataSource;
  late MockAuthLocalDataSource mockLocalDataSource;
  late MockApiClient mockApiClient;

  final testUserModel = UserModel(
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.integrateur,
    createdAt: DateTime(2024, 1, 1),
  );

  final testTokensModel = AuthTokensModel(
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: DateTime.now().add(const Duration(hours: 24)),
  );

  final testLoginResponse = LoginResponseModel(
    user: testUserModel,
    tokens: testTokensModel,
  );

  setUp(() {
    mockRemoteDataSource = MockAuthRemoteDataSource();
    mockLocalDataSource = MockAuthLocalDataSource();
    mockApiClient = MockApiClient();

    repository = AuthRepositoryImpl(
      remoteDataSource: mockRemoteDataSource,
      localDataSource: mockLocalDataSource,
      apiClient: mockApiClient,
    );
  });

  group('AuthRepositoryImpl', () {
    group('login', () {
      test('returns user on successful login', () async {
        // Arrange
        when(() => mockRemoteDataSource.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => testLoginResponse);

        when(() => mockLocalDataSource.saveTokens(any()))
            .thenAnswer((_) async {});
        when(() => mockLocalDataSource.saveUser(any()))
            .thenAnswer((_) async {});
        when(() => mockApiClient.setAuthToken(any())).thenReturn(null);

        // Act
        final result = await repository.login(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(result, isA<Success<User>>());
        final user = (result as Success<User>).data;
        expect(user.email, equals('test@example.com'));
        expect(user.fullName, equals('Test User'));

        verify(() => mockRemoteDataSource.login(
              email: 'test@example.com',
              password: 'password123',
            )).called(1);
        verify(() => mockLocalDataSource.saveTokens(testTokensModel)).called(1);
        verify(() => mockLocalDataSource.saveUser(testUserModel)).called(1);
        verify(() => mockApiClient.setAuthToken('test-access-token')).called(1);
      });

      test('returns InvalidCredentialsFailure on invalid credentials', () async {
        // Arrange
        when(() => mockRemoteDataSource.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(const InvalidCredentialsException());

        // Act
        final result = await repository.login(
          email: 'wrong@example.com',
          password: 'wrongpassword',
        );

        // Assert
        expect(result, isA<Error<User>>());
        final failure = (result as Error<User>).failure;
        expect(failure, isA<InvalidCredentialsFailure>());
      });

      test('returns NetworkFailure on network error', () async {
        // Arrange
        when(() => mockRemoteDataSource.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(const NetworkException(message: 'No internet'));

        // Act
        final result = await repository.login(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(result, isA<Error<User>>());
        final failure = (result as Error<User>).failure;
        expect(failure, isA<NetworkFailure>());
        expect(failure.message, equals('No internet'));
      });
    });

    group('logout', () {
      test('clears local data and returns success', () async {
        // Arrange
        when(() => mockLocalDataSource.getTokens())
            .thenAnswer((_) async => testTokensModel);
        when(() => mockRemoteDataSource.logout(any()))
            .thenAnswer((_) async {});
        when(() => mockLocalDataSource.clearAuth())
            .thenAnswer((_) async {});
        when(() => mockApiClient.clearAuthToken()).thenReturn(null);

        // Act
        final result = await repository.logout();

        // Assert
        expect(result, isA<Success<void>>());
        verify(() => mockLocalDataSource.clearAuth()).called(1);
        verify(() => mockApiClient.clearAuthToken()).called(1);
      });

      test('still clears local data even if remote logout fails', () async {
        // Arrange
        when(() => mockLocalDataSource.getTokens())
            .thenAnswer((_) async => testTokensModel);
        when(() => mockRemoteDataSource.logout(any()))
            .thenThrow(const NetworkException(message: 'Network error'));
        when(() => mockLocalDataSource.clearAuth())
            .thenAnswer((_) async {});
        when(() => mockApiClient.clearAuthToken()).thenReturn(null);

        // Act
        final result = await repository.logout();

        // Assert
        expect(result, isA<Success<void>>());
        verify(() => mockLocalDataSource.clearAuth()).called(1);
        verify(() => mockApiClient.clearAuthToken()).called(1);
      });
    });

    group('getCurrentUser', () {
      test('returns user from remote when authenticated', () async {
        // Arrange
        when(() => mockLocalDataSource.isAuthenticated())
            .thenAnswer((_) async => true);
        when(() => mockRemoteDataSource.getCurrentUser())
            .thenAnswer((_) async => testUserModel);
        when(() => mockLocalDataSource.saveUser(any()))
            .thenAnswer((_) async {});

        // Act
        final result = await repository.getCurrentUser();

        // Assert
        expect(result, isA<Success<User?>>());
        final user = (result as Success<User?>).data;
        expect(user, isNotNull);
        expect(user!.email, equals('test@example.com'));
      });

      test('returns null when not authenticated', () async {
        // Arrange
        when(() => mockLocalDataSource.isAuthenticated())
            .thenAnswer((_) async => false);

        // Act
        final result = await repository.getCurrentUser();

        // Assert
        expect(result, isA<Success<User?>>());
        final user = (result as Success<User?>).data;
        expect(user, isNull);
      });

      test('returns cached user on network error', () async {
        // Arrange
        when(() => mockLocalDataSource.isAuthenticated())
            .thenAnswer((_) async => true);
        when(() => mockRemoteDataSource.getCurrentUser())
            .thenThrow(const NetworkException(message: 'Offline'));
        when(() => mockLocalDataSource.getUser())
            .thenAnswer((_) async => testUserModel);

        // Act
        final result = await repository.getCurrentUser();

        // Assert
        expect(result, isA<Success<User?>>());
        final user = (result as Success<User?>).data;
        expect(user, isNotNull);
      });
    });

    group('isAuthenticated', () {
      test('returns true when tokens exist', () async {
        // Arrange
        when(() => mockLocalDataSource.isAuthenticated())
            .thenAnswer((_) async => true);

        // Act
        final result = await repository.isAuthenticated();

        // Assert
        expect(result, isTrue);
      });

      test('returns false when no tokens', () async {
        // Arrange
        when(() => mockLocalDataSource.isAuthenticated())
            .thenAnswer((_) async => false);

        // Act
        final result = await repository.isAuthenticated();

        // Assert
        expect(result, isFalse);
      });
    });

    group('clearAuth', () {
      test('clears all auth data', () async {
        // Arrange
        when(() => mockLocalDataSource.clearAuth())
            .thenAnswer((_) async {});
        when(() => mockApiClient.clearAuthToken()).thenReturn(null);

        // Act
        await repository.clearAuth();

        // Assert
        verify(() => mockLocalDataSource.clearAuth()).called(1);
        verify(() => mockApiClient.clearAuthToken()).called(1);
      });
    });
  });
}
