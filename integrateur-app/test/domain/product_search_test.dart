import 'package:flutter_test/flutter_test.dart';
import 'package:neo_integrateur/domain/entities/product.dart';
import 'package:neo_integrateur/domain/entities/product_query.dart';
import 'package:neo_integrateur/domain/services/product_search.dart';

Product _p({
  required String reference,
  required String name,
  String brand = 'Neo',
  ProductCategory category = ProductCategory.custom,
  String? subCategory,
  String description = '',
  List<Protocol> protocols = const [],
  double salePrice = 100,
  int stockAvailable = 10,
  bool isFavorite = false,
  bool? compatibiliteHA,
}) {
  return Product(
    id: reference,
    reference: reference,
    name: name,
    brand: brand,
    category: category,
    subCategory: subCategory,
    description: description,
    protocols: protocols,
    purchasePrice: salePrice / 2,
    salePrice: salePrice,
    marginPercent: 50,
    specs: ProductSpecs(compatibiliteHA: compatibiliteHA),
    stockAvailable: stockAvailable,
    isFavorite: isFavorite,
  );
}

void main() {
  final doorProtect = _p(
    reference: 'AJAX-DOOR',
    name: 'Ajax DoorProtect',
    brand: 'Ajax',
    category: ProductCategory.securite,
    description: 'Detecteur d ouverture de porte sans fil',
    protocols: [Protocol.zigbee],
    salePrice: 49,
  );
  final hub = _p(
    reference: 'AJAX-HUB2',
    name: 'Ajax Hub 2 Plus',
    brand: 'Ajax',
    category: ProductCategory.securite,
    salePrice: 349,
    stockAvailable: 3,
  );
  final thermostat = _p(
    reference: 'NEST-THERM-3',
    name: 'Google Nest Thermostat',
    brand: 'Google',
    category: ProductCategory.climat,
    description: 'Thermostat connecte',
    salePrice: 219,
    stockAvailable: 0,
    compatibiliteHA: true,
  );
  final telerupteur = _p(
    reference: 'MO-TELE',
    name: 'Telerupteur modulaire',
    brand: 'Legrand',
    category: ProductCategory.eclairage,
    salePrice: 25,
    isFavorite: true,
  );

  final catalogue = [doorProtect, hub, thermostat, telerupteur];

  List<String> refs(List<Product> products) =>
      products.map((p) => p.reference).toList();

  group('recherche texte', () {
    test('sans requete ni filtre, rend tout le catalogue', () {
      final result = ProductSearch.apply(catalogue, const ProductQuery());
      expect(result, hasLength(4));
    });

    test('ignore les accents dans la requete comme dans les donnees', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(text: 'télérupteur'),
      );
      expect(refs(result), ['MO-TELE']);
    });

    test('accepte plusieurs termes combines en ET, dans nimporte quel ordre',
        () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(text: 'ajax porte'),
      );
      expect(refs(result), ['AJAX-DOOR']);
    });

    test('classe la correspondance de reference avant celle de description',
        () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(text: 'porte'),
      );
      // "porte" est dans la description de DoorProtect uniquement
      expect(refs(result), ['AJAX-DOOR']);

      final byRef = ProductSearch.apply(
        catalogue,
        const ProductQuery(text: 'ajax'),
      );
      // Les deux Ajax remontent, hub et door, tries par pertinence puis nom
      expect(refs(byRef), containsAll(['AJAX-DOOR', 'AJAX-HUB2']));
    });

    test('trouve un produit par sa reference exacte', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(text: 'NEST-THERM-3'),
      );
      expect(refs(result), ['NEST-THERM-3']);
    });

    test('ne renvoie rien quand aucun produit ne satisfait tous les termes',
        () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(text: 'ajax thermostat'),
      );
      expect(result, isEmpty);
    });
  });

  group('filtres', () {
    test('filtre par categories multiples', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(
          categories: {ProductCategory.securite, ProductCategory.climat},
        ),
      );
      expect(result, hasLength(3));
    });

    test('filtre par marque', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(brands: {'Google'}),
      );
      expect(refs(result), ['NEST-THERM-3']);
    });

    test('filtre par protocole', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(protocols: {Protocol.zigbee}),
      );
      expect(refs(result), ['AJAX-DOOR']);
    });

    test('filtre par disponibilite en stock', () {
      final inStock = ProductSearch.apply(
        catalogue,
        const ProductQuery(stock: ProductStockFilter.inStock),
      );
      expect(refs(inStock), isNot(contains('NEST-THERM-3')));

      final rupture = ProductSearch.apply(
        catalogue,
        const ProductQuery(stock: ProductStockFilter.outOfStock),
      );
      expect(refs(rupture), ['NEST-THERM-3']);

      final faible = ProductSearch.apply(
        catalogue,
        const ProductQuery(stock: ProductStockFilter.lowStock),
      );
      expect(refs(faible), ['AJAX-HUB2']);
    });

    test('filtre par fourchette de prix', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(minPrice: 40, maxPrice: 250),
      );
      expect(refs(result)..sort(), ['AJAX-DOOR', 'NEST-THERM-3']);
    });

    test('filtre sur les favoris', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(favoritesOnly: true),
      );
      expect(refs(result), ['MO-TELE']);
    });

    test('filtre sur la compatibilite Home Assistant', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(homeAssistantOnly: true),
      );
      expect(refs(result), ['NEST-THERM-3']);
    });

    test('combine texte et filtres', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(
          text: 'ajax',
          stock: ProductStockFilter.lowStock,
        ),
      );
      expect(refs(result), ['AJAX-HUB2']);
    });
  });

  group('tri', () {
    test('trie par prix croissant', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(sort: ProductSort.priceAsc),
      );
      expect(refs(result), ['MO-TELE', 'AJAX-DOOR', 'NEST-THERM-3', 'AJAX-HUB2']);
    });

    test('trie par prix decroissant', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(sort: ProductSort.priceDesc),
      );
      expect(refs(result).first, 'AJAX-HUB2');
    });

    test('trie par nom', () {
      final result = ProductSearch.apply(
        catalogue,
        const ProductQuery(sort: ProductSort.nameAsc),
      );
      expect(refs(result).first, 'AJAX-DOOR');
      expect(refs(result).last, 'MO-TELE');
    });
  });

  group('etat de la requete', () {
    test('compte les filtres actifs sans compter le texte', () {
      const query = ProductQuery(
        text: 'ajax',
        brands: {'Ajax'},
        stock: ProductStockFilter.inStock,
        favoritesOnly: true,
      );
      expect(query.activeFilterCount, 3);
      expect(query.hasActiveFilters, isTrue);
    });

    test('une requete vide na aucun filtre actif', () {
      expect(const ProductQuery().activeFilterCount, 0);
      expect(const ProductQuery().hasActiveFilters, isFalse);
    });

    test('cleared remet les filtres a zero mais garde le tri', () {
      const query = ProductQuery(
        text: 'ajax',
        brands: {'Ajax'},
        sort: ProductSort.priceAsc,
      );
      final cleared = query.cleared();
      expect(cleared.activeFilterCount, 0);
      expect(cleared.text, isEmpty);
      expect(cleared.sort, ProductSort.priceAsc);
    });
  });
}
