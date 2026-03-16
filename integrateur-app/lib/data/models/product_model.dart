import '../../domain/entities/product.dart';

/// Product specs model
class ProductSpecsModel extends ProductSpecs {
  const ProductSpecsModel({
    super.alimentation,
    super.dimensions,
    super.compatibiliteHA,
    super.locationType,
    super.additionalSpecs,
  });

  factory ProductSpecsModel.fromJson(Map<String, dynamic> json) {
    return ProductSpecsModel(
      alimentation: json['alimentation'] as String?,
      dimensions: json['dimensions'] as String?,
      compatibiliteHA: json['compatibilite_ha'] as bool? ??
          json['compatibiliteHA'] as bool?,
      locationType: LocationType.fromString(
          json['indoor_outdoor'] as String? ??
          json['locationType'] as String? ??
          'indoor'),
      additionalSpecs: json['additional'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'alimentation': alimentation,
      'dimensions': dimensions,
      'compatibilite_ha': compatibiliteHA,
      'indoor_outdoor': locationType.name,
      'additional': additionalSpecs,
    };
  }

  factory ProductSpecsModel.fromEntity(ProductSpecs specs) {
    return ProductSpecsModel(
      alimentation: specs.alimentation,
      dimensions: specs.dimensions,
      compatibiliteHA: specs.compatibiliteHA,
      locationType: specs.locationType,
      additionalSpecs: specs.additionalSpecs,
    );
  }
}

/// Product model for JSON serialization
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

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String,
      reference: json['reference'] as String,
      name: json['nom'] as String? ?? json['name'] as String? ?? '',
      brand: json['marque'] as String? ?? json['brand'] as String? ?? '',
      category: ProductCategory.fromString(
          json['categorie'] as String? ?? json['category'] as String? ?? 'custom'),
      subCategory: json['sous_categorie'] as String? ?? json['subCategory'] as String?,
      description: json['description'] as String? ?? '',
      protocols: (json['protocole'] as List<dynamic>?)
              ?.map((e) => Protocol.fromString(e as String))
              .toList() ??
          (json['protocols'] as List<dynamic>?)
              ?.map((e) => Protocol.fromString(e as String))
              .toList() ??
          [],
      purchasePrice: (json['prix_achat'] as num?)?.toDouble() ??
          (json['purchasePrice'] as num?)?.toDouble() ??
          0.0,
      salePrice: (json['prix_vente'] as num?)?.toDouble() ??
          (json['salePrice'] as num?)?.toDouble() ??
          0.0,
      marginPercent: (json['marge_pourcent'] as num?)?.toDouble() ??
          (json['marginPercent'] as num?)?.toDouble() ??
          0.0,
      photoUrl: json['photo_url'] as String? ?? json['photoUrl'] as String?,
      specs: json['specs'] != null
          ? ProductSpecsModel.fromJson(json['specs'] as Map<String, dynamic>)
          : const ProductSpecs(),
      stockAvailable: json['stock_disponible'] as int? ??
          json['stockAvailable'] as int? ??
          0,
      isActive: json['actif'] as bool? ?? json['isActive'] as bool? ?? true,
      isFavorite: json['is_favorite'] as bool? ?? json['isFavorite'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reference': reference,
      'nom': name,
      'marque': brand,
      'categorie': category.name,
      'sous_categorie': subCategory,
      'description': description,
      'protocole': protocols.map((p) => p.name).toList(),
      'prix_achat': purchasePrice,
      'prix_vente': salePrice,
      'marge_pourcent': marginPercent,
      'photo_url': photoUrl,
      'specs': ProductSpecsModel.fromEntity(specs).toJson(),
      'stock_disponible': stockAvailable,
      'actif': isActive,
      'is_favorite': isFavorite,
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
}
