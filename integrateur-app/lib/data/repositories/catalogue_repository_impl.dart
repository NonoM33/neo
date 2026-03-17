import 'dart:developer' as developer;

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/product.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/catalogue_repository.dart';
import '../datasources/remote/catalogue_remote_datasource.dart';
import '../models/product_model.dart';

/// Implementation of CatalogueRepository connected to backend API.
class CatalogueRepositoryImpl implements CatalogueRepository {
  final CatalogueRemoteDataSource _remoteDataSource;

  // Local favorites cache
  final Set<String> _favoriteIds = {};

  CatalogueRepositoryImpl({required CatalogueRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<Product>>> getProducts({
    ProductFilter? filter,
    ProductSortBy sortBy = ProductSortBy.name,
    bool ascending = true,
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, dynamic>{};

      if (filter?.category != null) {
        queryParams['category'] = filter!.category!.apiValue;
      }
      if (filter?.searchQuery != null && filter!.searchQuery!.isNotEmpty) {
        queryParams['search'] = filter.searchQuery;
      }
      if (filter?.brand != null) {
        queryParams['brand'] = filter!.brand;
      }
      if (filter?.minPrice != null) {
        queryParams['minPrice'] = filter!.minPrice;
      }
      if (filter?.maxPrice != null) {
        queryParams['maxPrice'] = filter!.maxPrice;
      }
      if (limit != null) queryParams['limit'] = limit;
      if (offset != null) {
        // Convert offset to page number
        final page = (offset ~/ (limit ?? 20)) + 1;
        queryParams['page'] = page;
      }

      final data = await _remoteDataSource.getProducts(queryParams: queryParams);
      final productsJson = data['data'] as List<dynamic>? ?? [];

      final products = productsJson.map((json) {
        final product = ProductModel.fromJson(json as Map<String, dynamic>);
        return product.copyWith(isFavorite: _favoriteIds.contains(product.id));
      }).toList();

      // Handle favorites-only filter locally
      if (filter?.favoritesOnly == true) {
        return Success(products.where((p) => p.isFavorite).toList());
      }

      return Success(products);
    } on NetworkException {
      return const Error(NetworkFailure(message: 'Impossible de charger le catalogue'));
    } catch (e, st) {
      developer.log('getProducts error: $e', name: 'CatalogueRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Product>> getProduct(String id) async {
    try {
      final product = await _remoteDataSource.getProduct(id);
      return Success(product.copyWith(isFavorite: _favoriteIds.contains(product.id)));
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Produit non trouvé'));
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Product>> getProductByReference(String reference) async {
    try {
      final data = await _remoteDataSource.getProducts(
        queryParams: {'search': reference, 'limit': 1},
      );
      final productsJson = data['data'] as List<dynamic>? ?? [];

      if (productsJson.isEmpty) {
        return const Error(NotFoundFailure(message: 'Produit non trouvé'));
      }

      final product = ProductModel.fromJson(productsJson.first as Map<String, dynamic>);
      return Success(product.copyWith(isFavorite: _favoriteIds.contains(product.id)));
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<List<ProductCategory>>> getCategories() async {
    try {
      final categories = await _remoteDataSource.getCategories();
      return Success(
        categories.map((cat) => ProductCategory.fromString(cat)).toList(),
      );
    } catch (e) {
      return const Success(ProductCategory.values);
    }
  }

  @override
  Future<Result<List<String>>> getBrands() async {
    try {
      final brands = await _remoteDataSource.getBrands();
      return Success(brands);
    } catch (e) {
      return const Success([]);
    }
  }

  @override
  Future<Result<Product>> toggleFavorite(String productId) async {
    if (_favoriteIds.contains(productId)) {
      _favoriteIds.remove(productId);
    } else {
      _favoriteIds.add(productId);
    }
    return getProduct(productId);
  }

  @override
  Future<Result<List<Product>>> getFavorites() async {
    return getProducts(filter: const ProductFilter(favoritesOnly: true));
  }

  @override
  Future<Result<List<Product>>> searchProducts(String query) async {
    return getProducts(filter: ProductFilter(searchQuery: query));
  }

  @override
  Future<Result<List<ProductDependency>>> getProductDependencies(String productId) async {
    try {
      final dependencies = await _remoteDataSource.getProductDependencies(productId);
      return Success(dependencies);
    } catch (e, st) {
      developer.log('getProductDependencies error: $e', name: 'CatalogueRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<void>> syncCatalogue() async {
    final result = await getProducts();
    if (result is Error) {
      return Error((result as Error).failure);
    }
    return const Success(null);
  }

  @override
  Future<DateTime?> getLastSyncTime() async => null;

  @override
  Future<bool> needsSync() async => false;
}
