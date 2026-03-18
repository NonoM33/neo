import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../domain/entities/signature_request.dart';

abstract class SignatureRemoteDataSource {
  Future<SignatureRequest?> getSignatureRequest(String quoteId);
  Future<Map<String, dynamic>> createSignatureRequest(String quoteId, String mode);
  Future<Map<String, dynamic>> refreshSignatureStatus(String quoteId);
  Future<void> cancelSignatureRequest(String quoteId);
  String getContractPdfUrl(String quoteId);
}

class SignatureRemoteDataSourceImpl implements SignatureRemoteDataSource {
  final ApiClient _apiClient;

  SignatureRemoteDataSourceImpl(this._apiClient);

  @override
  Future<SignatureRequest?> getSignatureRequest(String quoteId) async {
    final response = await _apiClient.get(ApiEndpoints.quoteSignature(quoteId));
    final data = response.data as Map<String, dynamic>;
    final req = data['signatureRequest'];
    if (req == null) return null;
    return _parseSignatureRequest(quoteId, req as Map<String, dynamic>);
  }

  @override
  Future<Map<String, dynamic>> createSignatureRequest(String quoteId, String mode) async {
    final response = await _apiClient.post(
      ApiEndpoints.quoteSignature(quoteId),
      data: {'mode': mode},
    );
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> refreshSignatureStatus(String quoteId) async {
    final response = await _apiClient.get(ApiEndpoints.quoteSignatureRefresh(quoteId));
    return response.data as Map<String, dynamic>;
  }

  @override
  Future<void> cancelSignatureRequest(String quoteId) async {
    await _apiClient.delete(ApiEndpoints.quoteSignature(quoteId));
  }

  @override
  String getContractPdfUrl(String quoteId) {
    return '${_apiClient.baseUrl}${ApiEndpoints.quoteContractPdf(quoteId)}';
  }

  SignatureRequest _parseSignatureRequest(String quoteId, Map<String, dynamic> json) {
    return SignatureRequest(
      id: json['id'] as String,
      quoteId: quoteId,
      status: SignatureStatus.fromString(json['status'] as String? ?? 'draft'),
      mode: json['mode'] as String? ?? 'remote',
      signerName: json['signerName'] as String? ?? '',
      signerEmail: json['signerEmail'] as String? ?? '',
      signingUrl: json['signingUrl'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
