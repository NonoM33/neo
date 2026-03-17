import 'dart:developer' as developer;

import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';
import '../../domain/entities/quote.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/quote_repository.dart';
import '../datasources/remote/quote_remote_datasource.dart';
import '../models/quote_model.dart';

/// Implementation of QuoteRepository connected to backend API.
class QuoteRepositoryImpl implements QuoteRepository {
  final QuoteRemoteDataSource _remoteDataSource;

  QuoteRepositoryImpl({required QuoteRemoteDataSource remoteDataSource})
      : _remoteDataSource = remoteDataSource;

  @override
  Future<Result<List<Quote>>> getQuotesForProject(String projectId) async {
    try {
      final quotes = await _remoteDataSource.getQuotesByProject(projectId);
      return Success(quotes);
    } on NetworkException {
      return const Error(NetworkFailure(message: 'Impossible de charger les devis'));
    } catch (e, st) {
      developer.log('getQuotesForProject error: $e', name: 'QuoteRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> getQuote(String id) async {
    try {
      final quote = await _remoteDataSource.getQuote(id);
      return Success(quote);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Devis non trouvé'));
    } catch (e, st) {
      developer.log('getQuote error: $e', name: 'QuoteRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> createQuote(Quote quote) async {
    try {
      final quoteModel = QuoteModel.fromEntity(quote);
      final created = await _remoteDataSource.createQuote(
        quote.projectId,
        quoteModel.toCreateJson(),
      );
      return Success(created);
    } on ValidationException catch (e) {
      return Error(ValidationFailure(message: e.message));
    } catch (e, st) {
      developer.log('createQuote error: $e', name: 'QuoteRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> updateQuote(Quote quote) async {
    try {
      final quoteModel = QuoteModel.fromEntity(quote);
      final updated = await _remoteDataSource.updateQuote(
        quote.id,
        quoteModel.toUpdateJson(),
      );
      return Success(updated);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Devis non trouvé'));
    } catch (e, st) {
      developer.log('updateQuote error: $e', name: 'QuoteRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<void>> deleteQuote(String id) async {
    try {
      await _remoteDataSource.deleteQuote(id);
      return const Success(null);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Devis non trouvé'));
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  /// Send only lines to backend (without changing status/notes)
  Future<Result<Quote>> _updateLines(String quoteId, List<QuoteLine> lines, {double? discount}) async {
    try {
      final linesJson = lines
          .map((l) => QuoteLineModel.fromEntity(l).toApiJson())
          .toList();

      final data = <String, dynamic>{
        'lines': linesJson,
        if (discount != null) 'discount': discount,
      };

      final updated = await _remoteDataSource.updateQuote(quoteId, data);
      return Success(updated);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Devis non trouvé'));
    } catch (e, st) {
      developer.log('_updateLines error: $e', name: 'QuoteRepo', error: e, stackTrace: st);
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> addLine(String quoteId, QuoteLine line) async {
    try {
      final getResult = await getQuote(quoteId);
      if (getResult is Error) return getResult as Error<Quote>;

      final currentQuote = (getResult as Success<Quote>).data;
      final updatedLines = [...currentQuote.lines, line];
      return _updateLines(quoteId, updatedLines);
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> updateLine(String quoteId, QuoteLine line) async {
    try {
      final getResult = await getQuote(quoteId);
      if (getResult is Error) return getResult as Error<Quote>;

      final currentQuote = (getResult as Success<Quote>).data;
      final updatedLines = currentQuote.lines.map((l) {
        return l.id == line.id ? line : l;
      }).toList();
      return _updateLines(quoteId, updatedLines);
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> removeLine(String quoteId, String lineId) async {
    try {
      final getResult = await getQuote(quoteId);
      if (getResult is Error) return getResult as Error<Quote>;

      final currentQuote = (getResult as Success<Quote>).data;
      final updatedLines = currentQuote.lines.where((l) => l.id != lineId).toList();
      return _updateLines(quoteId, updatedLines);
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> updateDiscount(String quoteId, double discountHT) async {
    try {
      final getResult = await getQuote(quoteId);
      if (getResult is Error) return getResult as Error<Quote>;

      final currentQuote = (getResult as Success<Quote>).data;
      return _updateLines(quoteId, currentQuote.lines, discount: discountHT);
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<Quote>> updateStatus(String quoteId, QuoteStatus status) async {
    try {
      final updated = await _remoteDataSource.updateQuote(
        quoteId,
        {'status': status.apiValue},
      );
      return Success(updated);
    } on NotFoundException {
      return const Error(NotFoundFailure(message: 'Devis non trouvé'));
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<void>> sendToClient(String quoteId) async {
    try {
      await _remoteDataSource.sendQuote(quoteId);
      return const Success(null);
    } catch (e) {
      return Error(UnknownFailure(message: 'Erreur: $e', originalError: e));
    }
  }

  @override
  Future<Result<String>> generatePdf(String quoteId) async {
    return Success(_remoteDataSource.getQuotePdfUrl(quoteId));
  }

  @override
  Future<Result<String>> getPdfUrl(String quoteId) async {
    return Success(_remoteDataSource.getQuotePdfUrl(quoteId));
  }

  @override
  Future<Result<Quote>> sign(String quoteId, String signatureBase64) async {
    return const Error(UnknownFailure(message: 'Signature non implémentée'));
  }

  @override
  Future<Result<String>> generateQuoteNumber() async {
    final year = DateTime.now().year;
    return Success('DEV-$year-XXXX');
  }
}
