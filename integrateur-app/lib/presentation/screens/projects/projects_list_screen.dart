import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/project.dart';
import '../../../routes/app_router.dart';
import '../../blocs/projects/projects_bloc.dart';
import '../../blocs/projects/projects_event.dart';
import '../../blocs/projects/projects_state.dart';
import '../../widgets/ds/ds.dart';
import '../dashboard/dashboard_screen.dart' show ProjectStatusDs;

/// Liste des projets.
///
/// iPad paysage : **maitre-detail** — liste filtrable a 36 % + apercu du projet
/// avec son action principale unique. iPad portrait : grille 2 colonnes.
/// iPhone : liste dense, filtres en sheet.
class ProjectsListScreen extends ConsumerStatefulWidget {
  const ProjectsListScreen({super.key});

  @override
  ConsumerState<ProjectsListScreen> createState() => _ProjectsListScreenState();
}

class _ProjectsListScreenState extends ConsumerState<ProjectsListScreen> {
  String _search = '';
  ProjectStatus? _status;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(projectsBlocProvider);
    if (bloc.state is ProjectsInitial) {
      bloc.add(const ProjectsLoadRequested());
    }
  }

  List<Project> _visible(List<Project> projects) {
    final query = _search.trim().toLowerCase();
    return projects.where((project) {
      if (_status != null && project.status != _status) return false;
      if (query.isEmpty) return true;
      final haystack = [
        project.name,
        project.client?.fullName ?? '',
        project.city ?? '',
        project.address ?? '',
      ].join(' ').toLowerCase();
      return haystack.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(projectsBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      appBar: DsAppBar(
        title: 'Projets',
        actions: [
          if (!device.isPhone)
            Padding(
              padding: const EdgeInsets.only(right: DsSpacing.s2),
              child: DsButton(
                label: 'Nouveau projet',
                icon: DsGlyph.add,
                onPressed: () => context.goToProjectCreate(),
              ),
            ),
        ],
      ),
      floatingActionButton: device.isPhone
          ? FloatingActionButton.extended(
              onPressed: () => context.goToProjectCreate(),
              icon: const Icon(DsGlyph.add),
              label: const Text('Nouveau'),
            )
          : null,
      body: BlocBuilder<ProjectsBloc, ProjectsState>(
        bloc: bloc,
        builder: (context, state) {
          if (state is ProjectsLoading || state is ProjectsInitial) {
            return const DsSkeletonList();
          }
          if (state is ProjectsError) {
            return DsErrorState(
              kind: DsErrorKind.fromMessage(state.message),
              action: DsButton(
                label: 'Recharger',
                icon: DsGlyph.refresh,
                onPressed: () => bloc.add(const ProjectsLoadRequested()),
              ),
            );
          }
          if (state is! ProjectsLoaded) return const SizedBox.shrink();

          final all = state.projects;
          final visible = _visible(all);
          final masterDetail = device.isDesktop && context.dsIsLandscape;

          final list = _ProjectsPane(
            projects: visible,
            allCount: all.length,
            search: _search,
            status: _status,
            selectedId: masterDetail ? _selectedId : null,
            onSearch: (value) => setState(() => _search = value),
            onStatus: (value) => setState(() => _status = value),
            onSelect: (project) {
              if (masterDetail) {
                setState(() => _selectedId = project.id);
              } else {
                context.goToProjectDetail(project.id);
              }
            },
            onRefresh: () async => bloc.add(const ProjectsRefreshRequested()),
            columns: masterDetail ? 1 : (device.isPhone ? 1 : 2),
          );

          if (!masterDetail) return list;

          final selected = visible.where((p) => p.id == _selectedId).firstOrNull;
          return Row(
            children: [
              SizedBox(
                width: MediaQuery.sizeOf(context).width * 0.36,
                child: list,
              ),
              VerticalDivider(width: 1, color: ds.borderSubtle),
              Expanded(child: _ProjectPreview(project: selected)),
            ],
          );
        },
      ),
    );
  }
}

class _ProjectsPane extends StatelessWidget {
  const _ProjectsPane({
    required this.projects,
    required this.allCount,
    required this.search,
    required this.status,
    required this.selectedId,
    required this.onSearch,
    required this.onStatus,
    required this.onSelect,
    required this.onRefresh,
    required this.columns,
  });

  final List<Project> projects;
  final int allCount;
  final String search;
  final ProjectStatus? status;
  final String? selectedId;
  final ValueChanged<String> onSearch;
  final ValueChanged<ProjectStatus?> onStatus;
  final ValueChanged<Project> onSelect;
  final Future<void> Function() onRefresh;
  final int columns;

  @override
  Widget build(BuildContext context) {
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(padding, DsSpacing.s2, padding, 0),
          child: DsSearchBar(
            hintText: 'Rechercher un projet, un client, une ville…',
            onChanged: onSearch,
          ),
        ),
        const SizedBox(height: DsSpacing.s3),
        SizedBox(
          height: DsSpacing.targetMin + DsSpacing.s2,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: padding),
            children: [
              DsFilterChip(
                label: 'Tous',
                selected: status == null,
                onSelected: () => onStatus(null),
              ),
              for (final value in ProjectStatus.values) ...[
                const SizedBox(width: DsSpacing.s2),
                DsFilterChip(
                  label: value.displayName,
                  icon: value.dsStatus.icon,
                  tone: value.dsStatus.color(context.ds),
                  selected: status == value,
                  onSelected: () => onStatus(status == value ? null : value),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: DsSpacing.s2),
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: projects.isEmpty
                ? ListView(
                    children: [
                      SizedBox(height: MediaQuery.sizeOf(context).height * 0.1),
                      // « Liste vide » et « recherche vide » sont deux messages
                      // differents : ne jamais reutiliser le meme texte.
                      allCount == 0
                          ? DsEmptyState(
                              icon: DsGlyph.folderOutline,
                              title: 'Aucun projet pour l’instant',
                              description:
                                  'Un projet regroupe le client, l’audit de sa maison, le plan des pièces et le devis.',
                              action: DsButton(
                                label: 'Créer le premier projet',
                                icon: DsGlyph.add,
                                onPressed: () => context.goToProjectCreate(),
                              ),
                            )
                          : const DsEmptyState(
                              icon: DsGlyph.search,
                              title: 'Aucun projet ne correspond',
                              description:
                                  'Essayez un autre nom de client, une autre ville, ou retirez le filtre de statut.',
                            ),
                    ],
                  )
                : GridView.builder(
                    padding: EdgeInsets.fromLTRB(
                      padding,
                      DsSpacing.s2,
                      padding,
                      DsSpacing.s16,
                    ),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      mainAxisSpacing: DsSpacing.gapCard,
                      crossAxisSpacing: DsSpacing.gapCard,
                      mainAxisExtent: DsProjectCard.extentFor(
                        context,
                        columns > 1
                            ? DsProjectCardVariant.grid
                            : DsProjectCardVariant.list,
                      ),
                    ),
                    itemCount: projects.length,
                    itemBuilder: (context, index) {
                      final project = projects[index];
                      return DsProjectCard(
                        projectName: project.name,
                        clientName: project.client?.fullName ?? 'Client',
                        status: project.status.dsStatus,
                        address: project.fullAddress.isEmpty
                            ? null
                            : project.fullAddress,
                        dateLabel: DateFormat('d MMM yyyy', 'fr_FR')
                            .format(project.createdAt),
                        progress: project.progressPercentage.round(),
                        unsynced: !project.isSynced,
                        selected: project.id == selectedId,
                        variant: columns > 1
                            ? DsProjectCardVariant.grid
                            : DsProjectCardVariant.list,
                        onTap: () => onSelect(project),
                        onLongPress: () => _openActions(context, project),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Future<void> _openActions(BuildContext context, Project project) async {
    await showDsSheet<void>(
      context,
      title: project.name,
      subtitle: project.client?.fullName,
      builder: (sheetContext) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DsButton(
            label: 'Ouvrir le projet',
            icon: DsGlyph.folderOpen,
            fullWidth: true,
            onPressed: () {
              Navigator.of(sheetContext).pop();
              context.goToProjectDetail(project.id);
            },
          ),
          const SizedBox(height: DsSpacing.s2),
          DsButton(
            label: 'Reprendre l’audit',
            icon: DsGlyph.audit,
            variant: DsButtonVariant.secondary,
            fullWidth: true,
            onPressed: () {
              Navigator.of(sheetContext).pop();
              context.goToAudit(project.id);
            },
          ),
          const SizedBox(height: DsSpacing.s2),
          DsButton(
            label: 'Modifier le projet',
            icon: DsGlyph.edit,
            variant: DsButtonVariant.ghost,
            fullWidth: true,
            onPressed: () {
              Navigator.of(sheetContext).pop();
              context.goToProjectEdit(project.id);
            },
          ),
        ],
      ),
    );
  }
}

/// Apercu du projet selectionne (maitre-detail iPad paysage).
class _ProjectPreview extends StatelessWidget {
  const _ProjectPreview({this.project});

  final Project? project;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    if (project == null) {
      return const DsEmptyState(
        icon: DsGlyph.folderOutline,
        title: 'Sélectionnez un projet',
        description:
            'Son avancement, son client et l’action à mener s’affichent ici.',
      );
    }

    final p = project!;
    final percent = p.progressPercentage.round();
    final (String actionLabel, IconData actionIcon, VoidCallback action) =
        switch (p.status) {
      ProjectStatus.brouillon => (
          'Démarrer l’audit',
          DsGlyph.audit,
          () => context.goToAudit(p.id),
        ),
      ProjectStatus.enCours when percent >= 100 => (
          'Générer le devis',
          DsGlyph.quote,
          () => context.goToQuote(p.id),
        ),
      ProjectStatus.enCours => (
          'Reprendre l’audit',
          DsGlyph.audit,
          () => context.goToAudit(p.id),
        ),
      ProjectStatus.termine => (
          'Consulter le devis',
          DsGlyph.quote,
          () => context.goToQuote(p.id),
        ),
      ProjectStatus.archive => (
          'Ouvrir le projet',
          DsGlyph.folderOpen,
          () => context.goToProjectDetail(p.id),
        ),
    };

    return ListView(
      padding: DsSpacing.page(context.dsDevice),
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    p.name,
                    style: TextStyle(
                      fontSize: t.h2Size,
                      fontWeight: DsWeight.semibold,
                      letterSpacing: -0.4,
                      color: ds.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    p.client?.fullName ?? 'Client',
                    style: TextStyle(
                      fontSize: t.bodySize,
                      color: ds.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            DsStatusBadge(status: p.status.dsStatus, size: DsBadgeSize.large),
          ],
        ),
        const SizedBox(height: DsSpacing.gapSection),
        DsCard(
          large: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              DsAuditProgress(
                label: 'Avancement de l’audit',
                percent: percent,
              ),
              const SizedBox(height: DsSpacing.s5),
              // Une seule action primaire visible : celle que dicte l'avancement.
              DsButton(
                label: actionLabel,
                icon: actionIcon,
                size: DsButtonSize.large,
                fullWidth: true,
                onPressed: action,
              ),
              const SizedBox(height: DsSpacing.s2),
              Row(
                children: [
                  Expanded(
                    child: DsButton(
                      label: 'Détail',
                      icon: DsGlyph.folderOpen,
                      variant: DsButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () => context.goToProjectDetail(p.id),
                    ),
                  ),
                  const SizedBox(width: DsSpacing.s2),
                  Expanded(
                    child: DsButton(
                      label: 'Devis',
                      icon: DsGlyph.quote,
                      variant: DsButtonVariant.secondary,
                      fullWidth: true,
                      onPressed: () => context.goToQuote(p.id),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: DsSpacing.gapCard),
        DsCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              const DsSectionTitle('Chantier'),
              const SizedBox(height: DsSpacing.s3),
              _Line(
                icon: DsGlyph.location,
                label: 'Adresse',
                value: p.fullAddress.isEmpty ? '—' : p.fullAddress,
              ),
              _Line(
                icon: DsGlyph.surface,
                label: 'Surface',
                value: p.surface == null ? '—' : '${p.surface!.round()} m²',
              ),
              _Line(
                icon: DsGlyph.room,
                label: 'Pièces',
                value: p.roomCount == null ? '—' : '${p.roomCount}',
              ),
              _Line(
                icon: DsGlyph.event,
                label: 'Créé le',
                value: DateFormat('d MMMM yyyy', 'fr_FR').format(p.createdAt),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return Padding(
      padding: const EdgeInsets.only(bottom: DsSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DsIcon(icon, size: 20, color: ds.textTertiary),
          const SizedBox(width: DsSpacing.s3),
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: TextStyle(
                fontSize: t.captionSize,
                color: ds.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: t.bodySize,
                fontWeight: DsWeight.medium,
                color: ds.textBody,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
