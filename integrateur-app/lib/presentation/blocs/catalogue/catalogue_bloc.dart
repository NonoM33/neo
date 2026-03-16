import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/catalogue_repository.dart';
import '../../../domain/usecases/catalogue_usecases.dart';

// Events
sealed class CatalogueEvent extends Equatable {
  const CatalogueEvent();

  @override
  List<Object?> get props => [];
}

final class CatalogueLoadRequested extends CatalogueEvent {
  final ProductFilter? filter;
  final ProductSortBy sortBy;
  final bool ascending;

  const CatalogueLoadRequested({
    this.filter,
    this.sortBy = ProductSortBy.name,
    this.ascending = true,
  });

  @override
  List<Object?> get props => [filter, sortBy, ascending];
}

final class CatalogueSearchRequested extends CatalogueEvent {
  final String query;

  const CatalogueSearchRequested(this.query);

  @override
  List<Object?> get props => [query];
}

final class CatalogueFilterChanged extends CatalogueEvent {
  final ProductFilter filter;

  const CatalogueFilterChanged(this.filter);

  @override
  List<Object?> get props => [filter];
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
  final List<Product> products;
  final ProductFilter? filter;
  final ProductSortBy sortBy;
  final bool ascending;
  final List<String> brands;
  final Product? selectedProduct;
  final bool isSyncing;

  const CatalogueLoaded({
    required this.products,
    this.filter,
    this.sortBy = ProductSortBy.name,
    this.ascending = true,
    this.brands = const [],
    this.selectedProduct,
    this.isSyncing = false,
  });

  List<Product> get favorites => products.where((p) => p.isFavorite).toList();

  Map<ProductCategory, List<Product>> get productsByCategory {
    final map = <ProductCategory, List<Product>>{};
    for (final product in products) {
      map.putIfAbsent(product.category, () => []).add(product);
    }
    return map;
  }

  CatalogueLoaded copyWith({
    List<Product>? products,
    ProductFilter? filter,
    ProductSortBy? sortBy,
    bool? ascending,
    List<String>? brands,
    Product? selectedProduct,
    bool clearSelectedProduct = false,
    bool? isSyncing,
  }) {
    return CatalogueLoaded(
      products: products ?? this.products,
      filter: filter ?? this.filter,
      sortBy: sortBy ?? this.sortBy,
      ascending: ascending ?? this.ascending,
      brands: brands ?? this.brands,
      selectedProduct:
          clearSelectedProduct ? null : (selectedProduct ?? this.selectedProduct),
      isSyncing: isSyncing ?? this.isSyncing,
    );
  }

  @override
  List<Object?> get props => [
        products,
        filter,
        sortBy,
        ascending,
        brands,
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
  final SearchProductsUseCase _searchProductsUseCase;
  final ToggleFavoriteUseCase _toggleFavoriteUseCase;
  final SyncCatalogueUseCase _syncCatalogueUseCase;
  final GetBrandsUseCase _getBrandsUseCase;

  CatalogueBloc({
    required GetProductsUseCase getProductsUseCase,
    required SearchProductsUseCase searchProductsUseCase,
    required ToggleFavoriteUseCase toggleFavoriteUseCase,
    required SyncCatalogueUseCase syncCatalogueUseCase,
    required GetBrandsUseCase getBrandsUseCase,
  })  : _getProductsUseCase = getProductsUseCase,
        _searchProductsUseCase = searchProductsUseCase,
        _toggleFavoriteUseCase = toggleFavoriteUseCase,
        _syncCatalogueUseCase = syncCatalogueUseCase,
        _getBrandsUseCase = getBrandsUseCase,
        super(const CatalogueInitial()) {
    on<CatalogueLoadRequested>(_onLoadRequested);
    on<CatalogueSearchRequested>(_onSearchRequested);
    on<CatalogueFilterChanged>(_onFilterChanged);
    on<CatalogueToggleFavoriteRequested>(_onToggleFavorite);
    on<CatalogueSyncRequested>(_onSyncRequested);
    on<CatalogueProductSelected>(_onProductSelected);
  }

  Future<void> _onLoadRequested(
    CatalogueLoadRequested event,
    Emitter<CatalogueState> emit,
  ) async {
    emit(const CatalogueLoading());

    final results = await Future.wait([
      _getProductsUseCase(
        filter: event.filter,
        sortBy: event.sortBy,
        ascending: event.ascending,
      ),
      _getBrandsUseCase(),
    ]);

    final productsResult = results[0] as Result<List<Product>>;
    final brandsResult = results[1] as Result<List<String>>;

    switch (productsResult) {
      case Success(data: final products):
        final brands = brandsResult is Success<List<String>>
            ? brandsResult.data
            : <String>[];
        emit(CatalogueLoaded(
          products: products,
          filter: event.filter,
          sortBy: event.sortBy,
          ascending: event.ascending,
          brands: brands,
        ));
      case Error(failure: final failure):
        emit(CatalogueError(failure.message));
    }
  }

  Future<void> _onSearchRequested(
    CatalogueSearchRequested event,
    Emitter<CatalogueState> emit,
  ) async {
    final currentState = state;
    if (currentState is! CatalogueLoaded) return;

    if (event.query.isEmpty) {
      add(CatalogueLoadRequested(
        sortBy: currentState.sortBy,
        ascending: currentState.ascending,
      ));
      return;
    }

    final result = await _searchProductsUseCase(event.query);

    switch (result) {
      case Success(data: final products):
        emit(currentState.copyWith(products: products));
      case Error(failure: final failure):
        emit(CatalogueError(failure.message));
    }
  }

  Future<void> _onFilterChanged(
    CatalogueFilterChanged event,
    Emitter<CatalogueState> emit,
  ) async {
    final currentState = state;
    if (currentState is CatalogueLoaded) {
      add(CatalogueLoadRequested(
        filter: event.filter,
        sortBy: currentState.sortBy,
        ascending: currentState.ascending,
      ));
    }
  }

  Future<void> _onToggleFavorite(
    CatalogueToggleFavoriteRequested event,
    Emitter<CatalogueState> emit,
  ) async {
    final currentState = state;
    if (currentState is! CatalogueLoaded) return;

    final result = await _toggleFavoriteUseCase(event.productId);

    switch (result) {
      case Success(data: final product):
        final updatedProducts = currentState.products.map((p) {
          return p.id == product.id ? product : p;
        }).toList();
        emit(currentState.copyWith(
          products: updatedProducts,
          selectedProduct:
              currentState.selectedProduct?.id == product.id ? product : null,
        ));
      case Error():
        // Silently fail
        break;
    }
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
          add(CatalogueLoadRequested(
            filter: currentState.filter,
            sortBy: currentState.sortBy,
            ascending: currentState.ascending,
          ));
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
}
