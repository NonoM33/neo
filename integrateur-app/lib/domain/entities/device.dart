import 'package:equatable/equatable.dart';

/// Device status enum matching backend
enum DeviceStatus {
  planifie,
  installe,
  configure,
  operationnel,
  enPanne;

  String get displayName {
    switch (this) {
      case DeviceStatus.planifie:
        return 'Planifié';
      case DeviceStatus.installe:
        return 'Installé';
      case DeviceStatus.configure:
        return 'Configuré';
      case DeviceStatus.operationnel:
        return 'Opérationnel';
      case DeviceStatus.enPanne:
        return 'En panne';
    }
  }

  String get apiValue {
    switch (this) {
      case DeviceStatus.enPanne:
        return 'en_panne';
      default:
        return name;
    }
  }

  static DeviceStatus fromString(String value) {
    if (value == 'en_panne') return DeviceStatus.enPanne;
    return DeviceStatus.values.firstWhere(
      (s) => s.name == value.toLowerCase(),
      orElse: () => DeviceStatus.planifie,
    );
  }
}

/// Device entity matching backend devices table
class Device extends Equatable {
  final String id;
  final String roomId;
  final String? productId;
  final String name;
  final String? serialNumber;
  final String? macAddress;
  final String? ipAddress;
  final DeviceStatus status;
  final String? location;
  final String? notes;
  final bool isOnline;
  final DateTime? lastSeenAt;
  final DateTime? installedAt;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Device({
    required this.id,
    required this.roomId,
    this.productId,
    required this.name,
    this.serialNumber,
    this.macAddress,
    this.ipAddress,
    this.status = DeviceStatus.planifie,
    this.location,
    this.notes,
    this.isOnline = false,
    this.lastSeenAt,
    this.installedAt,
    required this.createdAt,
    this.updatedAt,
  });

  Device copyWith({
    String? id,
    String? roomId,
    String? productId,
    String? name,
    String? serialNumber,
    String? macAddress,
    String? ipAddress,
    DeviceStatus? status,
    String? location,
    String? notes,
    bool? isOnline,
    DateTime? lastSeenAt,
    DateTime? installedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Device(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      productId: productId ?? this.productId,
      name: name ?? this.name,
      serialNumber: serialNumber ?? this.serialNumber,
      macAddress: macAddress ?? this.macAddress,
      ipAddress: ipAddress ?? this.ipAddress,
      status: status ?? this.status,
      location: location ?? this.location,
      notes: notes ?? this.notes,
      isOnline: isOnline ?? this.isOnline,
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
      installedAt: installedAt ?? this.installedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id, roomId, productId, name, serialNumber, macAddress, ipAddress,
        status, location, notes, isOnline, lastSeenAt, installedAt,
        createdAt, updatedAt,
      ];
}
