import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/project.dart';
import '../../../routes/app_router.dart';
import '../../blocs/dashboard/dashboard_bloc.dart';

/// Dashboard screen with stats overview
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(dashboardBlocProvider).add(const DashboardLoadRequested());
  }

  @override
  Widget build(BuildContext context) {
    final dashboardBloc = ref.watch(dashboardBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de bord'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              dashboardBloc.add(const DashboardRefreshRequested());
            },
          ),
        ],
      ),
      body: BlocBuilder<DashboardBloc, DashboardState>(
        bloc: dashboardBloc,
        builder: (context, state) {
          if (state is DashboardLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is DashboardError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: colorScheme.error),
                  AppSpacing.vGapMd,
                  Text(state.message),
                  AppSpacing.vGapMd,
                  ElevatedButton(
                    onPressed: () {
                      dashboardBloc.add(const DashboardLoadRequested());
                    },
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is DashboardLoaded) {
            return RefreshIndicator(
              onRefresh: () async {
                dashboardBloc.add(const DashboardRefreshRequested());
              },
              child: SingleChildScrollView(
                padding: AppSpacing.pagePadding,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stats cards
                    _buildStatsSection(context, state),
                    AppSpacing.vGapXl,

                    // Quick actions
                    _buildQuickActions(context),
                    AppSpacing.vGapXl,

                    // Recent projects
                    if (state.recentProjects.isNotEmpty) ...[
                      Text(
                        'Projets récents',
                        style: textTheme.titleLarge,
                      ),
                      AppSpacing.vGapMd,
                      _buildRecentProjects(context, state.recentProjects),
                      AppSpacing.vGapXl,
                    ],

                    // Upcoming appointments
                    if (state.upcomingAppointments.isNotEmpty) ...[
                      Text(
                        'Prochains rendez-vous',
                        style: textTheme.titleLarge,
                      ),
                      AppSpacing.vGapMd,
                      _buildAppointments(context, state.upcomingAppointments),
                    ],
                  ],
                ),
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildStatsSection(BuildContext context, DashboardLoaded state) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 800 ? 4 : 2;

        return GridView.count(
          crossAxisCount: crossAxisCount,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.5,
          children: [
            _buildStatCard(
              context,
              title: 'Total projets',
              value: state.stats.total.toString(),
              icon: Icons.folder,
              color: AppTheme.primaryColor,
            ),
            _buildStatCard(
              context,
              title: 'En cours',
              value: state.stats.enCours.toString(),
              icon: Icons.pending_actions,
              color: AppTheme.statusEnCours,
            ),
            _buildStatCard(
              context,
              title: 'Devis envoyés',
              value: state.stats.devisEnvoye.toString(),
              icon: Icons.send,
              color: AppTheme.statusDevisEnvoye,
            ),
            _buildStatCard(
              context,
              title: 'Signés',
              value: state.stats.signe.toString(),
              icon: Icons.check_circle,
              color: AppTheme.successColor,
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatCard(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: AppSpacing.cardPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withAlpha(30),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        FilledButton.icon(
          onPressed: () => context.goToProjectCreate(),
          icon: const Icon(Icons.add),
          label: const Text('Nouveau projet'),
        ),
        OutlinedButton.icon(
          onPressed: () => context.goToCatalogue(),
          icon: const Icon(Icons.inventory_2),
          label: const Text('Catalogue'),
        ),
      ],
    );
  }

  Widget _buildRecentProjects(BuildContext context, List<Project> projects) {
    return Card(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: projects.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final project = projects[index];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: _getStatusColor(project.status).withAlpha(30),
              child: Text(
                project.client.initials,
                style: TextStyle(color: _getStatusColor(project.status)),
              ),
            ),
            title: Text(project.client.fullName),
            subtitle: Text(project.client.address.shortAddress),
            trailing: Chip(
              label: Text(
                project.status.displayName,
                style: const TextStyle(fontSize: 12),
              ),
              backgroundColor: _getStatusColor(project.status).withAlpha(30),
            ),
            onTap: () => context.goToProjectDetail(project.id),
          );
        },
      ),
    );
  }

  Widget _buildAppointments(BuildContext context, List<Project> appointments) {
    return Card(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: appointments.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final project = appointments[index];
          return ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withAlpha(30),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.calendar_today, color: AppTheme.primaryColor),
            ),
            title: Text(project.client.fullName),
            subtitle: Text(project.appointmentDate!.smartFormat),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.goToProjectDetail(project.id),
          );
        },
      ),
    );
  }

  Color _getStatusColor(ProjectStatus status) {
    switch (status) {
      case ProjectStatus.audit:
        return AppTheme.statusAudit;
      case ProjectStatus.enCours:
        return AppTheme.statusEnCours;
      case ProjectStatus.devisEnvoye:
        return AppTheme.statusDevisEnvoye;
      case ProjectStatus.signe:
        return AppTheme.statusSigne;
      case ProjectStatus.termine:
        return AppTheme.statusTermine;
    }
  }
}
