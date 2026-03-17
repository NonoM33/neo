import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/usecases/catalogue_usecases.dart';

// Events
sealed class CatalogueEvent extends Equatable {
  const CatalogueEvent();

  @override
  List<Object?> get props => [];
}

final class CatalogueLoadRequested extends CatalogueEvent {
  const CatalogueLoadRequested();
}

final class CatalogueSearchRequested extends CatalogueEvent {
  final String query;

  const CatalogueSearchRequested(this.query);

  @override
  List<Object?> get props => [query];
}

final class CatalogueFilterChanged extends CatalogueEvent {
  final ProductCategory? category;
  final bool? favoritesOnly;

  const CatalogueFilterChanged({this.category, this.favoritesOnly});

  @override
  List<Object?> get props => [category, favoritesOnly];
}

final class CatalogueToggleFavoriteRequested extends CatalogueEvent {
  final String productId;

  const CatalogueToggleFavoriteRequested(this.productId);

  @override
  List<Object?> get props => [productId];
}

final class CatalogueSyncRequested extends CatalogueEvent {
  const CatalogueSyncRequested();
}

final class CatalogueProductSelected extends CatalogueEvent {
  final Product product;

  const CatalogueProductSelected(this.product);

  @override
  List<Object?> get props => [product];
}

final class CatalogueProductDeselected extends CatalogueEvent {
  const CatalogueProductDeselected();
}

// States
sealed class CatalogueState extends Equatable {
  const CatalogueState();

  @override
  List<Object?> get props => [];
}

final class CatalogueInitial extends CatalogueState {
  const CatalogueInitial();
}

final class CatalogueLoading extends CatalogueState {
  const CatalogueLoading();
}

final class CatalogueLoaded extends CatalogueState {
  /// All products from API (unfiltered)
  final List<Product> allProducts;
  final List<String> brands;
  final ProductCategory? activeCategory;
  final String searchQuery;
  final bool favoritesOnly;
  final Product? selectedProduct;
  final bool isSyncing;

  const CatalogueLoaded({
    required this.allProducts,
    this.brands = const [],
    this.activeCategory,
    this.searchQuery = '',
    this.favoritesOnly = false,
    this.selectedProduct,
    this.isSyncing = false,
  });

  /// Filtered products for display
  List<Product> get products {
    var result = allProducts.toList();

    if (activeCategory != null) {
      result = result.where((p) => p.category == activeCategory).toList();
    }

    if (favoritesOnly) {
      result = result.where((p) => p.isFavorite).toList();
    }

    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      result = result.where((p) =>
          p.name.toLowerCase().contains(q) ||
          p.brand.toLowerCase().contains(q) ||
          p.reference.toLowerCase().contains(q) ||
          p.description.toLowerCase().contains(q)).toList();
    }

    return result;
  }

  List<Product> get favorites =>
      allProducts.where((p) => p.isFavorite).toList();

  int countForCategory(ProductCategory category) =>
      allProducts.where((p) => p.category == category).length;

  CatalogueLoaded copyWith({
    List<Product>? allProducts,
    List<String>? brands,
    ProductCategory? activeCategory,
    bool clearActiveCategory = false,
    String? searchQuery,
    bool? favoritesOnly,
    Product? selectedProduct,
    bool clearSelectedProduct = false,
    bool? isSyncing,
  }) {
    return CatalogueLoaded(
      allProducts: allProducts ?? this.allProducts,
      brands: brands ?? this.brands,
      activeCategory:
          clearActiveCategory ? null : (activeCategory ?? this.activeCategory),
      searchQuery: searchQuery ?? this.searchQuery,
      favoritesOnly: favoritesOnly ?? this.favoritesOnly,
      selectedProduct:
          clearSelectedProduct ? null : (selectedProduct ?? this.selectedProduct),
      isSyncing: isSyncing ?? this.isSyncing,
    );
  }

  @override
  List<Object?> get props => [
        allProducts,
        brands,
        activeCategory,
        searchQuery,
        favoritesOnly,
        selectedProduct,
        isSyncing,
      ];
}

final class CatalogueError extends CatalogueState {
  final String message;

  const CatalogueError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class CatalogueBloc extends Bloc<CatalogueEvent, CatalogueState> {
  final GetProductsUseCase _getProductsUseCase;
  final GetBrandsUseCase _getBrandsUseCase;
  final SyncCatalogueUseCase _syncCatalogueUseCase;

  CatalogueBloc({
    required GetProductsUseCase getProductsUseCase,
    required SearchProductsUseCase searchProductsUseCase,
    required ToggleFavoriteUseCase toggleFavoriteUseCase,
    required SyncCatalogueUseCase syncCatalogueUseCase,
    required GetBrandsUseCase getBrandsUseCase,
  })  : _getProductsUseCase = getProductsUseCase,
        _syncCatalogueUseCase = syncCatalogueUseCase,
        _getBrandsUseCase = getBrandsUseCase,
        super(const CatalogueInitial()) {
    on<CatalogueLoadRequested>(_onLoadRequested);
    on<CatalogueSearchRequested>(_onSearchRequested);
    on<CatalogueFilterChanged>(_onFilterChanged);
    on<CatalogueToggleFavoriteRequested>(_onToggleFavorite);
    on<CatalogueSyncRequested>(_onSyncRequested);
    on<CatalogueProductSelected>(_onProductSelected);
    on<CatalogueProductDeselected>(_onProductDeselected);
  }

  Future<void> _onLoadRequested(
    CatalogueLoadRequested event,
    Emitter<CatalogueState> emit,
  ) async {
    if (state is! CatalogueLoaded) {
      emit(const CatalogueLoading());
    }

    // Always fetch ALL products (no server-side filter)
    final results = await Future.wait([
      _getProductsUseCase(),
      _getBrandsUseCase(),
    ]);

    final productsResult = results[0] as Result<List<Product>>;
    final brandsResult = results[1] as Result<List<String>>;

    switch (productsResult) {
      case Success(data: final products):
        final brands = brandsResult is Success<List<String>>
            ? brandsResult.data
            : <String>[];
        final currentState = state;
        emit(CatalogueLoaded(
          allProducts: products,
          brands: brands,
          // Preserve current filters if reloading
          activeCategory: currentState is CatalogueLoaded
              ? currentState.activeCategory
              : null,
          searchQuery: currentState is CatalogueLoaded
              ? currentState.searchQuery
              : '',
          favoritesOnly: currentState is CatalogueLoaded
              ? currentState.favoritesOnly
              : false,
        ));
      case Error(failure: final failure):
        if (state is! CatalogueLoaded) {
          emit(CatalogueError(failure.message));
        }
    }
  }

  void _onSearchRequested(
    CatalogueSearchRequested event,
    Emitter<CatalogueState> emit,
  ) {
    final currentState = state;
    if (currentState is! CatalogueLoaded) return;

    emit(currentState.copyWith(
      searchQuery: event.query,
      favoritesOnly: false,
    ));
  }

  void _onFilterChanged(
    CatalogueFilterChanged event,
    Emitter<CatalogueState> emit,
  ) {
    final currentState = state;
    if (currentState is! CatalogueLoaded) return;

    if (event.favoritesOnly == true) {
      emit(currentState.copyWith(
        favoritesOnly: true,
        clearActiveCategory: true,
        searchQuery: '',
      ));
    } else {
      emit(currentState.copyWith(
        activeCategory: event.category,
        clearActiveCategory: event.category == null,
        favoritesOnly: false,
      ));
    }
  }

  void _onToggleFavorite(
    CatalogueToggleFavoriteRequested event,
    Emitter<CatalogueState> emit,
  ) {
    final currentState = state;
    if (currentState is! CatalogueLoaded) return;

    // Toggle favorite locally — no API call needed
    final updatedProducts = currentState.allProducts.map((p) {
      if (p.id == event.productId) {
        return p.copyWith(isFavorite: !p.isFavorite);
      }
      return p;
    }).toList();

    // Also update selectedProduct if it's the toggled one
    Product? updatedSelected = currentState.selectedProduct;
    if (updatedSelected != null && updatedSelected.id == event.productId) {
      updatedSelected = updatedSelected.copyWith(
          isFavorite: !updatedSelected.isFavorite);
    }

    emit(CatalogueLoaded(
      allProducts: updatedProducts,
      brands: currentState.brands,
      activeCategory: currentState.activeCategory,
      searchQuery: currentState.searchQuery,
      favoritesOnly: currentState.favoritesOnly,
      selectedProduct: updatedSelected,
      isSyncing: currentState.isSyncing,
    ));
  }

  Future<void> _onSyncRequested(
    CatalogueSyncRequested event,
    Emitter<CatalogueState> emit,
  ) async {
    final currentState = state;
    if (currentState is CatalogueLoaded) {
      emit(currentState.copyWith(isSyncing: true));

      final result = await _syncCatalogueUseCase();

      switch (result) {
        case Success():
          add(const CatalogueLoadRequested());
        case Error(failure: final failure):
          emit(currentState.copyWith(isSyncing: false));
          emit(CatalogueError(failure.message));
      }
    }
  }

  void _onProductSelected(
    CatalogueProductSelected event,
    Emitter<CatalogueState> emit,
  ) {
    final currentState = state;
    if (currentState is CatalogueLoaded) {
      emit(currentState.copyWith(selectedProduct: event.product));
    }
  }

  void _onProductDeselected(
    CatalogueProductDeselected event,
    Emitter<CatalogueState> emit,
  ) {
    final currentState = state;
    if (currentState is CatalogueLoaded) {
      emit(currentState.copyWith(clearSelectedProduct: true));
    }
  }
}
