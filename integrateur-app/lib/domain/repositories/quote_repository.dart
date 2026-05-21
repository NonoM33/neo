import '../entities/quote.dart';
import 'auth_repository.dart';

/// Outcome of generating a quote draft from the project's checklist.
class QuoteFromChecklist {
  final String quoteId;
  final List<QuoteChecklistMatch> matches;

  const QuoteFromChecklist({required this.quoteId, required this.matches});

  int get matchedCount =>
      matches.where((m) => m.matchedProductId != null).length;
  int get unmatchedCount => matches.length - matchedCount;
}

/// One row in the matching report: which checklist item ended up with
/// which product (if any).
class QuoteChecklistMatch {
  final String checklistItemId;
  final String label;
  final String category;
  final String? matchedProductId;
  final String? matchedProductName;

  const QuoteChecklistMatch({
    required this.checklistItemId,
    required this.label,
    required this.category,
    this.matchedProductId,
    this.matchedProductName,
  });
}

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

  /// Send quote to client. The optional message is included in the email body;
  /// salesPersonName signs off the email.
  Future<Result<void>> sendToClient(
    String quoteId, {
    String? customMessage,
    String? salesPersonName,
  });

  /// Generate a draft quote pre-filled from the project's checklist items.
  Future<Result<QuoteFromChecklist>> createFromChecklist(
    String projectId, {
    List<String>? roomIds,
    double? discount,
    String? notes,
    int? validityDays,
  });

  /// Generate PDF for quote
  Future<Result<String>> generatePdf(String quoteId);

  /// Get PDF download URL
  Future<Result<String>> getPdfUrl(String quoteId);

  /// Sign quote
  Future<Result<Quote>> sign(String quoteId, String signatureBase64);

  /// Generate next quote number
  Future<Result<String>> generateQuoteNumber();
}
