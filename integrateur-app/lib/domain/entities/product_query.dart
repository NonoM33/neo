import 'package:equatable/equatable.dart';

import 'product.dart';

/// Disponibilite demandee sur le stock.
enum ProductStockFilter {
  any,
  inStock,
  lowStock,
  outOfStock;

  String get displayName {
    switch (this) {
      case ProductStockFilter.any:
        return 'Tout stock';
      case ProductStockFilter.inStock:
        return 'En stock';
      case ProductStockFilter.lowStock:
        return 'Stock faible';
      case ProductStockFilter.outOfStock:
        return 'Rupture';
    }
  }
}

/// Ordre d'affichage des resultats.
enum ProductSort {
  relevance,
  nameAsc,
  priceAsc,
  priceDesc,
  stockDesc;

  String get displayName {
    switch (this) {
      case ProductSort.relevance:
        return 'Pertinence';
      case ProductSort.nameAsc:
        return 'Nom A-Z';
      case ProductSort.priceAsc:
        return 'Prix croissant';
      case ProductSort.priceDesc:
        return 'Prix decroissant';
      case ProductSort.stockDesc:
        return 'Stock disponible';
    }
  }
}

/// Criteres de recherche du catalogue.
///
/// Objet de domaine pur : aucune dependance Flutter, directement testable.
class ProductQuery extends Equatable {
  final String text;
  final Set<ProductCategory> categories;
  final Set<String> brands;
  final Set<Protocol> protocols;
  final ProductStockFilter stock;
  final double? minPrice;
  final double? maxPrice;
  final bool favoritesOnly;
  final bool homeAssistantOnly;
  final ProductSort sort;

  const ProductQuery({
    this.text = '',
    this.categories = const {},
    this.brands = const {},
    this.protocols = const {},
    this.stock = ProductStockFilter.any,
    this.minPrice,
    this.maxPrice,
    this.favoritesOnly = false,
    this.homeAssistantOnly = false,
    this.sort = ProductSort.relevance,
  });

  /// Nombre de filtres actifs. Le texte de recherche n'en fait pas partie :
  /// il a sa propre zone dans l'interface et son propre bouton d'effacement.
  int get activeFilterCount {
    var count = 0;
    if (categories.isNotEmpty) count++;
    if (brands.isNotEmpty) count++;
    if (protocols.isNotEmpty) count++;
    if (stock != ProductStockFilter.any) count++;
    if (minPrice != null || maxPrice != null) count++;
    if (favoritesOnly) count++;
    if (homeAssistantOnly) count++;
    return count;
  }

  bool get hasActiveFilters => activeFilterCount > 0;

  bool get isEmpty => text.isEmpty && !hasActiveFilters;

  /// Remet les criteres a zero en conservant l'ordre d'affichage choisi.
  ProductQuery cleared() => ProductQuery(sort: sort);

  ProductQuery copyWith({
    String? text,
    Set<ProductCategory>? categories,
    Set<String>? brands,
    Set<Protocol>? protocols,
    ProductStockFilter? stock,
    double? minPrice,
    bool clearMinPrice = false,
    double? maxPrice,
    bool clearMaxPrice = false,
    bool? favoritesOnly,
    bool? homeAssistantOnly,
    ProductSort? sort,
  }) {
    return ProductQuery(
      text: text ?? this.text,
      categories: categories ?? this.categories,
      brands: brands ?? this.brands,
      protocols: protocols ?? this.protocols,
      stock: stock ?? this.stock,
      minPrice: clearMinPrice ? null : (minPrice ?? this.minPrice),
      maxPrice: clearMaxPrice ? null : (maxPrice ?? this.maxPrice),
      favoritesOnly: favoritesOnly ?? this.favoritesOnly,
      homeAssistantOnly: homeAssistantOnly ?? this.homeAssistantOnly,
      sort: sort ?? this.sort,
    );
  }

  /// Bascule une valeur dans un ensemble de filtres (selection multiple).
  static Set<T> toggle<T>(Set<T> current, T value) {
    final next = Set<T>.from(current);
    if (!next.remove(value)) next.add(value);
    return next;
  }

  @override
  List<Object?> get props => [
        text,
        categories,
        brands,
        protocols,
        stock,
        minPrice,
        maxPrice,
        favoritesOnly,
        homeAssistantOnly,
        sort,
      ];
}
