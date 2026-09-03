import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../models/box_model.dart';

/// Remote data source for physical Neo boxes
abstract class BoxRemoteDataSource {
  Future<ClaimedBoxModel> claim({required String provisioningToken, required String clientId});
}

class BoxRemoteDataSourceImpl implements BoxRemoteDataSource {
  final ApiClient _apiClient;

  BoxRemoteDataSourceImpl(this._apiClient);

  @override
  Future<ClaimedBoxModel> claim({
    required String provisioningToken,
    required String clientId,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.boxClaim,
      data: {'provisioning_token': provisioningToken, 'client_id': clientId},
    );
    return ClaimedBoxModel.fromJson(response.data as Map<String, dynamic>);
  }
}
