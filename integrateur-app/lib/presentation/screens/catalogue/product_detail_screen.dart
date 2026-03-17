import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/entities/project.dart';
import '../../../domain/entities/quote.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../routes/app_router.dart';
import '../../blocs/catalogue/catalogue_bloc.dart';

/// Full product detail screen
class ProductDetailScreen extends ConsumerWidget {
  final String productId;

  const ProductDetailScreen({
    super.key,
    required this.productId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalogueBloc = ref.watch(catalogueBlocProvider);

    return BlocBuilder<CatalogueBloc, CatalogueState>(
      bloc: catalogueBloc,
      builder: (context, state) {
        if (state is! CatalogueLoaded) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        final product = state.allProducts
            .where((p) => p.id == productId)
            .firstOrNull;

        if (product == null) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64,
                      color: Theme.of(context).colorScheme.error),
                  AppSpacing.vGapMd,
                  const Text('Produit non trouvé'),
                  AppSpacing.vGapMd,
                  FilledButton(
                    onPressed: () => context.goToCatalogue(),
                    child: const Text('Retour au catalogue'),
                  ),
                ],
              ),
            ),
          );
        }

        return _ProductDetailView(
          product: product,
          catalogueBloc: catalogueBloc,
        );
      },
    );
  }
}

class _ProductDetailView extends ConsumerStatefulWidget {
  final Product product;
  final CatalogueBloc catalogueBloc;

  const _ProductDetailView({
    required this.product,
    required this.catalogueBloc,
  });

  @override
  ConsumerState<_ProductDetailView> createState() =>
      _ProductDetailViewState();
}

class _ProductDetailViewState extends ConsumerState<_ProductDetailView> {
  List<ProductDependency>? _dependencies;
  bool _loadingDeps = true;

  Product get product => widget.product;
  CatalogueBloc get catalogueBloc => widget.catalogueBloc;

  @override
  void initState() {
    super.initState();
    _loadDependencies();
  }

  Future<void> _loadDependencies() async {
    final useCase = ref.read(getProductDependenciesUseCaseProvider);
    final result = await useCase(product.id);

    if (!mounted) return;

    setState(() {
      _loadingDeps = false;
      if (result is Success<List<ProductDependency>>) {
        _dependencies = result.data;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Hero header
          SliverAppBar(
            expandedHeight: isWide ? 300 : 240,
            pinned: true,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: colorScheme.surface.withAlpha(200),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_back),
              ),
              onPressed: () => context.goToCatalogue(),
            ),
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: colorScheme.surface.withAlpha(200),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    product.isFavorite ? Icons.favorite : Icons.favorite_border,
                    color: product.isFavorite ? colorScheme.error : null,
                  ),
                ),
                tooltip: product.isFavorite
                    ? 'Retirer des favoris'
                    : 'Ajouter aux favoris',
                onPressed: () {
                  HapticFeedback.selectionClick();
                  catalogueBloc
                      .add(CatalogueToggleFavoriteRequested(product.id));
                },
              ),
              const SizedBox(width: 8),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: colorScheme.surfaceContainerHighest,
                child: Center(
                  child: Icon(
                    _getCategoryIcon(product.category),
                    size: isWide ? 96 : 72,
                    color: colorScheme.onSurfaceVariant.withAlpha(100),
                  ),
                ),
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: isWide
                ? _buildWideContent(context, colorScheme, textTheme)
                : _buildNarrowContent(context, colorScheme, textTheme),
          ),
        ],
      ),

      // Bottom action bar
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Prix HT',
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    Text(
                      product.salePrice.asCurrency,
                      style: textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              FilledButton.icon(
                onPressed: () {
                  HapticFeedback.lightImpact();
                  _showAddToQuoteSheet(context);
                },
                icon: const Icon(Icons.add_shopping_cart),
                label: const Text('Ajouter au devis'),
                style: FilledButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Add to quote bottom sheet ─────────────────────────────────

  void _showAddToQuoteSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      constraints: AppSpacing.bottomSheetConstraints,
      builder: (sheetContext) {
        return _AddToQuoteSheet(product: product);
      },
    );
  }

  // ─── Layout builders ──────────────────────────────────────────

  Widget _buildWideContent(
      BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeaderSection(colorScheme, textTheme),
                    AppSpacing.vGapLg,
                    _buildDescriptionSection(textTheme),
                    AppSpacing.vGapLg,
                    _buildSpecsSection(context, colorScheme, textTheme),
                  ],
                ),
              ),
              AppSpacing.hGapXl,
              Expanded(
                flex: 2,
                child: Column(
                  children: [
                    _buildPriceCard(colorScheme, textTheme),
                    AppSpacing.vGapMd,
                    _buildStockCard(colorScheme, textTheme),
                    AppSpacing.vGapMd,
                    _buildInfoCard(colorScheme, textTheme),
                  ],
                ),
              ),
            ],
          ),
          AppSpacing.vGapLg,
          _buildDependenciesSection(context, colorScheme, textTheme),
        ],
      ),
    );
  }

  Widget _buildNarrowContent(
      BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeaderSection(colorScheme, textTheme),
          AppSpacing.vGapMd,
          _buildPriceCard(colorScheme, textTheme),
          AppSpacing.vGapMd,
          _buildStockCard(colorScheme, textTheme),
          AppSpacing.vGapLg,
          _buildDescriptionSection(textTheme),
          AppSpacing.vGapLg,
          _buildSpecsSection(context, colorScheme, textTheme),
          AppSpacing.vGapMd,
          _buildInfoCard(colorScheme, textTheme),
          AppSpacing.vGapLg,
          _buildDependenciesSection(context, colorScheme, textTheme),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  // ─── Sections ─────────────────────────────────────────────────

  Widget _buildHeaderSection(ColorScheme colorScheme, TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: colorScheme.primaryContainer,
            borderRadius: AppRadius.borderRadiusFull,
          ),
          child: Text(
            product.brand,
            style: textTheme.labelLarge?.copyWith(
              color: colorScheme.onPrimaryContainer,
            ),
          ),
        ),
        AppSpacing.vGapSm,
        Text(
          product.name,
          style: textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        AppSpacing.vGapXs,
        Text(
          'Réf: ${product.reference}',
          style: textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        AppSpacing.vGapSm,
        Chip(
          avatar: Icon(_getCategoryIcon(product.category), size: 16),
          label: Text(product.category.displayName),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ],
    );
  }

  Widget _buildPriceCard(ColorScheme colorScheme, TextTheme textTheme) {
    final priceTTC = product.salePrice * (1 + product.marginPercent / 100);

    return Card(
      child: Padding(
        padding: AppSpacing.cardPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.euro, size: 20, color: colorScheme.primary),
                AppSpacing.hGapSm,
                Text('Tarification', style: textTheme.titleMedium),
              ],
            ),
            AppSpacing.vGapMd,
            _buildInfoRow(
              'Prix HT',
              product.salePrice.asCurrency,
              textTheme,
              valueStyle: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: colorScheme.primary,
              ),
            ),
            const Divider(height: 24),
            _buildInfoRow(
                'TVA', '${product.marginPercent.toStringAsFixed(0)}%', textTheme),
            AppSpacing.vGapXs,
            _buildInfoRow(
              'Prix TTC',
              priceTTC.asCurrency,
              textTheme,
              valueStyle: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStockCard(ColorScheme colorScheme, TextTheme textTheme) {
    return Card(
      child: Padding(
        padding: AppSpacing.cardPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.inventory_2, size: 20, color: colorScheme.primary),
                AppSpacing.hGapSm,
                Text('Stock', style: textTheme.titleMedium),
              ],
            ),
            AppSpacing.vGapMd,
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: product.isInStock
                        ? (product.isLowStock ? Colors.orange : Colors.green)
                        : colorScheme.error,
                  ),
                ),
                AppSpacing.hGapSm,
                Expanded(
                  child: Text(
                    product.isInStock
                        ? (product.isLowStock ? 'Stock faible' : 'En stock')
                        : 'Rupture de stock',
                    style: textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: product.isInStock
                          ? (product.isLowStock ? Colors.orange : Colors.green)
                          : colorScheme.error,
                    ),
                  ),
                ),
              ],
            ),
            AppSpacing.vGapSm,
            _buildInfoRow(
              'Quantité disponible',
              '${product.stockAvailable} unité${product.stockAvailable > 1 ? 's' : ''}',
              textTheme,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDescriptionSection(TextTheme textTheme) {
    if (product.description.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Description',
            style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
        AppSpacing.vGapSm,
        Text(product.description,
            style: textTheme.bodyLarge?.copyWith(height: 1.6)),
      ],
    );
  }

  Widget _buildSpecsSection(
      BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    final specs = product.specs;
    final hasSpecs = specs.alimentation != null ||
        specs.dimensions != null ||
        specs.compatibiliteHA != null ||
        product.protocols.isNotEmpty;

    if (!hasSpecs) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Caractéristiques techniques',
            style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
        AppSpacing.vGapMd,
        if (product.protocols.isNotEmpty) ...[
          Text('Protocoles', style: textTheme.titleSmall),
          AppSpacing.vGapSm,
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: product.protocols.map((p) {
              return Chip(
                avatar: const Icon(Icons.bluetooth_connected, size: 16),
                label: Text(p.displayName),
              );
            }).toList(),
          ),
          AppSpacing.vGapMd,
        ],
        Card(
          child: Padding(
            padding: AppSpacing.cardPadding,
            child: Column(
              children: [
                if (specs.dimensions != null)
                  _buildSpecRow(Icons.straighten, 'Dimensions',
                      specs.dimensions!, colorScheme, textTheme),
                if (specs.alimentation != null)
                  _buildSpecRow(Icons.power, 'Alimentation',
                      specs.alimentation!, colorScheme, textTheme),
                _buildSpecRow(Icons.place, 'Emplacement',
                    specs.locationType.displayName, colorScheme, textTheme),
                if (specs.compatibiliteHA != null)
                  _buildSpecRow(
                      Icons.home,
                      'Compatible domotique',
                      specs.compatibiliteHA! ? 'Oui' : 'Non',
                      colorScheme,
                      textTheme),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard(ColorScheme colorScheme, TextTheme textTheme) {
    return Card(
      child: Padding(
        padding: AppSpacing.cardPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, size: 20, color: colorScheme.primary),
                AppSpacing.hGapSm,
                Text('Informations', style: textTheme.titleMedium),
              ],
            ),
            AppSpacing.vGapMd,
            _buildInfoRow('Catégorie', product.category.displayName, textTheme),
            AppSpacing.vGapXs,
            _buildInfoRow('Marque', product.brand, textTheme),
            AppSpacing.vGapXs,
            _buildInfoRow('Référence', product.reference, textTheme),
            AppSpacing.vGapXs,
            _buildInfoRow(
                'Statut', product.isActive ? 'Actif' : 'Inactif', textTheme),
            if (product.subCategory != null) ...[
              AppSpacing.vGapXs,
              _buildInfoRow(
                  'Sous-catégorie', product.subCategory!, textTheme),
            ],
          ],
        ),
      ),
    );
  }

  // ─── Dependencies section ─────────────────────────────────────

  Widget _buildDependenciesSection(
      BuildContext context, ColorScheme colorScheme, TextTheme textTheme) {
    // Still loading
    if (_loadingDeps) {
      return Card(
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Row(
            children: [
              Icon(Icons.account_tree, size: 20, color: colorScheme.primary),
              AppSpacing.hGapSm,
              Text('Dépendances produit', style: textTheme.titleMedium),
              AppSpacing.hGapMd,
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ],
          ),
        ),
      );
    }

    // No dependencies or error
    if (_dependencies == null || _dependencies!.isEmpty) {
      return const SizedBox.shrink();
    }

    final deps = _dependencies!;
    final requiredDeps =
        deps.where((d) => d.type == DependencyType.required).toList();
    final recommendedDeps =
        deps.where((d) => d.type == DependencyType.recommended).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.account_tree, size: 24, color: colorScheme.primary),
            AppSpacing.hGapSm,
            Text(
              'Dépendances produit',
              style:
                  textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            AppSpacing.hGapSm,
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer,
                borderRadius: AppRadius.borderRadiusFull,
              ),
              child: Text(
                '${deps.length}',
                style: textTheme.labelMedium?.copyWith(
                  color: colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        AppSpacing.vGapMd,

        // Legend
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            _buildLegendItem(AppTheme.errorColor, 'Obligatoire', textTheme),
            _buildLegendItem(AppTheme.warningColor, 'Recommandé', textTheme),
            _buildLegendItem(colorScheme.primary, 'Produit courant', textTheme),
          ],
        ),
        AppSpacing.vGapMd,

        // Required dependencies
        if (requiredDeps.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'NÉCESSITE',
              style: textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
                letterSpacing: 0.5,
              ),
            ),
          ),
          ...requiredDeps.map((dep) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildDependencyCard(
                    context, dep, colorScheme, textTheme),
              )),
        ],

        // Recommended dependencies
        if (recommendedDeps.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 8),
            child: Text(
              'RECOMMANDÉ',
              style: textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
                letterSpacing: 0.5,
              ),
            ),
          ),
          ...recommendedDeps.map((dep) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildDependencyCard(
                    context, dep, colorScheme, textTheme),
              )),
        ],
      ],
    );
  }

  Widget _buildDependencyCard(BuildContext context, ProductDependency dep,
      ColorScheme colorScheme, TextTheme textTheme) {
    final reqProduct = dep.requiredProduct;
    final isRequired = dep.type == DependencyType.required;
    final badgeColor =
        isRequired ? AppTheme.errorColor : AppTheme.warningColor;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        borderRadius: AppRadius.borderRadiusLg,
        onTap: () {
          HapticFeedback.selectionClick();
          context.goToProductDetail(reqProduct.id);
        },
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Row(
            children: [
              // Product icon
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: badgeColor.withAlpha(25),
                  borderRadius: AppRadius.borderRadiusSm,
                  border: Border.all(color: badgeColor.withAlpha(80)),
                ),
                child: Icon(
                  _getCategoryIcon(reqProduct.category),
                  color: badgeColor,
                  size: 24,
                ),
              ),
              AppSpacing.hGapMd,
              // Product info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reqProduct.name,
                      style: textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    AppSpacing.vGapXs,
                    Text(
                      '${reqProduct.reference} · ${reqProduct.brand}',
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (dep.description != null &&
                        dep.description!.isNotEmpty) ...[
                      AppSpacing.vGapXs,
                      Text(
                        dep.description!,
                        style: textTheme.bodySmall?.copyWith(
                          fontStyle: FontStyle.italic,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              AppSpacing.hGapSm,
              // Type badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeColor.withAlpha(25),
                  borderRadius: AppRadius.borderRadiusFull,
                  border: Border.all(color: badgeColor.withAlpha(80)),
                ),
                child: Text(
                  dep.type.displayName,
                  style: textTheme.labelSmall?.copyWith(
                    color: badgeColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              AppSpacing.hGapSm,
              Icon(Icons.chevron_right,
                  color: colorScheme.onSurfaceVariant, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label, TextTheme textTheme) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color.withAlpha(40),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: textTheme.bodySmall),
      ],
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────

  Widget _buildInfoRow(String label, String value, TextTheme textTheme,
      {TextStyle? valueStyle}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style:
                textTheme.bodyMedium?.copyWith(color: Colors.grey[600])),
        Text(value,
            style: valueStyle ??
                textTheme.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildSpecRow(IconData icon, String label, String value,
      ColorScheme colorScheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: colorScheme.onSurfaceVariant),
          AppSpacing.hGapSm,
          Expanded(child: Text(label, style: textTheme.bodyMedium)),
          Text(value,
              style: textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(ProductCategory category) {
    switch (category) {
      case ProductCategory.eclairage:
        return Icons.lightbulb;
      case ProductCategory.ouvrants:
        return Icons.window;
      case ProductCategory.climat:
        return Icons.thermostat;
      case ProductCategory.securite:
        return Icons.security;
      case ProductCategory.energie:
        return Icons.router;
      case ProductCategory.multimedia:
        return Icons.speaker;
      case ProductCategory.custom:
        return Icons.build;
    }
  }
}

// ─── Add to quote bottom sheet ────────────────────────────────────

class _AddToQuoteSheet extends ConsumerStatefulWidget {
  final Product product;

  const _AddToQuoteSheet({required this.product});

  @override
  ConsumerState<_AddToQuoteSheet> createState() => _AddToQuoteSheetState();
}

class _AddToQuoteSheetState extends ConsumerState<_AddToQuoteSheet> {
  int _quantity = 1;
  List<Project>? _projects;
  bool _isLoading = true;
  bool _isAdding = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    final getProjects = ref.read(getProjectsUseCaseProvider);
    final result = await getProjects();

    if (!mounted) return;

    switch (result) {
      case Success(data: final projects):
        setState(() {
          // Only show editable projects (brouillon/en_cours)
          _projects = projects
              .where((p) => p.isEditable)
              .toList();
          _isLoading = false;
        });
      case Error(failure: final failure):
        setState(() {
          _error = failure.message;
          _isLoading = false;
        });
    }
  }

  Future<void> _addToQuote(Project project) async {
    setState(() => _isAdding = true);

    final quoteRepo = ref.read(quoteRepositoryProvider);

    // 1. Load quotes for this project
    final quotesResult = await quoteRepo.getQuotesForProject(project.id);

    if (!mounted) return;

    Quote? targetQuote;

    switch (quotesResult) {
      case Success(data: final quotes):
        final quotesList = List<Quote>.from(quotes);
        // Find a draft quote
        final drafts = quotesList
            .where((q) => q.status == QuoteStatus.brouillon)
            .toList();
        if (drafts.isNotEmpty) {
          targetQuote = drafts.first;
        }
      case Error():
        // No quotes found, we'll create one
        break;
    }

    // 2. Create a quote if needed
    if (targetQuote == null) {
      final numberResult = await quoteRepo.generateQuoteNumber();
      if (!mounted) return;

      if (numberResult is Error) {
        setState(() {
          _error = 'Impossible de créer le devis';
          _isAdding = false;
        });
        return;
      }

      final number = (numberResult as Success<String>).data;
      final createResult = await quoteRepo.createQuote(Quote(
        id: '',
        projectId: project.id,
        number: number,
        date: DateTime.now(),
      ));

      if (!mounted) return;

      switch (createResult) {
        case Success(data: final quote):
          targetQuote = quote;
        case Error(failure: final failure):
          setState(() {
            _error = failure.message;
            _isAdding = false;
          });
          return;
      }
    }

    // 3. Add the product line
    final line = QuoteLine(
      id: '',
      type: QuoteLineType.produit,
      productId: widget.product.id,
      description: widget.product.name,
      quantity: _quantity,
      unitPriceHT: widget.product.salePrice,
    );

    final addResult = await quoteRepo.addLine(targetQuote.id, line);

    if (!mounted) return;

    switch (addResult) {
      case Success():
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${widget.product.name} ajouté au devis ${targetQuote.number}'),
            behavior: SnackBarBehavior.floating,
            action: SnackBarAction(
              label: 'Voir le devis',
              onPressed: () => context.goToQuote(project.id),
            ),
          ),
        );
      case Error(failure: final failure):
        setState(() {
          _error = failure.message;
          _isAdding = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colorScheme.onSurfaceVariant.withAlpha(80),
                borderRadius: AppRadius.borderRadiusFull,
              ),
            ),
          ),
          AppSpacing.vGapMd,

          // Title
          Text('Ajouter au devis', style: textTheme.titleLarge),
          AppSpacing.vGapLg,

          // Product summary
          Card(
            color: colorScheme.surfaceContainerHighest,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: colorScheme.primaryContainer,
                      borderRadius: AppRadius.borderRadiusSm,
                    ),
                    child: Icon(
                      _getCategoryIcon(widget.product.category),
                      color: colorScheme.onPrimaryContainer,
                    ),
                  ),
                  AppSpacing.hGapMd,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.product.name,
                            style: textTheme.titleSmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        Text(widget.product.brand,
                            style: textTheme.bodySmall?.copyWith(
                                color: colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  Text(widget.product.salePrice.asCurrency,
                      style: textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          AppSpacing.vGapMd,

          // Quantity selector
          Row(
            children: [
              Text('Quantité', style: textTheme.titleSmall),
              const Spacer(),
              IconButton.outlined(
                icon: const Icon(Icons.remove),
                onPressed: _quantity > 1
                    ? () => setState(() => _quantity--)
                    : null,
                visualDensity: VisualDensity.compact,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  '$_quantity',
                  style: textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
              ),
              IconButton.outlined(
                icon: const Icon(Icons.add),
                onPressed: () => setState(() => _quantity++),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),

          // Total
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text('Total HT: ', style: textTheme.bodyMedium),
                Text(
                  (widget.product.salePrice * _quantity).asCurrency,
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 24),

          // Error
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                borderRadius: AppRadius.borderRadiusSm,
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: colorScheme.error, size: 20),
                  AppSpacing.hGapSm,
                  Expanded(
                    child: Text(_error!,
                        style: textTheme.bodySmall
                            ?.copyWith(color: colorScheme.onErrorContainer)),
                  ),
                ],
              ),
            ),
            AppSpacing.vGapMd,
          ],

          // Project selection
          Text('Sélectionner un projet', style: textTheme.titleSmall),
          AppSpacing.vGapSm,

          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_projects == null || _projects!.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.folder_off, size: 48,
                        color: colorScheme.onSurfaceVariant),
                    AppSpacing.vGapSm,
                    Text('Aucun projet en cours',
                        style: textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurfaceVariant)),
                  ],
                ),
              ),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 260),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _projects!.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final project = _projects![index];
                  return _buildProjectTile(
                      context, project, colorScheme, textTheme);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProjectTile(BuildContext context, Project project,
      ColorScheme colorScheme, TextTheme textTheme) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: _isAdding ? null : () => _addToQuote(project),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Project icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: colorScheme.secondaryContainer,
                  borderRadius: AppRadius.borderRadiusSm,
                ),
                child: Icon(Icons.folder,
                    color: colorScheme.onSecondaryContainer, size: 20),
              ),
              AppSpacing.hGapMd,
              // Project info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(project.name,
                        style: textTheme.titleSmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    if (project.client != null)
                      Text(
                        project.client!.fullName,
                        style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant),
                      ),
                  ],
                ),
              ),
              // Status badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: _statusColor(project.status, colorScheme)
                      .withAlpha(30),
                  borderRadius: AppRadius.borderRadiusFull,
                ),
                child: Text(
                  project.status.displayName,
                  style: textTheme.labelSmall?.copyWith(
                    color: _statusColor(project.status, colorScheme),
                  ),
                ),
              ),
              AppSpacing.hGapSm,
              if (_isAdding)
                const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
              else
                const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }

  Color _statusColor(ProjectStatus status, ColorScheme colorScheme) {
    switch (status) {
      case ProjectStatus.brouillon:
        return Colors.purple;
      case ProjectStatus.enCours:
        return Colors.blue;
      case ProjectStatus.termine:
        return Colors.green;
      case ProjectStatus.archive:
        return Colors.grey;
    }
  }

  IconData _getCategoryIcon(ProductCategory category) {
    switch (category) {
      case ProductCategory.eclairage:
        return Icons.lightbulb;
      case ProductCategory.ouvrants:
        return Icons.window;
      case ProductCategory.climat:
        return Icons.thermostat;
      case ProductCategory.securite:
        return Icons.security;
      case ProductCategory.energie:
        return Icons.router;
      case ProductCategory.multimedia:
        return Icons.speaker;
      case ProductCategory.custom:
        return Icons.build;
    }
  }
}
