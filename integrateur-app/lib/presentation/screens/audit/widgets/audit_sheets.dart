import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../domain/entities/checklist_item.dart';
import '../../../../domain/entities/room.dart';
import 'audit_visuals.dart';
import 'qty_button.dart';

/// Bottom sheet — add a new room to the current audit.
class AddRoomSheet extends StatefulWidget {
  final void Function(String name, RoomType type) onAdd;

  const AddRoomSheet({super.key, required this.onAdd});

  @override
  State<AddRoomSheet> createState() => _AddRoomSheetState();
}

class _AddRoomSheetState extends State<AddRoomSheet> {
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
            child: Text('Ajouter une pièce', style: tt.titleLarge),
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
                        roomIcon(type),
                        size: 18,
                        color: isSelected
                            ? cs.onPrimary
                            : cs.onSurfaceVariant,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        type.displayName,
                        style: tt.labelMedium?.copyWith(
                          color:
                              isSelected ? cs.onPrimary : cs.onSurface,
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
            decoration: InputDecoration(hintText: _selectedType.displayName),
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

/// Bottom sheet — edit an existing room (rename, change type/floor, delete).
class EditRoomSheet extends StatefulWidget {
  final Room room;
  final void Function(Room updated) onSave;
  final VoidCallback onDelete;

  const EditRoomSheet({
    super.key,
    required this.room,
    required this.onSave,
    required this.onDelete,
  });

  @override
  State<EditRoomSheet> createState() => _EditRoomSheetState();
}

class _EditRoomSheetState extends State<EditRoomSheet> {
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
                        roomIcon(type),
                        size: 18,
                        color: isSelected
                            ? cs.onPrimary
                            : cs.onSurfaceVariant,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        type.displayName,
                        style: tt.labelMedium?.copyWith(
                          color:
                              isSelected ? cs.onPrimary : cs.onSurface,
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
              QtyButton(
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
              QtyButton(
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

/// Dialog — add a custom checklist item with a category.
class AddItemDialog extends StatefulWidget {
  final void Function(String label, ChecklistCategory category) onAdd;

  const AddItemDialog({super.key, required this.onAdd});

  @override
  State<AddItemDialog> createState() => _AddItemDialogState();
}

class _AddItemDialogState extends State<AddItemDialog> {
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
              final color = catColor(cat, cs);
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
                        ? color.withAlpha(30)
                        : cs.surfaceContainerHighest,
                    borderRadius: AppRadius.borderRadiusSm,
                    border: Border.all(
                      color: isSelected
                          ? color
                          : cs.outlineVariant.withAlpha(40),
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        catIcon(cat),
                        size: 14,
                        color: isSelected ? color : cs.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        cat.displayName,
                        style: tt.labelSmall?.copyWith(
                          color: isSelected ? color : cs.onSurface,
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
