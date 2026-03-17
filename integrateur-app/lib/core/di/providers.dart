import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/local/auth_local_datasource.dart';
import '../../data/datasources/remote/auth_remote_datasource.dart';
import '../../data/datasources/remote/catalogue_remote_datasource.dart';
import '../../data/datasources/remote/device_remote_datasource.dart';
import '../../data/datasources/remote/project_remote_datasource.dart';
import '../../data/datasources/remote/quote_remote_datasource.dart';
import '../../data/datasources/remote/sync_remote_datasource.dart';
import '../../data/datasources/remote/ticket_remote_datasource.dart';
import '../../data/datasources/remote/appointment_remote_datasource.dart';
import '../../data/datasources/remote/user_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/catalogue_repository_impl.dart';
import '../../data/repositories/device_repository_impl.dart';
import '../../data/repositories/project_repository_impl.dart';
import '../../data/repositories/quote_repository_impl.dart';
import '../../data/repositories/sync_repository_impl.dart';
import '../../data/repositories/ticket_repository_impl.dart';
import '../../data/repositories/appointment_repository_impl.dart';
import '../../data/repositories/user_repository_impl.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/catalogue_repository.dart';
import '../../domain/repositories/device_repository.dart';
import '../../domain/repositories/project_repository.dart';
import '../../domain/repositories/quote_repository.dart';
import '../../domain/repositories/sync_repository.dart';
import '../../domain/repositories/ticket_repository.dart';
import '../../domain/repositories/appointment_repository.dart';
import '../../domain/repositories/user_repository.dart';
import '../../domain/usecases/auth_usecases.dart';
import '../../domain/usecases/catalogue_usecases.dart';
import '../../domain/usecases/project_usecases.dart';
import '../../domain/usecases/quote_usecases.dart';
import '../../domain/usecases/ticket_usecases.dart';
import '../../domain/usecases/appointment_usecases.dart';
import '../../presentation/blocs/audit/audit_bloc.dart';
import '../../presentation/blocs/auth/auth_bloc.dart';
import '../../presentation/blocs/catalogue/catalogue_bloc.dart';
import '../../presentation/blocs/dashboard/dashboard_bloc.dart';
import '../../presentation/blocs/projects/projects_bloc.dart';
import '../../presentation/blocs/projects/projects_event.dart';
import '../../presentation/blocs/quotes/quotes_bloc.dart';
import '../../presentation/blocs/sync/sync_bloc.dart';
import '../../presentation/blocs/tickets/tickets_bloc.dart';
import '../../presentation/blocs/tickets/tickets_event.dart';
import '../../presentation/blocs/appointments/appointments_bloc.dart';
import '../../presentation/blocs/appointments/appointments_event.dart';
import '../network/api_client.dart';
import '../storage/secure_storage.dart';

// ============================================================================
// Core Providers
// ============================================================================

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

// ============================================================================
// Data Source Providers
// ============================================================================

final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final authLocalDataSourceProvider = Provider<AuthLocalDataSource>((ref) {
  return AuthLocalDataSourceImpl(ref.watch(secureStorageProvider));
});

final projectRemoteDataSourceProvider = Provider<ProjectRemoteDataSource>((ref) {
  return ProjectRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final catalogueRemoteDataSourceProvider = Provider<CatalogueRemoteDataSource>((ref) {
  return CatalogueRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final quoteRemoteDataSourceProvider = Provider<QuoteRemoteDataSource>((ref) {
  return QuoteRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final deviceRemoteDataSourceProvider = Provider<DeviceRemoteDataSource>((ref) {
  return DeviceRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final syncRemoteDataSourceProvider = Provider<SyncRemoteDataSource>((ref) {
  return SyncRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final userRemoteDataSourceProvider = Provider<UserRemoteDataSource>((ref) {
  return UserRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final ticketRemoteDataSourceProvider = Provider<TicketRemoteDataSource>((ref) {
  return TicketRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

final appointmentRemoteDataSourceProvider = Provider<AppointmentRemoteDataSource>((ref) {
  return AppointmentRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

// ============================================================================
// Repository Providers
// ============================================================================

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    remoteDataSource: ref.watch(authRemoteDataSourceProvider),
    localDataSource: ref.watch(authLocalDataSourceProvider),
    apiClient: ref.watch(apiClientProvider),
  );
});

final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  return ProjectRepositoryImpl(
    remoteDataSource: ref.watch(projectRemoteDataSourceProvider),
  );
});

final catalogueRepositoryProvider = Provider<CatalogueRepository>((ref) {
  return CatalogueRepositoryImpl(
    remoteDataSource: ref.watch(catalogueRemoteDataSourceProvider),
  );
});

final quoteRepositoryProvider = Provider<QuoteRepository>((ref) {
  return QuoteRepositoryImpl(
    remoteDataSource: ref.watch(quoteRemoteDataSourceProvider),
  );
});

final deviceRepositoryProvider = Provider<DeviceRepository>((ref) {
  return DeviceRepositoryImpl(
    remoteDataSource: ref.watch(deviceRemoteDataSourceProvider),
  );
});

final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  return SyncRepositoryImpl(
    remoteDataSource: ref.watch(syncRemoteDataSourceProvider),
  );
});

final userRepositoryProvider = Provider<UserRepository>((ref) {
  return UserRepositoryImpl(
    remoteDataSource: ref.watch(userRemoteDataSourceProvider),
  );
});

final ticketRepositoryProvider = Provider<TicketRepository>((ref) {
  return TicketRepositoryImpl(
    remoteDataSource: ref.watch(ticketRemoteDataSourceProvider),
  );
});

final appointmentRepositoryProvider = Provider<AppointmentRepository>((ref) {
  return AppointmentRepositoryImpl(
    remoteDataSource: ref.watch(appointmentRemoteDataSourceProvider),
  );
});

// ============================================================================
// Use Case Providers
// ============================================================================

// Auth Use Cases
final loginUseCaseProvider = Provider<LoginUseCase>((ref) {
  return LoginUseCase(ref.watch(authRepositoryProvider));
});

final logoutUseCaseProvider = Provider<LogoutUseCase>((ref) {
  return LogoutUseCase(ref.watch(authRepositoryProvider));
});

final getCurrentUserUseCaseProvider = Provider<GetCurrentUserUseCase>((ref) {
  return GetCurrentUserUseCase(ref.watch(authRepositoryProvider));
});

final checkAuthStatusUseCaseProvider = Provider<CheckAuthStatusUseCase>((ref) {
  return CheckAuthStatusUseCase(ref.watch(authRepositoryProvider));
});

// Project Use Cases
final getProjectsUseCaseProvider = Provider<GetProjectsUseCase>((ref) {
  return GetProjectsUseCase(ref.watch(projectRepositoryProvider));
});

final getProjectUseCaseProvider = Provider<GetProjectUseCase>((ref) {
  return GetProjectUseCase(ref.watch(projectRepositoryProvider));
});

final createProjectUseCaseProvider = Provider<CreateProjectUseCase>((ref) {
  return CreateProjectUseCase(ref.watch(projectRepositoryProvider));
});

final updateProjectUseCaseProvider = Provider<UpdateProjectUseCase>((ref) {
  return UpdateProjectUseCase(ref.watch(projectRepositoryProvider));
});

final deleteProjectUseCaseProvider = Provider<DeleteProjectUseCase>((ref) {
  return DeleteProjectUseCase(ref.watch(projectRepositoryProvider));
});

// Catalogue Use Cases
final getProductsUseCaseProvider = Provider<GetProductsUseCase>((ref) {
  return GetProductsUseCase(ref.watch(catalogueRepositoryProvider));
});

final searchProductsUseCaseProvider = Provider<SearchProductsUseCase>((ref) {
  return SearchProductsUseCase(ref.watch(catalogueRepositoryProvider));
});

final toggleFavoriteUseCaseProvider = Provider<ToggleFavoriteUseCase>((ref) {
  return ToggleFavoriteUseCase(ref.watch(catalogueRepositoryProvider));
});

final syncCatalogueUseCaseProvider = Provider<SyncCatalogueUseCase>((ref) {
  return SyncCatalogueUseCase(ref.watch(catalogueRepositoryProvider));
});

final getBrandsUseCaseProvider = Provider<GetBrandsUseCase>((ref) {
  return GetBrandsUseCase(ref.watch(catalogueRepositoryProvider));
});

final getProductDependenciesUseCaseProvider = Provider<GetProductDependenciesUseCase>((ref) {
  return GetProductDependenciesUseCase(ref.watch(catalogueRepositoryProvider));
});

// Quote Use Cases
final getQuotesForProjectUseCaseProvider = Provider<GetQuotesForProjectUseCase>((ref) {
  return GetQuotesForProjectUseCase(ref.watch(quoteRepositoryProvider));
});

final createQuoteUseCaseProvider = Provider<CreateQuoteUseCase>((ref) {
  return CreateQuoteUseCase(ref.watch(quoteRepositoryProvider));
});

final addQuoteLineUseCaseProvider = Provider<AddQuoteLineUseCase>((ref) {
  return AddQuoteLineUseCase(ref.watch(quoteRepositoryProvider));
});

final updateQuoteLineUseCaseProvider = Provider<UpdateQuoteLineUseCase>((ref) {
  return UpdateQuoteLineUseCase(ref.watch(quoteRepositoryProvider));
});

final removeQuoteLineUseCaseProvider = Provider<RemoveQuoteLineUseCase>((ref) {
  return RemoveQuoteLineUseCase(ref.watch(quoteRepositoryProvider));
});

final applyDiscountUseCaseProvider = Provider<ApplyDiscountUseCase>((ref) {
  return ApplyDiscountUseCase(ref.watch(quoteRepositoryProvider));
});

final sendQuoteUseCaseProvider = Provider<SendQuoteUseCase>((ref) {
  return SendQuoteUseCase(ref.watch(quoteRepositoryProvider));
});

final generateQuotePdfUseCaseProvider = Provider<GenerateQuotePdfUseCase>((ref) {
  return GenerateQuotePdfUseCase(ref.watch(quoteRepositoryProvider));
});

final signQuoteUseCaseProvider = Provider<SignQuoteUseCase>((ref) {
  return SignQuoteUseCase(ref.watch(quoteRepositoryProvider));
});

// Ticket Use Cases
final getTicketsUseCaseProvider = Provider<GetTicketsUseCase>((ref) {
  return GetTicketsUseCase(ref.watch(ticketRepositoryProvider));
});

final getTicketStatsUseCaseProvider = Provider<GetTicketStatsUseCase>((ref) {
  return GetTicketStatsUseCase(ref.watch(ticketRepositoryProvider));
});

final getTicketUseCaseProvider = Provider<GetTicketUseCase>((ref) {
  return GetTicketUseCase(ref.watch(ticketRepositoryProvider));
});

final createTicketUseCaseProvider = Provider<CreateTicketUseCase>((ref) {
  return CreateTicketUseCase(ref.watch(ticketRepositoryProvider));
});

final changeTicketStatusUseCaseProvider = Provider<ChangeTicketStatusUseCase>((ref) {
  return ChangeTicketStatusUseCase(ref.watch(ticketRepositoryProvider));
});

final assignTicketUseCaseProvider = Provider<AssignTicketUseCase>((ref) {
  return AssignTicketUseCase(ref.watch(ticketRepositoryProvider));
});

final addTicketCommentUseCaseProvider = Provider<AddTicketCommentUseCase>((ref) {
  return AddTicketCommentUseCase(ref.watch(ticketRepositoryProvider));
});

final escalateTicketUseCaseProvider = Provider<EscalateTicketUseCase>((ref) {
  return EscalateTicketUseCase(ref.watch(ticketRepositoryProvider));
});

// Appointment Use Cases
final getAppointmentsUseCaseProvider = Provider<GetAppointmentsUseCase>((ref) {
  return GetAppointmentsUseCase(ref.watch(appointmentRepositoryProvider));
});

final getAppointmentUseCaseProvider = Provider<GetAppointmentUseCase>((ref) {
  return GetAppointmentUseCase(ref.watch(appointmentRepositoryProvider));
});

final createAppointmentUseCaseProvider = Provider<CreateAppointmentUseCase>((ref) {
  return CreateAppointmentUseCase(ref.watch(appointmentRepositoryProvider));
});

final confirmAppointmentUseCaseProvider = Provider<ConfirmAppointmentUseCase>((ref) {
  return ConfirmAppointmentUseCase(ref.watch(appointmentRepositoryProvider));
});

final startAppointmentUseCaseProvider = Provider<StartAppointmentUseCase>((ref) {
  return StartAppointmentUseCase(ref.watch(appointmentRepositoryProvider));
});

final completeAppointmentUseCaseProvider = Provider<CompleteAppointmentUseCase>((ref) {
  return CompleteAppointmentUseCase(ref.watch(appointmentRepositoryProvider));
});

final cancelAppointmentUseCaseProvider = Provider<CancelAppointmentUseCase>((ref) {
  return CancelAppointmentUseCase(ref.watch(appointmentRepositoryProvider));
});

final markNoShowUseCaseProvider = Provider<MarkNoShowUseCase>((ref) {
  return MarkNoShowUseCase(ref.watch(appointmentRepositoryProvider));
});

final getAvailabilityUseCaseProvider = Provider<GetAvailabilityUseCase>((ref) {
  return GetAvailabilityUseCase(ref.watch(appointmentRepositoryProvider));
});

final setAvailabilityUseCaseProvider = Provider<SetAvailabilityUseCase>((ref) {
  return SetAvailabilityUseCase(ref.watch(appointmentRepositoryProvider));
});

final getAvailableSlotsUseCaseProvider = Provider<GetAvailableSlotsUseCase>((ref) {
  return GetAvailableSlotsUseCase(ref.watch(appointmentRepositoryProvider));
});

// ============================================================================
// BLoC Providers
// ============================================================================

final authBlocProvider = Provider<AuthBloc>((ref) {
  return AuthBloc(
    loginUseCase: ref.watch(loginUseCaseProvider),
    logoutUseCase: ref.watch(logoutUseCaseProvider),
    getCurrentUserUseCase: ref.watch(getCurrentUserUseCaseProvider),
    checkAuthStatusUseCase: ref.watch(checkAuthStatusUseCaseProvider),
  );
});

final syncBlocProvider = Provider<SyncBloc>((ref) {
  return SyncBloc(
    syncRepository: ref.watch(syncRepositoryProvider),
  );
});

/// Projects BLoC provider
final projectsBlocProvider = Provider<ProjectsBloc>((ref) {
  return ProjectsBloc(
    getProjectsUseCase: ref.watch(getProjectsUseCaseProvider),
    getProjectUseCase: ref.watch(getProjectUseCaseProvider),
    createProjectUseCase: ref.watch(createProjectUseCaseProvider),
    updateProjectUseCase: ref.watch(updateProjectUseCaseProvider),
    deleteProjectUseCase: ref.watch(deleteProjectUseCaseProvider),
    projectRepository: ref.watch(projectRepositoryProvider),
  );
});

/// Project detail BLoC provider
final projectDetailBlocProvider = Provider.family<ProjectsBloc, String>((ref, projectId) {
  final bloc = ProjectsBloc(
    getProjectsUseCase: ref.watch(getProjectsUseCaseProvider),
    getProjectUseCase: ref.watch(getProjectUseCaseProvider),
    createProjectUseCase: ref.watch(createProjectUseCaseProvider),
    updateProjectUseCase: ref.watch(updateProjectUseCaseProvider),
    deleteProjectUseCase: ref.watch(deleteProjectUseCaseProvider),
    projectRepository: ref.watch(projectRepositoryProvider),
  );
  bloc.add(ProjectLoadRequested(projectId));
  return bloc;
});

/// Audit BLoC provider
final auditBlocProvider = Provider<AuditBloc>((ref) {
  return AuditBloc(
    projectRepository: ref.watch(projectRepositoryProvider),
  );
});

/// Catalogue BLoC provider
final catalogueBlocProvider = Provider<CatalogueBloc>((ref) {
  return CatalogueBloc(
    getProductsUseCase: ref.watch(getProductsUseCaseProvider),
    searchProductsUseCase: ref.watch(searchProductsUseCaseProvider),
    toggleFavoriteUseCase: ref.watch(toggleFavoriteUseCaseProvider),
    syncCatalogueUseCase: ref.watch(syncCatalogueUseCaseProvider),
    getBrandsUseCase: ref.watch(getBrandsUseCaseProvider),
  );
});

/// Quotes BLoC provider
final quotesBlocProvider = Provider<QuotesBloc>((ref) {
  return QuotesBloc(
    quoteRepository: ref.watch(quoteRepositoryProvider),
    getQuotesUseCase: ref.watch(getQuotesForProjectUseCaseProvider),
    createQuoteUseCase: ref.watch(createQuoteUseCaseProvider),
    addLineUseCase: ref.watch(addQuoteLineUseCaseProvider),
    updateLineUseCase: ref.watch(updateQuoteLineUseCaseProvider),
    removeLineUseCase: ref.watch(removeQuoteLineUseCaseProvider),
    applyDiscountUseCase: ref.watch(applyDiscountUseCaseProvider),
    sendQuoteUseCase: ref.watch(sendQuoteUseCaseProvider),
    generatePdfUseCase: ref.watch(generateQuotePdfUseCaseProvider),
    signQuoteUseCase: ref.watch(signQuoteUseCaseProvider),
  );
});

/// Tickets BLoC provider
final ticketsBlocProvider = Provider<TicketsBloc>((ref) {
  return TicketsBloc(
    getTicketsUseCase: ref.watch(getTicketsUseCaseProvider),
    getTicketStatsUseCase: ref.watch(getTicketStatsUseCaseProvider),
    getTicketUseCase: ref.watch(getTicketUseCaseProvider),
    createTicketUseCase: ref.watch(createTicketUseCaseProvider),
    changeTicketStatusUseCase: ref.watch(changeTicketStatusUseCaseProvider),
    assignTicketUseCase: ref.watch(assignTicketUseCaseProvider),
    addCommentUseCase: ref.watch(addTicketCommentUseCaseProvider),
    escalateTicketUseCase: ref.watch(escalateTicketUseCaseProvider),
    ticketRepository: ref.watch(ticketRepositoryProvider),
  );
});

/// Appointments BLoC provider
final appointmentsBlocProvider = Provider<AppointmentsBloc>((ref) {
  return AppointmentsBloc(
    getAppointmentsUseCase: ref.watch(getAppointmentsUseCaseProvider),
    getAppointmentUseCase: ref.watch(getAppointmentUseCaseProvider),
    createAppointmentUseCase: ref.watch(createAppointmentUseCaseProvider),
    confirmAppointmentUseCase: ref.watch(confirmAppointmentUseCaseProvider),
    startAppointmentUseCase: ref.watch(startAppointmentUseCaseProvider),
    completeAppointmentUseCase: ref.watch(completeAppointmentUseCaseProvider),
    cancelAppointmentUseCase: ref.watch(cancelAppointmentUseCaseProvider),
    markNoShowUseCase: ref.watch(markNoShowUseCaseProvider),
    appointmentRepository: ref.watch(appointmentRepositoryProvider),
  );
});

/// Appointment detail BLoC provider
final appointmentDetailBlocProvider = Provider.family<AppointmentsBloc, String>((ref, appointmentId) {
  final bloc = AppointmentsBloc(
    getAppointmentsUseCase: ref.watch(getAppointmentsUseCaseProvider),
    getAppointmentUseCase: ref.watch(getAppointmentUseCaseProvider),
    createAppointmentUseCase: ref.watch(createAppointmentUseCaseProvider),
    confirmAppointmentUseCase: ref.watch(confirmAppointmentUseCaseProvider),
    startAppointmentUseCase: ref.watch(startAppointmentUseCaseProvider),
    completeAppointmentUseCase: ref.watch(completeAppointmentUseCaseProvider),
    cancelAppointmentUseCase: ref.watch(cancelAppointmentUseCaseProvider),
    markNoShowUseCase: ref.watch(markNoShowUseCaseProvider),
    appointmentRepository: ref.watch(appointmentRepositoryProvider),
  );
  bloc.add(AppointmentLoadRequested(appointmentId));
  return bloc;
});

/// Ticket detail BLoC provider
final ticketDetailBlocProvider = Provider.family<TicketsBloc, String>((ref, ticketId) {
  final bloc = TicketsBloc(
    getTicketsUseCase: ref.watch(getTicketsUseCaseProvider),
    getTicketStatsUseCase: ref.watch(getTicketStatsUseCaseProvider),
    getTicketUseCase: ref.watch(getTicketUseCaseProvider),
    createTicketUseCase: ref.watch(createTicketUseCaseProvider),
    changeTicketStatusUseCase: ref.watch(changeTicketStatusUseCaseProvider),
    assignTicketUseCase: ref.watch(assignTicketUseCaseProvider),
    addCommentUseCase: ref.watch(addTicketCommentUseCaseProvider),
    escalateTicketUseCase: ref.watch(escalateTicketUseCaseProvider),
    ticketRepository: ref.watch(ticketRepositoryProvider),
  );
  bloc.add(TicketLoadRequested(ticketId));
  return bloc;
});

/// Dashboard BLoC provider
final dashboardBlocProvider = Provider<DashboardBloc>((ref) {
  return DashboardBloc(
    getProjectsUseCase: ref.watch(getProjectsUseCaseProvider),
    syncRepository: ref.watch(syncRepositoryProvider),
  );
});

// ============================================================================
// State Providers
// ============================================================================

final currentUserProvider = StateProvider<User?>((ref) => null);

final isOnlineProvider = StateProvider<bool>((ref) => true);

final syncStatusProvider = StateProvider<SyncStatus>((ref) => SyncStatus.idle);
