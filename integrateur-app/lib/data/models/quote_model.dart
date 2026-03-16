import '../../domain/entities/quote.dart';

/// Quote line model
class QuoteLineModel extends QuoteLine {
  const QuoteLineModel({
    required super.id,
    required super.type,
    super.productId,
    required super.description,
    required super.quantity,
    required super.unitPriceHT,
    super.tvaPercent,
    super.roomName,
  });

  factory QuoteLineModel.fromJson(Map<String, dynamic> json) {
    return QuoteLineModel(
      id: json['id'] as String,
      type: QuoteLineType.fromString(json['type'] as String? ?? 'produit'),
      productId: json['produit_id'] as String? ?? json['productId'] as String?,
      description: json['description'] as String,
      quantity: json['quantite'] as int? ?? json['quantity'] as int? ?? 1,
      unitPriceHT: (json['prix_unitaire_ht'] as num?)?.toDouble() ??
          (json['unitPriceHT'] as num?)?.toDouble() ??
          0.0,
      tvaPercent: (json['tva_pourcent'] as num?)?.toDouble() ??
          (json['tvaPercent'] as num?)?.toDouble() ??
          20.0,
      roomName: json['piece'] as String? ?? json['roomName'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'produit_id': productId,
      'description': description,
      'quantite': quantity,
      'prix_unitaire_ht': unitPriceHT,
      'tva_pourcent': tvaPercent,
      'total_ht': totalHT,
      'piece': roomName,
    };
  }

  factory QuoteLineModel.fromEntity(QuoteLine line) {
    return QuoteLineModel(
      id: line.id,
      type: line.type,
      productId: line.productId,
      description: line.description,
      quantity: line.quantity,
      unitPriceHT: line.unitPriceHT,
      tvaPercent: line.tvaPercent,
      roomName: line.roomName,
    );
  }
}

/// Quote model for JSON serialization
class QuoteModel extends Quote {
  const QuoteModel({
    required super.id,
    required super.projectId,
    required super.number,
    required super.date,
    super.validityDays,
    super.lines,
    super.discountHT,
    super.conditions,
    super.status,
    super.clientSignature,
    super.signatureDate,
    super.updatedAt,
  });

  factory QuoteModel.fromJson(Map<String, dynamic> json) {
    return QuoteModel(
      id: json['id'] as String,
      projectId: json['projet_id'] as String? ?? json['projectId'] as String? ?? '',
      number: json['numero'] as String? ?? json['number'] as String? ?? '',
      date: DateTime.parse(json['date'] as String? ?? DateTime.now().toIso8601String()),
      validityDays: json['validite_jours'] as int? ?? json['validityDays'] as int? ?? 30,
      lines: (json['lignes'] as List<dynamic>?)
              ?.map((e) => QuoteLineModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          (json['lines'] as List<dynamic>?)
              ?.map((e) => QuoteLineModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      discountHT: (json['remise_ht'] as num?)?.toDouble() ??
          (json['discountHT'] as num?)?.toDouble() ??
          0.0,
      conditions: json['conditions'] as String?,
      status: QuoteStatus.fromString(
          json['statut'] as String? ?? json['status'] as String? ?? 'brouillon'),
      clientSignature: json['signature_client'] as String? ??
          json['clientSignature'] as String?,
      signatureDate: json['date_signature'] != null
          ? DateTime.parse(json['date_signature'] as String)
          : json['signatureDate'] != null
              ? DateTime.parse(json['signatureDate'] as String)
              : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : json['updatedAt'] != null
              ? DateTime.parse(json['updatedAt'] as String)
              : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'projet_id': projectId,
      'numero': number,
      'date': date.toIso8601String(),
      'validite_jours': validityDays,
      'lignes': lines.map((l) => QuoteLineModel.fromEntity(l).toJson()).toList(),
      'sous_total_ht': subtotalHT,
      'remise_ht': discountHT,
      'total_ht': totalHT,
      'total_tva': totalTVA,
      'total_ttc': totalTTC,
      'conditions': conditions,
      'statut': status.apiValue,
      'signature_client': clientSignature,
      'date_signature': signatureDate?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  factory QuoteModel.fromEntity(Quote quote) {
    return QuoteModel(
      id: quote.id,
      projectId: quote.projectId,
      number: quote.number,
      date: quote.date,
      validityDays: quote.validityDays,
      lines: quote.lines,
      discountHT: quote.discountHT,
      conditions: quote.conditions,
      status: quote.status,
      clientSignature: quote.clientSignature,
      signatureDate: quote.signatureDate,
      updatedAt: quote.updatedAt,
    );
  }
}
