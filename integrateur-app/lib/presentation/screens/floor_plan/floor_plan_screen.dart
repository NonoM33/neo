import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/floor_plan.dart';
import '../../../domain/entities/product.dart';
import '../../blocs/catalogue/catalogue_bloc.dart';
import '../../blocs/floor_plan/floor_plan_bloc.dart';
import '../../blocs/floor_plan/floor_plan_event.dart';
import '../../blocs/floor_plan/floor_plan_state.dart';
import '../../widgets/floor_plan/floor_plan_canvas.dart';
import '../../widgets/floor_plan/properties_panel.dart';
import '../../widgets/floor_plan/tool_palette.dart';
import 'lidar_scan_screen.dart';
import 'qr_scan_screen.dart';

/// Floor plan editor screen with 3-panel tablet layout
class FloorPlanScreen extends ConsumerStatefulWidget {
  final String projectId;
  final String roomId;
  final String roomName;

  const FloorPlanScreen({
    super.key,
    required this.projectId,
    required this.roomId,
    this.roomName = '',
  });

  @override
  ConsumerState<FloorPlanScreen> createState() => _FloorPlanScreenState();
}

class _FloorPlanScreenState extends ConsumerState<FloorPlanScreen> {
  late final FloorPlanBloc _bloc;
  Map<String, Product> _productCache = {};
  String? _selectedProductIdForPlacement;

  @override
  void initState() {
    super.initState();
    _bloc = FloorPlanBloc();
    _bloc.add(FloorPlanLoadRequested(
      roomId: widget.roomId,
      projectId: widget.projectId,
    ));
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    final catalogueBloc = ref.read(catalogueBlocProvider);
    final catalogueState = catalogueBloc.state;
    if (catalogueState is CatalogueLoaded) {
      setState(() {
        _productCache = {
          for (final p in catalogueState.allProducts) p.id: p,
        };
      });
    }
  }

  @override
  void dispose() {
    _bloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return BlocBuilder<FloorPlanBloc, FloorPlanState>(
      bloc: _bloc,
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: Text(widget.roomName.isNotEmpty
                ? 'Plan - ${widget.roomName}'
                : 'Plan'),
            actions: _buildAppBarActions(state, colorScheme),
          ),
          body: _buildBody(state, colorScheme, textTheme),
        );
      },
    );
  }

  List<Widget> _buildAppBarActions(FloorPlanState state, ColorScheme colorScheme) {
    if (state is FloorPlanEmpty) {
      return [
        IconButton(
          icon: const Icon(Icons.view_in_ar),
          onPressed: () => _launchLidarScan(state.roomId, state.projectId),
          tooltip: 'Scanner avec LiDAR',
        ),
        const SizedBox(width: 8),
      ];
    }

    if (state is! FloorPlanLoaded) return [];

    return [
      // LiDAR rescan
      IconButton(
        icon: const Icon(Icons.view_in_ar),
        onPressed: () => _launchLidarScan(
            state.plan.roomId, state.plan.projectId),
        tooltip: 'Re-scanner avec LiDAR',
      ),
      const VerticalDivider(width: 16),
      // Undo
      IconButton(
        icon: const Icon(Icons.undo),
        onPressed: state.canUndo
            ? () => _bloc.add(const FloorPlanUndoRequested())
            : null,
        tooltip: 'Annuler',
      ),
      // Redo
      IconButton(
        icon: const Icon(Icons.redo),
        onPressed: state.canRedo
            ? () => _bloc.add(const FloorPlanRedoRequested())
            : null,
        tooltip: 'Rétablir',
      ),
      const SizedBox(width: 8),
      // Delete selected
      if (state.selectedElementId != null)
        IconButton(
          icon: Icon(Icons.delete_outline, color: colorScheme.error),
          onPressed: () {
            HapticFeedback.lightImpact();
            _bloc.add(const FloorPlanDeleteSelectedRequested());
          },
          tooltip: 'Supprimer la sélection',
        ),
      const SizedBox(width: 8),
      // Dirty indicator
      if (state.isDirty)
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Icon(Icons.circle, size: 10, color: colorScheme.tertiary),
        ),
    ];
  }

  void _launchLidarScan(String roomId, String projectId) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    showModalBottomSheet(
      context: context,
      constraints: AppSpacing.bottomSheetConstraints,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Scanner la pièce',
                style: textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold)),
            AppSpacing.vGapSm,
            Text(
              'Choisissez comment scanner',
              style: textTheme.bodyMedium
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            AppSpacing.vGapLg,

            // Option 1: QR code → iPhone
            Card(
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  _launchQrScan(roomId, projectId);
                },
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: colorScheme.primaryContainer,
                          borderRadius: AppRadius.borderRadiusMd,
                        ),
                        child: Icon(Icons.qr_code_2,
                            color: colorScheme.primary, size: 28),
                      ),
                      AppSpacing.hGapMd,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text('Scanner avec iPhone',
                                    style: textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w600)),
                                AppSpacing.hGapSm,
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: colorScheme.primaryContainer,
                                    borderRadius: AppRadius.borderRadiusFull,
                                  ),
                                  child: Text('Recommandé',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: colorScheme.primary,
                                        fontWeight: FontWeight.w600,
                                      )),
                                ),
                              ],
                            ),
                            AppSpacing.vGapXs,
                            Text(
                              'Générez un QR code, scannez-le avec votre iPhone LiDAR',
                              style: textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right,
                          color: colorScheme.onSurfaceVariant),
                    ],
                  ),
                ),
              ),
            ),

            AppSpacing.vGapSm,

            // Option 2: Direct LiDAR (if this device supports it)
            Card(
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  _launchDirectLidar(roomId, projectId);
                },
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest,
                          borderRadius: AppRadius.borderRadiusMd,
                        ),
                        child: Icon(Icons.view_in_ar,
                            color: colorScheme.onSurfaceVariant, size: 28),
                      ),
                      AppSpacing.hGapMd,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Scanner sur cet appareil',
                                style: textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600)),
                            AppSpacing.vGapXs,
                            Text(
                              'Nécessite un iPad Pro avec LiDAR',
                              style: textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right,
                          color: colorScheme.onSurfaceVariant),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchQrScan(String roomId, String projectId) async {
    final result = await Navigator.of(context).push<FloorPlan>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => QrScanScreen(
          roomId: roomId,
          projectId: projectId,
          roomName: widget.roomName,
        ),
      ),
    );
    _handleScanResult(result);
  }

  Future<void> _launchDirectLidar(String roomId, String projectId) async {
    final result = await Navigator.of(context).push<FloorPlan>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => LidarScanScreen(
          roomId: roomId,
          projectId: projectId,
          roomName: widget.roomName,
        ),
      ),
    );
    _handleScanResult(result);
  }

  void _handleScanResult(FloorPlan? result) {
    if (result != null && mounted) {
      _bloc.add(FloorPlanImportFromScan(result));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Plan importé : ${result.walls.length} murs, '
            '${result.openings.length} ouvertures détectés',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Widget _buildBody(
      FloorPlanState state, ColorScheme colorScheme, TextTheme textTheme) {
    // Loading
    if (state is FloorPlanLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // Error
    if (state is FloorPlanError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: colorScheme.error),
            AppSpacing.vGapMd,
            Text(state.message, style: textTheme.bodyLarge),
          ],
        ),
      );
    }

    // Empty - show create dialog
    if (state is FloorPlanEmpty) {
      return _buildEmptyState(state, colorScheme, textTheme);
    }

    // Loaded - 3-panel editor
    if (state is FloorPlanLoaded) {
      return Row(
        children: [
          // Tool palette
          ToolPalette(
            activeTool: state.activeTool,
            viewMode: state.viewMode,
            onToolSelected: (tool) =>
                _bloc.add(FloorPlanToolSelected(tool)),
          ),

          // Canvas
          Expanded(
            child: Column(
              children: [
                // Status bar
                _buildStatusBar(state, colorScheme, textTheme),
                // Canvas
                Expanded(
                  child: FloorPlanCanvas(
                    state: state,
                    bloc: _bloc,
                    productCache: _productCache,
                    selectedProductIdForPlacement:
                        _selectedProductIdForPlacement,
                  ),
                ),
              ],
            ),
          ),

          // Properties panel
          PropertiesPanel(
            state: state,
            bloc: _bloc,
            productCache: _productCache,
            onProductSelectedForPlacement: (productId) {
              setState(() {
                _selectedProductIdForPlacement = productId;
              });
            },
          ),
        ],
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildStatusBar(
      FloorPlanLoaded state, ColorScheme colorScheme, TextTheme textTheme) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withAlpha(100),
        border: Border(
          bottom: BorderSide(color: colorScheme.outlineVariant.withAlpha(40)),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.grid_on, size: 14, color: colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text('Grille 25cm',
              style: textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant)),
          const SizedBox(width: 16),
          Icon(Icons.straighten, size: 14, color: colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(
            '${state.plan.widthMeters.toStringAsFixed(0)} x ${state.plan.heightMeters.toStringAsFixed(0)} m',
            style: textTheme.bodySmall
                ?.copyWith(color: colorScheme.onSurfaceVariant),
          ),
          const SizedBox(width: 16),
          Icon(Icons.layers, size: 14, color: colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(
            '${state.plan.walls.length} murs · ${state.plan.equipmentCount} équip.',
            style: textTheme.bodySmall
                ?.copyWith(color: colorScheme.onSurfaceVariant),
          ),
          const Spacer(),
          // Tool name
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer.withAlpha(80),
              borderRadius: AppRadius.borderRadiusFull,
            ),
            child: Text(
              _toolName(state.activeTool),
              style: textTheme.labelSmall?.copyWith(
                color: colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _toolName(PlanTool tool) {
    return switch (tool) {
      PlanTool.select => 'Sélection',
      PlanTool.wall => 'Mur',
      PlanTool.door => 'Porte',
      PlanTool.window => 'Fenêtre',
      PlanTool.equipment => 'Équipement',
      PlanTool.annotation => 'Note',
      PlanTool.measurement => 'Mesure',
      PlanTool.eraser => 'Gomme',
    };
  }

  Widget _buildEmptyState(
      FloorPlanEmpty state, ColorScheme colorScheme, TextTheme textTheme) {
    final widthCtrl = TextEditingController(text: '8');
    final heightCtrl = TextEditingController(text: '6');

    return Center(
      child: SingleChildScrollView(
        padding: AppSpacing.pagePadding,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Option 1: LiDAR Scan (recommended) ──────────
              Card(
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _launchLidarScan(state.roomId, state.projectId),
                  borderRadius: AppRadius.borderRadiusLg,
                  child: Padding(
                    padding: AppSpacing.cardPaddingLarge,
                    child: Column(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: colorScheme.primaryContainer,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.view_in_ar,
                              size: 36, color: colorScheme.primary),
                        ),
                        AppSpacing.vGapMd,
                        Text(
                          'Scanner avec LiDAR',
                          style: textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        AppSpacing.vGapXs,
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: colorScheme.primaryContainer,
                            borderRadius: AppRadius.borderRadiusFull,
                          ),
                          child: Text(
                            'Recommandé',
                            style: textTheme.labelSmall?.copyWith(
                              color: colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        AppSpacing.vGapSm,
                        Text(
                          'Scannez la pièce avec le LiDAR de votre iPhone/iPad Pro. '
                          'Les murs, portes et fenêtres sont détectés automatiquement.',
                          style: textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        AppSpacing.vGapMd,
                        FilledButton.icon(
                          onPressed: () =>
                              _launchLidarScan(state.roomId, state.projectId),
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Lancer le scan'),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(200, 52),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              AppSpacing.vGapMd,

              // Divider "OU"
              Row(
                children: [
                  const Expanded(child: Divider()),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('OU',
                        style: textTheme.labelLarge?.copyWith(
                            color: colorScheme.onSurfaceVariant)),
                  ),
                  const Expanded(child: Divider()),
                ],
              ),

              AppSpacing.vGapMd,

              // ── Option 2: Manual dimensions ─────────────────
              Card(
                child: Padding(
                  padding: AppSpacing.cardPaddingLarge,
                  child: Column(
                    children: [
                      Icon(Icons.architecture,
                          size: 48, color: colorScheme.onSurfaceVariant),
                      AppSpacing.vGapSm,
                      Text(
                        'Créer manuellement',
                        style: textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      AppSpacing.vGapXs,
                      Text(
                        'Entrez les dimensions et dessinez les murs à la main',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      AppSpacing.vGapMd,
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: widthCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Largeur',
                                suffixText: 'm',
                              ),
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.next,
                            ),
                          ),
                          AppSpacing.hGapMd,
                          Expanded(
                            child: TextField(
                              controller: heightCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Profondeur',
                                suffixText: 'm',
                              ),
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                            ),
                          ),
                        ],
                      ),
                      AppSpacing.vGapMd,
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            final w = double.tryParse(widthCtrl.text) ?? 8;
                            final h = double.tryParse(heightCtrl.text) ?? 6;
                            _bloc.add(FloorPlanCreateRequested(
                              roomId: state.roomId,
                              projectId: state.projectId,
                              widthMeters: w.clamp(2, 50),
                              heightMeters: h.clamp(2, 50),
                            ));
                          },
                          icon: const Icon(Icons.edit),
                          label: const Text('Créer le plan'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(120, 52),
                          ),
                        ),
                      ),
                    ],
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
