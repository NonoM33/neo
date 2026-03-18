import 'package:equatable/equatable.dart';

enum SignatureStatus {
  draft,
  pending,
  signed,
  declined,
  expired,
  cancelled;

  String get displayName {
    switch (this) {
      case SignatureStatus.draft:
        return 'Brouillon';
      case SignatureStatus.pending:
        return 'En attente';
      case SignatureStatus.signed:
        return 'Signé';
      case SignatureStatus.declined:
        return 'Refusé';
      case SignatureStatus.expired:
        return 'Expiré';
      case SignatureStatus.cancelled:
        return 'Annulé';
    }
  }

  static SignatureStatus fromString(String value) {
    switch (value.toLowerCase()) {
      case 'draft':
        return SignatureStatus.draft;
      case 'pending':
        return SignatureStatus.pending;
      case 'signed':
        return SignatureStatus.signed;
      case 'declined':
        return SignatureStatus.declined;
      case 'expired':
        return SignatureStatus.expired;
      case 'cancelled':
        return SignatureStatus.cancelled;
      default:
        return SignatureStatus.draft;
    }
  }
}

class SignatureRequest extends Equatable {
  final String id;
  final String quoteId;
  final SignatureStatus status;
  final String mode; // 'remote' | 'direct'
  final String signerName;
  final String signerEmail;
  final String? signingUrl;
  final DateTime createdAt;

  const SignatureRequest({
    required this.id,
    required this.quoteId,
    required this.status,
    required this.mode,
    required this.signerName,
    required this.signerEmail,
    this.signingUrl,
    required this.createdAt,
  });

  bool get isDirect => mode == 'direct';
  bool get isRemote => mode == 'remote';
  bool get isSigned => status == SignatureStatus.signed;
  bool get isPending => status == SignatureStatus.pending;

  @override
  List<Object?> get props => [id, quoteId, status, mode, signerName, signerEmail, signingUrl, createdAt];
}
