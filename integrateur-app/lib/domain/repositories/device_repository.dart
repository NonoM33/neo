import '../entities/device.dart';
import 'auth_repository.dart';

/// Device repository interface
abstract class DeviceRepository {
  Future<Result<List<Device>>> getDevicesByProject(String projectId);
  Future<Result<List<Device>>> getDevicesByRoom(String roomId);
  Future<Result<Device>> getDevice(String id);
  Future<Result<Device>> createDevice(String roomId, {
    required String name,
    String? productId,
    String? serialNumber,
    String? macAddress,
    String? ipAddress,
    String status = 'planifie',
    String? location,
    String? notes,
  });
  Future<Result<Device>> updateDevice(String id, Map<String, dynamic> data);
  Future<Result<void>> deleteDevice(String id);
}
