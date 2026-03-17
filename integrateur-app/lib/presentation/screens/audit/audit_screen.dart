import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/room.dart';
import '../../../routes/app_router.dart';
import '../../blocs/audit/audit_bloc.dart';
import '../../blocs/audit/audit_event.dart';
import '../../blocs/audit/audit_state.dart';

/// Audit screen for managing room audits - tablet optimized
class AuditScreen extends ConsumerStatefulWidget {
  final String projectId;

  const AuditScreen({
    super.key,
    required this.projectId,
  });

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(auditBlocProvider).add(AuditLoadRoomsRequested(widget.projectId));
  }

  @override
  Widget build(BuildContext context) {
    final auditBloc = ref.watch(auditBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_home_work),
            onPressed: () => _showAddRoomDialog(context),
            tooltip: 'Ajouter une piece',
          ),
        ],
      ),
      body: BlocBuilder<AuditBloc, AuditState>(
        bloc: auditBloc,
        builder: (context, state) {
          if (state is AuditLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is AuditError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: colorScheme.error),
                  AppSpacing.vGapMd,
                  Text(state.message, style: Theme.of(context).textTheme.bodyLarge),
                  AppSpacing.vGapMd,
                  FilledButton.icon(
                    onPressed: () {
                      auditBloc.add(AuditLoadRoomsRequested(widget.projectId));
                    },
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Reessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is AuditLoaded) {
            if (state.rooms.isEmpty) {
              return _buildEmptyState(context);
            }

            if (isWide) {
              return Row(
                children: [
                  // Rooms list sidebar - proportional width
                  SizedBox(
                    width: MediaQuery.sizeOf(context).width * 0.3,
                    child: _buildRoomsList(context, auditBloc, state),
                  ),
                  const VerticalDivider(width: 1),
                  // Room detail
                  Expanded(
                    child: state.selectedRoom != null
                        ? _buildRoomDetail(context, auditBloc, state.selectedRoom!)
                        : Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.touch_app_rounded, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
                                AppSpacing.vGapMd,
                                Text(
                                  'Selectionnez une piece',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                  ),
                ],
              );
            }

            // Mobile layout
            if (state.selectedRoom != null) {
              return _buildRoomDetail(context, auditBloc, state.selectedRoom!);
            }

            return _buildRoomsList(context, auditBloc, state);
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
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
          Text(
            'Aucune piece',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          AppSpacing.vGapXs,
          Text(
            'Ajoutez des pieces pour commencer l\'audit',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.vGapLg,
          FilledButton.icon(
            onPressed: () => _showAddRoomDialog(context),
            icon: const Icon(Icons.add),
            label: const Text('Ajouter une piece'),
          ),
        ],
      ),
    );
  }

  Widget _buildRoomsList(
    BuildContext context,
    AuditBloc bloc,
    AuditLoaded state,
  ) {
    return Column(
      children: [
        // Progress indicator
        LinearProgressIndicator(
          value: state.completionPercentage,
          backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Text(
            '${(state.completionPercentage * 100).toInt()}% complete',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: state.rooms.length,
            itemBuilder: (context, index) {
              final room = state.rooms[index];
              final isSelected = state.selectedRoom?.id == room.id;

              return ListTile(
                selected: isSelected,
                leading: CircleAvatar(
                  backgroundColor: isSelected
                      ? Theme.of(context).colorScheme.primaryContainer
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  child: Icon(
                    Icons.meeting_room,
                    color: isSelected
                        ? Theme.of(context).colorScheme.primary
                        : null,
                  ),
                ),
                title: Text(room.displayName),
                subtitle: Text(
                  '${room.checkedItemsCount}/${room.checklist.length} - ${room.photoCount} photos',
                ),
                trailing: SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(
                    value: room.checklistProgress,
                    strokeWidth: 3,
                    backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                  ),
                ),
                onTap: () => bloc.add(AuditRoomSelected(room)),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRoomDetail(BuildContext context, AuditBloc bloc, Room room) {
    final colorScheme = Theme.of(context).colorScheme;

    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          // Room header
          Container(
            padding: AppSpacing.cardPadding,
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: colorScheme.outlineVariant.withAlpha(40))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        room.displayName,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        room.type.displayName,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                // Floor plan button
                FilledButton.tonalIcon(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    context.goToFloorPlan(
                      widget.projectId,
                      room.id,
                      roomName: room.displayName,
                    );
                  },
                  icon: const Icon(Icons.architecture, size: 20),
                  label: const Text('Plan'),
                ),
                AppSpacing.hGapSm,
                IconButton(
                  icon: const Icon(Icons.camera_alt),
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    bloc.add(const AuditTakePhotoRequested());
                  },
                  tooltip: 'Prendre une photo',
                ),
                IconButton(
                  icon: const Icon(Icons.photo_library),
                  onPressed: () => bloc.add(const AuditPickPhotoRequested()),
                  tooltip: 'Choisir depuis la galerie',
                ),
              ],
            ),
          ),

          // Tabs - taller for tablet
          const TabBar(
            tabs: [
              Tab(text: 'Checklist', height: 56),
              Tab(text: 'Photos', height: 56),
            ],
          ),

          // Tab content
          Expanded(
            child: TabBarView(
              children: [
                _buildChecklist(context, bloc, room),
                _buildPhotosGrid(context, bloc, room),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChecklist(BuildContext context, AuditBloc bloc, Room room) {
    final itemsByCategory = room.itemsByCategory;

    return ListView.builder(
      padding: AppSpacing.pagePadding,
      itemCount: itemsByCategory.length,
      itemBuilder: (context, index) {
        final category = itemsByCategory.keys.elementAt(index);
        final items = itemsByCategory[category]!;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                category.displayName,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
            ),
            ...items.map((item) => CheckboxListTile(
                  value: item.isChecked,
                  title: Text(item.label),
                  subtitle: item.quantity != null
                      ? Text('Quantite: ${item.quantity}')
                      : null,
                  controlAffinity: ListTileControlAffinity.leading,
                  onChanged: (value) {
                    HapticFeedback.selectionClick();
                    bloc.add(AuditToggleChecklistItemRequested(
                      itemId: item.id,
                      isChecked: value ?? false,
                    ));
                  },
                )),
            const Divider(),
          ],
        );
      },
    );
  }

  Widget _buildPhotosGrid(BuildContext context, AuditBloc bloc, Room room) {
    if (room.photos.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.photo_library,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            AppSpacing.vGapMd,
            Text(
              'Aucune photo',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            AppSpacing.vGapMd,
            FilledButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                bloc.add(const AuditTakePhotoRequested());
              },
              icon: const Icon(Icons.camera_alt),
              label: const Text('Prendre une photo'),
            ),
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        // Dynamic columns based on available width
        final columns = (constraints.maxWidth / 180).floor().clamp(2, 5);

        return GridView.builder(
          padding: AppSpacing.pagePadding,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
          ),
          itemCount: room.photos.length,
          itemBuilder: (context, index) {
            final photo = room.photos[index];
            return Stack(
              fit: StackFit.expand,
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: AppRadius.borderRadiusMd,
                  ),
                  child: const Icon(Icons.image, size: 32),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton.filled(
                    icon: Icon(Icons.delete, color: Theme.of(context).colorScheme.onError, size: 18),
                    style: IconButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.error,
                      minimumSize: const Size(36, 36),
                      shape: RoundedRectangleBorder(borderRadius: AppRadius.borderRadiusSm),
                    ),
                    tooltip: 'Supprimer la photo',
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      bloc.add(AuditDeletePhotoRequested(photo.id));
                    },
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showAddRoomDialog(BuildContext context) {
    final nameController = TextEditingController();
    RoomType selectedType = RoomType.salon;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Ajouter une piece'),
              content: ConstrainedBox(
                constraints: AppSpacing.dialogConstraints,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Nom personnalise',
                        hintText: 'Laissez vide pour utiliser le type',
                      ),
                    ),
                    AppSpacing.vGapMd,
                    DropdownButtonFormField<RoomType>(
                      initialValue: selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Type de piece',
                      ),
                      items: RoomType.values.map((type) {
                        return DropdownMenuItem(
                          value: type,
                          child: Text(type.displayName),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setDialogState(() => selectedType = value);
                        }
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Annuler'),
                ),
                FilledButton(
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    ref.read(auditBlocProvider).add(
                          AuditAddRoomRequested(
                            name: nameController.text.trim(),
                            type: selectedType,
                          ),
                        );
                    Navigator.pop(context);
                  },
                  child: const Text('Ajouter'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
