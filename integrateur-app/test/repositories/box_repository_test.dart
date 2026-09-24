import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/exceptions.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/data/datasources/remote/box_remote_datasource.dart';
import 'package:neo_integrateur/data/models/box_model.dart';
import 'package:neo_integrateur/data/repositories/box_repository_impl.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';

class MockBoxRemoteDataSource extends Mock implements BoxRemoteDataSource {}

void main() {
  late MockBoxRemoteDataSource remote;
  late BoxRepositoryImpl repository;

  setUp(() {
    remote = MockBoxRemoteDataSource();
    repository = BoxRepositoryImpl(remoteDataSource: remote);
  });

  Future<Result<dynamic>> claim() =>
      repository.claimBox(provisioningToken: '7K3M9PQR2STVWXYZ4ABC', clientId: 'c1');

  test('rend la box rattachee', () async {
    when(() => remote.claim(provisioningToken: any(named: 'provisioningToken'), clientId: any(named: 'clientId')))
        .thenAnswer((_) async => const ClaimedBoxModel(id: 'b1', tokenSuffix: '4ABC', status: 'claimed', clientId: 'c1'));

    final result = await claim();

    expect(result, isA<Success<dynamic>>());
    expect((result as Success).data.tokenSuffix, '4ABC');
    verify(() => remote.claim(provisioningToken: '7K3M9PQR2STVWXYZ4ABC', clientId: 'c1')).called(1);
  });

  test('une box inconnue du backend explique quoi verifier', () async {
    when(() => remote.claim(provisioningToken: any(named: 'provisioningToken'), clientId: any(named: 'clientId')))
        .thenThrow(const NotFoundException(message: 'Box non trouvé'));

    final result = await claim();

    expect(result, isA<Error<dynamic>>());
    final failure = (result as Error).failure;
    expect(failure, isA<NotFoundFailure>());
    expect(failure.message, contains('allumée'));
  });

  test('une box deja rattachee remonte le message du backend', () async {
    when(() => remote.claim(provisioningToken: any(named: 'provisioningToken'), clientId: any(named: 'clientId')))
        .thenThrow(const ServerException(message: 'Cette box est deja rattachee a un client', statusCode: 409));

    final result = await claim();

    final failure = (result as Error).failure;
    expect(failure, isA<ServerFailure>());
    expect(failure.message, contains('deja rattachee'));
  });

  test('un jeton refuse par le backend est une erreur de validation', () async {
    when(() => remote.claim(provisioningToken: any(named: 'provisioningToken'), clientId: any(named: 'clientId')))
        .thenThrow(const ValidationException(message: 'Jeton de provisioning invalide'));

    final result = await claim();

    expect((result as Error).failure, isA<ValidationFailure>());
  });
}
