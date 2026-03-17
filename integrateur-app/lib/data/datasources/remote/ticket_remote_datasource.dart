import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/ticket_model.dart';

/// Remote data source for tickets
abstract class TicketRemoteDataSource {
  Future<Map<String, dynamic>> getTickets({Map<String, dynamic>? queryParams});
  Future<Map<String, dynamic>> getTicketStats();
  Future<TicketModel> getTicket(String id);
  Future<TicketModel> createTicket(Map<String, dynamic> data);
  Future<TicketModel> updateTicket(String id, Map<String, dynamic> data);
  Future<TicketModel> changeStatus(String id, Map<String, dynamic> data);
  Future<TicketModel> assignTicket(String id, Map<String, dynamic> data);
  Future<TicketModel> escalateTicket(String id, Map<String, dynamic>? data);
  Future<TicketCommentModel> addComment(String ticketId, Map<String, dynamic> data);
  Future<List<TicketHistoryEntryModel>> getTicketHistory(String ticketId);
  Future<List<TicketCategoryModel>> getCategories();
}

/// Implementation of TicketRemoteDataSource
class TicketRemoteDataSourceImpl implements TicketRemoteDataSource {
  final ApiClient _apiClient;

  TicketRemoteDataSourceImpl(this._apiClient);

  @override
  Future<Map<String, dynamic>> getTickets({Map<String, dynamic>? queryParams}) async {
    final response = await _apiClient.get(
      ApiEndpoints.tickets,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> getTicketStats() async {
    final response = await _apiClient.get(ApiEndpoints.ticketStats);
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<TicketModel> getTicket(String id) async {
    final response = await _apiClient.get(ApiEndpoints.ticket(id));
    return TicketModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<TicketModel> createTicket(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.tickets, data: data);
    return TicketModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<TicketModel> updateTicket(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.ticket(id), data: data);
    return TicketModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<TicketModel> changeStatus(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.ticketStatus(id), data: data);
    return TicketModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<TicketModel> assignTicket(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.ticketAssign(id), data: data);
    return TicketModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<TicketModel> escalateTicket(String id, Map<String, dynamic>? data) async {
    final response = await _apiClient.put(ApiEndpoints.ticketEscalate(id), data: data ?? {});
    return TicketModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<TicketCommentModel> addComment(String ticketId, Map<String, dynamic> data) async {
    final response = await _apiClient.post(
      ApiEndpoints.ticketComments(ticketId),
      data: data,
    );
    return TicketCommentModel.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<List<TicketHistoryEntryModel>> getTicketHistory(String ticketId) async {
    final response = await _apiClient.get(ApiEndpoints.ticketHistory(ticketId));
    final list = response.data as List<dynamic>;
    return list
        .map((e) => TicketHistoryEntryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<List<TicketCategoryModel>> getCategories() async {
    final response = await _apiClient.get(ApiEndpoints.ticketCategories);
    final list = response.data as List<dynamic>;
    return list
        .map((e) => TicketCategoryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
