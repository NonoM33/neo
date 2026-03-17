import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/quote.dart';
import '../../../domain/entities/product.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/quote_repository.dart';
import '../../../domain/usecases/quote_usecases.dart';

// Events
sealed class QuotesEvent extends Equatable {
  const QuotesEvent();

  @override
  List<Object?> get props => [];
}

final class QuotesLoadRequested extends QuotesEvent {
  final String projectId;

  const QuotesLoadRequested(this.projectId);

  @override
  List<Object?> get props => [projectId];
}

final class QuoteCreateRequested extends QuotesEvent {
  final String projectId;

  const QuoteCreateRequested(this.projectId);

  @override
  List<Object?> get props => [projectId];
}

final class QuoteAddProductRequested extends QuotesEvent {
  final Product product;
  final int quantity;
  final String? roomName;

  const QuoteAddProductRequested({
    required this.product,
    this.quantity = 1,
    this.roomName,
  });

  @override
  List<Object?> get props => [product, quantity, roomName];
}

final class QuoteAddLaborRequested extends QuotesEvent {
  final String description;
  final double priceHT;
  final int hours;

  const QuoteAddLaborRequested({
    required this.description,
    required this.priceHT,
    this.hours = 1,
  });

  @override
  List<Object?> get props => [description, priceHT, hours];
}

final class QuoteUpdateLineQuantityRequested extends QuotesEvent {
  final String lineId;
  final int quantity;

  const QuoteUpdateLineQuantityRequested({
    required this.lineId,
    required this.quantity,
  });

  @override
  List<Object?> get props => [lineId, quantity];
}

final class QuoteRemoveLineRequested extends QuotesEvent {
  final String lineId;

  const QuoteRemoveLineRequested(this.lineId);

  @override
  List<Object?> get props => [lineId];
}

final class QuoteApplyDiscountRequested extends QuotesEvent {
  final double discountHT;

  const QuoteApplyDiscountRequested(this.discountHT);

  @override
  List<Object?> get props => [discountHT];
}

final class QuoteSendRequested extends QuotesEvent {
  const QuoteSendRequested();
}

final class QuoteGeneratePdfRequested extends QuotesEvent {
  const QuoteGeneratePdfRequested();
}

final class QuoteSignRequested extends QuotesEvent {
  final String signatureBase64;

  const QuoteSignRequested(this.signatureBase64);

  @override
  List<Object?> get props => [signatureBase64];
}

// States
sealed class QuotesState extends Equatable {
  const QuotesState();

  @override
  List<Object?> get props => [];
}

final class QuotesInitial extends QuotesState {
  const QuotesInitial();
}

final class QuotesLoading extends QuotesState {
  const QuotesLoading();
}

final class QuotesLoaded extends QuotesState {
  final String projectId;
  final Quote? currentQuote;
  final List<Quote> quotes;
  final String? pdfPath;
  final bool isGeneratingPdf;
  final bool isSending;

  const QuotesLoaded({
    required this.projectId,
    this.currentQuote,
    this.quotes = const [],
    this.pdfPath,
    this.isGeneratingPdf = false,
    this.isSending = false,
  });

  double get totalHT => currentQuote?.totalHT ?? 0;
  double get totalTTC => currentQuote?.totalTTC ?? 0;
  int get lineCount => currentQuote?.lines.length ?? 0;

  QuotesLoaded copyWith({
    String? projectId,
    Quote? currentQuote,
    List<Quote>? quotes,
    String? pdfPath,
    bool clearPdfPath = false,
    bool? isGeneratingPdf,
    bool? isSending,
  }) {
    return QuotesLoaded(
      projectId: projectId ?? this.projectId,
      currentQuote: currentQuote ?? this.currentQuote,
      quotes: quotes ?? this.quotes,
      pdfPath: clearPdfPath ? null : (pdfPath ?? this.pdfPath),
      isGeneratingPdf: isGeneratingPdf ?? this.isGeneratingPdf,
      isSending: isSending ?? this.isSending,
    );
  }

  @override
  List<Object?> get props => [
        projectId,
        currentQuote,
        quotes,
        pdfPath,
        isGeneratingPdf,
        isSending,
      ];
}

final class QuotesError extends QuotesState {
  final String message;

  const QuotesError(this.message);

  @override
  List<Object?> get props => [message];
}

final class QuoteOperationSuccess extends QuotesState {
  final String message;

  const QuoteOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class QuotesBloc extends Bloc<QuotesEvent, QuotesState> {
  final QuoteRepository _quoteRepository;
  final GetQuotesForProjectUseCase _getQuotesUseCase;
  final CreateQuoteUseCase _createQuoteUseCase;
  final AddQuoteLineUseCase _addLineUseCase;
  final UpdateQuoteLineUseCase _updateLineUseCase;
  final RemoveQuoteLineUseCase _removeLineUseCase;
  final ApplyDiscountUseCase _applyDiscountUseCase;
  final SendQuoteUseCase _sendQuoteUseCase;
  final GenerateQuotePdfUseCase _generatePdfUseCase;
  final SignQuoteUseCase _signQuoteUseCase;

  QuotesBloc({
    required QuoteRepository quoteRepository,
    required GetQuotesForProjectUseCase getQuotesUseCase,
    required CreateQuoteUseCase createQuoteUseCase,
    required AddQuoteLineUseCase addLineUseCase,
    required UpdateQuoteLineUseCase updateLineUseCase,
    required RemoveQuoteLineUseCase removeLineUseCase,
    required ApplyDiscountUseCase applyDiscountUseCase,
    required SendQuoteUseCase sendQuoteUseCase,
    required GenerateQuotePdfUseCase generatePdfUseCase,
    required SignQuoteUseCase signQuoteUseCase,
  })  : _quoteRepository = quoteRepository,
        _getQuotesUseCase = getQuotesUseCase,
        _createQuoteUseCase = createQuoteUseCase,
        _addLineUseCase = addLineUseCase,
        _updateLineUseCase = updateLineUseCase,
        _removeLineUseCase = removeLineUseCase,
        _applyDiscountUseCase = applyDiscountUseCase,
        _sendQuoteUseCase = sendQuoteUseCase,
        _generatePdfUseCase = generatePdfUseCase,
        _signQuoteUseCase = signQuoteUseCase,
        super(const QuotesInitial()) {
    on<QuotesLoadRequested>(_onLoadRequested);
    on<QuoteCreateRequested>(_onCreateRequested);
    on<QuoteAddProductRequested>(_onAddProductRequested);
    on<QuoteAddLaborRequested>(_onAddLaborRequested);
    on<QuoteUpdateLineQuantityRequested>(_onUpdateLineQuantity);
    on<QuoteRemoveLineRequested>(_onRemoveLineRequested);
    on<QuoteApplyDiscountRequested>(_onApplyDiscountRequested);
    on<QuoteSendRequested>(_onSendRequested);
    on<QuoteGeneratePdfRequested>(_onGeneratePdfRequested);
    on<QuoteSignRequested>(_onSignRequested);
  }

  Future<void> _onLoadRequested(
    QuotesLoadRequested event,
    Emitter<QuotesState> emit,
  ) async {
    emit(const QuotesLoading());

    final result = await _getQuotesUseCase(event.projectId);

    switch (result) {
      case Success(data: final quotes):
        final quotesList = List<Quote>.from(quotes);
        Quote? currentQuote;

        if (quotesList.isNotEmpty) {
          final selected = quotesList.firstWhere(
            (q) => q.status == QuoteStatus.brouillon,
            orElse: () => quotesList.first,
          );
          // Fetch full quote with lines (list endpoint may omit them)
          final fullResult = await _quoteRepository.getQuote(selected.id);
          currentQuote = fullResult is Success<Quote>
              ? fullResult.data
              : selected;
        }

        emit(QuotesLoaded(
          projectId: event.projectId,
          quotes: quotes,
          currentQuote: currentQuote,
        ));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onCreateRequested(
    QuoteCreateRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final numberResult = await _quoteRepository.generateQuoteNumber();
    if (numberResult is Error) {
      emit(QuotesError((numberResult as Error).failure.message));
      return;
    }

    final number = (numberResult as Success<String>).data;
    final quote = Quote(
      id: '',
      projectId: event.projectId,
      number: number,
      date: DateTime.now(),
    );

    final result = await _createQuoteUseCase(quote);

    switch (result) {
      case Success():
        add(QuotesLoadRequested(event.projectId));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onAddProductRequested(
    QuoteAddProductRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    final line = QuoteLine(
      id: '',
      type: QuoteLineType.produit,
      productId: event.product.id,
      description: event.product.name,
      quantity: event.quantity,
      unitPriceHT: event.product.salePrice,
      roomName: event.roomName,
    );

    final result = await _addLineUseCase(
      currentState.currentQuote!.id,
      line,
    );

    switch (result) {
      case Success(data: final quote):
        emit(currentState.copyWith(currentQuote: quote));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onAddLaborRequested(
    QuoteAddLaborRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    final line = QuoteLine(
      id: '',
      type: QuoteLineType.mainOeuvre,
      description: event.description,
      quantity: event.hours,
      unitPriceHT: event.priceHT,
    );

    final result = await _addLineUseCase(
      currentState.currentQuote!.id,
      line,
    );

    switch (result) {
      case Success(data: final quote):
        emit(currentState.copyWith(currentQuote: quote));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onUpdateLineQuantity(
    QuoteUpdateLineQuantityRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    final line = currentState.currentQuote!.lines.firstWhere(
      (l) => l.id == event.lineId,
    );
    final updatedLine = line.copyWith(quantity: event.quantity);

    final result = await _updateLineUseCase(
      currentState.currentQuote!.id,
      updatedLine,
    );

    switch (result) {
      case Success(data: final quote):
        emit(currentState.copyWith(currentQuote: quote));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onRemoveLineRequested(
    QuoteRemoveLineRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    final result = await _removeLineUseCase(
      currentState.currentQuote!.id,
      event.lineId,
    );

    switch (result) {
      case Success(data: final quote):
        emit(currentState.copyWith(currentQuote: quote));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onApplyDiscountRequested(
    QuoteApplyDiscountRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    final result = await _applyDiscountUseCase(
      currentState.currentQuote!.id,
      event.discountHT,
    );

    switch (result) {
      case Success(data: final quote):
        emit(currentState.copyWith(currentQuote: quote));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onSendRequested(
    QuoteSendRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    emit(currentState.copyWith(isSending: true));

    final result = await _sendQuoteUseCase(currentState.currentQuote!.id);

    switch (result) {
      case Success():
        emit(const QuoteOperationSuccess('Devis envoyé au client'));
        add(QuotesLoadRequested(currentState.projectId));
      case Error(failure: final failure):
        emit(currentState.copyWith(isSending: false));
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onGeneratePdfRequested(
    QuoteGeneratePdfRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    emit(currentState.copyWith(isGeneratingPdf: true));

    final result = await _generatePdfUseCase(currentState.currentQuote!.id);

    switch (result) {
      case Success(data: final pdfPath):
        emit(currentState.copyWith(
          pdfPath: pdfPath,
          isGeneratingPdf: false,
        ));
      case Error(failure: final failure):
        emit(currentState.copyWith(isGeneratingPdf: false));
        emit(QuotesError(failure.message));
    }
  }

  Future<void> _onSignRequested(
    QuoteSignRequested event,
    Emitter<QuotesState> emit,
  ) async {
    final currentState = state;
    if (currentState is! QuotesLoaded || currentState.currentQuote == null) {
      return;
    }

    final result = await _signQuoteUseCase(
      currentState.currentQuote!.id,
      event.signatureBase64,
    );

    switch (result) {
      case Success(data: final quote):
        emit(const QuoteOperationSuccess('Devis signé avec succès'));
        emit(currentState.copyWith(currentQuote: quote));
      case Error(failure: final failure):
        emit(QuotesError(failure.message));
    }
  }
}
