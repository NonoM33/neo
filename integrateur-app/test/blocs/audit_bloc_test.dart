import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/domain/entities/checklist_item.dart';
import 'package:neo_integrateur/domain/entities/room.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/repositories/project_repository.dart';
import 'package:neo_integrateur/presentation/blocs/audit/audit_bloc.dart';
import 'package:neo_integrateur/presentation/blocs/audit/audit_event.dart';
import 'package:neo_integrateur/presentation/blocs/audit/audit_state.dart';

class MockProjectRepository extends Mock implements ProjectRepository {}

void main() {
  late MockProjectRepository mockRepository;

  final salonRoom = Room(
    id: 'room-1',
    projectId: 'proj-1',
    name: 'Salon',
    type: RoomType.salon,
    createdAt: DateTime(2026, 5, 1),
    checklist: const [
      ChecklistItem(
        id: 'check-1',
        category: ChecklistCategory.eclairage,
        label: 'Plafonnier',
        isChecked: false,
      ),
    ],
  );

  final cuisineRoom = Room(
    id: 'room-2',
    projectId: 'proj-1',
    name: 'Cuisine',
    type: RoomType.cuisine,
    createdAt: DateTime(2026, 5, 1),
  );

  AuditBloc buildBloc() => AuditBloc(projectRepository: mockRepository);

  AuditLoaded loadedState({
    List<Room>? rooms,
    Room? selectedRoom,
  }) =>
      AuditLoaded(
        projectId: 'proj-1',
        rooms: rooms ?? [salonRoom, cuisineRoom],
        selectedRoom: selectedRoom ?? salonRoom,
      );

  setUp(() {
    mockRepository = MockProjectRepository();
  });

  group('AuditBloc', () {
    test('initial state is AuditInitial', () {
      expect(buildBloc().state, isA<AuditInitial>());
    });

    group('AuditLoadRoomsRequested', () {
      blocTest<AuditBloc, AuditState>(
        'emits [Loading, Loaded] with detailed rooms + auto-selected first room',
        setUp: () {
          when(() => mockRepository.getRoomsByProject(any()))
              .thenAnswer((_) async => Success([salonRoom, cuisineRoom]));
          when(() => mockRepository.getRoom(any()))
              .thenAnswer((invocation) async {
            final id = invocation.positionalArguments.first as String;
            return Success(id == 'room-1' ? salonRoom : cuisineRoom);
          });
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const AuditLoadRoomsRequested('proj-1')),
        expect: () => [
          isA<AuditLoading>(),
          isA<AuditLoaded>()
              .having((s) => s.rooms, 'rooms', hasLength(2))
              .having((s) => s.selectedRoom?.id, 'selectedRoom.id',
                  equals('room-1')),
        ],
        verify: (_) {
          verify(() => mockRepository.getRoom('room-1')).called(1);
          verify(() => mockRepository.getRoom('room-2')).called(1);
        },
      );

      blocTest<AuditBloc, AuditState>(
        'emits [Loading, Loaded(empty)] when no rooms',
        setUp: () {
          when(() => mockRepository.getRoomsByProject(any()))
              .thenAnswer((_) async => Success(<Room>[]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const AuditLoadRoomsRequested('proj-1')),
        expect: () => [
          isA<AuditLoading>(),
          isA<AuditLoaded>()
              .having((s) => s.rooms, 'rooms', isEmpty)
              .having((s) => s.selectedRoom, 'selectedRoom', isNull),
        ],
      );

      blocTest<AuditBloc, AuditState>(
        'emits [Loading, Error] on failure',
        setUp: () {
          when(() => mockRepository.getRoomsByProject(any())).thenAnswer(
            (_) async => const Error(NetworkFailure(message: 'KO')),
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const AuditLoadRoomsRequested('proj-1')),
        expect: () => [
          isA<AuditLoading>(),
          isA<AuditError>(),
        ],
      );
    });

    group('AuditRoomSelected', () {
      blocTest<AuditBloc, AuditState>(
        'emits Loaded with new selection then refreshes room from API',
        setUp: () {
          when(() => mockRepository.getRoom(any()))
              .thenAnswer((_) async => Success(cuisineRoom));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(AuditRoomSelected(cuisineRoom)),
        expect: () => [
          isA<AuditLoaded>().having(
              (s) => s.selectedRoom?.id, 'selectedRoom.id', equals('room-2')),
        ],
        verify: (_) {
          verify(() => mockRepository.getRoom('room-2')).called(1);
        },
      );

      blocTest<AuditBloc, AuditState>(
        'ignores AuditRoomSelected when state is not AuditLoaded',
        build: buildBloc,
        act: (bloc) => bloc.add(AuditRoomSelected(cuisineRoom)),
        expect: () => <AuditState>[],
      );
    });

    group('AuditAddRoomRequested', () {
      blocTest<AuditBloc, AuditState>(
        'appends new room and selects it',
        setUp: () {
          final newRoom = Room(
            id: 'room-3',
            projectId: 'proj-1',
            name: 'Chambre',
            type: RoomType.chambre,
            createdAt: DateTime(2026, 5, 1),
          );
          when(() => mockRepository.createRoom(
                any(),
                name: any(named: 'name'),
                type: any(named: 'type'),
                floor: any(named: 'floor'),
                notes: any(named: 'notes'),
              )).thenAnswer((_) async => Success(newRoom));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(
          const AuditAddRoomRequested(name: 'Chambre', type: RoomType.chambre),
        ),
        expect: () => [
          isA<AuditLoaded>()
              .having((s) => s.rooms, 'rooms', hasLength(3))
              .having((s) => s.selectedRoom?.id, 'selectedRoom.id',
                  equals('room-3')),
        ],
      );

      blocTest<AuditBloc, AuditState>(
        'uses type displayName when name is empty',
        setUp: () {
          when(() => mockRepository.createRoom(
                any(),
                name: any(named: 'name'),
                type: any(named: 'type'),
                floor: any(named: 'floor'),
                notes: any(named: 'notes'),
              )).thenAnswer((_) async => Success(cuisineRoom));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(
          const AuditAddRoomRequested(name: '   ', type: RoomType.cuisine),
        ),
        expect: () => [isA<AuditLoaded>()],
        verify: (_) {
          final captured = verify(() => mockRepository.createRoom(
                any(),
                name: captureAny(named: 'name'),
                type: any(named: 'type'),
                floor: any(named: 'floor'),
                notes: any(named: 'notes'),
              )).captured;
          expect(captured.single, equals('Cuisine'));
        },
      );
    });

    group('AuditUpdateRoomRequested', () {
      blocTest<AuditBloc, AuditState>(
        'replaces room in list and updates selectedRoom when applicable',
        setUp: () {
          final updated = salonRoom.copyWith(name: 'Salon redécoré');
          when(() => mockRepository.updateRoom(any(), any()))
              .thenAnswer((_) async => Success(updated));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(
          AuditUpdateRoomRequested(salonRoom.copyWith(name: 'Salon redécoré')),
        ),
        expect: () => [
          isA<AuditLoaded>()
              .having((s) => s.selectedRoom?.name, 'selectedRoom.name',
                  equals('Salon redécoré')),
        ],
      );
    });

    group('AuditDeleteRoomRequested', () {
      blocTest<AuditBloc, AuditState>(
        'removes room and re-selects first remaining',
        setUp: () {
          when(() => mockRepository.deleteRoom(any()))
              .thenAnswer((_) async => const Success(null));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(const AuditDeleteRoomRequested('room-1')),
        expect: () => [
          isA<AuditLoaded>()
              .having((s) => s.rooms, 'rooms', hasLength(1))
              .having((s) => s.selectedRoom?.id, 'selectedRoom.id',
                  equals('room-2')),
        ],
      );

      blocTest<AuditBloc, AuditState>(
        'clears selection when last room is removed',
        setUp: () {
          when(() => mockRepository.deleteRoom(any()))
              .thenAnswer((_) async => const Success(null));
        },
        seed: () => AuditLoaded(
          projectId: 'proj-1',
          rooms: [salonRoom],
          selectedRoom: salonRoom,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const AuditDeleteRoomRequested('room-1')),
        expect: () => [
          isA<AuditLoaded>()
              .having((s) => s.rooms, 'rooms', isEmpty)
              .having((s) => s.selectedRoom, 'selectedRoom', isNull),
        ],
      );
    });

    group('checklist', () {
      blocTest<AuditBloc, AuditState>(
        'AuditToggleChecklistItemRequested optimistically flips isChecked',
        setUp: () {
          when(() => mockRepository.updateChecklistItem(any(), any()))
              .thenAnswer((_) async => Success(salonRoom.checklist.first
                  .copyWith(isChecked: true) as ChecklistItem));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(
          const AuditToggleChecklistItemRequested(
            itemId: 'check-1',
            isChecked: true,
          ),
        ),
        expect: () => [
          isA<AuditLoaded>().having(
              (s) => s.selectedRoom?.checklist.first.isChecked,
              'isChecked',
              isTrue),
        ],
        verify: (_) {
          final captured =
              verify(() => mockRepository.updateChecklistItem('check-1', captureAny()))
                  .captured
                  .single as Map<String, dynamic>;
          expect(captured['checked'], isTrue);
        },
      );

      blocTest<AuditBloc, AuditState>(
        'AuditAddChecklistItemRequested appends item on success',
        setUp: () {
          const newItem = ChecklistItem(
            id: 'check-new',
            category: ChecklistCategory.securite,
            label: 'Caméra',
            isChecked: false,
          );
          when(() => mockRepository.createChecklistItem(
                any(),
                category: any(named: 'category'),
                label: any(named: 'label'),
                checked: any(named: 'checked'),
                notes: any(named: 'notes'),
              )).thenAnswer((_) async => const Success(newItem));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(
          const AuditAddChecklistItemRequested(
            label: 'Caméra',
            category: ChecklistCategory.securite,
          ),
        ),
        expect: () => [
          isA<AuditLoaded>().having(
              (s) => s.selectedRoom?.checklist, 'checklist', hasLength(2)),
        ],
      );
    });

    group('photos', () {
      blocTest<AuditBloc, AuditState>(
        'AuditPhotoCaptured appends uploaded photo on success',
        setUp: () {
          final photo = RoomPhoto(
            id: 'photo-1',
            roomId: 'room-1',
            filename: 'p.jpg',
            url: 'https://s3/p.jpg',
            createdAt: DateTime(2026, 5, 1),
          );
          when(() => mockRepository.uploadPhoto(
                any(),
                any(),
                caption: any(named: 'caption'),
              )).thenAnswer((_) async => Success(photo));
        },
        seed: loadedState,
        build: buildBloc,
        act: (bloc) => bloc.add(
          const AuditPhotoCaptured(localPath: '/tmp/p.jpg'),
        ),
        expect: () => [
          isA<AuditLoaded>().having(
              (s) => s.selectedRoom?.photos, 'photos', hasLength(1)),
        ],
      );

      blocTest<AuditBloc, AuditState>(
        'AuditDeletePhotoRequested removes the matching photo',
        setUp: () {
          when(() => mockRepository.deletePhoto(any()))
              .thenAnswer((_) async => const Success(null));
        },
        seed: () => AuditLoaded(
          projectId: 'proj-1',
          rooms: [
            salonRoom.copyWith(photos: [
              RoomPhoto(
                id: 'photo-1',
                roomId: 'room-1',
                filename: 'p.jpg',
                url: 'https://s3/p.jpg',
                createdAt: DateTime(2026, 5, 1),
              ),
            ]),
          ],
          selectedRoom: salonRoom.copyWith(photos: [
            RoomPhoto(
              id: 'photo-1',
              roomId: 'room-1',
              filename: 'p.jpg',
              url: 'https://s3/p.jpg',
              createdAt: DateTime(2026, 5, 1),
            ),
          ]),
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const AuditDeletePhotoRequested('photo-1')),
        expect: () => [
          isA<AuditLoaded>().having(
              (s) => s.selectedRoom?.photos, 'photos', isEmpty),
        ],
      );
    });

    blocTest<AuditBloc, AuditState>(
      'AuditUpdateNotesRequested updates selectedRoom.notes optimistically',
      setUp: () {
        when(() => mockRepository.updateRoom(any(), any()))
            .thenAnswer((_) async => Success(salonRoom));
      },
      seed: loadedState,
      build: buildBloc,
      act: (bloc) => bloc.add(
        const AuditUpdateNotesRequested('Note importante'),
      ),
      expect: () => [
        isA<AuditLoaded>().having(
            (s) => s.selectedRoom?.notes, 'notes', equals('Note importante')),
      ],
    );
  });
}
