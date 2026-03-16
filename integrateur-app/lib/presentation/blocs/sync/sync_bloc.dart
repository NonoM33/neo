import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/sync_repository.dart';

// Events
sealed class SyncEvent extends Equatable {
  const SyncEvent();

  @override
  List<Object?> get props => [];
}

final class SyncStarted extends SyncEvent {
  const SyncStarted();
}

final class SyncRequested extends SyncEvent {
  const SyncRequested();
}

final class SyncProgressUpdated extends SyncEvent {
  final SyncProgress progress;

  const SyncProgressUpdated(this.progress);

  @override
  List<Object?> get props => [progress];
}

final class SyncConnectivityChanged extends SyncEvent {
  final bool isOnline;

  const SyncConnectivityChanged(this.isOnline);

  @override
  List<Object?> get props => [isOnline];
}

final class SyncOfflineModeToggled extends SyncEvent {
  final bool enabled;

  const SyncOfflineModeToggled(this.enabled);

  @override
  List<Object?> get props => [enabled];
}

// States
sealed class SyncState extends Equatable {
  const SyncState();

  @override
  List<Object?> get props => [];
}

final class SyncInitial extends SyncState {
  const SyncInitial();
}

final class SyncIdle extends SyncState {
  final bool isOnline;
  final bool offlineModeEnabled;
  final DateTime? lastSyncTime;
  final int pendingUploads;

  const SyncIdle({
    this.isOnline = true,
    this.offlineModeEnabled = false,
    this.lastSyncTime,
    this.pendingUploads = 0,
  });

  SyncIdle copyWith({
    bool? isOnline,
    bool? offlineModeEnabled,
    DateTime? lastSyncTime,
    int? pendingUploads,
  }) {
    return SyncIdle(
      isOnline: isOnline ?? this.isOnline,
      offlineModeEnabled: offlineModeEnabled ?? this.offlineModeEnabled,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      pendingUploads: pendingUploads ?? this.pendingUploads,
    );
  }

  @override
  List<Object?> get props => [
        isOnline,
        offlineModeEnabled,
        lastSyncTime,
        pendingUploads,
      ];
}

final class SyncInProgress extends SyncState {
  final SyncProgress progress;

  const SyncInProgress(this.progress);

  @override
  List<Object?> get props => [progress];
}

final class SyncCompleted extends SyncState {
  final DateTime syncTime;
  final int itemsSynced;

  const SyncCompleted({
    required this.syncTime,
    required this.itemsSynced,
  });

  @override
  List<Object?> get props => [syncTime, itemsSynced];
}

final class SyncFailed extends SyncState {
  final String message;
  final bool canRetry;

  const SyncFailed({
    required this.message,
    this.canRetry = true,
  });

  @override
  List<Object?> get props => [message, canRetry];
}

// BLoC
class SyncBloc extends Bloc<SyncEvent, SyncState> {
  final SyncRepository _syncRepository;
  StreamSubscription<bool>? _connectivitySubscription;

  SyncBloc({
    required SyncRepository syncRepository,
  })  : _syncRepository = syncRepository,
        super(const SyncInitial()) {
    on<SyncStarted>(_onStarted);
    on<SyncRequested>(_onSyncRequested);
    on<SyncProgressUpdated>(_onProgressUpdated);
    on<SyncConnectivityChanged>(_onConnectivityChanged);
    on<SyncOfflineModeToggled>(_onOfflineModeToggled);
  }

  Future<void> _onStarted(
    SyncStarted event,
    Emitter<SyncState> emit,
  ) async {
    // Subscribe to connectivity changes
    _connectivitySubscription = _syncRepository.connectivityStream.listen(
      (isOnline) => add(SyncConnectivityChanged(isOnline)),
    );

    // Get initial state
    final isOffline = await _syncRepository.isOffline();
    final lastSyncTime = await _syncRepository.getLastSyncTime();
    final pendingUploads = await _syncRepository.getPendingUploadsCount();

    emit(SyncIdle(
      isOnline: !isOffline,
      lastSyncTime: lastSyncTime,
      pendingUploads: pendingUploads,
    ));
  }

  Future<void> _onSyncRequested(
    SyncRequested event,
    Emitter<SyncState> emit,
  ) async {
    final currentState = state;

    // Check if we can sync
    if (currentState is SyncIdle && !currentState.isOnline) {
      emit(const SyncFailed(
        message: 'Pas de connexion internet',
        canRetry: true,
      ));
      return;
    }

    emit(const SyncInProgress(SyncProgress()));

    final result = await _syncRepository.syncAll(
      onProgress: (progress) {
        add(SyncProgressUpdated(progress));
      },
    );

    switch (result) {
      case Success(data: final progress):
        final lastSyncTime = await _syncRepository.getLastSyncTime();
        final pendingUploads = await _syncRepository.getPendingUploadsCount();

        emit(SyncCompleted(
          syncTime: lastSyncTime ?? DateTime.now(),
          itemsSynced: progress.syncedItems,
        ));

        // Return to idle state after showing completion
        await Future.delayed(const Duration(seconds: 2));
        emit(SyncIdle(
          isOnline: true,
          lastSyncTime: lastSyncTime,
          pendingUploads: pendingUploads,
        ));

      case Error(failure: final failure):
        emit(SyncFailed(message: failure.message));
    }
  }

  void _onProgressUpdated(
    SyncProgressUpdated event,
    Emitter<SyncState> emit,
  ) {
    emit(SyncInProgress(event.progress));
  }

  Future<void> _onConnectivityChanged(
    SyncConnectivityChanged event,
    Emitter<SyncState> emit,
  ) async {
    final currentState = state;
    if (currentState is SyncIdle) {
      emit(currentState.copyWith(isOnline: event.isOnline));

      // Auto-sync when coming back online
      if (event.isOnline &&
          !currentState.offlineModeEnabled &&
          currentState.pendingUploads > 0) {
        add(const SyncRequested());
      }
    }
  }

  Future<void> _onOfflineModeToggled(
    SyncOfflineModeToggled event,
    Emitter<SyncState> emit,
  ) async {
    await _syncRepository.setOfflineMode(event.enabled);

    final currentState = state;
    if (currentState is SyncIdle) {
      emit(currentState.copyWith(offlineModeEnabled: event.enabled));
    }
  }

  @override
  Future<void> close() {
    _connectivitySubscription?.cancel();
    return super.close();
  }
}
