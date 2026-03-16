import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/extensions.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/repositories/catalogue_repository.dart';
import '../../blocs/catalogue/catalogue_bloc.dart';

/// Catalogue screen for browsing products
class CatalogueScreen extends ConsumerStatefulWidget {
  const CatalogueScreen({super.key});

  @override
  ConsumerState<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends ConsumerState<CatalogueScreen> {
  final _searchController = TextEditingController();
  ProductCategory? _selectedCategory;

  @override
  void initState() {
    super.initState();
    ref.read(catalogueBlocProvider).add(const CatalogueLoadRequested());
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
    final isTablet = MediaQuery.sizeOf(context).width >= 900;

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
                tooltip: 'Synchroniser',
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
                  Icon(Icons.error_outline, size: 48, color: colorScheme.error),
                  AppSpacing.vGapMd,
                  Text(state.message),
                  AppSpacing.vGapMd,
                  ElevatedButton(
                    onPressed: () {
                      catalogueBloc.add(const CatalogueLoadRequested());
                    },
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          if (state is CatalogueLoaded) {
            if (isTablet) {
              return Row(
                children: [
                  // Filters sidebar
                  SizedBox(
                    width: 280,
                    child: _buildFiltersSidebar(context, catalogueBloc, state),
                  ),
                  const VerticalDivider(width: 1),
                  // Products grid
                  Expanded(
                    child: _buildProductsSection(context, catalogueBloc, state),
                  ),
                  // Product detail (if selected)
                  if (state.selectedProduct != null) ...[
                    const VerticalDivider(width: 1),
                    SizedBox(
                      width: 400,
                      child: _buildProductDetail(context, state.selectedProduct!),
                    ),
                  ],
                ],
              );
            }

            return Column(
              children: [
                _buildSearchBar(context, catalogueBloc),
                _buildCategoryChips(context, catalogueBloc),
                Expanded(
                  child: _buildProductsGrid(context, catalogueBloc, state.products),
                ),
              ],
            );
          }

          return const SizedBox.shrink();
        },
      ),
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
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Rechercher...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        bloc.add(const CatalogueLoadRequested());
                      },
                    )
                  : null,
            ),
            onSubmitted: (value) {
              bloc.add(CatalogueSearchRequested(value));
            },
          ),
        ),

        // Categories
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Catégories',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        AppSpacing.vGapSm,
        ...ProductCategory.values.map((category) {
          final count = state.products
              .where((p) => p.category == category)
              .length;
          return ListTile(
            leading: Icon(
              _getCategoryIcon(category),
              color: _selectedCategory == category
                  ? Theme.of(context).colorScheme.primary
                  : null,
            ),
            title: Text(category.displayName),
            trailing: Text('$count'),
            selected: _selectedCategory == category,
            onTap: () {
              setState(() {
                _selectedCategory =
                    _selectedCategory == category ? null : category;
              });
              if (_selectedCategory != null) {
                bloc.add(CatalogueFilterChanged(
                  ProductFilter(category: _selectedCategory),
                ));
              } else {
                bloc.add(const CatalogueLoadRequested());
              }
            },
          );
        }),

        const Divider(),

        // Favorites
        ListTile(
          leading: const Icon(Icons.favorite),
          title: const Text('Favoris'),
          trailing: Text('${state.favorites.length}'),
          onTap: () {
            bloc.add(const CatalogueFilterChanged(
              ProductFilter(favoritesOnly: true),
            ));
          },
        ),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context, CatalogueBloc bloc) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Rechercher un produit...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    bloc.add(const CatalogueLoadRequested());
                  },
                )
              : null,
        ),
        onSubmitted: (value) {
          bloc.add(CatalogueSearchRequested(value));
        },
      ),
    );
  }

  Widget _buildCategoryChips(BuildContext context, CatalogueBloc bloc) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          FilterChip(
            label: const Text('Tous'),
            selected: _selectedCategory == null,
            onSelected: (selected) {
              setState(() => _selectedCategory = null);
              bloc.add(const CatalogueLoadRequested());
            },
          ),
          AppSpacing.hGapSm,
          ...ProductCategory.values.map((category) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                avatar: Icon(_getCategoryIcon(category), size: 18),
                label: Text(category.displayName),
                selected: _selectedCategory == category,
                onSelected: (selected) {
                  setState(() {
                    _selectedCategory = selected ? category : null;
                  });
                  if (selected) {
                    bloc.add(CatalogueFilterChanged(
                      ProductFilter(category: category),
                    ));
                  } else {
                    bloc.add(const CatalogueLoadRequested());
                  }
                },
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildProductsSection(
    BuildContext context,
    CatalogueBloc bloc,
    CatalogueLoaded state,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            '${state.products.length} produits',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        Expanded(
          child: _buildProductsGrid(context, bloc, state.products),
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
            const Text('Aucun produit trouvé'),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: AppSpacing.pagePadding,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: MediaQuery.sizeOf(context).width >= 1200 ? 4 : 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 0.75,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        return _buildProductCard(context, bloc, products[index]);
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
        onTap: () => bloc.add(CatalogueProductSelected(product)),
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
                          color: product.isFavorite ? Colors.red : null,
                        ),
                        onPressed: () {
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
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.brand,
                    style: textTheme.bodySmall?.copyWith(
                      color: colorScheme.primary,
                    ),
                  ),
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

  Widget _buildProductDetail(BuildContext context, Product product) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getCategoryIcon(product.category),
              size: 64,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.vGapMd,

          // Brand & name
          Text(
            product.brand,
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.primary,
            ),
          ),
          Text(
            product.name,
            style: textTheme.headlineSmall,
          ),
          AppSpacing.vGapXs,
          Text(
            'Réf: ${product.reference}',
            style: textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.vGapMd,

          // Price
          Row(
            children: [
              Text(
                product.salePrice.asCurrency,
                style: textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              AppSpacing.hGapSm,
              Chip(
                label: Text(
                  product.isInStock ? 'En stock' : 'Rupture',
                  style: TextStyle(
                    color: product.isInStock ? Colors.green : Colors.red,
                  ),
                ),
                backgroundColor: (product.isInStock ? Colors.green : Colors.red)
                    .withAlpha(30),
              ),
            ],
          ),
          AppSpacing.vGapMd,

          // Description
          Text(
            'Description',
            style: textTheme.titleMedium,
          ),
          AppSpacing.vGapXs,
          Text(product.description),
          AppSpacing.vGapMd,

          // Protocols
          if (product.protocols.isNotEmpty) ...[
            Text(
              'Protocoles',
              style: textTheme.titleMedium,
            ),
            AppSpacing.vGapXs,
            Wrap(
              spacing: 8,
              children: product.protocols.map((p) {
                return Chip(label: Text(p.displayName));
              }).toList(),
            ),
            AppSpacing.vGapMd,
          ],

          // Add to quote button
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () {
                // Add to quote logic
              },
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Ajouter au devis'),
            ),
          ),
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
        return Icons.bolt;
      case ProductCategory.multimedia:
        return Icons.tv;
      case ProductCategory.custom:
        return Icons.build;
    }
  }
}
