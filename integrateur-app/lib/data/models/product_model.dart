import '../../domain/entities/product.dart';

/// Product model - matches backend products table (camelCase JSON)
class ProductModel extends Product {
  const ProductModel({
    required super.id,
    required super.reference,
    required super.name,
    required super.brand,
    required super.category,
    super.subCategory,
    required super.description,
    super.protocols,
    required super.purchasePrice,
    required super.salePrice,
    required super.marginPercent,
    super.photoUrl,
    super.specs,
    super.stockAvailable,
    super.isActive,
    super.isFavorite,
  });

  /// Parse from backend JSON
  /// Backend fields: id, reference, name, description, category, brand,
  ///   priceHT (string decimal), tvaRate (string decimal), imageUrl,
  ///   isActive, stock, createdAt, updatedAt
  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final priceHT = _parseDouble(json['priceHT']);
    final tvaRate = _parseDouble(json['tvaRate'] ?? '20');

    return ProductModel(
      id: json['id'] as String,
      reference: json['reference'] as String? ?? '',
      name: json['name'] as String? ?? '',
      brand: json['brand'] as String? ?? '',
      category: ProductCategory.fromString(
          json['category'] as String? ?? 'custom'),
      description: json['description'] as String? ?? '',
      purchasePrice: 0.0, // Not exposed by backend
      salePrice: priceHT,
      marginPercent: tvaRate,
      photoUrl: json['imageUrl'] as String?,
      stockAvailable: json['stock'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      isFavorite: false,
    );
  }

  /// Convert to JSON for create/update request
  Map<String, dynamic> toCreateJson() {
    return {
      'reference': reference,
      'name': name,
      if (description.isNotEmpty) 'description': description,
      'category': category.apiValue,
      if (brand.isNotEmpty) 'brand': brand,
      'priceHT': salePrice,
      'tvaRate': marginPercent, // tvaRate stored in marginPercent field
      if (photoUrl != null) 'imageUrl': photoUrl,
      'isActive': isActive,
      if (stockAvailable > 0) 'stock': stockAvailable,
    };
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      ...toCreateJson(),
    };
  }

  factory ProductModel.fromEntity(Product product) {
    return ProductModel(
      id: product.id,
      reference: product.reference,
      name: product.name,
      brand: product.brand,
      category: product.category,
      subCategory: product.subCategory,
      description: product.description,
      protocols: product.protocols,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      marginPercent: product.marginPercent,
      photoUrl: product.photoUrl,
      specs: product.specs,
      stockAvailable: product.stockAvailable,
      isActive: product.isActive,
      isFavorite: product.isFavorite,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

/// Model for product dependency from backend JSON
class ProductDependencyModel extends ProductDependency {
  const ProductDependencyModel({
    required super.id,
    required super.type,
    super.description,
    super.coveredQuantity,
    required super.requiredProduct,
  });

  factory ProductDependencyModel.fromJson(Map<String, dynamic> json) {
    final requiredProductJson = json['requiredProduct'] as Map<String, dynamic>;
    return ProductDependencyModel(
      id: json['id'] as String,
      type: DependencyType.fromString(json['type'] as String? ?? 'required'),
      description: json['description'] as String?,
      coveredQuantity: json['coveredQuantity'] as int? ?? 1,
      requiredProduct: ProductModel.fromJson(requiredProductJson),
    );
  }
}
