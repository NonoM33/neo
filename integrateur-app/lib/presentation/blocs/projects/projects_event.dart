import 'package:equatable/equatable.dart';
import '../../../domain/entities/project.dart';
import '../../../domain/entities/room.dart';
import '../../../domain/repositories/project_repository.dart';

/// Projects events
sealed class ProjectsEvent extends Equatable {
  const ProjectsEvent();

  @override
  List<Object?> get props => [];
}

/// Load all projects
final class ProjectsLoadRequested extends ProjectsEvent {
  final ProjectFilter? filter;
  final ProjectSortBy sortBy;
  final bool ascending;

  const ProjectsLoadRequested({
    this.filter,
    this.sortBy = ProjectSortBy.dateCreated,
    this.ascending = false,
  });

  @override
  List<Object?> get props => [filter, sortBy, ascending];
}

/// Refresh projects
final class ProjectsRefreshRequested extends ProjectsEvent {
  const ProjectsRefreshRequested();
}

/// Load single project
final class ProjectLoadRequested extends ProjectsEvent {
  final String id;

  const ProjectLoadRequested(this.id);

  @override
  List<Object?> get props => [id];
}

/// Create a new project
final class ProjectCreateRequested extends ProjectsEvent {
  final Project project;

  const ProjectCreateRequested(this.project);

  @override
  List<Object?> get props => [project];
}

/// Update a project
final class ProjectUpdateRequested extends ProjectsEvent {
  final Project project;

  const ProjectUpdateRequested(this.project);

  @override
  List<Object?> get props => [project];
}

/// Delete a project
final class ProjectDeleteRequested extends ProjectsEvent {
  final String id;

  const ProjectDeleteRequested(this.id);

  @override
  List<Object?> get props => [id];
}

/// Update project status
final class ProjectStatusUpdateRequested extends ProjectsEvent {
  final String id;
  final ProjectStatus status;

  const ProjectStatusUpdateRequested({
    required this.id,
    required this.status,
  });

  @override
  List<Object?> get props => [id, status];
}

/// Add room to project
final class ProjectAddRoomRequested extends ProjectsEvent {
  final String projectId;
  final Room room;

  const ProjectAddRoomRequested({
    required this.projectId,
    required this.room,
  });

  @override
  List<Object?> get props => [projectId, room];
}

/// Update room
final class ProjectUpdateRoomRequested extends ProjectsEvent {
  final Room room;

  const ProjectUpdateRoomRequested(this.room);

  @override
  List<Object?> get props => [room];
}

/// Delete room
final class ProjectDeleteRoomRequested extends ProjectsEvent {
  final String roomId;

  const ProjectDeleteRoomRequested(this.roomId);

  @override
  List<Object?> get props => [roomId];
}

/// Apply filter
final class ProjectsFilterChanged extends ProjectsEvent {
  final ProjectFilter filter;

  const ProjectsFilterChanged(this.filter);

  @override
  List<Object?> get props => [filter];
}

/// Clear filters
final class ProjectsFilterCleared extends ProjectsEvent {
  const ProjectsFilterCleared();
}
