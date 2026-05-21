import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/exceptions.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/data/datasources/remote/project_remote_datasource.dart';
import 'package:neo_integrateur/data/models/project_model.dart';
import 'package:neo_integrateur/data/models/room_model.dart';
import 'package:neo_integrateur/data/repositories/project_repository_impl.dart';
import 'package:neo_integrateur/domain/entities/checklist_item.dart';
import 'package:neo_integrateur/domain/entities/project.dart';
import 'package:neo_integrateur/domain/entities/room.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/repositories/project_repository.dart';

class MockProjectRemoteDataSource extends Mock
    implements ProjectRemoteDataSource {}

void main() {
  late ProjectRepositoryImpl repository;
  late MockProjectRemoteDataSource mockRemote;

  final testProject = ProjectModel(
    id: 'proj-1',
    name: 'Maison Dupont',
    clientId: 'client-1',
    status: ProjectStatus.brouillon,
    createdAt: DateTime(2026, 5, 1),
  );

  final testRoom = RoomModel(
    id: 'room-1',
    projectId: 'proj-1',
    name: 'Salon',
    type: RoomType.salon,
    createdAt: DateTime(2026, 5, 1),
  );

  final testPhoto = RoomPhotoModel(
    id: 'photo-1',
    roomId: 'room-1',
    filename: 'salon.jpg',
    url: 'https://s3/salon.jpg',
    createdAt: DateTime(2026, 5, 1),
  );

  final testChecklistItem = ChecklistItemModel(
    id: 'check-1',
    category: ChecklistCategory.eclairage,
    label: 'Plafonnier connecté',
    isChecked: false,
  );

  setUp(() {
    mockRemote = MockProjectRemoteDataSource();
    repository = ProjectRepositoryImpl(remoteDataSource: mockRemote);
  });

  group('ProjectRepositoryImpl', () {
    // ============ getProjects ============
    group('getProjects', () {
      test('returns list on success', () async {
        when(() => mockRemote.getProjects(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {
              'data': [testProject.toJson()],
            });

        final result = await repository.getProjects();

        expect(result, isA<Success<List<Project>>>());
        final list = (result as Success<List<Project>>).data;
        expect(list, hasLength(1));
        expect(list.first.id, equals('proj-1'));
      });

      test('forwards filter params to remote (search + status + clientId)',
          () async {
        when(() => mockRemote.getProjects(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {'data': <dynamic>[]});

        await repository.getProjects(
          filter: const ProjectFilter(
            searchQuery: 'dupont',
            status: ProjectStatus.enCours,
            clientId: 'client-1',
          ),
          page: 2,
          limit: 50,
        );

        final captured = verify(() => mockRemote.getProjects(
              queryParams: captureAny(named: 'queryParams'),
            )).captured.single as Map<String, dynamic>;

        expect(captured['page'], equals(2));
        expect(captured['limit'], equals(50));
        expect(captured['search'], equals('dupont'));
        expect(captured['status'], equals('en_cours'));
        expect(captured['clientId'], equals('client-1'));
      });

      test('returns NetworkFailure on NetworkException', () async {
        when(() => mockRemote.getProjects(
              queryParams: any(named: 'queryParams'),
            )).thenThrow(const NetworkException(message: 'Offline'));

        final result = await repository.getProjects();

        expect(result, isA<Error<List<Project>>>());
        final failure = (result as Error<List<Project>>).failure;
        expect(failure, isA<NetworkFailure>());
        expect(failure.message, equals('Offline'));
      });

      test('returns UnknownFailure on unexpected error', () async {
        when(() => mockRemote.getProjects(
              queryParams: any(named: 'queryParams'),
            )).thenThrow(Exception('boom'));

        final result = await repository.getProjects();

        expect(result, isA<Error<List<Project>>>());
        expect((result as Error<List<Project>>).failure, isA<UnknownFailure>());
      });

      test('handles empty data field gracefully', () async {
        when(() => mockRemote.getProjects(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => <String, dynamic>{});

        final result = await repository.getProjects();

        expect(result, isA<Success<List<Project>>>());
        expect((result as Success<List<Project>>).data, isEmpty);
      });
    });

    // ============ getProject ============
    group('getProject', () {
      test('returns project on success', () async {
        when(() => mockRemote.getProject(any()))
            .thenAnswer((_) async => testProject);

        final result = await repository.getProject('proj-1');

        expect(result, isA<Success<Project>>());
        expect((result as Success<Project>).data.id, equals('proj-1'));
        verify(() => mockRemote.getProject('proj-1')).called(1);
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.getProject(any()))
            .thenThrow(const NotFoundException());

        final result = await repository.getProject('missing');

        expect(result, isA<Error<Project>>());
        expect((result as Error<Project>).failure, isA<NotFoundFailure>());
      });

      test('returns UnknownFailure on unexpected error', () async {
        when(() => mockRemote.getProject(any())).thenThrow(Exception('boom'));

        final result = await repository.getProject('proj-1');

        expect(result, isA<Error<Project>>());
        expect((result as Error<Project>).failure, isA<UnknownFailure>());
      });
    });

    // ============ createProject ============
    group('createProject', () {
      test('returns created project on success', () async {
        when(() => mockRemote.createProject(any()))
            .thenAnswer((_) async => testProject);

        final result = await repository.createProject(
          clientId: 'client-1',
          name: 'Maison Dupont',
          description: 'Maison 120m2',
          city: 'Lyon',
        );

        expect(result, isA<Success<Project>>());
        final captured =
            verify(() => mockRemote.createProject(captureAny())).captured.single
                as Map<String, dynamic>;
        expect(captured['clientId'], equals('client-1'));
        expect(captured['name'], equals('Maison Dupont'));
        expect(captured['description'], equals('Maison 120m2'));
        expect(captured['city'], equals('Lyon'));
        expect(captured.containsKey('postalCode'), isFalse);
      });

      test('returns ValidationFailure on ValidationException', () async {
        when(() => mockRemote.createProject(any())).thenThrow(
          const ValidationException(message: 'Nom requis'),
        );

        final result = await repository.createProject(
          clientId: 'client-1',
          name: '',
        );

        expect(result, isA<Error<Project>>());
        final failure = (result as Error<Project>).failure;
        expect(failure, isA<ValidationFailure>());
        expect(failure.message, equals('Nom requis'));
      });

      test('returns UnknownFailure on unexpected error', () async {
        when(() => mockRemote.createProject(any()))
            .thenThrow(Exception('boom'));

        final result = await repository.createProject(
          clientId: 'client-1',
          name: 'X',
        );

        expect(result, isA<Error<Project>>());
        expect((result as Error<Project>).failure, isA<UnknownFailure>());
      });
    });

    // ============ updateProject ============
    group('updateProject', () {
      test('returns updated project on success', () async {
        when(() => mockRemote.updateProject(any(), any()))
            .thenAnswer((_) async => testProject);

        final result = await repository.updateProject('proj-1', {
          'name': 'Nouveau nom',
        });

        expect(result, isA<Success<Project>>());
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.updateProject(any(), any()))
            .thenThrow(const NotFoundException());

        final result = await repository.updateProject('missing', {});

        expect(result, isA<Error<Project>>());
        expect((result as Error<Project>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ deleteProject ============
    group('deleteProject', () {
      test('returns success on delete', () async {
        when(() => mockRemote.deleteProject(any())).thenAnswer((_) async {});

        final result = await repository.deleteProject('proj-1');

        expect(result, isA<Success<void>>());
        verify(() => mockRemote.deleteProject('proj-1')).called(1);
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.deleteProject(any()))
            .thenThrow(const NotFoundException());

        final result = await repository.deleteProject('missing');

        expect(result, isA<Error<void>>());
        expect((result as Error<void>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ Rooms ============
    group('rooms', () {
      test('getRoomsByProject returns list on success', () async {
        when(() => mockRemote.getRoomsByProject(any()))
            .thenAnswer((_) async => [testRoom]);

        final result = await repository.getRoomsByProject('proj-1');

        expect(result, isA<Success<List<Room>>>());
        expect((result as Success<List<Room>>).data, hasLength(1));
      });

      test('getRoomsByProject returns UnknownFailure on error', () async {
        when(() => mockRemote.getRoomsByProject(any()))
            .thenThrow(Exception('boom'));

        final result = await repository.getRoomsByProject('proj-1');

        expect(result, isA<Error<List<Room>>>());
      });

      test('getRoom returns room on success', () async {
        when(() => mockRemote.getRoom(any())).thenAnswer((_) async => testRoom);

        final result = await repository.getRoom('room-1');

        expect(result, isA<Success<Room>>());
        expect((result as Success<Room>).data.id, equals('room-1'));
      });

      test('getRoom returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.getRoom(any()))
            .thenThrow(const NotFoundException());

        final result = await repository.getRoom('missing');

        expect(result, isA<Error<Room>>());
        expect((result as Error<Room>).failure, isA<NotFoundFailure>());
      });

      test('createRoom forwards data and returns room', () async {
        when(() => mockRemote.createRoom(any(), any()))
            .thenAnswer((_) async => testRoom);

        final result = await repository.createRoom(
          'proj-1',
          name: 'Salon',
          type: 'salon',
          floor: 1,
          notes: 'RdC',
        );

        expect(result, isA<Success<Room>>());
        final captured =
            verify(() => mockRemote.createRoom('proj-1', captureAny()))
                .captured
                .single as Map<String, dynamic>;
        expect(captured['name'], equals('Salon'));
        expect(captured['type'], equals('salon'));
        expect(captured['floor'], equals(1));
        expect(captured['notes'], equals('RdC'));
      });

      test('updateRoom returns updated room', () async {
        when(() => mockRemote.updateRoom(any(), any()))
            .thenAnswer((_) async => testRoom);

        final result = await repository.updateRoom('room-1', {'name': 'X'});

        expect(result, isA<Success<Room>>());
      });

      test('deleteRoom returns success', () async {
        when(() => mockRemote.deleteRoom(any())).thenAnswer((_) async {});

        final result = await repository.deleteRoom('room-1');

        expect(result, isA<Success<void>>());
      });
    });

    // ============ Photos ============
    group('photos', () {
      test('getPhotosByRoom returns list', () async {
        when(() => mockRemote.getPhotosByRoom(any()))
            .thenAnswer((_) async => [testPhoto]);

        final result = await repository.getPhotosByRoom('room-1');

        expect(result, isA<Success<List<RoomPhoto>>>());
        expect((result as Success<List<RoomPhoto>>).data, hasLength(1));
      });

      test('uploadPhoto returns uploaded photo', () async {
        when(() => mockRemote.uploadPhoto(any(), any(),
            caption: any(named: 'caption'))).thenAnswer((_) async => testPhoto);

        final result = await repository.uploadPhoto(
          'room-1',
          '/tmp/photo.jpg',
          caption: 'Vue ouest',
        );

        expect(result, isA<Success<RoomPhoto>>());
        verify(() => mockRemote.uploadPhoto(
              'room-1',
              '/tmp/photo.jpg',
              caption: 'Vue ouest',
            )).called(1);
      });

      test('deletePhoto returns success', () async {
        when(() => mockRemote.deletePhoto(any())).thenAnswer((_) async {});

        final result = await repository.deletePhoto('photo-1');

        expect(result, isA<Success<void>>());
      });
    });

    // ============ Checklist ============
    group('checklist', () {
      test('createChecklistItem forwards data and returns item', () async {
        when(() => mockRemote.createChecklistItem(any(), any()))
            .thenAnswer((_) async => testChecklistItem);

        final result = await repository.createChecklistItem(
          'room-1',
          category: 'eclairage',
          label: 'Plafonnier connecté',
          checked: false,
        );

        expect(result, isA<Success<ChecklistItem>>());
        final captured =
            verify(() => mockRemote.createChecklistItem('room-1', captureAny()))
                .captured
                .single as Map<String, dynamic>;
        expect(captured['category'], equals('eclairage'));
        expect(captured['label'], equals('Plafonnier connecté'));
        expect(captured['checked'], equals(false));
        expect(captured.containsKey('notes'), isFalse);
      });

      test('updateChecklistItem returns item on success', () async {
        when(() => mockRemote.updateChecklistItem(any(), any()))
            .thenAnswer((_) async => testChecklistItem);

        final result = await repository.updateChecklistItem(
          'check-1',
          {'checked': true},
        );

        expect(result, isA<Success<ChecklistItem>>());
      });

      test('deleteChecklistItem returns success', () async {
        when(() => mockRemote.deleteChecklistItem(any()))
            .thenAnswer((_) async {});

        final result = await repository.deleteChecklistItem('check-1');

        expect(result, isA<Success<void>>());
      });
    });
  });
}
