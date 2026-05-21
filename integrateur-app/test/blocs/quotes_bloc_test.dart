import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/domain/entities/product.dart';
import 'package:neo_integrateur/domain/entities/quote.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';
import 'package:neo_integrateur/domain/repositories/quote_repository.dart';
import 'package:neo_integrateur/domain/usecases/quote_usecases.dart';
import 'package:neo_integrateur/presentation/blocs/quotes/quotes_bloc.dart';

class MockQuoteRepository extends Mock implements QuoteRepository {}

class MockGetQuotesForProjectUseCase extends Mock
    implements GetQuotesForProjectUseCase {}

class MockCreateQuoteUseCase extends Mock implements CreateQuoteUseCase {}

class MockAddQuoteLineUseCase extends Mock implements AddQuoteLineUseCase {}

class MockUpdateQuoteLineUseCase extends Mock implements UpdateQuoteLineUseCase {}

class MockRemoveQuoteLineUseCase extends Mock implements RemoveQuoteLineUseCase {}

class MockApplyDiscountUseCase extends Mock implements ApplyDiscountUseCase {}

class MockSendQuoteUseCase extends Mock implements SendQuoteUseCase {}

class MockGenerateQuotePdfUseCase extends Mock
    implements GenerateQuotePdfUseCase {}

class MockSignQuoteUseCase extends Mock implements SignQuoteUseCase {}

class _FakeQuote extends Fake implements Quote {}

class _FakeQuoteLine extends Fake implements QuoteLine {}

void main() {
  setUpAll(() {
    registerFallbackValue(_FakeQuote());
    registerFallbackValue(_FakeQuoteLine());
  });

  late MockQuoteRepository mockRepository;
  late MockGetQuotesForProjectUseCase mockGetQuotes;
  late MockCreateQuoteUseCase mockCreate;
  late MockAddQuoteLineUseCase mockAddLine;
  late MockUpdateQuoteLineUseCase mockUpdateLine;
  late MockRemoveQuoteLineUseCase mockRemoveLine;
  late MockApplyDiscountUseCase mockApplyDiscount;
  late MockSendQuoteUseCase mockSendQuote;
  late MockGenerateQuotePdfUseCase mockGeneratePdf;
  late MockSignQuoteUseCase mockSignQuote;

  final draftQuote = Quote(
    id: 'quote-1',
    projectId: 'proj-1',
    number: 'DEV-2026-001',
    date: DateTime(2026, 5, 1),
    status: QuoteStatus.brouillon,
    lines: const [
      QuoteLine(
        id: 'line-1',
        type: QuoteLineType.produit,
        description: 'Module Zigbee',
        quantity: 2,
        unitPriceHT: 49.90,
      ),
    ],
  );

  const testProduct = Product(
    id: 'prod-1',
    reference: 'REF-001',
    name: 'Ampoule connectée',
    brand: 'Philips',
    category: ProductCategory.eclairage,
    description: '',
    purchasePrice: 5,
    salePrice: 25,
    marginPercent: 20,
  );

  QuotesBloc buildBloc() => QuotesBloc(
        quoteRepository: mockRepository,
        getQuotesUseCase: mockGetQuotes,
        createQuoteUseCase: mockCreate,
        addLineUseCase: mockAddLine,
        updateLineUseCase: mockUpdateLine,
        removeLineUseCase: mockRemoveLine,
        applyDiscountUseCase: mockApplyDiscount,
        sendQuoteUseCase: mockSendQuote,
        generatePdfUseCase: mockGeneratePdf,
        signQuoteUseCase: mockSignQuote,
      );

  setUp(() {
    mockRepository = MockQuoteRepository();
    mockGetQuotes = MockGetQuotesForProjectUseCase();
    mockCreate = MockCreateQuoteUseCase();
    mockAddLine = MockAddQuoteLineUseCase();
    mockUpdateLine = MockUpdateQuoteLineUseCase();
    mockRemoveLine = MockRemoveQuoteLineUseCase();
    mockApplyDiscount = MockApplyDiscountUseCase();
    mockSendQuote = MockSendQuoteUseCase();
    mockGeneratePdf = MockGenerateQuotePdfUseCase();
    mockSignQuote = MockSignQuoteUseCase();
  });

  group('QuotesBloc', () {
    test('initial state is QuotesInitial', () {
      expect(buildBloc().state, isA<QuotesInitial>());
    });

    group('QuotesLoadRequested', () {
      blocTest<QuotesBloc, QuotesState>(
        'emits [Loading, Loaded] picking the brouillon as currentQuote',
        setUp: () {
          when(() => mockGetQuotes(any()))
              .thenAnswer((_) async => Success([draftQuote]));
          when(() => mockRepository.getQuote(any()))
              .thenAnswer((_) async => Success(draftQuote));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const QuotesLoadRequested('proj-1')),
        expect: () => [
          isA<QuotesLoading>(),
          isA<QuotesLoaded>()
              .having((s) => s.quotes, 'quotes', hasLength(1))
              .having((s) => s.currentQuote?.id, 'currentQuote.id',
                  equals('quote-1')),
        ],
      );

      blocTest<QuotesBloc, QuotesState>(
        'emits [Loading, Loaded] with null currentQuote when no quotes',
        setUp: () {
          when(() => mockGetQuotes(any()))
              .thenAnswer((_) async => Success(<Quote>[]));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const QuotesLoadRequested('proj-1')),
        expect: () => [
          isA<QuotesLoading>(),
          isA<QuotesLoaded>().having(
              (s) => s.currentQuote, 'currentQuote', isNull),
        ],
      );

      blocTest<QuotesBloc, QuotesState>(
        'emits [Loading, Error] on failure',
        setUp: () {
          when(() => mockGetQuotes(any())).thenAnswer(
            (_) async => const Error(NetworkFailure(message: 'KO')),
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const QuotesLoadRequested('proj-1')),
        expect: () => [
          isA<QuotesLoading>(),
          isA<QuotesError>(),
        ],
      );
    });

    group('QuoteCreateRequested', () {
      blocTest<QuotesBloc, QuotesState>(
        'generates number, creates quote then reloads',
        setUp: () {
          when(() => mockRepository.generateQuoteNumber())
              .thenAnswer((_) async => const Success('DEV-2026-001'));
          when(() => mockCreate(any()))
              .thenAnswer((_) async => Success(draftQuote));
          when(() => mockGetQuotes(any()))
              .thenAnswer((_) async => Success([draftQuote]));
          when(() => mockRepository.getQuote(any()))
              .thenAnswer((_) async => Success(draftQuote));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const QuoteCreateRequested('proj-1')),
        expect: () => [
          isA<QuotesLoading>(),
          isA<QuotesLoaded>(),
        ],
      );

      blocTest<QuotesBloc, QuotesState>(
        'emits Error if number generation fails',
        setUp: () {
          when(() => mockRepository.generateQuoteNumber()).thenAnswer(
              (_) async =>
                  const Error(UnknownFailure(message: 'numbering down')));
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const QuoteCreateRequested('proj-1')),
        expect: () => [
          isA<QuotesError>().having(
              (s) => s.message, 'message', equals('numbering down')),
        ],
      );
    });

    group('line operations', () {
      blocTest<QuotesBloc, QuotesState>(
        'QuoteAddProductRequested: ignored if no current quote',
        build: buildBloc,
        act: (bloc) => bloc.add(
          const QuoteAddProductRequested(product: testProduct),
        ),
        expect: () => <QuotesState>[],
      );

      blocTest<QuotesBloc, QuotesState>(
        'QuoteAddProductRequested: emits updated currentQuote on success',
        setUp: () {
          final after = draftQuote.copyWith(
            lines: [
              ...draftQuote.lines,
              const QuoteLine(
                id: 'line-2',
                type: QuoteLineType.produit,
                productId: 'prod-1',
                description: 'Ampoule connectée',
                quantity: 3,
                unitPriceHT: 25,
              ),
            ],
          );
          when(() => mockAddLine(any(), any()))
              .thenAnswer((_) async => Success(after));
        },
        seed: () => QuotesLoaded(
          projectId: 'proj-1',
          currentQuote: draftQuote,
          quotes: [draftQuote],
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(
          const QuoteAddProductRequested(product: testProduct, quantity: 3),
        ),
        expect: () => [
          isA<QuotesLoaded>().having(
              (s) => s.currentQuote?.lines.length, 'lines.length', equals(2)),
        ],
        verify: (_) {
          final captured =
              verify(() => mockAddLine('quote-1', captureAny())).captured.single
                  as QuoteLine;
          expect(captured.productId, equals('prod-1'));
          expect(captured.quantity, equals(3));
          expect(captured.unitPriceHT, equals(25));
        },
      );

      blocTest<QuotesBloc, QuotesState>(
        'QuoteAddLaborRequested: forwards labor line with hours as quantity',
        setUp: () {
          final after = draftQuote.copyWith(lines: [
            ...draftQuote.lines,
            const QuoteLine(
              id: 'line-labor',
              type: QuoteLineType.mainOeuvre,
              description: 'Installation',
              quantity: 4,
              unitPriceHT: 250,
            ),
          ]);
          when(() => mockAddLine(any(), any()))
              .thenAnswer((_) async => Success(after));
        },
        seed: () => QuotesLoaded(
          projectId: 'proj-1',
          currentQuote: draftQuote,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(
          const QuoteAddLaborRequested(
            description: 'Installation',
            priceHT: 250,
            hours: 4,
          ),
        ),
        expect: () => [isA<QuotesLoaded>()],
        verify: (_) {
          final captured =
              verify(() => mockAddLine('quote-1', captureAny())).captured.single
                  as QuoteLine;
          expect(captured.type, equals(QuoteLineType.mainOeuvre));
          expect(captured.quantity, equals(4));
          expect(captured.unitPriceHT, equals(250));
        },
      );

      blocTest<QuotesBloc, QuotesState>(
        'QuoteUpdateLineQuantityRequested: updates targeted line',
        setUp: () {
          final after = draftQuote.copyWith(lines: [
            draftQuote.lines.first.copyWith(quantity: 10),
          ]);
          when(() => mockUpdateLine(any(), any()))
              .thenAnswer((_) async => Success(after));
        },
        seed: () => QuotesLoaded(
          projectId: 'proj-1',
          currentQuote: draftQuote,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(
          const QuoteUpdateLineQuantityRequested(
            lineId: 'line-1',
            quantity: 10,
          ),
        ),
        expect: () => [isA<QuotesLoaded>()],
        verify: (_) {
          final captured =
              verify(() => mockUpdateLine('quote-1', captureAny()))
                  .captured
                  .single as QuoteLine;
          expect(captured.id, equals('line-1'));
          expect(captured.quantity, equals(10));
        },
      );

      blocTest<QuotesBloc, QuotesState>(
        'QuoteRemoveLineRequested: forwards lineId',
        setUp: () {
          final after = draftQuote.copyWith(lines: const <QuoteLine>[]);
          when(() => mockRemoveLine(any(), any()))
              .thenAnswer((_) async => Success(after));
        },
        seed: () => QuotesLoaded(
          projectId: 'proj-1',
          currentQuote: draftQuote,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const QuoteRemoveLineRequested('line-1')),
        expect: () => [isA<QuotesLoaded>()],
        verify: (_) {
          verify(() => mockRemoveLine('quote-1', 'line-1')).called(1);
        },
      );
    });

    group('QuoteSendRequested', () {
      blocTest<QuotesBloc, QuotesState>(
        'emits [Loaded(isSending), OperationSuccess, Loading, Loaded] on success',
        setUp: () {
          when(() => mockSendQuote(any()))
              .thenAnswer((_) async => const Success(null));
          when(() => mockGetQuotes(any()))
              .thenAnswer((_) async => Success([draftQuote]));
          when(() => mockRepository.getQuote(any()))
              .thenAnswer((_) async => Success(draftQuote));
        },
        seed: () => QuotesLoaded(
          projectId: 'proj-1',
          currentQuote: draftQuote,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const QuoteSendRequested()),
        expect: () => [
          isA<QuotesLoaded>().having((s) => s.isSending, 'isSending', isTrue),
          isA<QuoteOperationSuccess>(),
          isA<QuotesLoading>(),
          isA<QuotesLoaded>(),
        ],
      );
    });

    group('QuoteGeneratePdfRequested', () {
      blocTest<QuotesBloc, QuotesState>(
        'emits [Loaded(isGenerating), Loaded(pdfPath)] on success',
        setUp: () {
          when(() => mockGeneratePdf(any()))
              .thenAnswer((_) async => const Success('/tmp/quote.pdf'));
        },
        seed: () => QuotesLoaded(
          projectId: 'proj-1',
          currentQuote: draftQuote,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const QuoteGeneratePdfRequested()),
        expect: () => [
          isA<QuotesLoaded>()
              .having((s) => s.isGeneratingPdf, 'isGeneratingPdf', isTrue),
          isA<QuotesLoaded>()
              .having((s) => s.pdfPath, 'pdfPath', equals('/tmp/quote.pdf'))
              .having((s) => s.isGeneratingPdf, 'isGeneratingPdf', isFalse),
        ],
      );
    });

    group('QuoteSignRequested', () {
      blocTest<QuotesBloc, QuotesState>(
        'emits [OperationSuccess, Loaded] with signed quote',
        setUp: () {
          when(() => mockSignQuote(any(), any())).thenAnswer(
              (_) async => Success(draftQuote.copyWith(
                  status: QuoteStatus.accepte, clientSignature: 'base64')));
        },
        seed: () => QuotesLoaded(
          projectId: 'proj-1',
          currentQuote: draftQuote,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const QuoteSignRequested('base64-data')),
        expect: () => [
          isA<QuoteOperationSuccess>(),
          isA<QuotesLoaded>().having(
              (s) => s.currentQuote?.status,
              'currentQuote.status',
              equals(QuoteStatus.accepte)),
        ],
      );
    });
  });
}
