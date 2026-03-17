import 'package:equatable/equatable.dart';

/// Product category enum
enum ProductCategory {
  eclairage,
  ouvrants,
  climat,
  securite,
  energie,
  multimedia,
  custom;

  String get displayName {
    switch (this) {
      case ProductCategory.eclairage:
        return 'Éclairage';
      case ProductCategory.ouvrants:
        return 'Volets';
      case ProductCategory.climat:
        return 'Chauffage';
      case ProductCategory.securite:
        return 'Sécurité';
      case ProductCategory.energie:
        return 'Réseau';
      case ProductCategory.multimedia:
        return 'Audio';
      case ProductCategory.custom:
        return 'Services';
    }
  }

  /// Backend API value for this category
  String get apiValue {
    switch (this) {
      case ProductCategory.eclairage:
        return 'Éclairage';
      case ProductCategory.ouvrants:
        return 'Volets';
      case ProductCategory.climat:
        return 'Chauffage';
      case ProductCategory.securite:
        return 'Sécurité';
      case ProductCategory.energie:
        return 'Réseau';
      case ProductCategory.multimedia:
        return 'Audio';
      case ProductCategory.custom:
        return 'Services';
    }
  }

  static ProductCategory fromString(String value) {
    // Map backend category names to enum values
    switch (value) {
      case 'Éclairage':
      case 'eclairage':
        return ProductCategory.eclairage;
      case 'Volets':
      case 'ouvrants':
        return ProductCategory.ouvrants;
      case 'Chauffage':
      case 'climat':
        return ProductCategory.climat;
      case 'Sécurité':
      case 'securite':
        return ProductCategory.securite;
      case 'Réseau':
      case 'energie':
        return ProductCategory.energie;
      case 'Audio':
      case 'multimedia':
        return ProductCategory.multimedia;
      case 'Services':
      case 'custom':
        return ProductCategory.custom;
      default:
        return ProductCategory.custom;
    }
  }
}

/// Communication protocol enum
enum Protocol {
  zigbee,
  wifi,
  zwave,
  bluetooth,
  filaire,
  other;

  String get displayName {
    switch (this) {
      case Protocol.zigbee:
        return 'Zigbee';
      case Protocol.wifi:
        return 'WiFi';
      case Protocol.zwave:
        return 'Z-Wave';
      case Protocol.bluetooth:
        return 'Bluetooth';
      case Protocol.filaire:
        return 'Filaire';
      case Protocol.other:
        return 'Autre';
    }
  }

  static Protocol fromString(String value) {
    return Protocol.values.firstWhere(
      (p) => p.name == value.toLowerCase(),
      orElse: () => Protocol.other,
    );
  }
}

/// Indoor/outdoor location type
enum LocationType {
  indoor,
  outdoor,
  both;

  String get displayName {
    switch (this) {
      case LocationType.indoor:
        return 'Intérieur';
      case LocationType.outdoor:
        return 'Extérieur';
      case LocationType.both:
        return 'Intérieur/Extérieur';
    }
  }

  static LocationType fromString(String value) {
    return LocationType.values.firstWhere(
      (l) => l.name == value.toLowerCase(),
      orElse: () => LocationType.indoor,
    );
  }
}

/// Product specifications
class ProductSpecs extends Equatable {
  final String? alimentation;
  final String? dimensions;
  final bool? compatibiliteHA;
  final LocationType locationType;
  final Map<String, dynamic>? additionalSpecs;

  const ProductSpecs({
    this.alimentation,
    this.dimensions,
    this.compatibiliteHA,
    this.locationType = LocationType.indoor,
    this.additionalSpecs,
  });

  ProductSpecs copyWith({
    String? alimentation,
    String? dimensions,
    bool? compatibiliteHA,
    LocationType? locationType,
    Map<String, dynamic>? additionalSpecs,
  }) {
    return ProductSpecs(
      alimentation: alimentation ?? this.alimentation,
      dimensions: dimensions ?? this.dimensions,
      compatibiliteHA: compatibiliteHA ?? this.compatibiliteHA,
      locationType: locationType ?? this.locationType,
      additionalSpecs: additionalSpecs ?? this.additionalSpecs,
    );
  }

  @override
  List<Object?> get props => [
        alimentation,
        dimensions,
        compatibiliteHA,
        locationType,
        additionalSpecs,
      ];
}

/// Dependency type between products
enum DependencyType {
  required,
  recommended;

  String get displayName {
    switch (this) {
      case DependencyType.required:
        return 'Obligatoire';
      case DependencyType.recommended:
        return 'Recommandé';
    }
  }

  static DependencyType fromString(String value) {
    switch (value) {
      case 'required':
        return DependencyType.required;
      case 'recommended':
        return DependencyType.recommended;
      default:
        return DependencyType.required;
    }
  }
}

/// A dependency link between two products
class ProductDependency extends Equatable {
  final String id;
  final DependencyType type;
  final String? description;
  final Product requiredProduct;

  const ProductDependency({
    required this.id,
    required this.type,
    this.description,
    required this.requiredProduct,
  });

  @override
  List<Object?> get props => [id, type, description, requiredProduct];
}

/// Product entity
class Product extends Equatable {
  final String id;
  final String reference;
  final String name;
  final String brand;
  final ProductCategory category;
  final String? subCategory;
  final String description;
  final List<Protocol> protocols;
  final double purchasePrice;
  final double salePrice;
  final double marginPercent;
  final String? photoUrl;
  final ProductSpecs specs;
  final int stockAvailable;
  final bool isActive;
  final bool isFavorite;

  const Product({
    required this.id,
    required this.reference,
    required this.name,
    required this.brand,
    required this.category,
    this.subCategory,
    required this.description,
    this.protocols = const [],
    required this.purchasePrice,
    required this.salePrice,
    required this.marginPercent,
    this.photoUrl,
    this.specs = const ProductSpecs(),
    this.stockAvailable = 0,
    this.isActive = true,
    this.isFavorite = false,
  });

  /// Get the actual margin in euros
  double get marginAmount => salePrice - purchasePrice;

  /// Check if product is in stock
  bool get isInStock => stockAvailable > 0;

  /// Check if product is low stock (less than 5)
  bool get isLowStock => stockAvailable > 0 && stockAvailable < 5;

  /// Get protocol names joined
  String get protocolsDisplay =>
      protocols.map((p) => p.displayName).join(', ');

  /// Check if product supports Home Assistant
  bool get supportsHomeAssistant => specs.compatibiliteHA ?? false;

  Product copyWith({
    String? id,
    String? reference,
    String? name,
    String? brand,
    ProductCategory? category,
    String? subCategory,
    String? description,
    List<Protocol>? protocols,
    double? purchasePrice,
    double? salePrice,
    double? marginPercent,
    String? photoUrl,
    ProductSpecs? specs,
    int? stockAvailable,
    bool? isActive,
    bool? isFavorite,
  }) {
    return Product(
      id: id ?? this.id,
      reference: reference ?? this.reference,
      name: name ?? this.name,
      brand: brand ?? this.brand,
      category: category ?? this.category,
      subCategory: subCategory ?? this.subCategory,
      description: description ?? this.description,
      protocols: protocols ?? this.protocols,
      purchasePrice: purchasePrice ?? this.purchasePrice,
      salePrice: salePrice ?? this.salePrice,
      marginPercent: marginPercent ?? this.marginPercent,
      photoUrl: photoUrl ?? this.photoUrl,
      specs: specs ?? this.specs,
      stockAvailable: stockAvailable ?? this.stockAvailable,
      isActive: isActive ?? this.isActive,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  @override
  List<Object?> get props => [
        id,
        reference,
        name,
        brand,
        category,
        subCategory,
        description,
        protocols,
        purchasePrice,
        salePrice,
        marginPercent,
        photoUrl,
        specs,
        stockAvailable,
        isActive,
        isFavorite,
      ];
}
