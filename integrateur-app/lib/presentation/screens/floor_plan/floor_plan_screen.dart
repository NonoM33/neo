import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_roomplan/flutter_roomplan.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../domain/entities/floor_plan.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../blocs/catalogue/catalogue_bloc.dart';
import '../../blocs/floor_plan/floor_plan_bloc.dart';
import '../../blocs/floor_plan/floor_plan_event.dart';
import '../../blocs/floor_plan/floor_plan_state.dart';
import '../../blocs/quotes/quotes_bloc.dart';
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
  StreamSubscription<CatalogueState>? _catalogueSubscription;
  Map<String, Product> _productCache = {};
  String? _selectedProductIdForPlacement;
  bool _isProcessingPlacement = false;

  @override
  void initState() {
    super.initState();
    _bloc = FloorPlanBloc(repository: ref.read(floorPlanRepositoryProvider));
    _bloc.add(FloorPlanLoadRequested(
      roomId: widget.roomId,
      projectId: widget.projectId,
    ));
    _loadProducts();
  }

  void _loadProducts() {
    final catalogueBloc = ref.read(catalogueBlocProvider);
    if (catalogueBloc.state is CatalogueLoaded) {
      _updateProductCache(catalogueBloc.state as CatalogueLoaded);
    } else {
      catalogueBloc.add(const CatalogueLoadRequested());
    }
    _catalogueSubscription = catalogueBloc.stream.listen((state) {
      if (state is CatalogueLoaded && mounted) {
        _updateProductCache(state);
      }
    });
  }

  void _updateProductCache(CatalogueLoaded state) {
    setState(() {
      _productCache = {for (final p in state.allProducts) p.id: p};
    });
  }

  @override
  void dispose() {
    _catalogueSubscription?.cancel();
    _bloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return BlocConsumer<FloorPlanBloc, FloorPlanState>(
      bloc: _bloc,
      listenWhen: (prev, curr) {
        if (curr is! FloorPlanLoaded || curr.lastPlacedEquipment == null) {
          return false;
        }
        if (prev is! FloorPlanLoaded) return true;
        return curr.lastPlacedEquipment != prev.lastPlacedEquipment;
      },
      listener: (context, state) {
        if (state is FloorPlanLoaded && state.lastPlacedEquipment != null) {
          _onEquipmentPlaced(state.lastPlacedEquipment!);
        }
      },
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

  // ─── Placement Orchestration ──────────────────────────────────────────

  Future<void> _onEquipmentPlaced(PlanEquipment eq) async {
    if (_isProcessingPlacement) return;
    _isProcessingPlacement = true;

    // Acknowledge immediately so re-placement can be detected
    _bloc.add(const EquipmentPlacementAcknowledged());

    try {
      if (!mounted) return;

      // 1. Resolve product from cache or repository
      final product = await _resolveProduct(eq.productId);
      if (product == null || !mounted) {
        _showSnackBar('Produit introuvable dans le catalogue');
        return;
      }

      // 2. Add main product to quote
      final quotesBloc = ref.read(quotesBlocProvider);
      final quotesState = quotesBloc.state;
      if (quotesState is! QuotesLoaded || quotesState.currentQuote == null) {
        _showSnackBar(
          'Aucun devis actif — ouvrez un devis pour auto-alimenter',
        );
      } else {
        quotesBloc.add(QuoteAddProductRequested(
          product: product,
          quantity: eq.quantity,
          roomName: widget.roomName.isNotEmpty ? widget.roomName : null,
        ));
      }

      // 3. Fetch and process dependencies
      final catalogueRepo = ref.read(catalogueRepositoryProvider);
      final depsResult =
          await catalogueRepo.getProductDependencies(eq.productId);
      if (!mounted) return;

      final deps = depsResult is Success<List<ProductDependency>>
          ? depsResult.data
              .where((d) => d.type == DependencyType.required)
              .toList()
          : <ProductDependency>[];

      // Count how many of the main product are now in the quote (after adding this one)
      final currentMainQty = (quotesState is QuotesLoaded &&
              quotesState.currentQuote != null)
          ? quotesState.currentQuote!.lines
                  .where((l) => l.productId == eq.productId && !l.clientOwned)
                  .fold(0, (sum, l) => sum + l.quantity) +
              eq.quantity
          : eq.quantity;

      for (final dep in deps) {
        if (!mounted) return;
        await _handleDependency(
            dep, eq.position, quotesBloc, quotesState, currentMainQty);
      }

      // 4. Prompt for placement photo
      if (!mounted) return;
      await _promptPlacementPhoto(eq, product.name);
    } finally {
      _isProcessingPlacement = false;
    }
  }

  Future<Product?> _resolveProduct(String productId) async {
    if (_productCache.containsKey(productId)) {
      return _productCache[productId];
    }
    final result =
        await ref.read(catalogueRepositoryProvider).getProduct(productId);
    if (result is Success<Product>) {
      if (mounted) {
        setState(() => _productCache[productId] = result.data);
      }
      return result.data;
    }
    return null;
  }

  Future<void> _handleDependency(
    ProductDependency dep,
    Offset nearPosition,
    QuotesBloc quotesBloc,
    QuotesState quotesState,
    int mainProductQuantityInQuote,
  ) async {
    if (!mounted) return;
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final depProduct = dep.requiredProduct;

    // Check if existing quote lines already cover this dependency.
    // 1 required product covers dep.coveredQuantity units of the dependent.
    // We need ceil(totalDependents / coveredQuantity) units of the required product.
    if (quotesState is QuotesLoaded && quotesState.currentQuote != null) {
      final quote = quotesState.currentQuote!;
      final currentDepCount = quote.lines
          .where((l) => l.productId == depProduct.id)
          .fold(0, (sum, l) => sum + l.quantity);
      final neededDepCount = (mainProductQuantityInQuote / dep.coveredQuantity).ceil();
      if (currentDepCount >= neededDepCount) {
        // Already covered by existing lines — place silently on plan without asking
        final currentState = _bloc.state;
        final planWidth = currentState is FloorPlanLoaded
            ? currentState.plan.widthMeters
            : 10.0;
        final planHeight = currentState is FloorPlanLoaded
            ? currentState.plan.heightMeters
            : 8.0;
        _bloc.add(EquipmentPlaceRequested(
          productId: depProduct.id,
          position: Offset(
            (nearPosition.dx + 0.6).clamp(0.1, planWidth - 0.1),
            (nearPosition.dy + 0.6).clamp(0.1, planHeight - 0.1),
          ),
          label: depProduct.name,
          silent: true,
        ));
        return;
      }
    }

    final clientOwns = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Icon(Icons.link, color: colorScheme.error, size: 22),
            ),
            AppSpacing.hGapMd,
            Expanded(
              child: Text('Dépendance requise',
                  style: textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Cet équipement nécessite :',
              style:
                  textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            AppSpacing.vGapSm,
            Container(
              padding: AppSpacing.cardPadding,
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Row(
                children: [
                  Icon(Icons.device_hub,
                      size: 20, color: colorScheme.primary),
                  AppSpacing.hGapSm,
                  Expanded(
                    child: Text(depProduct.name,
                        style: textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
            if (dep.description != null && dep.description!.isNotEmpty) ...[
              AppSpacing.vGapSm,
              Text(dep.description!,
                  style: textTheme.bodySmall
                      ?.copyWith(color: colorScheme.onSurfaceVariant)),
            ],
            AppSpacing.vGapMd,
            Text(
              'Le client dispose-t-il déjà de cet équipement ?',
              style: textTheme.bodyMedium,
            ),
          ],
        ),
        actions: [
          OutlinedButton.icon(
            onPressed: () => Navigator.pop(ctx, false),
            icon: const Icon(Icons.add_shopping_cart, size: 18),
            label: const Text('Non, à installer'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.check_circle_outline, size: 18),
            label: const Text('Oui, déjà présent'),
          ),
        ],
      ),
    );

    if (!mounted || clientOwns == null) return;

    // Place dependency on plan (slightly offset from main equipment)
    final currentState = _bloc.state;
    final planWidth = currentState is FloorPlanLoaded
        ? currentState.plan.widthMeters
        : 10.0;
    final planHeight = currentState is FloorPlanLoaded
        ? currentState.plan.heightMeters
        : 8.0;

    final depPosition = Offset(
      (nearPosition.dx + 0.6).clamp(0.1, planWidth - 0.1),
      (nearPosition.dy + 0.6).clamp(0.1, planHeight - 0.1),
    );

    _bloc.add(EquipmentPlaceRequested(
      productId: depProduct.id,
      position: depPosition,
      label: clientOwns
          ? '${depProduct.name} (existant client)'
          : depProduct.name,
      silent: true,
    ));
    HapticFeedback.selectionClick();

    // Only add to quote if client doesn't already own it
    if (!clientOwns &&
        quotesState is QuotesLoaded &&
        quotesState.currentQuote != null) {
      quotesBloc.add(QuoteAddProductRequested(
        product: depProduct,
        quantity: 1,
        roomName: widget.roomName.isNotEmpty ? widget.roomName : null,
      ));
    }
  }

  Future<void> _promptPlacementPhoto(
      PlanEquipment eq, String productName) async {
    if (!mounted) return;
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    final takePhoto = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer,
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Icon(Icons.camera_alt,
                  color: colorScheme.primary, size: 22),
            ),
            AppSpacing.hGapMd,
            Expanded(
              child: Text('Photo de l\'emplacement',
                  style: textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Prenez une photo pour documenter où sera placé :',
              style: textTheme.bodyMedium
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            AppSpacing.vGapSm,
            Container(
              padding: AppSpacing.cardPadding,
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer.withAlpha(80),
                borderRadius: AppRadius.borderRadiusMd,
              ),
              child: Row(
                children: [
                  Icon(Icons.electrical_services,
                      size: 20, color: colorScheme.primary),
                  AppSpacing.hGapSm,
                  Expanded(
                    child: Text(
                      eq.label ?? productName,
                      style: textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Plus tard'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.camera_alt, size: 18),
            label: const Text('Prendre la photo'),
          ),
        ],
      ),
    );

    if (!mounted || takePhoto != true) return;

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      constraints: AppSpacing.bottomSheetConstraints,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Source photo',
                style:
                    textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            AppSpacing.vGapMd,
            ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer,
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Icon(Icons.camera_alt, color: colorScheme.primary),
              ),
              title: const Text('Prendre une photo'),
              subtitle: const Text('Caméra de l\'appareil'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: AppRadius.borderRadiusMd,
                ),
                child: Icon(Icons.photo_library,
                    color: colorScheme.onSurfaceVariant),
              ),
              title: const Text('Choisir dans la galerie'),
              subtitle: const Text('Photo existante'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (!mounted || source == null) return;

    final picker = ImagePicker();
    final picked =
        await picker.pickImage(source: source, imageQuality: 80, maxWidth: 1920);
    if (!mounted || picked == null) return;

    HapticFeedback.lightImpact();

    // Upload to server first — local paths cannot be stored in the plan
    final currentState = _bloc.state;
    if (currentState is! FloorPlanLoaded) return;
    _showSnackBar('Téléchargement de la photo...');
    try {
      final url = await ref.read(floorPlanRepositoryProvider).uploadElementPhoto(
        currentState.plan.id,
        eq.id,
        'equipment',
        picked.path,
      );
      if (!mounted) return;
      _bloc.add(EquipmentPhotoAdded(equipmentId: eq.id, photoUrl: url));
      _showSnackBar('Photo enregistrée pour ${eq.label ?? productName}');
    } catch (_) {
      if (!mounted) return;
      _showSnackBar('Erreur lors du téléchargement de la photo');
    }
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
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
      // 3D view (if USDZ available)
      if (state.plan.usdzFilePath != null)
        IconButton(
          icon: const Icon(Icons.threed_rotation),
          onPressed: () => _openUsdzPreview(state.plan.usdzFilePath!),
          tooltip: 'Voir en 3D',
        ),
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
      // Save button
      if (state.isSaving)
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            width: 20, height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        )
      else
        FilledButton.icon(
          onPressed: state.isDirty
              ? () {
                  HapticFeedback.lightImpact();
                  _bloc.add(const FloorPlanSaveRequested());
                }
              : null,
          icon: const Icon(Icons.save_outlined, size: 18),
          label: const Text('Enregistrer'),
        ),
      const SizedBox(width: 8),
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

  Future<void> _openUsdzPreview(String filePath) async {
    try {
      await FlutterRoomplan().previewUsdz(filePath);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Impossible d\'ouvrir la vue 3D'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
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
      _bloc.add(const FloorPlanSaveRequested());
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
            repository: ref.read(floorPlanRepositoryProvider),
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
    // When an element is selected, show a contextual action hint instead of
    // the regular info bar so users know what they can do
    if (state.selectedElementId != null &&
        state.activeTool == PlanTool.select) {
      return Container(
        height: 40,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer.withAlpha(60),
          border: Border(
            bottom:
                BorderSide(color: colorScheme.primary.withAlpha(60)),
          ),
        ),
        child: Row(
          children: [
            Icon(Icons.touch_app, size: 14, color: colorScheme.primary),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'Glissez pour déplacer  •  Renommez dans le panneau droit  •  🗑️ dans la barre haute pour supprimer',
                style: textTheme.bodySmall
                    ?.copyWith(color: colorScheme.primary),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            TextButton.icon(
              onPressed: () {
                HapticFeedback.lightImpact();
                _bloc.add(const FloorPlanDeleteSelectedRequested());
              },
              icon: Icon(Icons.delete_outline,
                  size: 16, color: colorScheme.error),
              label: Text('Supprimer',
                  style: TextStyle(
                      color: colorScheme.error, fontSize: 12)),
              style: TextButton.styleFrom(
                minimumSize: const Size(0, 32),
                padding:
                    const EdgeInsets.symmetric(horizontal: 8),
              ),
            ),
          ],
        ),
      );
    }

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
          Expanded(
            child: Row(
              children: [
                Icon(Icons.grid_on, size: 14, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Flexible(
                  child: Text('Grille 25cm',
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant)),
                ),
                const SizedBox(width: 16),
                Icon(Icons.straighten, size: 14, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    '${state.plan.widthMeters.toStringAsFixed(0)} x ${state.plan.heightMeters.toStringAsFixed(0)} m',
                    style: textTheme.bodySmall
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 16),
                Icon(Icons.layers, size: 14, color: colorScheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    '${state.plan.walls.length} murs · ${state.plan.equipmentCount} équip.',
                    style: textTheme.bodySmall
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          // Draft indicator
          if (state.hasDraft)
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF57C00).withAlpha(25),
                borderRadius: AppRadius.borderRadiusFull,
                border: Border.all(color: const Color(0xFFF57C00).withAlpha(80)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 6, height: 6,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Color(0xFFF57C00),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Brouillon',
                    style: textTheme.labelSmall?.copyWith(
                      color: const Color(0xFFF57C00),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(width: 8),
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
