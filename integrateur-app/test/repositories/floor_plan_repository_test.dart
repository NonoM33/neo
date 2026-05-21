import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/data/datasources/remote/floor_plan_remote_datasource.dart';
import 'package:neo_integrateur/data/models/floor_plan_model.dart';
import 'package:neo_integrateur/data/repositories/floor_plan_repository_impl.dart';

class MockFloorPlanRemoteDataSource extends Mock
    implements FloorPlanRemoteDataSource {}

void main() {
  late FloorPlanRepositoryImpl repository;
  late MockFloorPlanRemoteDataSource mockRemote;

  final testPlan = FloorPlanModel(
    id: 'plan-1',
    roomId: 'room-1',
    projectId: 'proj-1',
    createdAt: DateTime(2026, 5, 1),
  );

  setUp(() {
    mockRemote = MockFloorPlanRemoteDataSource();
    repository = FloorPlanRepositoryImpl(remoteDataSource: mockRemote);
  });

  group('FloorPlanRepositoryImpl', () {
    test('getFloorPlanByRoom forwards roomId and returns plan', () async {
      when(() => mockRemote.getFloorPlanByRoom(any()))
          .thenAnswer((_) async => testPlan);

      final result = await repository.getFloorPlanByRoom('room-1');

      expect(result, isNotNull);
      expect(result!.id, equals('plan-1'));
      verify(() => mockRemote.getFloorPlanByRoom('room-1')).called(1);
    });

    test('getFloorPlanByRoom returns null when remote returns null', () async {
      when(() => mockRemote.getFloorPlanByRoom(any()))
          .thenAnswer((_) async => null);

      final result = await repository.getFloorPlanByRoom('room-empty');

      expect(result, isNull);
    });

    test(
        'saveFloorPlan converts entity to API body (roomId + walls/openings keys)',
        () async {
      when(() => mockRemote.saveFloorPlan(any(), any()))
          .thenAnswer((_) async => testPlan);

      final saved = await repository.saveFloorPlan(testPlan);

      expect(saved.id, equals('plan-1'));
      final captured = verify(
              () => mockRemote.saveFloorPlan('room-1', captureAny())).captured;
      final body = captured.single as Map<String, dynamic>;
      expect(body.containsKey('walls'), isTrue);
      expect(body.containsKey('openings'), isTrue);
      expect(body.containsKey('equipment'), isTrue);
      expect(body.containsKey('annotations'), isTrue);
      expect(body['walls'], isEmpty);
    });

    test('deleteFloorPlan forwards id to remote', () async {
      when(() => mockRemote.deleteFloorPlan(any())).thenAnswer((_) async {});

      await repository.deleteFloorPlan('plan-1');

      verify(() => mockRemote.deleteFloorPlan('plan-1')).called(1);
    });

    test('uploadUsdzFile forwards planId + filePath and returns plan',
        () async {
      when(() => mockRemote.uploadUsdzFile(any(), any()))
          .thenAnswer((_) async => testPlan);

      final result = await repository.uploadUsdzFile(
        'plan-1',
        '/tmp/scan.usdz',
      );

      expect(result.id, equals('plan-1'));
      verify(() => mockRemote.uploadUsdzFile('plan-1', '/tmp/scan.usdz'))
          .called(1);
    });

    test(
        'uploadElementPhoto forwards (planId, elementId, type, filePath) and returns URL',
        () async {
      when(() => mockRemote.uploadElementPhoto(any(), any(), any(), any()))
          .thenAnswer((_) async => 'https://s3/photo-1.jpg');

      final url = await repository.uploadElementPhoto(
        'plan-1',
        'wall-1',
        'wall',
        '/tmp/photo.jpg',
      );

      expect(url, equals('https://s3/photo-1.jpg'));
      verify(() => mockRemote.uploadElementPhoto(
            'plan-1',
            'wall-1',
            'wall',
            '/tmp/photo.jpg',
          )).called(1);
    });

    test('saveFloorPlan propagates remote exceptions', () async {
      when(() => mockRemote.saveFloorPlan(any(), any()))
          .thenThrow(Exception('500'));

      expect(
        () => repository.saveFloorPlan(testPlan),
        throwsA(isA<Exception>()),
      );
    });
  });
}
