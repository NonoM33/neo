import '../entities/checklist_item.dart';
import '../entities/project.dart';
import '../entities/room.dart';
import 'auth_repository.dart';

/// Filter options for projects
class ProjectFilter {
  final String? searchQuery;
  final ProjectStatus? status;
  final String? clientId;

  const ProjectFilter({
    this.searchQuery,
    this.status,
    this.clientId,
  });

  bool get hasFilters =>
      searchQuery != null || status != null || clientId != null;
}

/// Sort options for projects
enum ProjectSortBy {
  dateCreated,
  name,
  status,
}

/// Project repository interface
abstract class ProjectRepository {
  Future<Result<List<Project>>> getProjects({
    ProjectFilter? filter,
    int page = 1,
    int limit = 20,
  });

  Future<Result<Project>> getProject(String id);

  Future<Result<Project>> createProject({
    required String clientId,
    required String name,
    String? description,
    String? address,
    String? city,
    String? postalCode,
    double? surface,
    int? roomCount,
  });

  Future<Result<Project>> updateProject(String id, Map<String, dynamic> data);

  Future<Result<void>> deleteProject(String id);

  // Rooms
  Future<Result<List<Room>>> getRoomsByProject(String projectId);

  Future<Result<Room>> getRoom(String id);

  Future<Result<Room>> createRoom(String projectId, {
    required String name,
    String type = 'autre',
    int floor = 0,
    String? notes,
  });

  Future<Result<Room>> updateRoom(String id, Map<String, dynamic> data);

  Future<Result<void>> deleteRoom(String id);

  // Photos
  Future<Result<List<RoomPhoto>>> getPhotosByRoom(String roomId);

  Future<Result<RoomPhoto>> uploadPhoto(String roomId, String filePath, {String? caption});

  Future<Result<void>> deletePhoto(String id);

  // Checklist
  Future<Result<ChecklistItem>> createChecklistItem(String roomId, {
    required String category,
    required String label,
    bool checked = false,
    String? notes,
  });

  Future<Result<ChecklistItem>> updateChecklistItem(String id, Map<String, dynamic> data);

  Future<Result<void>> deleteChecklistItem(String id);
}

/// Project statistics
class ProjectStats {
  final int total;
  final int brouillon;
  final int enCours;
  final int termine;
  final int archive;

  const ProjectStats({
    this.total = 0,
    this.brouillon = 0,
    this.enCours = 0,
    this.termine = 0,
    this.archive = 0,
  });
}
