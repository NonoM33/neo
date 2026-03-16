import 'package:equatable/equatable.dart';

/// Quote status enum
enum QuoteStatus {
  brouillon,
  envoye,
  accepte,
  refuse;

  String get displayName {
    switch (this) {
      case QuoteStatus.brouillon:
        return 'Brouillon';
      case QuoteStatus.envoye:
        return 'Envoyé';
      case QuoteStatus.accepte:
        return 'Accepté';
      case QuoteStatus.refuse:
        return 'Refusé';
    }
  }

  String get apiValue {
    switch (this) {
      case QuoteStatus.brouillon:
        return 'brouillon';
      case QuoteStatus.envoye:
        return 'envoye';
      case QuoteStatus.accepte:
        return 'accepte';
      case QuoteStatus.refuse:
        return 'refuse';
    }
  }

  static QuoteStatus fromString(String value) {
    return QuoteStatus.values.firstWhere(
      (status) => status.apiValue == value,
      orElse: () => QuoteStatus.brouillon,
    );
  }
}

/// Quote line type
enum QuoteLineType {
  produit,
  mainOeuvre,
  forfait;

  String get displayName {
    switch (this) {
      case QuoteLineType.produit:
        return 'Produit';
      case QuoteLineType.mainOeuvre:
        return 'Main d\'œuvre';
      case QuoteLineType.forfait:
        return 'Forfait';
    }
  }

  static QuoteLineType fromString(String value) {
    return QuoteLineType.values.firstWhere(
      (type) => type.name == value.toLowerCase(),
      orElse: () => QuoteLineType.produit,
    );
  }
}

/// Quote line entity
class QuoteLine extends Equatable {
  final String id;
  final QuoteLineType type;
  final String? productId;
  final String description;
  final int quantity;
  final double unitPriceHT;
  final double tvaPercent;
  final String? roomName;

  const QuoteLine({
    required this.id,
    required this.type,
    this.productId,
    required this.description,
    required this.quantity,
    required this.unitPriceHT,
    this.tvaPercent = 20.0,
    this.roomName,
  });

  /// Calculate total HT for this line
  double get totalHT => unitPriceHT * quantity;

  /// Calculate TVA amount for this line
  double get tvaAmount => totalHT * (tvaPercent / 100);

  /// Calculate total TTC for this line
  double get totalTTC => totalHT + tvaAmount;

  QuoteLine copyWith({
    String? id,
    QuoteLineType? type,
    String? productId,
    String? description,
    int? quantity,
    double? unitPriceHT,
    double? tvaPercent,
    String? roomName,
  }) {
    return QuoteLine(
      id: id ?? this.id,
      type: type ?? this.type,
      productId: productId ?? this.productId,
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      unitPriceHT: unitPriceHT ?? this.unitPriceHT,
      tvaPercent: tvaPercent ?? this.tvaPercent,
      roomName: roomName ?? this.roomName,
    );
  }

  @override
  List<Object?> get props => [
        id,
        type,
        productId,
        description,
        quantity,
        unitPriceHT,
        tvaPercent,
        roomName,
      ];
}

/// Quote entity
class Quote extends Equatable {
  final String id;
  final String projectId;
  final String number;
  final DateTime date;
  final int validityDays;
  final List<QuoteLine> lines;
  final double discountHT;
  final String? conditions;
  final QuoteStatus status;
  final String? clientSignature;
  final DateTime? signatureDate;
  final DateTime? updatedAt;

  const Quote({
    required this.id,
    required this.projectId,
    required this.number,
    required this.date,
    this.validityDays = 30,
    this.lines = const [],
    this.discountHT = 0,
    this.conditions,
    this.status = QuoteStatus.brouillon,
    this.clientSignature,
    this.signatureDate,
    this.updatedAt,
  });

  /// Calculate subtotal HT (before discount)
  double get subtotalHT =>
      lines.fold(0.0, (sum, line) => sum + line.totalHT);

  /// Calculate total HT (after discount)
  double get totalHT => subtotalHT - discountHT;

  /// Calculate total TVA
  double get totalTVA =>
      lines.fold(0.0, (sum, line) => sum + line.tvaAmount) -
      (discountHT * 0.2); // Apply TVA reduction on discount

  /// Calculate total TTC
  double get totalTTC => totalHT + totalTVA;

  /// Get validity end date
  DateTime get validityEndDate => date.add(Duration(days: validityDays));

  /// Check if quote is expired
  bool get isExpired => DateTime.now().isAfter(validityEndDate);

  /// Check if quote is editable
  bool get isEditable =>
      status == QuoteStatus.brouillon;

  /// Check if quote can be sent
  bool get canBeSent =>
      status == QuoteStatus.brouillon && lines.isNotEmpty;

  /// Get lines by room
  Map<String?, List<QuoteLine>> get linesByRoom {
    final map = <String?, List<QuoteLine>>{};
    for (final line in lines) {
      map.putIfAbsent(line.roomName, () => []).add(line);
    }
    return map;
  }

  /// Get lines by type
  Map<QuoteLineType, List<QuoteLine>> get linesByType {
    final map = <QuoteLineType, List<QuoteLine>>{};
    for (final line in lines) {
      map.putIfAbsent(line.type, () => []).add(line);
    }
    return map;
  }

  /// Get product lines only
  List<QuoteLine> get productLines =>
      lines.where((l) => l.type == QuoteLineType.produit).toList();

  /// Get labor lines only
  List<QuoteLine> get laborLines =>
      lines.where((l) => l.type == QuoteLineType.mainOeuvre).toList();

  Quote copyWith({
    String? id,
    String? projectId,
    String? number,
    DateTime? date,
    int? validityDays,
    List<QuoteLine>? lines,
    double? discountHT,
    String? conditions,
    QuoteStatus? status,
    String? clientSignature,
    DateTime? signatureDate,
    DateTime? updatedAt,
  }) {
    return Quote(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      number: number ?? this.number,
      date: date ?? this.date,
      validityDays: validityDays ?? this.validityDays,
      lines: lines ?? this.lines,
      discountHT: discountHT ?? this.discountHT,
      conditions: conditions ?? this.conditions,
      status: status ?? this.status,
      clientSignature: clientSignature ?? this.clientSignature,
      signatureDate: signatureDate ?? this.signatureDate,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        projectId,
        number,
        date,
        validityDays,
        lines,
        discountHT,
        conditions,
        status,
        clientSignature,
        signatureDate,
        updatedAt,
      ];
}
