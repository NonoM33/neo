import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/project.dart';
import '../../../routes/app_router.dart';
import '../../blocs/projects/projects_bloc.dart';
import '../../blocs/projects/projects_event.dart';
import '../../blocs/projects/projects_state.dart';

/// Project detail screen
class ProjectDetailScreen extends ConsumerStatefulWidget {
  final String projectId;

  const ProjectDetailScreen({
    super.key,
    required this.projectId,
  });

  @override
  ConsumerState<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    ref.read(projectsBlocProvider).add(ProjectLoadRequested(widget.projectId));
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final projectsBloc = ref.watch(projectsBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: BlocBuilder<ProjectsBloc, ProjectsState>(
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
                      projectsBloc.add(ProjectLoadRequested(widget.projectId));
                    },
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is ProjectDetailLoaded) {
            return _buildProjectDetail(context, state.project);
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildProjectDetail(BuildContext context, Project project) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) {
        return [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            floating: false,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                project.client.fullName,
                style: const TextStyle(fontSize: 16),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      colorScheme.primary,
                      colorScheme.primaryContainer,
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          children: [
                            Chip(
                              label: Text(
                                project.status.displayName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                ),
                              ),
                              backgroundColor:
                                  _getStatusColor(project.status).withAlpha(200),
                            ),
                            AppSpacing.hGapSm,
                            Chip(
                              label: Text(
                                project.housingType.displayName,
                                style: TextStyle(
                                  color: colorScheme.onPrimary,
                                  fontSize: 12,
                                ),
                              ),
                              backgroundColor: Colors.white24,
                            ),
                          ],
                        ),
                        AppSpacing.vGapLg,
                      ],
                    ),
                  ),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () => context.goToProjectEdit(project.id),
              ),
              PopupMenuButton<String>(
                onSelected: (value) {
                  // Handle menu actions
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'status',
                    child: ListTile(
                      leading: Icon(Icons.flag),
                      title: Text('Changer le statut'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'duplicate',
                    child: ListTile(
                      leading: Icon(Icons.copy),
                      title: Text('Dupliquer'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      leading: Icon(Icons.delete, color: Colors.red),
                      title: Text('Supprimer', style: TextStyle(color: Colors.red)),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              tabs: const [
                Tab(text: 'Infos'),
                Tab(text: 'Pièces'),
                Tab(text: 'Produits'),
                Tab(text: 'Devis'),
              ],
            ),
          ),
        ];
      },
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildInfoTab(context, project),
          _buildRoomsTab(context, project),
          _buildProductsTab(context, project),
          _buildQuoteTab(context, project),
        ],
      ),
    );
  }

  Widget _buildInfoTab(BuildContext context, Project project) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Client info card
          Card(
            child: Padding(
              padding: AppSpacing.cardPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Client', style: textTheme.titleMedium),
                  AppSpacing.vGapMd,
                  _buildInfoRow(Icons.person, project.client.fullName),
                  _buildInfoRow(Icons.email, project.client.email),
                  _buildInfoRow(Icons.phone, project.client.phone),
                  _buildInfoRow(Icons.location_on, project.client.address.fullAddress),
                ],
              ),
            ),
          ),
          AppSpacing.vGapMd,

          // Project info card
          Card(
            child: Padding(
              padding: AppSpacing.cardPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Projet', style: textTheme.titleMedium),
                  AppSpacing.vGapMd,
                  _buildInfoRow(Icons.home, project.housingType.displayName),
                  if (project.surfaceM2 != null)
                    _buildInfoRow(Icons.square_foot, '${project.surfaceM2} m²'),
                  _buildInfoRow(Icons.calendar_today, 'Créé le ${project.createdAt.formatted}'),
                  if (project.appointmentDate != null)
                    _buildInfoRow(Icons.event, 'RDV: ${project.appointmentDate!.smartFormat}'),
                ],
              ),
            ),
          ),
          AppSpacing.vGapMd,

          // Notes
          if (project.notes != null && project.notes!.isNotEmpty)
            Card(
              child: Padding(
                padding: AppSpacing.cardPadding,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Notes', style: textTheme.titleMedium),
                    AppSpacing.vGapMd,
                    Text(project.notes!),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          AppSpacing.hGapMd,
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  Widget _buildRoomsTab(BuildContext context, Project project) {
    if (project.rooms.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.meeting_room,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            AppSpacing.vGapMd,
            const Text('Aucune pièce'),
            AppSpacing.vGapMd,
            FilledButton.icon(
              onPressed: () => context.goToAudit(project.id),
              icon: const Icon(Icons.add),
              label: const Text('Commencer l\'audit'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: AppSpacing.pagePadding,
      itemCount: project.rooms.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: FilledButton.icon(
              onPressed: () => context.goToAudit(project.id),
              icon: const Icon(Icons.edit),
              label: const Text('Modifier l\'audit'),
            ),
          );
        }

        final room = project.rooms[index - 1];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Icon(
                Icons.meeting_room,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            title: Text(room.displayName),
            subtitle: Text('${room.checkedItemsCount}/${room.checklist.length} éléments'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (room.photos.isNotEmpty)
                  Badge(
                    label: Text('${room.photoCount}'),
                    child: const Icon(Icons.photo_library),
                  ),
                AppSpacing.hGapSm,
                const Icon(Icons.chevron_right),
              ],
            ),
            onTap: () => context.goToAudit(project.id),
          ),
        );
      },
    );
  }

  Widget _buildProductsTab(BuildContext context, Project project) {
    if (project.selectedProductIds.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inventory_2,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            AppSpacing.vGapMd,
            const Text('Aucun produit sélectionné'),
            AppSpacing.vGapMd,
            FilledButton.icon(
              onPressed: () => context.goToCatalogue(),
              icon: const Icon(Icons.add),
              label: const Text('Parcourir le catalogue'),
            ),
          ],
        ),
      );
    }

    return Center(
      child: Text('${project.selectedProductIds.length} produits sélectionnés'),
    );
  }

  Widget _buildQuoteTab(BuildContext context, Project project) {
    if (project.quote == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            AppSpacing.vGapMd,
            const Text('Aucun devis'),
            AppSpacing.vGapMd,
            FilledButton.icon(
              onPressed: () => context.goToQuote(project.id),
              icon: const Icon(Icons.add),
              label: const Text('Créer un devis'),
            ),
          ],
        ),
      );
    }

    final quote = project.quote!;
    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: AppSpacing.cardPadding,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Devis ${quote.number}'),
                      Chip(label: Text(quote.status.displayName)),
                    ],
                  ),
                  AppSpacing.vGapMd,
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total TTC'),
                      Text(
                        quote.totalTTC.asCurrency,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          AppSpacing.vGapMd,
          FilledButton(
            onPressed: () => context.goToQuote(project.id),
            child: const Text('Voir le devis'),
          ),
        ],
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
