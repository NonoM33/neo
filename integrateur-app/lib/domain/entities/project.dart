import 'package:equatable/equatable.dart';
import 'client.dart';
import 'room.dart';
import 'quote.dart';

/// Project status enum
enum ProjectStatus {
  audit,
  enCours,
  devisEnvoye,
  signe,
  termine;

  String get displayName {
    switch (this) {
      case ProjectStatus.audit:
        return 'Audit';
      case ProjectStatus.enCours:
        return 'En cours';
      case ProjectStatus.devisEnvoye:
        return 'Devis envoyé';
      case ProjectStatus.signe:
        return 'Signé';
      case ProjectStatus.termine:
        return 'Terminé';
    }
  }

  String get apiValue {
    switch (this) {
      case ProjectStatus.audit:
        return 'audit';
      case ProjectStatus.enCours:
        return 'en_cours';
      case ProjectStatus.devisEnvoye:
        return 'devis_envoye';
      case ProjectStatus.signe:
        return 'signe';
      case ProjectStatus.termine:
        return 'termine';
    }
  }

  static ProjectStatus fromString(String value) {
    return ProjectStatus.values.firstWhere(
      (status) => status.apiValue == value,
      orElse: () => ProjectStatus.audit,
    );
  }
}

/// Housing type enum
enum HousingType {
  appartement,
  maison,
  autre;

  String get displayName {
    switch (this) {
      case HousingType.appartement:
        return 'Appartement';
      case HousingType.maison:
        return 'Maison';
      case HousingType.autre:
        return 'Autre';
    }
  }

  static HousingType fromString(String value) {
    return HousingType.values.firstWhere(
      (type) => type.name == value.toLowerCase(),
      orElse: () => HousingType.autre,
    );
  }
}

/// Project entity
class Project extends Equatable {
  final String id;
  final Client client;
  final HousingType housingType;
  final double? surfaceM2;
  final ProjectStatus status;
  final DateTime createdAt;
  final DateTime? appointmentDate;
  final String integrateurId;
  final List<Room> rooms;
  final List<String> selectedProductIds;
  final Quote? quote;
  final String? notes;
  final DateTime? updatedAt;
  final bool isSynced;

  const Project({
    required this.id,
    required this.client,
    required this.housingType,
    this.surfaceM2,
    required this.status,
    required this.createdAt,
    this.appointmentDate,
    required this.integrateurId,
    this.rooms = const [],
    this.selectedProductIds = const [],
    this.quote,
    this.notes,
    this.updatedAt,
    this.isSynced = true,
  });

  /// Get total number of rooms
  int get roomCount => rooms.length;

  /// Get total number of selected products
  int get productCount => selectedProductIds.length;

  /// Check if project has a quote
  bool get hasQuote => quote != null;

  /// Check if project is editable
  bool get isEditable =>
      status != ProjectStatus.termine && status != ProjectStatus.signe;

  /// Get progress percentage based on status
  double get progressPercentage {
    switch (status) {
      case ProjectStatus.audit:
        return 0.2;
      case ProjectStatus.enCours:
        return 0.4;
      case ProjectStatus.devisEnvoye:
        return 0.6;
      case ProjectStatus.signe:
        return 0.8;
      case ProjectStatus.termine:
        return 1.0;
    }
  }

  Project copyWith({
    String? id,
    Client? client,
    HousingType? housingType,
    double? surfaceM2,
    ProjectStatus? status,
    DateTime? createdAt,
    DateTime? appointmentDate,
    String? integrateurId,
    List<Room>? rooms,
    List<String>? selectedProductIds,
    Quote? quote,
    String? notes,
    DateTime? updatedAt,
    bool? isSynced,
  }) {
    return Project(
      id: id ?? this.id,
      client: client ?? this.client,
      housingType: housingType ?? this.housingType,
      surfaceM2: surfaceM2 ?? this.surfaceM2,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      appointmentDate: appointmentDate ?? this.appointmentDate,
      integrateurId: integrateurId ?? this.integrateurId,
      rooms: rooms ?? this.rooms,
      selectedProductIds: selectedProductIds ?? this.selectedProductIds,
      quote: quote ?? this.quote,
      notes: notes ?? this.notes,
      updatedAt: updatedAt ?? this.updatedAt,
      isSynced: isSynced ?? this.isSynced,
    );
  }

  @override
  List<Object?> get props => [
        id,
        client,
        housingType,
        surfaceM2,
        status,
        createdAt,
        appointmentDate,
        integrateurId,
        rooms,
        selectedProductIds,
        quote,
        notes,
        updatedAt,
        isSynced,
      ];
}
