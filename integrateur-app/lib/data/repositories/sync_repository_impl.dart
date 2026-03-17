import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/errors/failures.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/sync_repository.dart';
import '../datasources/remote/sync_remote_datasource.dart';

/// Implementation of SyncRepository using backend sync API.
class SyncRepositoryImpl implements SyncRepository {
  final SyncRemoteDataSource _remoteDataSource;
  bool _offlineMode = false;
  DateTime? _lastSyncTime;
  final _connectivityController = StreamController<bool>.broadcast();

  SyncRepositoryImpl({required SyncRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource {
    Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      _connectivityController.add(isOnline);
    });
  }

  @override
  Stream<bool> get connectivityStream => _connectivityController.stream;

  @override
  Future<Result<SyncProgress>> getSyncStatus() async {
    try {
      final status = await _remoteDataSource.getSyncStatus();
      final lastSync = status['lastSyncTimestamp'] != null
          ? DateTime.tryParse(status['lastSyncTimestamp'] as String)
          : null;
      return Success(SyncProgress(
        lastSyncTime: lastSync,
      ));
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur sync status: $e', originalError: e));
    }
  }

  @override
  Future<Result<SyncProgress>> syncAll({
    void Function(SyncProgress)? onProgress,
  }) async {
    try {
      onProgress?.call(const SyncProgress(status: SyncStatus.syncing, currentItem: 'Pull...'));

      // Pull changes
      final pullResult = await _remoteDataSource.pullChanges(
        deviceId: 'flutter-app',
        lastSyncTimestamp: _lastSyncTime,
      );

      final syncTimestamp = pullResult['syncTimestamp'] != null
          ? DateTime.tryParse(pullResult['syncTimestamp'] as String)
          : DateTime.now();

      _lastSyncTime = syncTimestamp;

      onProgress?.call(SyncProgress(
        status: SyncStatus.completed,
        lastSyncTime: syncTimestamp,
      ));

      return Success(SyncProgress(
        status: SyncStatus.completed,
        lastSyncTime: syncTimestamp,
      ));
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur sync: $e', originalError: e));
    }
  }

  @override
  Future<Result<void>> pushChanges() async {
    try {
      await _remoteDataSource.pushChanges(
        deviceId: 'flutter-app',
        changes: [],
      );
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur push: $e', originalError: e));
    }
  }

  @override
  Future<Result<void>> pullChanges() async {
    try {
      await _remoteDataSource.pullChanges(
        deviceId: 'flutter-app',
        lastSyncTimestamp: _lastSyncTime,
      );
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur pull: $e', originalError: e));
    }
  }

  @override
  Future<Result<void>> syncProject(String projectId) async {
    return const Success(null);
  }

  @override
  Future<Result<int>> uploadPendingPhotos({
    void Function(int current, int total)? onProgress,
  }) async {
    return const Success(0);
  }

  @override
  Future<int> getPendingUploadsCount() async => 0;

  @override
  Future<DateTime?> getLastSyncTime() async => _lastSyncTime;

  @override
  Future<bool> isOffline() async => _offlineMode;

  @override
  Future<void> setOfflineMode(bool offline) async {
    _offlineMode = offline;
  }

  @override
  Future<Result<void>> clearLocalData() async {
    _lastSyncTime = null;
    return const Success(null);
  }
}
