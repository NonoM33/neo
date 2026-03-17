import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

class ProjectDetailScreen extends ConsumerStatefulWidget {
  final String projectId;

  const ProjectDetailScreen({
    super.key,
    required this.projectId,
  });

  @override
  ConsumerState<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final projectsBloc = ref.watch(projectDetailBlocProvider(widget.projectId));
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: BlocBuilder<ProjectsBloc, ProjectsState>(
        bloc: projectsBloc,
        builder: (context, state) {
          if (state is ProjectsLoading || state is ProjectsInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ProjectsError) {
            return _buildError(context, state, projectsBloc);
          }

          if (state is ProjectDetailLoaded) {
            return _buildDetail(context, state.project);
          }

          return const SizedBox.shrink();
        },
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
            padding: AppSpacing.cardPadding,
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
            onPressed: () => bloc.add(ProjectLoadRequested(widget.projectId)),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Recharger'),
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

  // Main layout

  Widget _buildDetail(BuildContext context, Project project) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statusColor = _getStatusColor(project.status);
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return CustomScrollView(
      slivers: [
        // Header
        SliverToBoxAdapter(
          child: _buildHeader(context, project, statusColor, isDark),
        ),

        // Content
        SliverPadding(
          padding: AppSpacing.pagePadding,
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              if (isWide)
                _buildWideContent(context, project, cs, isDark)
              else
                _buildNarrowContent(context, project, cs, isDark),

              // Quick actions
              const SizedBox(height: 24),
              _buildActions(context, project),

              const SizedBox(height: 32),
            ]),
          ),
        ),
      ],
    );
  }

  /// Wide: 2-column layout for info cards
  Widget _buildWideContent(BuildContext context, Project project, ColorScheme cs, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left column
        Expanded(
          child: Column(
            children: [
              if (project.client != null)
                _SectionCard(
                  isDark: isDark,
                  cs: cs,
                  title: 'Client',
                  icon: Icons.person_outline_rounded,
                  children: [
                    _InfoRow(icon: Icons.person_rounded, label: 'Nom', value: project.client!.fullName, cs: cs),
                    if (project.client!.email != null)
                      _InfoRow(icon: Icons.email_outlined, label: 'Email', value: project.client!.email!, cs: cs),
                    if (project.client!.phone != null)
                      _InfoRow(icon: Icons.phone_outlined, label: 'Tel', value: project.client!.phone!, cs: cs),
                    if (project.client!.fullAddress.isNotEmpty)
                      _InfoRow(icon: Icons.location_on_outlined, label: 'Adresse', value: project.client!.fullAddress, cs: cs),
                  ],
                ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        // Right column
        Expanded(
          child: Column(
            children: [
              _SectionCard(
                isDark: isDark,
                cs: cs,
                title: 'Projet',
                icon: Icons.home_outlined,
                children: [
                  _InfoRow(icon: Icons.label_outline_rounded, label: 'Nom', value: project.name, cs: cs),
                  if (project.surface != null)
                    _InfoRow(icon: Icons.square_foot_rounded, label: 'Surface', value: '${project.surface!.toStringAsFixed(0)} m\u00B2', cs: cs),
                  if (project.roomCount != null && project.roomCount! > 0)
                    _InfoRow(icon: Icons.meeting_room_outlined, label: 'Pieces', value: '${project.roomCount}', cs: cs),
                  _InfoRow(icon: Icons.calendar_today_rounded, label: 'Cree le', value: project.createdAt.formatted, cs: cs),
                  if (project.fullAddress.isNotEmpty && project.client == null)
                    _InfoRow(icon: Icons.location_on_outlined, label: 'Adresse', value: project.fullAddress, cs: cs),
                ],
              ),
              if (project.description != null && project.description!.isNotEmpty) ...[
                const SizedBox(height: 16),
                _SectionCard(
                  isDark: isDark,
                  cs: cs,
                  title: 'Description',
                  icon: Icons.notes_rounded,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        project.description!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: cs.onSurface.withAlpha(200),
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// Narrow: single column
  Widget _buildNarrowContent(BuildContext context, Project project, ColorScheme cs, bool isDark) {
    return Column(
      children: [
        if (project.client != null)
          _SectionCard(
            isDark: isDark,
            cs: cs,
            title: 'Client',
            icon: Icons.person_outline_rounded,
            children: [
              _InfoRow(icon: Icons.person_rounded, label: 'Nom', value: project.client!.fullName, cs: cs),
              if (project.client!.email != null)
                _InfoRow(icon: Icons.email_outlined, label: 'Email', value: project.client!.email!, cs: cs),
              if (project.client!.phone != null)
                _InfoRow(icon: Icons.phone_outlined, label: 'Tel', value: project.client!.phone!, cs: cs),
              if (project.client!.fullAddress.isNotEmpty)
                _InfoRow(icon: Icons.location_on_outlined, label: 'Adresse', value: project.client!.fullAddress, cs: cs),
            ],
          ),

        if (project.client != null) const SizedBox(height: 16),

        _SectionCard(
          isDark: isDark,
          cs: cs,
          title: 'Projet',
          icon: Icons.home_outlined,
          children: [
            _InfoRow(icon: Icons.label_outline_rounded, label: 'Nom', value: project.name, cs: cs),
            if (project.surface != null)
              _InfoRow(icon: Icons.square_foot_rounded, label: 'Surface', value: '${project.surface!.toStringAsFixed(0)} m\u00B2', cs: cs),
            if (project.roomCount != null && project.roomCount! > 0)
              _InfoRow(icon: Icons.meeting_room_outlined, label: 'Pieces', value: '${project.roomCount}', cs: cs),
            _InfoRow(icon: Icons.calendar_today_rounded, label: 'Cree le', value: project.createdAt.formatted, cs: cs),
            if (project.fullAddress.isNotEmpty && project.client == null)
              _InfoRow(icon: Icons.location_on_outlined, label: 'Adresse', value: project.fullAddress, cs: cs),
          ],
        ),

        if (project.description != null && project.description!.isNotEmpty) ...[
          const SizedBox(height: 16),
          _SectionCard(
            isDark: isDark,
            cs: cs,
            title: 'Description',
            icon: Icons.notes_rounded,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  project.description!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: cs.onSurface.withAlpha(200),
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  // Header

  Widget _buildHeader(BuildContext context, Project project, Color statusColor, bool isDark) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Container(
      padding: EdgeInsets.fromLTRB(32, MediaQuery.of(context).padding.top + 12, 32, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [cs.surfaceContainerHigh, cs.surfaceContainerLow]
              : [cs.surfaceContainerHighest, cs.surface],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: back + actions
          Row(
            children: [
              IconButton(
                onPressed: () => Navigator.of(context).canPop()
                    ? Navigator.of(context).pop()
                    : context.goToProjects(),
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: 'Retour',
                style: IconButton.styleFrom(
                  backgroundColor: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(30),
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: () => context.goToProjectEdit(project.id),
                icon: const Icon(Icons.edit_outlined, size: 20),
                tooltip: 'Modifier le projet',
                style: IconButton.styleFrom(
                  backgroundColor: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(30),
                ),
              ),
              const SizedBox(width: 8),
              _buildMoreMenu(context, project),
            ],
          ),
          const SizedBox(height: 20),

          // Client / project info
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(isDark ? 45 : 30),
                  borderRadius: AppRadius.borderRadiusLg,
                ),
                child: Center(
                  child: Text(
                    _initials(project),
                    style: tt.titleLarge?.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _displayName(project),
                      style: tt.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                    if (_subtitle(project).isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined, size: 16, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _subtitle(project),
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
            ],
          ),
          const SizedBox(height: 16),

          // Badges row
          Row(
            children: [
              _Badge(
                label: project.status.displayName,
                color: statusColor,
                isDark: isDark,
              ),
              if (project.surface != null) ...[
                const SizedBox(width: 8),
                _Badge(
                  label: '${project.surface!.toStringAsFixed(0)} m\u00B2',
                  color: cs.onSurfaceVariant,
                  isDark: isDark,
                  isOutline: true,
                ),
              ],
              if (project.roomCount != null && project.roomCount! > 0) ...[
                const SizedBox(width: 8),
                _Badge(
                  label: '${project.roomCount} piece${project.roomCount! > 1 ? 's' : ''}',
                  color: cs.onSurfaceVariant,
                  isDark: isDark,
                  isOutline: true,
                ),
              ],
            ],
          ),

          // Progress bar
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: AppRadius.borderRadiusXs,
                  child: LinearProgressIndicator(
                    value: project.progressPercentage,
                    minHeight: 6,
                    backgroundColor: isDark ? Colors.white.withAlpha(15) : cs.outlineVariant.withAlpha(30),
                    valueColor: AlwaysStoppedAnimation(statusColor),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '${(project.progressPercentage * 100).toInt()}%',
                style: tt.labelSmall?.copyWith(
                  color: statusColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMoreMenu(BuildContext context, Project project) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert_rounded, color: cs.onSurface),
      tooltip: 'Plus d\'options',
      style: IconButton.styleFrom(
        backgroundColor: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(30),
      ),
      shape: RoundedRectangleBorder(borderRadius: AppRadius.borderRadiusLg),
      onSelected: (value) {
        // Handle menu actions
      },
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: 'status',
          child: Row(
            children: [
              Icon(Icons.flag_rounded, size: 20),
              SizedBox(width: 12),
              Text('Changer le statut'),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem(
          value: 'delete',
          child: Row(
            children: [
              Icon(Icons.delete_outline_rounded, size: 20, color: cs.error),
              const SizedBox(width: 12),
              Text('Supprimer', style: TextStyle(color: cs.error)),
            ],
          ),
        ),
      ],
    );
  }

  // Actions

  Widget _buildActions(BuildContext context, Project project) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Actions',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: cs.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _ActionCard(
                icon: Icons.search_rounded,
                label: 'Audit',
                onTap: () {
                  HapticFeedback.lightImpact();
                  context.goToAudit(project.id);
                },
                cs: cs,
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ActionCard(
                icon: Icons.receipt_long_rounded,
                label: 'Devis',
                onTap: () {
                  HapticFeedback.lightImpact();
                  context.goToQuote(project.id);
                },
                cs: cs,
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ActionCard(
                icon: Icons.inventory_2_rounded,
                label: 'Catalogue',
                onTap: () => context.goToCatalogue(),
                cs: cs,
                isDark: isDark,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// Section Card

class _SectionCard extends StatelessWidget {
  final bool isDark;
  final ColorScheme cs;
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _SectionCard({
    required this.isDark,
    required this.cs,
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
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
              Icon(icon, size: 20, color: cs.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: cs.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

// Info Row

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final ColorScheme cs;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: cs.onSurfaceVariant.withAlpha(160)),
          const SizedBox(width: 12),
          SizedBox(
            width: 70,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: cs.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Badge

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final bool isDark;
  final bool isOutline;

  const _Badge({
    required this.label,
    required this.color,
    required this.isDark,
    this.isOutline = false,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isOutline ? Colors.transparent : color.withAlpha(isDark ? 35 : 20),
        borderRadius: AppRadius.borderRadiusSm,
        border: isOutline
            ? Border.all(
                color: isDark ? Colors.white.withAlpha(25) : cs.outlineVariant.withAlpha(40),
              )
            : null,
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// Action Card

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final ColorScheme cs;
  final bool isDark;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.cs,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusLg,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
          child: Column(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: cs.primary.withAlpha(isDark ? 30 : 20),
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Icon(icon, color: cs.primary, size: 24),
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
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
