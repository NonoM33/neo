import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/device.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/device_repository.dart';
import '../datasources/remote/device_remote_datasource.dart';

class DeviceRepositoryImpl implements DeviceRepository {
  final DeviceRemoteDataSource _remoteDataSource;

  DeviceRepositoryImpl({required DeviceRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<Device>>> getDevicesByProject(String projectId) async {
    try {
      final devices = await _remoteDataSource.getDevicesByProject(projectId);
      return Success(devices);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<List<Device>>> getDevicesByRoom(String roomId) async {
    try {
      final devices = await _remoteDataSource.getDevicesByRoom(roomId);
      return Success(devices);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Device>> getDevice(String id) async {
    try {
      final device = await _remoteDataSource.getDevice(id);
      return Success(device);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Device non trouvé'));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Device>> createDevice(String roomId, {
    required String name,
    String? productId,
    String? serialNumber,
    String? macAddress,
    String? ipAddress,
    String status = 'planifie',
    String? location,
    String? notes,
  }) async {
    try {
      final data = <String, dynamic>{
        'name': name,
        'status': status,
        if (productId != null) 'productId': productId,
        if (serialNumber != null) 'serialNumber': serialNumber,
        if (macAddress != null) 'macAddress': macAddress,
        if (ipAddress != null) 'ipAddress': ipAddress,
        if (location != null) 'location': location,
        if (notes != null) 'notes': notes,
      };
      final device = await _remoteDataSource.createDevice(roomId, data);
      return Success(device);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<Device>> updateDevice(String id, Map<String, dynamic> data) async {
    try {
      final device = await _remoteDataSource.updateDevice(id, data);
      return Success(device);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Device non trouvé'));
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteDevice(String id) async {
    try {
      await _remoteDataSource.deleteDevice(id);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(originalError: e));
    }
  }
}
