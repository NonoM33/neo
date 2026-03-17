import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/entities/project.dart';
import '../../../routes/app_router.dart';
import '../../blocs/dashboard/dashboard_bloc.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    final bloc = ref.read(dashboardBlocProvider);
    if (bloc.state is DashboardInitial) {
      bloc.add(const DashboardLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboardBloc = ref.watch(dashboardBlocProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: BlocBuilder<DashboardBloc, DashboardState>(
        bloc: dashboardBloc,
        builder: (context, state) {
          if (state is DashboardLoading || state is DashboardInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is DashboardError) {
            return _buildError(context, state, dashboardBloc);
          }

          if (state is DashboardLoaded) {
            return _buildDashboard(context, state, dashboardBloc);
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildError(BuildContext context, DashboardError state, DashboardBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cs.errorContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.cloud_off_rounded, size: 40, color: cs.onErrorContainer),
          ),
          const SizedBox(height: 20),
          Text(state.message, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: () => bloc.add(const DashboardLoadRequested()),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Recharger'),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, DashboardLoaded state, DashboardBloc bloc) {
    final tt = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return RefreshIndicator(
      onRefresh: () async => bloc.add(const DashboardRefreshRequested()),
      child: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getGreeting(),
                          style: tt.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${state.totalProjects} projets au total',
                          style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  IconButton.filled(
                    onPressed: () => bloc.add(const DashboardRefreshRequested()),
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    tooltip: 'Actualiser',
                    style: IconButton.styleFrom(
                      backgroundColor: cs.surfaceContainerHighest,
                      foregroundColor: cs.onSurface,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Stats grid - always 4 columns on tablet
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(32, 24, 32, 0),
            sliver: SliverToBoxAdapter(
              child: _buildStatsGrid(context, state),
            ),
          ),

          // Quick actions
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(32, 28, 32, 0),
            sliver: SliverToBoxAdapter(
              child: _buildQuickActions(context),
            ),
          ),

          // Recent projects
          if (state.recentProjects.isNotEmpty) ...[
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(32, 28, 32, 12),
              sliver: SliverToBoxAdapter(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Projets recents', style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                    TextButton(
                      onPressed: () => context.goToProjects(),
                      child: const Text('Voir tout'),
                    ),
                  ],
                ),
              ),
            ),
            // Grid 2 columns on wide, list on narrow
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              sliver: isWide
                  ? SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        mainAxisExtent: 88,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) => _buildProjectCard(context, state.recentProjects[index]),
                        childCount: state.recentProjects.length,
                      ),
                    )
                  : SliverList.separated(
                      itemCount: state.recentProjects.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        return _buildProjectCard(context, state.recentProjects[index]);
                      },
                    ),
            ),
          ],

          // Bottom spacing
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(BuildContext context, DashboardLoaded state) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Always 4 columns on tablet (>= 600px in this context since we're past NavigationRail)
        final crossAxisCount = 4;
        final spacing = 12.0;
        final itemWidth = (constraints.maxWidth - spacing * (crossAxisCount - 1)) / crossAxisCount;
        final itemHeight = 120.0;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            _buildStatTile(
              context,
              title: 'Brouillons',
              value: state.brouillon.toString(),
              icon: Icons.edit_note_rounded,
              statusColor: AppTheme.statusBrouillon,
              width: itemWidth,
              height: itemHeight,
            ),
            _buildStatTile(
              context,
              title: 'En cours',
              value: state.enCours.toString(),
              icon: Icons.play_circle_outline_rounded,
              statusColor: AppTheme.statusEnCours,
              width: itemWidth,
              height: itemHeight,
            ),
            _buildStatTile(
              context,
              title: 'Termines',
              value: state.termine.toString(),
              icon: Icons.check_circle_outline_rounded,
              statusColor: AppTheme.statusTermine,
              width: itemWidth,
              height: itemHeight,
            ),
            _buildStatTile(
              context,
              title: 'Archives',
              value: (state.totalProjects - state.brouillon - state.enCours - state.termine).toString(),
              icon: Icons.archive_outlined,
              statusColor: AppTheme.statusArchive,
              width: itemWidth,
              height: itemHeight,
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatTile(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
    required Color statusColor,
    required double width,
    required double height,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cs = Theme.of(context).colorScheme;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusLg,
        border: Border(
          left: BorderSide(
            color: statusColor,
            width: 4,
          ),
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusColor.withAlpha(isDark ? 40 : 30),
              borderRadius: AppRadius.borderRadiusMd,
            ),
            child: Icon(icon, color: statusColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: cs.onSurface.withAlpha(160),
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Expanded(
          flex: 3,
          child: _QuickActionButton(
            icon: Icons.add_rounded,
            label: 'Nouveau projet',
            gradient: [cs.primary, cs.primary.withAlpha(200)],
            foregroundColor: cs.onPrimary,
            onTap: () {
              HapticFeedback.lightImpact();
              context.goToProjectCreate();
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: _QuickActionButton(
            icon: Icons.inventory_2_rounded,
            label: 'Catalogue',
            foregroundColor: cs.onSurface,
            borderColor: isDark ? Colors.white.withAlpha(15) : cs.outlineVariant.withAlpha(60),
            backgroundColor: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
            onTap: () => context.goToCatalogue(),
          ),
        ),
      ],
    );
  }

  Widget _buildProjectCard(BuildContext context, Project project) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final statusColor = _getStatusColor(project.status);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final displayName = project.client?.fullName ?? project.name;
    final initials = project.client?.initials ?? (project.name.isNotEmpty ? project.name[0].toUpperCase() : '?');
    final subtitle = project.client?.shortAddress ?? project.fullAddress;

    return Material(
      color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.goToProjectDetail(project.id),
        borderRadius: AppRadius.borderRadiusLg,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(isDark ? 40 : 25),
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: tt.titleSmall?.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      displayName,
                      style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subtitle.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Status chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(isDark ? 35 : 20),
                  borderRadius: AppRadius.borderRadiusSm,
                ),
                child: Text(
                  project.status.displayName,
                  style: tt.labelSmall?.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right_rounded, color: cs.onSurfaceVariant.withAlpha(100), size: 24),
            ],
          ),
        ),
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon apres-midi';
    return 'Bonsoir';
  }

  Color _getStatusColor(ProjectStatus status) {
    switch (status) {
      case ProjectStatus.brouillon:
        return AppTheme.statusBrouillon;
      case ProjectStatus.enCours:
        return AppTheme.statusEnCours;
      case ProjectStatus.termine:
        return AppTheme.statusTermine;
      case ProjectStatus.archive:
        return AppTheme.statusArchive;
    }
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final List<Color>? gradient;
  final Color foregroundColor;
  final Color? backgroundColor;
  final Color? borderColor;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    this.gradient,
    required this.foregroundColor,
    this.backgroundColor,
    this.borderColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusLg,
        child: Ink(
          decoration: BoxDecoration(
            gradient: gradient != null
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: gradient!,
                  )
                : null,
            color: gradient == null ? backgroundColor : null,
            borderRadius: AppRadius.borderRadiusLg,
            border: borderColor != null
                ? Border.all(color: borderColor!)
                : null,
          ),
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: foregroundColor, size: 22),
              const SizedBox(width: 10),
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: foregroundColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
