import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/entities/checklist_item.dart';
import '../../../domain/entities/room.dart';
import '../../../routes/app_router.dart';
import '../../blocs/audit/audit_bloc.dart';
import '../../blocs/audit/audit_event.dart';
import '../../blocs/audit/audit_state.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Helper enums & functions
// ─────────────────────────────────────────────────────────────────────────────

enum _ChecklistFilter { all, pending, done }

IconData _roomIcon(RoomType type) {
  switch (type) {
    case RoomType.salon:
      return Icons.weekend_outlined;
    case RoomType.cuisine:
      return Icons.kitchen_outlined;
    case RoomType.chambre:
      return Icons.bed_outlined;
    case RoomType.salleDeBain:
      return Icons.bathtub_outlined;
    case RoomType.bureau:
      return Icons.desk_outlined;
    case RoomType.garage:
      return Icons.garage_outlined;
    case RoomType.exterieur:
      return Icons.park_outlined;
    case RoomType.autre:
      return Icons.room_outlined;
  }
}

IconData _catIcon(ChecklistCategory cat) {
  switch (cat) {
    case ChecklistCategory.eclairage:
      return Icons.lightbulb_outlined;
    case ChecklistCategory.ouvrants:
      return Icons.sensor_window_outlined;
    case ChecklistCategory.climat:
      return Icons.thermostat_outlined;
    case ChecklistCategory.securite:
      return Icons.security_outlined;
    case ChecklistCategory.energie:
      return Icons.bolt_outlined;
    case ChecklistCategory.multimedia:
      return Icons.tv_outlined;
    case ChecklistCategory.infrastructure:
      return Icons.electrical_services_outlined;
    case ChecklistCategory.reseau:
      return Icons.wifi_outlined;
    case ChecklistCategory.chauffage:
      return Icons.local_fire_department_outlined;
    case ChecklistCategory.autre:
      return Icons.category_outlined;
  }
}

Color _catColor(ChecklistCategory cat, ColorScheme cs) {
  switch (cat) {
    case ChecklistCategory.eclairage:
      return AppTheme.warningColor;
    case ChecklistCategory.ouvrants:
      return AppTheme.statusEnCours;
    case ChecklistCategory.climat:
      return AppTheme.secondaryColor;
    case ChecklistCategory.securite:
      return AppTheme.errorColor;
    case ChecklistCategory.energie:
      return AppTheme.tertiaryColor;
    case ChecklistCategory.multimedia:
      return AppTheme.statusBrouillon;
    case ChecklistCategory.infrastructure:
      return cs.onSurfaceVariant;
    case ChecklistCategory.reseau:
      return AppTheme.statusEnCours;
    case ChecklistCategory.chauffage:
      return AppTheme.tertiaryColor;
    case ChecklistCategory.autre:
      return AppTheme.statusArchive;
  }
}

Color _progressColor(double p) {
  if (p <= 0) return AppTheme.statusArchive;
  if (p < 0.4) return AppTheme.warningColor;
  if (p < 0.8) return AppTheme.statusEnCours;
  return AppTheme.successColor;
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditScreen
// ─────────────────────────────────────────────────────────────────────────────

class AuditScreen extends ConsumerStatefulWidget {
  final String projectId;

  const AuditScreen({super.key, required this.projectId});

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  /// Whether narrow mode is showing the room detail (vs room list).
  bool _narrowShowingDetail = false;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(auditBlocProvider);
    final state = bloc.state;
    if (state is AuditInitial ||
        (state is AuditLoaded && state.projectId != widget.projectId)) {
      bloc.add(AuditLoadRoomsRequested(widget.projectId));
    }
  }

  void _showAddRoomSheet(BuildContext context, AuditBloc bloc) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
      ),
      builder: (_) => _AddRoomSheet(
        onAdd: (name, type) {
          bloc.add(AuditAddRoomRequested(name: name, type: type));
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _showEditRoomSheet(BuildContext context, AuditBloc bloc, Room room) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
      ),
      builder: (_) => _EditRoomSheet(
        room: room,
        onSave: (updated) {
          bloc.add(AuditUpdateRoomRequested(updated));
          Navigator.of(context).pop();
        },
        onDelete: () {
          bloc.add(AuditDeleteRoomRequested(room.id));
          Navigator.of(context).pop();
          setState(() => _narrowShowingDetail = false);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.read(auditBlocProvider);

    return BlocProvider.value(
      value: bloc,
      child: BlocBuilder<AuditBloc, AuditState>(
        builder: (ctx, state) {
          return LayoutBuilder(
            builder: (ctx2, constraints) {
              final isWide = constraints.maxWidth >= 720;

              if (isWide) {
                return _WideLayout(
                  projectId: widget.projectId,
                  state: state,
                  onAddRoom: () => _showAddRoomSheet(ctx2, bloc),
                  onEditRoom: (room) => _showEditRoomSheet(ctx2, bloc, room),
                );
              }

              return _NarrowLayout(
                projectId: widget.projectId,
                state: state,
                showingDetail: _narrowShowingDetail,
                onRoomSelected: () => setState(() => _narrowShowingDetail = true),
                onBack: () => setState(() => _narrowShowingDetail = false),
                onAddRoom: () => _showAddRoomSheet(ctx2, bloc),
                onEditRoom: (room) => _showEditRoomSheet(ctx2, bloc, room),
              );
            },
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wide Layout
// ─────────────────────────────────────────────────────────────────────────────

class _WideLayout extends StatelessWidget {
  final String projectId;
  final AuditState state;
  final VoidCallback onAddRoom;
  final void Function(Room) onEditRoom;

  const _WideLayout({
    required this.projectId,
    required this.state,
    required this.onAddRoom,
    required this.onEditRoom,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final panelColor =
        isDark ? const Color(0xFF151B23) : cs.surfaceContainerLowest;

    return Row(
      children: [
        // Left panel — fixed 280px
        SizedBox(
          width: 280,
          child: Container(
            color: panelColor,
            child: _LeftPanel(
              projectId: projectId,
              state: state,
              onAddRoom: onAddRoom,
            ),
          ),
        ),
        // Vertical divider
        VerticalDivider(
          width: 1,
          thickness: 1,
          color: isDark
              ? Colors.white.withAlpha(10)
              : cs.outlineVariant.withAlpha(60),
        ),
        // Right panel — flex
        Expanded(
          child: _RightPanel(
            projectId: projectId,
            state: state,
            onEditRoom: onEditRoom,
            onBack: null,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Narrow Layout
// ─────────────────────────────────────────────────────────────────────────────

class _NarrowLayout extends StatelessWidget {
  final String projectId;
  final AuditState state;
  final bool showingDetail;
  final VoidCallback onRoomSelected;
  final VoidCallback onBack;
  final VoidCallback onAddRoom;
  final void Function(Room) onEditRoom;

  const _NarrowLayout({
    required this.projectId,
    required this.state,
    required this.showingDetail,
    required this.onRoomSelected,
    required this.onBack,
    required this.onAddRoom,
    required this.onEditRoom,
  });

  @override
  Widget build(BuildContext context) {
    if (showingDetail) {
      return _RightPanel(
        projectId: projectId,
        state: state,
        onEditRoom: onEditRoom,
        onBack: onBack,
      );
    }

    return _LeftPanel(
      projectId: projectId,
      state: state,
      onAddRoom: onAddRoom,
      onRoomTap: onRoomSelected,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Left Panel
// ─────────────────────────────────────────────────────────────────────────────

class _LeftPanel extends StatelessWidget {
  final String projectId;
  final AuditState state;
  final VoidCallback onAddRoom;
  final VoidCallback? onRoomTap;

  const _LeftPanel({
    required this.projectId,
    required this.state,
    required this.onAddRoom,
    this.onRoomTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final topPad = MediaQuery.of(context).padding.top;

    return Column(
      children: [
        // ── Top header ──────────────────────────────────────────────────────
        Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.md,
            topPad + AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.sm,
          ),
          child: Row(
            children: [
              // Back to project
              Tooltip(
                message: 'Retour au projet',
                child: InkWell(
                  onTap: () => context.goToProjectDetail(projectId),
                  borderRadius: AppRadius.borderRadiusMd,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xs,
                      vertical: AppSpacing.xs,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.arrow_back_ios_new_rounded,
                          size: 14,
                          color: cs.onSurfaceVariant,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          'Projet',
                          style: tt.labelSmall?.copyWith(
                            color: cs.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const Spacer(),
              // AUDIT label
              Text(
                'AUDIT',
                style: tt.labelSmall?.copyWith(
                  color: cs.primary,
                  letterSpacing: 1.5,
                ),
              ),
              const Spacer(),
              // Add room
              Tooltip(
                message: 'Ajouter une pièce',
                child: SizedBox(
                  width: 40,
                  height: 40,
                  child: IconButton(
                    icon: const Icon(Icons.add_rounded),
                    iconSize: 20,
                    onPressed: onAddRoom,
                    padding: EdgeInsets.zero,
                    style: IconButton.styleFrom(
                      backgroundColor: cs.primary.withAlpha(20),
                      foregroundColor: cs.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: AppRadius.borderRadiusSm,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // ── Progress summary ─────────────────────────────────────────────────
        if (state is AuditLoaded)
          _ProgressSummary(state: state as AuditLoaded),

        const Divider(height: 1, thickness: 1),

        // ── Room list ─────────────────────────────────────────────────────────
        Expanded(
          child: _buildRoomList(context, cs),
        ),
      ],
    );
  }

  Widget _buildRoomList(BuildContext context, ColorScheme cs) {
    if (state is AuditLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is AuditError) {
      return Center(
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: cs.error),
              AppSpacing.vGapMd,
              Text(
                (state as AuditError).message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      );
    }

    if (state is! AuditLoaded) return const SizedBox.shrink();

    final loaded = state as AuditLoaded;

    if (loaded.rooms.isEmpty) {
      return Center(
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.home_work_outlined,
                size: 64,
                color: cs.onSurfaceVariant,
              ),
              AppSpacing.vGapMd,
              Text(
                'Aucune pièce',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              AppSpacing.vGapSm,
              Text(
                'Ajoutez des pièces pour commencer l\'audit.',
                style: Theme.of(context).textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              AppSpacing.vGapLg,
              FilledButton.icon(
                onPressed: onAddRoom,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Ajouter une pièce'),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      itemCount: loaded.rooms.length,
      itemBuilder: (ctx, i) {
        final room = loaded.rooms[i];
        final isSelected = loaded.selectedRoom?.id == room.id;
        return _RoomListCard(
          room: room,
          isSelected: isSelected,
          onTap: () {
            HapticFeedback.selectionClick();
            context.read<AuditBloc>().add(AuditRoomSelected(room));
            onRoomTap?.call();
          },
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress summary widget
// ─────────────────────────────────────────────────────────────────────────────

class _ProgressSummary extends StatelessWidget {
  final AuditLoaded state;

  const _ProgressSummary({required this.state});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final pct = state.completionPercentage;
    final pctColor = _progressColor(pct);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${(pct * 100).round()}% complété',
                style: tt.labelMedium?.copyWith(color: pctColor),
              ),
              Text(
                '${state.rooms.length} pièce${state.rooms.length > 1 ? 's' : ''} · ${state.totalPhotos} photo${state.totalPhotos > 1 ? 's' : ''}',
                style: tt.labelSmall,
              ),
            ],
          ),
          AppSpacing.vGapXs,
          ClipRRect(
            borderRadius: AppRadius.borderRadiusFull,
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 5,
              backgroundColor: cs.outlineVariant.withAlpha(40),
              valueColor: AlwaysStoppedAnimation<Color>(pctColor),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Room list card
// ─────────────────────────────────────────────────────────────────────────────

class _RoomListCard extends StatelessWidget {
  final Room room;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoomListCard({
    required this.room,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progress = room.checklistProgress;
    final iconColor = isSelected ? cs.primary : _progressColor(progress);

    return Stack(
      children: [
        // Selection background
        if (isSelected)
          Positioned.fill(
            child: Container(
              color: cs.primary.withAlpha(isDark ? 20 : 12),
            ),
          ),

        // Left accent bar
        Positioned(
          left: 0,
          top: 4,
          bottom: 4,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 3,
            decoration: BoxDecoration(
              color: isSelected ? cs.primary : Colors.transparent,
              borderRadius: const BorderRadius.horizontal(
                right: Radius.circular(AppRadius.xs),
              ),
            ),
          ),
        ),

        // Main content
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: 10,
              ),
              child: Row(
                children: [
                  // Room icon container
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: iconColor.withAlpha(isDark ? 30 : 20),
                      borderRadius: AppRadius.borderRadiusSm,
                    ),
                    child: Icon(
                      _roomIcon(room.type),
                      size: 20,
                      color: iconColor,
                    ),
                  ),
                  AppSpacing.hGapSm,

                  // Name + subtitle
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          room.displayName,
                          style: tt.labelMedium?.copyWith(
                            fontWeight: isSelected
                                ? FontWeight.w700
                                : FontWeight.w600,
                            color: isSelected ? cs.primary : cs.onSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${room.checkedItemsCount}/${room.checklist.length} · ${room.photoCount} photo${room.photoCount > 1 ? 's' : ''}',
                          style: tt.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  AppSpacing.hGapSm,

                  // Progress ring
                  SizedBox(
                    width: 36,
                    height: 36,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CircularProgressIndicator(
                          value: progress,
                          strokeWidth: 3,
                          backgroundColor:
                              cs.outlineVariant.withAlpha(40),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _progressColor(progress),
                          ),
                        ),
                        if (progress > 0)
                          Text(
                            '${(progress * 100).round()}',
                            style: tt.labelSmall?.copyWith(
                              fontSize: 9,
                              color: _progressColor(progress),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Right Panel
// ─────────────────────────────────────────────────────────────────────────────

class _RightPanel extends StatelessWidget {
  final String projectId;
  final AuditState state;
  final void Function(Room) onEditRoom;
  final VoidCallback? onBack;

  const _RightPanel({
    required this.projectId,
    required this.state,
    required this.onEditRoom,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    if (state is! AuditLoaded) {
      return const SizedBox.shrink();
    }

    final loaded = state as AuditLoaded;
    final room = loaded.selectedRoom;

    if (room == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.touch_app_outlined,
              size: 64,
              color: cs.onSurfaceVariant,
            ),
            AppSpacing.vGapMd,
            Text(
              'Sélectionnez une pièce',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      );
    }

    return DefaultTabController(
      length: 3,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _RoomDetailHeader(
            room: room,
            onEdit: () => onEditRoom(room),
            onBack: onBack,
            projectId: projectId,
          ),
          _buildTabBar(context, room),
          Expanded(
            child: TabBarView(
              children: [
                _ChecklistTab(room: room, projectId: projectId, roomId: room.id),
                _PhotosTab(room: room),
                _NotesTab(room: room),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar(BuildContext context, Room room) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? Colors.white.withAlpha(10)
                : cs.outlineVariant.withAlpha(60),
          ),
        ),
      ),
      child: TabBar(
        tabs: [
          Tab(
            child: _TabLabel(
              label: 'Checklist',
              badge:
                  '${room.checkedItemsCount}/${room.checklist.length}',
            ),
          ),
          Tab(
            child: _TabLabel(
              label: 'Photos',
              badge: '${room.photoCount}',
            ),
          ),
          const Tab(text: 'Notes'),
        ],
      ),
    );
  }
}

class _TabLabel extends StatelessWidget {
  final String label;
  final String badge;

  const _TabLabel({required this.label, required this.badge});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
          decoration: BoxDecoration(
            color: cs.primary.withAlpha(20),
            borderRadius: AppRadius.borderRadiusFull,
          ),
          child: Text(
            badge,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: cs.primary,
                  fontSize: 10,
                ),
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Room detail header
// ─────────────────────────────────────────────────────────────────────────────

class _RoomDetailHeader extends StatelessWidget {
  final Room room;
  final VoidCallback onEdit;
  final VoidCallback? onBack;
  final String projectId;

  const _RoomDetailHeader({
    required this.room,
    required this.onEdit,
    required this.onBack,
    required this.projectId,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progress = room.checklistProgress;
    final iconColor = _progressColor(progress);
    final topPad = MediaQuery.of(context).padding.top;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.md,
        topPad + AppSpacing.sm,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Back button (narrow mode)
          if (onBack != null) ...[
            Tooltip(
              message: 'Retour aux pièces',
              child: SizedBox(
                width: 48,
                height: 48,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    onBack!();
                  },
                  tooltip: 'Pièces',
                ),
              ),
            ),
            AppSpacing.hGapSm,
          ],

          // Icon container 44x44
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconColor.withAlpha(isDark ? 35 : 22),
              borderRadius: AppRadius.borderRadiusMd,
            ),
            child: Icon(
              _roomIcon(room.type),
              size: 22,
              color: iconColor,
            ),
          ),
          AppSpacing.hGapSm,

          // Name + badges
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  room.displayName,
                  style: tt.titleMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: [
                    _SmallBadge(label: room.type.displayName, color: cs.primary),
                    if (room.floor != 0)
                      _SmallBadge(
                        label: room.floor > 0
                            ? 'Étage ${room.floor}'
                            : 'Sous-sol',
                        color: cs.secondary,
                      ),
                    _SmallBadge(
                      label:
                          '${room.checkedItemsCount}/${room.checklist.length} items',
                      color: iconColor,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Action buttons
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Plan button
              Tooltip(
                message: 'Plan de la pièce',
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: IconButton(
                    icon: const Icon(Icons.map_outlined, size: 20),
                    style: IconButton.styleFrom(
                      backgroundColor: cs.primary.withAlpha(isDark ? 30 : 18),
                      foregroundColor: cs.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: AppRadius.borderRadiusSm,
                      ),
                    ),
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      context.goToFloorPlan(
                        projectId,
                        room.id,
                        roomName: room.displayName,
                      );
                    },
                  ),
                ),
              ),
              AppSpacing.hGapXs,

              // Camera button
              Tooltip(
                message: 'Prendre une photo',
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: IconButton(
                    icon: const Icon(Icons.camera_alt_outlined, size: 20),
                    onPressed: () => _pickPhoto(context, ImageSource.camera),
                  ),
                ),
              ),
              AppSpacing.hGapXs,

              // Gallery button
              Tooltip(
                message: 'Galerie photos',
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: IconButton(
                    icon: const Icon(Icons.photo_library_outlined, size: 20),
                    onPressed: () => _pickPhoto(context, ImageSource.gallery),
                  ),
                ),
              ),
              AppSpacing.hGapXs,

              // Edit button
              Tooltip(
                message: 'Modifier la pièce',
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 20),
                    onPressed: onEdit,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _pickPhoto(BuildContext context, ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 85);
    if (picked != null && context.mounted) {
      HapticFeedback.lightImpact();
      context
          .read<AuditBloc>()
          .add(AuditPhotoCaptured(localPath: picked.path));
    }
  }
}

class _SmallBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _SmallBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: AppRadius.borderRadiusFull,
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontSize: 10,
            ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist Tab
// ─────────────────────────────────────────────────────────────────────────────

class _ChecklistTab extends StatefulWidget {
  final Room room;
  final String projectId;
  final String roomId;

  const _ChecklistTab({
    required this.room,
    required this.projectId,
    required this.roomId,
  });

  @override
  State<_ChecklistTab> createState() => _ChecklistTabState();
}

class _ChecklistTabState extends State<_ChecklistTab> {
  _ChecklistFilter _filter = _ChecklistFilter.all;

  List<ChecklistItem> _filterItems(List<ChecklistItem> items) {
    switch (_filter) {
      case _ChecklistFilter.all:
        return items;
      case _ChecklistFilter.pending:
        return items.where((i) => !i.isChecked).toList();
      case _ChecklistFilter.done:
        return items.where((i) => i.isChecked).toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final checklist = widget.room.checklist;

    return Column(
      children: [
        // Filter row
        _buildFilterRow(cs),

        // Content
        Expanded(
          child: checklist.isEmpty
              ? _buildEmptyState(context, cs)
              : _buildCategoryList(context, cs),
        ),
      ],
    );
  }

  Widget _buildFilterRow(ColorScheme cs) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          _FilterChip(
            label: 'Tout',
            isSelected: _filter == _ChecklistFilter.all,
            onTap: () => setState(() => _filter = _ChecklistFilter.all),
            cs: cs,
          ),
          AppSpacing.hGapSm,
          _FilterChip(
            label: 'À faire',
            isSelected: _filter == _ChecklistFilter.pending,
            onTap: () => setState(() => _filter = _ChecklistFilter.pending),
            cs: cs,
          ),
          AppSpacing.hGapSm,
          _FilterChip(
            label: 'Faits',
            isSelected: _filter == _ChecklistFilter.done,
            onTap: () => setState(() => _filter = _ChecklistFilter.done),
            cs: cs,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, ColorScheme cs) {
    return Center(
      child: Padding(
        padding: AppSpacing.cardPadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.checklist_rtl_outlined,
              size: 64,
              color: cs.onSurfaceVariant,
            ),
            AppSpacing.vGapMd,
            Text(
              'Checklist vide',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            AppSpacing.vGapSm,
            Text(
              'Chargez un modèle ou ajoutez des items manuellement.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            AppSpacing.vGapLg,
            FilledButton.icon(
              onPressed: () => _loadTemplate(context),
              icon: const Icon(Icons.download_outlined, size: 18),
              label: const Text('Charger le modèle'),
            ),
            AppSpacing.vGapSm,
            TextButton(
              onPressed: () => _showAddItemDialog(context),
              child: const Text('Ajouter manuellement'),
            ),
          ],
        ),
      ),
    );
  }

  void _loadTemplate(BuildContext context) {
    final room = widget.room;
    final templates = ChecklistTemplates.forRoomType(room.type.apiValue);
    final bloc = context.read<AuditBloc>();
    for (final item in templates) {
      bloc.add(AuditAddChecklistItemRequested(
        label: item.label,
        category: item.category,
      ));
    }
    HapticFeedback.lightImpact();
  }

  Widget _buildCategoryList(BuildContext context, ColorScheme cs) {
    final categorized = widget.room.itemsByCategory;
    final categories = categorized.keys.toList();

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 80),
      itemCount: categories.length + 1,
      itemBuilder: (ctx, idx) {
        if (idx == categories.length) {
          // Add item button
          return Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.md,
            ),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _showAddItemDialog(context),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Ajouter un item'),
              ),
            ),
          );
        }

        final cat = categories[idx];
        final items = categorized[cat] ?? [];
        final filtered = _filterItems(items);
        if (filtered.isEmpty) return const SizedBox.shrink();

        return _CategorySection(
          category: cat,
          items: items,
          filteredItems: filtered,
          cs: cs,
          projectId: widget.projectId,
          roomId: widget.roomId,
        );
      },
    );
  }

  void _showAddItemDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (_) => _AddItemDialog(
        onAdd: (label, category) {
          context.read<AuditBloc>().add(AuditAddChecklistItemRequested(
                label: label,
                category: category,
              ));
        },
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final ColorScheme cs;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        constraints: const BoxConstraints(minHeight: 36),
        decoration: BoxDecoration(
          color: isSelected ? cs.primary : cs.surfaceContainerHighest,
          borderRadius: AppRadius.borderRadiusFull,
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: isSelected ? cs.onPrimary : cs.onSurfaceVariant,
              ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Section
// ─────────────────────────────────────────────────────────────────────────────

class _CategorySection extends StatelessWidget {
  final ChecklistCategory category;
  final List<ChecklistItem> items;
  final List<ChecklistItem> filteredItems;
  final ColorScheme cs;
  final String projectId;
  final String roomId;

  const _CategorySection({
    required this.category,
    required this.items,
    required this.filteredItems,
    required this.cs,
    required this.projectId,
    required this.roomId,
  });

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final catColor = _catColor(category, cs);
    final checkedCount = items.where((i) => i.isChecked).length;
    final totalCount = items.length;
    final catProgress = totalCount > 0 ? checkedCount / totalCount : 0.0;
    final hasIncomplete = items.any((i) => !i.isChecked);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.xs,
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: catColor.withAlpha(20),
                  borderRadius: AppRadius.borderRadiusXs,
                ),
                child: Icon(_catIcon(category), size: 16, color: catColor),
              ),
              AppSpacing.hGapSm,
              Expanded(
                child: Text(
                  category.displayName,
                  style: tt.labelMedium?.copyWith(
                    color: catColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              // X/Y badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: catColor.withAlpha(18),
                  borderRadius: AppRadius.borderRadiusFull,
                ),
                child: Text(
                  '$checkedCount/$totalCount',
                  style: tt.labelSmall?.copyWith(
                    color: catColor,
                    fontSize: 10,
                  ),
                ),
              ),
              // Tout cocher
              if (hasIncomplete)
                TextButton(
                  onPressed: () => _checkAll(context),
                  style: TextButton.styleFrom(
                    minimumSize: const Size(60, 36),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: Text(
                    'Tout cocher',
                    style: tt.labelSmall?.copyWith(color: cs.primary),
                  ),
                ),
            ],
          ),
        ),

        // Progress bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: ClipRRect(
            borderRadius: AppRadius.borderRadiusFull,
            child: LinearProgressIndicator(
              value: catProgress,
              minHeight: 3,
              backgroundColor: cs.outlineVariant.withAlpha(40),
              valueColor: AlwaysStoppedAnimation<Color>(catColor),
            ),
          ),
        ),
        AppSpacing.vGapXs,

        // Items
        ...filteredItems.map(
          (item) => _ChecklistItemTile(item: item, projectId: projectId, roomId: roomId),
        ),
      ],
    );
  }

  void _checkAll(BuildContext context) {
    HapticFeedback.lightImpact();
    final bloc = context.read<AuditBloc>();
    for (final item in items.where((i) => !i.isChecked)) {
      bloc.add(AuditToggleChecklistItemRequested(
        itemId: item.id,
        isChecked: true,
      ));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist item tile
// ─────────────────────────────────────────────────────────────────────────────

class _ChecklistItemTile extends StatelessWidget {
  final ChecklistItem item;
  final String projectId;
  final String roomId;

  const _ChecklistItemTile({
    required this.item,
    required this.projectId,
    required this.roomId,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          context.read<AuditBloc>().add(AuditToggleChecklistItemRequested(
                itemId: item.id,
                isChecked: !item.isChecked,
              ));
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: 10,
          ),
          child: Row(
            children: [
              // Custom checkbox 22x22
              _CustomCheckbox(isChecked: item.isChecked, cs: cs),
              AppSpacing.hGapSm,

              // Label
              Expanded(
                child: Text(
                  item.label,
                  style: tt.bodyMedium?.copyWith(
                    color: item.isChecked
                        ? cs.onSurfaceVariant
                        : cs.onSurface,
                    decoration: item.isChecked
                        ? TextDecoration.lineThrough
                        : null,
                    decorationColor: cs.onSurfaceVariant,
                  ),
                ),
              ),

              // Notes indicator
              if (item.notes != null && item.notes!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(left: AppSpacing.xs),
                  child: Tooltip(
                    message: item.notes!,
                    child: Icon(
                      Icons.notes_outlined,
                      size: 16,
                      color: cs.onSurfaceVariant,
                    ),
                  ),
                ),

              // Quantity control
              Padding(
                padding: const EdgeInsets.only(left: AppSpacing.sm),
                child: _QuantityControl(item: item, isDark: isDark, cs: cs),
              ),

              // Placer sur plan button
              Tooltip(
                message: 'Placer sur le plan',
                child: SizedBox(
                  width: 32,
                  height: 32,
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    icon: Icon(Icons.map_outlined, size: 16, color: cs.primary.withAlpha(180)),
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      context.goToFloorPlan(projectId, roomId, roomName: null);
                    },
                    tooltip: 'Placer sur le plan',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CustomCheckbox extends StatelessWidget {
  final bool isChecked;
  final ColorScheme cs;

  const _CustomCheckbox({required this.isChecked, required this.cs});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        color: isChecked ? cs.primary : Colors.transparent,
        border: Border.all(
          color: isChecked ? cs.primary : cs.outline,
          width: 1.5,
        ),
        borderRadius: AppRadius.borderRadiusXs,
      ),
      child: isChecked
          ? Icon(
              Icons.check_rounded,
              size: 14,
              color: cs.onPrimary,
            )
          : null,
    );
  }
}

class _QuantityControl extends StatelessWidget {
  final ChecklistItem item;
  final bool isDark;
  final ColorScheme cs;

  const _QuantityControl({
    required this.item,
    required this.isDark,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    if (item.quantity == null) {
      // Small "Qté +" button
      return GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          context.read<AuditBloc>().add(
                AuditUpdateChecklistQuantityRequested(
                  itemId: item.id,
                  quantity: 1,
                ),
              );
        },
        child: Container(
          height: 28,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withAlpha(10)
                : cs.surfaceContainerHighest,
            borderRadius: AppRadius.borderRadiusSm,
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Qté',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: cs.onSurfaceVariant,
                      fontSize: 10,
                    ),
              ),
              const SizedBox(width: 2),
              Icon(Icons.add_rounded, size: 12, color: cs.onSurfaceVariant),
            ],
          ),
        ),
      );
    }

    // [-] [N] [+] row
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _QtyButton(
          icon: Icons.remove_rounded,
          cs: cs,
          isDark: isDark,
          onTap: () {
            HapticFeedback.selectionClick();
            final newQty = item.quantity! - 1;
            context.read<AuditBloc>().add(
                  AuditUpdateChecklistQuantityRequested(
                    itemId: item.id,
                    quantity: newQty < 0 ? 0 : newQty,
                  ),
                );
          },
        ),
        SizedBox(
          width: 26,
          child: Text(
            '${item.quantity}',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelMedium,
          ),
        ),
        _QtyButton(
          icon: Icons.add_rounded,
          cs: cs,
          isDark: isDark,
          onTap: () {
            HapticFeedback.selectionClick();
            context.read<AuditBloc>().add(
                  AuditUpdateChecklistQuantityRequested(
                    itemId: item.id,
                    quantity: item.quantity! + 1,
                  ),
                );
          },
        ),
      ],
    );
  }
}

class _QtyButton extends StatelessWidget {
  final IconData icon;
  final ColorScheme cs;
  final bool isDark;
  final VoidCallback onTap;

  const _QtyButton({
    required this.icon,
    required this.cs,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withAlpha(10)
              : cs.surfaceContainerHighest,
          borderRadius: AppRadius.borderRadiusXs,
        ),
        child: Icon(icon, size: 14, color: cs.onSurfaceVariant),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Photos Tab
// ─────────────────────────────────────────────────────────────────────────────

class _PhotosTab extends StatelessWidget {
  final Room room;

  const _PhotosTab({required this.room});

  @override
  Widget build(BuildContext context) {
    if (room.photos.isEmpty) {
      return _buildEmptyState(context);
    }
    return _buildGrid(context);
  }

  Widget _buildEmptyState(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.photo_camera_outlined, size: 64, color: cs.onSurfaceVariant),
          AppSpacing.vGapMd,
          Text(
            'Aucune photo',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          AppSpacing.vGapSm,
          Text(
            'Capturez l\'état de la pièce avec des photos.',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          AppSpacing.vGapLg,
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton.icon(
                onPressed: () => _pickPhoto(context, ImageSource.camera),
                icon: const Icon(Icons.camera_alt_outlined, size: 18),
                label: const Text('Appareil photo'),
              ),
              AppSpacing.hGapSm,
              OutlinedButton.icon(
                onPressed: () => _pickPhoto(context, ImageSource.gallery),
                icon: const Icon(Icons.photo_library_outlined, size: 18),
                label: const Text('Galerie'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGrid(BuildContext context) {
    return Stack(
      children: [
        LayoutBuilder(
          builder: (ctx, constraints) {
            final width = constraints.maxWidth;
            final cols = (width / 200).floor().clamp(2, 5);

            return GridView.builder(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                80,
              ),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: cols,
                crossAxisSpacing: AppSpacing.sm,
                mainAxisSpacing: AppSpacing.sm,
              ),
              itemCount: room.photos.length,
              itemBuilder: (_, idx) {
                return _PhotoCard(photo: room.photos[idx]);
              },
            );
          },
        ),

        // Bottom action row
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            height: 72,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [
                  Theme.of(context).scaffoldBackgroundColor,
                  Theme.of(context).scaffoldBackgroundColor.withAlpha(0),
                ],
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FilledButton.icon(
                  onPressed: () => _pickPhoto(context, ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined, size: 18),
                  label: const Text('Photo'),
                ),
                AppSpacing.hGapSm,
                OutlinedButton.icon(
                  onPressed: () => _pickPhoto(context, ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined, size: 18),
                  label: const Text('Galerie'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _pickPhoto(BuildContext context, ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 85);
    if (picked != null && context.mounted) {
      HapticFeedback.lightImpact();
      context
          .read<AuditBloc>()
          .add(AuditPhotoCaptured(localPath: picked.path));
    }
  }
}

class _PhotoCard extends StatelessWidget {
  final RoomPhoto photo;

  const _PhotoCard({required this.photo});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(
      clipBehavior: Clip.antiAlias,
      children: [
        // Image
        ClipRRect(
          borderRadius: AppRadius.borderRadiusLg,
          child: CachedNetworkImage(
            imageUrl: photo.url,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
            placeholder: (_, _) => Container(
              color: isDark
                  ? const Color(0xFF1A2130)
                  : cs.surfaceContainerHighest,
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: cs.primary,
                ),
              ),
            ),
            errorWidget: (_, _, _) => Container(
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF1A2130)
                    : cs.surfaceContainerHighest,
                borderRadius: AppRadius.borderRadiusLg,
              ),
              child: Center(
                child: Icon(
                  Icons.broken_image_outlined,
                  color: cs.onSurfaceVariant,
                  size: 32,
                ),
              ),
            ),
          ),
        ),

        // Caption overlay at bottom
        if (photo.caption != null && photo.caption!.isNotEmpty)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(AppRadius.lg),
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                color: Colors.black.withAlpha(140),
                child: Text(
                  photo.caption!,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontSize: 10,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ),

        // Delete button top-right
        Positioned(
          top: 6,
          right: 6,
          child: Tooltip(
            message: 'Supprimer la photo',
            child: GestureDetector(
              onTap: () => _confirmDelete(context),
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: cs.error,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.close_rounded,
                  size: 16,
                  color: cs.onError,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer la photo'),
        content: const Text('Cette action est irréversible.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      HapticFeedback.lightImpact();
      context.read<AuditBloc>().add(AuditDeletePhotoRequested(photo.id));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notes Tab
// ─────────────────────────────────────────────────────────────────────────────

class _NotesTab extends StatefulWidget {
  final Room room;

  const _NotesTab({required this.room});

  @override
  State<_NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends State<_NotesTab> {
  late TextEditingController _controller;
  Timer? _debounce;
  bool _showSaved = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.room.notes ?? '');
  }

  @override
  void didUpdateWidget(covariant _NotesTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.room.id != widget.room.id) {
      _controller.text = widget.room.notes ?? '';
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 800), () {
      if (!mounted) return;
      context.read<AuditBloc>().add(AuditUpdateNotesRequested(value));
      setState(() => _showSaved = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _showSaved = false);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          // Saved indicator
          AnimatedOpacity(
            opacity: _showSaved ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 300),
            child: Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.check_circle_outline_rounded,
                      size: 14,
                      color: AppTheme.successColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Sauvegardé',
                      style: tt.labelSmall?.copyWith(
                        color: AppTheme.successColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Text field
          Expanded(
            child: TextField(
              controller: _controller,
              onChanged: _onChanged,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              style: tt.bodyMedium,
              decoration: InputDecoration(
                hintText:
                    'Observations sur la pièce, points d\'attention, contraintes d\'installation…',
                hintStyle: tt.bodyMedium?.copyWith(
                  color: cs.onSurfaceVariant,
                ),
                filled: true,
                fillColor: isDark
                    ? const Color(0xFF1A2130)
                    : cs.surfaceContainerLowest,
                border: OutlineInputBorder(
                  borderRadius: AppRadius.borderRadiusLg,
                  borderSide: BorderSide(
                    color: isDark
                        ? Colors.white.withAlpha(12)
                        : cs.outlineVariant.withAlpha(60),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: AppRadius.borderRadiusLg,
                  borderSide: BorderSide(
                    color: isDark
                        ? Colors.white.withAlpha(12)
                        : cs.outlineVariant.withAlpha(60),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: AppRadius.borderRadiusLg,
                  borderSide: BorderSide(
                    color: cs.primary,
                    width: 2,
                  ),
                ),
                contentPadding: AppSpacing.cardPadding,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Room Sheet
// ─────────────────────────────────────────────────────────────────────────────

class _AddRoomSheet extends StatefulWidget {
  final void Function(String name, RoomType type) onAdd;

  const _AddRoomSheet({required this.onAdd});

  @override
  State<_AddRoomSheet> createState() => _AddRoomSheetState();
}

class _AddRoomSheetState extends State<_AddRoomSheet> {
  RoomType _selectedType = RoomType.salon;
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        AppSpacing.lg + bottomInset,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Text(
              'Ajouter une pièce',
              style: tt.titleLarge,
            ),
          ),
          AppSpacing.vGapLg,

          Text('Type de pièce', style: tt.labelMedium),
          AppSpacing.vGapSm,

          // Room type selector
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: RoomType.values.map((type) {
              final isSelected = _selectedType == type;
              return GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedType = type);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  constraints: const BoxConstraints(minHeight: 48),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? cs.primary
                        : cs.surfaceContainerHighest,
                    borderRadius: AppRadius.borderRadiusMd,
                    border: Border.all(
                      color: isSelected
                          ? cs.primary
                          : cs.outlineVariant.withAlpha(60),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _roomIcon(type),
                        size: 18,
                        color: isSelected
                            ? cs.onPrimary
                            : cs.onSurfaceVariant,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        type.displayName,
                        style: tt.labelMedium?.copyWith(
                          color: isSelected
                              ? cs.onPrimary
                              : cs.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          AppSpacing.vGapLg,

          Text('Nom (optionnel)', style: tt.labelMedium),
          AppSpacing.vGapSm,
          TextField(
            controller: _nameController,
            textInputAction: TextInputAction.done,
            decoration: InputDecoration(
              hintText: _selectedType.displayName,
            ),
            onSubmitted: (_) => _submit(),
          ),
          AppSpacing.vGapLg,

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text('Ajouter ${_selectedType.displayName}'),
            ),
          ),
        ],
      ),
    );
  }

  void _submit() {
    HapticFeedback.lightImpact();
    widget.onAdd(_nameController.text, _selectedType);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Room Sheet
// ─────────────────────────────────────────────────────────────────────────────

class _EditRoomSheet extends StatefulWidget {
  final Room room;
  final void Function(Room updated) onSave;
  final VoidCallback onDelete;

  const _EditRoomSheet({
    required this.room,
    required this.onSave,
    required this.onDelete,
  });

  @override
  State<_EditRoomSheet> createState() => _EditRoomSheetState();
}

class _EditRoomSheetState extends State<_EditRoomSheet> {
  late RoomType _selectedType;
  late TextEditingController _nameController;
  late int _floor;

  @override
  void initState() {
    super.initState();
    _selectedType = widget.room.type;
    _nameController = TextEditingController(text: widget.room.name);
    _floor = widget.room.floor;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        AppSpacing.lg + bottomInset,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Text('Modifier la pièce', style: tt.titleLarge),
          ),
          AppSpacing.vGapLg,

          Text('Type de pièce', style: tt.labelMedium),
          AppSpacing.vGapSm,

          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: RoomType.values.map((type) {
              final isSelected = _selectedType == type;
              return GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedType = type);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  constraints: const BoxConstraints(minHeight: 48),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? cs.primary
                        : cs.surfaceContainerHighest,
                    borderRadius: AppRadius.borderRadiusMd,
                    border: Border.all(
                      color: isSelected
                          ? cs.primary
                          : cs.outlineVariant.withAlpha(60),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _roomIcon(type),
                        size: 18,
                        color: isSelected
                            ? cs.onPrimary
                            : cs.onSurfaceVariant,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        type.displayName,
                        style: tt.labelMedium?.copyWith(
                          color: isSelected
                              ? cs.onPrimary
                              : cs.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          AppSpacing.vGapLg,

          Text('Nom', style: tt.labelMedium),
          AppSpacing.vGapSm,
          TextField(
            controller: _nameController,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(hintText: 'Nom de la pièce'),
          ),
          AppSpacing.vGapLg,

          Text('Étage', style: tt.labelMedium),
          AppSpacing.vGapSm,
          Row(
            children: [
              _QtyButton(
                icon: Icons.remove_rounded,
                cs: cs,
                isDark: isDark,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _floor--);
                },
              ),
              const SizedBox(width: 16),
              Text(
                _floor == 0
                    ? 'RDC'
                    : _floor > 0
                        ? 'Étage $_floor'
                        : 'Sous-sol ${_floor.abs()}',
                style: tt.bodyMedium,
              ),
              const SizedBox(width: 16),
              _QtyButton(
                icon: Icons.add_rounded,
                cs: cs,
                isDark: isDark,
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _floor++);
                },
              ),
            ],
          ),
          AppSpacing.vGapLg,

          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _confirmDelete,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: cs.error,
                    side: BorderSide(color: cs.error.withAlpha(120)),
                  ),
                  icon: const Icon(Icons.delete_outline_rounded, size: 18),
                  label: const Text('Supprimer'),
                ),
              ),
              AppSpacing.hGapSm,
              Expanded(
                child: FilledButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.save_outlined, size: 18),
                  label: const Text('Enregistrer'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _submit() {
    HapticFeedback.lightImpact();
    final updated = widget.room.copyWith(
      name: _nameController.text,
      type: _selectedType,
      floor: _floor,
    );
    widget.onSave(updated);
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer la pièce'),
        content: const Text(
          'La pièce et toutes ses données seront supprimées définitivement.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      HapticFeedback.lightImpact();
      widget.onDelete();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Item Dialog
// ─────────────────────────────────────────────────────────────────────────────

class _AddItemDialog extends StatefulWidget {
  final void Function(String label, ChecklistCategory category) onAdd;

  const _AddItemDialog({required this.onAdd});

  @override
  State<_AddItemDialog> createState() => _AddItemDialogState();
}

class _AddItemDialogState extends State<_AddItemDialog> {
  final _labelController = TextEditingController();
  ChecklistCategory _selectedCategory = ChecklistCategory.autre;

  @override
  void dispose() {
    _labelController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return AlertDialog(
      constraints: AppSpacing.dialogConstraints,
      title: const Text('Ajouter un item'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _labelController,
            autofocus: true,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              labelText: 'Description',
              hintText: 'Ex: Interrupteur connecté',
            ),
            onSubmitted: (_) => _submit(),
          ),
          AppSpacing.vGapLg,

          Text('Catégorie', style: tt.labelMedium),
          AppSpacing.vGapSm,

          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: ChecklistCategory.values.map((cat) {
              final isSelected = _selectedCategory == cat;
              final catColor = _catColor(cat, cs);
              return GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedCategory = cat);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 7,
                  ),
                  constraints: const BoxConstraints(minHeight: 36),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? catColor.withAlpha(30)
                        : cs.surfaceContainerHighest,
                    borderRadius: AppRadius.borderRadiusSm,
                    border: Border.all(
                      color: isSelected
                          ? catColor
                          : cs.outlineVariant.withAlpha(40),
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _catIcon(cat),
                        size: 14,
                        color: isSelected ? catColor : cs.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        cat.displayName,
                        style: tt.labelSmall?.copyWith(
                          color: isSelected ? catColor : cs.onSurface,
                          fontWeight: isSelected ? FontWeight.w700 : null,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Ajouter'),
        ),
      ],
    );
  }

  void _submit() {
    final label = _labelController.text.trim();
    if (label.isEmpty) return;
    HapticFeedback.lightImpact();
    widget.onAdd(label, _selectedCategory);
    Navigator.pop(context);
  }
}
