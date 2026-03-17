import '../../domain/entities/project.dart';
import '../../domain/entities/client.dart';

/// Client model for JSON serialization - backend uses camelCase
class ClientModel extends Client {
  const ClientModel({
    required super.id,
    required super.firstName,
    required super.lastName,
    super.email,
    super.phone,
    super.address,
    super.city,
    super.postalCode,
    super.notes,
    super.createdAt,
    super.updatedAt,
  });

  factory ClientModel.fromJson(Map<String, dynamic> json) {
    return ClientModel(
      id: json['id'] as String,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      postalCode: json['postalCode'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'firstName': firstName,
      'lastName': lastName,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      if (address != null) 'address': address,
      if (city != null) 'city': city,
      if (postalCode != null) 'postalCode': postalCode,
      if (notes != null) 'notes': notes,
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
      city: client.city,
      postalCode: client.postalCode,
      notes: client.notes,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    );
  }
}

/// Project model for JSON serialization - backend uses camelCase
class ProjectModel extends Project {
  const ProjectModel({
    required super.id,
    required super.name,
    super.description,
    required super.clientId,
    super.client,
    super.userId,
    required super.status,
    super.address,
    super.city,
    super.postalCode,
    super.surface,
    super.roomCount,
    required super.createdAt,
    super.updatedAt,
    super.isSynced,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    // Parse client - can be nested object or just id
    Client? client;
    final clientJson = json['client'];
    if (clientJson is Map<String, dynamic>) {
      client = ClientModel.fromJson(clientJson);
    }

    // Parse surface - backend may return as String (decimal)
    double? surface;
    final rawSurface = json['surface'];
    if (rawSurface is num) {
      surface = rawSurface.toDouble();
    } else if (rawSurface is String) {
      surface = double.tryParse(rawSurface);
    }

    // Parse user id from nested user object
    String? userId = json['userId'] as String?;
    if (userId == null && json['user'] is Map<String, dynamic>) {
      userId = (json['user'] as Map<String, dynamic>)['id'] as String?;
    }

    // Parse clientId - can be direct field or from nested client
    String clientId = json['clientId'] as String? ?? '';
    if (clientId.isEmpty && client != null) {
      clientId = client.id;
    }

    return ProjectModel(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      clientId: clientId,
      client: client,
      userId: userId,
      status: ProjectStatus.fromString(
          json['status'] as String? ?? 'brouillon'),
      address: json['address'] as String?,
      city: json['city'] as String?,
      postalCode: json['postalCode'] as String?,
      surface: surface,
      roomCount: json['roomCount'] as int?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
      isSynced: json['isSynced'] as bool? ?? true,
    );
  }

  /// Convert to JSON for create request
  Map<String, dynamic> toCreateJson() {
    return {
      'clientId': clientId,
      'name': name,
      if (description != null) 'description': description,
      'status': status.apiValue,
      if (address != null) 'address': address,
      if (city != null) 'city': city,
      if (postalCode != null) 'postalCode': postalCode,
      if (surface != null) 'surface': surface,
      if (roomCount != null) 'roomCount': roomCount,
    };
  }

  /// Convert to JSON for update request
  Map<String, dynamic> toUpdateJson() {
    return {
      if (name.isNotEmpty) 'name': name,
      'description': description,
      'status': status.apiValue,
      'address': address,
      'city': city,
      'postalCode': postalCode,
      'surface': surface,
      'roomCount': roomCount,
    };
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      ...toCreateJson(),
      'createdAt': createdAt.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  factory ProjectModel.fromEntity(Project project) {
    return ProjectModel(
      id: project.id,
      name: project.name,
      description: project.description,
      clientId: project.clientId,
      client: project.client,
      userId: project.userId,
      status: project.status,
      address: project.address,
      city: project.city,
      postalCode: project.postalCode,
      surface: project.surface,
      roomCount: project.roomCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isSynced: project.isSynced,
    );
  }
}
