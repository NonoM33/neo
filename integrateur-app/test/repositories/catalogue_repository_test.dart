import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/exceptions.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/data/datasources/remote/catalogue_remote_datasource.dart';
import 'package:neo_integrateur/data/models/product_model.dart';
import 'package:neo_integrateur/data/repositories/catalogue_repository_impl.dart';
import 'package:neo_integrateur/domain/entities/product.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/repositories/catalogue_repository.dart';

class MockCatalogueRemoteDataSource extends Mock
    implements CatalogueRemoteDataSource {}

void main() {
  late CatalogueRepositoryImpl repository;
  late MockCatalogueRemoteDataSource mockRemote;

  Map<String, dynamic> productJson({
    String id = 'prod-1',
    String reference = 'REF-001',
    String name = 'Module Zigbee',
    String brand = 'Aqara',
    String category = 'eclairage',
    double priceHT = 49.90,
  }) {
    return {
      'id': id,
      'reference': reference,
      'name': name,
      'brand': brand,
      'category': category,
      'description': '',
      'priceHT': priceHT,
      'tvaRate': 20,
      'stock': 10,
      'isActive': true,
    };
  }

  setUp(() {
    mockRemote = MockCatalogueRemoteDataSource();
    repository = CatalogueRepositoryImpl(remoteDataSource: mockRemote);
  });

  group('CatalogueRepositoryImpl', () {
    // ============ getProducts ============
    group('getProducts', () {
      test('returns list on success', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {
              'data': [productJson()],
            });

        final result = await repository.getProducts();

        expect(result, isA<Success<List<Product>>>());
        final list = (result as Success<List<Product>>).data;
        expect(list, hasLength(1));
        expect(list.first.id, equals('prod-1'));
        expect(list.first.isFavorite, isFalse);
      });

      test('forwards filter params (category, search, brand, prices)',
          () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {'data': <dynamic>[]});

        await repository.getProducts(
          filter: const ProductFilter(
            category: ProductCategory.eclairage,
            searchQuery: 'philips',
            brand: 'Philips',
            minPrice: 10,
            maxPrice: 200,
          ),
          limit: 20,
          offset: 40,
        );

        final captured = verify(() => mockRemote.getProducts(
              queryParams: captureAny(named: 'queryParams'),
            )).captured.single as Map<String, dynamic>;

        expect(captured['category'], equals('Éclairage'));
        expect(captured['search'], equals('philips'));
        expect(captured['brand'], equals('Philips'));
        expect(captured['minPrice'], equals(10));
        expect(captured['maxPrice'], equals(200));
        expect(captured['limit'], equals(20));
        expect(captured['page'], equals(3)); // offset 40 / limit 20 + 1
      });

      test('favoritesOnly filter is applied locally', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {
              'data': [
                productJson(id: 'prod-1'),
                productJson(id: 'prod-2'),
              ],
            });

        // Favorite prod-1 first
        await repository.toggleFavorite('prod-1');

        final result =
            await repository.getProducts(filter: const ProductFilter(favoritesOnly: true));

        expect(result, isA<Success<List<Product>>>());
        final favs = (result as Success<List<Product>>).data;
        expect(favs, hasLength(1));
        expect(favs.first.id, equals('prod-1'));
        expect(favs.first.isFavorite, isTrue);
      });

      test('returns NetworkFailure on NetworkException', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenThrow(const NetworkException());

        final result = await repository.getProducts();

        expect(result, isA<Error<List<Product>>>());
        expect((result as Error<List<Product>>).failure, isA<NetworkFailure>());
      });

      test('returns UnknownFailure on unexpected error', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenThrow(Exception('boom'));

        final result = await repository.getProducts();

        expect(result, isA<Error<List<Product>>>());
        expect((result as Error<List<Product>>).failure, isA<UnknownFailure>());
      });

      test('handles empty data field gracefully', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => <String, dynamic>{});

        final result = await repository.getProducts();

        expect(result, isA<Success<List<Product>>>());
        expect((result as Success<List<Product>>).data, isEmpty);
      });
    });

    // ============ getProduct ============
    group('getProduct', () {
      test('returns product on success', () async {
        when(() => mockRemote.getProduct(any()))
            .thenAnswer((_) async => ProductModel.fromJson(productJson()));

        final result = await repository.getProduct('prod-1');

        expect(result, isA<Success<Product>>());
        expect((result as Success<Product>).data.id, equals('prod-1'));
      });

      test('marks as favorite if previously favorited', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {
              'data': [productJson()],
            });
        when(() => mockRemote.getProduct(any()))
            .thenAnswer((_) async => ProductModel.fromJson(productJson()));

        await repository.toggleFavorite('prod-1');
        final result = await repository.getProduct('prod-1');

        expect((result as Success<Product>).data.isFavorite, isTrue);
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.getProduct(any()))
            .thenThrow(const NotFoundException());

        final result = await repository.getProduct('missing');

        expect(result, isA<Error<Product>>());
        expect((result as Error<Product>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ getProductByReference ============
    group('getProductByReference', () {
      test('returns first matching product', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {
              'data': [productJson(reference: 'REF-001')],
            });

        final result = await repository.getProductByReference('REF-001');

        expect(result, isA<Success<Product>>());
        expect((result as Success<Product>).data.reference, equals('REF-001'));
      });

      test('returns NotFoundFailure when search returns empty', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {'data': <dynamic>[]});

        final result = await repository.getProductByReference('MISSING');

        expect(result, isA<Error<Product>>());
        expect((result as Error<Product>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ Categories / Brands ============
    group('getCategories', () {
      test('returns mapped enum values on success', () async {
        when(() => mockRemote.getCategories())
            .thenAnswer((_) async => ['Éclairage', 'Sécurité']);

        final result = await repository.getCategories();

        expect(result, isA<Success<List<ProductCategory>>>());
        final categories = (result as Success<List<ProductCategory>>).data;
        expect(categories,
            containsAll([ProductCategory.eclairage, ProductCategory.securite]));
      });

      test('falls back to all enum values on error', () async {
        when(() => mockRemote.getCategories()).thenThrow(Exception('boom'));

        final result = await repository.getCategories();

        expect(result, isA<Success<List<ProductCategory>>>());
        expect((result as Success<List<ProductCategory>>).data,
            equals(ProductCategory.values));
      });
    });

    group('getBrands', () {
      test('returns brands list on success', () async {
        when(() => mockRemote.getBrands())
            .thenAnswer((_) async => ['Philips', 'Aqara']);

        final result = await repository.getBrands();

        expect(result, isA<Success<List<String>>>());
        expect((result as Success<List<String>>).data, hasLength(2));
      });

      test('falls back to empty list on error', () async {
        when(() => mockRemote.getBrands()).thenThrow(Exception('boom'));

        final result = await repository.getBrands();

        expect(result, isA<Success<List<String>>>());
        expect((result as Success<List<String>>).data, isEmpty);
      });
    });

    // ============ Favorites ============
    group('favorites', () {
      test('toggleFavorite adds then removes', () async {
        when(() => mockRemote.getProduct(any()))
            .thenAnswer((_) async => ProductModel.fromJson(productJson()));

        var result = await repository.toggleFavorite('prod-1');
        expect(result, isA<Success<Product>>());
        expect((result as Success<Product>).data.isFavorite, isTrue);

        result = await repository.toggleFavorite('prod-1');
        expect(result, isA<Success<Product>>());
        expect((result as Success<Product>).data.isFavorite, isFalse);
      });

      test('getFavorites delegates to getProducts with favoritesOnly filter',
          () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {
              'data': [productJson(id: 'prod-1')],
            });

        await repository.toggleFavorite('prod-1');
        final result = await repository.getFavorites();

        expect(result, isA<Success<List<Product>>>());
        expect((result as Success<List<Product>>).data, hasLength(1));
      });
    });

    // ============ Search ============
    test('searchProducts delegates to getProducts with searchQuery', () async {
      when(() => mockRemote.getProducts(
            queryParams: any(named: 'queryParams'),
          )).thenAnswer((_) async => {'data': <dynamic>[]});

      await repository.searchProducts('philips');

      final captured = verify(() => mockRemote.getProducts(
            queryParams: captureAny(named: 'queryParams'),
          )).captured.single as Map<String, dynamic>;
      expect(captured['search'], equals('philips'));
    });

    // ============ Dependencies ============
    group('getProductDependencies', () {
      test('returns dependencies on success', () async {
        when(() => mockRemote.getProductDependencies(any()))
            .thenAnswer((_) async => [
                  ProductDependencyModel(
                    id: 'dep-1',
                    type: DependencyType.required,
                    requiredProduct: ProductModel.fromJson(productJson()),
                  ),
                ]);

        final result = await repository.getProductDependencies('prod-1');

        expect(result, isA<Success<List<ProductDependency>>>());
        expect((result as Success<List<ProductDependency>>).data, hasLength(1));
      });

      test('returns UnknownFailure on error', () async {
        when(() => mockRemote.getProductDependencies(any()))
            .thenThrow(Exception('boom'));

        final result = await repository.getProductDependencies('prod-1');

        expect(result, isA<Error<List<ProductDependency>>>());
      });
    });

    // ============ Sync ============
    group('sync', () {
      test('syncCatalogue returns Success when remote getProducts succeeds',
          () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenAnswer((_) async => {'data': <dynamic>[]});

        final result = await repository.syncCatalogue();

        expect(result, isA<Success<void>>());
      });

      test('syncCatalogue propagates Error', () async {
        when(() => mockRemote.getProducts(
              queryParams: any(named: 'queryParams'),
            )).thenThrow(const NetworkException());

        final result = await repository.syncCatalogue();

        expect(result, isA<Error<void>>());
        expect((result as Error<void>).failure, isA<NetworkFailure>());
      });

      test('getLastSyncTime returns null (not implemented)', () async {
        expect(await repository.getLastSyncTime(), isNull);
      });

      test('needsSync returns false (not implemented)', () async {
        expect(await repository.needsSync(), isFalse);
      });
    });
  });
}
