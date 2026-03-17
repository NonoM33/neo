import '../entities/product.dart';
import 'auth_repository.dart';

/// Filter options for products
class ProductFilter {
  final String? searchQuery;
  final ProductCategory? category;
  final String? brand;
  final Protocol? protocol;
  final double? minPrice;
  final double? maxPrice;
  final bool? inStock;
  final bool? favoritesOnly;

  const ProductFilter({
    this.searchQuery,
    this.category,
    this.brand,
    this.protocol,
    this.minPrice,
    this.maxPrice,
    this.inStock,
    this.favoritesOnly,
  });

  bool get hasFilters =>
      searchQuery != null ||
      category != null ||
      brand != null ||
      protocol != null ||
      minPrice != null ||
      maxPrice != null ||
      inStock != null ||
      favoritesOnly == true;

  ProductFilter copyWith({
    String? searchQuery,
    ProductCategory? category,
    String? brand,
    Protocol? protocol,
    double? minPrice,
    double? maxPrice,
    bool? inStock,
    bool? favoritesOnly,
  }) {
    return ProductFilter(
      searchQuery: searchQuery ?? this.searchQuery,
      category: category ?? this.category,
      brand: brand ?? this.brand,
      protocol: protocol ?? this.protocol,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      inStock: inStock ?? this.inStock,
      favoritesOnly: favoritesOnly ?? this.favoritesOnly,
    );
  }
}

/// Sort options for products
enum ProductSortBy {
  name,
  price,
  brand,
  category,
  stock,
}

/// Catalogue repository interface
abstract class CatalogueRepository {
  /// Get all products with optional filtering
  Future<Result<List<Product>>> getProducts({
    ProductFilter? filter,
    ProductSortBy sortBy = ProductSortBy.name,
    bool ascending = true,
    int? limit,
    int? offset,
  });

  /// Get a single product by ID
  Future<Result<Product>> getProduct(String id);

  /// Get product by reference
  Future<Result<Product>> getProductByReference(String reference);

  /// Get all available categories
  Future<Result<List<ProductCategory>>> getCategories();

  /// Get all available brands
  Future<Result<List<String>>> getBrands();

  /// Toggle product favorite status
  Future<Result<Product>> toggleFavorite(String productId);

  /// Get favorite products
  Future<Result<List<Product>>> getFavorites();

  /// Search products by query
  Future<Result<List<Product>>> searchProducts(String query);

  /// Get product dependencies
  Future<Result<List<ProductDependency>>> getProductDependencies(String productId);

  /// Sync catalogue from remote
  Future<Result<void>> syncCatalogue();

  /// Get last sync timestamp
  Future<DateTime?> getLastSyncTime();

  /// Check if catalogue needs sync
  Future<bool> needsSync();
}
