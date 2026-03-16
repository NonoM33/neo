import 'package:equatable/equatable.dart';
import '../../../domain/entities/project.dart';
import '../../../domain/repositories/project_repository.dart';

/// Projects states
sealed class ProjectsState extends Equatable {
  const ProjectsState();

  @override
  List<Object?> get props => [];
}

/// Initial state
final class ProjectsInitial extends ProjectsState {
  const ProjectsInitial();
}

/// Loading projects
final class ProjectsLoading extends ProjectsState {
  const ProjectsLoading();
}

/// Projects loaded successfully
final class ProjectsLoaded extends ProjectsState {
  final List<Project> projects;
  final ProjectFilter? filter;
  final ProjectSortBy sortBy;
  final bool ascending;
  final ProjectStats? stats;

  const ProjectsLoaded({
    required this.projects,
    this.filter,
    this.sortBy = ProjectSortBy.dateCreated,
    this.ascending = false,
    this.stats,
  });

  /// Get projects by status
  List<Project> getByStatus(ProjectStatus status) {
    return projects.where((p) => p.status == status).toList();
  }

  /// Get recent projects (last 7 days)
  List<Project> get recentProjects {
    final sevenDaysAgo = DateTime.now().subtract(const Duration(days: 7));
    return projects
        .where((p) => p.createdAt.isAfter(sevenDaysAgo))
        .toList();
  }

  /// Copy with method
  ProjectsLoaded copyWith({
    List<Project>? projects,
    ProjectFilter? filter,
    ProjectSortBy? sortBy,
    bool? ascending,
    ProjectStats? stats,
  }) {
    return ProjectsLoaded(
      projects: projects ?? this.projects,
      filter: filter ?? this.filter,
      sortBy: sortBy ?? this.sortBy,
      ascending: ascending ?? this.ascending,
      stats: stats ?? this.stats,
    );
  }

  @override
  List<Object?> get props => [projects, filter, sortBy, ascending, stats];
}

/// Single project loaded
final class ProjectDetailLoaded extends ProjectsState {
  final Project project;

  const ProjectDetailLoaded(this.project);

  @override
  List<Object?> get props => [project];
}

/// Error loading projects
final class ProjectsError extends ProjectsState {
  final String message;

  const ProjectsError(this.message);

  @override
  List<Object?> get props => [message];
}

/// Project operation in progress
final class ProjectOperationInProgress extends ProjectsState {
  final String operation;

  const ProjectOperationInProgress(this.operation);

  @override
  List<Object?> get props => [operation];
}

/// Project operation success
final class ProjectOperationSuccess extends ProjectsState {
  final String message;
  final Project? project;

  const ProjectOperationSuccess({
    required this.message,
    this.project,
  });

  @override
  List<Object?> get props => [message, project];
}
