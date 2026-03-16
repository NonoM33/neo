import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/domain/entities/user.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/usecases/auth_usecases.dart';
import 'package:neo_integrateur/presentation/blocs/auth/auth_bloc.dart';
import 'package:neo_integrateur/presentation/blocs/auth/auth_event.dart';
import 'package:neo_integrateur/presentation/blocs/auth/auth_state.dart';

// Mock classes
class MockAuthRepository extends Mock implements AuthRepository {}

class MockLoginUseCase extends Mock implements LoginUseCase {}

class MockLogoutUseCase extends Mock implements LogoutUseCase {}

class MockGetCurrentUserUseCase extends Mock implements GetCurrentUserUseCase {}

class MockCheckAuthStatusUseCase extends Mock implements CheckAuthStatusUseCase {}

void main() {
  late AuthBloc authBloc;
  late MockLoginUseCase mockLoginUseCase;
  late MockLogoutUseCase mockLogoutUseCase;
  late MockGetCurrentUserUseCase mockGetCurrentUserUseCase;
  late MockCheckAuthStatusUseCase mockCheckAuthStatusUseCase;

  final testUser = User(
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.integrateur,
    createdAt: DateTime(2024, 1, 1),
  );

  setUp(() {
    mockLoginUseCase = MockLoginUseCase();
    mockLogoutUseCase = MockLogoutUseCase();
    mockGetCurrentUserUseCase = MockGetCurrentUserUseCase();
    mockCheckAuthStatusUseCase = MockCheckAuthStatusUseCase();

    authBloc = AuthBloc(
      loginUseCase: mockLoginUseCase,
      logoutUseCase: mockLogoutUseCase,
      getCurrentUserUseCase: mockGetCurrentUserUseCase,
      checkAuthStatusUseCase: mockCheckAuthStatusUseCase,
    );
  });

  tearDown(() {
    authBloc.close();
  });

  group('AuthBloc', () {
    test('initial state is AuthInitial', () {
      expect(authBloc.state, isA<AuthInitial>());
    });

    group('AuthCheckRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthUnauthenticated] when not authenticated',
        build: () {
          when(() => mockCheckAuthStatusUseCase())
              .thenAnswer((_) async => false);
          return authBloc;
        },
        act: (bloc) => bloc.add(const AuthCheckRequested()),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthUnauthenticated>(),
        ],
        verify: (_) {
          verify(() => mockCheckAuthStatusUseCase()).called(1);
        },
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthAuthenticated] when authenticated with user',
        build: () {
          when(() => mockCheckAuthStatusUseCase())
              .thenAnswer((_) async => true);
          when(() => mockGetCurrentUserUseCase())
              .thenAnswer((_) async => Success(testUser));
          return authBloc;
        },
        act: (bloc) => bloc.add(const AuthCheckRequested()),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthAuthenticated>(),
        ],
        verify: (_) {
          verify(() => mockCheckAuthStatusUseCase()).called(1);
          verify(() => mockGetCurrentUserUseCase()).called(1);
        },
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthUnauthenticated] when authenticated but no user',
        build: () {
          when(() => mockCheckAuthStatusUseCase())
              .thenAnswer((_) async => true);
          when(() => mockGetCurrentUserUseCase())
              .thenAnswer((_) async => const Success<User?>(null));
          return authBloc;
        },
        act: (bloc) => bloc.add(const AuthCheckRequested()),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthUnauthenticated>(),
        ],
      );
    });

    group('AuthLoginRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthAuthenticated] on successful login',
        build: () {
          when(() => mockLoginUseCase(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => Success(testUser));
          return authBloc;
        },
        act: (bloc) => bloc.add(const AuthLoginRequested(
          email: 'test@example.com',
          password: 'password123',
        )),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthAuthenticated>(),
        ],
        verify: (_) {
          verify(() => mockLoginUseCase(
                email: 'test@example.com',
                password: 'password123',
              )).called(1);
        },
      );

      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthError] on login failure',
        build: () {
          when(() => mockLoginUseCase(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => const Error(
              InvalidCredentialsFailure(),
            ));
          return authBloc;
        },
        act: (bloc) => bloc.add(const AuthLoginRequested(
          email: 'wrong@example.com',
          password: 'wrongpassword',
        )),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthError>(),
        ],
      );
    });

    group('AuthLogoutRequested', () {
      blocTest<AuthBloc, AuthState>(
        'emits [AuthLoading, AuthUnauthenticated] on logout',
        build: () {
          when(() => mockLogoutUseCase())
              .thenAnswer((_) async => const Success(null));
          return authBloc;
        },
        act: (bloc) => bloc.add(const AuthLogoutRequested()),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthUnauthenticated>(),
        ],
        verify: (_) {
          verify(() => mockLogoutUseCase()).called(1);
        },
      );
    });
  });

  group('AuthState', () {
    test('AuthAuthenticated contains user', () {
      final state = AuthAuthenticated(testUser);
      expect(state.user, equals(testUser));
      expect(state.user.fullName, equals('Test User'));
    });

    test('AuthError contains message', () {
      const state = AuthError('Login failed');
      expect(state.message, equals('Login failed'));
    });

    test('AuthStates are equatable', () {
      const state1 = AuthInitial();
      const state2 = AuthInitial();
      expect(state1, equals(state2));

      const loading1 = AuthLoading();
      const loading2 = AuthLoading();
      expect(loading1, equals(loading2));
    });
  });
}
