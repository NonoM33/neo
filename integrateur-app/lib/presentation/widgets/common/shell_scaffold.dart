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
    final isTablet = MediaQuery.sizeOf(context).width >= 600;

    // Determine current route for selection
    final currentLocation = GoRouterState.of(context).matchedLocation;
    _selectedIndex = _getIndexFromLocation(currentLocation);

    if (isTablet) {
      return Scaffold(
        body: Row(
          children: [
            // Navigation Rail
            NavigationRail(
              selectedIndex: _selectedIndex,
              extended: MediaQuery.sizeOf(context).width >= 1200,
              minExtendedWidth: 200,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: _buildLogo(context),
              ),
              trailing: Expanded(
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 16),
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
              color: colorScheme.outlineVariant,
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
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        Icons.home_work_rounded,
        size: 32,
        color: Theme.of(context).colorScheme.primary,
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

            return IconButton(
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
                      color: isOnline ? null : Colors.orange,
                    ),
              onPressed: isSyncing
                  ? null
                  : () => syncBloc.add(const SyncRequested()),
              tooltip: isSyncing ? 'Synchronisation...' : 'Synchroniser',
            );
          },
        ),
        AppSpacing.vGapSm,
        // Profile/Logout button
        PopupMenuButton<String>(
          icon: const Icon(Icons.account_circle),
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
            const PopupMenuItem(
              value: 'logout',
              child: ListTile(
                leading: Icon(Icons.logout, color: Colors.red),
                title: Text('Déconnexion', style: TextStyle(color: Colors.red)),
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
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: Text('Catalogue'),
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
        icon: Icon(Icons.inventory_2_outlined),
        selectedIcon: Icon(Icons.inventory_2),
        label: 'Catalogue',
      ),
    ];
  }

  int _getIndexFromLocation(String location) {
    if (location.startsWith('/projects')) return 1;
    if (location.startsWith('/catalogue')) return 2;
    return 0; // Dashboard
  }

  void _onDestinationSelected(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.goToDashboard();
      case 1:
        context.goToProjects();
      case 2:
        context.goToCatalogue();
    }
  }
}
