import 'package:equatable/equatable.dart';

import 'client.dart';

/// Project status enum matching backend: brouillon, en_cours, termine, archive
enum ProjectStatus {
  brouillon,
  enCours,
  termine,
  archive;

  String get displayName {
    switch (this) {
      case ProjectStatus.brouillon:
        return 'Brouillon';
      case ProjectStatus.enCours:
        return 'En cours';
      case ProjectStatus.termine:
        return 'Terminé';
      case ProjectStatus.archive:
        return 'Archivé';
    }
  }

  String get apiValue {
    switch (this) {
      case ProjectStatus.brouillon:
        return 'brouillon';
      case ProjectStatus.enCours:
        return 'en_cours';
      case ProjectStatus.termine:
        return 'termine';
      case ProjectStatus.archive:
        return 'archive';
    }
  }

  static ProjectStatus fromString(String value) {
    return ProjectStatus.values.firstWhere(
      (status) => status.apiValue == value,
      orElse: () => ProjectStatus.brouillon,
    );
  }
}

/// Project entity matching backend schema
class Project extends Equatable {
  final String id;
  final String name;
  final String? description;
  final String clientId;
  final Client? client;
  final String? userId;
  final ProjectStatus status;
  final String? address;
  final String? city;
  final String? postalCode;
  final double? surface;
  final int? roomCount;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isSynced;

  const Project({
    required this.id,
    required this.name,
    this.description,
    required this.clientId,
    this.client,
    this.userId,
    required this.status,
    this.address,
    this.city,
    this.postalCode,
    this.surface,
    this.roomCount,
    required this.createdAt,
    this.updatedAt,
    this.isSynced = true,
  });

  /// Check if project is editable
  bool get isEditable =>
      status != ProjectStatus.termine && status != ProjectStatus.archive;

  /// Get progress percentage based on status
  double get progressPercentage {
    switch (status) {
      case ProjectStatus.brouillon:
        return 0.25;
      case ProjectStatus.enCours:
        return 0.5;
      case ProjectStatus.termine:
        return 1.0;
      case ProjectStatus.archive:
        return 1.0;
    }
  }

  String get fullAddress {
    final parts = <String>[];
    if (address != null && address!.isNotEmpty) parts.add(address!);
    if (postalCode != null && postalCode!.isNotEmpty) parts.add(postalCode!);
    if (city != null && city!.isNotEmpty) parts.add(city!);
    return parts.join(', ');
  }

  Project copyWith({
    String? id,
    String? name,
    String? description,
    String? clientId,
    Client? client,
    String? userId,
    ProjectStatus? status,
    String? address,
    String? city,
    String? postalCode,
    double? surface,
    int? roomCount,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isSynced,
  }) {
    return Project(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      clientId: clientId ?? this.clientId,
      client: client ?? this.client,
      userId: userId ?? this.userId,
      status: status ?? this.status,
      address: address ?? this.address,
      city: city ?? this.city,
      postalCode: postalCode ?? this.postalCode,
      surface: surface ?? this.surface,
      roomCount: roomCount ?? this.roomCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isSynced: isSynced ?? this.isSynced,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        clientId,
        client,
        userId,
        status,
        address,
        city,
        postalCode,
        surface,
        roomCount,
        createdAt,
        updatedAt,
        isSynced,
      ];
}
