import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:neo_integrateur/core/errors/exceptions.dart';
import 'package:neo_integrateur/core/errors/failures.dart';
import 'package:neo_integrateur/data/datasources/remote/quote_remote_datasource.dart';
import 'package:neo_integrateur/data/models/quote_model.dart';
import 'package:neo_integrateur/data/repositories/quote_repository_impl.dart';
import 'package:neo_integrateur/domain/entities/quote.dart';
import 'package:neo_integrateur/domain/repositories/auth_repository.dart';

class MockQuoteRemoteDataSource extends Mock
    implements QuoteRemoteDataSource {}

void main() {
  late QuoteRepositoryImpl repository;
  late MockQuoteRemoteDataSource mockRemote;

  QuoteModel buildQuote({
    String id = 'quote-1',
    String projectId = 'proj-1',
    List<QuoteLine> lines = const [],
    double discount = 0,
    QuoteStatus status = QuoteStatus.brouillon,
  }) {
    return QuoteModel(
      id: id,
      projectId: projectId,
      number: 'DEV-2026-001',
      date: DateTime(2026, 5, 1),
      lines: lines,
      discountHT: discount,
      status: status,
    );
  }

  const baseLine = QuoteLine(
    id: 'line-1',
    type: QuoteLineType.produit,
    description: 'Module Zigbee',
    quantity: 2,
    unitPriceHT: 49.90,
    tvaPercent: 20,
  );

  setUp(() {
    mockRemote = MockQuoteRemoteDataSource();
    repository = QuoteRepositoryImpl(remoteDataSource: mockRemote);
  });

  group('QuoteRepositoryImpl', () {
    // ============ getQuotesForProject ============
    group('getQuotesForProject', () {
      test('returns list on success', () async {
        when(() => mockRemote.getQuotesByProject(any()))
            .thenAnswer((_) async => [buildQuote()]);

        final result = await repository.getQuotesForProject('proj-1');

        expect(result, isA<Success<List<Quote>>>());
        expect((result as Success<List<Quote>>).data, hasLength(1));
      });

      test('returns NetworkFailure on NetworkException', () async {
        when(() => mockRemote.getQuotesByProject(any()))
            .thenThrow(const NetworkException());

        final result = await repository.getQuotesForProject('proj-1');

        expect(result, isA<Error<List<Quote>>>());
        expect((result as Error<List<Quote>>).failure, isA<NetworkFailure>());
      });

      test('returns UnknownFailure on unexpected error', () async {
        when(() => mockRemote.getQuotesByProject(any()))
            .thenThrow(Exception('boom'));

        final result = await repository.getQuotesForProject('proj-1');

        expect(result, isA<Error<List<Quote>>>());
        expect((result as Error<List<Quote>>).failure, isA<UnknownFailure>());
      });
    });

    // ============ getQuote ============
    group('getQuote', () {
      test('returns quote on success', () async {
        when(() => mockRemote.getQuote(any()))
            .thenAnswer((_) async => buildQuote());

        final result = await repository.getQuote('quote-1');

        expect(result, isA<Success<Quote>>());
        expect((result as Success<Quote>).data.id, equals('quote-1'));
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.getQuote(any()))
            .thenThrow(const NotFoundException());

        final result = await repository.getQuote('missing');

        expect(result, isA<Error<Quote>>());
        expect((result as Error<Quote>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ createQuote ============
    group('createQuote', () {
      test('forwards projectId + create payload to remote', () async {
        final quote = buildQuote(lines: [baseLine]);
        when(() => mockRemote.createQuote(any(), any()))
            .thenAnswer((_) async => quote);

        final result = await repository.createQuote(quote);

        expect(result, isA<Success<Quote>>());
        final captured = verify(
                () => mockRemote.createQuote('proj-1', captureAny())).captured;
        final body = captured.single as Map<String, dynamic>;
        expect(body['lines'], isA<List<dynamic>>());
        expect((body['lines'] as List).length, equals(1));
      });

      test('returns ValidationFailure on ValidationException', () async {
        when(() => mockRemote.createQuote(any(), any())).thenThrow(
          const ValidationException(message: 'Lignes manquantes'),
        );

        final result = await repository.createQuote(buildQuote());

        expect(result, isA<Error<Quote>>());
        final failure = (result as Error<Quote>).failure;
        expect(failure, isA<ValidationFailure>());
        expect(failure.message, equals('Lignes manquantes'));
      });
    });

    // ============ updateQuote ============
    group('updateQuote', () {
      test('returns updated quote on success', () async {
        final quote = buildQuote();
        when(() => mockRemote.updateQuote(any(), any()))
            .thenAnswer((_) async => quote);

        final result = await repository.updateQuote(quote);

        expect(result, isA<Success<Quote>>());
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.updateQuote(any(), any()))
            .thenThrow(const NotFoundException());

        final result = await repository.updateQuote(buildQuote());

        expect(result, isA<Error<Quote>>());
        expect((result as Error<Quote>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ deleteQuote ============
    group('deleteQuote', () {
      test('returns success on delete', () async {
        when(() => mockRemote.deleteQuote(any())).thenAnswer((_) async {});

        final result = await repository.deleteQuote('quote-1');

        expect(result, isA<Success<void>>());
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.deleteQuote(any()))
            .thenThrow(const NotFoundException());

        final result = await repository.deleteQuote('missing');

        expect(result, isA<Error<void>>());
        expect((result as Error<void>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ line operations (addLine / updateLine / removeLine) ============
    group('line operations', () {
      test('addLine fetches quote, appends new line then PUTs', () async {
        final initial = buildQuote(lines: [baseLine]);
        when(() => mockRemote.getQuote('quote-1'))
            .thenAnswer((_) async => initial);
        when(() => mockRemote.updateQuote(any(), any())).thenAnswer(
            (_) async => buildQuote(lines: [
                  baseLine,
                  baseLine.copyWith(id: 'line-2'),
                ]));

        const newLine = QuoteLine(
          id: 'line-2',
          type: QuoteLineType.mainOeuvre,
          description: 'Installation',
          quantity: 1,
          unitPriceHT: 250,
        );

        final result = await repository.addLine('quote-1', newLine);

        expect(result, isA<Success<Quote>>());
        final captured = verify(
                () => mockRemote.updateQuote('quote-1', captureAny())).captured;
        final body = captured.single as Map<String, dynamic>;
        expect((body['lines'] as List).length, equals(2));
      });

      test('addLine returns Error early when getQuote fails', () async {
        when(() => mockRemote.getQuote(any()))
            .thenThrow(const NotFoundException());

        final result = await repository.addLine(
          'quote-1',
          baseLine,
        );

        expect(result, isA<Error<Quote>>());
        verifyNever(() => mockRemote.updateQuote(any(), any()));
      });

      test('updateLine replaces the matching line then PUTs', () async {
        final initial = buildQuote(lines: [
          baseLine,
          baseLine.copyWith(id: 'line-2', description: 'Old'),
        ]);
        when(() => mockRemote.getQuote('quote-1'))
            .thenAnswer((_) async => initial);
        when(() => mockRemote.updateQuote(any(), any()))
            .thenAnswer((_) async => initial);

        final updatedLine = baseLine.copyWith(
          id: 'line-2',
          description: 'New',
        );

        await repository.updateLine('quote-1', updatedLine);

        final captured = verify(
                () => mockRemote.updateQuote('quote-1', captureAny())).captured;
        final body = captured.single as Map<String, dynamic>;
        final lines = body['lines'] as List<dynamic>;
        expect(lines, hasLength(2));
        final descriptions =
            lines.map((l) => (l as Map)['description']).toSet();
        expect(descriptions, containsAll(<String>['Module Zigbee', 'New']));
        expect(descriptions, isNot(contains('Old')));
      });

      test('removeLine drops the matching line then PUTs', () async {
        final initial = buildQuote(lines: [
          baseLine,
          baseLine.copyWith(id: 'line-2', description: 'Forfait pose'),
        ]);
        when(() => mockRemote.getQuote('quote-1'))
            .thenAnswer((_) async => initial);
        when(() => mockRemote.updateQuote(any(), any()))
            .thenAnswer((_) async => initial);

        await repository.removeLine('quote-1', 'line-2');

        final captured = verify(
                () => mockRemote.updateQuote('quote-1', captureAny())).captured;
        final body = captured.single as Map<String, dynamic>;
        final lines = body['lines'] as List<dynamic>;
        expect(lines, hasLength(1));
        expect((lines.first as Map)['description'], equals('Module Zigbee'));
      });
    });

    // ============ discount + status ============
    group('updateDiscount', () {
      test('sends current lines + discount field', () async {
        final initial = buildQuote(lines: [baseLine]);
        when(() => mockRemote.getQuote('quote-1'))
            .thenAnswer((_) async => initial);
        when(() => mockRemote.updateQuote(any(), any()))
            .thenAnswer((_) async => initial);

        await repository.updateDiscount('quote-1', 50);

        final captured = verify(
                () => mockRemote.updateQuote('quote-1', captureAny())).captured;
        final body = captured.single as Map<String, dynamic>;
        expect(body['discount'], equals(50));
        expect(body['lines'], isA<List<dynamic>>());
      });
    });

    group('updateStatus', () {
      test('sends status apiValue to remote', () async {
        when(() => mockRemote.updateQuote(any(), any())).thenAnswer(
          (_) async => buildQuote(status: QuoteStatus.envoye),
        );

        final result = await repository.updateStatus(
          'quote-1',
          QuoteStatus.envoye,
        );

        expect(result, isA<Success<Quote>>());
        final captured = verify(
                () => mockRemote.updateQuote('quote-1', captureAny())).captured;
        final body = captured.single as Map<String, dynamic>;
        expect(body['status'], equals('envoye'));
      });

      test('returns NotFoundFailure on NotFoundException', () async {
        when(() => mockRemote.updateQuote(any(), any()))
            .thenThrow(const NotFoundException());

        final result = await repository.updateStatus(
          'missing',
          QuoteStatus.envoye,
        );

        expect(result, isA<Error<Quote>>());
        expect((result as Error<Quote>).failure, isA<NotFoundFailure>());
      });
    });

    // ============ sendToClient / PDF ============
    group('sendToClient', () {
      test('returns success when remote sendQuote returns', () async {
        when(() => mockRemote.sendQuote(any())).thenAnswer((_) async => {});

        final result = await repository.sendToClient('quote-1');

        expect(result, isA<Success<void>>());
        verify(() => mockRemote.sendQuote('quote-1')).called(1);
      });

      test('returns UnknownFailure when remote throws', () async {
        when(() => mockRemote.sendQuote(any()))
            .thenThrow(Exception('smtp down'));

        final result = await repository.sendToClient('quote-1');

        expect(result, isA<Error<void>>());
      });
    });

    test('generatePdf returns the URL from remote', () async {
      when(() => mockRemote.getQuotePdfUrl(any()))
          .thenReturn('https://api/quotes/quote-1/pdf');

      final result = await repository.generatePdf('quote-1');

      expect(result, isA<Success<String>>());
      expect((result as Success<String>).data,
          equals('https://api/quotes/quote-1/pdf'));
    });

    test('generateQuoteNumber returns DEV-<year>-XXXX placeholder', () async {
      final result = await repository.generateQuoteNumber();
      expect(result, isA<Success<String>>());
      final year = DateTime.now().year;
      expect((result as Success<String>).data, equals('DEV-$year-XXXX'));
    });

    test('sign returns UnknownFailure (not implemented yet)', () async {
      final result = await repository.sign('quote-1', 'base64');
      expect(result, isA<Error<Quote>>());
    });
  });
}
