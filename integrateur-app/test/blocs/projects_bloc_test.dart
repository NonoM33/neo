import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/domain/entities/project.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/repositories/project_repository.dart';
import 'package:neo_integrateur/domain/usecases/project_usecases.dart';
import 'package:neo_integrateur/presentation/blocs/projects/projects_bloc.dart';
import 'package:neo_integrateur/presentation/blocs/projects/projects_event.dart';
import 'package:neo_integrateur/presentation/blocs/projects/projects_state.dart';

class MockGetProjectsUseCase extends Mock implements GetProjectsUseCase {}

class MockGetProjectUseCase extends Mock implements GetProjectUseCase {}

class MockCreateProjectUseCase extends Mock implements CreateProjectUseCase {}

class MockUpdateProjectUseCase extends Mock implements UpdateProjectUseCase {}

class MockDeleteProjectUseCase extends Mock implements DeleteProjectUseCase {}

class MockProjectRepository extends Mock implements ProjectRepository {}

class _FakeProjectFilter extends Fake implements ProjectFilter {}

void main() {
  setUpAll(() {
    registerFallbackValue(_FakeProjectFilter());
  });

  late MockGetProjectsUseCase mockGetProjects;
  late MockGetProjectUseCase mockGetProject;
  late MockCreateProjectUseCase mockCreate;
  late MockUpdateProjectUseCase mockUpdate;
  late MockDeleteProjectUseCase mockDelete;
  late MockProjectRepository mockRepository;

  final testProject = Project(
    id: 'proj-1',
    name: 'Maison Dupont',
    clientId: 'client-1',
    status: ProjectStatus.brouillon,
    createdAt: DateTime(2026, 5, 1),
  );

  final testProjectUpdated = testProject.copyWith(name: 'Maison Dupont v2');

  ProjectsBloc buildBloc() => ProjectsBloc(
        getProjectsUseCase: mockGetProjects,
        getProjectUseCase: mockGetProject,
        createProjectUseCase: mockCreate,
        updateProjectUseCase: mockUpdate,
        deleteProjectUseCase: mockDelete,
        projectRepository: mockRepository,
      );

  setUp(() {
    mockGetProjects = MockGetProjectsUseCase();
    mockGetProject = MockGetProjectUseCase();
    mockCreate = MockCreateProjectUseCase();
    mockUpdate = MockUpdateProjectUseCase();
    mockDelete = MockDeleteProjectUseCase();
    mockRepository = MockProjectRepository();
  });

  group('ProjectsBloc', () {
    test('initial state is ProjectsInitial', () {
      expect(buildBloc().state, isA<ProjectsInitial>());
    });

    group('ProjectsLoadRequested', () {
      blocTest<ProjectsBloc, ProjectsState>(
        'emits [Loading, Loaded] on success',
        setUp: () {
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProject]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const ProjectsLoadRequested()),
        expect: () => [
          isA<ProjectsLoading>(),
          isA<ProjectsLoaded>().having(
              (s) => s.projects, 'projects', hasLength(1)),
        ],
      );

      blocTest<ProjectsBloc, ProjectsState>(
        'emits [Loading, Error] on failure when no previous data',
        setUp: () {
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => const Error(NetworkFailure(message: 'KO')));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const ProjectsLoadRequested()),
        expect: () => [
          isA<ProjectsLoading>(),
          isA<ProjectsError>()
              .having((s) => s.message, 'message', equals('KO')),
        ],
      );

      blocTest<ProjectsBloc, ProjectsState>(
        'on failure with existing ProjectsLoaded state: keeps existing data (no Error emitted)',
        setUp: () {
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProject]));
        },
        build: buildBloc,
        seed: () => ProjectsLoaded(projects: [testProject]),
        act: (bloc) async {
          // Now fail the next call
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => const Error(NetworkFailure(message: 'KO')));
          bloc.add(const ProjectsLoadRequested());
        },
        expect: () => <ProjectsState>[],
      );

      blocTest<ProjectsBloc, ProjectsState>(
        'forwards filter to use case',
        setUp: () {
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProject]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(
          const ProjectsLoadRequested(
            filter: ProjectFilter(searchQuery: 'dupont'),
          ),
        ),
        verify: (_) {
          final filter = verify(
                  () => mockGetProjects(filter: captureAny(named: 'filter')))
              .captured
              .single as ProjectFilter?;
          expect(filter?.searchQuery, equals('dupont'));
        },
      );
    });

    group('ProjectLoadRequested', () {
      blocTest<ProjectsBloc, ProjectsState>(
        'emits [Loading, ProjectDetailLoaded] on success',
        setUp: () {
          when(() => mockGetProject(any()))
              .thenAnswer((_) async => Success(testProject));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const ProjectLoadRequested('proj-1')),
        expect: () => [
          isA<ProjectsLoading>(),
          isA<ProjectDetailLoaded>()
              .having((s) => s.project.id, 'id', equals('proj-1')),
        ],
      );

      blocTest<ProjectsBloc, ProjectsState>(
        'emits [Loading, Error] on NotFound',
        setUp: () {
          when(() => mockGetProject(any())).thenAnswer(
            (_) async => const Error(NotFoundFailure()),
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const ProjectLoadRequested('missing')),
        expect: () => [
          isA<ProjectsLoading>(),
          isA<ProjectsError>(),
        ],
      );
    });

    group('ProjectCreateRequested', () {
      blocTest<ProjectsBloc, ProjectsState>(
        'emits [InProgress, OperationSuccess, Loading, Loaded] on success',
        setUp: () {
          when(() => mockCreate(
                clientId: any(named: 'clientId'),
                name: any(named: 'name'),
                description: any(named: 'description'),
                address: any(named: 'address'),
                city: any(named: 'city'),
                postalCode: any(named: 'postalCode'),
                surface: any(named: 'surface'),
                roomCount: any(named: 'roomCount'),
              )).thenAnswer((_) async => Success(testProject));
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProject]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(ProjectCreateRequested(testProject)),
        expect: () => [
          isA<ProjectOperationInProgress>(),
          isA<ProjectOperationSuccess>().having(
              (s) => s.message, 'message', contains('créé')),
          isA<ProjectsLoading>(),
          isA<ProjectsLoaded>(),
        ],
      );

      blocTest<ProjectsBloc, ProjectsState>(
        'emits [InProgress, Error] on validation failure',
        setUp: () {
          when(() => mockCreate(
                clientId: any(named: 'clientId'),
                name: any(named: 'name'),
                description: any(named: 'description'),
                address: any(named: 'address'),
                city: any(named: 'city'),
                postalCode: any(named: 'postalCode'),
                surface: any(named: 'surface'),
                roomCount: any(named: 'roomCount'),
              )).thenAnswer(
            (_) async => const Error(ValidationFailure(message: 'Nom requis')),
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(ProjectCreateRequested(testProject)),
        expect: () => [
          isA<ProjectOperationInProgress>(),
          isA<ProjectsError>()
              .having((s) => s.message, 'message', equals('Nom requis')),
        ],
      );
    });

    group('ProjectUpdateRequested', () {
      blocTest<ProjectsBloc, ProjectsState>(
        'emits [InProgress, OperationSuccess, Loading, Loaded] on success',
        setUp: () {
          when(() => mockUpdate(any(), any()))
              .thenAnswer((_) async => Success(testProjectUpdated));
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProjectUpdated]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(ProjectUpdateRequested(testProjectUpdated)),
        expect: () => [
          isA<ProjectOperationInProgress>(),
          isA<ProjectOperationSuccess>().having(
              (s) => s.project?.name, 'name', equals('Maison Dupont v2')),
          isA<ProjectsLoading>(),
          isA<ProjectsLoaded>(),
        ],
      );
    });

    group('ProjectDeleteRequested', () {
      blocTest<ProjectsBloc, ProjectsState>(
        'emits [InProgress, OperationSuccess, Loading, Loaded] on success',
        setUp: () {
          when(() => mockDelete(any())).thenAnswer((_) async => const Success(null));
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success(<Project>[]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const ProjectDeleteRequested('proj-1')),
        expect: () => [
          isA<ProjectOperationInProgress>(),
          isA<ProjectOperationSuccess>().having(
              (s) => s.message, 'message', contains('supprimé')),
          isA<ProjectsLoading>(),
          isA<ProjectsLoaded>(),
        ],
      );

      blocTest<ProjectsBloc, ProjectsState>(
        'emits [InProgress, Error] on failure',
        setUp: () {
          when(() => mockDelete(any())).thenAnswer(
            (_) async => const Error(NotFoundFailure()),
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const ProjectDeleteRequested('missing')),
        expect: () => [
          isA<ProjectOperationInProgress>(),
          isA<ProjectsError>(),
        ],
      );
    });

    group('ProjectStatusUpdateRequested', () {
      blocTest<ProjectsBloc, ProjectsState>(
        'updates status and triggers refresh',
        setUp: () {
          when(() => mockRepository.updateProject(any(), any())).thenAnswer(
            (_) async =>
                Success(testProject.copyWith(status: ProjectStatus.enCours)),
          );
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProject]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(
          const ProjectStatusUpdateRequested(
            id: 'proj-1',
            status: ProjectStatus.enCours,
          ),
        ),
        expect: () => [
          isA<ProjectOperationSuccess>(),
          isA<ProjectsLoading>(),
          isA<ProjectsLoaded>(),
        ],
        verify: (_) {
          final captured =
              verify(() => mockRepository.updateProject('proj-1', captureAny()))
                  .captured
                  .single as Map<String, dynamic>;
          expect(captured['status'], equals('en_cours'));
        },
      );
    });

    group('filters', () {
      blocTest<ProjectsBloc, ProjectsState>(
        'ProjectsFilterChanged from ProjectsLoaded re-emits Loaded with new filter',
        setUp: () {
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProject]));
        },
        build: buildBloc,
        seed: () => ProjectsLoaded(projects: [testProject]),
        act: (bloc) => bloc.add(
          const ProjectsFilterChanged(ProjectFilter(searchQuery: 'foo')),
        ),
        expect: () => [
          isA<ProjectsLoaded>().having(
              (s) => s.filter?.searchQuery, 'filter.searchQuery', equals('foo')),
        ],
      );

      blocTest<ProjectsBloc, ProjectsState>(
        'ProjectsFilterCleared resets to unfiltered load',
        setUp: () {
          when(() => mockGetProjects(filter: any(named: 'filter')))
              .thenAnswer((_) async => Success([testProject]));
        },
        build: buildBloc,
        seed: () => ProjectsLoaded(
            projects: [testProject],
            filter: const ProjectFilter(searchQuery: 'foo')),
        act: (bloc) => bloc.add(const ProjectsFilterCleared()),
        expect: () => [
          isA<ProjectsLoaded>()
              .having((s) => s.filter, 'filter', isNull),
        ],
      );
    });
  });
}
