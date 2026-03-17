import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/device_model.dart';

/// Remote data source for devices
abstract class DeviceRemoteDataSource {
  Future<List<DeviceModel>> getDevicesByProject(String projectId);
  Future<List<DeviceModel>> getDevicesByRoom(String roomId);
  Future<DeviceModel> getDevice(String id);
  Future<DeviceModel> createDevice(String roomId, Map<String, dynamic> data);
  Future<DeviceModel> updateDevice(String id, Map<String, dynamic> data);
  Future<void> deleteDevice(String id);
}

class DeviceRemoteDataSourceImpl implements DeviceRemoteDataSource {
  final ApiClient _apiClient;

  DeviceRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<DeviceModel>> getDevicesByProject(String projectId) async {
    final response = await _apiClient.get(ApiEndpoints.projectDevices(projectId));
    final list = response.data as List<dynamic>;
    return list.map((e) => DeviceModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<DeviceModel>> getDevicesByRoom(String roomId) async {
    final response = await _apiClient.get(ApiEndpoints.roomDevices(roomId));
    final list = response.data as List<dynamic>;
    return list.map((e) => DeviceModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<DeviceModel> getDevice(String id) async {
    final response = await _apiClient.get(ApiEndpoints.device(id));
    return DeviceModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<DeviceModel> createDevice(String roomId, Map<String, dynamic> data) async {
    final response = await _apiClient.post(
      ApiEndpoints.roomDevices(roomId),
      data: data,
    );
    return DeviceModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<DeviceModel> updateDevice(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.device(id), data: data);
    return DeviceModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteDevice(String id) async {
    await _apiClient.delete(ApiEndpoints.device(id));
  }
}
