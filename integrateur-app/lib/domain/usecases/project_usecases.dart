import '../../core/errors/failures.dart';
import '../entities/project.dart';
import '../repositories/auth_repository.dart';
import '../repositories/project_repository.dart';

/// Get projects use case
class GetProjectsUseCase {
  final ProjectRepository _repository;

  GetProjectsUseCase(this._repository);

  Future<Result<List<Project>>> call({
    ProjectFilter? filter,
    int page = 1,
    int limit = 20,
  }) async {
    return _repository.getProjects(filter: filter, page: page, limit: limit);
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

  Future<Result<Project>> call({
    required String clientId,
    required String name,
    String? description,
    String? address,
    String? city,
    String? postalCode,
    double? surface,
    int? roomCount,
  }) async {
    if (name.isEmpty) {
      return const Error(ValidationFailure(message: 'Le nom du projet est requis'));
    }

    return _repository.createProject(
      clientId: clientId,
      name: name,
      description: description,
      address: address,
      city: city,
      postalCode: postalCode,
      surface: surface,
      roomCount: roomCount,
    );
  }
}

/// Update project use case
class UpdateProjectUseCase {
  final ProjectRepository _repository;

  UpdateProjectUseCase(this._repository);

  Future<Result<Project>> call(String id, Map<String, dynamic> data) async {
    return _repository.updateProject(id, data);
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
