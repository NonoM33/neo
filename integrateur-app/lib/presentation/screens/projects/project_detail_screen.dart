import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

/// Detail projet — le hub du projet.
///
/// Une **seule action principale** visible : celle que dicte l'avancement.
/// Les autres sont secondaires. Sur iPad paysage, l'ecran se lit en deux
/// colonnes (identite et infos a gauche, avancement et actions a droite).
class ProjectDetailScreen extends ConsumerStatefulWidget {
  const ProjectDetailScreen({required this.projectId, super.key});

  final String projectId;

  @override
  ConsumerState<ProjectDetailScreen> createState() =>
      _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(projectsBlocProvider).add(ProjectLoadRequested(widget.projectId));
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(projectsBlocProvider);
    final ds = context.ds;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocConsumer<ProjectsBloc, ProjectsState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is ProjectOperationSuccess) {
            showDsSnackbar(
              context,
              message: state.message,
              tone: DsTone.success,
            );
          }
        },
        builder: (context, state) {
          if (state is ProjectsLoading || state is ProjectsInitial) {
            return const SafeArea(child: DsSkeletonDetail());
          }
          if (state is ProjectsError) {
            return SafeArea(
              child: DsErrorState(
                kind: DsErrorKind.fromMessage(state.message),
                action: DsButton(
                  label: 'Recharger',
                  icon: DsGlyph.refresh,
                  onPressed: () =>
                      bloc.add(ProjectLoadRequested(widget.projectId)),
                ),
              ),
            );
          }
          if (state is! ProjectDetailLoaded) return const SizedBox.shrink();

          final project = state.project;
          final wide = context.dsDevice.isDesktop && context.dsIsLandscape;

          final identity = _Identity(project: project);
          final actions = _Actions(project: project, bloc: bloc);

          return Column(
            children: [
              DsAppBar(
                title: project.name,
                subtitle: project.client?.fullName,
                backLabel: 'Retour aux projets',
                onBack: () => context.goToProjects(),
                actions: [
                  DsIconButton(
                    icon: DsGlyph.edit,
                    label: 'Modifier le projet',
                    onPressed: project.isEditable
                        ? () => context.goToProjectEdit(project.id)
                        : null,
                  ),
                  DsIconButton(
                    icon: DsGlyph.delete,
                    label: 'Supprimer le projet',
                    tone: ds.error,
                    onPressed: () => _delete(context, bloc, project),
                  ),
                ],
              ),
              Expanded(
                child: wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(DsSpacing.s8),
                              child: identity,
                            ),
                          ),
                          Expanded(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(DsSpacing.s8),
                              child: actions,
                            ),
                          ),
                        ],
                      )
                    : ListView(
                        padding: DsSpacing.page(context.dsDevice),
                        children: [
                          identity,
                          const SizedBox(height: DsSpacing.gapSection),
                          actions,
                          const SizedBox(height: DsSpacing.s16),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _delete(
    BuildContext context,
    ProjectsBloc bloc,
    Project project,
  ) async {
    final confirmed = await showDsConfirmDialog(
      context,
      title: 'Supprimer ce projet ?',
      description:
          'L’audit, les photos, les plans et le devis associés seront supprimés définitivement.',
    );
    if (!confirmed) return;
    bloc.add(ProjectDeleteRequested(project.id));
    if (context.mounted) context.goToProjects();
  }
}

class _Identity extends StatelessWidget {
  const _Identity({required this.project});

  final Project project;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    final client = project.client;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (project.status == ProjectStatus.archive) ...[
          DsErrorState(
            kind: DsErrorKind.permission,
            inline: true,
            title: 'Projet archivé',
            description: 'Il est consultable, mais plus modifiable.',
          ),
          const SizedBox(height: DsSpacing.gapCard),
        ],
        DsCard(
          large: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: ds.brandPrimarySoft,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      client?.initials ?? '?',
                      style: TextStyle(
                        fontSize: t.h3Size,
                        fontWeight: DsWeight.semibold,
                        color: ds.brandPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: DsSpacing.s4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          client?.fullName ?? 'Client',
                          style: TextStyle(
                            fontSize: t.h3Size,
                            fontWeight: DsWeight.semibold,
                            letterSpacing: -0.3,
                            color: ds.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        DsStatusBadge(status: project.status.dsStatus),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: DsSpacing.s5),
              Wrap(
                spacing: DsSpacing.s2,
                runSpacing: DsSpacing.s2,
                children: [
                  if (client?.phone != null)
                    DsButton(
                      label: 'Appeler',
                      icon: DsGlyph.phone,
                      variant: DsButtonVariant.secondary,
                      onPressed: () => _copy(
                        context,
                        client!.phone!,
                        'Numéro copié : ${client.phone}',
                      ),
                    ),
                  if (client?.email != null)
                    DsButton(
                      label: 'Email',
                      icon: DsGlyph.mail,
                      variant: DsButtonVariant.secondary,
                      onPressed: () => _copy(
                        context,
                        client!.email!,
                        'Email copié : ${client.email}',
                      ),
                    ),
                  if (project.fullAddress.isNotEmpty)
                    DsButton(
                      label: 'Itinéraire',
                      icon: DsGlyph.directions,
                      variant: DsButtonVariant.secondary,
                      onPressed: () => _copy(
                        context,
                        project.fullAddress,
                        'Adresse copiée',
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
                value: project.fullAddress.isEmpty ? '—' : project.fullAddress,
              ),
              _Line(
                icon: DsGlyph.surface,
                label: 'Surface',
                value: project.surface == null
                    ? '—'
                    : '${project.surface!.round()} m²',
              ),
              _Line(
                icon: DsGlyph.room,
                label: 'Pièces',
                value: project.roomCount?.toString() ?? '—',
              ),
              _Line(
                icon: DsGlyph.event,
                label: 'Créé le',
                value: DateFormat('d MMMM yyyy', 'fr_FR')
                    .format(project.createdAt),
              ),
              if (project.description != null &&
                  project.description!.isNotEmpty) ...[
                const SizedBox(height: DsSpacing.s2),
                const DsSectionTitle('Notes'),
                const SizedBox(height: DsSpacing.s2),
                Text(
                  project.description!,
                  style: TextStyle(
                    fontSize: t.bodySize,
                    height: t.bodyLine / t.bodySize,
                    color: ds.textBody,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  void _copy(BuildContext context, String value, String message) {
    Clipboard.setData(ClipboardData(text: value));
    HapticFeedback.lightImpact();
    showDsSnackbar(context, message: message, tone: DsTone.success);
  }
}

class _Actions extends StatelessWidget {
  const _Actions({required this.project, required this.bloc});

  final Project project;
  final ProjectsBloc bloc;

  @override
  Widget build(BuildContext context) {
    final percent = project.progressPercentage.round();

    final (String label, IconData icon, String help, VoidCallback action) =
        switch (project.status) {
      ProjectStatus.brouillon => (
          'Démarrer l’audit',
          DsGlyph.audit,
          'Relevez les besoins pièce par pièce chez le client.',
          () => context.goToAudit(project.id),
        ),
      ProjectStatus.enCours when percent >= 100 => (
          'Générer le devis',
          DsGlyph.quote,
          'L’audit est complet : chiffrez-le depuis le catalogue.',
          () => context.goToQuote(project.id),
        ),
      ProjectStatus.enCours => (
          'Reprendre l’audit',
          DsGlyph.audit,
          'Il reste des besoins à relever dans certaines pièces.',
          () => context.goToAudit(project.id),
        ),
      ProjectStatus.termine => (
          'Consulter le devis',
          DsGlyph.quote,
          'Le projet est terminé : le devis fait foi.',
          () => context.goToQuote(project.id),
        ),
      ProjectStatus.archive => (
          'Consulter l’audit',
          DsGlyph.audit,
          'Projet archivé, consultation seule.',
          () => context.goToAudit(project.id),
        ),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        DsCard(
          large: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              DsAuditProgress(
                variant: DsProgressVariant.ring,
                label: 'Avancement du projet',
                percent: percent,
              ),
              const SizedBox(height: DsSpacing.s4),
              Text(
                help,
                style: TextStyle(
                  fontSize: context.dsType.captionSize,
                  color: context.ds.textSecondary,
                ),
              ),
              const SizedBox(height: DsSpacing.s4),
              // Une seule action primaire par ecran.
              DsButton(
                label: label,
                icon: icon,
                size: DsButtonSize.large,
                fullWidth: true,
                onPressed: action,
              ),
            ],
          ),
        ),
        const SizedBox(height: DsSpacing.gapCard),
        const DsSectionTitle('Aller à'),
        const SizedBox(height: DsSpacing.s3),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: context.dsDevice.isPhone ? 2 : 3,
          mainAxisSpacing: DsSpacing.s2,
          crossAxisSpacing: DsSpacing.s2,
          // Hauteur deduite du contenu (icone + libelle). Un ratio fixe liait
          // la hauteur a la largeur : dans le panneau de detail, etroit, les
          // tuiles devenaient trop courtes de quelques pixels.
          mainAxisExtent: DsSpacing.s3 * 2 // marges de la carte
              + 24 // icone
              + DsSpacing.s2 // espacement minimal
              + context.dsType.labelSize * 1.4 // libelle
              + 6, // marge de securite
          children: [
            _Shortcut(
              icon: DsGlyph.checklist,
              label: 'Audit',
              onTap: () => context.goToAudit(project.id),
            ),
            _Shortcut(
              icon: DsGlyph.quote,
              label: 'Devis',
              onTap: () => context.goToQuote(project.id),
            ),
            _Shortcut(
              icon: DsGlyph.catalogue,
              label: 'Catalogue',
              onTap: () => context.goToCatalogue(),
            ),
            _Shortcut(
              icon: DsGlyph.qr,
              label: 'Box',
              onTap: () => context.goToBoxClaim(project.id),
            ),
          ],
        ),
        const SizedBox(height: DsSpacing.gapCard),
        const DsSectionTitle('Statut'),
        const SizedBox(height: DsSpacing.s3),
        Wrap(
          spacing: DsSpacing.s2,
          runSpacing: DsSpacing.s2,
          children: [
            for (final status in ProjectStatus.values)
              DsFilterChip(
                label: status.displayName,
                icon: status.dsStatus.icon,
                tone: status.dsStatus.color(context.ds),
                selected: status == project.status,
                onSelected: () => bloc.add(
                  ProjectStatusUpdateRequested(id: project.id, status: status),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _Shortcut extends StatelessWidget {
  const _Shortcut({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    return DsCard(
      onTap: onTap,
      padding: const EdgeInsets.all(DsSpacing.s3),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DsIcon(icon, size: 24, color: ds.brandPrimary),
          const Spacer(),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: context.dsType.labelSize,
              fontWeight: DsWeight.semibold,
              color: ds.textPrimary,
            ),
          ),
        ],
      ),
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
