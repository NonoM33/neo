import '../../core/errors/failures.dart';
import '../entities/project.dart';
import '../entities/room.dart';
import '../repositories/auth_repository.dart';
import '../repositories/project_repository.dart';

/// Get projects use case
class GetProjectsUseCase {
  final ProjectRepository _repository;

  GetProjectsUseCase(this._repository);

  Future<Result<List<Project>>> call({
    ProjectFilter? filter,
    ProjectSortBy sortBy = ProjectSortBy.dateCreated,
    bool ascending = false,
  }) async {
    return _repository.getProjects(
      filter: filter,
      sortBy: sortBy,
      ascending: ascending,
    );
  }
}

/// Get single project use case
class GetProjectUseCase {
  final ProjectRepository _repository;

  GetProjectUseCase(this._repository);

  Future<Result<Project>> call(String id) async {
    return _repository.getProject(id);
  }
}

/// Create project use case
class CreateProjectUseCase {
  final ProjectRepository _repository;

  CreateProjectUseCase(this._repository);

  Future<Result<Project>> call(Project project) async {
    // Validate project data
    if (project.client.firstName.isEmpty || project.client.lastName.isEmpty) {
      return Error(
        ValidationFailure(message: 'Les informations client sont requises'),
      );
    }
    if (project.client.email.isEmpty) {
      return Error(
        ValidationFailure(message: 'L\'email du client est requis'),
      );
    }

    return _repository.createProject(project);
  }
}

/// Update project use case
class UpdateProjectUseCase {
  final ProjectRepository _repository;

  UpdateProjectUseCase(this._repository);

  Future<Result<Project>> call(Project project) async {
    return _repository.updateProject(project);
  }
}

/// Delete project use case
class DeleteProjectUseCase {
  final ProjectRepository _repository;

  DeleteProjectUseCase(this._repository);

  Future<Result<void>> call(String id) async {
    return _repository.deleteProject(id);
  }
}

/// Update project status use case
class UpdateProjectStatusUseCase {
  final ProjectRepository _repository;

  UpdateProjectStatusUseCase(this._repository);

  Future<Result<Project>> call(String id, ProjectStatus status) async {
    return _repository.updateStatus(id, status);
  }
}

/// Get project statistics use case
class GetProjectStatsUseCase {
  final ProjectRepository _repository;

  GetProjectStatsUseCase(this._repository);

  Future<Result<ProjectStats>> call() async {
    return _repository.getStats();
  }
}

/// Add room to project use case
class AddRoomUseCase {
  final ProjectRepository _repository;

  AddRoomUseCase(this._repository);

  Future<Result<Room>> call(String projectId, Room room) async {
    return _repository.addRoom(projectId, room);
  }
}

/// Update room use case
class UpdateRoomUseCase {
  final ProjectRepository _repository;

  UpdateRoomUseCase(this._repository);

  Future<Result<Room>> call(Room room) async {
    return _repository.updateRoom(room);
  }
}

/// Add photo to room use case
class AddPhotoUseCase {
  final ProjectRepository _repository;

  AddPhotoUseCase(this._repository);

  Future<Result<RoomPhoto>> call(String roomId, String localPath) async {
    return _repository.addPhoto(roomId, localPath);
  }
}
