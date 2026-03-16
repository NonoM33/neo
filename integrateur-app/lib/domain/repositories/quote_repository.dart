import '../entities/quote.dart';
import 'auth_repository.dart';

/// Quote repository interface
abstract class QuoteRepository {
  /// Get all quotes for a project
  Future<Result<List<Quote>>> getQuotesForProject(String projectId);

  /// Get a single quote by ID
  Future<Result<Quote>> getQuote(String id);

  /// Create a new quote
  Future<Result<Quote>> createQuote(Quote quote);

  /// Update an existing quote
  Future<Result<Quote>> updateQuote(Quote quote);

  /// Delete a quote
  Future<Result<void>> deleteQuote(String id);

  /// Add a line to a quote
  Future<Result<Quote>> addLine(String quoteId, QuoteLine line);

  /// Update a quote line
  Future<Result<Quote>> updateLine(String quoteId, QuoteLine line);

  /// Remove a line from a quote
  Future<Result<Quote>> removeLine(String quoteId, String lineId);

  /// Update quote discount
  Future<Result<Quote>> updateDiscount(String quoteId, double discountHT);

  /// Update quote status
  Future<Result<Quote>> updateStatus(String quoteId, QuoteStatus status);

  /// Send quote to client
  Future<Result<void>> sendToClient(String quoteId);

  /// Generate PDF for quote
  Future<Result<String>> generatePdf(String quoteId);

  /// Get PDF download URL
  Future<Result<String>> getPdfUrl(String quoteId);

  /// Sign quote
  Future<Result<Quote>> sign(String quoteId, String signatureBase64);

  /// Generate next quote number
  Future<Result<String>> generateQuoteNumber();
}
