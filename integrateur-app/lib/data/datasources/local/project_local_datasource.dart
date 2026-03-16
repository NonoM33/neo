import 'package:hive/hive.dart';
import '../../../core/storage/hive_storage.dart';
import '../../models/project_model.dart';
import '../../models/room_model.dart';

/// Local data source for projects
abstract class ProjectLocalDataSource {
  Future<List<ProjectModel>> getProjects();
  Future<ProjectModel?> getProject(String id);
  Future<void> saveProject(ProjectModel project);
  Future<void> saveProjects(List<ProjectModel> projects);
  Future<void> deleteProject(String id);
  Future<List<ProjectModel>> getUnsyncedProjects();
  Future<void> markAsSynced(String id);
  Future<void> clearProjects();
}

/// Implementation of ProjectLocalDataSource using Hive
class ProjectLocalDataSourceImpl implements ProjectLocalDataSource {
  static const String _projectsBoxName = 'projects';
  Box? _box;

  Future<Box> get box async {
    _box ??= await HiveStorage.openBox(_projectsBoxName);
    return _box!;
  }

  @override
  Future<List<ProjectModel>> getProjects() async {
    final b = await box;
    final projects = <ProjectModel>[];

    for (final key in b.keys) {
      final data = b.get(key);
      if (data != null) {
        projects.add(ProjectModel.fromJson(
            Map<String, dynamic>.from(data as Map)));
      }
    }

    // Sort by creation date descending
    projects.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return projects;
  }

  @override
  Future<ProjectModel?> getProject(String id) async {
    final b = await box;
    final data = b.get(id);
    if (data == null) return null;
    return ProjectModel.fromJson(Map<String, dynamic>.from(data as Map));
  }

  @override
  Future<void> saveProject(ProjectModel project) async {
    final b = await box;
    await b.put(project.id, project.toJson());
  }

  @override
  Future<void> saveProjects(List<ProjectModel> projects) async {
    final b = await box;
    final entries = <String, Map<String, dynamic>>{};
    for (final project in projects) {
      entries[project.id] = project.toJson();
    }
    await b.putAll(entries);
  }

  @override
  Future<void> deleteProject(String id) async {
    final b = await box;
    await b.delete(id);
  }

  @override
  Future<List<ProjectModel>> getUnsyncedProjects() async {
    final projects = await getProjects();
    return projects.where((p) => !p.isSynced).toList();
  }

  @override
  Future<void> markAsSynced(String id) async {
    final project = await getProject(id);
    if (project != null) {
      final synced = ProjectModel.fromEntity(project.copyWith(isSynced: true));
      await saveProject(synced);
    }
  }

  @override
  Future<void> clearProjects() async {
    final b = await box;
    await b.clear();
  }
}
