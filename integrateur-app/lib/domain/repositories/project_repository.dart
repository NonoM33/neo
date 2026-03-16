import '../entities/project.dart';
import '../entities/room.dart';
import 'auth_repository.dart';

/// Filter options for projects
class ProjectFilter {
  final String? searchQuery;
  final ProjectStatus? status;
  final DateTime? dateFrom;
  final DateTime? dateTo;
  final String? integrateurId;

  const ProjectFilter({
    this.searchQuery,
    this.status,
    this.dateFrom,
    this.dateTo,
    this.integrateurId,
  });

  bool get hasFilters =>
      searchQuery != null ||
      status != null ||
      dateFrom != null ||
      dateTo != null;
}

/// Sort options for projects
enum ProjectSortBy {
  dateCreated,
  dateAppointment,
  clientName,
  status,
}

/// Project repository interface
abstract class ProjectRepository {
  /// Get all projects with optional filtering
  Future<Result<List<Project>>> getProjects({
    ProjectFilter? filter,
    ProjectSortBy sortBy = ProjectSortBy.dateCreated,
    bool ascending = false,
    int? limit,
    int? offset,
  });

  /// Get a single project by ID
  Future<Result<Project>> getProject(String id);

  /// Create a new project
  Future<Result<Project>> createProject(Project project);

  /// Update an existing project
  Future<Result<Project>> updateProject(Project project);

  /// Delete a project
  Future<Result<void>> deleteProject(String id);

  /// Update project status
  Future<Result<Project>> updateStatus(String id, ProjectStatus status);

  /// Get project statistics
  Future<Result<ProjectStats>> getStats();

  /// Add a room to a project
  Future<Result<Room>> addRoom(String projectId, Room room);

  /// Update a room
  Future<Result<Room>> updateRoom(Room room);

  /// Delete a room
  Future<Result<void>> deleteRoom(String roomId);

  /// Add a photo to a room
  Future<Result<RoomPhoto>> addPhoto(String roomId, String localPath);

  /// Delete a photo
  Future<Result<void>> deletePhoto(String photoId);

  /// Get unsynced projects
  Future<Result<List<Project>>> getUnsyncedProjects();

  /// Mark project as synced
  Future<Result<void>> markAsSynced(String id);
}

/// Project statistics
class ProjectStats {
  final int total;
  final int audit;
  final int enCours;
  final int devisEnvoye;
  final int signe;
  final int termine;
  final int thisMonth;
  final double totalRevenue;

  const ProjectStats({
    this.total = 0,
    this.audit = 0,
    this.enCours = 0,
    this.devisEnvoye = 0,
    this.signe = 0,
    this.termine = 0,
    this.thisMonth = 0,
    this.totalRevenue = 0,
  });
}
