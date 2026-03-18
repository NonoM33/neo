import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/floor_plan.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/repositories/floor_plan_repository.dart';
import '../../blocs/floor_plan/floor_plan_bloc.dart';
import '../../blocs/floor_plan/floor_plan_event.dart';
import '../../blocs/floor_plan/floor_plan_state.dart';

/// Right panel showing properties of selected element, catalogue picker, or plan summary
class PropertiesPanel extends StatefulWidget {
  final FloorPlanLoaded state;
  final FloorPlanBloc bloc;
  final Map<String, Product> productCache;
  final ValueChanged<String?>? onProductSelectedForPlacement;
  final FloorPlanRepository? repository;

  const PropertiesPanel({
    super.key,
    required this.state,
    required this.bloc,
    this.productCache = const {},
    this.onProductSelectedForPlacement,
    this.repository,
  });

  @override
  State<PropertiesPanel> createState() => _PropertiesPanelState();
}

class _PropertiesPanelState extends State<PropertiesPanel> {
  String _searchQuery = '';
  ProductCategory? _filterCategory;
  String? _selectedProductId;
  bool _isUploadingPhoto = false;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    final showCatalogue = widget.state.activeTool == PlanTool.equipment &&
        widget.state.selectedElementId == null;

    return Container(
      width: 320,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest,
        border: Border(
          left: BorderSide(
            color: colorScheme.outlineVariant.withAlpha(40),
          ),
        ),
      ),
      child: Column(
        children: [
          // Panel header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: colorScheme.outlineVariant.withAlpha(40),
                ),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  showCatalogue ? Icons.inventory_2 : Icons.tune,
                  size: 20,
                  color: colorScheme.primary,
                ),
                AppSpacing.hGapSm,
                Expanded(
                  child: Text(
                    showCatalogue ? 'Catalogue' : _panelTitle,
                    style: textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (_selectedProductId != null && showCatalogue)
                  Chip(
                    label: const Text('Prêt'),
                    backgroundColor: colorScheme.primaryContainer,
                    labelStyle: TextStyle(
                      color: colorScheme.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: showCatalogue
                ? _buildCataloguePicker(context, colorScheme, textTheme)
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: _buildContent(context, colorScheme, textTheme),
                  ),
          ),
        ],
      ),
    );
  }

  String get _panelTitle {
    if (widget.state.selectedWall != null) return 'Mur';
    if (widget.state.selectedEquipment != null) return 'Équipement';
    if (widget.state.selectedAnnotation != null) return 'Annotation';
    return 'Plan';
  }

  Widget _buildContent(
    BuildContext context,
    ColorScheme colorScheme,
    TextTheme textTheme,
  ) {
    final wall = widget.state.selectedWall;
    if (wall != null) {
      return _buildWallProperties(context, wall, colorScheme, textTheme);
    }

    final eq = widget.state.selectedEquipment;
    if (eq != null) {
      return _buildEquipmentProperties(context, eq, colorScheme, textTheme);
    }

    final ann = widget.state.selectedAnnotation;
    if (ann != null) {
      return _buildAnnotationProperties(context, ann, colorScheme, textTheme);
    }

    return _buildPlanSummary(context, colorScheme, textTheme);
  }

  // ─── Catalogue picker ─────────────────────────────────────────

  Widget _buildCataloguePicker(
    BuildContext context,
    ColorScheme colorScheme,
    TextTheme textTheme,
  ) {
    final products = widget.productCache.values.toList();

    var filtered = products.where((p) => p.isActive).toList();
    if (_filterCategory != null) {
      filtered = filtered.where((p) => p.category == _filterCategory).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filtered = filtered
          .where((p) =>
              p.name.toLowerCase().contains(q) ||
              p.brand.toLowerCase().contains(q) ||
              p.reference.toLowerCase().contains(q))
          .toList();
    }

    return Column(
      children: [
        // Search
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Rechercher...',
              prefixIcon: const Icon(Icons.search, size: 20),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(
                borderRadius: AppRadius.borderRadiusMd,
              ),
            ),
            onChanged: (v) => setState(() => _searchQuery = v),
          ),
        ),

        // Category chips
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            children: [
              _CategoryChip(
                label: 'Tous',
                isSelected: _filterCategory == null,
                onTap: () => setState(() => _filterCategory = null),
              ),
              ...ProductCategory.values.map((cat) {
                final count = products.where((p) => p.category == cat).length;
                if (count == 0) return const SizedBox.shrink();
                return _CategoryChip(
                  label: '${cat.displayName} ($count)',
                  isSelected: _filterCategory == cat,
                  onTap: () => setState(() => _filterCategory = cat),
                );
              }),
            ],
          ),
        ),

        if (_selectedProductId == null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer.withAlpha(40),
                borderRadius: AppRadius.borderRadiusSm,
              ),
              child: Row(
                children: [
                  Icon(Icons.touch_app, size: 16, color: colorScheme.primary),
                  AppSpacing.hGapSm,
                  Expanded(
                    child: Text(
                      'Sélectionnez un produit puis appuyez sur le plan',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: colorScheme.primary,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),

        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Text('Aucun produit',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final product = filtered[index];
                    final isSelected = product.id == _selectedProductId;
                    return _ProductPickerTile(
                      product: product,
                      isSelected: isSelected,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() {
                          _selectedProductId = isSelected ? null : product.id;
                        });
                        widget.onProductSelectedForPlacement
                            ?.call(isSelected ? null : product.id);
                      },
                    );
                  },
                ),
        ),
      ],
    );
  }

  // ─── Plan summary ─────────────────────────────────────────────

  Widget _buildPlanSummary(
    BuildContext context,
    ColorScheme colorScheme,
    TextTheme textTheme,
  ) {
    final plan = widget.state.plan;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _infoRow('Dimensions',
            '${plan.widthMeters.toStringAsFixed(1)} × ${plan.heightMeters.toStringAsFixed(1)} m',
            textTheme),
        AppSpacing.vGapSm,
        _infoRow('Surface',
            '${plan.polygonAreaM2.toStringAsFixed(1)} m²',
            textTheme),
        AppSpacing.vGapSm,
        // Ceiling height with edit
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Hauteur sous plafond',
                style: textTheme.bodySmall
                    ?.copyWith(color: colorScheme.onSurfaceVariant)),
            InkWell(
              onTap: () => _showCeilingHeightDialog(plan.ceilingHeight),
              borderRadius: AppRadius.borderRadiusSm,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${plan.ceilingHeight.toStringAsFixed(2)} m',
                      style: textTheme.bodySmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    AppSpacing.hGapXs,
                    Icon(Icons.edit_outlined,
                        size: 13, color: colorScheme.primary),
                  ],
                ),
              ),
            ),
          ],
        ),
        AppSpacing.vGapSm,
        _infoRow('Murs', '${plan.walls.length}', textTheme),
        AppSpacing.vGapSm,
        _infoRow('Ouvertures', '${plan.openings.length}', textTheme),
        AppSpacing.vGapSm,
        _infoRow('Équipements', '${plan.equipmentCount}', textTheme),
        AppSpacing.vGapSm,
        _infoRow('Annotations', '${plan.annotations.length}', textTheme),
        AppSpacing.vGapLg,
        if (widget.state.isDirty)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.tertiaryContainer.withAlpha(60),
              borderRadius: AppRadius.borderRadiusSm,
            ),
            child: Row(
              children: [
                Icon(Icons.save_outlined,
                    size: 18, color: colorScheme.tertiary),
                AppSpacing.hGapSm,
                Expanded(
                  child: Text(
                    'Modifications non sauvegardées',
                    style: textTheme.bodySmall?.copyWith(
                      color: colorScheme.tertiary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        AppSpacing.vGapLg,
        _buildTipCard(colorScheme, textTheme),
      ],
    );
  }

  void _showCeilingHeightDialog(double current) {
    final controller =
        TextEditingController(text: current.toStringAsFixed(2));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hauteur sous plafond'),
        content: TextField(
          controller: controller,
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Hauteur (m)',
            suffixText: 'm',
          ),
          autofocus: true,
          textInputAction: TextInputAction.done,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              final v = double.tryParse(
                  controller.text.replaceAll(',', '.'));
              if (v != null && v > 0 && v < 10) {
                widget.bloc
                    .add(FloorPlanCeilingHeightChanged(v));
                HapticFeedback.lightImpact();
              }
              Navigator.pop(ctx);
            },
            child: const Text('Valider'),
          ),
        ],
      ),
    );
  }

  Widget _buildTipCard(ColorScheme colorScheme, TextTheme textTheme) {
    final tip = _tipForTool(widget.state.activeTool);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.primaryContainer.withAlpha(30),
        borderRadius: AppRadius.borderRadiusMd,
        border: Border.all(color: colorScheme.primary.withAlpha(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(tip.icon, size: 18, color: colorScheme.primary),
              AppSpacing.hGapSm,
              Expanded(
                child: Text(
                  tip.title,
                  style: textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.primary,
                  ),
                ),
              ),
            ],
          ),
          AppSpacing.vGapSm,
          Text(
            tip.description,
            style: textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  ({IconData icon, String title, String description}) _tipForTool(
      PlanTool tool) {
    return switch (tool) {
      PlanTool.select => (
          icon: Icons.near_me,
          title: 'Sélection',
          description:
              '• Appuyez sur un équipement ou une note pour le sélectionner\n'
                  '• Glissez-le pour le déplacer\n'
                  '• Panneau droit → "Étiquette" pour le renommer\n'
                  '• Bouton 🗑️ dans la barre en haut pour le supprimer\n'
                  '• Outil Gomme pour supprimer en appuyant directement',
        ),
      PlanTool.wall => (
          icon: Icons.horizontal_rule,
          title: 'Dessiner un mur',
          description:
              '1. Appuyez pour placer le point de départ\n'
                  '2. Appuyez ailleurs pour terminer le mur\n'
                  '3. Le mur suivant démarre automatiquement\n'
                  '\u{2022} Les points se collent à la grille (25cm)\n'
                  '\u{2022} Changez d\'outil pour arrêter',
        ),
      PlanTool.door => (
          icon: Icons.door_front_door_outlined,
          title: 'Placer une porte',
          description:
              'Appuyez près d\'un mur existant pour y placer une porte.',
        ),
      PlanTool.window => (
          icon: Icons.window_outlined,
          title: 'Placer une fenêtre',
          description:
              'Appuyez près d\'un mur existant pour y placer une fenêtre.',
        ),
      PlanTool.equipment => (
          icon: Icons.router,
          title: 'Placer un équipement',
          description:
              '1. Choisissez un produit dans le catalogue (à droite)\n'
                  '2. Appuyez sur le plan pour le placer\n'
                  '3. L\'équipement sera ajouté au devis',
        ),
      PlanTool.annotation => (
          icon: Icons.note_add_outlined,
          title: 'Ajouter une note',
          description:
              'Appuyez sur le plan pour placer une note. '
                  'Idéal pour les instructions, passages de câbles, etc.',
        ),
      PlanTool.measurement => (
          icon: Icons.straighten,
          title: 'Mesurer',
          description:
              '1. Appuyez sur le point de départ\n'
                  '2. Appuyez sur le point d\'arrivée\n'
                  'La distance sera affichée sur le plan.',
        ),
      PlanTool.eraser => (
          icon: Icons.delete_outline,
          title: 'Supprimer',
          description:
              'Appuyez sur un élément (mur, équipement, note) pour le supprimer immédiatement.',
        ),
    };
  }

  // ─── Wall properties ──────────────────────────────────────────

  Widget _buildWallProperties(
    BuildContext context,
    PlanWall wall,
    ColorScheme colorScheme,
    TextTheme textTheme,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _infoRow('Longueur', '${wall.lengthMeters.toStringAsFixed(2)} m',
            textTheme),
        AppSpacing.vGapSm,
        _infoRow(
            'Épaisseur',
            '${(wall.thickness * 100).toStringAsFixed(0)} cm',
            textTheme),
        AppSpacing.vGapSm,
        _infoRow('Type', wall.type.displayName, textTheme),
        AppSpacing.vGapMd,
        Text('Type de mur',
            style:
                textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600)),
        AppSpacing.vGapXs,
        SegmentedButton<WallType>(
          segments: WallType.values
              .map((t) =>
                  ButtonSegment(value: t, label: Text(t.displayName)))
              .toList(),
          selected: {wall.type},
          onSelectionChanged: (selected) {
            widget.bloc.add(WallUpdateRequested(
              wallId: wall.id,
              wallType: selected.first,
            ));
          },
          style: SegmentedButton.styleFrom(
            visualDensity: VisualDensity.compact,
          ),
        ),
        AppSpacing.vGapLg,
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              HapticFeedback.lightImpact();
              widget.bloc.add(WallDeleteRequested(wall.id));
            },
            icon: Icon(Icons.delete_outline, color: colorScheme.error),
            label: Text('Supprimer',
                style: TextStyle(color: colorScheme.error)),
          ),
        ),
      ],
    );
  }

  // ─── Equipment properties ─────────────────────────────────────

  Widget _buildEquipmentProperties(
    BuildContext context,
    PlanEquipment eq,
    ColorScheme colorScheme,
    TextTheme textTheme,
  ) {
    final product = widget.productCache[eq.productId];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (product != null) ...[
          Text(product.name,
              style: textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600)),
          AppSpacing.vGapXs,
          Text('${product.reference} · ${product.brand}',
              style: textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant)),
          AppSpacing.vGapSm,
          Chip(
            avatar: const Icon(Icons.sell_outlined, size: 16),
            label: Text(product.category.displayName),
          ),
          AppSpacing.vGapMd,
        ],
        _infoRow('Quantité', '${eq.quantity}', textTheme),
        AppSpacing.vGapSm,
        _infoRow('Statut', eq.status.displayName, textTheme),
        // Label
        AppSpacing.vGapSm,
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Étiquette',
                style: textTheme.bodySmall
                    ?.copyWith(color: colorScheme.onSurfaceVariant)),
            InkWell(
              onTap: () => _showEquipmentEditDialog(eq),
              borderRadius: AppRadius.borderRadiusSm,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        eq.label?.isNotEmpty == true
                            ? eq.label!
                            : 'Ajouter...',
                        style: textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: eq.label?.isNotEmpty == true
                              ? null
                              : colorScheme.onSurfaceVariant,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    AppSpacing.hGapXs,
                    Icon(Icons.edit_outlined,
                        size: 13, color: colorScheme.primary),
                  ],
                ),
              ),
            ),
          ],
        ),
        if (eq.notes?.isNotEmpty == true) ...[
          AppSpacing.vGapXs,
          Text(eq.notes!,
              style: textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant)),
        ],
        if (product != null) ...[
          AppSpacing.vGapMd,
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer.withAlpha(40),
              borderRadius: AppRadius.borderRadiusSm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Prix HT', style: textTheme.bodySmall),
                Text(
                  '${(product.salePrice * eq.quantity).toStringAsFixed(2)} €',
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
        AppSpacing.vGapMd,
        // Photos section
        _buildPhotoSection(
          context,
          colorScheme,
          textTheme,
          photoUrls: eq.photoUrls,
          onAddPhoto: () => _pickAndUploadPhoto(
            planId: widget.state.plan.id,
            elementId: eq.id,
            elementType: 'equipment',
            onUploaded: (url) => widget.bloc
                .add(EquipmentPhotoAdded(equipmentId: eq.id, photoUrl: url)),
          ),
          onRemovePhoto: (url) => widget.bloc.add(
              EquipmentPhotoRemoved(equipmentId: eq.id, photoUrl: url)),
        ),
        AppSpacing.vGapLg,
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              HapticFeedback.lightImpact();
              widget.bloc.add(EquipmentDeleteRequested(eq.id));
            },
            icon: Icon(Icons.delete_outline, color: colorScheme.error),
            label: Text('Supprimer',
                style: TextStyle(color: colorScheme.error)),
          ),
        ),
      ],
    );
  }

  void _showEquipmentEditDialog(PlanEquipment eq) {
    final labelCtrl = TextEditingController(text: eq.label ?? '');
    final notesCtrl = TextEditingController(text: eq.notes ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Modifier l\'équipement'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: labelCtrl,
              decoration: const InputDecoration(labelText: 'Étiquette'),
              textInputAction: TextInputAction.next,
            ),
            AppSpacing.vGapMd,
            TextField(
              controller: notesCtrl,
              decoration: const InputDecoration(
                  labelText: 'Notes de pose', hintText: 'Ex: placer à 1.2m du sol'),
              maxLines: 3,
              textInputAction: TextInputAction.done,
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              widget.bloc.add(EquipmentUpdateRequested(
                equipmentId: eq.id,
                label: labelCtrl.text.trim().isEmpty ? null : labelCtrl.text.trim(),
                notes: notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim(),
              ));
              HapticFeedback.lightImpact();
              Navigator.pop(ctx);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  // ─── Annotation properties ────────────────────────────────────

  Widget _buildAnnotationProperties(
    BuildContext context,
    PlanAnnotation ann,
    ColorScheme colorScheme,
    TextTheme textTheme,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _infoRow('Type', ann.type.displayName, textTheme),
        AppSpacing.vGapSm,
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Texte',
                style: textTheme.labelMedium
                    ?.copyWith(fontWeight: FontWeight.w600)),
            InkWell(
              onTap: () => _showAnnotationEditDialog(ann),
              borderRadius: AppRadius.borderRadiusSm,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Modifier',
                        style: textTheme.bodySmall
                            ?.copyWith(color: colorScheme.primary)),
                    AppSpacing.hGapXs,
                    Icon(Icons.edit_outlined,
                        size: 13, color: colorScheme.primary),
                  ],
                ),
              ),
            ),
          ],
        ),
        AppSpacing.vGapXs,
        Text(ann.text, style: textTheme.bodyMedium),
        if (ann.measurementLength != null) ...[
          AppSpacing.vGapSm,
          _infoRow('Distance',
              '${ann.measurementLength!.toStringAsFixed(2)} m', textTheme),
        ],
        AppSpacing.vGapMd,
        // Photos section
        _buildPhotoSection(
          context,
          colorScheme,
          textTheme,
          photoUrls: ann.photoUrls,
          onAddPhoto: () => _pickAndUploadPhoto(
            planId: widget.state.plan.id,
            elementId: ann.id,
            elementType: 'annotation',
            onUploaded: (url) => widget.bloc.add(
                AnnotationPhotoAdded(annotationId: ann.id, photoUrl: url)),
          ),
          onRemovePhoto: (url) => widget.bloc.add(
              AnnotationPhotoRemoved(annotationId: ann.id, photoUrl: url)),
        ),
        AppSpacing.vGapLg,
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              HapticFeedback.lightImpact();
              widget.bloc.add(AnnotationDeleteRequested(ann.id));
            },
            icon: Icon(Icons.delete_outline, color: colorScheme.error),
            label: Text('Supprimer',
                style: TextStyle(color: colorScheme.error)),
          ),
        ),
      ],
    );
  }

  void _showAnnotationEditDialog(PlanAnnotation ann) {
    final controller = TextEditingController(text: ann.text);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Modifier la note'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Texte'),
          maxLines: 4,
          autofocus: true,
          textInputAction: TextInputAction.done,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                widget.bloc.add(AnnotationUpdateRequested(
                  annotationId: ann.id,
                  text: text,
                ));
                HapticFeedback.lightImpact();
              }
              Navigator.pop(ctx);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }

  // ─── Photo section ────────────────────────────────────────────

  Widget _buildPhotoSection(
    BuildContext context,
    ColorScheme colorScheme,
    TextTheme textTheme, {
    required List<String> photoUrls,
    required VoidCallback onAddPhoto,
    required ValueChanged<String> onRemovePhoto,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Photos de référence',
                style: textTheme.labelMedium
                    ?.copyWith(fontWeight: FontWeight.w600)),
            TextButton.icon(
              onPressed: _isUploadingPhoto ? null : onAddPhoto,
              icon: _isUploadingPhoto
                  ? SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colorScheme.primary),
                    )
                  : const Icon(Icons.add_a_photo_outlined, size: 16),
              label: const Text('Ajouter'),
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
              ),
            ),
          ],
        ),
        if (photoUrls.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Aucune photo — ajoutez des photos pour montrer exactement où placer cet élément.',
              style: textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          )
        else
          SizedBox(
            height: 90,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: photoUrls.length,
              separatorBuilder: (context, index) => AppSpacing.hGapSm,
              itemBuilder: (context, index) {
                final url = photoUrls[index];
                return Stack(
                  children: [
                    GestureDetector(
                      onTap: () => _showPhotoFullscreen(context, url),
                      child: ClipRRect(
                        borderRadius: AppRadius.borderRadiusSm,
                        child: url.startsWith('/')
                            ? Image.file(File(url),
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover)
                            : CachedNetworkImage(
                                imageUrl: url,
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover,
                              ),
                      ),
                    ),
                    Positioned(
                      top: 2,
                      right: 2,
                      child: GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          onRemovePhoto(url);
                        },
                        child: Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: colorScheme.error,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close,
                              size: 12, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
      ],
    );
  }

  void _showPhotoFullscreen(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          children: [
            Center(
              child: url.startsWith('/')
                  ? Image.file(File(url))
                  : CachedNetworkImage(imageUrl: url),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                tooltip: 'Fermer',
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndUploadPhoto({
    required String planId,
    required String elementId,
    required String elementType,
    required ValueChanged<String> onUploaded,
  }) async {
    final picker = ImagePicker();

    // Show source choice
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Prendre une photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choisir dans la galerie'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final picked = await picker.pickImage(
      source: source,
      imageQuality: 80,
      maxWidth: 1920,
    );
    if (picked == null) return;

    // If no repository, store local path directly
    if (widget.repository == null) {
      onUploaded(picked.path);
      return;
    }

    setState(() => _isUploadingPhoto = true);
    try {
      final url = await widget.repository!.uploadElementPhoto(
        planId,
        elementId,
        elementType,
        picked.path,
      );
      onUploaded(url);
      HapticFeedback.lightImpact();
    } catch (_) {
      // Fallback: store local path so UI shows the photo even without upload
      onUploaded(picked.path);
    } finally {
      if (mounted) setState(() => _isUploadingPhoto = false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  Widget _infoRow(String label, String value, TextTheme textTheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        Flexible(
          child: Text(value,
              style: textTheme.bodySmall
                  ?.copyWith(fontWeight: FontWeight.w600),
              textAlign: TextAlign.end),
        ),
      ],
    );
  }
}

// ─── Supporting widgets ─────────────────────────────────────────────────

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(label, style: const TextStyle(fontSize: 11)),
        selected: isSelected,
        onSelected: (_) => onTap(),
        visualDensity: VisualDensity.compact,
        selectedColor: colorScheme.primaryContainer,
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}

class _ProductPickerTile extends StatelessWidget {
  final Product product;
  final bool isSelected;
  final VoidCallback onTap;

  const _ProductPickerTile({
    required this.product,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 3),
      color: isSelected ? colorScheme.primaryContainer : null,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderRadiusLg,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isSelected
                      ? colorScheme.primary.withAlpha(30)
                      : colorScheme.surfaceContainerHighest,
                  borderRadius: AppRadius.borderRadiusSm,
                ),
                child: Icon(
                  _getCategoryIcon(product.category),
                  size: 18,
                  color: isSelected
                      ? colorScheme.primary
                      : colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.hGapSm,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: isSelected
                            ? colorScheme.onPrimaryContainer
                            : null,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${product.brand} · ${product.salePrice.toStringAsFixed(0)}€',
                      style: TextStyle(
                        fontSize: 10,
                        color: isSelected
                            ? colorScheme.onPrimaryContainer.withAlpha(180)
                            : colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(Icons.check_circle, size: 20, color: colorScheme.primary),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getCategoryIcon(ProductCategory category) {
    return switch (category) {
      ProductCategory.eclairage => Icons.lightbulb_outline,
      ProductCategory.securite => Icons.security,
      ProductCategory.climat => Icons.thermostat,
      ProductCategory.ouvrants => Icons.window,
      ProductCategory.energie => Icons.router,
      ProductCategory.multimedia => Icons.speaker,
      ProductCategory.custom => Icons.build,
    };
  }
}
