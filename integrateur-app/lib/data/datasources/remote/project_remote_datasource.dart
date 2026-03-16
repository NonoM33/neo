import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/project_model.dart';
import '../../models/room_model.dart';

/// Remote data source for projects
abstract class ProjectRemoteDataSource {
  Future<List<ProjectModel>> getProjects({
    Map<String, dynamic>? queryParams,
  });

  Future<ProjectModel> getProject(String id);

  Future<ProjectModel> createProject(ProjectModel project);

  Future<ProjectModel> updateProject(ProjectModel project);

  Future<void> deleteProject(String id);

  Future<RoomModel> addRoom(String projectId, RoomModel room);

  Future<RoomModel> updateRoom(RoomModel room);

  Future<void> deleteRoom(String roomId);

  Future<RoomPhotoModel> uploadPhoto(String roomId, String filePath);

  Future<void> deletePhoto(String photoId);
}

/// Implementation of ProjectRemoteDataSource
class ProjectRemoteDataSourceImpl implements ProjectRemoteDataSource {
  final ApiClient _apiClient;

  ProjectRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<ProjectModel>> getProjects({
    Map<String, dynamic>? queryParams,
  }) async {
    final response = await _apiClient.get(
      ApiEndpoints.projects,
      queryParameters: queryParams,
    );

    final data = response.data as Map<String, dynamic>;
    final projects = data['data'] as List<dynamic>? ?? data['projects'] as List<dynamic>? ?? [];

    return projects
        .map((json) => ProjectModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<ProjectModel> getProject(String id) async {
    final response = await _apiClient.get(ApiEndpoints.project(id));
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ProjectModel> createProject(ProjectModel project) async {
    final response = await _apiClient.post(
      ApiEndpoints.projects,
      data: project.toJson(),
    );
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ProjectModel> updateProject(ProjectModel project) async {
    final response = await _apiClient.put(
      ApiEndpoints.project(project.id),
      data: project.toJson(),
    );
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteProject(String id) async {
    await _apiClient.delete(ApiEndpoints.project(id));
  }

  @override
  Future<RoomModel> addRoom(String projectId, RoomModel room) async {
    final response = await _apiClient.post(
      ApiEndpoints.projectRooms(projectId),
      data: room.toJson(),
    );
    return RoomModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<RoomModel> updateRoom(RoomModel room) async {
    final response = await _apiClient.put(
      ApiEndpoints.room(room.id),
      data: room.toJson(),
    );
    return RoomModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteRoom(String roomId) async {
    await _apiClient.delete(ApiEndpoints.room(roomId));
  }

  @override
  Future<RoomPhotoModel> uploadPhoto(String roomId, String filePath) async {
    final response = await _apiClient.uploadFile(
      ApiEndpoints.roomPhotos(roomId),
      filePath: filePath,
      fieldName: 'photo',
    );
    return RoomPhotoModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deletePhoto(String photoId) async {
    await _apiClient.delete(ApiEndpoints.photo(photoId));
  }
}
