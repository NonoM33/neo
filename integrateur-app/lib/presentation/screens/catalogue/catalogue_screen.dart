import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/product.dart';
import '../../../routes/app_router.dart';
import '../../blocs/catalogue/catalogue_bloc.dart';

/// Catalogue screen for browsing products - tablet optimized
class CatalogueScreen extends ConsumerStatefulWidget {
  const CatalogueScreen({super.key});

  @override
  ConsumerState<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends ConsumerState<CatalogueScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(catalogueBlocProvider);
    if (bloc.state is CatalogueInitial) {
      bloc.add(const CatalogueLoadRequested());
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final catalogueBloc = ref.watch(catalogueBlocProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Catalogue'),
        actions: [
          BlocBuilder<CatalogueBloc, CatalogueState>(
            bloc: catalogueBloc,
            builder: (context, state) {
              final isSyncing = state is CatalogueLoaded && state.isSyncing;
              return IconButton(
                icon: isSyncing
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.sync),
                onPressed: isSyncing
                    ? null
                    : () => catalogueBloc.add(const CatalogueSyncRequested()),
                tooltip: 'Synchroniser le catalogue',
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<CatalogueBloc, CatalogueState>(
        bloc: catalogueBloc,
        builder: (context, state) {
          if (state is CatalogueLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is CatalogueError) {
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
                      catalogueBloc.add(const CatalogueLoadRequested());
                    },
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is CatalogueLoaded) {
            if (isWide) {
              return _buildTabletLayout(context, catalogueBloc, state);
            }
            return _buildMobileLayout(context, catalogueBloc, state);
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  /// Tablet: 2-panel layout (sidebar + grid)
  Widget _buildTabletLayout(BuildContext context, CatalogueBloc bloc, CatalogueLoaded state) {
    return Row(
      children: [
        // Filters sidebar - 25% of screen
        SizedBox(
          width: (MediaQuery.sizeOf(context).width * 0.25).clamp(250, 340),
          child: _buildFiltersSidebar(context, bloc, state),
        ),
        const VerticalDivider(width: 1),
        // Products grid - flexible
        Expanded(
          child: _buildProductsSection(context, bloc, state),
        ),
      ],
    );
  }

  /// Mobile: stacked layout
  Widget _buildMobileLayout(BuildContext context, CatalogueBloc bloc, CatalogueLoaded state) {
    return Column(
      children: [
        _buildSearchBar(context, bloc),
        _buildCategoryChips(context, bloc, state),
        Expanded(
          child: _buildProductsGrid(context, bloc, state.products),
        ),
      ],
    );
  }

  Widget _buildFiltersSidebar(
    BuildContext context,
    CatalogueBloc bloc,
    CatalogueLoaded state,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Search
        Padding(
          padding: AppSpacing.cardPadding,
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Rechercher...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      tooltip: 'Effacer',
                      onPressed: () {
                        _searchController.clear();
                        bloc.add(const CatalogueSearchRequested(''));
                      },
                    )
                  : null,
            ),
            onChanged: (value) {
              setState(() {}); // update suffix icon
              bloc.add(CatalogueSearchRequested(value));
            },
          ),
        ),

        // Categories
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'Catégories',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        AppSpacing.vGapSm,

        // "Tous" option
        ListTile(
          leading: const Icon(Icons.apps),
          title: const Text('Tous'),
          trailing: Text('${state.allProducts.length}'),
          selected: state.activeCategory == null && !state.favoritesOnly,
          onTap: () {
            bloc.add(const CatalogueFilterChanged());
          },
        ),

        ...ProductCategory.values.map((category) {
          final count = state.countForCategory(category);
          if (count == 0) return const SizedBox.shrink();
          return ListTile(
            leading: Icon(
              _getCategoryIcon(category),
              color: state.activeCategory == category
                  ? Theme.of(context).colorScheme.primary
                  : null,
            ),
            title: Text(category.displayName),
            trailing: Text('$count'),
            selected: state.activeCategory == category,
            onTap: () {
              final newCategory =
                  state.activeCategory == category ? null : category;
              bloc.add(CatalogueFilterChanged(category: newCategory));
            },
          );
        }),

        const Divider(),

        // Favorites
        ListTile(
          leading: Icon(Icons.favorite, color: Theme.of(context).colorScheme.error),
          title: const Text('Favoris'),
          trailing: Text('${state.favorites.length}'),
          selected: state.favoritesOnly,
          onTap: () {
            if (state.favoritesOnly) {
              bloc.add(const CatalogueFilterChanged());
            } else {
              bloc.add(const CatalogueFilterChanged(favoritesOnly: true));
            }
          },
        ),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context, CatalogueBloc bloc) {
    return Padding(
      padding: AppSpacing.cardPadding,
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Rechercher un produit...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  tooltip: 'Effacer',
                  onPressed: () {
                    _searchController.clear();
                    bloc.add(const CatalogueSearchRequested(''));
                  },
                )
              : null,
        ),
        onChanged: (value) {
          setState(() {}); // update suffix icon
          bloc.add(CatalogueSearchRequested(value));
        },
      ),
    );
  }

  Widget _buildCategoryChips(BuildContext context, CatalogueBloc bloc, CatalogueLoaded state) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          FilterChip(
            label: const Text('Tous'),
            selected: state.activeCategory == null && !state.favoritesOnly,
            onSelected: (_) {
              bloc.add(const CatalogueFilterChanged());
            },
          ),
          AppSpacing.hGapSm,
          ...ProductCategory.values.where((c) => state.countForCategory(c) > 0).map((category) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                avatar: Icon(_getCategoryIcon(category), size: 18),
                label: Text(category.displayName),
                selected: state.activeCategory == category,
                onSelected: (selected) {
                  bloc.add(CatalogueFilterChanged(
                    category: selected ? category : null,
                  ));
                },
              ),
            );
          }),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              avatar: Icon(Icons.favorite,
                  size: 18, color: state.favoritesOnly ? null : Theme.of(context).colorScheme.error),
              label: Text('Favoris (${state.favorites.length})'),
              selected: state.favoritesOnly,
              onSelected: (selected) {
                if (selected) {
                  bloc.add(const CatalogueFilterChanged(favoritesOnly: true));
                } else {
                  bloc.add(const CatalogueFilterChanged());
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsSection(
    BuildContext context,
    CatalogueBloc bloc,
    CatalogueLoaded state,
  ) {
    final filtered = state.products;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: AppSpacing.cardPadding,
          child: Text(
            '${filtered.length} produit${filtered.length > 1 ? 's' : ''}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
        Expanded(
          child: _buildProductsGrid(context, bloc, filtered),
        ),
      ],
    );
  }

  Widget _buildProductsGrid(
    BuildContext context,
    CatalogueBloc bloc,
    List<Product> products,
  ) {
    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inventory_2,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            AppSpacing.vGapMd,
            Text(
              'Aucun produit trouvé',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = (constraints.maxWidth / 220).floor().clamp(2, 5);

        return GridView.builder(
          padding: AppSpacing.pagePadding,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.85,
          ),
          itemCount: products.length,
          itemBuilder: (context, index) {
            return _buildProductCard(context, bloc, products[index]);
          },
        );
      },
    );
  }

  Widget _buildProductCard(
    BuildContext context,
    CatalogueBloc bloc,
    Product product,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          context.goToProductDetail(product.id);
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image placeholder
            Expanded(
              child: Container(
                width: double.infinity,
                color: colorScheme.surfaceContainerHighest,
                child: Stack(
                  children: [
                    Center(
                      child: Icon(
                        _getCategoryIcon(product.category),
                        size: 48,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: IconButton(
                        icon: Icon(
                          product.isFavorite
                              ? Icons.favorite
                              : Icons.favorite_border,
                          color: product.isFavorite ? colorScheme.error : null,
                        ),
                        tooltip: product.isFavorite
                            ? 'Retirer des favoris'
                            : 'Ajouter aux favoris',
                        onPressed: () {
                          HapticFeedback.selectionClick();
                          bloc.add(CatalogueToggleFavoriteRequested(product.id));
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.brand,
                    style: textTheme.bodySmall?.copyWith(
                      color: colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    product.name,
                    style: textTheme.titleSmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  AppSpacing.vGapXs,
                  Text(
                    product.salePrice.asCurrency,
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
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
