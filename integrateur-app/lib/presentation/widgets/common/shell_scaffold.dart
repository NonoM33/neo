import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/providers.dart';
import '../../../routes/app_router.dart';
import '../../blocs/auth/auth_state.dart';
import '../../blocs/sync/sync_bloc.dart';
import '../feedback/feedback_overlay.dart';
import '../ds/ds.dart';

/// Sections de premier niveau.
///
/// Six entrees au rail iPad ; **cinq maximum** en barre basse iPhone, ou
/// Catalogue, Ma Maison et Support se regroupent sous « Plus ».
enum _Section {
  dashboard('dashboard', 'Tableau de bord', 'Aujourd’hui', DsGlyph.dashboardOutline, DsGlyph.dashboard),
  projects('projects', 'Projets', 'Projets', DsGlyph.folderOutline, DsGlyph.folder),
  calendar('calendar', 'Agenda', 'Agenda', DsGlyph.eventOutline, DsGlyph.event),
  catalogue('catalogue', 'Catalogue', 'Catalogue', Icons.inventory_2_outlined, DsGlyph.catalogue),
  homes('homes', 'Ma Maison', 'Maison', DsGlyph.homeOutline, DsGlyph.home),
  tickets('tickets', 'Support', 'Support', Icons.support_agent_outlined, DsGlyph.support);

  const _Section(this.id, this.railLabel, this.phoneLabel, this.icon, this.activeIcon);

  final String id;
  final String railLabel;
  final String phoneLabel;
  final IconData icon;
  final IconData activeIcon;

  String get path => switch (this) {
        _Section.dashboard => AppPaths.dashboard,
        _Section.projects => AppPaths.projects,
        _Section.calendar => AppPaths.calendar,
        _Section.catalogue => AppPaths.catalogue,
        _Section.homes => AppPaths.homes,
        _Section.tickets => AppPaths.tickets,
      };

  static _Section fromLocation(String location) {
    if (location.startsWith('/projects')) return _Section.projects;
    if (location.startsWith('/calendar') || location.startsWith('/availability')) {
      return _Section.calendar;
    }
    if (location.startsWith('/catalogue')) return _Section.catalogue;
    if (location.startsWith('/homes')) return _Section.homes;
    if (location.startsWith('/tickets')) return _Section.tickets;
    return _Section.dashboard;
  }
}

/// Coquille de navigation.
///
/// - iPad : `DsNavRail` (etendu au-dela de 1200 pt), synchro et compte en pied.
/// - iPhone : `DsBottomBar` a cinq entrees ; la synchro vit dans l'app bar
///   des ecrans, jamais dans la barre basse.
/// - Ecrans immersifs (audit, plan) : plein ecran, aucune navigation.
class ShellScaffold extends ConsumerStatefulWidget {
  const ShellScaffold({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<ShellScaffold> createState() => _ShellScaffoldState();
}

class _ShellScaffoldState extends ConsumerState<ShellScaffold> {
  static const List<_Section> _phoneSections = [
    _Section.dashboard,
    _Section.projects,
    _Section.calendar,
    _Section.catalogue,
  ];

  static const List<_Section> _moreSections = [
    _Section.homes,
    _Section.tickets,
  ];

  bool _isImmersive(String location) =>
      location.contains('/audit') || location.contains('/rooms/');

  void _go(BuildContext context, _Section section) => context.go(section.path);

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final active = _Section.fromLocation(location);

    if (_isImmersive(location)) {
      return Scaffold(body: widget.child);
    }

    final device = context.dsDevice;

    if (device.isTabletOrLarger) {
      return Scaffold(
        body: Row(
          children: [
            _Rail(
              active: active,
              expanded: device.isDesktop,
              onSelected: (section) => _go(context, section),
            ),
            Expanded(child: widget.child),
          ],
        ),
      );
    }

    final isMoreActive = _moreSections.contains(active);

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: DsBottomBar(
        activeId: isMoreActive ? 'more' : active.id,
        onSelected: (id) {
          if (id == 'more') {
            _openMoreSheet(context);
            return;
          }
          _go(context, _Section.values.firstWhere((s) => s.id == id));
        },
        items: [
          for (final section in _phoneSections)
            DsNavItem(
              id: section.id,
              label: section.phoneLabel,
              icon: section.icon,
              activeIcon: section.activeIcon,
            ),
          const DsNavItem(
            id: 'more',
            label: 'Plus',
            icon: DsGlyph.more,
          ),
        ],
      ),
    );
  }

  Future<void> _openMoreSheet(BuildContext context) async {
    await showDsSheet<void>(
      context,
      title: 'Plus',
      detent: DsSheetDetent.medium,
      builder: (sheetContext) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final section in _moreSections)
            _MoreEntry(
              icon: section.activeIcon,
              label: section.railLabel,
              onTap: () {
                Navigator.of(sheetContext).pop();
                _go(context, section);
              },
            ),
          _MoreEntry(
            icon: DsGlyph.schedule,
            label: 'Mes disponibilités',
            onTap: () {
              Navigator.of(sheetContext).pop();
              context.goToAvailability();
            },
          ),
          _MoreEntry(
            icon: DsGlyph.account,
            label: 'Mon compte',
            onTap: () {
              Navigator.of(sheetContext).pop();
              context.goToProfile();
            },
          ),
          Consumer(
            builder: (consumerContext, ref, _) => _MoreEntry(
              icon: DsGlyph.help,
              label: 'Aide / Bug',
              onTap: () {
                Navigator.of(sheetContext).pop();
                showFeedbackDialog(context, ref);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _MoreEntry extends StatelessWidget {
  const _MoreEntry({
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
    return Material(
      color: Colors.transparent,
      borderRadius: DsRadius.mdAll,
      child: InkWell(
        onTap: onTap,
        borderRadius: DsRadius.mdAll,
        child: Container(
          constraints: const BoxConstraints(minHeight: DsSpacing.targetIdeal),
          padding: const EdgeInsets.symmetric(horizontal: DsSpacing.s2),
          child: Row(
            children: [
              DsIcon(icon, size: 24, color: ds.textSecondary),
              const SizedBox(width: DsSpacing.s4),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: context.dsType.bodySize,
                    fontWeight: DsWeight.medium,
                    color: ds.textPrimary,
                  ),
                ),
              ),
              DsIcon(DsGlyph.chevronRight, size: 22, color: ds.textTertiary),
            ],
          ),
        ),
      ),
    );
  }
}

class _Rail extends ConsumerWidget {
  const _Rail({
    required this.active,
    required this.expanded,
    required this.onSelected,
  });

  final _Section active;
  final bool expanded;
  final ValueChanged<_Section> onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncBloc = ref.watch(syncBlocProvider);
    final authState = ref.watch(authBlocProvider).state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return StreamBuilder<SyncState>(
      stream: syncBloc.stream,
      initialData: syncBloc.state,
      builder: (context, snapshot) {
        final sync = snapshot.data;
        final (DsSyncState state, int pending) = switch (sync) {
          SyncInProgress() => (DsSyncState.syncing, 0),
          SyncFailed() => (DsSyncState.failed, 0),
          SyncIdle(isOnline: false) => (DsSyncState.offline, 0),
          SyncIdle(pendingUploads: final p) when p > 0 => (
              DsSyncState.pending,
              p,
            ),
          _ => (DsSyncState.online, 0),
        };

        return DsNavRail(
          activeId: active.id,
          expanded: expanded,
          accountName: user?.fullName,
          accountRole: user?.role.displayName,
          onAccountTap: () => context.goToProfile(),
          onSelected: (id) =>
              onSelected(_Section.values.firstWhere((s) => s.id == id)),
          helpSlot: FeedbackRailButton(expanded: expanded),
          syncSlot: DsSyncIndicator(
            state: state,
            pending: pending,
            expanded: expanded,
            onTap: () => syncBloc.add(const SyncRequested()),
          ),
          items: [
            for (final section in _Section.values)
              DsNavItem(
                id: section.id,
                label: section.railLabel,
                icon: section.icon,
                activeIcon: section.activeIcon,
              ),
          ],
        );
      },
    );
  }
}
