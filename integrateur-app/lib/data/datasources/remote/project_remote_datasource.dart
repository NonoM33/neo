import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/project_model.dart';
import '../../models/room_model.dart';

/// Remote data source for projects, clients, rooms, photos, checklist
abstract class ProjectRemoteDataSource {
  // Clients
  Future<Map<String, dynamic>> getClients({Map<String, dynamic>? queryParams});
  Future<ClientModel> getClient(String id);
  Future<ClientModel> createClient(Map<String, dynamic> data);
  Future<ClientModel> updateClient(String id, Map<String, dynamic> data);
  Future<void> deleteClient(String id);

  // Projects
  Future<Map<String, dynamic>> getProjects({Map<String, dynamic>? queryParams});
  Future<ProjectModel> getProject(String id);
  Future<ProjectModel> createProject(Map<String, dynamic> data);
  Future<ProjectModel> updateProject(String id, Map<String, dynamic> data);
  Future<void> deleteProject(String id);

  // Rooms
  Future<List<RoomModel>> getRoomsByProject(String projectId);
  Future<RoomModel> getRoom(String id);
  Future<RoomModel> createRoom(String projectId, Map<String, dynamic> data);
  Future<RoomModel> updateRoom(String id, Map<String, dynamic> data);
  Future<void> deleteRoom(String id);

  // Photos
  Future<List<RoomPhotoModel>> getPhotosByRoom(String roomId);
  Future<RoomPhotoModel> uploadPhoto(String roomId, String filePath, {String? caption});
  Future<void> deletePhoto(String id);

  // Checklist
  Future<ChecklistItemModel> createChecklistItem(String roomId, Map<String, dynamic> data);
  Future<ChecklistItemModel> updateChecklistItem(String id, Map<String, dynamic> data);
  Future<void> deleteChecklistItem(String id);
}

/// Implementation of ProjectRemoteDataSource
class ProjectRemoteDataSourceImpl implements ProjectRemoteDataSource {
  final ApiClient _apiClient;

  ProjectRemoteDataSourceImpl(this._apiClient);

  // ============ Clients ============

  @override
  Future<Map<String, dynamic>> getClients({Map<String, dynamic>? queryParams}) async {
    final response = await _apiClient.get(
      ApiEndpoints.clients,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<ClientModel> getClient(String id) async {
    final response = await _apiClient.get(ApiEndpoints.client(id));
    return ClientModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ClientModel> createClient(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.clients, data: data);
    return ClientModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ClientModel> updateClient(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.client(id), data: data);
    return ClientModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteClient(String id) async {
    await _apiClient.delete(ApiEndpoints.client(id));
  }

  // ============ Projects ============

  @override
  Future<Map<String, dynamic>> getProjects({Map<String, dynamic>? queryParams}) async {
    final response = await _apiClient.get(
      ApiEndpoints.projects,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<ProjectModel> getProject(String id) async {
    final response = await _apiClient.get(ApiEndpoints.project(id));
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ProjectModel> createProject(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.projects, data: data);
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ProjectModel> updateProject(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.project(id), data: data);
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteProject(String id) async {
    await _apiClient.delete(ApiEndpoints.project(id));
  }

  // ============ Rooms ============

  @override
  Future<List<RoomModel>> getRoomsByProject(String projectId) async {
    final response = await _apiClient.get(ApiEndpoints.projectRooms(projectId));
    final list = response.data as List<dynamic>;
    return list.map((e) => RoomModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<RoomModel> getRoom(String id) async {
    final response = await _apiClient.get(ApiEndpoints.room(id));
    return RoomModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<RoomModel> createRoom(String projectId, Map<String, dynamic> data) async {
    final response = await _apiClient.post(
      ApiEndpoints.projectRooms(projectId),
      data: data,
    );
    return RoomModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<RoomModel> updateRoom(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.room(id), data: data);
    return RoomModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteRoom(String id) async {
    await _apiClient.delete(ApiEndpoints.room(id));
  }

  // ============ Photos ============

  @override
  Future<List<RoomPhotoModel>> getPhotosByRoom(String roomId) async {
    final response = await _apiClient.get(ApiEndpoints.roomPhotos(roomId));
    final list = response.data as List<dynamic>;
    return list.map((e) => RoomPhotoModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<RoomPhotoModel> uploadPhoto(String roomId, String filePath, {String? caption}) async {
    final response = await _apiClient.uploadFile(
      ApiEndpoints.roomPhotos(roomId),
      filePath: filePath,
      fieldName: 'file',
      additionalData: caption != null ? {'caption': caption} : null,
    );
    return RoomPhotoModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deletePhoto(String id) async {
    await _apiClient.delete(ApiEndpoints.photo(id));
  }

  // ============ Checklist ============

  @override
  Future<ChecklistItemModel> createChecklistItem(String roomId, Map<String, dynamic> data) async {
    final response = await _apiClient.post(
      ApiEndpoints.roomChecklist(roomId),
      data: data,
    );
    return ChecklistItemModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<ChecklistItemModel> updateChecklistItem(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(
      ApiEndpoints.checklistItem(id),
      data: data,
    );
    return ChecklistItemModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteChecklistItem(String id) async {
    await _apiClient.delete(ApiEndpoints.checklistItem(id));
  }
}
