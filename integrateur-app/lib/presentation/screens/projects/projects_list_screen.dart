import 'package:flutter/material.dart';
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

/// Projects list screen
class ProjectsListScreen extends ConsumerStatefulWidget {
  const ProjectsListScreen({super.key});

  @override
  ConsumerState<ProjectsListScreen> createState() => _ProjectsListScreenState();
}

class _ProjectsListScreenState extends ConsumerState<ProjectsListScreen> {
  final _searchController = TextEditingController();
  ProjectStatus? _selectedStatus;

  @override
  void initState() {
    super.initState();
    ref.read(projectsBlocProvider).add(const ProjectsLoadRequested());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final projectsBloc = ref.watch(projectsBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Projets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              projectsBloc.add(const ProjectsRefreshRequested());
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.goToProjectCreate(),
        icon: const Icon(Icons.add),
        label: const Text('Nouveau'),
      ),
      body: Column(
        children: [
          // Search and filters
          _buildSearchBar(context, projectsBloc),

          // Status filter chips
          _buildStatusFilters(context, projectsBloc),

          // Projects list
          Expanded(
            child: BlocBuilder<ProjectsBloc, ProjectsState>(
              bloc: projectsBloc,
              builder: (context, state) {
                if (state is ProjectsLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is ProjectsError) {
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
                            projectsBloc.add(const ProjectsLoadRequested());
                          },
                          child: const Text('Réessayer'),
                        ),
                      ],
                    ),
                  );
                }

                if (state is ProjectsLoaded) {
                  if (state.projects.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.folder_open,
                            size: 64,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          AppSpacing.vGapMd,
                          Text(
                            'Aucun projet',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          AppSpacing.vGapXs,
                          Text(
                            'Créez votre premier projet',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                          ),
                          AppSpacing.vGapLg,
                          FilledButton.icon(
                            onPressed: () => context.goToProjectCreate(),
                            icon: const Icon(Icons.add),
                            label: const Text('Nouveau projet'),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      projectsBloc.add(const ProjectsRefreshRequested());
                    },
                    child: _buildProjectsList(context, state.projects),
                  );
                }

                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context, ProjectsBloc bloc) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Rechercher un projet...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    bloc.add(const ProjectsFilterCleared());
                  },
                )
              : null,
        ),
        onChanged: (value) {
          if (value.isEmpty) {
            bloc.add(const ProjectsFilterCleared());
          } else {
            bloc.add(ProjectsFilterChanged(
              ProjectFilter(searchQuery: value, status: _selectedStatus),
            ));
          }
        },
      ),
    );
  }

  Widget _buildStatusFilters(BuildContext context, ProjectsBloc bloc) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          FilterChip(
            label: const Text('Tous'),
            selected: _selectedStatus == null,
            onSelected: (selected) {
              setState(() => _selectedStatus = null);
              bloc.add(const ProjectsFilterCleared());
            },
          ),
          AppSpacing.hGapSm,
          ...ProjectStatus.values.map((status) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(status.displayName),
                selected: _selectedStatus == status,
                selectedColor: _getStatusColor(status).withAlpha(50),
                onSelected: (selected) {
                  setState(() => _selectedStatus = selected ? status : null);
                  if (selected) {
                    bloc.add(ProjectsFilterChanged(
                      ProjectFilter(
                        searchQuery: _searchController.text.isNotEmpty
                            ? _searchController.text
                            : null,
                        status: status,
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

  Widget _buildProjectsList(BuildContext context, List<Project> projects) {
    final isTablet = MediaQuery.sizeOf(context).width >= 600;

    if (isTablet) {
      return GridView.builder(
        padding: AppSpacing.pagePadding,
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: MediaQuery.sizeOf(context).width >= 1200 ? 3 : 2,
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.5,
        ),
        itemCount: projects.length,
        itemBuilder: (context, index) {
          return _buildProjectCard(context, projects[index]);
        },
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(top: 16),
      itemCount: projects.length,
      itemBuilder: (context, index) {
        return _buildProjectListTile(context, projects[index]);
      },
    );
  }

  Widget _buildProjectCard(BuildContext context, Project project) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.goToProjectDetail(project.id),
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    backgroundColor: colorScheme.primaryContainer,
                    child: Text(
                      project.client.initials,
                      style: TextStyle(color: colorScheme.primary),
                    ),
                  ),
                  Chip(
                    label: Text(
                      project.status.displayName,
                      style: const TextStyle(fontSize: 11),
                    ),
                    backgroundColor: _getStatusColor(project.status).withAlpha(30),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
              AppSpacing.vGapMd,
              Text(
                project.client.fullName,
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              AppSpacing.vGapXs,
              Text(
                project.client.address.shortAddress,
                style: textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  Icon(
                    Icons.meeting_room,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  AppSpacing.hGapXs,
                  Text(
                    '${project.roomCount} pièces',
                    style: textTheme.bodySmall,
                  ),
                  AppSpacing.hGapMd,
                  Icon(
                    Icons.calendar_today,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  AppSpacing.hGapXs,
                  Text(
                    project.createdAt.formatted,
                    style: textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProjectListTile(BuildContext context, Project project) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(project.status).withAlpha(30),
          child: Text(
            project.client.initials,
            style: TextStyle(color: _getStatusColor(project.status)),
          ),
        ),
        title: Text(project.client.fullName),
        subtitle: Text(project.client.address.shortAddress),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Chip(
              label: Text(
                project.status.displayName,
                style: const TextStyle(fontSize: 10),
              ),
              backgroundColor: _getStatusColor(project.status).withAlpha(30),
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
            ),
            Text(
              project.createdAt.relativeTime,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
        onTap: () => context.goToProjectDetail(project.id),
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
