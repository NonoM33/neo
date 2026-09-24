import '../entities/product.dart';
import '../entities/product_query.dart';

/// Recherche et filtrage du catalogue.
///
/// Service de domaine pur (aucune dependance framework) : la pertinence des
/// resultats est une regle metier, pas un detail d'affichage.
abstract final class ProductSearch {
  /// Applique les criteres puis ordonne les resultats.
  static List<Product> apply(List<Product> products, ProductQuery query) {
    final terms = _termsOf(query.text);

    final matches = <_ScoredProduct>[];
    for (final product in products) {
      if (!_passesFilters(product, query)) continue;

      final score = terms.isEmpty ? 0 : _score(product, terms);
      if (terms.isNotEmpty && score <= 0) continue;

      matches.add(_ScoredProduct(product, score));
    }

    matches.sort((a, b) => _compare(a, b, query.sort));
    return matches.map((m) => m.product).toList();
  }

  /// Normalise une chaine pour comparaison : minuscules, accents retires.
  ///
  /// Sans cela, "telerupteur" ne trouverait pas "Telerupteur" saisi avec
  /// accents, et inversement — cas courant sur un chantier, au clavier tactile.
  static String normalize(String input) {
    final lower = input.toLowerCase();
    final buffer = StringBuffer();
    for (final rune in lower.runes) {
      buffer.write(_deaccent[rune] ?? String.fromCharCode(rune));
    }
    return buffer.toString();
  }

  static List<String> _termsOf(String text) => normalize(text)
      .split(RegExp(r'[\s,;]+'))
      .where((t) => t.isNotEmpty)
      .toList();

  static bool _passesFilters(Product product, ProductQuery query) {
    if (query.categories.isNotEmpty &&
        !query.categories.contains(product.category)) {
      return false;
    }

    if (query.brands.isNotEmpty) {
      final brand = normalize(product.brand);
      if (!query.brands.any((b) => normalize(b) == brand)) return false;
    }

    if (query.protocols.isNotEmpty &&
        !product.protocols.any(query.protocols.contains)) {
      return false;
    }

    switch (query.stock) {
      case ProductStockFilter.any:
        break;
      case ProductStockFilter.inStock:
        if (!product.isInStock) return false;
      case ProductStockFilter.lowStock:
        if (!product.isLowStock) return false;
      case ProductStockFilter.outOfStock:
        if (product.isInStock) return false;
    }

    if (query.minPrice != null && product.salePrice < query.minPrice!) {
      return false;
    }
    if (query.maxPrice != null && product.salePrice > query.maxPrice!) {
      return false;
    }

    if (query.favoritesOnly && !product.isFavorite) return false;
    if (query.homeAssistantOnly && !product.supportsHomeAssistant) return false;

    return true;
  }

  /// Score de pertinence : chaque terme doit matcher (ET), et l'endroit du
  /// match determine son poids. Un terme non trouve annule le produit.
  static int _score(Product product, List<String> terms) {
    final reference = normalize(product.reference);
    final name = normalize(product.name);
    final brand = normalize(product.brand);
    final category = normalize(product.category.displayName);
    final subCategory = normalize(product.subCategory ?? '');
    final description = normalize(product.description);
    final nameWords = name.split(RegExp(r'[\s-]+'));

    var total = 0;
    for (final term in terms) {
      final termScore = _scoreTerm(
        term: term,
        reference: reference,
        name: name,
        nameWords: nameWords,
        brand: brand,
        category: category,
        subCategory: subCategory,
        description: description,
      );
      if (termScore == 0) return 0;
      total += termScore;
    }
    return total;
  }

  static int _scoreTerm({
    required String term,
    required String reference,
    required String name,
    required List<String> nameWords,
    required String brand,
    required String category,
    required String subCategory,
    required String description,
  }) {
    if (reference == term) return 120;
    if (reference.startsWith(term)) return 80;
    if (name.startsWith(term)) return 70;
    if (nameWords.any((w) => w.startsWith(term))) return 60;
    if (reference.contains(term)) return 45;
    if (name.contains(term)) return 40;
    if (brand.startsWith(term)) return 35;
    if (brand.contains(term)) return 25;
    if (subCategory.contains(term)) return 20;
    if (category.contains(term)) return 15;
    if (description.contains(term)) return 5;
    return 0;
  }

  static int _compare(_ScoredProduct a, _ScoredProduct b, ProductSort sort) {
    switch (sort) {
      case ProductSort.relevance:
        final byScore = b.score.compareTo(a.score);
        if (byScore != 0) return byScore;
        return a.product.name.compareTo(b.product.name);
      case ProductSort.nameAsc:
        return a.product.name
            .toLowerCase()
            .compareTo(b.product.name.toLowerCase());
      case ProductSort.priceAsc:
        return a.product.salePrice.compareTo(b.product.salePrice);
      case ProductSort.priceDesc:
        return b.product.salePrice.compareTo(a.product.salePrice);
      case ProductSort.stockDesc:
        return b.product.stockAvailable.compareTo(a.product.stockAvailable);
    }
  }

  /// Marques presentes dans une liste de produits, ordonnees.
  static List<String> brandsOf(List<Product> products) {
    final brands = products.map((p) => p.brand).toSet().toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return brands;
  }

  static const Map<int, String> _deaccent = {
    0xE0: 'a', 0xE1: 'a', 0xE2: 'a', 0xE3: 'a', 0xE4: 'a', 0xE5: 'a',
    0xE7: 'c',
    0xE8: 'e', 0xE9: 'e', 0xEA: 'e', 0xEB: 'e',
    0xEC: 'i', 0xED: 'i', 0xEE: 'i', 0xEF: 'i',
    0xF1: 'n',
    0xF2: 'o', 0xF3: 'o', 0xF4: 'o', 0xF5: 'o', 0xF6: 'o',
    0xF9: 'u', 0xFA: 'u', 0xFB: 'u', 0xFC: 'u',
    0xFD: 'y', 0xFF: 'y',
    0x153: 'oe', 0xE6: 'ae',
  };
}

class _ScoredProduct {
  final Product product;
  final int score;

  const _ScoredProduct(this.product, this.score);
}
