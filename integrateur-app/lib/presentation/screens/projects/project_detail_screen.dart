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
import '../../../domain/entities/room.dart';
import '../../../routes/app_router.dart';
import '../../blocs/audit/audit_bloc.dart';
import '../../blocs/audit/audit_event.dart';
import '../../blocs/audit/audit_state.dart';
import '../../blocs/projects/projects_bloc.dart';
import '../../blocs/projects/projects_event.dart';
import '../../blocs/projects/projects_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

class ProjectDetailScreen extends ConsumerStatefulWidget {
  final String projectId;

  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  ConsumerState<ProjectDetailScreen> createState() =>
      _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen> {
  late final AuditBloc _roomsBloc;
  StreamSubscription<AuditState>? _auditBlocSub;
  List<String> _lastGlobalRoomIds = [];

  @override
  void initState() {
    super.initState();
    _roomsBloc = AuditBloc(
      projectRepository: ref.read(projectRepositoryProvider),
    );
    _roomsBloc.add(AuditLoadRoomsRequested(widget.projectId));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final globalBloc = ref.read(auditBlocProvider);
      _auditBlocSub = globalBloc.stream.listen(_onGlobalAuditChanged);
    });
  }

  @override
  void dispose() {
    _auditBlocSub?.cancel();
    _roomsBloc.close();
    super.dispose();
  }

  void _onGlobalAuditChanged(AuditState state) {
    if (!mounted) return;
    if (state is! AuditLoaded) return;
    if (state.projectId != widget.projectId) return;
    final newIds = (state.rooms.map((r) => r.id).toList()..sort());
    if (newIds.join(',') != _lastGlobalRoomIds.join(',')) {
      _lastGlobalRoomIds = newIds;
      _roomsBloc.add(AuditLoadRoomsRequested(widget.projectId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final projectsBloc =
        ref.watch(projectDetailBlocProvider(widget.projectId));
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
            return _buildLayout(context, state.project, projectsBloc);
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────

  Widget _buildError(
    BuildContext context,
    ProjectsError state,
    ProjectsBloc bloc,
  ) {
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
            child: Icon(Icons.cloud_off_rounded,
                size: 40, color: cs.onErrorContainer),
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

  // ─── Layout selector ──────────────────────────────────────────────────────

  Widget _buildLayout(
    BuildContext context,
    Project project,
    ProjectsBloc projectsBloc,
  ) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;
    return isWide
        ? _buildWideLayout(context, project, projectsBloc)
        : _buildNarrowLayout(context, project, projectsBloc);
  }

  // ─── Wide layout ──────────────────────────────────────────────────────────

  Widget _buildWideLayout(
    BuildContext context,
    Project project,
    ProjectsBloc projectsBloc,
  ) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        SizedBox(
          width: 320,
          child: _LeftPanel(
            project: project,
            projectsBloc: projectsBloc,
            isDark: isDark,
            cs: cs,
            projectId: widget.projectId,
          ),
        ),
        VerticalDivider(
          width: 1,
          thickness: 1,
          color: isDark
              ? Colors.white.withAlpha(12)
              : cs.outlineVariant.withAlpha(40),
        ),
        Expanded(
          child: _RightPanel(
            project: project,
            roomsBloc: _roomsBloc,
            isDark: isDark,
            cs: cs,
            projectId: widget.projectId,
          ),
        ),
      ],
    );
  }

  // ─── Narrow layout ────────────────────────────────────────────────────────

  Widget _buildNarrowLayout(
    BuildContext context,
    Project project,
    ProjectsBloc projectsBloc,
  ) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statusColor = _statusColor(project.status);
    final tt = Theme.of(context).textTheme;
    final topPadding = MediaQuery.of(context).padding.top;

    return CustomScrollView(
      slivers: [
        // Compact header
        SliverToBoxAdapter(
          child: Container(
            padding: EdgeInsets.fromLTRB(20, topPadding + 8, 20, 20),
            decoration: BoxDecoration(
              color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerHighest,
              border: Border(
                bottom: BorderSide(
                  color: isDark
                      ? Colors.white.withAlpha(12)
                      : cs.outlineVariant.withAlpha(40),
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _circleButton(
                      context,
                      icon: Icons.arrow_back_rounded,
                      tooltip: 'Retour',
                      onTap: () => Navigator.of(context).canPop()
                          ? Navigator.of(context).pop()
                          : context.goToProjects(),
                      isDark: isDark,
                      cs: cs,
                    ),
                    const Spacer(),
                    _circleButton(
                      context,
                      icon: Icons.edit_outlined,
                      tooltip: 'Modifier',
                      onTap: () => context.goToProjectEdit(project.id),
                      isDark: isDark,
                      cs: cs,
                    ),
                    const SizedBox(width: 8),
                    _MoreMenuButton(
                        project: project,
                        projectsBloc: projectsBloc,
                        isDark: isDark,
                        cs: cs),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _ClientAvatar(
                        project: project, statusColor: statusColor, isDark: isDark),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _displayName(project),
                            style: tt.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (_subtitle(project).isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Icon(Icons.location_on_outlined,
                                    size: 13, color: cs.onSurfaceVariant),
                                const SizedBox(width: 3),
                                Expanded(
                                  child: Text(
                                    _subtitle(project),
                                    style: tt.bodySmall?.copyWith(
                                        color: cs.onSurfaceVariant),
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
                const SizedBox(height: 12),
                _ContactChips(project: project, cs: cs, isDark: isDark),
              ],
            ),
          ),
        ),

        SliverPadding(
          padding: const EdgeInsets.all(20),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _PipelineStepper(
                  project: project, isDark: isDark, cs: cs, compact: true),
              const SizedBox(height: 16),
              _PrimaryCtaCard(
                  project: project, isDark: isDark, cs: cs, context: context),
              const SizedBox(height: 24),
              _RoomsSection(
                project: project,
                roomsBloc: _roomsBloc,
                isDark: isDark,
                cs: cs,
                projectId: widget.projectId,
                narrow: true,
              ),
              if (project.description != null &&
                  project.description!.isNotEmpty) ...[
                const SizedBox(height: 20),
                _DescriptionCard(
                    description: project.description!,
                    isDark: isDark,
                    cs: cs),
              ],
              const SizedBox(height: 32),
            ]),
          ),
        ),
      ],
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  String _displayName(Project project) =>
      project.client?.fullName ?? project.name;

  String _subtitle(Project project) =>
      project.client?.shortAddress ?? project.fullAddress;

  Color _statusColor(ProjectStatus status) => switch (status) {
        ProjectStatus.brouillon => AppTheme.statusBrouillon,
        ProjectStatus.enCours => AppTheme.statusEnCours,
        ProjectStatus.termine => AppTheme.statusTermine,
        ProjectStatus.archive => AppTheme.statusArchive,
      };

  Widget _circleButton(
    BuildContext context, {
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    required bool isDark,
    required ColorScheme cs,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withAlpha(12) : cs.outlineVariant.withAlpha(30),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: cs.onSurface),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Left Panel (wide layout)
// ─────────────────────────────────────────────────────────────────────────────

class _LeftPanel extends StatelessWidget {
  final Project project;
  final ProjectsBloc projectsBloc;
  final bool isDark;
  final ColorScheme cs;
  final String projectId;

  const _LeftPanel({
    required this.project,
    required this.projectsBloc,
    required this.isDark,
    required this.cs,
    required this.projectId,
  });

  Color get _statusColor => switch (project.status) {
        ProjectStatus.brouillon => AppTheme.statusBrouillon,
        ProjectStatus.enCours => AppTheme.statusEnCours,
        ProjectStatus.termine => AppTheme.statusTermine,
        ProjectStatus.archive => AppTheme.statusArchive,
      };

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final topPadding = MediaQuery.of(context).padding.top;

    return Container(
      color: isDark ? const Color(0xFF151B23) : cs.surfaceContainerLowest,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(20, topPadding + 12, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top bar
                  Row(
                    children: [
                      _circleButton(
                        context,
                        icon: Icons.arrow_back_rounded,
                        tooltip: 'Retour',
                        onTap: () => Navigator.of(context).canPop()
                            ? Navigator.of(context).pop()
                            : context.goToProjects(),
                      ),
                      const Spacer(),
                      _circleButton(
                        context,
                        icon: Icons.edit_outlined,
                        tooltip: 'Modifier le projet',
                        onTap: () => context.goToProjectEdit(project.id),
                      ),
                      const SizedBox(width: 8),
                      _MoreMenuButton(
                          project: project,
                          projectsBloc: projectsBloc,
                          isDark: isDark,
                          cs: cs),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Client hero
                  Center(
                    child: _ClientAvatar(
                        project: project,
                        statusColor: _statusColor,
                        isDark: isDark,
                        size: 72),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: Text(
                      project.client?.fullName ?? project.name,
                      style: tt.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  if (_addressLine.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.location_on_outlined,
                              size: 13, color: cs.onSurfaceVariant),
                          const SizedBox(width: 3),
                          Flexible(
                            child: Text(
                              _addressLine,
                              style: tt.bodySmall
                                  ?.copyWith(color: cs.onSurfaceVariant),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // Contact chips
                  _ContactChips(project: project, cs: cs, isDark: isDark),
                  const SizedBox(height: 20),

                  Divider(
                      color: isDark
                          ? Colors.white.withAlpha(12)
                          : cs.outlineVariant.withAlpha(40)),
                  const SizedBox(height: 16),

                  // Project info
                  Text(
                    'Projet',
                    style: tt.labelSmall?.copyWith(
                      color: cs.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.label_outline_rounded,
                    label: 'Nom',
                    value: project.name,
                    cs: cs,
                  ),
                  if (project.surface != null)
                    _InfoRow(
                      icon: Icons.square_foot_rounded,
                      label: 'Surface',
                      value:
                          '${project.surface!.toStringAsFixed(0)} m\u00B2',
                      cs: cs,
                    ),
                  if (project.roomCount != null && project.roomCount! > 0)
                    _InfoRow(
                      icon: Icons.meeting_room_outlined,
                      label: 'Pièces',
                      value:
                          '${project.roomCount} pièce${project.roomCount! > 1 ? 's' : ''}',
                      cs: cs,
                    ),
                  _InfoRow(
                    icon: Icons.calendar_today_rounded,
                    label: 'Créé le',
                    value: project.createdAt.formatted,
                    cs: cs,
                  ),
                  if (project.fullAddress.isNotEmpty && project.client == null)
                    _InfoRow(
                      icon: Icons.location_on_outlined,
                      label: 'Adresse',
                      value: project.fullAddress,
                      cs: cs,
                    ),
                  const SizedBox(height: 16),

                  // Status badge
                  _StatusBadge(
                      project: project,
                      projectsBloc: projectsBloc,
                      isDark: isDark,
                      cs: cs),
                  const SizedBox(height: 16),

                  // Progress bar
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: AppRadius.borderRadiusXs,
                          child: LinearProgressIndicator(
                            value: project.progressPercentage,
                            minHeight: 6,
                            backgroundColor: isDark
                                ? Colors.white.withAlpha(15)
                                : cs.outlineVariant.withAlpha(30),
                            valueColor:
                                AlwaysStoppedAnimation(_statusColor),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        '${(project.progressPercentage * 100).toInt()}%',
                        style: tt.labelSmall?.copyWith(
                          color: _statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  Divider(
                      color: isDark
                          ? Colors.white.withAlpha(12)
                          : cs.outlineVariant.withAlpha(40)),
                  const SizedBox(height: 16),

                  // Secondary actions
                  Text(
                    'Actions rapides',
                    style: tt.labelSmall?.copyWith(
                      color: cs.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _SecondaryAction(
                    icon: Icons.receipt_long_rounded,
                    label: 'Devis',
                    subtitle: 'Créer ou consulter',
                    onTap: () {
                      HapticFeedback.lightImpact();
                      context.goToQuote(project.id);
                    },
                    isDark: isDark,
                    cs: cs,
                  ),
                  const SizedBox(height: 8),
                  _SecondaryAction(
                    icon: Icons.inventory_2_rounded,
                    label: 'Catalogue',
                    subtitle: 'Produits & équipements',
                    onTap: () {
                      HapticFeedback.lightImpact();
                      context.goToCatalogue();
                    },
                    isDark: isDark,
                    cs: cs,
                  ),
                  const SizedBox(height: 8),
                  _SecondaryAction(
                    icon: Icons.assignment_outlined,
                    label: 'Audit technique',
                    subtitle: 'Questionnaire sur site',
                    onTap: () {
                      HapticFeedback.lightImpact();
                      context.goToAudit(project.id);
                    },
                    isDark: isDark,
                    cs: cs,
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String get _addressLine =>
      project.client?.shortAddress ?? project.fullAddress;

  Widget _circleButton(
    BuildContext context, {
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withAlpha(12)
                : cs.outlineVariant.withAlpha(30),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: cs.onSurface),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Right Panel (wide layout)
// ─────────────────────────────────────────────────────────────────────────────

class _RightPanel extends StatelessWidget {
  final Project project;
  final AuditBloc roomsBloc;
  final bool isDark;
  final ColorScheme cs;
  final String projectId;

  const _RightPanel({
    required this.project,
    required this.roomsBloc,
    required this.isDark,
    required this.cs,
    required this.projectId,
  });

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding:
              EdgeInsets.fromLTRB(28, topPadding + 20, 28, 32),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _PipelineStepper(
                  project: project, isDark: isDark, cs: cs),
              const SizedBox(height: 20),
              _PrimaryCtaCard(
                  project: project,
                  isDark: isDark,
                  cs: cs,
                  context: context),
              const SizedBox(height: 28),
              _RoomsSection(
                project: project,
                roomsBloc: roomsBloc,
                isDark: isDark,
                cs: cs,
                projectId: projectId,
              ),
              if (project.description != null &&
                  project.description!.isNotEmpty) ...[
                const SizedBox(height: 20),
                _DescriptionCard(
                    description: project.description!,
                    isDark: isDark,
                    cs: cs),
              ],
            ]),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Stepper
// ─────────────────────────────────────────────────────────────────────────────

class _PipelineStepper extends StatelessWidget {
  final Project project;
  final bool isDark;
  final ColorScheme cs;
  final bool compact;

  static const _steps = [
    (icon: Icons.search_rounded, label: 'Audit'),
    (icon: Icons.receipt_long_rounded, label: 'Devis'),
    (icon: Icons.draw_rounded, label: 'Signature'),
    (icon: Icons.construction_rounded, label: 'Pose'),
    (icon: Icons.check_circle_outline_rounded, label: 'Livraison'),
  ];

  const _PipelineStepper({
    required this.project,
    required this.isDark,
    required this.cs,
    this.compact = false,
  });

  int get _currentStep => switch (project.status) {
        ProjectStatus.brouillon => 0,
        ProjectStatus.enCours => 1,
        ProjectStatus.termine => 4,
        ProjectStatus.archive => 4,
      };

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final currentStep = _currentStep;
    final isArchived = project.status == ProjectStatus.archive;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusLg,
        border: Border.all(
          color: isDark
              ? Colors.white.withAlpha(12)
              : cs.outlineVariant.withAlpha(40),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isArchived ? 'Projet archivé' : 'Avancement du projet',
            style: tt.labelSmall?.copyWith(
              color: cs.onSurfaceVariant,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: List.generate(_steps.length * 2 - 1, (i) {
              if (i.isOdd) {
                // Connector line
                final stepIndex = i ~/ 2;
                final isDone = stepIndex < currentStep;
                return Expanded(
                  child: Container(
                    height: 2,
                    color: isDone
                        ? AppTheme.statusEnCours
                        : (isDark
                            ? Colors.white.withAlpha(20)
                            : cs.outlineVariant.withAlpha(60)),
                  ),
                );
              }

              final stepIndex = i ~/ 2;
              final isDone = stepIndex < currentStep;
              final isCurrent = stepIndex == currentStep && !isArchived;
              final step = _steps[stepIndex];

              Color circleColor;
              Color iconColor;
              if (isArchived) {
                circleColor = AppTheme.statusArchive.withAlpha(30);
                iconColor = AppTheme.statusArchive;
              } else if (isDone) {
                circleColor = AppTheme.statusEnCours.withAlpha(isDark ? 40 : 25);
                iconColor = AppTheme.statusEnCours;
              } else if (isCurrent) {
                circleColor = cs.primary.withAlpha(isDark ? 50 : 30);
                iconColor = cs.primary;
              } else {
                circleColor = isDark
                    ? Colors.white.withAlpha(12)
                    : cs.outlineVariant.withAlpha(30);
                iconColor = cs.onSurfaceVariant.withAlpha(120);
              }

              final isTappable = stepIndex == 0 || stepIndex == 1;

              final stepColumn = Column(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: compact ? 36 : 40,
                        height: compact ? 36 : 40,
                        decoration: BoxDecoration(
                          color: circleColor,
                          shape: BoxShape.circle,
                          border: isCurrent
                              ? Border.all(
                                  color: cs.primary.withAlpha(100),
                                  width: 2,
                                )
                              : null,
                        ),
                        child: Icon(
                          isDone
                              ? Icons.check_rounded
                              : step.icon,
                          size: compact ? 16 : 18,
                          color: iconColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    step.label,
                    style: tt.labelSmall?.copyWith(
                      color: (isDone || isCurrent)
                          ? cs.onSurface
                          : cs.onSurfaceVariant.withAlpha(140),
                      fontWeight: (isCurrent)
                          ? FontWeight.w700
                          : FontWeight.w500,
                      fontSize: 10,
                    ),
                  ),
                ],
              );

              if (!isTappable) return stepColumn;

              return MouseRegion(
                cursor: SystemMouseCursors.click,
                child: GestureDetector(
                  onTap: () {
                    switch (stepIndex) {
                      case 0:
                        context.goToAudit(project.id);
                      case 1:
                        context.goToQuote(project.id);
                      default:
                        break;
                    }
                  },
                  child: stepColumn,
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary CTA Card
// ─────────────────────────────────────────────────────────────────────────────

class _PrimaryCtaCard extends StatelessWidget {
  final Project project;
  final bool isDark;
  final ColorScheme cs;
  final BuildContext context;

  const _PrimaryCtaCard({
    required this.project,
    required this.isDark,
    required this.cs,
    required this.context,
  });

  ({
    IconData icon,
    String label,
    String subtitle,
    VoidCallback? action,
    Color color,
  }) get _cta {
    switch (project.status) {
      case ProjectStatus.brouillon:
        return (
          icon: Icons.search_rounded,
          label: 'Démarrer l\'audit',
          subtitle: 'Aucun audit en cours — commencer l\'inspection',
          action: () {
            HapticFeedback.lightImpact();
            context.goToAudit(project.id);
          },
          color: cs.primary,
        );
      case ProjectStatus.enCours:
        return (
          icon: Icons.play_circle_rounded,
          label: 'Continuer l\'audit',
          subtitle: 'Audit en cours — reprendre l\'inspection',
          action: () {
            HapticFeedback.lightImpact();
            context.goToAudit(project.id);
          },
          color: AppTheme.statusEnCours,
        );
      case ProjectStatus.termine:
        return (
          icon: Icons.receipt_long_rounded,
          label: 'Voir le devis',
          subtitle: 'Projet terminé — consulter le devis',
          action: () {
            HapticFeedback.lightImpact();
            context.goToQuote(project.id);
          },
          color: AppTheme.statusTermine,
        );
      case ProjectStatus.archive:
        return (
          icon: Icons.archive_rounded,
          label: 'Projet archivé',
          subtitle: 'Ce projet est archivé et en lecture seule',
          action: null,
          color: AppTheme.statusArchive,
        );
    }
  }

  @override
  Widget build(BuildContext buildContext) {
    final cta = _cta;
    final tt = Theme.of(buildContext).textTheme;
    final isDisabled = cta.action == null;
    final showDevisCard = project.status == ProjectStatus.brouillon ||
        project.status == ProjectStatus.enCours;

    final primaryCard = Material(
      color: isDisabled
          ? (isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest)
          : cta.color.withAlpha(isDark ? 25 : 15),
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: cta.action,
        borderRadius: AppRadius.borderRadiusLg,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderRadiusLg,
            border: Border.all(
              color: isDisabled
                  ? (isDark
                      ? Colors.white.withAlpha(12)
                      : cs.outlineVariant.withAlpha(40))
                  : cta.color.withAlpha(60),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: cta.color.withAlpha(isDark ? 40 : 25),
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Icon(cta.icon,
                    color: isDisabled
                        ? cta.color.withAlpha(120)
                        : cta.color,
                    size: 26),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cta.label,
                      style: tt.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isDisabled
                            ? cs.onSurfaceVariant
                            : cs.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      cta.subtitle,
                      style: tt.bodySmall?.copyWith(
                          color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              if (!isDisabled) ...[
                const SizedBox(width: 12),
                Icon(Icons.arrow_forward_ios_rounded,
                    size: 16, color: cta.color),
              ],
            ],
          ),
        ),
      ),
    );

    if (!showDevisCard) return primaryCard;

    final devisCard = Material(
      color: cs.surfaceContainerLow,
      borderRadius: AppRadius.borderRadiusLg,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          context.goToQuote(project.id);
        },
        borderRadius: AppRadius.borderRadiusLg,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderRadiusLg,
            border: Border.all(
              color: cs.secondary.withAlpha(50),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: cs.secondary.withAlpha(isDark ? 35 : 20),
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Icon(Icons.receipt_long_rounded,
                    color: cs.secondary, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Créer le devis',
                      style: tt.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: cs.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Audit terminé — générer le devis',
                      style: tt.bodySmall?.copyWith(
                          color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 16, color: cs.secondary),
            ],
          ),
        ),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        primaryCard,
        const SizedBox(height: 8),
        devisCard,
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rooms Section
// ─────────────────────────────────────────────────────────────────────────────

class _RoomsSection extends StatelessWidget {
  final Project project;
  final AuditBloc roomsBloc;
  final bool isDark;
  final ColorScheme cs;
  final String projectId;
  final bool narrow;

  const _RoomsSection({
    required this.project,
    required this.roomsBloc,
    required this.isDark,
    required this.cs,
    required this.projectId,
    this.narrow = false,
  });

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;

    return BlocBuilder<AuditBloc, AuditState>(
      bloc: roomsBloc,
      builder: (context, state) {
        final rooms = state is AuditLoaded ? state.rooms : <Room>[];
        final isLoading = state is AuditLoading;
        final auditCompletion =
            state is AuditLoaded ? state.completionPercentage : 0.0;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section header
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pièces',
                      style: tt.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (!isLoading && rooms.isNotEmpty)
                      Text(
                        '${rooms.length} pièce${rooms.length > 1 ? 's' : ''} · ${(auditCompletion * 100).toInt()}% audité',
                        style: tt.bodySmall
                            ?.copyWith(color: cs.onSurfaceVariant),
                      ),
                  ],
                ),
                const Spacer(),
                FilledButton.tonalIcon(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    context.goToAudit(project.id);
                  },
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Gérer'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 44),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            if (isLoading)
              _buildSkeletonGrid()
            else if (rooms.isEmpty)
              _buildEmptyRooms(context)
            else
              _buildRoomsGrid(context, rooms),
          ],
        );
      },
    );
  }

  Widget _buildSkeletonGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.3,
      ),
      itemCount: 4,
      itemBuilder: (context, i) => Container(
        decoration: BoxDecoration(
          color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
          borderRadius: AppRadius.borderRadiusLg,
          border: Border.all(
            color: isDark
                ? Colors.white.withAlpha(12)
                : cs.outlineVariant.withAlpha(40),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyRooms(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusLg,
        border: Border.all(
          color: isDark
              ? Colors.white.withAlpha(12)
              : cs.outlineVariant.withAlpha(40),
        ),
      ),
      child: Column(
        children: [
          Icon(Icons.meeting_room_outlined,
              size: 48, color: cs.onSurfaceVariant.withAlpha(100)),
          const SizedBox(height: 12),
          Text(
            'Aucune pièce',
            style: tt.titleSmall
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'Démarrez l\'audit pour ajouter des pièces',
            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () {
              HapticFeedback.lightImpact();
              context.goToAudit(project.id);
            },
            icon: const Icon(Icons.search_rounded, size: 18),
            label: const Text('Démarrer l\'audit'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(120, 48),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoomsGrid(BuildContext context, List<Room> rooms) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = (constraints.maxWidth / 200).floor().clamp(2, 4);
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.2,
          ),
          itemCount: rooms.length,
          itemBuilder: (context, index) => _RoomCard(
            room: rooms[index],
            projectId: projectId,
            isDark: isDark,
            cs: cs,
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Card
// ─────────────────────────────────────────────────────────────────────────────

class _RoomCard extends StatelessWidget {
  final Room room;
  final String projectId;
  final bool isDark;
  final ColorScheme cs;

  const _RoomCard({
    required this.room,
    required this.projectId,
    required this.isDark,
    required this.cs,
  });

  Color _progressColor(double p) {
    if (p >= 0.8) return AppTheme.successColor;
    if (p >= 0.4) return AppTheme.statusEnCours;
    if (p > 0) return AppTheme.warningColor;
    return AppTheme.statusArchive;
  }

  IconData get _roomIcon => switch (room.type) {
        RoomType.salon => Icons.weekend_rounded,
        RoomType.cuisine => Icons.kitchen_rounded,
        RoomType.chambre => Icons.bed_rounded,
        RoomType.salleDeBain => Icons.bathtub_rounded,
        RoomType.bureau => Icons.work_outline_rounded,
        RoomType.garage => Icons.garage_rounded,
        RoomType.exterieur => Icons.landscape_rounded,
        RoomType.autre => Icons.room_outlined,
      };

  @override
  Widget build(BuildContext context) {
    final progress = room.checklistProgress;
    final accent = _progressColor(progress);
    final tt = Theme.of(context).textTheme;

    return Stack(
      children: [
        Material(
          color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
          borderRadius: AppRadius.borderRadiusLg,
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              context.goToAudit(projectId);
            },
            borderRadius: AppRadius.borderRadiusLg,
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              decoration: BoxDecoration(
                borderRadius: AppRadius.borderRadiusLg,
                border: Border.all(
                  color: isDark
                      ? Colors.white.withAlpha(12)
                      : cs.outlineVariant.withAlpha(40),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(_roomIcon,
                          size: 18, color: accent),
                      const Spacer(),
                      SizedBox(
                        width: 34,
                        height: 34,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            CircularProgressIndicator(
                              value: progress,
                              strokeWidth: 3,
                              backgroundColor:
                                  cs.outlineVariant.withAlpha(50),
                              valueColor:
                                  AlwaysStoppedAnimation(accent),
                            ),
                            Text(
                              '${(progress * 100).toInt()}',
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                              ).copyWith(color: accent),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    room.displayName,
                    style: tt.labelMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    room.checklist.isEmpty
                        ? 'Aucun item'
                        : '${room.checkedItemsCount}/${room.checklist.length}',
                    style: tt.bodySmall
                        ?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      if (room.photoCount > 0) ...[
                        Icon(Icons.photo_outlined,
                            size: 12,
                            color: cs.onSurfaceVariant.withAlpha(160)),
                        const SizedBox(width: 3),
                        Text(
                          '${room.photoCount}',
                          style: tt.labelSmall?.copyWith(
                              color: cs.onSurfaceVariant.withAlpha(160)),
                        ),
                        const SizedBox(width: 8),
                      ],
                      const Spacer(),
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          context.goToFloorPlan(
                            projectId,
                            room.id,
                            roomName: room.displayName,
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: cs.primary.withAlpha(isDark ? 30 : 18),
                            borderRadius: AppRadius.borderRadiusSm,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.map_outlined,
                                  size: 10, color: cs.primary),
                              const SizedBox(width: 3),
                              Text(
                                'Plan',
                                style: tt.labelSmall?.copyWith(
                                  color: cs.primary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        // Left accent bar
        Positioned(
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: accent,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Chips
// ─────────────────────────────────────────────────────────────────────────────

class _ContactChips extends StatelessWidget {
  final Project project;
  final ColorScheme cs;
  final bool isDark;

  const _ContactChips({
    required this.project,
    required this.cs,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final client = project.client;
    if (client == null) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (client.phone != null)
          _Chip(
            icon: Icons.call_rounded,
            label: 'Appeler',
            cs: cs,
            isDark: isDark,
            onTap: () {
              HapticFeedback.lightImpact();
              Clipboard.setData(ClipboardData(text: client.phone!));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content:
                      Text('Numéro copié : ${client.phone}'),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
        if (client.email != null)
          _Chip(
            icon: Icons.email_outlined,
            label: 'Email',
            cs: cs,
            isDark: isDark,
            onTap: () {
              HapticFeedback.lightImpact();
              Clipboard.setData(ClipboardData(text: client.email!));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Email copié : ${client.email}'),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
        if (client.fullAddress.isNotEmpty)
          _Chip(
            icon: Icons.directions_rounded,
            label: 'Itinéraire',
            cs: cs,
            isDark: isDark,
            onTap: () {
              HapticFeedback.lightImpact();
              Clipboard.setData(
                  ClipboardData(text: client.fullAddress));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Adresse copiée dans le presse-papier'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
          ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;
  final ColorScheme cs;
  final bool isDark;
  final VoidCallback onTap;

  const _Chip({
    required this.icon,
    required this.label,
    required this.cs,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isDark ? cs.surfaceContainerHigh : cs.surfaceContainerHighest,
      borderRadius: AppRadius.borderRadiusFull,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: cs.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: cs.onSurface,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge (tappable)
// ─────────────────────────────────────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  final Project project;
  final ProjectsBloc projectsBloc;
  final bool isDark;
  final ColorScheme cs;

  const _StatusBadge({
    required this.project,
    required this.projectsBloc,
    required this.isDark,
    required this.cs,
  });

  Color get _color => switch (project.status) {
        ProjectStatus.brouillon => AppTheme.statusBrouillon,
        ProjectStatus.enCours => AppTheme.statusEnCours,
        ProjectStatus.termine => AppTheme.statusTermine,
        ProjectStatus.archive => AppTheme.statusArchive,
      };

  @override
  Widget build(BuildContext context) {
    final color = _color;
    final tt = Theme.of(context).textTheme;

    return Tooltip(
      message: 'Changer le statut',
      child: InkWell(
        onTap: () => _showStatusSheet(context),
        borderRadius: AppRadius.borderRadiusSm,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: color.withAlpha(isDark ? 35 : 20),
            borderRadius: AppRadius.borderRadiusSm,
            border: Border.all(color: color.withAlpha(60)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 7),
              Text(
                project.status.displayName,
                style: tt.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 6),
              Icon(Icons.expand_more_rounded, size: 14, color: color),
            ],
          ),
        ),
      ),
    );
  }

  void _showStatusSheet(BuildContext context) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Changer le statut',
              style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 16),
            ...ProjectStatus.values.map((status) {
              final color = switch (status) {
                ProjectStatus.brouillon => AppTheme.statusBrouillon,
                ProjectStatus.enCours => AppTheme.statusEnCours,
                ProjectStatus.termine => AppTheme.statusTermine,
                ProjectStatus.archive => AppTheme.statusArchive,
              };
              final isSelected = project.status == status;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.borderRadiusMd,
                  ),
                  tileColor: isSelected ? color.withAlpha(25) : null,
                  leading: Container(
                    width: 10,
                    height: 10,
                    margin: const EdgeInsets.only(top: 4),
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  title: Text(
                    status.displayName,
                    style: TextStyle(
                      fontWeight:
                          isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? color : null,
                    ),
                  ),
                  trailing: isSelected
                      ? Icon(Icons.check_rounded, color: color)
                      : null,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    if (status != project.status) {
                      HapticFeedback.lightImpact();
                      projectsBloc.add(ProjectStatusUpdateRequested(
                        id: project.id,
                        status: status,
                      ));
                    }
                  },
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Secondary Action Row
// ─────────────────────────────────────────────────────────────────────────────

class _SecondaryAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDark;
  final ColorScheme cs;

  const _SecondaryAction({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
    required this.isDark,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Material(
      color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
      borderRadius: AppRadius.borderRadiusMd,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusMd,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: AppRadius.borderRadiusMd,
            border: Border.all(
              color: isDark
                  ? Colors.white.withAlpha(12)
                  : cs.outlineVariant.withAlpha(40),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: cs.primary.withAlpha(isDark ? 30 : 18),
                  borderRadius: AppRadius.borderRadiusSm,
                ),
                child: Icon(icon, color: cs.primary, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: tt.labelMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    Text(subtitle,
                        style: tt.bodySmall
                            ?.copyWith(color: cs.onSurfaceVariant)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded,
                  size: 18, color: cs.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Description Card
// ─────────────────────────────────────────────────────────────────────────────

class _DescriptionCard extends StatelessWidget {
  final String description;
  final bool isDark;
  final ColorScheme cs;

  const _DescriptionCard({
    required this.description,
    required this.isDark,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: isDark ? cs.surfaceContainerLow : cs.surfaceContainerLowest,
        borderRadius: AppRadius.borderRadiusLg,
        border: Border.all(
          color: isDark
              ? Colors.white.withAlpha(12)
              : cs.outlineVariant.withAlpha(40),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.notes_rounded, size: 18, color: cs.primary),
              const SizedBox(width: 8),
              Text(
                'Notes',
                style: tt.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: cs.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            description,
            style: tt.bodyMedium?.copyWith(
              color: cs.onSurface.withAlpha(200),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Avatar
// ─────────────────────────────────────────────────────────────────────────────

class _ClientAvatar extends StatelessWidget {
  final Project project;
  final Color statusColor;
  final bool isDark;
  final double size;

  const _ClientAvatar({
    required this.project,
    required this.statusColor,
    required this.isDark,
    this.size = 56,
  });

  String get _initials =>
      project.client?.initials ??
      (project.name.isNotEmpty ? project.name[0].toUpperCase() : '?');

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            statusColor.withAlpha(isDark ? 70 : 50),
            statusColor.withAlpha(isDark ? 40 : 25),
          ],
        ),
        shape: BoxShape.circle,
        border: Border.all(
          color: statusColor.withAlpha(80),
          width: 2,
        ),
      ),
      child: Center(
        child: Text(
          _initials,
          style: (size >= 64
                  ? tt.headlineSmall
                  : size >= 56
                      ? tt.titleLarge
                      : tt.titleMedium)
              ?.copyWith(
            color: statusColor,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// More Menu Button
// ─────────────────────────────────────────────────────────────────────────────

class _MoreMenuButton extends StatelessWidget {
  final Project project;
  final ProjectsBloc projectsBloc;
  final bool isDark;
  final ColorScheme cs;

  const _MoreMenuButton({
    required this.project,
    required this.projectsBloc,
    required this.isDark,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert_rounded, color: cs.onSurface, size: 20),
      tooltip: 'Plus d\'options',
      style: IconButton.styleFrom(
        backgroundColor: isDark
            ? Colors.white.withAlpha(12)
            : cs.outlineVariant.withAlpha(30),
        minimumSize: const Size(44, 44),
      ),
      shape: RoundedRectangleBorder(borderRadius: AppRadius.borderRadiusLg),
      onSelected: (value) {
        if (value == 'delete') {
          _confirmDelete(context);
        }
      },
      itemBuilder: (ctx) => [
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

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer le projet ?'),
        content: Text(
            'Cette action est irréversible. Le projet "${project.name}" et toutes ses données seront supprimés.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              HapticFeedback.lightImpact();
              projectsBloc.add(ProjectDeleteRequested(project.id));
              context.goToProjects();
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Info Row
// ─────────────────────────────────────────────────────────────────────────────

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
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: cs.onSurfaceVariant.withAlpha(150)),
          const SizedBox(width: 10),
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: cs.onSurfaceVariant,
                  ),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
