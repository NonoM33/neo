import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/project.dart';
import '../../../domain/repositories/project_repository.dart';
import '../../../routes/app_router.dart';
import '../../blocs/projects/projects_bloc.dart';
import '../../blocs/projects/projects_event.dart';
import '../../blocs/projects/projects_state.dart';

class ProjectsListScreen extends ConsumerStatefulWidget {
  const ProjectsListScreen({super.key});

  @override
  ConsumerState<ProjectsListScreen> createState() => _ProjectsListScreenState();
}

class _ProjectsListScreenState extends ConsumerState<ProjectsListScreen> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  ProjectStatus? _selectedStatus;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(projectsBlocProvider);
    if (bloc.state is ProjectsInitial) {
      bloc.add(const ProjectsLoadRequested());
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value, ProjectsBloc bloc) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (value.isEmpty) {
        bloc.add(const ProjectsFilterCleared());
      } else {
        bloc.add(ProjectsFilterChanged(
          ProjectFilter(searchQuery: value, status: _selectedStatus),
        ));
      }
    });
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final projectsBloc = ref.watch(projectsBlocProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: BlocBuilder<ProjectsBloc, ProjectsState>(
        bloc: projectsBloc,
        builder: (context, state) {
          return CustomScrollView(
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
                              'Projets',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.5,
                              ),
                            ),
                            if (state is ProjectsLoaded) ...[
                              const SizedBox(height: 4),
                              Text(
                                '${state.projects.length} projet${state.projects.length > 1 ? 's' : ''}',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: cs.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      _ActionButton(
                        icon: Icons.refresh_rounded,
                        onTap: () => projectsBloc.add(const ProjectsRefreshRequested()),
                        cs: cs,
                        tooltip: 'Actualiser',
                      ),
                      const SizedBox(width: 8),
                      _ActionButton(
                        icon: Icons.add_rounded,
                        onTap: () {
                          HapticFeedback.lightImpact();
                          context.goToProjectCreate();
                        },
                        cs: cs,
                        isPrimary: true,
                        tooltip: 'Nouveau projet',
                      ),
                    ],
                  ),
                ),
              ),

              // Search bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
                  child: _buildSearchBar(context, projectsBloc),
                ),
              ),

              // Status filter chips
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: _buildStatusFilters(context, projectsBloc),
                ),
              ),

              // Content
              if (state is ProjectsLoading || state is ProjectsInitial)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (state is ProjectsError)
                SliverFillRemaining(
                  child: _buildError(context, state, projectsBloc),
                )
              else if (state is ProjectsLoaded)
                ..._buildProjectsContent(context, state, projectsBloc),

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context, ProjectsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerHigh : cs.surfaceContainerHighest.withAlpha(120),
        borderRadius: AppRadius.borderRadiusLg,
      ),
      child: TextField(
        controller: _searchController,
        focusNode: _searchFocusNode,
        decoration: InputDecoration(
          hintText: 'Rechercher un client, une adresse...',
          hintStyle: TextStyle(color: cs.onSurfaceVariant.withAlpha(140)),
          prefixIcon: Icon(Icons.search_rounded, color: cs.onSurfaceVariant),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.close_rounded, color: cs.onSurfaceVariant),
                  tooltip: 'Effacer la recherche',
                  onPressed: () {
                    _searchController.clear();
                    _debounce?.cancel();
                    bloc.add(const ProjectsFilterCleared());
                    setState(() {});
                  },
                )
              : null,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        onChanged: (value) => _onSearchChanged(value, bloc),
      ),
    );
  }

  Widget _buildStatusFilters(BuildContext context, ProjectsBloc bloc) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Row(
        children: [
          _StatusChip(
            label: 'Tous',
            isSelected: _selectedStatus == null,
            color: cs.primary,
            isDark: isDark,
            onTap: () {
              setState(() => _selectedStatus = null);
              bloc.add(const ProjectsFilterCleared());
            },
          ),
          const SizedBox(width: 8),
          ...ProjectStatus.values.map((status) {
            final color = _getStatusColor(status);
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _StatusChip(
                label: status.displayName,
                isSelected: _selectedStatus == status,
                color: color,
                isDark: isDark,
                onTap: () {
                  setState(() => _selectedStatus = _selectedStatus == status ? null : status);
                  if (_selectedStatus != null) {
                    bloc.add(ProjectsFilterChanged(
                      ProjectFilter(
                        searchQuery: _searchController.text.isNotEmpty
                            ? _searchController.text
                            : null,
                        status: _selectedStatus,
                      ),
                    ));
                  } else {
                    bloc.add(const ProjectsFilterCleared());
                  }
                },
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context, ProjectsError state, ProjectsBloc bloc) {
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
            onPressed: () => bloc.add(const ProjectsLoadRequested()),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Recharger'),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildProjectsContent(BuildContext context, ProjectsLoaded state, ProjectsBloc bloc) {
    if (state.projects.isEmpty) {
      return [
        SliverFillRemaining(child: _buildEmptyState(context)),
      ];
    }

    final isWide = MediaQuery.sizeOf(context).width >= 900;

    if (isWide) {
      return [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
          sliver: SliverGrid(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: MediaQuery.sizeOf(context).width >= 1200 ? 3 : 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 2.0,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, index) => _buildProjectGridCard(context, state.projects[index]),
              childCount: state.projects.length,
            ),
          ),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(32, 20, 32, 0),
        sliver: SliverList.separated(
          itemCount: state.projects.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (context, index) => _buildProjectListCard(context, state.projects[index]),
        ),
      ),
    ];
  }

  Widget _buildEmptyState(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: isDark ? cs.surfaceContainerHigh : cs.surfaceContainerHighest,
              borderRadius: AppRadius.borderRadiusXl,
            ),
            child: Icon(Icons.folder_open_rounded, size: 36, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 20),
          Text(
            'Aucun projet',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            'Creez votre premier projet pour commencer',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => context.goToProjectCreate(),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Nouveau projet'),
          ),
        ],
      ),
    );
  }

  // Helpers

  String _displayName(Project project) =>
      project.client?.fullName ?? project.name;

  String _initials(Project project) =>
      project.client?.initials ??
      (project.name.isNotEmpty ? project.name[0].toUpperCase() : '?');

  String _subtitle(Project project) =>
      project.client?.shortAddress ?? project.fullAddress;

  // List card

  Widget _buildProjectListCard(BuildContext context, Project project) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final statusColor = _getStatusColor(project.status);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sub = _subtitle(project);

    return Material(
      color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.goToProjectDetail(project.id),
        borderRadius: AppRadius.borderRadiusLg,
        child: Stack(
          children: [
            Container(
              padding: const EdgeInsets.only(left: 20, right: 16, top: 16, bottom: 16),
              decoration: BoxDecoration(
                borderRadius: AppRadius.borderRadiusLg,
                border: Border.all(
                  color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
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
                            _initials(project),
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
                          children: [
                            Text(
                              _displayName(project),
                              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (sub.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Row(
                                children: [
                                  Icon(Icons.location_on_outlined, size: 14, color: cs.onSurfaceVariant),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      sub,
                                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Meta
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: statusColor.withAlpha(isDark ? 35 : 20),
                              borderRadius: AppRadius.borderRadiusSm,
                              border: Border.all(
                                color: statusColor.withAlpha(isDark ? 50 : 30),
                              ),
                            ),
                            child: Text(
                              project.status.displayName,
                              style: tt.labelSmall?.copyWith(
                                color: statusColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            project.createdAt.relativeTime,
                            style: tt.bodySmall?.copyWith(
                              color: cs.onSurfaceVariant.withAlpha(140),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.chevron_right_rounded, color: cs.onSurfaceVariant.withAlpha(100), size: 24),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: AppRadius.borderRadiusXs,
                          child: LinearProgressIndicator(
                            value: project.progressPercentage,
                            minHeight: 3,
                            backgroundColor: isDark
                                ? Colors.white.withAlpha(12)
                                : cs.outlineVariant.withAlpha(30),
                            valueColor: AlwaysStoppedAnimation(statusColor),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${(project.progressPercentage * 100).toInt()}%',
                        style: tt.labelSmall?.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              child: Container(
                width: 4,
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Grid card

  Widget _buildProjectGridCard(BuildContext context, Project project) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final statusColor = _getStatusColor(project.status);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sub = _subtitle(project);

    return Material(
      color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.goToProjectDetail(project.id),
        borderRadius: AppRadius.borderRadiusLg,
        child: Stack(
          children: [
            Container(
              padding: const EdgeInsets.only(left: 24, right: 20, top: 20, bottom: 20),
              decoration: BoxDecoration(
                borderRadius: AppRadius.borderRadiusLg,
                border: Border.all(
                  color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(40),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: statusColor.withAlpha(isDark ? 40 : 25),
                          borderRadius: AppRadius.borderRadiusMd,
                        ),
                        child: Center(
                          child: Text(
                            _initials(project),
                            style: tt.titleSmall?.copyWith(
                              color: statusColor,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: statusColor.withAlpha(isDark ? 35 : 20),
                          borderRadius: AppRadius.borderRadiusSm,
                          border: Border.all(
                            color: statusColor.withAlpha(isDark ? 50 : 30),
                          ),
                        ),
                        child: Text(
                          project.status.displayName,
                          style: tt.labelSmall?.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    _displayName(project),
                    style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (sub.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      sub,
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const Spacer(),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: AppRadius.borderRadiusXs,
                          child: LinearProgressIndicator(
                            value: project.progressPercentage,
                            minHeight: 4,
                            backgroundColor: isDark
                                ? Colors.white.withAlpha(12)
                                : cs.outlineVariant.withAlpha(30),
                            valueColor: AlwaysStoppedAnimation(statusColor),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${(project.progressPercentage * 100).toInt()}%',
                        style: tt.labelSmall?.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (project.surface != null) ...[
                        Icon(Icons.square_foot_rounded, size: 14, color: cs.onSurfaceVariant.withAlpha(160)),
                        const SizedBox(width: 4),
                        Text(
                          '${project.surface!.toStringAsFixed(0)} m\u00B2',
                          style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant.withAlpha(160)),
                        ),
                        const SizedBox(width: 12),
                      ],
                      if (project.roomCount != null && project.roomCount! > 0) ...[
                        Icon(Icons.meeting_room_outlined, size: 14, color: cs.onSurfaceVariant.withAlpha(160)),
                        const SizedBox(width: 4),
                        Text(
                          '${project.roomCount} piece${project.roomCount! > 1 ? 's' : ''}',
                          style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant.withAlpha(160)),
                        ),
                      ],
                      const Spacer(),
                      Text(
                        project.createdAt.relativeTime,
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant.withAlpha(120)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              child: Container(
                width: 4,
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
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

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final ColorScheme cs;
  final bool isPrimary;
  final String tooltip;

  const _ActionButton({
    required this.icon,
    required this.onTap,
    required this.cs,
    this.isPrimary = false,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton.filled(
      onPressed: onTap,
      icon: Icon(icon, size: 20),
      tooltip: tooltip,
      style: IconButton.styleFrom(
        backgroundColor: isPrimary ? cs.primary : cs.surfaceContainerHighest,
        foregroundColor: isPrimary ? cs.onPrimary : cs.onSurface,
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _StatusChip({
    required this.label,
    required this.isSelected,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: isSelected
          ? color.withAlpha(isDark ? 50 : 25)
          : Colors.transparent,
      borderRadius: AppRadius.borderRadiusSm,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusSm,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderRadiusSm,
            border: Border.all(
              color: isSelected
                  ? color.withAlpha(isDark ? 100 : 60)
                  : (isDark ? Colors.white.withAlpha(20) : cs.outlineVariant.withAlpha(40)),
            ),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: isSelected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
