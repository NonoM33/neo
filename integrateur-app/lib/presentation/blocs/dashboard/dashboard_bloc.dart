import 'dart:developer' as developer;
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/project.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/sync_repository.dart';
import '../../../domain/usecases/project_usecases.dart';

// Events
sealed class DashboardEvent extends Equatable {
  const DashboardEvent();

  @override
  List<Object?> get props => [];
}

final class DashboardLoadRequested extends DashboardEvent {
  const DashboardLoadRequested();
}

final class DashboardRefreshRequested extends DashboardEvent {
  const DashboardRefreshRequested();
}

// States
sealed class DashboardState extends Equatable {
  const DashboardState();

  @override
  List<Object?> get props => [];
}

final class DashboardInitial extends DashboardState {
  const DashboardInitial();
}

final class DashboardLoading extends DashboardState {
  const DashboardLoading();
}

final class DashboardLoaded extends DashboardState {
  final List<Project> recentProjects;
  final int totalProjects;
  final int brouillon;
  final int enCours;
  final int termine;
  final int pendingSync;
  final bool isOnline;
  final DateTime? lastSyncTime;

  const DashboardLoaded({
    required this.recentProjects,
    this.totalProjects = 0,
    this.brouillon = 0,
    this.enCours = 0,
    this.termine = 0,
    this.pendingSync = 0,
    this.isOnline = true,
    this.lastSyncTime,
  });

  @override
  List<Object?> get props => [
        recentProjects, totalProjects, brouillon, enCours, termine,
        pendingSync, isOnline, lastSyncTime,
      ];
}

final class DashboardError extends DashboardState {
  final String message;

  const DashboardError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final GetProjectsUseCase _getProjectsUseCase;
  final SyncRepository _syncRepository;

  DashboardBloc({
    required GetProjectsUseCase getProjectsUseCase,
    required SyncRepository syncRepository,
  })  : _getProjectsUseCase = getProjectsUseCase,
        _syncRepository = syncRepository,
        super(const DashboardInitial()) {
    on<DashboardLoadRequested>(_onLoadRequested);
    on<DashboardRefreshRequested>(_onRefreshRequested);
  }

  Future<void> _onLoadRequested(
    DashboardLoadRequested event,
    Emitter<DashboardState> emit,
  ) async {
    // Only show spinner on first load, not on re-navigation
    if (state is! DashboardLoaded) {
      emit(const DashboardLoading());
    }
    await _fetchAndEmit(emit);
  }

  Future<void> _onRefreshRequested(
    DashboardRefreshRequested event,
    Emitter<DashboardState> emit,
  ) async {
    // Refresh silently - keep current data visible
    await _fetchAndEmit(emit);
  }

  Future<void> _fetchAndEmit(Emitter<DashboardState> emit) async {
    try {
      final projectsResult = await _getProjectsUseCase();
      if (projectsResult is Error) {
        final msg = (projectsResult as Error).failure.message;
        // Only show error if no data is loaded yet
        if (state is! DashboardLoaded) {
          emit(DashboardError(msg));
        }
        return;
      }
      final allProjects = (projectsResult as Success<List<Project>>).data;

      final recentProjects = allProjects.take(5).toList();
      final pendingSync = await _syncRepository.getPendingUploadsCount();
      final isOnline = !(await _syncRepository.isOffline());
      final lastSyncTime = await _syncRepository.getLastSyncTime();

      emit(DashboardLoaded(
        recentProjects: recentProjects,
        totalProjects: allProjects.length,
        brouillon: allProjects.where((p) => p.status == ProjectStatus.brouillon).length,
        enCours: allProjects.where((p) => p.status == ProjectStatus.enCours).length,
        termine: allProjects.where((p) => p.status == ProjectStatus.termine).length,
        pendingSync: pendingSync,
        isOnline: isOnline,
        lastSyncTime: lastSyncTime,
      ));
    } catch (e, st) {
      developer.log('Dashboard error: $e', name: 'Dashboard', error: e, stackTrace: st);
      if (state is! DashboardLoaded) {
        emit(DashboardError(e.toString()));
      }
    }
  }
}
