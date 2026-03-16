import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/project.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/project_repository.dart';
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
  final ProjectStats stats;
  final List<Project> recentProjects;
  final List<Project> upcomingAppointments;
  final int pendingSync;
  final bool isOnline;
  final DateTime? lastSyncTime;

  const DashboardLoaded({
    required this.stats,
    required this.recentProjects,
    required this.upcomingAppointments,
    this.pendingSync = 0,
    this.isOnline = true,
    this.lastSyncTime,
  });

  double get conversionRate {
    if (stats.total == 0) return 0;
    return (stats.signe + stats.termine) / stats.total * 100;
  }

  DashboardLoaded copyWith({
    ProjectStats? stats,
    List<Project>? recentProjects,
    List<Project>? upcomingAppointments,
    int? pendingSync,
    bool? isOnline,
    DateTime? lastSyncTime,
  }) {
    return DashboardLoaded(
      stats: stats ?? this.stats,
      recentProjects: recentProjects ?? this.recentProjects,
      upcomingAppointments: upcomingAppointments ?? this.upcomingAppointments,
      pendingSync: pendingSync ?? this.pendingSync,
      isOnline: isOnline ?? this.isOnline,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
    );
  }

  @override
  List<Object?> get props => [
        stats,
        recentProjects,
        upcomingAppointments,
        pendingSync,
        isOnline,
        lastSyncTime,
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
  final GetProjectStatsUseCase _getStatsUseCase;
  final SyncRepository _syncRepository;

  DashboardBloc({
    required GetProjectsUseCase getProjectsUseCase,
    required GetProjectStatsUseCase getStatsUseCase,
    required SyncRepository syncRepository,
  })  : _getProjectsUseCase = getProjectsUseCase,
        _getStatsUseCase = getStatsUseCase,
        _syncRepository = syncRepository,
        super(const DashboardInitial()) {
    on<DashboardLoadRequested>(_onLoadRequested);
    on<DashboardRefreshRequested>(_onRefreshRequested);
  }

  Future<void> _onLoadRequested(
    DashboardLoadRequested event,
    Emitter<DashboardState> emit,
  ) async {
    emit(const DashboardLoading());

    try {
      // Load stats
      final statsResult = await _getStatsUseCase();
      if (statsResult is Error) {
        emit(DashboardError((statsResult as Error).failure.message));
        return;
      }
      final stats = (statsResult as Success<ProjectStats>).data;

      // Load projects
      final projectsResult = await _getProjectsUseCase(
        sortBy: ProjectSortBy.dateCreated,
        ascending: false,
      );
      if (projectsResult is Error) {
        emit(DashboardError((projectsResult as Error).failure.message));
        return;
      }
      final allProjects = (projectsResult as Success<List<Project>>).data;

      // Get recent projects (last 5)
      final recentProjects = allProjects.take(5).toList();

      // Get upcoming appointments
      final now = DateTime.now();
      final nextWeek = now.add(const Duration(days: 7));
      final upcomingAppointments = allProjects
          .where((p) =>
              p.appointmentDate != null &&
              p.appointmentDate!.isAfter(now) &&
              p.appointmentDate!.isBefore(nextWeek))
          .toList()
        ..sort((a, b) => a.appointmentDate!.compareTo(b.appointmentDate!));

      // Get sync info
      final pendingSync = await _syncRepository.getPendingUploadsCount();
      final isOnline = !(await _syncRepository.isOffline());
      final lastSyncTime = await _syncRepository.getLastSyncTime();

      emit(DashboardLoaded(
        stats: stats,
        recentProjects: recentProjects,
        upcomingAppointments: upcomingAppointments.take(5).toList(),
        pendingSync: pendingSync,
        isOnline: isOnline,
        lastSyncTime: lastSyncTime,
      ));
    } catch (e) {
      emit(DashboardError(e.toString()));
    }
  }

  Future<void> _onRefreshRequested(
    DashboardRefreshRequested event,
    Emitter<DashboardState> emit,
  ) async {
    add(const DashboardLoadRequested());
  }
}
