import '../../domain/entities/floor_plan.dart';
import '../../domain/repositories/floor_plan_repository.dart';
import '../datasources/remote/floor_plan_remote_datasource.dart';
import '../models/floor_plan_model.dart';

class FloorPlanRepositoryImpl implements FloorPlanRepository {
  final FloorPlanRemoteDataSource _remoteDataSource;

  FloorPlanRepositoryImpl({required FloorPlanRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<FloorPlan?> getFloorPlanByRoom(String roomId) async {
    return _remoteDataSource.getFloorPlanByRoom(roomId);
  }

  @override
  Future<FloorPlan> saveFloorPlan(FloorPlan plan) async {
    final model = FloorPlanModel.fromEntity(plan);
    final result = await _remoteDataSource.saveFloorPlan(plan.roomId, model.toApiJson());
    return result;
  }

  @override
  Future<void> deleteFloorPlan(String id) async {
    await _remoteDataSource.deleteFloorPlan(id);
  }

  @override
  Future<FloorPlan> uploadUsdzFile(String planId, String filePath) async {
    return _remoteDataSource.uploadUsdzFile(planId, filePath);
  }
}
