import '../../domain/entities/quote.dart';

/// Quote line model - matches backend quote_lines table
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
    super.clientOwned,
    super.clientOwnedPhotoUrl,
  });

  /// From backend JSON. Backend fields: id, description, quantity,
  /// unitPriceHT (decimal string), tvaRate (decimal string), totalHT,
  /// sortOrder, product? {id, reference, name}
  factory QuoteLineModel.fromJson(Map<String, dynamic> json) {
    // Determine product ID from either direct field or nested product
    String? productId = json['productId'] as String?;
    if (productId == null && json['product'] is Map<String, dynamic>) {
      productId = (json['product'] as Map<String, dynamic>)['id'] as String?;
    }

    return QuoteLineModel(
      id: json['id'] as String,
      type: productId != null ? QuoteLineType.produit : QuoteLineType.forfait,
      productId: productId,
      description: json['description'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 1,
      unitPriceHT: _parseDouble(json['unitPriceHT']),
      tvaPercent: _parseDouble(json['tvaRate'] ?? '20'),
      clientOwned: json['clientOwned'] as bool? ?? false,
      clientOwnedPhotoUrl: json['clientOwnedPhotoUrl'] as String?,
    );
  }

  /// For API create/update request
  Map<String, dynamic> toApiJson() {
    return {
      if (productId != null) 'productId': productId,
      'description': description,
      'quantity': quantity,
      'unitPriceHT': unitPriceHT,
      'tvaRate': tvaPercent,
      if (clientOwned) 'clientOwned': true,
      if (clientOwnedPhotoUrl != null) 'clientOwnedPhotoUrl': clientOwnedPhotoUrl,
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
      clientOwned: line.clientOwned,
      clientOwnedPhotoUrl: line.clientOwnedPhotoUrl,
    );
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}

/// Quote model - matches backend quotes table
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

  /// From backend JSON. Backend fields: id, projectId, number, status,
  /// validUntil, totalHT, totalTVA, totalTTC, discount, notes,
  /// pdfUrl, sentAt, createdAt, updatedAt, lines[]
  factory QuoteModel.fromJson(Map<String, dynamic> json) {
    final linesJson = json['lines'] as List<dynamic>? ?? [];
    final lines = linesJson
        .map((l) => QuoteLineModel.fromJson(l as Map<String, dynamic>))
        .toList();

    return QuoteModel(
      id: json['id'] as String,
      projectId: json['projectId'] as String? ?? '',
      number: json['number'] as String? ?? '',
      date: _parseDate(json['createdAt']),
      validityDays: _calculateValidityDays(json['createdAt'], json['validUntil']),
      lines: lines,
      discountHT: _parseDouble(json['discount']),
      conditions: json['notes'] as String?,
      status: QuoteStatus.fromString(json['status'] as String? ?? 'brouillon'),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
    );
  }

  /// For create request
  Map<String, dynamic> toCreateJson() {
    return {
      if (validityDays > 0)
        'validUntil': date.add(Duration(days: validityDays)).toIso8601String(),
      'discount': discountHT,
      if (conditions != null) 'notes': conditions,
      'lines': lines.map((l) => QuoteLineModel.fromEntity(l).toApiJson()).toList(),
    };
  }

  /// For update request
  Map<String, dynamic> toUpdateJson() {
    return {
      'status': status.apiValue,
      'validUntil': validityEndDate.toIso8601String(),
      'discount': discountHT,
      'notes': conditions,
      'lines': lines.map((l) => QuoteLineModel.fromEntity(l).toApiJson()).toList(),
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

  static DateTime _parseDate(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
    return DateTime.now();
  }

  static int _calculateValidityDays(dynamic createdAt, dynamic validUntil) {
    if (validUntil == null) return 30;
    final created = _parseDate(createdAt);
    final valid = _parseDate(validUntil);
    final diff = valid.difference(created).inDays;
    return diff > 0 ? diff : 30;
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }
}
