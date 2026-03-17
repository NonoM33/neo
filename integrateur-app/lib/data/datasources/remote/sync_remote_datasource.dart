import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';

/// Remote data source for sync operations
abstract class SyncRemoteDataSource {
  Future<Map<String, dynamic>> getSyncStatus();
  Future<Map<String, dynamic>> pullChanges({
    required String deviceId,
    DateTime? lastSyncTimestamp,
  });
  Future<Map<String, dynamic>> pushChanges({
    required String deviceId,
    required List<Map<String, dynamic>> changes,
  });
}

class SyncRemoteDataSourceImpl implements SyncRemoteDataSource {
  final ApiClient _apiClient;

  SyncRemoteDataSourceImpl(this._apiClient);

  @override
  Future<Map<String, dynamic>> getSyncStatus() async {
    final response = await _apiClient.get(ApiEndpoints.syncStatus);
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> pullChanges({
    required String deviceId,
    DateTime? lastSyncTimestamp,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.syncPull,
      data: {
        'deviceId': deviceId,
        if (lastSyncTimestamp != null)
          'lastSyncTimestamp': lastSyncTimestamp.toIso8601String(),
      },
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> pushChanges({
    required String deviceId,
    required List<Map<String, dynamic>> changes,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.syncPush,
      data: {
        'deviceId': deviceId,
        'changes': changes,
      },
    );
    return response.data as Map<String, dynamic>;
  }
}
