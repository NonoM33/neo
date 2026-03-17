import 'dart:developer' as developer;

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/checklist_item.dart';
import '../../domain/entities/project.dart';
import '../../domain/entities/room.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/project_repository.dart';
import '../datasources/remote/project_remote_datasource.dart';
import '../models/project_model.dart';

/// Implementation of ProjectRepository
class ProjectRepositoryImpl implements ProjectRepository {
  final ProjectRemoteDataSource _remoteDataSource;

  ProjectRepositoryImpl({
    required ProjectRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<Project>>> getProjects({
    ProjectFilter? filter,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (filter?.searchQuery != null && filter!.searchQuery!.isNotEmpty) {
        queryParams['search'] = filter.searchQuery;
      }
      if (filter?.status != null) {
        queryParams['status'] = filter!.status!.apiValue;
      }
      if (filter?.clientId != null) {
        queryParams['clientId'] = filter!.clientId;
      }

      final data = await _remoteDataSource.getProjects(queryParams: queryParams);
      final projectsJson = data['data'] as List<dynamic>? ?? [];
      final projects = projectsJson
          .map((json) => ProjectModel.fromJson(json as Map<String, dynamic>))
          .toList();

      return Success(projects);
    } on NetworkException catch (e) {
      return Error(NetworkFailure(message: e.message));
    } catch (e, st) {
      developer.log('getProjects error: $e', name: 'ProjectRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'getProjects: $e', originalError: e));
    }
  }

  @override
  Future<Result<Project>> getProject(String id) async {
    try {
      final project = await _remoteDataSource.getProject(id);
      return Success(project);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e, st) {
      developer.log('getProject error: $e', name: 'ProjectRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'getProject: $e', originalError: e));
    }
  }

  @override
  Future<Result<Project>> createProject({
    required String clientId,
    required String name,
    String? description,
    String? address,
    String? city,
    String? postalCode,
    double? surface,
    int? roomCount,
  }) async {
    try {
      final data = <String, dynamic>{
        'clientId': clientId,
        'name': name,
        if (description != null) 'description': description,
        if (address != null) 'address': address,
        if (city != null) 'city': city,
        if (postalCode != null) 'postalCode': postalCode,
        if (surface != null) 'surface': surface,
        if (roomCount != null) 'roomCount': roomCount,
      };

      final project = await _remoteDataSource.createProject(data);
      return Success(project);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Project>> updateProject(String id, Map<String, dynamic> data) async {
    try {
      final project = await _remoteDataSource.updateProject(id, data);
      return Success(project);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteProject(String id) async {
    try {
      await _remoteDataSource.deleteProject(id);
      return const Success(null);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  // ============ Rooms ============

  @override
  Future<Result<List<Room>>> getRoomsByProject(String projectId) async {
    try {
      final rooms = await _remoteDataSource.getRoomsByProject(projectId);
      return Success(rooms);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Room>> getRoom(String id) async {
    try {
      final room = await _remoteDataSource.getRoom(id);
      return Success(room);
    } on NotFoundException {
      return const Error(NotFoundFailure());
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Room>> createRoom(String projectId, {
    required String name,
    String type = 'autre',
    int floor = 0,
    String? notes,
  }) async {
    try {
      final data = {
        'name': name,
        'type': type,
        'floor': floor,
        if (notes != null) 'notes': notes,
      };
      final room = await _remoteDataSource.createRoom(projectId, data);
      return Success(room);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Room>> updateRoom(String id, Map<String, dynamic> data) async {
    try {
      final room = await _remoteDataSource.updateRoom(id, data);
      return Success(room);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteRoom(String id) async {
    try {
      await _remoteDataSource.deleteRoom(id);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  // ============ Photos ============

  @override
  Future<Result<List<RoomPhoto>>> getPhotosByRoom(String roomId) async {
    try {
      final photos = await _remoteDataSource.getPhotosByRoom(roomId);
      return Success(photos);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<RoomPhoto>> uploadPhoto(String roomId, String filePath, {String? caption}) async {
    try {
      final photo = await _remoteDataSource.uploadPhoto(roomId, filePath, caption: caption);
      return Success(photo);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deletePhoto(String id) async {
    try {
      await _remoteDataSource.deletePhoto(id);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  // ============ Checklist ============

  @override
  Future<Result<ChecklistItem>> createChecklistItem(String roomId, {
    required String category,
    required String label,
    bool checked = false,
    String? notes,
  }) async {
    try {
      final data = {
        'category': category,
        'label': label,
        'checked': checked,
        if (notes != null) 'notes': notes,
      };
      final item = await _remoteDataSource.createChecklistItem(roomId, data);
      return Success(item);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<ChecklistItem>> updateChecklistItem(String id, Map<String, dynamic> data) async {
    try {
      final item = await _remoteDataSource.updateChecklistItem(id, data);
      return Success(item);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteChecklistItem(String id) async {
    try {
      await _remoteDataSource.deleteChecklistItem(id);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }
}
