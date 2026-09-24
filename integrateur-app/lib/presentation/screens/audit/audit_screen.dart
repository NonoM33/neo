import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/checklist_item.dart';
import '../../../domain/entities/room.dart';
import '../../../routes/app_router.dart';
import '../../blocs/audit/audit_bloc.dart';
import '../../blocs/audit/audit_event.dart';
import '../../blocs/audit/audit_state.dart';
import '../../widgets/ds/ds.dart';
import 'widgets/generate_quote_button.dart';

/// Audit terrain — **le coeur du metier**, ecran immersif.
///
/// iPad paysage : trois zones (pieces 30 % / contenu / capture rapide).
/// iPad portrait : pieces en bandeau, contenu plein.
/// iPhone : deux niveaux — liste des pieces, puis la piece avec ses 4 onglets
/// et une navigation piece precedente / suivante permanente.
class AuditScreen extends ConsumerStatefulWidget {
  const AuditScreen({required this.projectId, super.key});

  final String projectId;

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  static const String _tabChecklist = 'checklist';
  static const String _tabPhotos = 'photos';
  static const String _tabNotes = 'notes';
  static const String _tabPlan = 'plan';

  String _tab = _tabChecklist;
  _ChecklistFilter _filter = _ChecklistFilter.all;

  @override
  void initState() {
    super.initState();
    ref.read(auditBlocProvider).add(AuditLoadRoomsRequested(widget.projectId));
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(auditBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocConsumer<AuditBloc, AuditState>(
        bloc: bloc,
        listener: (context, state) {
          if (state is AuditError) {
            showDsSnackbar(context, message: state.message, tone: DsTone.error);
          }
        },
        builder: (context, state) {
          if (state is AuditLoading || state is AuditInitial) {
            return const SafeArea(child: DsSkeletonList(count: 4));
          }
          if (state is AuditError) {
            return SafeArea(
              child: DsErrorState(
                kind: DsErrorKind.fromMessage(state.message),
                action: DsButton(
                  label: 'Réessayer',
                  icon: DsGlyph.refresh,
                  onPressed: () =>
                      bloc.add(AuditLoadRoomsRequested(widget.projectId)),
                ),
              ),
            );
          }
          if (state is! AuditLoaded) return const SizedBox.shrink();

          final percent = (state.completionPercentage * 100).round();
          final room = state.selectedRoom;
          final phoneShowsRoom = device.isPhone && room != null;

          return Column(
            children: [
              DsAppBar(
                immersive: true,
                title: phoneShowsRoom ? room.displayName : 'Audit terrain',
                subtitle: phoneShowsRoom
                    ? '${room.checkedItemsCount} sur ${room.checklist.length} besoins relevés'
                    : '${state.rooms.length} pièce${state.rooms.length > 1 ? 's' : ''} · $percent % relevé',
                backLabel: phoneShowsRoom
                    ? 'Retour aux pièces'
                    : 'Retour au projet',
                onBack: () {
                  if (phoneShowsRoom) {
                    bloc.add(const AuditRoomDeselected());
                  } else {
                    context.goToProjectDetail(widget.projectId);
                  }
                },
                actions: [
                  DsIconButton(
                    icon: DsGlyph.quote,
                    label: 'Voir le devis',
                    onPressed: () => context.goToQuote(widget.projectId),
                  ),
                ],
              ),
              Expanded(
                child: device.isPhone
                    ? (room == null
                        ? _RoomsPane(
                            state: state,
                            bloc: bloc,
                            projectId: widget.projectId,
                            percent: percent,
                            onSelect: (r) => bloc.add(AuditRoomSelected(r)),
                          )
                        : _RoomPane(
                            room: room,
                            state: state,
                            bloc: bloc,
                            projectId: widget.projectId,
                            tab: _tab,
                            onTab: (value) => setState(() => _tab = value),
                            filter: _filter,
                            onFilter: (value) =>
                                setState(() => _filter = value),
                          ))
                    : Row(
                        children: [
                          SizedBox(
                            width: (MediaQuery.sizeOf(context).width * 0.3)
                                .clamp(280.0, 380.0),
                            child: _RoomsPane(
                              state: state,
                              bloc: bloc,
                              projectId: widget.projectId,
                              percent: percent,
                              onSelect: (r) => bloc.add(AuditRoomSelected(r)),
                            ),
                          ),
                          VerticalDivider(width: 1, color: ds.borderSubtle),
                          Expanded(
                            child: room == null
                                ? const DsEmptyState(
                                    icon: DsGlyph.room,
                                    title: 'Sélectionnez une pièce',
                                    description:
                                        'Sa checklist, ses photos, ses notes et son plan s’affichent ici.',
                                  )
                                : _RoomPane(
                                    room: room,
                                    state: state,
                                    bloc: bloc,
                                    projectId: widget.projectId,
                                    tab: _tab,
                                    onTab: (value) =>
                                        setState(() => _tab = value),
                                    filter: _filter,
                                    onFilter: (value) =>
                                        setState(() => _filter = value),
                                  ),
                          ),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

enum _ChecklistFilter {
  all('Tout'),
  todo('À faire'),
  done('Faits');

  const _ChecklistFilter(this.label);
  final String label;
}

/// Zone 1 — les pieces, avec la progression globale et l'ajout.
class _RoomsPane extends StatelessWidget {
  const _RoomsPane({
    required this.state,
    required this.bloc,
    required this.projectId,
    required this.percent,
    required this.onSelect,
  });

  final AuditLoaded state;
  final AuditBloc bloc;
  final String projectId;
  final int percent;
  final ValueChanged<Room> onSelect;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);

    return Container(
      color: device.isPhone ? ds.surfaceBase : ds.surface1,
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(padding, DsSpacing.s4, padding, 0),
            child: DsAuditProgress(
              label: 'Audit du logement',
              percent: percent,
            ),
          ),
          const SizedBox(height: DsSpacing.s4),
          Expanded(
            child: state.rooms.isEmpty
                ? DsEmptyState(
                    icon: DsGlyph.room,
                    title: 'Aucune pièce dans cet audit',
                    description:
                        'Ajoutez les pièces à auditer : salon, cuisine, chambres, salle de bain…',
                    action: DsButton(
                      label: 'Ajouter une pièce',
                      icon: DsGlyph.add,
                      onPressed: () => _addRoom(context),
                    ),
                  )
                : ListView.separated(
                    padding: EdgeInsets.fromLTRB(
                      padding,
                      0,
                      padding,
                      DsSpacing.s16,
                    ),
                    itemCount: state.rooms.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: DsSpacing.s2),
                    itemBuilder: (context, index) {
                      final room = state.rooms[index];
                      final selected = room.id == state.selectedRoom?.id;
                      final roomPercent =
                          (room.checklistProgress * 100).round();

                      return DsCard(
                        selected: selected,
                        onTap: () => onSelect(room),
                        padding: const EdgeInsets.all(DsSpacing.s4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    room.displayName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: context.dsType.titleSize,
                                      fontWeight: DsWeight.semibold,
                                      letterSpacing: -0.2,
                                      color: ds.textPrimary,
                                    ),
                                  ),
                                ),
                                if (room.photoCount > 0) ...[
                                  DsIcon(
                                    DsGlyph.photoLibrary,
                                    size: 16,
                                    color: ds.textTertiary,
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    '${room.photoCount}',
                                    style: TextStyle(
                                      fontSize: context.dsType.badgeSize,
                                      fontFeatures: dsTabularFigures,
                                      color: ds.textSecondary,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            Text(
                              room.floor == 0
                                  ? 'Rez-de-chaussée'
                                  : room.floor < 0
                                      ? 'Sous-sol'
                                      : 'Étage ${room.floor}',
                              style: TextStyle(
                                fontSize: context.dsType.badgeSize,
                                color: ds.textSecondary,
                              ),
                            ),
                            const SizedBox(height: DsSpacing.s2),
                            DsAuditProgress(
                              label: 'Besoins relevés',
                              percent: roomPercent,
                              itemsDone: room.checkedItemsCount,
                              itemsTotal: room.checklist.length,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              padding,
              DsSpacing.s2,
              padding,
              DsSpacing.s4,
            ),
            child: Column(
              children: [
                DsButton(
                  label: 'Ajouter une pièce',
                  icon: DsGlyph.add,
                  variant: DsButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: () => _addRoom(context),
                ),
                if (state.rooms.isNotEmpty) ...[
                  const SizedBox(height: DsSpacing.s2),
                  GenerateQuoteButton(
                    projectId: projectId,
                    rooms: state.rooms,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _addRoom(BuildContext context) async {
    final nameController = TextEditingController();
    final surfaceController = TextEditingController();
    var type = RoomType.salon;

    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setSheetState) => DsDialog(
          title: 'Ajouter une pièce',
          description:
              'Le modèle de checklist correspondant au type est chargé automatiquement.',
          icon: DsGlyph.room,
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DsTextField(
                label: 'Nom de la pièce',
                controller: nameController,
                hintText: 'Salon, Chambre parentale…',
                required: true,
              ),
              const SizedBox(height: DsSpacing.s4),
              DsSelectField<RoomType>(
                label: 'Type',
                value: type,
                onChanged: (value) =>
                    setSheetState(() => type = value ?? RoomType.autre),
                items: [
                  for (final value in RoomType.values)
                    DsSelectItem(value: value, label: value.displayName),
                ],
              ),
              const SizedBox(height: DsSpacing.s4),
              DsTextField(
                label: 'Surface (m²)',
                controller: surfaceController,
                hintText: 'Optionnel',
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                textInputAction: TextInputAction.done,
              ),
            ],
          ),
          actions: [
            DsButton(
              label: 'Annuler',
              variant: DsButtonVariant.ghost,
              onPressed: () => Navigator.of(dialogContext).pop(false),
            ),
            DsButton(
              label: 'Ajouter',
              onPressed: () => Navigator.of(dialogContext).pop(true),
            ),
          ],
        ),
      ),
    );

    if ((created ?? false) && nameController.text.trim().isNotEmpty) {
      bloc.add(
        AuditAddRoomRequested(
          name: nameController.text.trim(),
          type: type,
          surfaceM2:
              double.tryParse(surfaceController.text.replaceAll(',', '.')),
        ),
      );
    }
    nameController.dispose();
    surfaceController.dispose();
  }
}

/// Zone 2 — la piece et ses quatre onglets.
class _RoomPane extends StatelessWidget {
  const _RoomPane({
    required this.room,
    required this.state,
    required this.bloc,
    required this.projectId,
    required this.tab,
    required this.onTab,
    required this.filter,
    required this.onFilter,
  });

  final Room room;
  final AuditLoaded state;
  final AuditBloc bloc;
  final String projectId;
  final String tab;
  final ValueChanged<String> onTab;
  final _ChecklistFilter filter;
  final ValueChanged<_ChecklistFilter> onFilter;

  @override
  Widget build(BuildContext context) {
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(padding, DsSpacing.s3, padding, 0),
          child: DsSegmentedTabs(
            activeId: tab,
            onChanged: onTab,
            items: [
              DsTabItem(
                id: _AuditScreenState._tabChecklist,
                label: 'Checklist',
                icon: DsGlyph.checklist,
                count: room.checklist.length,
              ),
              DsTabItem(
                id: _AuditScreenState._tabPhotos,
                label: 'Photos',
                icon: DsGlyph.photoLibrary,
                count: room.photoCount,
              ),
              const DsTabItem(
                id: _AuditScreenState._tabNotes,
                label: 'Notes',
                icon: DsGlyph.notes,
              ),
              const DsTabItem(
                id: _AuditScreenState._tabPlan,
                label: 'Plan',
                icon: DsGlyph.plan,
              ),
            ],
          ),
        ),
        Expanded(
          child: switch (tab) {
            _AuditScreenState._tabPhotos => _PhotosTab(room: room, bloc: bloc),
            _AuditScreenState._tabNotes => _NotesTab(room: room, bloc: bloc),
            _AuditScreenState._tabPlan =>
              _PlanTab(room: room, projectId: projectId),
            _ => _ChecklistTab(
                room: room,
                bloc: bloc,
                filter: filter,
                onFilter: onFilter,
              ),
          },
        ),
        if (device.isPhone) _RoomPager(state: state, room: room, bloc: bloc),
      ],
    );
  }
}

/// Navigation piece precedente / suivante — geste attendu, permanent sur iPhone.
class _RoomPager extends StatelessWidget {
  const _RoomPager({
    required this.state,
    required this.room,
    required this.bloc,
  });

  final AuditLoaded state;
  final Room room;
  final AuditBloc bloc;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final index = state.rooms.indexWhere((r) => r.id == room.id);
    final hasPrevious = index > 0;
    final hasNext = index >= 0 && index < state.rooms.length - 1;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DsSpacing.s3,
        vertical: DsSpacing.s2,
      ),
      decoration: BoxDecoration(
        color: ds.surface1,
        border: Border(top: BorderSide(color: ds.borderSubtle)),
        boxShadow: ds.elevationSticky,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            DsIconButton(
              icon: Icons.chevron_left_rounded,
              label: 'Pièce précédente',
              onPressed: hasPrevious
                  ? () => bloc.add(AuditRoomSelected(state.rooms[index - 1]))
                  : null,
            ),
            Expanded(
              child: Text(
                '${index + 1} sur ${state.rooms.length}',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: context.dsType.labelSize,
                  fontWeight: DsWeight.semibold,
                  fontFeatures: dsTabularFigures,
                  color: ds.textSecondary,
                ),
              ),
            ),
            DsIconButton(
              icon: Icons.chevron_right_rounded,
              label: 'Pièce suivante',
              onPressed: hasNext
                  ? () => bloc.add(AuditRoomSelected(state.rooms[index + 1]))
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _ChecklistTab extends StatelessWidget {
  const _ChecklistTab({
    required this.room,
    required this.bloc,
    required this.filter,
    required this.onFilter,
  });

  final Room room;
  final AuditBloc bloc;
  final _ChecklistFilter filter;
  final ValueChanged<_ChecklistFilter> onFilter;

  @override
  Widget build(BuildContext context) {
    final padding = DsSpacing.pagePadding(context.dsDevice);

    final grouped = <ChecklistCategory, List<ChecklistItem>>{};
    for (final item in room.checklist) {
      final keep = switch (filter) {
        _ChecklistFilter.all => true,
        _ChecklistFilter.todo => !item.isChecked,
        _ChecklistFilter.done => item.isChecked,
      };
      if (keep) grouped.putIfAbsent(item.category, () => []).add(item);
    }

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(padding, DsSpacing.s3, padding, 0),
          child: Row(
            children: [
              for (final value in _ChecklistFilter.values) ...[
                DsFilterChip(
                  label: value.label,
                  selected: filter == value,
                  onSelected: () => onFilter(value),
                ),
                const SizedBox(width: DsSpacing.s2),
              ],
            ],
          ),
        ),
        Expanded(
          child: grouped.isEmpty
              ? DsEmptyState(
                  compact: true,
                  icon: DsGlyph.checklist,
                  title: filter == _ChecklistFilter.done
                      ? 'Aucun besoin relevé pour l’instant'
                      : 'Tous les besoins sont relevés',
                  description: filter == _ChecklistFilter.done
                      ? 'Cochez les équipements repérés dans la pièce.'
                      : 'Cette pièce est complète, passez à la suivante.',
                )
              : ListView(
                  padding: EdgeInsets.fromLTRB(
                    padding,
                    DsSpacing.s3,
                    padding,
                    DsSpacing.s16,
                  ),
                  children: [
                    for (final entry in grouped.entries) ...[
                      DsSectionTitle(entry.key.displayName),
                      const SizedBox(height: DsSpacing.s2),
                      for (final item in entry.value) ...[
                        DsChecklistRow(
                          label: item.label,
                          checked: item.isChecked,
                          quantity: item.quantity ?? 1,
                          onToggle: () => bloc.add(
                            AuditToggleChecklistItemRequested(
                              itemId: item.id,
                              isChecked: !item.isChecked,
                            ),
                          ),
                          onQuantityChanged: (value) => bloc.add(
                            AuditUpdateChecklistQuantityRequested(
                              itemId: item.id,
                              quantity: value,
                            ),
                          ),
                          note: item.notes,
                        ),
                        const SizedBox(height: DsSpacing.s2),
                      ],
                      const SizedBox(height: DsSpacing.s4),
                    ],
                  ],
                ),
        ),
      ],
    );
  }
}

class _PhotosTab extends StatelessWidget {
  const _PhotosTab({required this.room, required this.bloc});

  final Room room;
  final AuditBloc bloc;

  @override
  Widget build(BuildContext context) {
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            padding,
            DsSpacing.s3,
            padding,
            DsSpacing.s3,
          ),
          child: Row(
            children: [
              Expanded(
                child: DsButton(
                  label: 'Prendre une photo',
                  icon: DsGlyph.photo,
                  size: DsButtonSize.large,
                  fullWidth: true,
                  onPressed: () =>
                      bloc.add(const AuditTakePhotoRequested()),
                ),
              ),
              const SizedBox(width: DsSpacing.s2),
              DsIconButton(
                icon: DsGlyph.photoLibrary,
                label: 'Choisir dans la galerie',
                large: true,
                filled: true,
                onPressed: () => bloc.add(const AuditPickPhotoRequested()),
              ),
            ],
          ),
        ),
        Expanded(
          child: room.photos.isEmpty
              ? const DsEmptyState(
                  compact: true,
                  icon: DsGlyph.photo,
                  title: 'Aucune photo dans cette pièce',
                  description:
                      'Photographiez le tableau électrique, les ouvrants, les plafonniers : ce sont vos preuves techniques.',
                )
              : GridView.builder(
                  padding: EdgeInsets.fromLTRB(
                    padding,
                    0,
                    padding,
                    DsSpacing.s16,
                  ),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: switch (device) {
                      DsDevice.phone => 3,
                      DsDevice.tablet => 4,
                      DsDevice.desktop => 5,
                    },
                    mainAxisSpacing: DsSpacing.s2,
                    crossAxisSpacing: DsSpacing.s2,
                  ),
                  itemCount: room.photos.length,
                  itemBuilder: (context, index) {
                    final photo = room.photos[index];
                    return DsPhotoThumb(
                      imageUrl: photo.url,
                      caption: photo.caption,
                      onDelete: () async {
                        final confirmed = await showDsConfirmDialog(
                          context,
                          title: 'Supprimer cette photo ?',
                          description:
                              'Elle disparaîtra de l’audit et du dossier client.',
                        );
                        if (confirmed) {
                          bloc.add(AuditDeletePhotoRequested(photo.id));
                        }
                      },
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _NotesTab extends StatefulWidget {
  const _NotesTab({required this.room, required this.bloc});

  final Room room;
  final AuditBloc bloc;

  @override
  State<_NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends State<_NotesTab> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.room.notes ?? '');
  bool _dirty = false;

  @override
  void didUpdateWidget(covariant _NotesTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.room.id != widget.room.id) {
      _controller.text = widget.room.notes ?? '';
      _dirty = false;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final padding = DsSpacing.pagePadding(context.dsDevice);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        padding,
        DsSpacing.s4,
        padding,
        DsSpacing.s16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DsTextField(
            label: 'Observations sur la pièce',
            controller: _controller,
            hintText:
                'Points d’attention, contraintes d’accès, souhaits du client…',
            maxLines: 10,
            minLines: 6,
            textInputAction: TextInputAction.newline,
            onChanged: (_) {
              if (!_dirty) setState(() => _dirty = true);
            },
          ),
          const SizedBox(height: DsSpacing.s4),
          DsButton(
            label: _dirty ? 'Enregistrer les notes' : 'Notes enregistrées',
            icon: _dirty ? Icons.save_rounded : DsGlyph.checkCircle,
            variant:
                _dirty ? DsButtonVariant.primary : DsButtonVariant.secondary,
            fullWidth: true,
            onPressed: _dirty
                ? () {
                    widget.bloc
                        .add(AuditUpdateNotesRequested(_controller.text));
                    setState(() => _dirty = false);
                    showDsSnackbar(
                      context,
                      message: 'Notes enregistrées',
                      tone: DsTone.success,
                    );
                  }
                : null,
          ),
        ],
      ),
    );
  }
}

class _PlanTab extends StatelessWidget {
  const _PlanTab({required this.room, required this.projectId});

  final Room room;
  final String projectId;

  @override
  Widget build(BuildContext context) {
    final padding = DsSpacing.pagePadding(context.dsDevice);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        padding,
        DsSpacing.s4,
        padding,
        DsSpacing.s16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DsScanBanner(
            state: DsScanState.available,
            actions: [
              DsButton(
                label: 'Ouvrir le plan de la pièce',
                icon: DsGlyph.plan,
                size: DsButtonSize.large,
                onPressed: () => context.goToFloorPlan(
                  projectId,
                  room.id,
                  roomName: room.displayName,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
