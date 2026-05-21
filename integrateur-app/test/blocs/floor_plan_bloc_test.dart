import 'dart:io';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/domain/entities/floor_plan.dart';
import 'package:neo_integrateur/domain/repositories/floor_plan_repository.dart';
import 'package:neo_integrateur/presentation/blocs/floor_plan/floor_plan_bloc.dart';
import 'package:neo_integrateur/presentation/blocs/floor_plan/floor_plan_event.dart';
import 'package:neo_integrateur/presentation/blocs/floor_plan/floor_plan_state.dart';

class MockFloorPlanRepository extends Mock implements FloorPlanRepository {}

class _FakeFloorPlan extends Fake implements FloorPlan {}

void main() {
  late Directory tempDir;
  late MockFloorPlanRepository mockRepository;

  setUpAll(() async {
    registerFallbackValue(_FakeFloorPlan());
    tempDir = await Directory.systemTemp.createTemp('hive_test_');
    Hive.init(tempDir.path);
  });

  tearDownAll(() async {
    await Hive.close();
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  FloorPlan baseplan({
    List<PlanWall> walls = const [],
    List<PlanEquipment> equipment = const [],
    List<PlanAnnotation> annotations = const [],
  }) =>
      FloorPlan(
        id: 'plan-1',
        roomId: 'room-1',
        projectId: 'proj-1',
        widthMeters: 10,
        heightMeters: 8,
        createdAt: DateTime(2026, 5, 1),
        walls: walls,
        equipment: equipment,
        annotations: annotations,
      );

  final wallA = PlanWall(
    id: 'wall-a',
    startPoint: const Offset(0, 0),
    endPoint: const Offset(5, 0),
    type: WallType.interior,
  );

  FloorPlanBloc buildBloc() =>
      FloorPlanBloc(repository: mockRepository);

  setUp(() async {
    mockRepository = MockFloorPlanRepository();
    // Clear Hive draft box between tests to avoid cross-test pollution
    // (fire-and-forget _saveDraftLocally writes leak between tests otherwise).
    final box = await Hive.openBox<String>('floor_plan_drafts');
    await box.clear();
  });

  group('FloorPlanBloc', () {
    test('initial state is FloorPlanInitial', () {
      expect(buildBloc().state, isA<FloorPlanInitial>());
    });

    group('FloorPlanLoadRequested', () {
      blocTest<FloorPlanBloc, FloorPlanState>(
        'emits [Loading, Loaded] when server returns a plan',
        setUp: () {
          when(() => mockRepository.getFloorPlanByRoom(any()))
              .thenAnswer((_) async => baseplan());
        },
        build: buildBloc,
        act: (bloc) => bloc.add(
          const FloorPlanLoadRequested(roomId: 'room-1', projectId: 'proj-1'),
        ),
        expect: () => [
          isA<FloorPlanLoading>(),
          isA<FloorPlanLoaded>()
              .having((s) => s.plan.id, 'plan.id', equals('plan-1')),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'emits [Loading, Empty] when server has no plan',
        setUp: () {
          when(() => mockRepository.getFloorPlanByRoom(any()))
              .thenAnswer((_) async => null);
        },
        build: buildBloc,
        act: (bloc) => bloc.add(
          const FloorPlanLoadRequested(roomId: 'room-1', projectId: 'proj-1'),
        ),
        expect: () => [
          isA<FloorPlanLoading>(),
          isA<FloorPlanEmpty>()
              .having((s) => s.roomId, 'roomId', equals('room-1')),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'emits [Loading, Empty] when repository throws',
        setUp: () {
          when(() => mockRepository.getFloorPlanByRoom(any()))
              .thenThrow(Exception('500'));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(
          const FloorPlanLoadRequested(roomId: 'room-1', projectId: 'proj-1'),
        ),
        expect: () => [
          isA<FloorPlanLoading>(),
          isA<FloorPlanEmpty>(),
        ],
      );
    });

    group('FloorPlanCreateRequested', () {
      blocTest<FloorPlanBloc, FloorPlanState>(
        'emits [Loaded(empty plan, dirty), Loaded(with 4 walls)]',
        build: buildBloc,
        act: (bloc) => bloc.add(
          const FloorPlanCreateRequested(
            roomId: 'room-1',
            projectId: 'proj-1',
            widthMeters: 10,
            heightMeters: 8,
          ),
        ),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.plan.walls, 'walls', isEmpty)
              .having((s) => s.isDirty, 'isDirty', isTrue),
          isA<FloorPlanLoaded>().having(
              (s) => s.plan.walls.length, 'walls.length', equals(4)),
        ],
      );
    });

    group('Tool / view mode', () {
      blocTest<FloorPlanBloc, FloorPlanState>(
        'FloorPlanToolSelected changes activeTool and clears selection',
        seed: () => FloorPlanLoaded(
          plan: baseplan(),
          selectedElementId: 'wall-a',
          selectedElementType: ElementType.wall,
        ),
        build: buildBloc,
        act: (bloc) =>
            bloc.add(const FloorPlanToolSelected(PlanTool.wall)),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.activeTool, 'activeTool', equals(PlanTool.wall))
              .having((s) => s.selectedElementId, 'selectedElementId', isNull),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'FloorPlanViewModeChanged updates viewMode',
        seed: () => FloorPlanLoaded(plan: baseplan()),
        build: buildBloc,
        act: (bloc) => bloc.add(
          const FloorPlanViewModeChanged(PlanViewMode.audit),
        ),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.viewMode, 'viewMode', equals(PlanViewMode.audit)),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'FloorPlanElementSelected sets selection',
        seed: () => FloorPlanLoaded(plan: baseplan()),
        build: buildBloc,
        act: (bloc) => bloc.add(
          const FloorPlanElementSelected(
            elementId: 'wall-1',
            elementType: ElementType.wall,
          ),
        ),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.selectedElementId, 'selectedElementId',
                  equals('wall-1'))
              .having((s) => s.selectedElementType, 'selectedElementType',
                  equals(ElementType.wall)),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'FloorPlanElementSelected with null clears selection',
        seed: () => FloorPlanLoaded(
          plan: baseplan(),
          selectedElementId: 'wall-a',
          selectedElementType: ElementType.wall,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const FloorPlanElementSelected()),
        expect: () => [
          isA<FloorPlanLoaded>().having(
              (s) => s.selectedElementId, 'selectedElementId', isNull),
        ],
      );
    });

    group('walls', () {
      blocTest<FloorPlanBloc, FloorPlanState>(
        'WallAddRequested appends wall, marks dirty, pushes undo, selects new wall',
        seed: () => FloorPlanLoaded(plan: baseplan()),
        build: buildBloc,
        act: (bloc) => bloc.add(
          const WallAddRequested(
            startPoint: Offset(0, 0),
            endPoint: Offset(5, 0),
          ),
        ),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.plan.walls.length, 'walls.length', equals(1))
              .having((s) => s.isDirty, 'isDirty', isTrue)
              .having((s) => s.undoStack.length, 'undoStack.length', equals(1))
              .having((s) => s.selectedElementType, 'selectedElementType',
                  equals(ElementType.wall)),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'WallDeleteRequested removes wall and pushes undo',
        seed: () => FloorPlanLoaded(plan: baseplan(walls: [wallA])),
        build: buildBloc,
        act: (bloc) => bloc.add(const WallDeleteRequested('wall-a')),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.plan.walls, 'walls', isEmpty)
              .having((s) => s.undoStack.length, 'undoStack.length', equals(1)),
        ],
      );
    });

    group('undo / redo', () {
      blocTest<FloorPlanBloc, FloorPlanState>(
        'undo restores previous plan and pushes current onto redo stack',
        seed: () => FloorPlanLoaded(
          plan: baseplan(walls: [wallA]),
          undoStack: [baseplan()],
          isDirty: true,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const FloorPlanUndoRequested()),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.plan.walls, 'walls', isEmpty)
              .having((s) => s.undoStack, 'undoStack', isEmpty)
              .having((s) => s.redoStack.length, 'redoStack.length', equals(1)),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'undo is no-op when stack is empty',
        seed: () => FloorPlanLoaded(plan: baseplan()),
        build: buildBloc,
        act: (bloc) => bloc.add(const FloorPlanUndoRequested()),
        expect: () => <FloorPlanState>[],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'redo applies next plan and pushes current onto undo stack',
        seed: () => FloorPlanLoaded(
          plan: baseplan(),
          redoStack: [baseplan(walls: [wallA])],
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const FloorPlanRedoRequested()),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.plan.walls.length, 'walls.length', equals(1))
              .having((s) => s.redoStack, 'redoStack', isEmpty)
              .having((s) => s.undoStack.length, 'undoStack.length', equals(1)),
        ],
      );
    });

    group('FloorPlanSaveRequested', () {
      blocTest<FloorPlanBloc, FloorPlanState>(
        'emits [isSaving, saved] on success',
        setUp: () {
          when(() => mockRepository.saveFloorPlan(any()))
              .thenAnswer((_) async => baseplan(walls: [wallA]));
        },
        seed: () => FloorPlanLoaded(plan: baseplan(), isDirty: true),
        build: buildBloc,
        act: (bloc) => bloc.add(const FloorPlanSaveRequested()),
        expect: () => [
          isA<FloorPlanLoaded>().having((s) => s.isSaving, 'isSaving', isTrue),
          isA<FloorPlanLoaded>()
              .having((s) => s.isSaving, 'isSaving', isFalse)
              .having((s) => s.isDirty, 'isDirty', isFalse)
              .having((s) => s.hasDraft, 'hasDraft', isFalse),
        ],
      );

      blocTest<FloorPlanBloc, FloorPlanState>(
        'emits [isSaving, !isSaving] on failure (no Error state)',
        setUp: () {
          when(() => mockRepository.saveFloorPlan(any()))
              .thenThrow(Exception('500'));
        },
        seed: () => FloorPlanLoaded(plan: baseplan(), isDirty: true),
        build: buildBloc,
        act: (bloc) => bloc.add(const FloorPlanSaveRequested()),
        expect: () => [
          isA<FloorPlanLoaded>().having((s) => s.isSaving, 'isSaving', isTrue),
          isA<FloorPlanLoaded>()
              .having((s) => s.isSaving, 'isSaving', isFalse)
              .having((s) => s.isDirty, 'isDirty', isTrue),
        ],
      );
    });

    group('FloorPlanImportFromScan', () {
      blocTest<FloorPlanBloc, FloorPlanState>(
        'emits Loaded with imported plan + isDirty',
        build: buildBloc,
        act: (bloc) => bloc.add(
          FloorPlanImportFromScan(baseplan(walls: [wallA])),
        ),
        expect: () => [
          isA<FloorPlanLoaded>()
              .having((s) => s.plan.walls.length, 'walls.length', equals(1))
              .having((s) => s.isDirty, 'isDirty', isTrue),
        ],
      );
    });
  });
}
