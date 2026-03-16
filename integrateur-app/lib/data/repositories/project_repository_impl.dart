import 'package:uuid/uuid.dart';

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/project.dart';
import '../../domain/entities/room.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/project_repository.dart';
import '../datasources/local/project_local_datasource.dart';
import '../datasources/remote/project_remote_datasource.dart';
import '../models/project_model.dart';
import '../models/room_model.dart';

/// Implementation of ProjectRepository
class ProjectRepositoryImpl implements ProjectRepository {
  final ProjectRemoteDataSource _remoteDataSource;
  final ProjectLocalDataSource _localDataSource;
  final Uuid _uuid;

  ProjectRepositoryImpl({
    required ProjectRemoteDataSource remoteDataSource,
    required ProjectLocalDataSource localDataSource,
    Uuid? uuid,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource,
        _uuid = uuid ?? const Uuid();

  @override
  Future<Result<List<Project>>> getProjects({
    ProjectFilter? filter,
    ProjectSortBy sortBy = ProjectSortBy.dateCreated,
    bool ascending = false,
    int? limit,
    int? offset,
  }) async {
    try {
      // Build query params
      final queryParams = <String, dynamic>{};
      if (filter?.searchQuery != null) {
        queryParams['search'] = filter!.searchQuery;
      }
      if (filter?.status != null) {
        queryParams['statut'] = filter!.status!.apiValue;
      }
      if (filter?.dateFrom != null) {
        queryParams['date_from'] = filter!.dateFrom!.toIso8601String();
      }
      if (filter?.dateTo != null) {
        queryParams['date_to'] = filter!.dateTo!.toIso8601String();
      }
      if (limit != null) queryParams['limit'] = limit;
      if (offset != null) queryParams['offset'] = offset;

      // Try remote first
      try {
        final projects = await _remoteDataSource.getProjects(
          queryParams: queryParams.isNotEmpty ? queryParams : null,
        );

        // Cache locally
        await _localDataSource.saveProjects(projects);

        return Success(projects);
      } on NetworkException {
        // Fallback to local cache
        final localProjects = await _localDataSource.getProjects();
        return Success(_applyLocalFilter(localProjects, filter, sortBy, ascending));
      }
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  List<Project> _applyLocalFilter(
    List<ProjectModel> projects,
    ProjectFilter? filter,
    ProjectSortBy sortBy,
    bool ascending,
  ) {
    var filtered = projects.toList();

    if (filter != null) {
      if (filter.searchQuery != null) {
        final query = filter.searchQuery!.toLowerCase();
        filtered = filtered.where((p) {
          return p.client.fullName.toLowerCase().contains(query) ||
              p.client.address.city.toLowerCase().contains(query);
        }).toList();
      }
      if (filter.status != null) {
        filtered = filtered.where((p) => p.status == filter.status).toList();
      }
    }

    // Sort
    filtered.sort((a, b) {
      int comparison;
      switch (sortBy) {
        case ProjectSortBy.dateCreated:
          comparison = a.createdAt.compareTo(b.createdAt);
        case ProjectSortBy.dateAppointment:
          final aDate = a.appointmentDate ?? DateTime(1970);
          final bDate = b.appointmentDate ?? DateTime(1970);
          comparison = aDate.compareTo(bDate);
        case ProjectSortBy.clientName:
          comparison = a.client.fullName.compareTo(b.client.fullName);
        case ProjectSortBy.status:
          comparison = a.status.index.compareTo(b.status.index);
      }
      return ascending ? comparison : -comparison;
    });

    return filtered;
  }

  @override
  Future<Result<Project>> getProject(String id) async {
    try {
      try {
        final project = await _remoteDataSource.getProject(id);
        await _localDataSource.saveProject(project);
        return Success(project);
      } on NetworkException {
        final localProject = await _localDataSource.getProject(id);
        if (localProject != null) {
          return Success(localProject);
        }
        return const Error(NotFoundFailure());
      }
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Project>> createProject(Project project) async {
    try {
      final projectModel = ProjectModel.fromEntity(project);

      try {
        final created = await _remoteDataSource.createProject(projectModel);
        await _localDataSource.saveProject(created);
        return Success(created);
      } on NetworkException {
        // Save locally with synced = false for later sync
        final localProject = ProjectModel.fromEntity(
          project.copyWith(
            id: project.id.isEmpty ? _uuid.v4() : project.id,
            isSynced: false,
          ),
        );
        await _localDataSource.saveProject(localProject);
        return Success(localProject);
      }
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Project>> updateProject(Project project) async {
    try {
      final projectModel = ProjectModel.fromEntity(project);

      try {
        final updated = await _remoteDataSource.updateProject(projectModel);
        await _localDataSource.saveProject(updated);
        return Success(updated);
      } on NetworkException {
        final localProject = ProjectModel.fromEntity(
          project.copyWith(
            isSynced: false,
            updatedAt: DateTime.now(),
          ),
        );
        await _localDataSource.saveProject(localProject);
        return Success(localProject);
      }
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteProject(String id) async {
    try {
      try {
        await _remoteDataSource.deleteProject(id);
      } on NetworkException {
        // Will be deleted on next sync
      }
      await _localDataSource.deleteProject(id);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Project>> updateStatus(String id, ProjectStatus status) async {
    final result = await getProject(id);
    if (result is Error) return result;

    final project = (result as Success<Project>).data;
    return updateProject(project.copyWith(status: status));
  }

  @override
  Future<Result<ProjectStats>> getStats() async {
    final result = await getProjects();
    if (result is Error) {
      return Error((result as Error).failure);
    }

    final projects = (result as Success<List<Project>>).data;
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);

    return Success(ProjectStats(
      total: projects.length,
      audit: projects.where((p) => p.status == ProjectStatus.audit).length,
      enCours: projects.where((p) => p.status == ProjectStatus.enCours).length,
      devisEnvoye:
          projects.where((p) => p.status == ProjectStatus.devisEnvoye).length,
      signe: projects.where((p) => p.status == ProjectStatus.signe).length,
      termine: projects.where((p) => p.status == ProjectStatus.termine).length,
      thisMonth: projects
          .where((p) => p.createdAt.isAfter(startOfMonth))
          .length,
      totalRevenue: projects
          .where((p) => p.quote != null && p.status == ProjectStatus.signe)
          .fold(0.0, (sum, p) => sum + (p.quote?.totalTTC ?? 0)),
    ));
  }

  @override
  Future<Result<Room>> addRoom(String projectId, Room room) async {
    try {
      final roomModel = RoomModel.fromEntity(room.copyWith(
        id: room.id.isEmpty ? _uuid.v4() : room.id,
        projectId: projectId,
      ));

      try {
        final created = await _remoteDataSource.addRoom(projectId, roomModel);
        // Update local project
        final projectResult = await getProject(projectId);
        if (projectResult is Success<Project>) {
          final project = projectResult.data;
          final updatedRooms = [...project.rooms, created];
          await _localDataSource.saveProject(
            ProjectModel.fromEntity(project.copyWith(rooms: updatedRooms)),
          );
        }
        return Success(created);
      } on NetworkException {
        // Save locally
        final projectResult = await getProject(projectId);
        if (projectResult is Success<Project>) {
          final project = projectResult.data;
          final updatedRooms = [...project.rooms, roomModel];
          await _localDataSource.saveProject(
            ProjectModel.fromEntity(project.copyWith(
              rooms: updatedRooms,
              isSynced: false,
            )),
          );
        }
        return Success(roomModel);
      }
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Room>> updateRoom(Room room) async {
    try {
      final roomModel = RoomModel.fromEntity(room);

      try {
        final updated = await _remoteDataSource.updateRoom(roomModel);
        return Success(updated);
      } on NetworkException {
        return Success(roomModel);
      }
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteRoom(String roomId) async {
    try {
      await _remoteDataSource.deleteRoom(roomId);
      return const Success(null);
    } on NetworkException {
      return const Success(null); // Will sync later
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<RoomPhoto>> addPhoto(String roomId, String localPath) async {
    try {
      final photo = RoomPhotoModel(
        id: _uuid.v4(),
        localPath: localPath,
        createdAt: DateTime.now(),
        isSynced: false,
      );

      try {
        final uploaded = await _remoteDataSource.uploadPhoto(roomId, localPath);
        return Success(uploaded);
      } on NetworkException {
        return Success(photo); // Will upload later
      }
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deletePhoto(String photoId) async {
    try {
      await _remoteDataSource.deletePhoto(photoId);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<List<Project>>> getUnsyncedProjects() async {
    try {
      final projects = await _localDataSource.getUnsyncedProjects();
      return Success(projects);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> markAsSynced(String id) async {
    try {
      await _localDataSource.markAsSynced(id);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }
}
