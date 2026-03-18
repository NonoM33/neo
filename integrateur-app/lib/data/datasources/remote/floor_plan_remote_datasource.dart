import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/floor_plan_model.dart';

abstract class FloorPlanRemoteDataSource {
  Future<FloorPlanModel?> getFloorPlanByRoom(String roomId);
  Future<FloorPlanModel> saveFloorPlan(String roomId, Map<String, dynamic> data);
  Future<FloorPlanModel> updateFloorPlan(String id, Map<String, dynamic> data);
  Future<void> deleteFloorPlan(String id);
  Future<FloorPlanModel> uploadUsdzFile(String planId, String filePath);
}

class FloorPlanRemoteDataSourceImpl implements FloorPlanRemoteDataSource {
  final ApiClient _apiClient;

  FloorPlanRemoteDataSourceImpl(this._apiClient);

  @override
  Future<FloorPlanModel?> getFloorPlanByRoom(String roomId) async {
    final response = await _apiClient.get(ApiEndpoints.roomFloorPlan(roomId));
    if (response.data == null) return null;
    return FloorPlanModel.fromApiJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<FloorPlanModel> saveFloorPlan(String roomId, Map<String, dynamic> data) async {
    final response = await _apiClient.post(
      ApiEndpoints.roomFloorPlan(roomId),
      data: data,
    );
    return FloorPlanModel.fromApiJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<FloorPlanModel> updateFloorPlan(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(
      ApiEndpoints.floorPlan(id),
      data: data,
    );
    return FloorPlanModel.fromApiJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteFloorPlan(String id) async {
    await _apiClient.delete(ApiEndpoints.floorPlan(id));
  }

  @override
  Future<FloorPlanModel> uploadUsdzFile(String planId, String filePath) async {
    final response = await _apiClient.uploadFile(
      ApiEndpoints.floorPlanUsdz(planId),
      filePath: filePath,
      fieldName: 'file',
    );
    return FloorPlanModel.fromApiJson(response.data as Map<String, dynamic>);
  }
}
