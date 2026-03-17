import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/product_model.dart';

/// Remote data source for catalogue/products
abstract class CatalogueRemoteDataSource {
  Future<Map<String, dynamic>> getProducts({Map<String, dynamic>? queryParams});
  Future<ProductModel> getProduct(String id);
  Future<List<String>> getCategories();
  Future<List<String>> getBrands();
  Future<List<ProductDependencyModel>> getProductDependencies(String productId);
}

class CatalogueRemoteDataSourceImpl implements CatalogueRemoteDataSource {
  final ApiClient _apiClient;

  CatalogueRemoteDataSourceImpl(this._apiClient);

  @override
  Future<Map<String, dynamic>> getProducts({Map<String, dynamic>? queryParams}) async {
    final response = await _apiClient.get(
      ApiEndpoints.products,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<ProductModel> getProduct(String id) async {
    final response = await _apiClient.get(ApiEndpoints.product(id));
    return ProductModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<List<String>> getCategories() async {
    final response = await _apiClient.get(ApiEndpoints.categories);
    final list = response.data as List<dynamic>;
    return list.map((e) => e as String).toList();
  }

  @override
  Future<List<String>> getBrands() async {
    final response = await _apiClient.get(ApiEndpoints.brands);
    final list = response.data as List<dynamic>;
    return list.map((e) => e as String).where((b) => b.isNotEmpty).toList();
  }

  @override
  Future<List<ProductDependencyModel>> getProductDependencies(String productId) async {
    final response = await _apiClient.get(ApiEndpoints.productDependencies(productId));
    final list = response.data as List<dynamic>;
    return list
        .map((e) => ProductDependencyModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
