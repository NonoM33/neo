import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/project_repository.dart';
import '../../../domain/usecases/project_usecases.dart';
import 'projects_event.dart';
import 'projects_state.dart';

/// Projects BLoC
class ProjectsBloc extends Bloc<ProjectsEvent, ProjectsState> {
  final GetProjectsUseCase _getProjectsUseCase;
  final GetProjectUseCase _getProjectUseCase;
  final CreateProjectUseCase _createProjectUseCase;
  final UpdateProjectUseCase _updateProjectUseCase;
  final DeleteProjectUseCase _deleteProjectUseCase;
  final ProjectRepository _projectRepository;

  ProjectsBloc({
    required GetProjectsUseCase getProjectsUseCase,
    required GetProjectUseCase getProjectUseCase,
    required CreateProjectUseCase createProjectUseCase,
    required UpdateProjectUseCase updateProjectUseCase,
    required DeleteProjectUseCase deleteProjectUseCase,
    required ProjectRepository projectRepository,
  })  : _getProjectsUseCase = getProjectsUseCase,
        _getProjectUseCase = getProjectUseCase,
        _createProjectUseCase = createProjectUseCase,
        _updateProjectUseCase = updateProjectUseCase,
        _deleteProjectUseCase = deleteProjectUseCase,
        _projectRepository = projectRepository,
        super(const ProjectsInitial()) {
    on<ProjectsLoadRequested>(_onLoadRequested);
    on<ProjectsRefreshRequested>(_onRefreshRequested);
    on<ProjectLoadRequested>(_onProjectLoadRequested);
    on<ProjectCreateRequested>(_onCreateRequested);
    on<ProjectUpdateRequested>(_onUpdateRequested);
    on<ProjectDeleteRequested>(_onDeleteRequested);
    on<ProjectStatusUpdateRequested>(_onStatusUpdateRequested);
    on<ProjectsFilterChanged>(_onFilterChanged);
    on<ProjectsFilterCleared>(_onFilterCleared);
  }

  Future<void> _onLoadRequested(
    ProjectsLoadRequested event,
    Emitter<ProjectsState> emit,
  ) async {
    // Only show spinner if no data loaded yet
    if (state is! ProjectsLoaded) {
      emit(const ProjectsLoading());
    }

    final result = await _getProjectsUseCase(filter: event.filter);

    switch (result) {
      case Success(data: final projects):
        emit(ProjectsLoaded(
          projects: projects,
          filter: event.filter,
          sortBy: event.sortBy,
          ascending: event.ascending,
        ));
      case Error(failure: final failure):
        if (state is! ProjectsLoaded) {
          emit(ProjectsError(failure.message));
        }
    }
  }

  Future<void> _onRefreshRequested(
    ProjectsRefreshRequested event,
    Emitter<ProjectsState> emit,
  ) async {
    final currentState = state;
    ProjectFilter? filter;
    ProjectSortBy sortBy = ProjectSortBy.dateCreated;
    bool ascending = false;

    if (currentState is ProjectsLoaded) {
      filter = currentState.filter;
      sortBy = currentState.sortBy;
      ascending = currentState.ascending;
    }

    add(ProjectsLoadRequested(
      filter: filter,
      sortBy: sortBy,
      ascending: ascending,
    ));
  }

  Future<void> _onProjectLoadRequested(
    ProjectLoadRequested event,
    Emitter<ProjectsState> emit,
  ) async {
    // Only show spinner if no detail is already loaded
    if (state is! ProjectDetailLoaded) {
      emit(const ProjectsLoading());
    }

    final result = await _getProjectUseCase(event.id);

    switch (result) {
      case Success(data: final project):
        emit(ProjectDetailLoaded(project));
      case Error(failure: final failure):
        emit(ProjectsError(failure.message));
    }
  }

  Future<void> _onCreateRequested(
    ProjectCreateRequested event,
    Emitter<ProjectsState> emit,
  ) async {
    emit(const ProjectOperationInProgress('Création du projet...'));

    final result = await _createProjectUseCase(
      clientId: event.project.clientId,
      name: event.project.name,
      description: event.project.description,
      address: event.project.address,
      city: event.project.city,
      postalCode: event.project.postalCode,
      surface: event.project.surface,
      roomCount: event.project.roomCount,
    );

    switch (result) {
      case Success(data: final project):
        emit(ProjectOperationSuccess(
          message: 'Projet créé avec succès',
          project: project,
        ));
        add(const ProjectsRefreshRequested());
      case Error(failure: final failure):
        emit(ProjectsError(failure.message));
    }
  }

  Future<void> _onUpdateRequested(
    ProjectUpdateRequested event,
    Emitter<ProjectsState> emit,
  ) async {
    emit(const ProjectOperationInProgress('Mise à jour du projet...'));

    final result = await _updateProjectUseCase(event.project.id, {
      'name': event.project.name,
      'description': event.project.description,
      'status': event.project.status.apiValue,
      'address': event.project.address,
      'city': event.project.city,
      'postalCode': event.project.postalCode,
      'surface': event.project.surface,
      'roomCount': event.project.roomCount,
    });

    switch (result) {
      case Success(data: final project):
        emit(ProjectOperationSuccess(
          message: 'Projet mis à jour',
          project: project,
        ));
        add(const ProjectsRefreshRequested());
      case Error(failure: final failure):
        emit(ProjectsError(failure.message));
    }
  }

  Future<void> _onDeleteRequested(
    ProjectDeleteRequested event,
    Emitter<ProjectsState> emit,
  ) async {
    emit(const ProjectOperationInProgress('Suppression du projet...'));

    final result = await _deleteProjectUseCase(event.id);

    switch (result) {
      case Success():
        emit(const ProjectOperationSuccess(message: 'Projet supprimé'));
        add(const ProjectsRefreshRequested());
      case Error(failure: final failure):
        emit(ProjectsError(failure.message));
    }
  }

  Future<void> _onStatusUpdateRequested(
    ProjectStatusUpdateRequested event,
    Emitter<ProjectsState> emit,
  ) async {
    final result = await _projectRepository.updateProject(
      event.id,
      {'status': event.status.apiValue},
    );

    switch (result) {
      case Success(data: final project):
        emit(ProjectOperationSuccess(
          message: 'Statut mis à jour',
          project: project,
        ));
        add(const ProjectsRefreshRequested());
      case Error(failure: final failure):
        emit(ProjectsError(failure.message));
    }
  }

  Future<void> _onFilterChanged(
    ProjectsFilterChanged event,
    Emitter<ProjectsState> emit,
  ) async {
    final currentState = state;
    if (currentState is ProjectsLoaded) {
      add(ProjectsLoadRequested(
        filter: event.filter,
        sortBy: currentState.sortBy,
        ascending: currentState.ascending,
      ));
    } else {
      add(ProjectsLoadRequested(filter: event.filter));
    }
  }

  Future<void> _onFilterCleared(
    ProjectsFilterCleared event,
    Emitter<ProjectsState> emit,
  ) async {
    add(const ProjectsLoadRequested());
  }
}
