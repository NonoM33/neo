import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../routes/app_router.dart';
import '../../blocs/auth/auth_event.dart';
import '../../blocs/sync/sync_bloc.dart';

/// Main shell scaffold with navigation rail for tablet layout
class ShellScaffold extends ConsumerStatefulWidget {
  final Widget child;

  const ShellScaffold({
    super.key,
    required this.child,
  });

  @override
  ConsumerState<ShellScaffold> createState() => _ShellScaffoldState();
}

class _ShellScaffoldState extends ConsumerState<ShellScaffold> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final syncBloc = ref.watch(syncBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final screenWidth = MediaQuery.sizeOf(context).width;
    // Tablet starts at 600px - always show NavigationRail on tablet
    final isTabletOrLarger = screenWidth >= 600;
    final isExtended = screenWidth >= 1200;

    // Determine current route for selection
    final currentLocation = GoRouterState.of(context).matchedLocation;
    _selectedIndex = _getIndexFromLocation(currentLocation);

    if (isTabletOrLarger) {
      return Scaffold(
        body: Row(
          children: [
            // Navigation Rail
            NavigationRail(
              selectedIndex: _selectedIndex,
              extended: isExtended,
              minExtendedWidth: 220,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: _buildLogo(context),
              ),
              trailing: Expanded(
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: _buildTrailingActions(context, syncBloc),
                  ),
                ),
              ),
              destinations: _buildDestinations(),
              onDestinationSelected: (index) => _onDestinationSelected(context, index),
            ),

            // Divider
            VerticalDivider(
              thickness: 1,
              width: 1,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.white.withAlpha(8)
                  : colorScheme.outlineVariant.withAlpha(40),
            ),

            // Content
            Expanded(child: widget.child),
          ],
        ),
      );
    }

    // Mobile layout with bottom navigation
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        destinations: _buildMobileDestinations(),
        onDestinationSelected: (index) => _onDestinationSelected(context, index),
      ),
    );
  }

  Widget _buildLogo(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colorScheme.primary, const Color(0xFF0D47A1)],
        ),
        borderRadius: AppRadius.borderRadiusMd,
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withAlpha(40),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: const Icon(
        Icons.home_work_rounded,
        size: 32,
        color: Colors.white,
      ),
    );
  }

  Widget _buildTrailingActions(BuildContext context, SyncBloc syncBloc) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Sync button
        StreamBuilder<SyncState>(
          stream: syncBloc.stream,
          initialData: syncBloc.state,
          builder: (context, snapshot) {
            final state = snapshot.data;
            final isSyncing = state is SyncInProgress;
            final isOnline = state is SyncIdle ? state.isOnline : true;
            final pendingCount = state is SyncIdle ? state.pendingUploads : 0;

            return Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  icon: isSyncing
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        )
                      : Icon(
                          isOnline ? Icons.sync : Icons.cloud_off,
                          color: isOnline
                              ? null
                              : Theme.of(context).colorScheme.tertiary,
                        ),
                  onPressed: isSyncing
                      ? null
                      : () => syncBloc.add(const SyncRequested()),
                  tooltip: isSyncing ? 'Synchronisation...' : 'Synchroniser',
                ),
                // Pending sync badge
                if (pendingCount > 0)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.error,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$pendingCount',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onError,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        AppSpacing.vGapMd,
        // Profile/Logout button
        PopupMenuButton<String>(
          icon: const Icon(Icons.account_circle),
          tooltip: 'Mon compte',
          onSelected: (value) {
            if (value == 'logout') {
              ref.read(authBlocProvider).add(const AuthLogoutRequested());
              context.goToLogin();
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'profile',
              child: ListTile(
                leading: Icon(Icons.person),
                title: Text('Mon profil'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const PopupMenuDivider(),
            PopupMenuItem(
              value: 'logout',
              child: ListTile(
                leading: Icon(Icons.logout, color: Theme.of(context).colorScheme.error),
                title: Text('Deconnexion', style: TextStyle(color: Theme.of(context).colorScheme.error)),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
      ],
    );
  }

  List<NavigationRailDestination> _buildDestinations() {
    return const [
      NavigationRailDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: Text('Tableau de bord'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.folder_outlined),
        selectedIcon: Icon(Icons.folder),
        label: Text('Projets'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.calendar_month_outlined),
        selectedIcon: Icon(Icons.calendar_month),
        label: Text('Agenda'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: Text('Catalogue'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.support_agent_outlined),
        selectedIcon: Icon(Icons.support_agent),
        label: Text('Support'),
      ),
    ];
  }

  List<NavigationDestination> _buildMobileDestinations() {
    return const [
      NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard),
        label: 'Accueil',
      ),
      NavigationDestination(
        icon: Icon(Icons.folder_outlined),
        selectedIcon: Icon(Icons.folder),
        label: 'Projets',
      ),
      NavigationDestination(
        icon: Icon(Icons.calendar_month_outlined),
        selectedIcon: Icon(Icons.calendar_month),
        label: 'Agenda',
      ),
      NavigationDestination(
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: 'Catalogue',
      ),
      NavigationDestination(
        icon: Icon(Icons.support_agent_outlined),
        selectedIcon: Icon(Icons.support_agent),
        label: 'Support',
      ),
    ];
  }

  int _getIndexFromLocation(String location) {
    if (location.startsWith('/projects')) return 1;
    if (location.startsWith('/calendar')) return 2;
    if (location.startsWith('/catalogue')) return 3;
    if (location.startsWith('/tickets')) return 4;
    return 0; // Dashboard
  }

  void _onDestinationSelected(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.goToDashboard();
      case 1:
        context.goToProjects();
      case 2:
        context.goToCalendar();
      case 3:
        context.goToCatalogue();
      case 4:
        context.goToTickets();
    }
  }
}
