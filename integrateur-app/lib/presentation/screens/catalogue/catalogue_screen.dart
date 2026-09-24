import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/entities/product_query.dart';
import '../../../routes/app_router.dart';
import '../../blocs/catalogue/catalogue_bloc.dart';
import '../../widgets/ds/ds.dart';
import '../quotes/quote_screen.dart' show euro;

/// Catalogue produits.
///
/// iPad paysage : **trois zones proportionnelles** — filtres 25 % / grille /
/// fiche 30 % avec les dependances en haut. iPad portrait : filtres en sheet,
/// grille 3 colonnes. iPhone : grille 2 colonnes, fiche en plein ecran.
class CatalogueScreen extends ConsumerStatefulWidget {
  const CatalogueScreen({super.key});

  @override
  ConsumerState<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends ConsumerState<CatalogueScreen> {
  bool _filtersCollapsed = false;

  @override
  void initState() {
    super.initState();
    final bloc = ref.read(catalogueBlocProvider);
    if (bloc.state is CatalogueInitial) {
      bloc.add(const CatalogueLoadRequested());
    }
  }

  @override
  Widget build(BuildContext context) {
    final bloc = ref.watch(catalogueBlocProvider);
    final ds = context.ds;
    final device = context.dsDevice;
    final threeZones = device.isDesktop && context.dsIsLandscape;

    return Scaffold(
      backgroundColor: ds.surfaceBase,
      body: BlocBuilder<CatalogueBloc, CatalogueState>(
        bloc: bloc,
        builder: (context, state) {
          if (state is CatalogueLoading || state is CatalogueInitial) {
            return const SafeArea(child: DsSkeletonGrid(crossAxisCount: 3));
          }
          if (state is CatalogueError) {
            return SafeArea(
              child: DsErrorState(
                kind: DsErrorKind.fromMessage(state.message),
                action: DsButton(
                  label: 'Recharger',
                  icon: DsGlyph.refresh,
                  onPressed: () => bloc.add(const CatalogueLoadRequested()),
                ),
              ),
            );
          }
          if (state is! CatalogueLoaded) return const SizedBox.shrink();

          final products = state.products;

          return Column(
            children: [
              DsAppBar(
                title: 'Catalogue',
                subtitle:
                    '${products.length} produit${products.length > 1 ? 's' : ''} · ${state.allProducts.length} au total',
                actions: [
                  DsIconButton(
                    icon: DsGlyph.sync,
                    label: 'Synchroniser le catalogue',
                    onPressed: state.isSyncing
                        ? null
                        : () => bloc.add(const CatalogueSyncRequested()),
                  ),
                ],
              ),
              // La recherche reste visible quelle que soit la taille d'ecran :
              // c'est le geste le plus frequent sur le catalogue.
              _SearchRow(
                state: state,
                bloc: bloc,
                showFiltersButton: !threeZones,
                onOpenFilters: () => _openFilters(context, state, bloc),
              ),
              if (state.query.hasActiveFilters || state.query.text.isNotEmpty)
                _ActiveCriteria(state: state, bloc: bloc),
              Expanded(
                child: Row(
                  children: [
                    if (threeZones)
                      DsSidePanel(
                        title: 'Filtres',
                        side: DsPanelSide.left,
                        widthFactor: 0.22,
                        minWidth: 240,
                        maxWidth: 320,
                        collapsed: _filtersCollapsed,
                        onToggleCollapsed: () => setState(
                          () => _filtersCollapsed = !_filtersCollapsed,
                        ),
                        child: _Filters(state: state, bloc: bloc),
                      ),
                    Expanded(
                      child: _Grid(
                        state: state,
                        bloc: bloc,
                        products: products,
                        selectable: threeZones,
                      ),
                    ),
                    if (threeZones)
                      DsSidePanel(
                        title: 'Fiche produit',
                        widthFactor: 0.3,
                        minWidth: 320,
                        maxWidth: 460,
                        child: _ProductDetail(
                          product: state.selectedProduct,
                          bloc: bloc,
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

  Future<void> _openFilters(
    BuildContext context,
    CatalogueLoaded state,
    CatalogueBloc bloc,
  ) async {
    await showDsSheet<void>(
      context,
      title: 'Filtres',
      subtitle: state.query.hasActiveFilters
          ? '${state.query.activeFilterCount} filtre${state.query.activeFilterCount > 1 ? 's' : ''} actif${state.query.activeFilterCount > 1 ? 's' : ''}'
          : 'Affiner la recherche',
      builder: (sheetContext) => BlocBuilder<CatalogueBloc, CatalogueState>(
        bloc: bloc,
        builder: (context, sheetState) {
          if (sheetState is! CatalogueLoaded) return const SizedBox.shrink();
          return _Filters(state: sheetState, bloc: bloc);
        },
      ),
    );
  }
}

class _Filters extends StatelessWidget {
  const _Filters({required this.state, required this.bloc});

  final CatalogueLoaded state;
  final CatalogueBloc bloc;

  void _update(ProductQuery query) => bloc.add(CatalogueQueryChanged(query));

  @override
  Widget build(BuildContext context) {
    final query = state.query;
    final brands = state.availableBrands;
    final protocols = state.availableProtocols;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(DsSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (query.hasActiveFilters) ...[
            DsButton(
              label: 'Effacer les filtres',
              icon: DsGlyph.close,
              variant: DsButtonVariant.secondary,
              size: DsButtonSize.small,
              onPressed: () =>
                  _update(query.cleared().copyWith(text: query.text)),
            ),
            const SizedBox(height: DsSpacing.s4),
          ],
          const DsSectionTitle('Trier par'),
          const SizedBox(height: DsSpacing.s2),
          Wrap(
            spacing: DsSpacing.s2,
            runSpacing: DsSpacing.s2,
            children: [
              for (final sort in ProductSort.values)
                DsFilterChip(
                  label: sort.displayName,
                  selected: query.sort == sort,
                  onSelected: () => _update(query.copyWith(sort: sort)),
                ),
            ],
          ),
          const SizedBox(height: DsSpacing.s4),
          const DsSectionTitle('Disponibilité'),
          const SizedBox(height: DsSpacing.s2),
          Wrap(
            spacing: DsSpacing.s2,
            runSpacing: DsSpacing.s2,
            children: [
              for (final stock in ProductStockFilter.values)
                DsFilterChip(
                  label: stock.displayName,
                  selected: query.stock == stock,
                  onSelected: () => _update(query.copyWith(stock: stock)),
                ),
            ],
          ),
          const SizedBox(height: DsSpacing.s4),
          const DsSectionTitle('Catégories'),
          const SizedBox(height: DsSpacing.s2),
          Wrap(
            spacing: DsSpacing.s2,
            runSpacing: DsSpacing.s2,
            children: [
              for (final category in ProductCategory.values)
                DsFilterChip(
                  label: category.displayName,
                  count: state.countForCategory(category),
                  selected: query.categories.contains(category),
                  onSelected: () => _update(
                    query.copyWith(
                      categories: ProductQuery.toggle(
                        query.categories,
                        category,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (brands.isNotEmpty) ...[
            const SizedBox(height: DsSpacing.s4),
            const DsSectionTitle('Marques'),
            const SizedBox(height: DsSpacing.s2),
            Wrap(
              spacing: DsSpacing.s2,
              runSpacing: DsSpacing.s2,
              children: [
                for (final brand in brands)
                  DsFilterChip(
                    label: brand,
                    count: state.countForBrand(brand),
                    selected: query.brands.contains(brand),
                    onSelected: () => _update(
                      query.copyWith(
                        brands: ProductQuery.toggle(query.brands, brand),
                      ),
                    ),
                  ),
              ],
            ),
          ],
          if (protocols.isNotEmpty) ...[
            const SizedBox(height: DsSpacing.s4),
            const DsSectionTitle('Protocoles'),
            const SizedBox(height: DsSpacing.s2),
            Wrap(
              spacing: DsSpacing.s2,
              runSpacing: DsSpacing.s2,
              children: [
                for (final protocol in protocols)
                  DsFilterChip(
                    label: protocol.displayName,
                    count: state.countForProtocol(protocol),
                    selected: query.protocols.contains(protocol),
                    onSelected: () => _update(
                      query.copyWith(
                        protocols: ProductQuery.toggle(
                          query.protocols,
                          protocol,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: DsSpacing.s4),
          const DsSectionTitle('Prix de vente'),
          const SizedBox(height: DsSpacing.s2),
          _PriceRange(
            min: query.minPrice,
            max: query.maxPrice,
            ceiling: state.maxCataloguePrice,
            onChanged: (min, max) => _update(
              query.copyWith(
                minPrice: min,
                clearMinPrice: min == null,
                maxPrice: max,
                clearMaxPrice: max == null,
              ),
            ),
          ),
          const SizedBox(height: DsSpacing.s4),
          const DsSectionTitle('Sélection'),
          const SizedBox(height: DsSpacing.s2),
          DsToggle(
            label: 'Favoris uniquement',
            icon: DsGlyph.favorite,
            value: query.favoritesOnly,
            onChanged: (value) => _update(query.copyWith(favoritesOnly: value)),
          ),
          const SizedBox(height: DsSpacing.s2),
          DsToggle(
            label: 'Compatible Home Assistant',
            value: query.homeAssistantOnly,
            onChanged: (value) =>
                _update(query.copyWith(homeAssistantOnly: value)),
          ),
          const SizedBox(height: DsSpacing.s4),
        ],
      ),
    );
  }
}

/// Ligne de recherche persistante, presente sur toutes les tailles d'ecran.
class _SearchRow extends StatelessWidget {
  const _SearchRow({
    required this.state,
    required this.bloc,
    required this.showFiltersButton,
    required this.onOpenFilters,
  });

  final CatalogueLoaded state;
  final CatalogueBloc bloc;
  final bool showFiltersButton;
  final VoidCallback onOpenFilters;

  @override
  Widget build(BuildContext context) {
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);

    return Padding(
      padding: EdgeInsets.fromLTRB(
        padding,
        DsSpacing.s2,
        padding,
        DsSpacing.s2,
      ),
      child: Row(
        children: [
          Expanded(
            child: DsSearchBar(
              hintText: 'Nom, référence, marque…',
              controller: bloc.searchController,
              onChanged: (value) => bloc.add(CatalogueSearchRequested(value)),
            ),
          ),
          if (showFiltersButton) ...[
            const SizedBox(width: DsSpacing.s2),
            DsButton(
              label: state.query.hasActiveFilters
                  ? 'Filtres · ${state.query.activeFilterCount}'
                  : 'Filtres',
              icon: DsGlyph.filter,
              variant: state.query.hasActiveFilters
                  ? DsButtonVariant.primary
                  : DsButtonVariant.secondary,
              onPressed: onOpenFilters,
            ),
          ],
        ],
      ),
    );
  }
}

/// Rappel des criteres actifs, chacun retirable d'un geste.
class _ActiveCriteria extends StatelessWidget {
  const _ActiveCriteria({required this.state, required this.bloc});

  final CatalogueLoaded state;
  final CatalogueBloc bloc;

  void _update(ProductQuery query) => bloc.add(CatalogueQueryChanged(query));

  @override
  Widget build(BuildContext context) {
    final query = state.query;
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);

    final chips = <Widget>[];

    if (query.text.isNotEmpty) {
      chips.add(
        _CriterionChip(
          label: '« ${query.text} »',
          onRemove: () {
            bloc.searchController.clear();
            _update(query.copyWith(text: ''));
          },
        ),
      );
    }
    for (final category in query.categories) {
      chips.add(
        _CriterionChip(
          label: category.displayName,
          onRemove: () => _update(
            query.copyWith(
              categories: ProductQuery.toggle(query.categories, category),
            ),
          ),
        ),
      );
    }
    for (final brand in query.brands) {
      chips.add(
        _CriterionChip(
          label: brand,
          onRemove: () => _update(
            query.copyWith(brands: ProductQuery.toggle(query.brands, brand)),
          ),
        ),
      );
    }
    for (final protocol in query.protocols) {
      chips.add(
        _CriterionChip(
          label: protocol.displayName,
          onRemove: () => _update(
            query.copyWith(
              protocols: ProductQuery.toggle(query.protocols, protocol),
            ),
          ),
        ),
      );
    }
    if (query.stock != ProductStockFilter.any) {
      chips.add(
        _CriterionChip(
          label: query.stock.displayName,
          onRemove: () =>
              _update(query.copyWith(stock: ProductStockFilter.any)),
        ),
      );
    }
    if (query.minPrice != null || query.maxPrice != null) {
      final min = query.minPrice?.round();
      final max = query.maxPrice?.round();
      chips.add(
        _CriterionChip(
          label: min != null && max != null
              ? '$min – $max €'
              : min != null
              ? 'dès $min €'
              : "jusqu'à $max €",
          onRemove: () =>
              _update(query.copyWith(clearMinPrice: true, clearMaxPrice: true)),
        ),
      );
    }
    if (query.favoritesOnly) {
      chips.add(
        _CriterionChip(
          label: 'Favoris',
          onRemove: () => _update(query.copyWith(favoritesOnly: false)),
        ),
      );
    }
    if (query.homeAssistantOnly) {
      chips.add(
        _CriterionChip(
          label: 'Home Assistant',
          onRemove: () => _update(query.copyWith(homeAssistantOnly: false)),
        ),
      );
    }

    if (chips.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: EdgeInsets.fromLTRB(padding, 0, padding, DsSpacing.s2),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final chip in chips) ...[
                    chip,
                    const SizedBox(width: DsSpacing.s2),
                  ],
                ],
              ),
            ),
          ),
          DsButton(
            label: 'Tout effacer',
            variant: DsButtonVariant.ghost,
            size: DsButtonSize.small,
            onPressed: () {
              bloc.searchController.clear();
              _update(query.cleared());
            },
          ),
        ],
      ),
    );
  }
}

class _CriterionChip extends StatelessWidget {
  const _CriterionChip({required this.label, required this.onRemove});

  final String label;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final type = context.dsType;
    final accent = ds.brandPrimary;

    return Semantics(
      button: true,
      label: 'Retirer le filtre $label',
      child: Material(
        color: ds.soft(accent, 0.14),
        borderRadius: DsRadius.fullAll,
        child: InkWell(
          onTap: () {
            HapticFeedback.selectionClick();
            onRemove();
          },
          borderRadius: DsRadius.fullAll,
          child: Container(
            constraints: const BoxConstraints(minHeight: DsSpacing.targetMin),
            padding: const EdgeInsets.symmetric(
              horizontal: DsSpacing.s3,
              vertical: DsSpacing.s2,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: type.labelSize,
                    fontWeight: DsWeight.semibold,
                    color: accent,
                    height: 1.2,
                  ),
                ),
                const SizedBox(width: 6),
                DsIcon(DsGlyph.close, size: 16, color: accent),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Fourchette de prix saisie en clair : plus rapide qu'un curseur au doigt
/// quand on cherche "moins de 100 €" sur un chantier.
class _PriceRange extends StatefulWidget {
  const _PriceRange({
    required this.min,
    required this.max,
    required this.ceiling,
    required this.onChanged,
  });

  final double? min;
  final double? max;
  final double ceiling;
  final void Function(double? min, double? max) onChanged;

  @override
  State<_PriceRange> createState() => _PriceRangeState();
}

class _PriceRangeState extends State<_PriceRange> {
  late final TextEditingController _min = TextEditingController(
    text: widget.min?.round().toString() ?? '',
  );
  late final TextEditingController _max = TextEditingController(
    text: widget.max?.round().toString() ?? '',
  );

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  double? _parse(String value) {
    final cleaned = value.replaceAll(',', '.').trim();
    if (cleaned.isEmpty) return null;
    return double.tryParse(cleaned);
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: DsTextField(
            label: 'Min €',
            controller: _min,
            keyboardType: TextInputType.number,
            hintText: '0',
            onChanged: (value) =>
                widget.onChanged(_parse(value), _parse(_max.text)),
          ),
        ),
        const SizedBox(width: DsSpacing.s2),
        Expanded(
          child: DsTextField(
            label: 'Max €',
            controller: _max,
            keyboardType: TextInputType.number,
            hintText: widget.ceiling > 0
                ? widget.ceiling.round().toString()
                : null,
            onChanged: (value) =>
                widget.onChanged(_parse(_min.text), _parse(value)),
          ),
        ),
      ],
    );
  }
}

class _Grid extends StatelessWidget {
  const _Grid({
    required this.state,
    required this.bloc,
    required this.products,
    required this.selectable,
  });

  final CatalogueLoaded state;
  final CatalogueBloc bloc;
  final List<Product> products;
  final bool selectable;

  @override
  Widget build(BuildContext context) {
    final device = context.dsDevice;
    final padding = DsSpacing.pagePadding(device);

    if (state.isSyncing && products.isEmpty) {
      return const DsSkeletonGrid(crossAxisCount: 3);
    }

    if (products.isEmpty) {
      return state.allProducts.isEmpty
          ? DsEmptyState(
              icon: DsGlyph.catalogue,
              title: 'Catalogue vide sur cet appareil',
              description:
                  'Synchronisez le catalogue une fois connecté : il reste ensuite disponible hors ligne.',
              action: DsButton(
                label: 'Synchroniser',
                icon: DsGlyph.sync,
                onPressed: () => bloc.add(const CatalogueSyncRequested()),
              ),
            )
          : const DsEmptyState(
              icon: DsGlyph.search,
              title: 'Aucun produit ne correspond',
              description:
                  'Essayez une autre référence ou marque, ou retirez le filtre de catégorie.',
            );
    }

    // Les colonnes se deduisent de la place **reellement disponible**, pas de
    // la taille de l'ecran : en trois zones, la grille est coincee entre deux
    // panneaux et un nombre fige y ecrase les cartes (CLAUDE.md, §Grilles).
    return LayoutBuilder(
      builder: (context, constraints) {
        const targetItemWidth = 260.0;
        final available = constraints.maxWidth - padding * 2;
        final columns = (available / targetItemWidth).floor().clamp(
          device.isPhone ? 1 : 2,
          4,
        );

        return GridView.builder(
          padding: EdgeInsets.fromLTRB(
            padding,
            DsSpacing.s4,
            padding,
            DsSpacing.s16,
          ),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            mainAxisExtent: DsProductCard.gridExtent(context),
            mainAxisSpacing: DsSpacing.gapCard,
            crossAxisSpacing: DsSpacing.gapCard,
          ),
          itemCount: products.length,
          itemBuilder: (context, index) {
            final product = products[index];
            return DsProductCard(
              name: product.name,
              brand: product.brand,
              reference: product.reference,
              imageUrl: product.photoUrl,
              priceHT: euro.format(product.salePrice),
              priceTTC: euro.format(product.salePrice * 1.2),
              protocols: product.protocols
                  .map((protocol) => protocol.displayName)
                  .toList(),
              stock: DsStockLevel.fromQuantity(product.stockAvailable),
              favorite: product.isFavorite,
              onToggleFavorite: () =>
                  bloc.add(CatalogueToggleFavoriteRequested(product.id)),
              onTap: () {
                if (selectable) {
                  bloc.add(CatalogueProductSelected(product));
                } else {
                  context.goToProductDetail(product.id);
                }
              },
            );
          },
        );
      },
    );
  }
}

class _ProductDetail extends StatelessWidget {
  const _ProductDetail({required this.product, required this.bloc});

  final Product? product;
  final CatalogueBloc bloc;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;

    if (product == null) {
      return const DsEmptyState(
        compact: true,
        icon: DsGlyph.catalogue,
        title: 'Sélectionnez un produit',
        description:
            'Ses caractéristiques, son stock et ses dépendances s’affichent ici.',
      );
    }

    final p = product!;

    return ListView(
      padding: const EdgeInsets.all(DsSpacing.s5),
      children: [
        // Les dependances passent avant le prix : c'est ce qui evite
        // les oublis de materiel sur le chantier.
        if (p.specs.compatibiliteHA == false)
          Padding(
            padding: const EdgeInsets.only(bottom: DsSpacing.gapCard),
            child: DsDependencyCard(
              title: 'Compatibilité à vérifier',
              items: const [
                DsDependencyItem(
                  name: 'Passerelle domotique compatible',
                  level: DsDependencyLevel.obligatoire,
                ),
              ],
            ),
          ),
        Text(
          p.brand.toUpperCase(),
          style: TextStyle(
            fontSize: t.badgeSize,
            fontWeight: DsWeight.semibold,
            letterSpacing: 0.6,
            color: ds.textSecondary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          p.name,
          style: TextStyle(
            fontSize: t.h3Size,
            fontWeight: DsWeight.semibold,
            letterSpacing: -0.3,
            color: ds.textPrimary,
          ),
        ),
        const SizedBox(height: DsSpacing.s2),
        Text(
          'Réf. ${p.reference}',
          style: TextStyle(
            fontSize: t.captionSize,
            fontFeatures: dsTabularFigures,
            color: ds.textTertiary,
          ),
        ),
        const SizedBox(height: DsSpacing.s4),
        DsCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              _Spec(label: 'Prix HT', value: euro.format(p.salePrice)),
              _Spec(label: 'Prix TTC', value: euro.format(p.salePrice * 1.2)),
              _Spec(label: 'Stock', value: '${p.stockAvailable}'),
              _Spec(label: 'Protocoles', value: p.protocolsDisplay),
              if (p.specs.alimentation != null)
                _Spec(label: 'Alimentation', value: p.specs.alimentation!),
              if (p.specs.dimensions != null)
                _Spec(label: 'Dimensions', value: p.specs.dimensions!),
              _Spec(
                label: 'Emplacement',
                value: p.specs.locationType.displayName,
              ),
            ],
          ),
        ),
        const SizedBox(height: DsSpacing.gapCard),
        if (p.description.isNotEmpty) ...[
          Text(
            p.description,
            style: TextStyle(
              fontSize: t.bodySize,
              height: t.bodyLine / t.bodySize,
              color: ds.textBody,
            ),
          ),
          const SizedBox(height: DsSpacing.gapCard),
        ],
        DsButton(
          label: 'Ouvrir la fiche complète',
          icon: DsGlyph.chevronRight,
          variant: DsButtonVariant.secondary,
          fullWidth: true,
          onPressed: () => context.goToProductDetail(p.id),
        ),
      ],
    );
  }
}

class _Spec extends StatelessWidget {
  const _Spec({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final ds = context.ds;
    final t = context.dsType;
    return Padding(
      padding: const EdgeInsets.only(bottom: DsSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: TextStyle(
                fontSize: t.captionSize,
                color: ds.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: t.bodySize,
                fontWeight: DsWeight.medium,
                fontFeatures: dsTabularFigures,
                color: ds.textBody,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
