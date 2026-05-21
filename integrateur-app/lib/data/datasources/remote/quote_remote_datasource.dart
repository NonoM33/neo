import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/quote_model.dart';

/// Remote data source for quotes
abstract class QuoteRemoteDataSource {
  Future<List<QuoteModel>> getQuotesByProject(String projectId);
  Future<QuoteModel> getQuote(String id);
  Future<QuoteModel> createQuote(String projectId, Map<String, dynamic> data);
  Future<QuoteModel> updateQuote(String id, Map<String, dynamic> data);
  Future<void> deleteQuote(String id);
  Future<Map<String, dynamic>> sendQuote(String id, {String? customMessage, String? salesPersonName});
  /// Generates a draft quote from the project's checked checklist items.
  /// Returns the new quote id and the per-item matching result.
  Future<QuoteFromChecklistResult> createQuoteFromChecklist(
    String projectId,
    Map<String, dynamic> data,
  );
  String getQuotePdfUrl(String id);
}

/// Result of POST /projets/:id/devis/from-checklist.
class QuoteFromChecklistResult {
  final String quoteId;
  final List<ChecklistMatch> matches;

  const QuoteFromChecklistResult({required this.quoteId, required this.matches});

  factory QuoteFromChecklistResult.fromJson(Map<String, dynamic> json) {
    return QuoteFromChecklistResult(
      quoteId: json['quoteId'] as String,
      matches: (json['matches'] as List<dynamic>? ?? [])
          .map((e) => ChecklistMatch.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  int get matchedCount => matches.where((m) => m.matchedProductId != null).length;
  int get unmatchedCount => matches.length - matchedCount;
}

class ChecklistMatch {
  final String checklistItemId;
  final String label;
  final String category;
  final String? matchedProductId;
  final String? matchedProductName;

  const ChecklistMatch({
    required this.checklistItemId,
    required this.label,
    required this.category,
    this.matchedProductId,
    this.matchedProductName,
  });

  factory ChecklistMatch.fromJson(Map<String, dynamic> json) {
    return ChecklistMatch(
      checklistItemId: json['checklistItemId'] as String,
      label: json['label'] as String,
      category: json['category'] as String,
      matchedProductId: json['matchedProductId'] as String?,
      matchedProductName: json['matchedProductName'] as String?,
    );
  }
}

class QuoteRemoteDataSourceImpl implements QuoteRemoteDataSource {
  final ApiClient _apiClient;

  QuoteRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<QuoteModel>> getQuotesByProject(String projectId) async {
    final response = await _apiClient.get(ApiEndpoints.projectQuotes(projectId));
    final list = response.data as List<dynamic>;
    return list.map((e) => QuoteModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<QuoteModel> getQuote(String id) async {
    final response = await _apiClient.get(ApiEndpoints.quote(id));
    return QuoteModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<QuoteModel> createQuote(String projectId, Map<String, dynamic> data) async {
    final response = await _apiClient.post(
      ApiEndpoints.projectQuotes(projectId),
      data: data,
    );
    return QuoteModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<QuoteModel> updateQuote(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.quote(id), data: data);
    return QuoteModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<void> deleteQuote(String id) async {
    await _apiClient.delete(ApiEndpoints.quote(id));
  }

  @override
  Future<Map<String, dynamic>> sendQuote(
    String id, {
    String? customMessage,
    String? salesPersonName,
  }) async {
    final body = <String, dynamic>{};
    if (customMessage != null) body['customMessage'] = customMessage;
    if (salesPersonName != null) body['salesPersonName'] = salesPersonName;
    final response = await _apiClient.post(
      ApiEndpoints.sendQuote(id),
      data: body,
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<QuoteFromChecklistResult> createQuoteFromChecklist(
    String projectId,
    Map<String, dynamic> data,
  ) async {
    final response = await _apiClient.post(
      ApiEndpoints.projectQuoteFromChecklist(projectId),
      data: data,
    );
    return QuoteFromChecklistResult.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  @override
  String getQuotePdfUrl(String id) {
    return '${_apiClient.baseUrl}${ApiEndpoints.quotePdf(id)}';
  }
}
