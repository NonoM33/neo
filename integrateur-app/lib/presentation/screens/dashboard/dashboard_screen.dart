import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/project.dart';
import '../../../routes/app_router.dart';
import '../../blocs/dashboard/dashboard_bloc.dart';
import '../../widgets/ds/ds.dart';

/// Tableau de bord — **poste de commande terrain**, pas une page de stats.
///
/// Hierarchie imposee par le systeme : hors-ligne → prochain rendez-vous →
/// a finir → en attente de signature → chiffres → projets recents.
/// La premiere carte doit etre actionnable sans scroller, y compris sur iPhone.
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
    final bloc = ref.watch(dashboardBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      appBar: DsAppBar(
        title: _greeting(),
        subtitle: DateFormat('EEEE d MMMM yyyy', 'fr_FR')
            .format(DateTime.now())
            .replaceFirstMapped(RegExp('^.'), (m) => m[0]!.toUpperCase()),
        actions: [
          DsIconButton(
            icon: DsGlyph.refresh,
            label: 'Actualiser',
            onPressed: () => bloc.add(const DashboardRefreshRequested()),
          ),
          if (!device.isPhone) ...[
            const SizedBox(width: DsSpacing.s2),
            DsButton(
              label: 'Nouveau projet',
              icon: DsGlyph.add,
              variant: DsButtonVariant.secondary,
              onPressed: () => context.goToProjectCreate(),
            ),
            const SizedBox(width: DsSpacing.s2),
          ],
        ],
      ),
      floatingActionButton: device.isPhone
          ? FloatingActionButton.extended(
              onPressed: () => context.goToProjectCreate(),
              icon: const Icon(DsGlyph.add),
              label: const Text('Nouveau projet'),
            )
          : null,
      body: BlocBuilder<DashboardBloc, DashboardState>(
        bloc: bloc,
        builder: (context, state) {
          return switch (state) {
            DashboardInitial() || DashboardLoading() => const DsSkeletonDetail(),
            DashboardError(message: final message) => DsErrorState(
                kind: DsErrorKind.fromMessage(message),
                action: DsButton(
                  label: 'Recharger',
                  icon: DsGlyph.refresh,
                  onPressed: () => bloc.add(const DashboardLoadRequested()),
                ),
              ),
            DashboardLoaded() => _Loaded(state: state, bloc: bloc),
          };
        },
      ),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }
}

class _Loaded extends StatelessWidget {
  const _Loaded({required this.state, required this.bloc});

  final DashboardLoaded state;
  final DashboardBloc bloc;

  @override
  Widget build(BuildContext context) {
    final device = context.dsDevice;
    final columns = switch (device) {
      DsDevice.phone => 1,
      DsDevice.tablet => 2,
      DsDevice.desktop => 3,
    };

    return RefreshIndicator(
      onRefresh: () async => bloc.add(const DashboardRefreshRequested()),
      child: ListView(
        padding: DsSpacing.page(device),
        children: [
          // 1. L'etat reseau passe avant tout : hors ligne est un etat normal.
          if (!state.isOnline || state.pendingSync > 0) ...[
            DsErrorState(
              kind: DsErrorKind.network,
              inline: true,
              title: state.isOnline
                  ? '${state.pendingSync} élément${state.pendingSync > 1 ? 's' : ''} en attente d’envoi'
                  : 'Hors ligne',
              description: state.isOnline
                  ? 'Ils partiront à la prochaine synchronisation.'
                  : 'Vos saisies restent enregistrées sur cet appareil et partiront à la reconnexion.',
              action: DsButton(
                label: 'Synchroniser',
                size: DsButtonSize.small,
                variant: DsButtonVariant.ghost,
                onPressed: () => bloc.add(const DashboardRefreshRequested()),
              ),
            ),
            const SizedBox(height: DsSpacing.gapSection),
          ],

          // 2. A finir — l'action unique du moment.
          if (state.recentProjects.isNotEmpty) ...[
            _Section(
              title: 'À finir',
              child: _ResumeCard(project: state.recentProjects.first),
            ),
            const SizedBox(height: DsSpacing.gapSection),
          ],

          // 3. Aujourd'hui en chiffres.
          _Section(
            title: 'Aujourd’hui en chiffres',
            child: GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: device.isPhone ? 2 : 4,
              mainAxisSpacing: DsSpacing.gapCard,
              crossAxisSpacing: DsSpacing.gapCard,
              // Hauteur deduite du contenu : un ratio fixe liait la hauteur a
              // la largeur, et le libelle sur deux lignes debordait sur les
              // petites cellules (iPhone).
              mainAxisExtent: _StatCard.extent(context),
              children: [
                _StatCard(
                  icon: DsGlyph.folder,
                  label: 'Projets actifs',
                  value: '${state.enCours}',
                ),
                _StatCard(
                  icon: DsGlyph.editNote,
                  label: 'Brouillons',
                  value: '${state.brouillon}',
                  tone: context.ds.statusBrouillon,
                ),
                _StatCard(
                  icon: DsGlyph.checkCircle,
                  label: 'Terminés',
                  value: '${state.termine}',
                  tone: context.ds.success,
                ),
                _StatCard(
                  icon: DsGlyph.cloudUpload,
                  label: 'En attente d’envoi',
                  value: '${state.pendingSync}',
                  tone: context.ds.brandTertiary,
                ),
              ],
            ),
          ),
          const SizedBox(height: DsSpacing.gapSection),

          // 4. Projets recents.
          _Section(
            title: 'Projets récents',
            action: DsButton(
              label: 'Tous les projets',
              size: DsButtonSize.small,
              variant: DsButtonVariant.ghost,
              trailingIcon: DsGlyph.chevronRight,
              onPressed: () => context.goToProjects(),
            ),
            child: state.recentProjects.isEmpty
                ? DsEmptyState(
                    icon: DsGlyph.folderOutline,
                    title: 'Aucun projet pour l’instant',
                    description:
                        'Créez un projet pour démarrer un audit chez un client et générer son devis.',
                    action: DsButton(
                      label: 'Nouveau projet',
                      icon: DsGlyph.add,
                      onPressed: () => context.goToProjectCreate(),
                    ),
                  )
                : GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      mainAxisSpacing: DsSpacing.gapCard,
                      crossAxisSpacing: DsSpacing.gapCard,
                      mainAxisExtent: DsProjectCard.gridExtent(context),
                    ),
                    itemCount: state.recentProjects.length,
                    itemBuilder: (context, index) {
                      final project = state.recentProjects[index];
                      return DsProjectCard(
                        projectName: project.name,
                        clientName: project.client?.fullName ?? 'Client',
                        status: project.status.dsStatus,
                        address: project.fullAddress.isEmpty
                            ? null
                            : project.fullAddress,
                        progress: project.progressPercentage.round(),
                        unsynced: !project.isSynced,
                        variant: DsProjectCardVariant.grid,
                        onTap: () => context.goToProjectDetail(project.id),
                      );
                    },
                  ),
          ),
          const SizedBox(height: DsSpacing.s16),
        ],
      ),
    );
  }
}

/// Carte « a finir » : une seule action principale, celle que dicte l'avancement.
class _ResumeCard extends StatelessWidget {
  const _ResumeCard({required this.project});

  final Project project;

  @override
  Widget build(BuildContext context) {
    final percent = project.progressPercentage.round();
    final done = project.status == ProjectStatus.termine;

    return DsCard(
      large: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          DsAuditProgress(
            variant: DsProgressVariant.ring,
            label: project.name,
            percent: percent,
          ),
          const SizedBox(height: DsSpacing.s4),
          Wrap(
            spacing: DsSpacing.s2,
            runSpacing: DsSpacing.s2,
            children: [
              DsButton(
                label: done ? 'Consulter le devis' : 'Reprendre l’audit',
                icon: done ? DsGlyph.quote : DsGlyph.audit,
                size: DsButtonSize.large,
                onPressed: () => done
                    ? context.goToQuote(project.id)
                    : context.goToAudit(project.id),
              ),
              DsButton(
                label: 'Ouvrir le projet',
                icon: DsGlyph.folderOpen,
                variant: DsButtonVariant.secondary,
                onPressed: () => context.goToProjectDetail(project.id),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child, this.action});

  final String title;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: t.h3Size,
                  fontWeight: DsWeight.semibold,
                  letterSpacing: -0.3,
                  color: ds.textPrimary,
                ),
              ),
            ),
            ?action,
          ],
        ),
        const SizedBox(height: DsSpacing.s3),
        child,
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    this.tone,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? tone;

  /// Hauteur d'une carte de statistique, deduite de sa typographie.
  static double extent(BuildContext context) {
    final t = context.dsType;
    return DsSpacing.cardPadding * 2 // marges
        + t.labelLine * 2 // libelle sur deux lignes au maximum
        + 6 // espacement
        + t.h1Line // valeur
        + 4; // marge de securite
  }

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return Container(
      padding: const EdgeInsets.all(DsSpacing.cardPadding),
      decoration: BoxDecoration(
        gradient: ds.gradientStat,
        borderRadius: DsRadius.cardAll,
        border: Border.all(color: ds.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              DsIcon(icon, size: 18, color: tone ?? ds.brandPrimary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: t.labelSize,
                    fontWeight: DsWeight.semibold,
                    color: ds.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: t.h1Size,
              fontWeight: DsWeight.semibold,
              letterSpacing: -0.5,
              fontFeatures: dsTabularFigures,
              color: ds.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Passerelle entre les statuts metier et les statuts du Design System.
extension ProjectStatusDs on ProjectStatus {
  DsStatus get dsStatus => switch (this) {
        ProjectStatus.brouillon => DsStatus.brouillon,
        ProjectStatus.enCours => DsStatus.enCours,
        ProjectStatus.termine => DsStatus.termine,
        ProjectStatus.archive => DsStatus.archive,
      };
}
