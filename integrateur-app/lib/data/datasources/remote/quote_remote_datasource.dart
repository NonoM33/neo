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
  Future<Map<String, dynamic>> sendQuote(String id);
  String getQuotePdfUrl(String id);
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
  Future<Map<String, dynamic>> sendQuote(String id) async {
    final response = await _apiClient.post(ApiEndpoints.sendQuote(id));
    return response.data as Map<String, dynamic>;
  }

  @override
  String getQuotePdfUrl(String id) {
    return '${_apiClient.baseUrl}${ApiEndpoints.quotePdf(id)}';
  }
}
