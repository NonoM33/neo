import '../entities/product.dart';
import '../repositories/auth_repository.dart';
import '../repositories/catalogue_repository.dart';

/// Get products use case
class GetProductsUseCase {
  final CatalogueRepository _repository;

  GetProductsUseCase(this._repository);

  Future<Result<List<Product>>> call({
    ProductFilter? filter,
    ProductSortBy sortBy = ProductSortBy.name,
    bool ascending = true,
  }) async {
    return _repository.getProducts(
      filter: filter,
      sortBy: sortBy,
      ascending: ascending,
    );
  }
}

/// Get single product use case
class GetProductUseCase {
  final CatalogueRepository _repository;

  GetProductUseCase(this._repository);

  Future<Result<Product>> call(String id) async {
    return _repository.getProduct(id);
  }
}

/// Search products use case
class SearchProductsUseCase {
  final CatalogueRepository _repository;

  SearchProductsUseCase(this._repository);

  Future<Result<List<Product>>> call(String query) async {
    if (query.trim().isEmpty) {
      return const Success([]);
    }
    return _repository.searchProducts(query);
  }
}

/// Toggle favorite use case
class ToggleFavoriteUseCase {
  final CatalogueRepository _repository;

  ToggleFavoriteUseCase(this._repository);

  Future<Result<Product>> call(String productId) async {
    return _repository.toggleFavorite(productId);
  }
}

/// Get favorites use case
class GetFavoritesUseCase {
  final CatalogueRepository _repository;

  GetFavoritesUseCase(this._repository);

  Future<Result<List<Product>>> call() async {
    return _repository.getFavorites();
  }
}

/// Sync catalogue use case
class SyncCatalogueUseCase {
  final CatalogueRepository _repository;

  SyncCatalogueUseCase(this._repository);

  Future<Result<void>> call() async {
    return _repository.syncCatalogue();
  }
}

/// Get brands use case
class GetBrandsUseCase {
  final CatalogueRepository _repository;

  GetBrandsUseCase(this._repository);

  Future<Result<List<String>>> call() async {
    return _repository.getBrands();
  }
}
