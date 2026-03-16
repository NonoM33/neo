import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/di/providers.dart';
import '../presentation/blocs/auth/auth_state.dart';
import '../presentation/screens/auth/login_screen.dart';
import '../presentation/screens/dashboard/dashboard_screen.dart';
import '../presentation/screens/projects/projects_list_screen.dart';
import '../presentation/screens/projects/project_detail_screen.dart';
import '../presentation/screens/projects/project_form_screen.dart';
import '../presentation/screens/audit/audit_screen.dart';
import '../presentation/screens/catalogue/catalogue_screen.dart';
import '../presentation/screens/catalogue/product_detail_screen.dart';
import '../presentation/screens/quotes/quote_screen.dart';
import '../presentation/screens/quotes/quote_preview_screen.dart';
import '../presentation/widgets/common/shell_scaffold.dart';

/// Route names
class AppRoutes {
  static const String login = 'login';
  static const String dashboard = 'dashboard';
  static const String projects = 'projects';
  static const String projectDetail = 'project-detail';
  static const String projectCreate = 'project-create';
  static const String projectEdit = 'project-edit';
  static const String audit = 'audit';
  static const String catalogue = 'catalogue';
  static const String productDetail = 'product-detail';
  static const String quote = 'quote';
  static const String quotePreview = 'quote-preview';

  AppRoutes._();
}

/// Route paths
class AppPaths {
  static const String login = '/login';
  static const String dashboard = '/';
  static const String projects = '/projects';
  static const String projectDetail = '/projects/:id';
  static const String projectCreate = '/projects/new';
  static const String projectEdit = '/projects/:id/edit';
  static const String audit = '/projects/:id/audit';
  static const String catalogue = '/catalogue';
  static const String productDetail = '/catalogue/:id';
  static const String quote = '/projects/:id/quote';
  static const String quotePreview = '/quotes/:id/preview';

  AppPaths._();
}

/// Shell navigation key for nested navigation
final _shellNavigatorKey = GlobalKey<NavigatorState>();
final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// Router provider
final routerProvider = Provider<GoRouter>((ref) {
  final authBloc = ref.watch(authBlocProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppPaths.dashboard,
    debugLogDiagnostics: true,

    // Redirect based on auth state
    redirect: (context, state) {
      final authState = authBloc.state;
      final isLoggingIn = state.matchedLocation == AppPaths.login;

      // Check if user is authenticated
      if (authState is AuthUnauthenticated || authState is AuthInitial) {
        return isLoggingIn ? null : AppPaths.login;
      }

      // User is authenticated, redirect away from login
      if (isLoggingIn && authState is AuthAuthenticated) {
        return AppPaths.dashboard;
      }

      return null;
    },

    routes: [
      // Login route (outside shell)
      GoRoute(
        path: AppPaths.login,
        name: AppRoutes.login,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const LoginScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      ),

      // Main app shell with navigation rail
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return ShellScaffold(child: child);
        },
        routes: [
          // Dashboard
          GoRoute(
            path: AppPaths.dashboard,
            name: AppRoutes.dashboard,
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const DashboardScreen(),
            ),
          ),

          // Projects
          GoRoute(
            path: AppPaths.projects,
            name: AppRoutes.projects,
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ProjectsListScreen(),
            ),
            routes: [
              // Create project
              GoRoute(
                path: 'new',
                name: AppRoutes.projectCreate,
                parentNavigatorKey: _rootNavigatorKey,
                pageBuilder: (context, state) => MaterialPage(
                  key: state.pageKey,
                  child: const ProjectFormScreen(),
                ),
              ),

              // Project detail
              GoRoute(
                path: ':id',
                name: AppRoutes.projectDetail,
                pageBuilder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return NoTransitionPage(
                    key: state.pageKey,
                    child: ProjectDetailScreen(projectId: id),
                  );
                },
                routes: [
                  // Edit project
                  GoRoute(
                    path: 'edit',
                    name: AppRoutes.projectEdit,
                    parentNavigatorKey: _rootNavigatorKey,
                    pageBuilder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return MaterialPage(
                        key: state.pageKey,
                        child: ProjectFormScreen(projectId: id),
                      );
                    },
                  ),

                  // Audit
                  GoRoute(
                    path: 'audit',
                    name: AppRoutes.audit,
                    pageBuilder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return NoTransitionPage(
                        key: state.pageKey,
                        child: AuditScreen(projectId: id),
                      );
                    },
                  ),

                  // Quote
                  GoRoute(
                    path: 'quote',
                    name: AppRoutes.quote,
                    pageBuilder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return NoTransitionPage(
                        key: state.pageKey,
                        child: QuoteScreen(projectId: id),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),

          // Catalogue
          GoRoute(
            path: AppPaths.catalogue,
            name: AppRoutes.catalogue,
            pageBuilder: (context, state) => NoTransitionPage(
              key: state.pageKey,
              child: const CatalogueScreen(),
            ),
            routes: [
              // Product detail
              GoRoute(
                path: ':id',
                name: AppRoutes.productDetail,
                pageBuilder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return NoTransitionPage(
                    key: state.pageKey,
                    child: ProductDetailScreen(productId: id),
                  );
                },
              ),
            ],
          ),
        ],
      ),

      // Quote preview (full screen, outside shell)
      GoRoute(
        path: AppPaths.quotePreview,
        name: AppRoutes.quotePreview,
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (context, state) {
          final id = state.pathParameters['id']!;
          return MaterialPage(
            key: state.pageKey,
            fullscreenDialog: true,
            child: QuotePreviewScreen(quoteId: id),
          );
        },
      ),
    ],

    // Error page
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Page non trouvée',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              state.error?.toString() ?? 'La page demandée n\'existe pas',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go(AppPaths.dashboard),
              child: const Text('Retour à l\'accueil'),
            ),
          ],
        ),
      ),
    ),
  );
});

/// Extension for type-safe navigation
extension GoRouterExtension on GoRouter {
  void goToLogin() => go(AppPaths.login);
  void goToDashboard() => go(AppPaths.dashboard);
  void goToProjects() => go(AppPaths.projects);
  void goToProjectDetail(String id) => go('/projects/$id');
  void goToProjectCreate() => go(AppPaths.projectCreate);
  void goToProjectEdit(String id) => go('/projects/$id/edit');
  void goToAudit(String projectId) => go('/projects/$projectId/audit');
  void goToCatalogue() => go(AppPaths.catalogue);
  void goToProductDetail(String id) => go('/catalogue/$id');
  void goToQuote(String projectId) => go('/projects/$projectId/quote');
  void goToQuotePreview(String quoteId) => go('/quotes/$quoteId/preview');
}

/// Extension for BuildContext navigation
extension NavigationExtension on BuildContext {
  void goToLogin() => go(AppPaths.login);
  void goToDashboard() => go(AppPaths.dashboard);
  void goToProjects() => go(AppPaths.projects);
  void goToProjectDetail(String id) => go('/projects/$id');
  void goToProjectCreate() => go(AppPaths.projectCreate);
  void goToProjectEdit(String id) => go('/projects/$id/edit');
  void goToAudit(String projectId) => go('/projects/$projectId/audit');
  void goToCatalogue() => go(AppPaths.catalogue);
  void goToProductDetail(String id) => go('/catalogue/$id');
  void goToQuote(String projectId) => go('/projects/$projectId/quote');
  void goToQuotePreview(String quoteId) => go('/quotes/$quoteId/preview');
}
