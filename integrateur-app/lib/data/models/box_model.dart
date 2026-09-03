import '../../domain/entities/box.dart';

/// Reponse de POST /boxes/claim (camelCase cote backend).
class ClaimedBoxModel extends ClaimedBox {
  const ClaimedBoxModel({
    required super.id,
    required super.tokenSuffix,
    required super.status,
    super.clientId,
  });

  factory ClaimedBoxModel.fromJson(Map<String, dynamic> json) {
    return ClaimedBoxModel(
      id: json['id'] as String,
      tokenSuffix: json['tokenSuffix'] as String? ?? '',
      status: json['status'] as String? ?? 'claimed',
      clientId: json['clientId'] as String?,
    );
  }
}
