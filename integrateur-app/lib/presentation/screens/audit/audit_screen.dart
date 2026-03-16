import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/room.dart';
import '../../blocs/audit/audit_bloc.dart';
import '../../blocs/audit/audit_event.dart';
import '../../blocs/audit/audit_state.dart';

/// Audit screen for managing room audits
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
    final isTablet = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_home_work),
            onPressed: () => _showAddRoomDialog(context),
            tooltip: 'Ajouter une pièce',
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
                  Icon(Icons.error_outline, size: 48, color: colorScheme.error),
                  AppSpacing.vGapMd,
                  Text(state.message),
                  AppSpacing.vGapMd,
                  ElevatedButton(
                    onPressed: () {
                      auditBloc.add(AuditLoadRoomsRequested(widget.projectId));
                    },
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is AuditLoaded) {
            if (state.rooms.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.meeting_room,
                      size: 64,
                      color: colorScheme.onSurfaceVariant,
                    ),
                    AppSpacing.vGapMd,
                    const Text('Aucune pièce'),
                    AppSpacing.vGapXs,
                    const Text('Ajoutez des pièces pour commencer l\'audit'),
                    AppSpacing.vGapLg,
                    FilledButton.icon(
                      onPressed: () => _showAddRoomDialog(context),
                      icon: const Icon(Icons.add),
                      label: const Text('Ajouter une pièce'),
                    ),
                  ],
                ),
              );
            }

            if (isTablet) {
              return Row(
                children: [
                  // Rooms list
                  SizedBox(
                    width: 280,
                    child: _buildRoomsList(context, auditBloc, state),
                  ),
                  const VerticalDivider(width: 1),
                  // Room detail
                  Expanded(
                    child: state.selectedRoom != null
                        ? _buildRoomDetail(context, auditBloc, state.selectedRoom!)
                        : const Center(child: Text('Sélectionnez une pièce')),
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
          padding: const EdgeInsets.all(8),
          child: Text(
            '${(state.completionPercentage * 100).toInt()}% complété',
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
                trailing: CircularProgressIndicator(
                  value: room.checklistProgress,
                  strokeWidth: 3,
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
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
            color: colorScheme.surfaceContainerHighest,
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
                      Text(
                        room.type.displayName,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.camera_alt),
                  onPressed: () => bloc.add(const AuditTakePhotoRequested()),
                  tooltip: 'Prendre une photo',
                ),
                IconButton(
                  icon: const Icon(Icons.photo_library),
                  onPressed: () => bloc.add(const AuditPickPhotoRequested()),
                  tooltip: 'Galerie',
                ),
              ],
            ),
          ),

          // Tabs
          const TabBar(
            tabs: [
              Tab(text: 'Checklist'),
              Tab(text: 'Photos'),
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
                      ? Text('Quantité: ${item.quantity}')
                      : null,
                  onChanged: (value) {
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
            const Text('Aucune photo'),
            AppSpacing.vGapMd,
            FilledButton.icon(
              onPressed: () => bloc.add(const AuditTakePhotoRequested()),
              icon: const Icon(Icons.camera_alt),
              label: const Text('Prendre une photo'),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: AppSpacing.pagePadding,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
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
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.image),
            ),
            Positioned(
              top: 4,
              right: 4,
              child: IconButton(
                icon: const Icon(Icons.delete, color: Colors.red),
                iconSize: 20,
                onPressed: () {
                  bloc.add(AuditDeletePhotoRequested(photo.id));
                },
              ),
            ),
          ],
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
        return AlertDialog(
          title: const Text('Ajouter une pièce'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nom de la pièce (optionnel)',
                ),
              ),
              AppSpacing.vGapMd,
              DropdownButtonFormField<RoomType>(
                value: selectedType,
                decoration: const InputDecoration(
                  labelText: 'Type de pièce',
                ),
                items: RoomType.values.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text(type.displayName),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    selectedType = value;
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () {
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
  }
}
