import '../../domain/entities/project.dart';
import '../../domain/entities/client.dart';
import '../../domain/entities/room.dart';
import '../../domain/entities/quote.dart';
import 'room_model.dart';
import 'quote_model.dart';

/// Client model for JSON serialization
class ClientModel extends Client {
  const ClientModel({
    super.id,
    required super.firstName,
    required super.lastName,
    required super.email,
    required super.phone,
    required super.address,
    super.notes,
  });

  factory ClientModel.fromJson(Map<String, dynamic> json) {
    final addressJson = json['adresse'] as Map<String, dynamic>? ??
        json['address'] as Map<String, dynamic>? ??
        {};

    return ClientModel(
      id: json['id'] as String?,
      firstName: json['prenom'] as String? ?? json['firstName'] as String? ?? '',
      lastName: json['nom'] as String? ?? json['lastName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['telephone'] as String? ?? json['phone'] as String? ?? '',
      address: AddressModel.fromJson(addressJson),
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'prenom': firstName,
      'nom': lastName,
      'email': email,
      'telephone': phone,
      'adresse': AddressModel.fromEntity(address).toJson(),
      'notes': notes,
    };
  }

  factory ClientModel.fromEntity(Client client) {
    return ClientModel(
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
    );
  }
}

/// Address model for JSON serialization
class AddressModel extends Address {
  const AddressModel({
    required super.street,
    required super.postalCode,
    required super.city,
    super.complement,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      street: json['rue'] as String? ?? json['street'] as String? ?? '',
      postalCode: json['code_postal'] as String? ?? json['postalCode'] as String? ?? '',
      city: json['ville'] as String? ?? json['city'] as String? ?? '',
      complement: json['complement'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rue': street,
      'code_postal': postalCode,
      'ville': city,
      'complement': complement,
    };
  }

  factory AddressModel.fromEntity(Address address) {
    return AddressModel(
      street: address.street,
      postalCode: address.postalCode,
      city: address.city,
      complement: address.complement,
    );
  }
}

/// Project model for JSON serialization
class ProjectModel extends Project {
  const ProjectModel({
    required super.id,
    required super.client,
    required super.housingType,
    super.surfaceM2,
    required super.status,
    required super.createdAt,
    super.appointmentDate,
    required super.integrateurId,
    super.rooms,
    super.selectedProductIds,
    super.quote,
    super.notes,
    super.updatedAt,
    super.isSynced,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    return ProjectModel(
      id: json['id'] as String,
      client: ClientModel.fromJson(json['client'] as Map<String, dynamic>),
      housingType: HousingType.fromString(
          json['type_logement'] as String? ?? json['housingType'] as String? ?? 'autre'),
      surfaceM2: (json['surface_m2'] as num?)?.toDouble() ??
          (json['surfaceM2'] as num?)?.toDouble(),
      status: ProjectStatus.fromString(
          json['statut'] as String? ?? json['status'] as String? ?? 'audit'),
      createdAt: DateTime.parse(json['date_creation'] as String? ??
          json['createdAt'] as String? ??
          DateTime.now().toIso8601String()),
      appointmentDate: json['date_rdv'] != null
          ? DateTime.parse(json['date_rdv'] as String)
          : json['appointmentDate'] != null
              ? DateTime.parse(json['appointmentDate'] as String)
              : null,
      integrateurId: json['integrateur_id'] as String? ??
          json['integrateurId'] as String? ??
          '',
      rooms: (json['pieces'] as List<dynamic>?)
              ?.map((e) => RoomModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      selectedProductIds:
          (json['produits_selectionnes'] as List<dynamic>?)
                  ?.map((e) => e as String)
                  .toList() ??
              (json['selectedProductIds'] as List<dynamic>?)
                  ?.map((e) => e as String)
                  .toList() ??
              [],
      quote: json['devis'] != null && (json['devis'] as Map).isNotEmpty
          ? QuoteModel.fromJson(json['devis'] as Map<String, dynamic>)
          : null,
      notes: json['notes'] as String?,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : json['updatedAt'] != null
              ? DateTime.parse(json['updatedAt'] as String)
              : null,
      isSynced: json['is_synced'] as bool? ?? json['isSynced'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'client': ClientModel.fromEntity(client).toJson(),
      'type_logement': housingType.name,
      'surface_m2': surfaceM2,
      'statut': status.apiValue,
      'date_creation': createdAt.toIso8601String(),
      'date_rdv': appointmentDate?.toIso8601String(),
      'integrateur_id': integrateurId,
      'pieces': rooms.map((r) => RoomModel.fromEntity(r).toJson()).toList(),
      'produits_selectionnes': selectedProductIds,
      'devis': quote != null ? QuoteModel.fromEntity(quote!).toJson() : null,
      'notes': notes,
      'updated_at': updatedAt?.toIso8601String(),
      'is_synced': isSynced,
    };
  }

  factory ProjectModel.fromEntity(Project project) {
    return ProjectModel(
      id: project.id,
      client: project.client,
      housingType: project.housingType,
      surfaceM2: project.surfaceM2,
      status: project.status,
      createdAt: project.createdAt,
      appointmentDate: project.appointmentDate,
      integrateurId: project.integrateurId,
      rooms: project.rooms,
      selectedProductIds: project.selectedProductIds,
      quote: project.quote,
      notes: project.notes,
      updatedAt: project.updatedAt,
      isSynced: project.isSynced,
    );
  }
}
