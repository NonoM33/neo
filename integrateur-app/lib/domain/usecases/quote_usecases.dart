import '../../core/errors/failures.dart';
import '../entities/quote.dart';
import '../repositories/auth_repository.dart';
import '../repositories/quote_repository.dart';

/// Get quotes for project use case
class GetQuotesForProjectUseCase {
  final QuoteRepository _repository;

  GetQuotesForProjectUseCase(this._repository);

  Future<Result<List<Quote>>> call(String projectId) async {
    return _repository.getQuotesForProject(projectId);
  }
}

/// Get single quote use case
class GetQuoteUseCase {
  final QuoteRepository _repository;

  GetQuoteUseCase(this._repository);

  Future<Result<Quote>> call(String id) async {
    return _repository.getQuote(id);
  }
}

/// Create quote use case
class CreateQuoteUseCase {
  final QuoteRepository _repository;

  CreateQuoteUseCase(this._repository);

  Future<Result<Quote>> call(Quote quote) async {
    return _repository.createQuote(quote);
  }
}

/// Update quote use case
class UpdateQuoteUseCase {
  final QuoteRepository _repository;

  UpdateQuoteUseCase(this._repository);

  Future<Result<Quote>> call(Quote quote) async {
    return _repository.updateQuote(quote);
  }
}

/// Add line to quote use case
class AddQuoteLineUseCase {
  final QuoteRepository _repository;

  AddQuoteLineUseCase(this._repository);

  Future<Result<Quote>> call(String quoteId, QuoteLine line) async {
    // Validate line data
    if (line.description.isEmpty) {
      return Error(
        ValidationFailure(message: 'La description est requise'),
      );
    }
    if (line.quantity <= 0) {
      return Error(
        ValidationFailure(message: 'La quantité doit être supérieure à 0'),
      );
    }
    if (line.unitPriceHT < 0) {
      return Error(
        ValidationFailure(message: 'Le prix ne peut pas être négatif'),
      );
    }

    return _repository.addLine(quoteId, line);
  }
}

/// Update quote line use case
class UpdateQuoteLineUseCase {
  final QuoteRepository _repository;

  UpdateQuoteLineUseCase(this._repository);

  Future<Result<Quote>> call(String quoteId, QuoteLine line) async {
    return _repository.updateLine(quoteId, line);
  }
}

/// Remove quote line use case
class RemoveQuoteLineUseCase {
  final QuoteRepository _repository;

  RemoveQuoteLineUseCase(this._repository);

  Future<Result<Quote>> call(String quoteId, String lineId) async {
    return _repository.removeLine(quoteId, lineId);
  }
}

/// Apply discount use case
class ApplyDiscountUseCase {
  final QuoteRepository _repository;

  ApplyDiscountUseCase(this._repository);

  Future<Result<Quote>> call(String quoteId, double discountHT) async {
    if (discountHT < 0) {
      return Error(
        ValidationFailure(message: 'La remise ne peut pas être négative'),
      );
    }
    return _repository.updateDiscount(quoteId, discountHT);
  }
}

/// Send quote to client use case
class SendQuoteUseCase {
  final QuoteRepository _repository;

  SendQuoteUseCase(this._repository);

  Future<Result<void>> call(String quoteId) async {
    return _repository.sendToClient(quoteId);
  }
}

/// Generate quote PDF use case
class GenerateQuotePdfUseCase {
  final QuoteRepository _repository;

  GenerateQuotePdfUseCase(this._repository);

  Future<Result<String>> call(String quoteId) async {
    return _repository.generatePdf(quoteId);
  }
}

/// Sign quote use case
class SignQuoteUseCase {
  final QuoteRepository _repository;

  SignQuoteUseCase(this._repository);

  Future<Result<Quote>> call(String quoteId, String signatureBase64) async {
    if (signatureBase64.isEmpty) {
      return Error(
        ValidationFailure(message: 'La signature est requise'),
      );
    }
    return _repository.sign(quoteId, signatureBase64);
  }
}
