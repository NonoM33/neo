import 'auth_repository.dart';

/// Sync status
enum SyncStatus {
  idle,
  syncing,
  completed,
  error,
}

/// Sync progress information
class SyncProgress {
  final SyncStatus status;
  final int totalItems;
  final int syncedItems;
  final String? currentItem;
  final String? errorMessage;
  final DateTime? lastSyncTime;

  const SyncProgress({
    this.status = SyncStatus.idle,
    this.totalItems = 0,
    this.syncedItems = 0,
    this.currentItem,
    this.errorMessage,
    this.lastSyncTime,
  });

  double get progress {
    if (totalItems == 0) return 0;
    return syncedItems / totalItems;
  }

  bool get isComplete => status == SyncStatus.completed;
  bool get hasError => status == SyncStatus.error;
  bool get isSyncing => status == SyncStatus.syncing;

  SyncProgress copyWith({
    SyncStatus? status,
    int? totalItems,
    int? syncedItems,
    String? currentItem,
    String? errorMessage,
    DateTime? lastSyncTime,
  }) {
    return SyncProgress(
      status: status ?? this.status,
      totalItems: totalItems ?? this.totalItems,
      syncedItems: syncedItems ?? this.syncedItems,
      currentItem: currentItem ?? this.currentItem,
      errorMessage: errorMessage ?? this.errorMessage,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
    );
  }
}

/// Sync repository interface
abstract class SyncRepository {
  /// Get current sync status
  Future<Result<SyncProgress>> getSyncStatus();

  /// Sync all data with remote
  Future<Result<SyncProgress>> syncAll({
    void Function(SyncProgress)? onProgress,
  });

  /// Push local changes to remote
  Future<Result<void>> pushChanges();

  /// Pull remote changes to local
  Future<Result<void>> pullChanges();

  /// Sync specific project
  Future<Result<void>> syncProject(String projectId);

  /// Upload pending photos
  Future<Result<int>> uploadPendingPhotos({
    void Function(int current, int total)? onProgress,
  });

  /// Get number of pending uploads
  Future<int> getPendingUploadsCount();

  /// Get last sync time
  Future<DateTime?> getLastSyncTime();

  /// Check if offline mode is active
  Future<bool> isOffline();

  /// Set offline mode
  Future<void> setOfflineMode(bool offline);

  /// Clear all local data
  Future<Result<void>> clearLocalData();

  /// Stream of connectivity changes
  Stream<bool> get connectivityStream;
}
