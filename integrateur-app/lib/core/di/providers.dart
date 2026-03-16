import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/datasources/local/auth_local_datasource.dart';
import '../../data/datasources/local/project_local_datasource.dart';
import '../../data/datasources/remote/auth_remote_datasource.dart';
import '../../data/datasources/remote/project_remote_datasource.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/project_repository_impl.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/catalogue_repository.dart';
import '../../domain/repositories/project_repository.dart';
import '../../domain/repositories/quote_repository.dart';
import '../../domain/repositories/sync_repository.dart';
import '../../domain/usecases/auth_usecases.dart';
import '../../domain/usecases/catalogue_usecases.dart';
import '../../domain/usecases/project_usecases.dart';
import '../../domain/usecases/quote_usecases.dart';
import '../../presentation/blocs/auth/auth_bloc.dart';
import '../../presentation/blocs/audit/audit_bloc.dart';
import '../../presentation/blocs/catalogue/catalogue_bloc.dart';
import '../../presentation/blocs/dashboard/dashboard_bloc.dart';
import '../../presentation/blocs/projects/projects_bloc.dart';
import '../../presentation/blocs/quotes/quotes_bloc.dart';
import '../../presentation/blocs/sync/sync_bloc.dart';
import '../network/api_client.dart';
import '../storage/secure_storage.dart';

// ============================================================================
// Core Providers
// ============================================================================

/// API Client provider
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

/// Secure storage provider
final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

// ============================================================================
// Data Source Providers
// ============================================================================

/// Auth remote data source
final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

/// Auth local data source
final authLocalDataSourceProvider = Provider<AuthLocalDataSource>((ref) {
  return AuthLocalDataSourceImpl(ref.watch(secureStorageProvider));
});

/// Project remote data source
final projectRemoteDataSourceProvider = Provider<ProjectRemoteDataSource>((ref) {
  return ProjectRemoteDataSourceImpl(ref.watch(apiClientProvider));
});

/// Project local data source
final projectLocalDataSourceProvider = Provider<ProjectLocalDataSource>((ref) {
  return ProjectLocalDataSourceImpl();
});

// ============================================================================
// Repository Providers
// ============================================================================

/// Auth repository provider
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    remoteDataSource: ref.watch(authRemoteDataSourceProvider),
    localDataSource: ref.watch(authLocalDataSourceProvider),
    apiClient: ref.watch(apiClientProvider),
  );
});

/// Project repository provider
final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  return ProjectRepositoryImpl(
    remoteDataSource: ref.watch(projectRemoteDataSourceProvider),
    localDataSource: ref.watch(projectLocalDataSourceProvider),
  );
});

/// Catalogue repository provider (to be implemented)
final catalogueRepositoryProvider = Provider<CatalogueRepository>((ref) {
  throw UnimplementedError('CatalogueRepository not implemented');
});

/// Quote repository provider (to be implemented)
final quoteRepositoryProvider = Provider<QuoteRepository>((ref) {
  throw UnimplementedError('QuoteRepository not implemented');
});

/// Sync repository provider (to be implemented)
final syncRepositoryProvider = Provider<SyncRepository>((ref) {
  throw UnimplementedError('SyncRepository not implemented');
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

final updateProjectStatusUseCaseProvider = Provider<UpdateProjectStatusUseCase>((ref) {
  return UpdateProjectStatusUseCase(ref.watch(projectRepositoryProvider));
});

final getProjectStatsUseCaseProvider = Provider<GetProjectStatsUseCase>((ref) {
  return GetProjectStatsUseCase(ref.watch(projectRepositoryProvider));
});

final addRoomUseCaseProvider = Provider<AddRoomUseCase>((ref) {
  return AddRoomUseCase(ref.watch(projectRepositoryProvider));
});

final updateRoomUseCaseProvider = Provider<UpdateRoomUseCase>((ref) {
  return UpdateRoomUseCase(ref.watch(projectRepositoryProvider));
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

// ============================================================================
// BLoC Providers
// ============================================================================

/// Auth BLoC provider
final authBlocProvider = Provider<AuthBloc>((ref) {
  return AuthBloc(
    loginUseCase: ref.watch(loginUseCaseProvider),
    logoutUseCase: ref.watch(logoutUseCaseProvider),
    getCurrentUserUseCase: ref.watch(getCurrentUserUseCaseProvider),
    checkAuthStatusUseCase: ref.watch(checkAuthStatusUseCaseProvider),
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
    updateStatusUseCase: ref.watch(updateProjectStatusUseCaseProvider),
    getStatsUseCase: ref.watch(getProjectStatsUseCaseProvider),
    addRoomUseCase: ref.watch(addRoomUseCaseProvider),
    updateRoomUseCase: ref.watch(updateRoomUseCaseProvider),
  );
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

/// Dashboard BLoC provider
final dashboardBlocProvider = Provider<DashboardBloc>((ref) {
  return DashboardBloc(
    getProjectsUseCase: ref.watch(getProjectsUseCaseProvider),
    getStatsUseCase: ref.watch(getProjectStatsUseCaseProvider),
    syncRepository: ref.watch(syncRepositoryProvider),
  );
});

/// Sync BLoC provider
final syncBlocProvider = Provider<SyncBloc>((ref) {
  return SyncBloc(
    syncRepository: ref.watch(syncRepositoryProvider),
  );
});

// ============================================================================
// State Providers (for reactive UI)
// ============================================================================

/// Current user state provider
final currentUserProvider = StateProvider<User?>((ref) => null);

/// Online status provider
final isOnlineProvider = StateProvider<bool>((ref) => true);

/// Sync status provider
final syncStatusProvider = StateProvider<SyncStatus>((ref) => SyncStatus.idle);
