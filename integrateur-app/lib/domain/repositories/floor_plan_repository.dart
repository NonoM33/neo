import '../entities/floor_plan.dart';

abstract class FloorPlanRepository {
  Future<FloorPlan?> getFloorPlanByRoom(String roomId);
  Future<FloorPlan> saveFloorPlan(FloorPlan plan);
  Future<void> deleteFloorPlan(String id);
  Future<FloorPlan> uploadUsdzFile(String planId, String filePath);
}
